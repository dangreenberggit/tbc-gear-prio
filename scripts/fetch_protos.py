#!/usr/bin/env python3
"""
fetch_protos.py -- pin the wowsims .proto schema into data/proto/ (PLAN.md §8.1).

This script is one of two writers of data/wowsims.lock.json -- it owns the
"proto" key (OWNED_KEY below) and nothing else. Adding a third writer? Read the
contract in scripts/pinned_fetch.py first.

Same pin as everything else in data/wowsims.lock.json: one commit sha, sha256
per file. Unlike vendor/ (gitignored, rebuilt locally), data/proto/ IS
committed -- the .proto files are the generation *input*, small, and reviewable
as a diff on a sim-version bump, same reasoning as data/presets/*.json.

The full file list is every proto/*.proto in the upstream repo that
ui.proto (which declares IndividualSimSettings) and api.proto (which declares
RaidSimRequest) need transitively -- see the import graph recorded below.
Missing one fails generation loudly rather than silently producing partial
types, so there's no guessing here.

    python scripts/fetch_protos.py            # fetch + verify against the lock
    python scripts/fetch_protos.py --check     # verify only, no writes
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from pinned_fetch import digest as sha256_of
from pinned_fetch import fetch as pinned_fetch
from pinned_fetch import is_crlf_drift
from pinned_fetch import lock_entry

ROOT = Path(__file__).resolve().parents[1]
LOCKFILE = ROOT / "data/wowsims.lock.json"
DEST = ROOT / "data/proto"
REPO = "wowsims/tbc-new"

# data/wowsims.lock.json has two writers: sync_wowsims.py owns the upstream pin
# (its OWNED_KEYS), this script owns "proto" and nothing else. The rule for both
# is the same: touch only your own key, carry every other key through untouched.
# Breaking it is silent -- --update once rebuilt the lockfile from its own keys
# and deleted this block outright, and the lockfile still parsed fine afterwards.
# scripts/check_lock_merge.py enforces the split; add a key here and you must
# tell that check about it.
OWNED_KEY = "proto"

# proto/*.proto at the pinned commit, upstream path -> local filename (same).
# ui.proto (IndividualSimSettings) imports api.proto (RaidSimRequest), apl.proto,
# common.proto, db.proto, spell.proto, paladin.proto; api.proto in turn imports
# every other class proto. This is the full transitive closure -- confirmed by
# reading each file's `import` lines at the pinned commit, not guessed.
PROTO_FILES = [
    "api.proto",
    "apl.proto",
    "common.proto",
    "db.proto",
    "druid.proto",
    "hunter.proto",
    "mage.proto",
    "paladin.proto",
    "priest.proto",
    "rogue.proto",
    "shaman.proto",
    "spell.proto",
    "test.proto",
    "ui.proto",
    "warlock.proto",
    "warrior.proto",
]


def load_lock() -> dict:
    if not LOCKFILE.exists():
        raise SystemExit(f"missing {LOCKFILE} -- run scripts/sync_wowsims.py --update first")
    return json.loads(LOCKFILE.read_text(encoding="utf-8"))


def fetch(sha: str, path: str) -> bytes:
    return pinned_fetch(REPO, sha, f"proto/{path}")


def do_fetch(lock: dict) -> int:
    sha = lock["commit"]
    DEST.mkdir(parents=True, exist_ok=True)

    files: dict = {}
    for name in PROTO_FILES:
        blob = fetch(sha, name)
        (DEST / name).write_bytes(blob)
        entry = lock_entry(f"proto/{name}", blob)
        files[name] = entry
        print(f"    {name:<16} {len(blob):>6,} bytes  {entry['sha256'][:12]}")

    # Re-read rather than writing back the dict we were handed: --update may
    # have rewritten the file since load_lock(), and this script owns exactly
    # one key. See OWNED_KEY and the note in sync_wowsims.merge_lock().
    lock = load_lock()
    lock[OWNED_KEY] = {"commit": sha, "files": files}
    LOCKFILE.write_text(json.dumps(lock, indent=2) + "\n", encoding="utf-8")
    print(f"\n  wrote {len(PROTO_FILES)} proto files to {DEST.relative_to(ROOT)}")
    print(f"  lockfile updated: {LOCKFILE.relative_to(ROOT)}")
    return 0


def do_check(lock: dict) -> int:
    proto_lock = lock.get("proto")
    if not proto_lock:
        print("  no proto pin recorded in the lockfile -- run scripts/fetch_protos.py")
        return 1

    drift = []
    if proto_lock["commit"] != lock["commit"]:
        drift.append(
            f"proto pin ({proto_lock['commit'][:12]}) is behind the main pin "
            f"({lock['commit'][:12]}) -- rerun scripts/fetch_protos.py"
        )

    for name, meta in proto_lock.get("files", {}).items():
        path = DEST / name
        if not path.exists():
            drift.append(f"missing locally: {path.relative_to(ROOT)} (run fetch_protos.py)")
            continue
        blob = path.read_bytes()
        if sha256_of(blob) != meta["sha256"]:
            rel = path.relative_to(ROOT)
            if is_crlf_drift(blob, meta):
                drift.append(
                    f"line-ending drift (CRLF), not a content mismatch: {rel} -- "
                    f"re-checkout: rm -f data/proto/*.proto && git checkout -- data/proto/"
                )
            else:
                drift.append(f"checksum mismatch: {rel}")

    missing_from_lock = set(PROTO_FILES) - set(proto_lock.get("files", {}))
    if missing_from_lock:
        drift.append(f"tracked but not pinned: {sorted(missing_from_lock)}")

    if not drift:
        print("  in sync.")
        return 0
    for d in drift:
        print(f"  DRIFT: {d}")
    return 1


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="verify only, write nothing")
    args = ap.parse_args()

    lock = load_lock()
    if args.check:
        return do_check(lock)
    return do_fetch(lock)


if __name__ == "__main__":
    raise SystemExit(main())
