#!/usr/bin/env python3
"""Fail if sync_wowsims.py --update would drop another script's lockfile block.

data/wowsims.lock.json has more than one owner: sync_wowsims.py writes the
upstream pin, fetch_protos.py writes the `proto` block. --update used to
rebuild the dict from its own keys and write it, silently destroying `proto`
(16 file entries) on every run -- hit for real on phase-2/trust and repaired by
hand. These cases pin the merge so it can't regress.

Pure in-memory checks against merge_lock(); no network, no writes.

    python scripts/check_lock_merge.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import fetch_protos  # noqa: E402
from sync_wowsims import OWNED_KEYS, merge_lock  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
LOCKFILE = ROOT / "data/wowsims.lock.json"

# A stand-in for what sync_wowsims.py builds during --update.
OWNED = {
    "repo": "wowsims/tbc-new",
    "tag": "v0.0.101",
    "commit": "b" * 40,
    "currentPhase": 2,
    "defaultMaxPhase": 2,
    "files": {"db.json": {"path": "assets/database/db.json", "sha256": "x"}},
    "_comment": "generated",
}


def check_preserves_foreign_block() -> list[str]:
    """The original bug: a foreign top-level key vanishing on --update."""
    prev = {**OWNED, "tag": "v0.0.100", "proto": {"commit": "a" * 40, "files": {"ui.proto": {}}}}
    merged = merge_lock(prev, OWNED)
    if "proto" not in merged:
        return ["merge_lock() dropped the `proto` block -- this is the original bug"]
    if merged["proto"] != prev["proto"]:
        return ["merge_lock() modified the `proto` block instead of carrying it forward"]
    return []


def check_owned_keys_win() -> list[str]:
    """Preserving foreign keys must not stop --update refreshing its own."""
    prev = {**OWNED, "tag": "v0.0.100", "commit": "a" * 40, "currentPhase": 1}
    merged = merge_lock(prev, OWNED)
    return [
        f"merge_lock() kept the stale {k!r}: {merged.get(k)!r} != {v!r}"
        for k, v in OWNED.items()
        if merged.get(k) != v
    ]


def check_unknown_keys_generic() -> list[str]:
    """Carry-forward is by ownership, not a hardcoded `proto` -- so the next
    script to add a block doesn't have to edit sync_wowsims.py."""
    prev = {**OWNED, "somethingNew": {"pinned": True}}
    merged = merge_lock(prev, OWNED)
    if merged.get("somethingNew") != {"pinned": True}:
        return ["merge_lock() only preserves known keys; it must preserve any unowned key"]
    return []


def check_first_run() -> list[str]:
    """No previous lockfile (or an empty one) must still produce a valid lock."""
    problems = []
    for label, prev in (("None", None), ("empty", {})):
        merged = merge_lock(prev, OWNED)
        if merged != OWNED:
            problems.append(f"merge_lock({label}, owned) should equal the owned keys exactly")
    return problems


def check_rejects_unclaimed_key() -> list[str]:
    """A key in the built dict but not in OWNED_KEYS must abort the write. If it
    silently merged, prev's value would win and the pin would freeze."""
    try:
        merge_lock({**OWNED, "newPin": "stale"}, {**OWNED, "newPin": "fresh"})
    except SystemExit:
        return []
    return [
        "merge_lock() accepted a key absent from OWNED_KEYS -- it must refuse, or that "
        "key silently keeps its previous value on every --update"
    ]


def check_proto_writer_owns_one_key() -> list[str]:
    """fetch_protos.py must claim exactly the key sync_wowsims.py disclaims.
    A drift here means one script writes a block the other deletes."""
    if fetch_protos.OWNED_KEY in OWNED_KEYS:
        return [
            f"both scripts claim {fetch_protos.OWNED_KEY!r} -- sync_wowsims.py would "
            "overwrite the proto pin it is supposed to preserve"
        ]
    return []


def check_owned_keys_match_writer() -> list[str]:
    """OWNED_KEYS must list exactly what do_update() writes. If someone adds a
    key to the lock dict and forgets this set, that key gets treated as foreign
    and the stale value sticks forever."""
    if not LOCKFILE.exists():
        return []
    live = json.loads(LOCKFILE.read_text(encoding="utf-8"))
    unaccounted = set(live) - set(OWNED_KEYS) - {fetch_protos.OWNED_KEY}
    if unaccounted:
        return [
            f"{LOCKFILE.name} has top-level key(s) {sorted(unaccounted)} that no script "
            "claims here. A third writer has appeared: confirm which script owns each "
            "key, check it preserves the others (the contract is in scripts/"
            "pinned_fetch.py), then add its OWNED_KEY to the allowance above."
        ]
    missing = set(OWNED) - set(OWNED_KEYS)
    if missing:
        return [f"OWNED_KEYS is missing keys do_update() writes: {sorted(missing)}"]
    return []


CHECKS = (
    check_preserves_foreign_block,
    check_owned_keys_win,
    check_unknown_keys_generic,
    check_first_run,
    check_rejects_unclaimed_key,
    check_proto_writer_owns_one_key,
    check_owned_keys_match_writer,
)


def main() -> int:
    problems = [p for check in CHECKS for p in check()]
    if not problems:
        print(f"lockfile merge preserves foreign blocks ({len(CHECKS)} checks)")
        return 0
    for p in problems:
        print(f"  FAIL: {p}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
