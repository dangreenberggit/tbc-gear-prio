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


CHECKS = (
    check_vendor_is_empty_missing_dir,
    check_vendor_is_empty_empty_dir,
    check_vendor_is_empty_populated_dir,
    check_watched_refs_survive_merge_lock,
    check_watched_refs_in_owned_keys,
    check_ref_and_tag_mutually_exclusive_in_do_update,
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
