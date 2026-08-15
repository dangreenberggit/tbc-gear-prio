#!/usr/bin/env python3
"""Pure-logic checks for scripts/sync_wowsims.py: no network, no writes outside
a temp dir.

Follows the check_lock_merge.py convention -- a standalone script of small
checks, not a pytest suite (this repo has no pytest infra). Not wired into
`pnpm verify` here: package.json is out of scope for this change (parallel-
phase slice B pathsForbidden). Run by hand:

    python scripts/check_sync_wowsims.py

Exit 0 ok, 1 a check failed.
"""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import sync_wowsims  # noqa: E402


def check_vendor_is_empty_missing_dir() -> list[str]:
    """A vendor/ that doesn't exist at all must read as empty -- this is the
    fresh-clone / fresh-worktree case, and it's the one issue #1 hit."""
    with tempfile.TemporaryDirectory() as td:
        orig = sync_wowsims.VENDOR
        sync_wowsims.VENDOR = os.path.join(td, "does-not-exist")
        try:
            if not sync_wowsims.vendor_is_empty():
                return ["vendor_is_empty() must be True when VENDOR does not exist"]
            return []
        finally:
            sync_wowsims.VENDOR = orig


def check_vendor_is_empty_empty_dir() -> list[str]:
    """An existing-but-empty vendor/ (e.g. `git clean` ran, or --restore was
    interrupted before writing anything) must also read as empty."""
    with tempfile.TemporaryDirectory() as td:
        orig = sync_wowsims.VENDOR
        sync_wowsims.VENDOR = td
        try:
            if not sync_wowsims.vendor_is_empty():
                return ["vendor_is_empty() must be True for an existing empty dir"]
            return []
        finally:
            sync_wowsims.VENDOR = orig


def check_vendor_is_empty_populated_dir() -> list[str]:
    with tempfile.TemporaryDirectory() as td:
        Path(td, "db.json").write_bytes(b"{}")
        orig = sync_wowsims.VENDOR
        sync_wowsims.VENDOR = td
        try:
            if sync_wowsims.vendor_is_empty():
                return ["vendor_is_empty() must be False once a file has been fetched"]
            return []
        finally:
            sync_wowsims.VENDOR = orig


def check_watched_refs_survive_merge_lock() -> list[str]:
    """merge_lock() must carry watchedRefs forward like any other owned key
    that a given --update call doesn't set -- see the comment above the
    `if prev and "watchedRefs" in prev:` line in do_update()."""
    prev = {
        "repo": sync_wowsims.REPO,
        "tag": "v0.0.100",
        "commit": "a" * 40,
        "currentPhase": 2,
        "defaultMaxPhase": 2,
        "files": {},
        "_comment": "generated",
        "watchedRefs": {"feature/backend-reforge": {"commit": "d09edaaf8", "fetchedAt": "2026-08-12"}},
    }
    owned = {**prev, "tag": "v0.0.101", "commit": "b" * 40}
    owned.pop("watchedRefs")
    if prev and "watchedRefs" in prev:
        owned["watchedRefs"] = prev["watchedRefs"]
    merged = sync_wowsims.merge_lock(prev, owned)
    if merged.get("watchedRefs") != prev["watchedRefs"]:
        return ["watchedRefs did not survive an --update-style merge"]
    return []


def check_watched_refs_in_owned_keys() -> list[str]:
    if "watchedRefs" not in sync_wowsims.OWNED_KEYS:
        return ["watchedRefs must be in OWNED_KEYS, or merge_lock() drops it as foreign"]
    return []


def check_ref_and_tag_mutually_exclusive_in_do_update() -> list[str]:
    """do_update(tag, ref) must refuse rather than silently pick one."""
    try:
        sync_wowsims.do_update("v0.0.101", ref="feature/backend-reforge")
    except SystemExit as e:
        if "mutually exclusive" in str(e):
            return []
        return [f"do_update raised SystemExit but not for the mutual-exclusion reason: {e}"]
    return ["do_update(tag=..., ref=...) must raise SystemExit before any network call"]


class _PerFilePinHarness:
    """Runs do_update()/do_restore() against a temp VENDOR/LOCKFILE with a
    fake fetch() -- no network, matching this file's no-network contract.

    TRACKED is shrunk to two files so a run stays fast and so the harness
    controls exactly which local names exist, independent of whatever the
    real TRACKED dict grows to. constants_other.ts is required by every
    do_update() call (do_update() raises SystemExit if CURRENT_PHASE never
    resolves), so it is always present.

    fetch(sha, path) returns bytes that embed the sha it was called with,
    so a test can tell -- by reading the byte content back out of vendor/ --
    which commit a file was actually fetched from without needing a real
    blob or a real upstream repo.
    """

    MAIN_SHA = "a" * 40
    OVERRIDE_SHA = "5c7491899b5d71adecdc8de28d4fb2f77f0571b8"
    SECOND_OVERRIDE_SHA = "b" * 40

    def __enter__(self):
        self._td = tempfile.TemporaryDirectory()
        td = self._td.name
        self._orig = {
            "VENDOR": sync_wowsims.VENDOR,
            "LOCKFILE": sync_wowsims.LOCKFILE,
            "TRACKED": sync_wowsims.TRACKED,
            "PER_FILE_PIN": sync_wowsims.PER_FILE_PIN,
            "fetch": sync_wowsims.fetch,
            "tag_sha": sync_wowsims.tag_sha,
        }
        sync_wowsims.VENDOR = os.path.join(td, "vendor")
        sync_wowsims.LOCKFILE = os.path.join(td, "wowsims.lock.json")
        sync_wowsims.TRACKED = {
            "constants_other.ts": "ui/core/constants/other.ts",
            "ret_p3.gear.json": "ui/paladin/retribution/gear_sets/p3.gear.json",
        }
        sync_wowsims.PER_FILE_PIN = {"ret_p3.gear.json": self.OVERRIDE_SHA}
        sync_wowsims.tag_sha = lambda tag: self.MAIN_SHA

        def fake_fetch(sha, path):
            if path == "ui/core/constants/other.ts":
                return b"export const CURRENT_PHASE: Phase = Phase.Phase2;"
            return f"content-from-{sha}".encode()

        sync_wowsims.fetch = fake_fetch
        return self

    def __exit__(self, *exc):
        for k, v in self._orig.items():
            setattr(sync_wowsims, k, v)
        self._td.cleanup()

    def vendor_bytes(self, local):
        with open(os.path.join(sync_wowsims.VENDOR, local), "rb") as fh:
            return fh.read()

    def lock(self):
        return sync_wowsims.load_lock()


def check_update_at_main_pin_leaves_override_untouched() -> list[str]:
    """A plain `--update --tag <pin>` must not drag an overridden file
    backward to the main pin -- the hazard PER_FILE_PIN's own comment names
    (scripts/sync_wowsims.py:139-141, do_update()'s PER_FILE_PIN.get(local, sha)
    branch at :285)."""
    problems = []
    with _PerFilePinHarness() as h:
        sync_wowsims.do_update("v0.0.101")
        lock = h.lock()
        entry = lock["files"]["ret_p3.gear.json"]
        if entry.get("commit") != h.OVERRIDE_SHA:
            problems.append(
                f"override entry 'commit' should stay {h.OVERRIDE_SHA!r}, got {entry.get('commit')!r}"
            )
        got = h.vendor_bytes("ret_p3.gear.json")
        want = f"content-from-{h.OVERRIDE_SHA}".encode()
        if got != want:
            problems.append(
                f"override file bytes should come from {h.OVERRIDE_SHA!r}, "
                f"got bytes fetched for a different sha: {got!r}"
            )
        # A non-overridden file must NOT get a "commit" key -- do_update()
        # only writes one when file_sha != sha (:295-296).
        other = lock["files"]["constants_other.ts"]
        if "commit" in other:
            problems.append("non-overridden file must not gain a 'commit' key")
    return problems


def check_restore_fetches_override_not_main_pin() -> list[str]:
    """do_restore() must read the per-entry 'commit' back (:376-379) and fetch
    from it, not from the top-level lock['commit']."""
    problems = []
    with _PerFilePinHarness() as h:
        sync_wowsims.do_update("v0.0.101")
        # Overwrite the vendor copy so a restore that fetches the WRONG
        # commit is still detectable even though the bytes would otherwise
        # already be correct from the update above.
        os.remove(os.path.join(sync_wowsims.VENDOR, "ret_p3.gear.json"))
        rc = sync_wowsims.do_restore()
        if rc != 0:
            problems.append(f"do_restore() should return 0, got {rc}")
        got = h.vendor_bytes("ret_p3.gear.json")
        want = f"content-from-{h.OVERRIDE_SHA}".encode()
        if got != want:
            problems.append(
                f"do_restore() must fetch the override commit {h.OVERRIDE_SHA!r}, "
                f"got bytes for a different sha: {got!r}"
            )
    return problems


def check_second_override_entry_round_trips() -> list[str]:
    """A second PER_FILE_PIN entry must round-trip independently of the
    first -- recorded as explicitly untested in
    .scratch/handoffs/wowsims-tab/slice-6/HANDOFF.md:382-384."""
    problems = []
    with _PerFilePinHarness() as h:
        sync_wowsims.TRACKED = {
            **sync_wowsims.TRACKED,
            "feral_p3_9p.gear.json": "ui/druid/feralcat/gear_sets/p3_9p.gear.json",
        }
        sync_wowsims.PER_FILE_PIN = {
            "ret_p3.gear.json": h.OVERRIDE_SHA,
            "feral_p3_9p.gear.json": h.SECOND_OVERRIDE_SHA,
        }
        sync_wowsims.do_update("v0.0.101")
        lock = h.lock()
        first = lock["files"]["ret_p3.gear.json"]
        second = lock["files"]["feral_p3_9p.gear.json"]
        if first.get("commit") != h.OVERRIDE_SHA:
            problems.append(f"first override should stay {h.OVERRIDE_SHA!r}, got {first.get('commit')!r}")
        if second.get("commit") != h.SECOND_OVERRIDE_SHA:
            problems.append(
                f"second override should be {h.SECOND_OVERRIDE_SHA!r}, got {second.get('commit')!r}"
            )
        if h.vendor_bytes("feral_p3_9p.gear.json") != f"content-from-{h.SECOND_OVERRIDE_SHA}".encode():
            problems.append("second override file bytes fetched from the wrong commit")

        # Round-trip through do_restore() too, per the ticket's wording.
        os.remove(os.path.join(sync_wowsims.VENDOR, "ret_p3.gear.json"))
        os.remove(os.path.join(sync_wowsims.VENDOR, "feral_p3_9p.gear.json"))
        rc = sync_wowsims.do_restore()
        if rc != 0:
            problems.append(f"do_restore() with two overrides should return 0, got {rc}")
        if h.vendor_bytes("ret_p3.gear.json") != f"content-from-{h.OVERRIDE_SHA}".encode():
            problems.append("do_restore() fetched the first override from the wrong commit")
        if h.vendor_bytes("feral_p3_9p.gear.json") != f"content-from-{h.SECOND_OVERRIDE_SHA}".encode():
            problems.append("do_restore() fetched the second override from the wrong commit")
    return problems


def check_promoting_file_out_of_per_file_pin_is_noop_diff() -> list[str]:
    """Once upstream's pin catches up to an override's commit, removing the
    file from PER_FILE_PIN must be a no-op diff -- PER_FILE_PIN's own comment
    (scripts/sync_wowsims.py:138): "Promote a file out of this dict once its
    ref reaches the main pin -- the override then becomes a no-op diff."""
    problems = []
    with _PerFilePinHarness() as h:
        # First update: override sha == main pin sha (upstream "caught up"),
        # file still listed in PER_FILE_PIN.
        sync_wowsims.tag_sha = lambda tag: h.OVERRIDE_SHA
        sync_wowsims.do_update("v0.0.102")
        lock_with_entry = h.lock()

        # Second update: identical main pin, file promoted OUT of
        # PER_FILE_PIN. Re-run against a fresh lock dir seeded with the same
        # prior lock so merge_lock() sees the same "prev".
        sync_wowsims.PER_FILE_PIN = {}
        sync_wowsims.do_update("v0.0.102")
        lock_without_entry = h.lock()

        with_entry_file = lock_with_entry["files"]["ret_p3.gear.json"]
        without_entry_file = lock_without_entry["files"]["ret_p3.gear.json"]
        if "commit" in with_entry_file:
            problems.append(
                "do_update() should not write 'commit' once override sha == main pin "
                f"sha (file_sha != sha is False) -- got {with_entry_file}"
            )
        # Bytes, sha256 and path must be identical either way -- the only
        # difference between the two lock entries should be the presence
        # of a same-valued 'commit' key, i.e. no diff at all.
        for key in ("path", "sha256", "bytes"):
            if with_entry_file.get(key) != without_entry_file.get(key):
                problems.append(
                    f"promoting out of PER_FILE_PIN changed {key!r}: "
                    f"{with_entry_file.get(key)!r} -> {without_entry_file.get(key)!r}"
                )
        if with_entry_file != without_entry_file:
            problems.append(
                "promoting a caught-up file out of PER_FILE_PIN must be a no-op diff: "
                f"{with_entry_file} != {without_entry_file}"
            )
    return problems


CHECKS = (
    check_vendor_is_empty_missing_dir,
    check_vendor_is_empty_empty_dir,
    check_vendor_is_empty_populated_dir,
    check_watched_refs_survive_merge_lock,
    check_watched_refs_in_owned_keys,
    check_ref_and_tag_mutually_exclusive_in_do_update,
    check_update_at_main_pin_leaves_override_untouched,
    check_restore_fetches_override_not_main_pin,
    check_second_override_entry_round_trips,
    check_promoting_file_out_of_per_file_pin_is_noop_diff,
)


def main() -> int:
    problems = [p for check in CHECKS for p in check()]
    if not problems:
        print(f"sync_wowsims.py guard rails ok ({len(CHECKS)} checks)")
        return 0
    for p in problems:
        print(f"  FAIL: {p}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
