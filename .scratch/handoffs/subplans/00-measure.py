#!/usr/bin/env python3
"""Measurement script for .scratch/handoffs/subplans/00-decisions.md.

Reuses scripts/generate_pool.py's slot map and eligibility constants by
import rather than re-typing them, per AGENTS.md "Durable claims" (every
number here must be re-runnable).

Run from repo root:
    python .scratch/handoffs/subplans/00-measure.py
"""
from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "scripts"))

import generate_pool as gp  # noqa: E402

DB = ROOT / "vendor/wowsims/db.json"
db = json.loads(DB.read_text(encoding="utf-8"))

zones_by_id = {
    int(z["id"]): str(z["name"])
    for z in (db.get("zones") or [])
    if isinstance(z, dict) and "id" in z and "name" in z
}

ZONE_IDS = {
    "Karazhan": 3457,
    "Gruul's Lair": 3923,
    "Magtheridon's Lair": 3836,
    "Serpentshrine Cavern": 3607,
    "Tempest Keep": 3845,
    "Black Temple": 3959,
    "Hyjal Summit": 3606,
    "Zul'Aman": 3805,
    "Sunwell Plateau": 4075,
}

PHASE_ZONES = {
    1: ["Karazhan", "Gruul's Lair", "Magtheridon's Lair"],
    2: ["Serpentshrine Cavern", "Tempest Keep"],
    3: ["Black Temple", "Hyjal Summit"],
    4: ["Zul'Aman"],
    5: ["Sunwell Plateau"],
}


def zone_of_item(it: dict) -> str | None:
    """Resolve an item's raid zone from db.json sources[], drop-kind only."""
    raw = it.get("sources")
    if not isinstance(raw, list) or not raw:
        return None
    first = raw[0]
    if not isinstance(first, dict):
        return None
    if "drop" not in first:
        return None
    drop = first["drop"] or {}
    zone = drop.get("zone") or drop.get("zoneName") or zones_by_id.get(drop.get("zoneId"))
    return str(zone) if zone else None


def eligible(it: dict) -> bool:
    """D7 eligibility: body slots plate/leather/mail, ranged=libram only,
    weapon 2H non-staff non-polearm, rare+, Kael temps excluded."""
    if it.get("id") in gp.KAEL_TEMP_LEGENDARY_IDS:
        return False
    t = it.get("type")
    if t is None:
        return False
    slot = gp.ITEM_TYPE_SLOT.get(t)
    if slot is None:
        return False
    if it.get("quality", 0) < gp.MIN_QUALITY:
        return False
    ARMOR_LEATHER = 2
    ARMOR_MAIL = 3
    ARMOR_PLATE = gp.ARMOR_PLATE
    if slot in {"head", "shoulder", "chest", "wrist", "hands", "waist", "legs", "feet"}:
        return it.get("armorType") in (ARMOR_LEATHER, ARMOR_MAIL, ARMOR_PLATE)
    if slot == "weapon":
        if it.get("handType") != gp.HAND_TYPE_TWO_HAND:
            return False
        wt = it.get("weaponType")
        if wt in (gp.WEAPON_POLEARM, gp.WEAPON_STAFF):
            return False
        return True
    if slot == "ranged":
        return it.get("rangedWeaponType") == gp.RANGED_LIBRAR
    return True


items = db["items"]
eligible_items = [it for it in items if eligible(it)]
print(f"Total items in db.json: {len(items)}")
print(f"D7-eligible items (any phase, any zone-resolution status): {len(eligible_items)}")

resolved = [it for it in eligible_items if zone_of_item(it) is not None]
print(f"D7-eligible items whose zone resolves via db.json sources[]: {len(resolved)}")

# ---------------------------------------------------------------------------
# Decision 1: carryover policy
# ---------------------------------------------------------------------------
print("\n=== Decision 1: carryover ===")


def zones_for_max_phase(max_phase: int) -> set[str]:
    out: set[str] = set()
    for p in range(1, max_phase + 1):
        out.update(PHASE_ZONES.get(p, []))
    return out


def newest_zones_for_max_phase(max_phase: int) -> set[str]:
    return set(PHASE_ZONES.get(max_phase, []))


for max_phase in range(1, 6):
    union_zones = zones_for_max_phase(max_phase)
    newest_zones = newest_zones_for_max_phase(max_phase)

    union_items = [it for it in resolved if zone_of_item(it) in union_zones]
    newest_items = [it for it in resolved if zone_of_item(it) in newest_zones]

    def by_slot(items_list):
        d: dict[str, int] = defaultdict(int)
        for it in items_list:
            d[gp.ITEM_TYPE_SLOT[it["type"]]] += 1
        return dict(sorted(d.items()))

    print(f"\nmaxPhase {max_phase}: union zones = {sorted(union_zones)}")
    print(f"  union total = {len(union_items)}  per-slot = {by_slot(union_items)}")
    print(f"  newest-only total = {len(newest_items)}  per-slot = {by_slot(newest_items)}")

# ---------------------------------------------------------------------------
# Decision 2: badge vendors
# ---------------------------------------------------------------------------
print("\n=== Decision 2: badge vendors ===")


def source_kind(it: dict) -> str | None:
    raw = it.get("sources")
    if not isinstance(raw, list) or not raw:
        return None
    first = raw[0]
    if not isinstance(first, dict):
        return None
    for k in ("drop", "crafted", "rep", "quest", "soldBy", "otherSource"):
        if k in first:
            return k
    return next(iter(first.keys()), None)


kinds = defaultdict(int)
for it in eligible_items:
    kinds[source_kind(it)] += 1
print(f"Source-kind breakdown across {len(eligible_items)} eligible items: {dict(kinds)}")

# Look for any explicit badge/vendor markers in the raw sources structure.
badge_like = []
for it in eligible_items:
    raw = it.get("sources")
    if not isinstance(raw, list):
        continue
    for src in raw:
        if not isinstance(src, dict):
            continue
        blob = json.dumps(src).lower()
        if "badge" in blob or "emblem" in blob:
            badge_like.append(it)
            break
print(f"Eligible items whose sources[] mentions 'badge'/'emblem': {len(badge_like)}")
for it in badge_like[:20]:
    print(f"  {it['id']} {it['name']}  sources={it.get('sources')}")

# ---------------------------------------------------------------------------
# Decision 3: PvP gear
# ---------------------------------------------------------------------------
print("\n=== Decision 3: PvP gear ===")
pvp_like = []
for it in eligible_items:
    raw = it.get("sources")
    if not isinstance(raw, list):
        continue
    for src in raw:
        if not isinstance(src, dict):
            continue
        blob = json.dumps(src).lower()
        if "arena" in blob or "honor" in blob or "pvp" in blob:
            pvp_like.append(it)
            break
print(f"Eligible items whose sources[] mentions 'arena'/'honor'/'pvp': {len(pvp_like)}")

# Cross-check against curate_ret_pool.py HAND map's pvp entries + committed ret.json
import curate_ret_pool as cp  # noqa: E402

hand_pvp = [k for k, v in cp.HAND.items() if v.get("kind") == "pvp"]
print(f"HAND map entries with kind=='pvp' in curate_ret_pool.py: {len(hand_pvp)}")

force_pvp = [f for f in cp.FORCE if f.get("source", {}).get("kind") == "pvp"]
print(f"FORCE entries with kind=='pvp' in curate_ret_pool.py: {len(force_pvp)}")

ret_json = json.loads((ROOT / "data/pools/ret.json").read_text(encoding="utf-8"))
committed_pvp = [e for e in ret_json["entries"] if (e.get("source") or {}).get("kind") == "pvp"]
print(f"Committed data/pools/ret.json entries with source.kind=='pvp': {len(committed_pvp)}")
for e in committed_pvp:
    print(f"  {e['itemId']} {e['name']} ({e['slot']}) via={e['source'].get('via')}")

# ---------------------------------------------------------------------------
# Decision 4: quality floor
# ---------------------------------------------------------------------------
print("\n=== Decision 4: quality floor ===")


def eligible_any_quality(it: dict) -> bool:
    if it.get("id") in gp.KAEL_TEMP_LEGENDARY_IDS:
        return False
    t = it.get("type")
    if t is None:
        return False
    slot = gp.ITEM_TYPE_SLOT.get(t)
    if slot is None:
        return False
    ARMOR_LEATHER = 2
    ARMOR_MAIL = 3
    ARMOR_PLATE = gp.ARMOR_PLATE
    if slot in {"head", "shoulder", "chest", "wrist", "hands", "waist", "legs", "feet"}:
        return it.get("armorType") in (ARMOR_LEATHER, ARMOR_MAIL, ARMOR_PLATE)
    if slot == "weapon":
        if it.get("handType") != gp.HAND_TYPE_TWO_HAND:
            return False
        wt = it.get("weaponType")
        if wt in (gp.WEAPON_POLEARM, gp.WEAPON_STAFF):
            return False
        return True
    if slot == "ranged":
        return it.get("rangedWeaponType") == gp.RANGED_LIBRAR
    return True


for max_phase in range(1, 6):
    union_zones = zones_for_max_phase(max_phase)
    zone_scoped = [it for it in items if eligible_any_quality(it) and zone_of_item(it) in union_zones]
    rare_only = [it for it in zone_scoped if it.get("quality") == 3]
    epic_plus = [it for it in zone_scoped if it.get("quality", 0) >= 4]
    print(
        f"maxPhase {max_phase}: zone-scoped (any quality, zone resolved) = {len(zone_scoped)}, "
        f"rare(quality==3) = {len(rare_only)}, epic+(quality>=4) = {len(epic_plus)}"
    )
    for it in rare_only:
        print(f"    rare: {it['id']} {it['name']} slot={gp.ITEM_TYPE_SLOT[it['type']]} zone={zone_of_item(it)}")

# ---------------------------------------------------------------------------
# Decision 4 supplement: how many D7-eligible rares exist anywhere (any zone,
# any phase), and why none of them are inside the nine target raid zones.
# ---------------------------------------------------------------------------
print("\n=== Decision 4 supplement: rares outside the raid-zone filter ===")
elig_any_q = [it for it in items if eligible_any_quality(it)]
rares_any = [it for it in elig_any_q if it.get("quality") == 3]
phase_counts = defaultdict(int)
for it in rares_any:
    phase_counts[it.get("phase")] += 1
print(f"Total D7-eligible rares, any zone/phase: {len(rares_any)}")
print(f"By phase: {dict(sorted(phase_counts.items(), key=lambda kv: (kv[0] is None, kv[0])))}")
p5_rares = [it for it in rares_any if it.get("phase") == 5]
p5_zone_ids = {(it.get("sources") or [{}])[0].get("drop", {}).get("zoneId") for it in p5_rares if it.get("sources")}
print(f"Phase-5 rares resolve to zoneId(s): {p5_zone_ids}")
for zid in p5_zone_ids:
    if zid is not None:
        print(f"  zoneId {zid} = {zones_by_id.get(zid)}")
