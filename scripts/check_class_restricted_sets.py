#!/usr/bin/env python3
"""Fail if a universe offers a class a set piece only another class can equip.

`data/class-restricted-sets.json` lists the item sets Wowhead tags with one
class. The fork's `canEquipItem` admitted their pieces to other classes' pools
(the Cryptstalker pieces carry no `classAllowlist` in wowsims' db.json), so
`data/equip-eligibility.json` alone does not keep them out;
`assemble_universe.py`'s `eligible_d7` does, and this is the check that it
still does. The cause of the leak was not investigated, by the owner's
instruction.

Universe entries do not record a `setId`, so the item -> set join reads
`vendor/wowsims/db.json`. That file is gitignored: when it is absent this
skips cleanly (exit 0, saying why), like the other vendor-gated checks.

Run via `pnpm verify` (`pnpm class-restricted-sets:check`).

Exit 0 ok (including "nothing to check"), 1 a leak or a malformed table,
2 could not run.
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import assemble_universe as A  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
TABLE = ROOT / "data/class-restricted-sets.json"
UNIVERSES = ROOT / "data/universes"
SOURCE_PREFIX = "https://nether.wowhead.com/tbc/tooltip/item-set/"
CLASS_IDS = {
    A.CLASS_WARRIOR,
    A.CLASS_PALADIN,
    A.CLASS_HUNTER,
    A.CLASS_ROGUE,
    A.CLASS_PRIEST,
    A.CLASS_SHAMAN,
    A.CLASS_MAGE,
    A.CLASS_WARLOCK,
    A.CLASS_DRUID,
}


def load_table(path: Path) -> tuple[dict[int, int], list[str]]:
    """setId -> classId, plus every way the table is malformed."""
    raw = json.loads(path.read_text(encoding="utf-8"))
    sets = raw.get("sets")
    if not isinstance(sets, dict) or not sets:
        return {}, [f"{path.name}: no 'sets' object"]
    problems: list[str] = []
    out: dict[int, int] = {}
    for key, row in sets.items():
        if not key.isdigit():
            problems.append(f"set key {key!r} is not a setId")
            continue
        class_id = row.get("classId") if isinstance(row, dict) else None
        if class_id not in CLASS_IDS:
            problems.append(f"set {key}: classId {class_id!r} is not a class")
            continue
        if not row.get("name"):
            problems.append(f"set {key}: no name")
        # The source is the only evidence the class is right; one per row.
        if row.get("source") != f"{SOURCE_PREFIX}{key}":
            problems.append(f"set {key}: source is not {SOURCE_PREFIX}{key}")
        out[int(key)] = class_id
    return out, problems


def find_leaks(
    set_class: dict[int, int], item_set: dict[int, int], universes: Path
) -> tuple[int, Counter[str]]:
    """(lists read, per-list count of entries from another class's set)."""
    per_list: Counter[str] = Counter()
    lists = 0
    for path in sorted(universes.glob("*-p?.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        lists += 1
        class_id = A.SPEC_PROFILES[doc["spec"]].class_id
        for entry in doc["entries"]:
            owner = set_class.get(item_set.get(int(entry["itemId"]), -1))
            if owner is not None and owner != class_id:
                per_list[path.name] += 1
    return lists, per_list


def main() -> int:
    set_class, problems = load_table(TABLE)
    if problems:
        for p in problems:
            print(f"class-restricted sets: {p}")
        return 1
    if not A.DB.is_file():
        print(
            "class-restricted sets: skipped -- vendor/wowsims/db.json is absent "
            "(gitignored); universe entries carry no setId to check without it"
        )
        return 0
    try:
        db = json.loads(A.DB.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        print(f"class-restricted sets: could not read {A.DB}: {exc}")
        return 2
    item_set = {
        int(it["id"]): int(it["setId"]) for it in db["items"] if it.get("setId")
    }
    lists, per_list = find_leaks(set_class, item_set, UNIVERSES)
    if lists == 0:
        print(f"class-restricted sets: no universes under {UNIVERSES}")
        return 2
    if per_list:
        total = sum(per_list.values())
        print(
            f"class-restricted sets: {total} entries in {len(per_list)} of "
            f"{lists} universes are pieces of another class's set "
            f"(data/class-restricted-sets.json); rerun assemble_universe.py"
        )
        for name in sorted(per_list):
            print(f"  {name}: {per_list[name]}")
        return 1
    print(
        f"class-restricted sets: ok ({len(set_class)} sets, {lists} universes, "
        f"0 off-class entries)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
