#!/usr/bin/env python3
"""
generate_item_gem_index.py -- build data/items/index.json, data/gems/palette.json
and data/enchants/index.json from the pinned vendor/wowsims/db.json
(PLAN.md 5.1, 8.3, 9).

All outputs are GENERATED, committed, and never read at runtime from db.json
itself -- db.json is a build input only (PLAN.md 8.3 [P0]). Re-run this after
`pnpm sync:wowsims` moves the pin.

    python scripts/generate_item_gem_index.py

Exit codes: 0 on success, 2 if vendor/wowsims/db.json is missing (run
`pnpm sync:wowsims` first).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "vendor/wowsims/db.json"
ITEMS_OUT = ROOT / "data/items/index.json"
GEMS_OUT = ROOT / "data/gems/palette.json"
ENCHANTS_OUT = ROOT / "data/enchants/index.json"

# wowsims ItemType enum -> readable slot name, matching this repo's sim-slot
# vocabulary (packages/core/src/slots-table.json: "waist" not "belt", "wrist"
# not "bracer"). Cross-referenced against sim/core/proto/common.proto naming
# and independently verified two ways before being trusted here:
#   1. Item names: 8345 "Wolfshead Helm" -> type 1, 10778 "Necklace of
#      Sanctuary" -> type 2, 21846 "Spellfire Belt" -> type 8, and so on for
#      all 14 values against items whose slot is unambiguous from their name.
#   2. Independently, db.json's own `enchants[].type` enum uses the SAME
#      numbering and the enchant names state their slot in English (e.g.
#      effectId 2928 "Enchant Ring - Spellpower" has type 11, matching the
#      item-side type-11 examples, which are all rings). No enchant record
#      exists with type 2, 8, or 12 (neck/waist/trinket) -- see
#      ENCHANTABLE_TYPES below.
# scripts/verify_fixture.py independently hardcodes this identical mapping
# ("From sim/core/proto/common.proto"), which is corroborating precedent, not
# the source of truth -- the two-way cross-check above is what earned it.
# Proto files are not yet pinned into this repo (PLAN.md 8.1); reconcile this
# table against sim/core/proto/common.proto once that lands.
ITEM_TYPE_SLOT = {
    1: "head",
    2: "neck",
    3: "shoulder",
    4: "back",
    5: "chest",
    6: "wrist",
    7: "hands",
    8: "waist",
    9: "legs",
    10: "feet",
    11: "finger",
    12: "trinket",
    13: "weapon",
    14: "ranged",
}

# Which of the 14 slots ever appear as an `enchants[].type` in db.json --
# i.e. which slots have at least one real enchant recipe in the game data.
# Derived, not asserted: computed from db.json at generation time (see
# `enchantable_types_from_db`) and asserted equal to this constant so a
# future db.json revision that adds/removes an enchant type fails the build
# instead of silently drifting.
#
# PLAN.md 9 states the TBC rule as "neck, finger (rings), and trinket cannot
# carry a permanent enchant." Cross-checking the real fixture
# (test/fixtures/slamaltman.raw.json, 25 combatants, all `combatant_info_events`
# entries -- not just the two Phase-0 probe characters docs/phase0-findings.md
# spot-checked) shows finger slots WITH a permanentEnchant in 14/50 cases,
# every one resolving to a real "Enchant Ring - *" record
# (effectId 2928/2929/2930/2931, requiredProfession 3 = Enchanting). Neck and
# trinket are clean in both the fixture (0/25 and 0/50 enchanted) and the
# enchants table (no type-2 or type-12 records at all). So the corrected,
# fixture-verified rule implemented here is: neck, waist, and trinket are the
# three non-enchantable slots -- not neck/finger/trinket. Flagged prominently
# in the handoff; PLAN.md 9's text should be corrected to match.
NOT_ENCHANTABLE_SLOTS = {"neck", "waist", "trinket"}

# Dense stat-array length. Read from the proto rather than hardcoded so that a
# Stat enum gaining a member cannot silently leave item and gem arrays at
# different lengths -- `epScore` indexes both by proto.Stat ordinal.
COMMON_PROTO = ROOT / "data/proto/common.proto"


def stat_array_len() -> int:
    """`NextIndex` from the proto's Stat enum -- upstream's own declaration of
    the array width, cross-checked against the members actually defined."""
    text = COMMON_PROTO.read_text(encoding="utf-8")
    enum = re.search(r"//\s*NextIndex:\s*(\d+);\s*enum Stat \{(.*?)\n\}", text, re.S)
    if not enum:
        raise SystemExit(
            f"could not find the Stat enum and its NextIndex in {COMMON_PROTO}"
        )
    declared = int(enum.group(1))
    members = [
        int(m) for m in re.findall(r"^\s+Stat\w+ = (\d+);", enum.group(2), re.M)
    ]
    if not members or max(members) != declared - 1:
        raise SystemExit(
            f"{COMMON_PROTO} Stat enum declares NextIndex {declared} but its "
            f"highest member is {max(members) if members else 'none'} -- "
            "reconcile the proto rather than guessing the array width."
        )
    return declared


STAT_ARRAY_LEN = stat_array_len()


def enchantable_types_from_db(db: dict) -> set[int]:
    return {e["type"] for e in db.get("enchants", []) if e.get("type") is not None}


def load_db() -> dict:
    if not DB.exists():
        print(
            f"!! {DB} not found. Run `pnpm sync:wowsims` to fetch the pinned "
            "upstream build input first.",
            file=sys.stderr,
        )
        sys.exit(2)
    with open(DB, encoding="utf-8") as fh:
        return json.load(fh)


def item_stats(it: dict) -> list[int]:
    """Dense stat array, same shape and length as db.json's gems[].stats.

    Item stats are stored differently from gem stats: gems carry a dense
    42-long list, items carry a sparse index->value map under
    `scalingOptions["0"].stats`. Densify so both sides of `epScore` and the
    cap sum see one shape. Every item in the pinned db has exactly the "0"
    scaling key, and the highest index observed is 41.
    """
    scaling = (it.get("scalingOptions") or {}).get("0") or {}
    sparse = scaling.get("stats") or {}
    dense = [0] * STAT_ARRAY_LEN
    for index, value in sparse.items():
        slot = int(index)
        if slot >= STAT_ARRAY_LEN:
            raise ValueError(
                f"item {it['id']} ({it.get('name')!r}) has stat index {slot}, "
                f"beyond STAT_ARRAY_LEN={STAT_ARRAY_LEN} -- proto.Stat grew"
            )
        dense[slot] = value
    return dense


def build_items_index(db: dict) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for it in db["items"]:
        item_type = it.get("type")
        if item_type is None:
            continue  # not equippable (herbs, quest tokens, toys -- no slot)

        slot = ITEM_TYPE_SLOT.get(item_type)
        if slot is None:
            raise ValueError(
                f"item {it['id']} ({it.get('name')!r}) has unknown type "
                f"{item_type} -- ITEM_TYPE_SLOT needs a new entry"
            )

        gem_sockets = it.get("gemSockets") or []
        entry = {
            "name": it["name"],
            "slot": slot,
            "sockets": gem_sockets,
            "stats": item_stats(it),
            "socketBonus": it.get("socketBonus") or [],
            "enchantable": slot not in NOT_ENCHANTABLE_SLOTS,
            "setId": it.get("setId"),
            "setName": it.get("setName"),
            "phase": it.get("phase"),
            "unique": bool(it.get("unique")),
            "requiredProfession": it.get("requiredProfession"),
            # `enchantable` is a slot-level fact; these three are what the
            # UI's enchantAppliesToItem needs to decide whether a *specific*
            # enchant fits this *specific* item (2H Savagery onto a 1H, say).
            "itemType": item_type,
            "handType": it.get("handType"),
            "weaponType": it.get("weaponType"),
            "rangedWeaponType": it.get("rangedWeaponType"),
        }
        out[str(it["id"])] = entry
    return out


def build_enchants_index(db: dict) -> dict[str, list[dict]]:
    """Keyed by effectId -- the id WCL reports as `permanentEnchant`.

    Verified against test/fixtures/slamaltman.raw.json: 64 of the 65 distinct
    permanentEnchant values there resolve as effectId and 0 resolve as
    spellId, so effectId is the join key the rest of the engine already uses.

    **The value is a list because effectId is not unique**: 141 records carry
    137 distinct ids. The four collisions each pair enchants for different
    slots (2564 is both Gloves - Superior Agility and Weapon - Agility), and
    three of them are worn in the fixture, so keying one-to-one silently kept
    the wrong slot's record. Readers disambiguate on the item's own slot.

    `enchantType` is absent on 127 of 141 records (meaning Normal / 0); only
    the two-hand and shield enchants carry it. `extraTypes` is the additional
    slots an enchant also applies to -- armor kits carry it, and the UI's
    applicability rule unions it with `type`.
    """
    out: dict[str, list[dict]] = {}
    for e in db.get("enchants", []):
        effect_id = e.get("effectId")
        if effect_id is None:
            continue
        out.setdefault(str(effect_id), []).append(
            {
                "name": e.get("name"),
                "type": e.get("type"),
                "enchantType": e.get("enchantType") or 0,
                "extraTypes": e.get("extraTypes") or [],
            }
        )
    return out


def build_gem_palette(db: dict) -> list[dict]:
    """PLAN.md 9 R4 palette filtering: JC-restricted gems excluded outright
    (professions aren't modelled, so a JC-only recommendation is a dead end
    for anyone else). Phase and `unique` are kept as fields rather than
    filtered here -- same "each entry carries its own phase, filtering
    happens at rank time" pattern as data/pools/<spec>.json (PLAN.md 8.3),
    so maxPhase filtering doesn't need re-generating this file per tier."""
    out = []
    for g in db["gems"]:
        if g.get("requiredProfession"):
            continue
        out.append(
            {
                "id": g["id"],
                "colour": g.get("color"),
                "stats": g.get("stats") or [],
                "phase": g.get("phase"),
                "quality": g.get("quality"),
                "unique": bool(g.get("unique")),
            }
        )
    return out


def main() -> int:
    db = load_db()

    observed_enchantable_types = enchantable_types_from_db(db)
    observed_not_enchantable_slots = {
        slot
        for t, slot in ITEM_TYPE_SLOT.items()
        if t not in observed_enchantable_types
    }
    if observed_not_enchantable_slots != NOT_ENCHANTABLE_SLOTS:
        raise SystemExit(
            "db.json's enchants table no longer matches the hardcoded "
            f"NOT_ENCHANTABLE_SLOTS: db.json says {sorted(observed_not_enchantable_slots)}, "
            f"code says {sorted(NOT_ENCHANTABLE_SLOTS)}. Update this script rather than "
            "silently drifting."
        )

    items_index = build_items_index(db)
    gem_palette = build_gem_palette(db)
    enchants_index = build_enchants_index(db)

    ITEMS_OUT.parent.mkdir(parents=True, exist_ok=True)
    GEMS_OUT.parent.mkdir(parents=True, exist_ok=True)
    ENCHANTS_OUT.parent.mkdir(parents=True, exist_ok=True)

    # newline="\n": the committed artifacts are LF; Windows text mode would
    # otherwise rewrite all three as CRLF and every regen would read as a
    # full-file diff against HEAD.
    with open(ITEMS_OUT, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(items_index, fh, indent=2, sort_keys=True)
        fh.write("\n")

    with open(GEMS_OUT, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(gem_palette, fh, indent=2)
        fh.write("\n")

    with open(ENCHANTS_OUT, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(enchants_index, fh, indent=2, sort_keys=True)
        fh.write("\n")

    # Print both counts, not just the key count: they differ only because
    # effectId collides, and reporting the smaller number alone is what let
    # four dropped records look like a clean build.
    enchant_records = sum(len(v) for v in enchants_index.values())
    print(
        f"  {ENCHANTS_OUT.relative_to(ROOT)}: {enchant_records} enchants "
        f"under {len(enchants_index)} effectIds"
    )
    print(f"  {ITEMS_OUT.relative_to(ROOT)}: {len(items_index)} equippable items")
    print(f"  {GEMS_OUT.relative_to(ROOT)}: {len(gem_palette)} gems "
          f"({len(db['gems']) - len(gem_palette)} JC-restricted excluded)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
