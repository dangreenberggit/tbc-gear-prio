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

import json
import os
import sys
import tempfile
import types
import urllib.error
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import sync_wowsims  # noqa: E402
import warn_upstream_drift  # noqa: E402


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


def _run_warner(returncode: int, stdout: str = "", stderr: str = "") -> tuple[list[str], str]:
    """Drive warn_upstream_drift.main() against a canned --check result.

    Stubs the subprocess call rather than shelling out, so these checks stay
    offline and independent of whatever vendor/ and gh auth this machine has.

    Returns (problems, output). The warner is wired into `pnpm verify` as a
    warning and must exit 0 in every branch, so that one assertion is made here
    once rather than repeated in each caller.
    """
    import io
    from contextlib import redirect_stdout

    fake = types.SimpleNamespace(returncode=returncode, stdout=stdout, stderr=stderr)

    orig = warn_upstream_drift.subprocess.run
    orig_note = warn_upstream_drift.warn_pin_behind_watched_refs
    warn_upstream_drift.subprocess.run = lambda *a, **k: fake
    # The containment NOTE shells out to `gh`; it is not part of this contract.
    warn_upstream_drift.warn_pin_behind_watched_refs = lambda: None
    buf = io.StringIO()
    try:
        with redirect_stdout(buf):
            rc = warn_upstream_drift.main()
    finally:
        warn_upstream_drift.subprocess.run = orig
        warn_upstream_drift.warn_pin_behind_watched_refs = orig_note

    problems = []
    if rc != 0:
        problems.append(
            f"the warner must always exit 0 -- it is wired into pnpm verify as a "
            f"warning, not a gate. Got {rc} for a --check that exited {returncode}."
        )
    return problems, buf.getvalue()


class _DoCheckHarness:
    """Run the real do_check() offline against a lock whose pin is stale.

    do_check() needs network, `gh` auth and a populated vendor/, so this stubs
    the three functions that reach outside -- latest_tag, ref_sha, fetch -- and
    points VENDOR and LOCKFILE at a temp dir. Everything else, including the
    drift wording and the exit codes, is the real thing.

    The alternative -- asserting against inspect.getsource(do_check) -- was
    tried and rejected: a source grep for "DRIFT:" passes on a do_check that
    prints "CHANGED:" and carries a commented-out `# print("DRIFT: legacy")`,
    and a grep for "return 2" passes when 1 and 2 have been swapped. Both leave
    the warner broken and the check green, which is the exact rot this ticket
    exists to prevent.

    The three shas must stay distinct, and fetch() must vary CURRENT_PHASE by
    sha (ticket 391). latest_tag() and ref_sha() used to return one shared
    value, which made the sha-pin branch untestable in the only way that
    matters: no assertion could separate "compared against the watched ref"
    from "compared against the latest release tag" -- ticket 354 symptom (b),
    the defect these checks exist for. Substituting `tip = sha` for
    `tip = ref_sha(ref)`, the original bug verbatim, left all 21 checks green.
    TAG_SHA is what latest_tag() reports, UPSTREAM_SHA what ref_sha() reports,
    and phase_by_sha gives them different content tiers so a tier line sourced
    from the wrong commit is visible rather than coincidentally equal.
    """

    PIN_SHA = "a" * 40
    UPSTREAM_SHA = "b" * 40
    TAG_SHA = "d" * 40

    def __enter__(self):
        self._td = tempfile.TemporaryDirectory()
        td = self._td.name
        self._orig = {
            k: getattr(sync_wowsims, k)
            for k in ("VENDOR", "LOCKFILE", "TRACKED", "PER_FILE_PIN",
                      "fetch", "tag_sha", "latest_tag", "ref_sha")
        }
        sync_wowsims.VENDOR = os.path.join(td, "vendor")
        sync_wowsims.LOCKFILE = os.path.join(td, "wowsims.lock.json")
        sync_wowsims.TRACKED = {"constants_other.ts": "ui/core/constants/other.ts"}
        sync_wowsims.PER_FILE_PIN = {}
        self.phase_by_sha = {self.PIN_SHA: 2, self.UPSTREAM_SHA: 2, self.TAG_SHA: 3}
        sync_wowsims.tag_sha = lambda tag: self.PIN_SHA
        sync_wowsims.latest_tag = lambda: ("v9.9.9", self.TAG_SHA)
        sync_wowsims.ref_sha = lambda ref: self.UPSTREAM_SHA
        sync_wowsims.fetch = lambda sha, path: (
            f"export const CURRENT_PHASE: Phase = Phase.Phase{self.phase_by_sha[sha]};".encode()
        )
        sync_wowsims.do_update("v0.0.101")
        return self

    def __exit__(self, *exc):
        for k, v in self._orig.items():
            setattr(sync_wowsims, k, v)
        self._td.cleanup()

    def run(self):
        """Return (returncode, combined output) from the real do_check()."""
        import io
        from contextlib import redirect_stderr, redirect_stdout

        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            rc = sync_wowsims.do_check()
        return rc, out.getvalue() + err.getvalue()

    def write_lock(self, lock):
        with open(sync_wowsims.LOCKFILE, "w", encoding="utf-8", newline="") as fh:
            json.dump(lock, fh, indent=2)

    def add_watched_ref(self, name="some/watched-ref", commit="c" * 40):
        lock = sync_wowsims.load_lock()
        lock["watchedRefs"] = {name: {"commit": commit, "fetchedAt": "2026-01-01"}}
        self.write_lock(lock)

    def empty_the_vendor_dir(self):
        for entry in os.listdir(sync_wowsims.VENDOR):
            os.remove(os.path.join(sync_wowsims.VENDOR, entry))


def check_drift_token_still_matches_what_check_emits() -> list[str]:
    """The warner finds drift by matching the literal "DRIFT:" in --check's
    output. Nothing else couples the two scripts, so if do_check() ever renames
    that token the warner silently reports "in sync" forever -- ticket 245's
    third-instance failure, and the reason this check exists.

    Runs the real do_check() and greps its real output the same way the warner
    does, so the assertion holds regardless of how the token is spelled in the
    source or which call emits it.
    """
    problems = []
    token = warn_upstream_drift.DRIFT_TOKEN

    with _DoCheckHarness() as h:
        h.add_watched_ref()
        rc, body = h.run()

    matched = [ln for ln in body.splitlines() if token in ln]
    if not matched:
        problems.append(
            f"do_check() reported drift but printed no line containing {token!r}, "
            "so warn_upstream_drift matches nothing and reports \"in sync\" "
            f"forever. Its output was: {body.strip()!r}"
        )
    # A stale pin and a moved watched ref are two distinct drift items; both
    # must reach the warner, not just whichever one is emitted first.
    if len(matched) < 2:
        problems.append(
            "do_check() should emit one DRIFT line per drift item (stale pin AND "
            f"moved watched ref); the warner echoes each. Got {len(matched)}: {matched!r}"
        )
    return problems


def check_check_exit_codes_match_the_warner_branches() -> list[str]:
    """The warner branches on --check's exit codes: 2 means vendor/ absent
    (skip), 0 means ran-and-clean, anything else means it did not run.

    Runs the real do_check() in each of those three states and asserts the code
    it returns, so swapping two codes fails here instead of silently turning
    real drift into a vendor skip.
    """
    problems = []

    with _DoCheckHarness() as h:
        rc, body = h.run()
        if rc != 1:
            problems.append(
                f"do_check() must return 1 when it finds drift, got {rc}. The warner "
                "reads a nonzero exit with no DRIFT: lines as 'check did not run', "
                f"and 2 as 'vendor/ absent'. Output was: {body.strip()!r}"
            )

        h.empty_the_vendor_dir()
        rc, body = h.run()
        if rc != 2:
            problems.append(
                f"do_check() must return 2 when vendor/ is empty, got {rc} -- the "
                "warner reads 2 as 'vendor/ absent, skip'. If that code moved, "
                f"warn_upstream_drift must move with it. Output was: {body.strip()!r}"
            )
    return problems


def check_check_returns_zero_when_actually_in_sync() -> list[str]:
    """The only state in which the warner may say "in sync" is do_check()
    returning 0. Pin that it still does when nothing has drifted -- otherwise
    the warner's one honest all-clear becomes unreachable.
    """
    problems = []
    with _DoCheckHarness() as h:
        # Move the pin up to what upstream reports, so there is nothing to
        # report. This is a tag pin, so the comparison is against latest_tag()'s
        # sha (sync_wowsims.py:621), not the watched ref's.
        lock = sync_wowsims.load_lock()
        lock["commit"] = h.TAG_SHA
        h.write_lock(lock)
        rc, body = h.run()

    if rc != 0:
        problems.append(
            f"do_check() must return 0 when the pin matches upstream, got {rc}. "
            f"Output was: {body.strip()!r}"
        )
    if warn_upstream_drift.DRIFT_TOKEN in body:
        problems.append(
            f"do_check() printed a drift line with nothing drifted: {body.strip()!r}"
        )
    return problems


def check_warner_never_claims_in_sync_when_check_failed() -> list[str]:
    """The defect ticket 245 measured: with `gh` absent, --check dies on a
    traceback and exits 1, and the warner used to print "in sync with the pin".
    A tripwire that reports all-clear when it never ran is worse than none --
    it is the same "we do not have this feature" reassurance that cost two
    tickets. Exit must stay 0 (warn-only), but the text must not claim sync.
    """
    problems, out = _run_warner(
        1, stderr="Traceback (most recent call last):\nFileNotFoundError: gh\n"
    )

    if "in sync" in out:
        problems.append(
            "warner reported 'in sync' when --check exited 1 without reporting "
            f"drift (i.e. it never ran). Output was: {out.strip()!r}"
        )
    if "UNKNOWN" not in out:
        problems.append(
            "a --check that did not run must be reported as unknown drift, not "
            f"silence. Output was: {out.strip()!r}"
        )
    return problems


def check_warner_reports_drift_and_stays_green() -> list[str]:
    """The normal drift case: --check exits 1 and names the drift. The warner
    must surface every DRIFT: line and still exit 0.
    """
    body = (
        "  pinned:   somepin (abcdef123456)\n"
        "  DRIFT: new release available: somepin -> sometag\n"
        "  DRIFT: watched ref someref moved: aaaaaaaaaaaa -> bbbbbbbbbbbb\n"
    )
    problems, out = _run_warner(1, stdout=body)

    for want in ("new release available", "watched ref someref moved"):
        if want not in out:
            problems.append(f"warner dropped a DRIFT line containing {want!r}: {out.strip()!r}")
    if "UNKNOWN" in out:
        problems.append(
            "real drift must not be reported as 'check did not run': " f"{out.strip()!r}"
        )
    return problems


def check_warner_skips_on_absent_vendor() -> list[str]:
    """Exit 2 is the fresh-clone / pre-restore state, not a defect. It must
    read as a skip, and must not be mistaken for the did-not-run case.
    """
    problems, out = _run_warner(2, stderr="vendor/wowsims/ is empty or missing")

    # Asserted as "reported as a skip, and distinguishable from the other two
    # branches" rather than by grepping the skip line's wording, which this
    # check does not own -- pinning a literal it cannot see change is the rot
    # shape ticket 245 is about.
    if "in sync" in out:
        problems.append(
            f"an absent vendor/ proves nothing about sync; do not claim it: {out.strip()!r}"
        )
    if "UNKNOWN" in out:
        problems.append(
            "an absent vendor/ is the expected fresh-clone state, not a check that "
            f"failed to run; do not report it as unknown drift: {out.strip()!r}"
        )
    if not out.strip():
        problems.append("exit 2 must say something -- silence reads as a clean run")
    return problems


def check_warner_reports_clean_only_on_exit_zero() -> list[str]:
    """Guards the all-clear from the opposite direction to the other checks:
    they stop it being said wrongly, this stops it becoming unreachable."""
    problems, out = _run_warner(0, stdout="  pinned: somepin\n\n  in sync.\n")

    if "in sync" not in out:
        problems.append(f"a clean exit-0 --check should report in sync: {out.strip()!r}")
    if "UNKNOWN" in out:
        problems.append(f"a clean exit-0 --check is not unknown drift: {out.strip()!r}")
    return problems


def check_sha_pin_compares_against_its_watched_ref() -> list[str]:
    """A sha pin must be compared against the ref it was cut from, not against
    the latest release tag (ticket 354 symptom (a)). The tag comparison is the
    wrong question for a pin that will never equal a tag, and asking it forever
    trains people to ignore the one run that means something.
    """
    problems = []
    with _DoCheckHarness() as h:
        lock = sync_wowsims.load_lock()
        # A sha pin whose watched ref has moved past it.
        lock["tag"] = h.PIN_SHA
        lock["commit"] = h.PIN_SHA
        lock["watchedRefs"] = {"master": {"commit": h.PIN_SHA, "fetchedAt": "2026-01-01"}}
        h.write_lock(lock)
        # ref_sha returns UPSTREAM_SHA, so the watched ref reads as moved.
        rc, body = h.run()

    if rc != 1:
        problems.append(
            f"a sha pin behind its watched ref must report drift (rc 1), got {rc}. "
            f"Output was: {body.strip()!r}"
        )
    if "master" not in body:
        problems.append(
            f"the drift line must name the watched ref it compared against: {body.strip()!r}"
        )
    if "new release available" in body:
        problems.append(
            "a sha pin must not report release-tag drift -- it will never equal a "
            f"tag, so that line is permanent noise (ticket 354): {body.strip()!r}"
        )
    # The tier must be read from the watched ref's tip (phase 2 here), not from
    # the release tag (phase 3). Reading the tag would fire a spurious tier
    # change against a commit the pin may never contain -- ticket 354 symptom
    # (b). These two assertions are what `tip = sha` fails.
    if "CONTENT TIER CHANGED" in body:
        problems.append(
            "the tier came from the release tag, not the watched ref tip: the ref "
            "tip and the pin agree on phase 2, so no tier change may be reported "
            f"(ticket 354 symptom (b)): {body.strip()!r}"
        )
    if "master CURRENT_PHASE = 2" not in body:
        problems.append(
            "--check must print the watched ref's own CURRENT_PHASE, read from "
            f"that ref's tip: {body.strip()!r}"
        )
    return problems


def check_sha_pin_in_sync_with_watched_ref_is_clean() -> list[str]:
    """A sha pin equal to its watched ref's tip is in sync, even while the
    latest release tag names some other commit. Without this, the sha-pin branch
    could report drift forever and still look "correct" to the other checks.
    """
    problems = []
    with _DoCheckHarness() as h:
        lock = sync_wowsims.load_lock()
        # Pin and watched ref agree on UPSTREAM_SHA; latest_tag() reports a
        # different commit, which must not matter.
        lock["tag"] = h.UPSTREAM_SHA
        lock["commit"] = h.UPSTREAM_SHA
        lock["watchedRefs"] = {"master": {"commit": h.UPSTREAM_SHA, "fetchedAt": "2026-01-01"}}
        h.write_lock(lock)
        rc, body = h.run()

    if rc != 0:
        problems.append(
            f"a sha pin equal to its watched ref tip is in sync; got rc {rc}. "
            f"Output was: {body.strip()!r}"
        )
    if warn_upstream_drift.DRIFT_TOKEN in body:
        problems.append(
            f"a sha pin in sync with its watched ref must report no drift: {body.strip()!r}"
        )
    if "latest release" not in body:
        problems.append(
            "the release tag must still be printed as an informational line so the "
            f"ADR-0030 tag trigger stays visible: {body.strip()!r}"
        )
    return problems


def check_sha_pin_tier_change_is_read_from_the_watched_ref() -> list[str]:
    """Ticket 354's acceptance case: the watched branch and the latest release
    tag disagree on CURRENT_PHASE, and the tier line must follow the branch.

    Here the ref tip is phase 3 and the tag is phase 2 -- the reverse of the
    other sha-pin checks -- so a tier line can only appear if it was read from
    the watched ref. Reading the tag instead would report no change at all.
    """
    problems = []
    with _DoCheckHarness() as h:
        h.phase_by_sha[h.UPSTREAM_SHA] = 3
        h.phase_by_sha[h.TAG_SHA] = 2
        lock = sync_wowsims.load_lock()
        lock["tag"] = h.PIN_SHA
        lock["commit"] = h.PIN_SHA
        lock["watchedRefs"] = {"master": {"commit": h.PIN_SHA, "fetchedAt": "2026-01-01"}}
        h.write_lock(lock)
        rc, body = h.run()

    if rc != 1:
        problems.append(
            f"a tier change on the watched ref tip is drift (rc 1), got {rc}. "
            f"Output was: {body.strip()!r}"
        )
    if "CONTENT TIER CHANGED 2 -> 3" not in body:
        problems.append(
            "a tier change on the watched ref tip must fire -- the ref is at phase "
            "3 while the pin and the release tag are both at phase 2, so a tier "
            "line can only come from the ref (ticket 354 acceptance): "
            f"{body.strip()!r}"
        )
    return problems


def check_sha_pin_survives_an_unresolvable_watched_ref() -> list[str]:
    """When the first watched ref cannot be resolved -- the branch upstream
    deleted -- --check must report drift, not raise. This is the exact state the
    repo was in after PR #385 merged and feature/backend-reforge was deleted.
    """
    problems = []

    def boom(ref):
        raise SystemExit("HTTP 422")

    with _DoCheckHarness() as h:
        lock = sync_wowsims.load_lock()
        lock["tag"] = h.PIN_SHA
        lock["commit"] = h.PIN_SHA
        lock["watchedRefs"] = {"dead/ref": {"commit": h.PIN_SHA, "fetchedAt": "2026-01-01"}}
        h.write_lock(lock)
        orig = sync_wowsims.ref_sha
        sync_wowsims.ref_sha = boom
        try:
            rc, body = h.run()
        except SystemExit as e:
            sync_wowsims.ref_sha = orig
            return [
                f"an unresolvable watched ref must not propagate out of do_check; "
                f"it raised SystemExit({e})"
            ]
        finally:
            sync_wowsims.ref_sha = orig

    if rc != 1:
        problems.append(
            f"an unresolvable watched ref is drift (rc 1), got {rc}. Output: {body.strip()!r}"
        )
    if "could not resolve" not in body:
        problems.append(
            f"--check must say the ref could not be resolved: {body.strip()!r}"
        )
    return problems


def _not_found(sha, path):
    raise urllib.error.HTTPError(
        f"https://raw.githubusercontent.com/x/y/{sha}/{path}", 404, "Not Found", None, None
    )


def check_phase_file_404_is_drift_not_a_crash() -> list[str]:
    """Upstream deleted ui/core/ in 7b539641 (2026-09-16), so fetching the phase
    file at a newer tip returns HTTP 404. pinned_fetch raises HTTPError, which is
    not SystemExit, and --check died with a traceback instead of reporting
    (ticket 551). Both call sites -- the sha-pin branch and the release-tag
    branch -- must turn it into a DRIFT line and exit 1.
    """
    problems = []
    for label, sha_pin in (("sha pin", True), ("tag pin", False)):
        with _DoCheckHarness() as h:
            lock = sync_wowsims.load_lock()
            if sha_pin:
                lock["tag"] = h.PIN_SHA
                lock["commit"] = h.PIN_SHA
                lock["watchedRefs"] = {
                    "master": {"commit": h.PIN_SHA, "fetchedAt": "2026-01-01"}}
            h.write_lock(lock)
            sync_wowsims.fetch = _not_found
            try:
                rc, body = h.run()
            except (Exception, SystemExit) as e:
                problems.append(
                    f"{label}: a 404 on the phase file must not escape do_check; "
                    f"it raised {type(e).__name__}({e})")
                continue
        if rc != 1:
            problems.append(f"{label}: a 404 on the phase file is drift (rc 1), got {rc}")
        if warn_upstream_drift.DRIFT_TOKEN not in body or "CURRENT_PHASE" not in body:
            problems.append(
                f"{label}: --check must print a DRIFT line saying CURRENT_PHASE could "
                f"not be read: {body.strip()!r}")
    return problems


def check_phase_is_read_from_the_new_path_when_the_old_one_404s() -> list[str]:
    """Since upstream c86fd86f5 / 7b539641 (2026-09-16) the phase file lives at
    ui/sim/constants/other.ts, and ui/core/constants/other.ts is gone. A tip
    past that point must still yield its tier, or --check can never report the
    tier change it exists for.
    """
    problems = []

    def moved(sha, path):
        if path == "ui/sim/constants/other.ts":
            return b"export const CURRENT_PHASE: Phase = Phase.Phase3;"
        return _not_found(sha, path)

    with _DoCheckHarness() as h:
        lock = sync_wowsims.load_lock()
        lock["tag"] = h.PIN_SHA
        lock["commit"] = h.PIN_SHA
        lock["watchedRefs"] = {"master": {"commit": h.PIN_SHA, "fetchedAt": "2026-01-01"}}
        h.write_lock(lock)
        sync_wowsims.fetch = moved
        try:
            rc, body = h.run()
        except (Exception, SystemExit) as e:
            return [f"do_check raised {type(e).__name__}({e})"]

    if "master CURRENT_PHASE = 3" not in body or "CONTENT TIER CHANGED 2 -> 3" not in body:
        problems.append(
            "the tier must be read from ui/sim/constants/other.ts when the old path "
            f"404s (ticket 551): rc {rc}, {body.strip()!r}")
    return problems


def check_parse_current_phase_accepts_the_unannotated_form() -> list[str]:
    """ui/sim/constants/other.ts at upstream 42c75dc9 declares
    `export const CURRENT_PHASE = Phase.Phase3;` with no `: Phase` annotation,
    unlike the old ui/core file the parser was written against (ticket 551).
    """
    problems = []
    cases = {
        "export const CURRENT_PHASE = Phase.Phase3;": 3,
        "export const CURRENT_PHASE = 4;": 4,
        "export const CURRENT_PHASE: Phase = Phase.Phase2;": 2,
    }
    for src, want in cases.items():
        try:
            got = sync_wowsims.parse_current_phase(src)
        except SystemExit as e:
            problems.append(f"parse_current_phase({src!r}) raised SystemExit({e})")
            continue
        if got != want:
            problems.append(f"parse_current_phase({src!r}) = {got}, want {want}")
    return problems


def check_unwatch_ref_removes_the_key_and_refuses_an_absent_one() -> list[str]:
    """--watch-ref is a keyed upsert and nothing removed a key, so a deleted
    upstream branch stayed in the lock failing every --check forever. A hand
    edit would work but is invisible to every gate.
    """
    problems = []
    with _DoCheckHarness() as h:
        h.add_watched_ref(name="doomed/ref")

        rc = sync_wowsims.do_unwatch_ref("doomed/ref")
        if rc != 0:
            problems.append(f"--unwatch-ref on a present ref must return 0, got {rc}")
        lock = sync_wowsims.load_lock()
        if "doomed/ref" in (lock.get("watchedRefs") or {}):
            problems.append(
                f"--unwatch-ref left the key behind: {lock.get('watchedRefs')!r}"
            )

        rc_absent = sync_wowsims.do_unwatch_ref("never/there")
        if rc_absent != 2:
            problems.append(
                f"--unwatch-ref on an absent ref must refuse with 2, got {rc_absent}"
            )
    return problems


def check_sha_pin_refuses_to_guess_between_two_watched_refs() -> list[str]:
    """Two watched refs made the comparison depend on JSON key order: whichever
    key sat first won, silently. Taking the *last* key instead of the first left
    every check green, which is ticket 392. The pin must now refuse to choose.

    Writes the two-ref dict straight into the lock rather than going through
    do_watch_ref, which now refuses exactly this state -- the check has to be
    able to build a lock a hand edit could produce.
    """
    problems = []
    with _DoCheckHarness() as h:
        lock = sync_wowsims.load_lock()
        lock["commit"] = h.PIN_SHA
        lock["tag"] = h.PIN_SHA
        lock["watchedRefs"] = {
            "master": {"commit": h.UPSTREAM_SHA, "fetchedAt": "2026-01-01"},
            "other/ref": {"commit": h.UPSTREAM_SHA, "fetchedAt": "2026-01-01"},
        }
        h.write_lock(lock)
        rc, body = h.run()

    if rc == 0:
        problems.append(
            f"--check must not report success with two watched refs: {body.strip()!r}"
        )
    # Naming both is what makes the failure actionable -- the whole defect was
    # that a choice happened with nothing in the output saying so.
    for name in ("master", "other/ref"):
        if name not in body:
            problems.append(
                f"--check must name the watched ref {name!r} when it cannot "
                f"resolve the comparison: {body.strip()!r}"
            )
    return problems


def check_watch_ref_refuses_a_second_differing_ref() -> list[str]:
    """do_check compares a sha pin against the sole watched ref, so the single-ref
    invariant has to hold at write time too -- otherwise --watch-ref builds the
    ambiguous lock that --check can then only refuse.
    """
    problems = []
    with _DoCheckHarness() as h:
        h.add_watched_ref(name="master", commit=h.UPSTREAM_SHA)
        before = sync_wowsims.load_lock().get("watchedRefs")

        rc = sync_wowsims.do_watch_ref("other/ref")
        if rc != 2:
            problems.append(
                f"--watch-ref on a second differing ref must refuse with 2, got {rc}"
            )
        after = sync_wowsims.load_lock().get("watchedRefs")
        if after != before:
            problems.append(
                f"a refused --watch-ref must leave the lock untouched: "
                f"{before!r} -> {after!r}"
            )
    return problems


def check_watch_ref_still_refreshes_the_same_ref() -> list[str]:
    """Re-watching the ref already watched is how its recorded tip moves after an
    upstream push; the refusal above must not break that path.
    """
    problems = []
    with _DoCheckHarness() as h:
        h.add_watched_ref(name="master", commit="c" * 40)

        rc = sync_wowsims.do_watch_ref("master")
        if rc != 0:
            problems.append(f"--watch-ref on the ref already watched must return 0, got {rc}")
        watched = sync_wowsims.load_lock().get("watchedRefs") or {}
        if list(watched) != ["master"]:
            problems.append(f"re-watching must leave exactly one ref: {watched!r}")
        if watched.get("master", {}).get("commit") != h.UPSTREAM_SHA:
            problems.append(
                f"re-watching must refresh the recorded tip to the ref's current "
                f"sha: {watched!r}"
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
    # The --check / warn_upstream_drift output contract (ticket 245).
    check_drift_token_still_matches_what_check_emits,
    check_check_exit_codes_match_the_warner_branches,
    check_check_returns_zero_when_actually_in_sync,
    check_warner_never_claims_in_sync_when_check_failed,
    check_warner_reports_drift_and_stays_green,
    check_warner_skips_on_absent_vendor,
    check_warner_reports_clean_only_on_exit_zero,
    # The sha-pin comparison path and its removal counterpart (ticket 354).
    check_sha_pin_compares_against_its_watched_ref,
    check_sha_pin_in_sync_with_watched_ref_is_clean,
    check_sha_pin_tier_change_is_read_from_the_watched_ref,
    check_sha_pin_survives_an_unresolvable_watched_ref,
    # The phase file moved upstream and its old path 404s (ticket 551).
    check_phase_file_404_is_drift_not_a_crash,
    check_phase_is_read_from_the_new_path_when_the_old_one_404s,
    check_parse_current_phase_accepts_the_unannotated_form,
    check_unwatch_ref_removes_the_key_and_refuses_an_absent_one,
    # The single-watched-ref invariant, enforced at both ends (ticket 392).
    check_sha_pin_refuses_to_guess_between_two_watched_refs,
    check_watch_ref_refuses_a_second_differing_ref,
    check_watch_ref_still_refreshes_the_same_ref,
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
