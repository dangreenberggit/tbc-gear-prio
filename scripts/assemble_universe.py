#!/usr/bin/env python3
"""
assemble_universe.py — build phase-scoped ret candidate universes (sub-phase 4).

Merges db.json sources, AtlasLoot parse, two-hop token map, and Wowhead ret lists.
D7 eligibility is implemented here (leather/mail/librams allowed; not plate-only).

    python scripts/assemble_universe.py --max-phase 2
    python scripts/assemble_universe.py --max-phase 3 --out data/universes/ret-p3.json

Exit 0 ok, 2 missing inputs.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "vendor/wowsims/db.json"
EP_WEIGHTS = ROOT / "data/presets/ret/p2.ep-weights.json"
PHASE_RAIDS = ROOT / "data/phase_raids.json"
ATLASLOOT = ROOT / "data/atlasloot_sources.json"

# Pinned wowsims ret gear-set presets (vendor/wowsims/ret_*.gear.json — see
# packages/core/test/pool-hardening.test.ts's wowsimsCuratedItemIds for the
# same file list). Upstream tbc-new only ships one curated set per stage for
# retribution (no BiS/Alt/Realistic split like some other specs), so any item
# id that appears in one of these files is tagged "BiS".
WOWSIMS_GEAR_SETS = [
    ROOT / "vendor/wowsims/ret_preraid.gear.json",
    ROOT / "vendor/wowsims/ret_p1.gear.json",
    ROOT / "vendor/wowsims/ret_p2.gear.json",
]
TWO_HOP = ROOT / "data/two-hop/ret-tokens.json"
WOWHEAD_DIR = ROOT / "data/wowhead-lists/ret"
DEFAULT_OUT_DIR = ROOT / "data/universes"

# Must match the row in data/phase_raids.json and AtlasLoot's WorldBossesBC
# alias — outdoor bosses have no zoneId anywhere in db.json, so this string is
# the only thing tying their drops to a phase.
WORLD_BOSS_ZONE = "World Bosses"

# db.json item type → our pool slot name
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

ARMOR_LEATHER = 2
ARMOR_MAIL = 3
ARMOR_PLATE = 4
WEAPON_POLEARM = 6
WEAPON_STAFF = 8
HAND_TYPE_TWO_HAND = 4
RANGED_LIBRAM = 7
MIN_QUALITY = 3

KAEL_TEMP_LEGENDARY_IDS = frozenset(
    {30318, 30313, 30316, 30317, 30312, 30311, 30314}
)

RET_TIER_PIECE_IDS = frozenset(
    {
        29073,
        29075,
        29071,
        29072,
        29074,
        30131,
        30133,
        30129,
        30130,
        30132,
        30989,
        30997,
        30990,
        30982,
        30993,
        34431,
        34485,
        34561,
    }
)

# Wowhead list files included when assembling up to maxPhase N.
WOWHEAD_STAGE_FOR_MAX_PHASE: dict[int, list[str]] = {
    2: ["p1-p2"],
    3: ["p1-p2", "p3"],
    4: ["p1-p2", "p3", "p4"],
    5: ["p1-p2", "p3", "p4", "p5"],
}

DROP_RE = re.compile(r"Drop:\s*(.+?)\s*\(([^)]+)\)", re.IGNORECASE)
BADGE_RE = re.compile(
    r"(\d+)\s*(?:x\s*)?Badges?\s+of\s+Justice|(\d+)x\s*Badge\s+of\s+Justice",
    re.IGNORECASE,
)
CRAFTED_RE = re.compile(r"Crafted:\s*([^(\n]+)|Profession:\s*([^(\n]+)", re.IGNORECASE)

# Stat 5 (SpellDamage) is deliberately NOT here: data/presets/ret/p2.ep-weights
# .json prices it at 0.17, so calling it caster-only would let the junk filter
# reject items this repo's own EP model values. (The pre-merge domain review
# attributed that weight to ret's spell-power coefficients on Seal/Judgement of
# Blood and Crusader Strike — plausible, but untested here; the EP weight alone
# is sufficient reason.)
# common.proto Class enum: ClassPaladin = 2.
CLASS_PALADIN = 2
# Mirrors the ItemSource union in packages/core/src/pool.ts. A kind this file
# emits but that file cannot parse is a build failure, not a runtime surprise.
ITEM_SOURCE_KINDS = frozenset(
    {"raid", "token", "badge", "crafted", "rep", "heroic", "pvp", "world"}
)
# common.proto PseudoStat enum: PseudoStatMainHandDps = 0. A separate index
# space from the Stat enum -- upstream weights both, and they are unrelated
# quantities (Stat 41 PhysicalDamage is a flat per-hit bonus from gems and
# enchants, never weapon damage).
PSEUDO_MAIN_HAND_DPS = 0
CASTER_ONLY_STATS = frozenset({3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16})
MELEE_STATS = frozenset({0, 1, 17, 20, 21, 22, 23, 24})
# `weapon` stays absent even though ep_score can now see weapon damage. The
# rule drops the bottom 10% *within a slot*, which assumes the bottom is junk;
# across 17 P3 two-handers the scores span only 639-845 (1.3x), so it would
# evict Glaive of the Pit and Despair at 114-120 weapon dps. Sockets are still
# unscored, and Glaive has three. Re-measure before adding `weapon` back.
SLOTS_WITH_EP_SIGNAL = frozenset({"feet", "waist", "hands", "wrist"})


def load_json(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def wowsims_curated_item_ids() -> set[int]:
    """Union of item ids across the pinned ret gear-set presets (§bisTags)."""
    ids: set[int] = set()
    for path in WOWSIMS_GEAR_SETS:
        if not path.is_file():
            continue
        doc = load_json(path)
        assert isinstance(doc, dict)
        for item in doc.get("items") or []:
            if isinstance(item, dict) and item.get("id") is not None:
                ids.add(int(item["id"]))
    return ids


def ret_eligible_d7(it: dict) -> bool:
    """D7 rules from PLAN.md / sub-phase 0 — not generate_pool.ret_equippable()."""
    if it["id"] in KAEL_TEMP_LEGENDARY_IDS:
        return False
    # A non-empty classAllowlist is a hard equip restriction, so an item that
    # omits Paladin cannot be worn by this character at all. db.json carries
    # the field on 2006 items and nothing read it, which let 8 class-specific
    # SSC/TK trinkets into both shipping universes.
    allowlist = it.get("classAllowlist")
    if allowlist and CLASS_PALADIN not in allowlist:
        return False
    t = it.get("type")
    if t is None:
        return False
    slot = ITEM_TYPE_SLOT.get(t)
    if slot is None:
        return False
    if (it.get("quality") or 0) < MIN_QUALITY:
        return False
    if slot in {
        "head",
        "shoulder",
        "chest",
        "wrist",
        "hands",
        "waist",
        "legs",
        "feet",
    }:
        return it.get("armorType") in (ARMOR_LEATHER, ARMOR_MAIL, ARMOR_PLATE)
    if slot == "weapon":
        if it.get("handType") != HAND_TYPE_TWO_HAND:
            return False
        # Paladins can wield polearms but not staves — the two are not
        # interchangeable here. wowsims ui/core/player_classes/paladin.ts lists
        # Polearm with canUseTwoHand: true and omits Staff entirely.
        if it.get("weaponType") == WEAPON_STAFF:
            return False
        return True
    if slot == "ranged":
        return it.get("rangedWeaponType") == RANGED_LIBRAM
    return True


def item_stats(it: dict) -> list[float]:
    scaling = (it.get("scalingOptions") or {}).get("0") or {}
    raw_map = scaling.get("stats")
    if isinstance(raw_map, dict) and raw_map:
        out = [0.0] * 42
        for k, v in raw_map.items():
            i = int(k)
            if 0 <= i < len(out):
                out[i] = float(v)
        return out
    arr = it.get("stats") or []
    return [float(x) for x in arr]


def weapon_dps(it: dict) -> float:
    """Average weapon damage per second, upstream's formula.

    ui/core/proto_utils/equipped_item.ts getWeaponDPS:
    (weaponDamageMin + weaponDamageMax) / 2 / weaponSpeed. These live beside
    the stats map in scalingOptions, never inside it, so ep_score cannot see
    them without this.
    """
    scaling = (it.get("scalingOptions") or {}).get("0") or {}
    lo = float(scaling.get("weaponDamageMin") or 0.0)
    hi = float(scaling.get("weaponDamageMax") or 0.0)
    speed = float(it.get("weaponSpeed") or 0.0)
    if speed <= 0 or (lo <= 0 and hi <= 0):
        return 0.0
    return (lo + hi) / 2 / speed


def ep_score(
    stats: list[float],
    weights: dict[str, float],
    *,
    item: dict | None = None,
    slot: str | None = None,
    pseudo_weights: dict[str, float] | None = None,
) -> float:
    total = 0.0
    for k, w in weights.items():
        i = int(k)
        if i < len(stats):
            total += stats[i] * w
    # Weapon damage is the dominant term for a ret two-hander (seals,
    # judgements and Crusader Strike all scale off it) but is not a stat, so
    # a weapon scored on its stat line alone ranks near-arbitrarily -- Glaive
    # of the Pit scored 0.00, last of 17, on an empty stat map. Upstream
    # carries this as PseudoStatMainHandDps, weighted separately from the
    # stats array; ret's P2 preset prices it at 5.34.
    if item is not None and slot == "weapon" and pseudo_weights:
        mh = pseudo_weights.get(str(PSEUDO_MAIN_HAND_DPS))
        if mh:
            total += weapon_dps(item) * mh
    return total


def map_db_source(
    raw: object,
    *,
    zones_by_id: dict[int, str],
    npcs_by_id: dict[int, str],
) -> dict | None:
    """db.json sources[] → ItemSource (same logic as generate_pool.map_source)."""
    if not isinstance(raw, list) or not raw:
        return None
    first = raw[0]
    if not isinstance(first, dict):
        return None
    if "crafted" in first:
        prof = (first["crafted"] or {}).get("profession")
        return {"kind": "crafted", "profession": str(prof)} if prof is not None else None
    if "drop" in first:
        drop = first["drop"] or {}
        zone = (
            drop.get("zone")
            or drop.get("zoneName")
            or zones_by_id.get(drop.get("zoneId"))
        )
        boss = drop.get("npcName") or npcs_by_id.get(drop.get("npcId"))
        if zone:
            out: dict = {"kind": "raid", "zone": str(zone)}
            if boss:
                out["boss"] = str(boss)
            return out
    if "rep" in first:
        rep = first["rep"] or {}
        faction = rep.get("factionName") or rep.get("faction") or "unknown"
        standing = rep.get("standing") or rep.get("rank") or "unknown"
        return {"kind": "rep", "faction": str(faction), "standing": str(standing)}
    if "faction" in first:
        return {"kind": "rep", "faction": "unknown", "standing": "unknown"}
    return None


def source_zones(source: dict) -> set[str]:
    kind = source.get("kind")
    if kind in ("raid", "token", "heroic"):
        z = source.get("zone") or source.get("dungeon")
        return {z} if z else set()
    return set()


def canonical_zone(zone: str) -> str:
    """
    Wowhead writes outdoor bosses as free text ("World Boss", "World Boss in
    Hellfire Peninsula") where AtlasLoot has one canonical "World Bosses" zone.
    Without folding these together `add_source` keeps each spelling as a
    separate row, which is how Terrorweave Tunic ended up listing both its real
    boss and an unrelated one.
    """
    if zone.lower().startswith("world boss"):
        return WORLD_BOSS_ZONE
    return zone


def parse_wowhead_source(text: str | None) -> list[dict]:
    if not text:
        return []
    out: list[dict] = []
    m = DROP_RE.search(text)
    if m:
        boss = m.group(1).strip()
        zone = m.group(2).strip()
        if zone.endswith("(via"):
            zone = zone.split("(via")[0].strip()
        src: dict = {"kind": "raid", "zone": canonical_zone(zone)}
        if boss and boss.lower() != "unknown":
            src["boss"] = boss
        out.append(src)
    bm = BADGE_RE.search(text)
    if bm:
        cost = int(next(g for g in bm.groups() if g))
        out.append({"kind": "badge", "cost": cost})
    lower = text.lower()
    if "arena points" in lower or ("pvp:" in lower and "arena" in lower):
        out.append({"kind": "pvp", "via": "arena"})
    elif "honor points" in lower or ("pvp:" in lower and "honor" in lower):
        out.append({"kind": "pvp", "via": "honor"})
    cm = CRAFTED_RE.search(text)
    if cm:
        prof = (cm.group(1) or cm.group(2) or "").strip()
        if prof:
            out.append({"kind": "crafted", "profession": prof})
    return out


def is_list_only_source(source: dict) -> bool:
    """Badge/PvP/crafted/rep without a raid zone — list-driven membership."""
    return source.get("kind") in ("badge", "pvp", "crafted", "rep")


def zones_for_max_phase(max_phase: int, phase_raids: dict) -> set[str]:
    zones: set[str] = set()
    for row in phase_raids.get("zones") or []:
        if isinstance(row, dict) and row.get("phase", 99) <= max_phase:
            zones.add(str(row["name"]))
    return zones


def wowhead_lists_for_phase(max_phase: int) -> list[tuple[str, dict]]:
    stages = WOWHEAD_STAGE_FOR_MAX_PHASE.get(max_phase, [])
    out: list[tuple[str, dict]] = []
    for stage in stages:
        path = WOWHEAD_DIR / f"{stage}.json"
        if path.is_file():
            data = load_json(path)
            assert isinstance(data, dict)
            out.append((stage, data))
    return out


def item_stat_map(it: dict) -> dict[int, float]:
    scaling = (it.get("scalingOptions") or {}).get("0") or {}
    raw = scaling.get("stats")
    if not isinstance(raw, dict):
        return {}
    return {int(k): float(v) for k, v in raw.items()}


def is_caster_junk(slot: str, stats: dict[int, float]) -> bool:
    if slot in ("ranged", "trinket"):
        return False
    if not stats:
        return False
    has_melee = any(k in MELEE_STATS for k in stats)
    has_caster = any(k in CASTER_ONLY_STATS for k in stats)
    return has_caster and not has_melee


def build_percentiles(entries: list[dict]) -> dict[int, float]:
    by_slot: dict[str, list[dict]] = defaultdict(list)
    for e in entries:
        by_slot[e["slot"]].append(e)
    pct: dict[int, float] = {}
    for slot_entries in by_slot.values():
        sorted_entries = sorted(slot_entries, key=lambda e: e["curationHint"])
        n = len(sorted_entries)
        for i, e in enumerate(sorted_entries):
            pct[e["itemId"]] = i / (n - 1) if n > 1 else 1.0
    return pct


def measure_junk_filter(
    entries: list[dict], db_by_id: dict[int, dict]
) -> tuple[dict, list[dict]]:
    """Measure the junk filter and return (report, surviving entries).

    Callers decide whether to *apply* the survivors — see `--apply-junk-filter`.
    The report is emitted either way, so the measured reject rate stays
    observable even when the filter is off.
    """
    pct = build_percentiles(entries)
    caster_rejects = []
    ep_floor_rejects = []
    for e in entries:
        stats = item_stat_map(db_by_id[e["itemId"]])
        if is_caster_junk(e["slot"], stats):
            caster_rejects.append(e)
            continue
        if e["slot"] in SLOTS_WITH_EP_SIGNAL and pct.get(e["itemId"], 1.0) < 0.10:
            ep_floor_rejects.append(e)
    reject_ids = {e["itemId"] for e in caster_rejects} | {
        e["itemId"] for e in ep_floor_rejects
    }
    combined = [e for e in entries if e["itemId"] not in reject_ids]
    return {
        "total": len(entries),
        "casterOnlyReject": len(caster_rejects),
        "epFloorReject": len(ep_floor_rejects),
        "combinedReject": len(entries) - len(combined),
        "combinedKeep": len(combined),
        "casterRejectPct": round(100 * len(caster_rejects) / len(entries), 1)
        if entries
        else 0,
        "combinedRejectPct": round(100 * (len(entries) - len(combined)) / len(entries), 1)
        if entries
        else 0,
    }, combined


def assemble(
    max_phase: int,
    hold_out_wowhead: bool = False,
    apply_junk_filter: bool = False,
) -> tuple[dict, dict]:
    if not DB.is_file():
        print(f"missing {DB} — run pnpm sync:wowsims", file=sys.stderr)
        sys.exit(2)

    db = load_json(DB)
    assert isinstance(db, dict)
    phase_raids = load_json(PHASE_RAIDS)
    assert isinstance(phase_raids, dict)
    atlasloot = load_json(ATLASLOOT) if ATLASLOOT.is_file() else {}
    two_hop = load_json(TWO_HOP) if TWO_HOP.is_file() else {}
    weights_raw = load_json(EP_WEIGHTS)
    assert isinstance(weights_raw, dict)
    w = weights_raw["weights"]
    assert isinstance(w, dict)
    pw = weights_raw.get("pseudoWeights") or {}
    assert isinstance(pw, dict)

    zones_by_id = {
        int(z["id"]): str(z["name"])
        for z in (db.get("zones") or [])
        if isinstance(z, dict) and "id" in z and "name" in z
    }
    npcs_by_id = {
        int(n["id"]): str(n["name"])
        for n in (db.get("npcs") or [])
        if isinstance(n, dict) and "id" in n and "name" in n
    }
    db_by_id = {int(it["id"]): it for it in db["items"]}
    bis_ids = wowsims_curated_item_ids()

    phase_zones = zones_for_max_phase(max_phase, phase_raids)

    # itemId -> list of (source, origin)
    source_acc: dict[int, list[tuple[dict, str]]] = defaultdict(list)
    origin_counter: Counter[str] = Counter()

    def add_source(item_id: int, source: dict | None, origin: str) -> None:
        if not source:
            return
        # AtlasLoot's world-boss tables are per-NPC and complete, so they own the
        # boss attribution for that zone. Wowhead's free text names the wrong
        # boss on some rows (30730 Terrorweave Tunic reads as Kazzak; it drops
        # from Doomwalker), and a second boss for the same zone is always that
        # mistake rather than a genuine second drop source.
        if (
            origin == "wowhead"
            and source.get("zone") == WORLD_BOSS_ZONE
            and any(
                s.get("zone") == WORLD_BOSS_ZONE for s, _ in source_acc[item_id]
            )
        ):
            return
        key = json.dumps(source, sort_keys=True)
        existing = {json.dumps(s, sort_keys=True) for s, _ in source_acc[item_id]}
        if key not in existing:
            source_acc[item_id].append((source, origin))
            origin_counter[origin] += 1

    # db + atlasloot for all D7-eligible items
    for it in db["items"]:
        if not ret_eligible_d7(it):
            continue
        iid = int(it["id"])
        db_src = map_db_source(
            it.get("sources"), zones_by_id=zones_by_id, npcs_by_id=npcs_by_id
        )
        add_source(iid, db_src, "db")
        for raw in (atlasloot.get(str(iid)) or []):
            if isinstance(raw, dict):
                add_source(iid, raw, "atlasloot")

    # two-hop tokens
    for entry in (two_hop.get("entries") or []) if isinstance(two_hop, dict) else []:
        if not isinstance(entry, dict):
            continue
        piece_id = int(entry["pieceId"])
        token_src: dict = {
            "kind": "token",
            "zone": entry["zone"],
            "token": entry["tokenName"],
        }
        if entry.get("boss"):
            token_src["boss"] = entry["boss"]
        add_source(piece_id, token_src, "two-hop")

    # wowhead lists for this maxPhase
    #
    # Under hold-out the list is still read — it is the answer key we grade
    # recall against — but it contributes neither sources nor membership, so
    # the universe is built only from db / atlasloot / two-hop / zone match.
    # Grading against a list that also populated the universe is circular for
    # exactly the items it added; see ticket 18.
    wowhead_list_ids: set[int] = set()
    wowhead_list_only: set[int] = set()
    for stage, doc in wowhead_lists_for_phase(max_phase):
        for row in doc.get("entries") or []:
            if not isinstance(row, dict):
                continue
            iid = int(row["itemId"])
            wowhead_list_ids.add(iid)
            if hold_out_wowhead:
                continue
            for src in parse_wowhead_source(row.get("wowheadSourceText")):
                add_source(iid, src, "wowhead")
            # Items on list with only non-zone sources count as list-only membership.
            parsed = parse_wowhead_source(row.get("wowheadSourceText"))
            if parsed and all(is_list_only_source(s) for s in parsed):
                wowhead_list_only.add(iid)

    eligible_count = sum(1 for it in db["items"] if ret_eligible_d7(it))

    entries: list[dict] = []
    membership_stats = Counter()
    list_only_count = 0
    no_zone_excluded = 0

    for it in db["items"]:
        if not ret_eligible_d7(it):
            continue
        iid = int(it["id"])
        pairs = source_acc.get(iid) or []
        if not pairs:
            no_zone_excluded += 1
            continue

        sources = [s for s, _ in pairs]
        origins_for_item = {o for _, o in pairs}
        zones_hit = set()
        for s in sources:
            zones_hit |= source_zones(s)

        in_phase = bool(zones_hit & phase_zones)
        list_only = iid in wowhead_list_only and iid in wowhead_list_ids
        if not in_phase and not list_only:
            continue

        if list_only and not in_phase:
            list_only_count += 1
            membership_stats["listOnly"] += 1
        elif in_phase:
            membership_stats["zoneMatch"] += 1

        slot = ITEM_TYPE_SLOT[it["type"]]
        stats = item_stats(it)
        entry = {
            "itemId": iid,
            "name": it["name"],
            "slot": slot,
            "armorType": it.get("armorType"),
            "handType": it.get("handType"),
            "quality": it.get("quality"),
            "phase": it.get("phase"),
            "sources": sources,
            "curationHint": round(
                ep_score(stats, w, item=it, slot=slot, pseudo_weights=pw), 3
            ),
        }
        if iid in bis_ids:
            entry["bisTags"] = ["BiS"]
        entries.append(entry)

        # Sorted: set iteration order over strings varies per process, which
        # reordered this counter's keys between runs and produced spurious
        # diffs on the committed report.
        for origin in sorted(origins_for_item):
            membership_stats[f"itemHasOrigin:{origin}"] += 1

    entries.sort(key=lambda e: (e["slot"], -e["curationHint"], e["itemId"]))

    # PLAN.md §8.3.2: "A null source is a build-time failure for a pool that
    # ships, not a runtime shrug." Checking non-emptiness alone would let a row
    # ship a source the reader cannot discriminate — pool.ts picks sources[0]
    # and switches on `kind`, so a missing or unknown kind is as unusable as no
    # source at all.
    source_errors: list[str] = []
    for e in entries:
        if not e["sources"]:
            source_errors.append(f"{e['itemId']} {e['name']}: no sources")
            continue
        for i, s in enumerate(e["sources"]):
            if not isinstance(s, dict) or not s.get("kind"):
                source_errors.append(f"{e['itemId']} {e['name']}: sources[{i}] has no kind")
            elif s["kind"] not in ITEM_SOURCE_KINDS:
                source_errors.append(
                    f"{e['itemId']} {e['name']}: sources[{i}] unknown kind {s['kind']!r}"
                )
    if source_errors:
        print(
            f"assembly error: {len(source_errors)} unusable source rows",
            file=sys.stderr,
        )
        for msg in source_errors[:20]:
            print(f"  {msg}", file=sys.stderr)
        if len(source_errors) > 20:
            print(f"  ... and {len(source_errors) - 20} more", file=sys.stderr)
        sys.exit(2)

    # Measured on the unfiltered universe, then optionally applied. Everything
    # downstream (tier coverage, per-slot, recall) must describe the universe
    # that actually ships, so this runs before those are computed.
    junk, junk_survivors = measure_junk_filter(entries, db_by_id)
    if apply_junk_filter:
        entries = junk_survivors
    junk["applied"] = apply_junk_filter

    tier_present = {e["itemId"] for e in entries} & RET_TIER_PIECE_IDS
    tier_expected: set[int] = set()
    for entry in (two_hop.get("entries") or []) if isinstance(two_hop, dict) else []:
        if not isinstance(entry, dict):
            continue
        piece_id = int(entry["pieceId"])
        if piece_id not in RET_TIER_PIECE_IDS:
            continue
        if str(entry.get("zone")) in phase_zones:
            tier_expected.add(piece_id)

    per_slot = Counter(e["slot"] for e in entries)

    # Primary origin: first contributing pipeline per item (for exclusive counts).
    exclusive_origin: Counter[str] = Counter()
    for e in entries:
        iid = e["itemId"]
        origins = {o for _, o in source_acc.get(iid, [])}
        if "two-hop" in origins:
            exclusive_origin["two-hop"] += 1
        elif "wowhead" in origins and not (origins & {"db", "atlasloot"}):
            exclusive_origin["wowhead-only"] += 1
        elif "atlasloot" in origins and "db" not in origins:
            exclusive_origin["atlasloot-only"] += 1
        elif "db" in origins:
            exclusive_origin["db"] += 1
        else:
            exclusive_origin["other"] += 1

    universe_ids = {int(e["itemId"]) for e in entries}
    recalled = wowhead_list_ids & universe_ids
    missed = wowhead_list_ids - universe_ids
    wowhead_recall = {
        "heldOut": hold_out_wowhead,
        "listTotal": len(wowhead_list_ids),
        "recalled": len(recalled),
        "missed": len(missed),
        "recallPct": (
            round(100.0 * len(recalled) / len(wowhead_list_ids), 1)
            if wowhead_list_ids
            else None
        ),
        "missedItems": [
            {
                "itemId": iid,
                "name": (db_by_id.get(iid) or {}).get("name"),
                "slot": ITEM_TYPE_SLOT.get((db_by_id.get(iid) or {}).get("type")),
                "d7Eligible": bool(
                    db_by_id.get(iid) and ret_eligible_d7(db_by_id[iid])
                ),
            }
            for iid in sorted(missed)
        ],
    }

    report = {
        "maxPhase": max_phase,
        "carryoverPolicy": "union",
        "phaseZones": sorted(phase_zones),
        "d7EligibleTotal": eligible_count,
        "excludedNoSource": no_zone_excluded,
        "universeTotal": len(entries),
        "listOnlyMembership": list_only_count,
        "perSlot": dict(sorted(per_slot.items())),
        "sourceRecordAdds": dict(sorted(origin_counter.items())),
        "membershipByOrigin": dict(sorted(membership_stats.items())),
        "exclusivePrimaryOrigin": dict(exclusive_origin),
        "tierPiecesExpected": len(tier_expected),
        "tierPiecesPresent": len(tier_present & tier_expected),
        "tierPiecesMissing": sorted(tier_expected - tier_present),
        "junkFilter": junk,
        "wowheadListIds": len(wowhead_list_ids),
        "wowheadRecall": wowhead_recall,
    }

    payload = {
        "spec": "ret",
        "maxPhase": max_phase,
        "carryoverPolicy": "union",
        "generatedBy": "scripts/assemble_universe.py",
        "d7Note": "D7 eligibility implemented in assemble_universe.py.",
        "entries": entries,
    }
    return payload, report


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-phase", type=int, required=True, choices=[2, 3, 4, 5])
    ap.add_argument(
        "--out",
        type=Path,
        help="Output path (default data/universes/ret-p{N}.json)",
    )
    ap.add_argument(
        "--report",
        type=Path,
        help="Optional JSON measurement sidecar",
    )
    ap.add_argument(
        "--hold-out-wowhead",
        action="store_true",
        help=(
            "Diagnostic: build the universe without letting the Wowhead lists "
            "contribute sources or membership, then grade recall against them. "
            "Requires --out/--report; refuses to overwrite the shipping files."
        ),
    )
    ap.add_argument(
        "--apply-junk-filter",
        action="store_true",
        help=(
            "Drop the caster-only / EP-floor rejects from the universe instead "
            "of only measuring them. Off by default: the committed universes "
            "and the Phase 1 gate figures are built unfiltered."
        ),
    )
    args = ap.parse_args()

    if args.hold_out_wowhead and not (args.out and args.report):
        ap.error("--hold-out-wowhead requires explicit --out and --report paths")

    out_path = args.out or DEFAULT_OUT_DIR / f"ret-p{args.max_phase}.json"
    payload, report = assemble(
        args.max_phase,
        hold_out_wowhead=args.hold_out_wowhead,
        apply_junk_filter=args.apply_junk_filter,
    )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    report_path = args.report or DEFAULT_OUT_DIR / f"ret-p{args.max_phase}.report.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    def display(p: Path) -> Path:
        # --out may point outside the repo (diagnostic runs); relative_to raises.
        try:
            return p.relative_to(ROOT)
        except ValueError:
            return p

    print(f"wrote {display(out_path)} — {len(payload['entries'])} entries")
    print(f"wrote {display(report_path)}")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
