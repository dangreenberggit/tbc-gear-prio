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
PHASE_RAIDS = ROOT / "data/phase_raids.json"
ATLASLOOT = ROOT / "data/atlasloot_sources.json"

RAID_RECIPES = ROOT / "data/two-hop/raid-recipes.json"
DEFAULT_OUT_DIR = ROOT / "data/universes"

# Must match the row in data/phase_raids.json and AtlasLoot's WorldBossesBC
# alias — outdoor bosses have no zoneId anywhere in db.json, so this string is
# the only thing tying their drops to a phase.
WORLD_BOSS_ZONE = "World Bosses"

# db.json `sources[].drop.difficulty`: 1 = normal, 2 = heroic. Nothing else
# appears in the pinned db, and the 472 difficulty-2 drops sit entirely in the
# 16 five-man zones below — no raid zone carries one, so this discriminates
# heroic drops from raid drops without consulting the zone at all.
DROP_DIFFICULTY_HEROIC = 2

# Heroic dungeons whose drops are worth a shopping list at a given phase, keyed
# the same way phase_raids.json keys raids: union of everything with
# phase <= maxPhase.
#
# Only Magisters' Terrace is listed, and that is a scope decision rather than a
# statement about the game. Every other heroic in the pinned db drops phase-1
# items (measured: 284 ret-eligible items across 15 dungeons); admitting them
# would rewrite the phase-1 end of every tier, which belongs to ticket 17's
# pre-raid question, not here. MT is the one heroic that drops phase-5 gear —
# including 34472 Shard of Contempt — so it is the whole of ticket 28.
PHASE_HEROIC_DUNGEONS: dict[str, int] = {
    "Magisters' Terrace": 5,
}

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

ARMOR_CLOTH = 1
ARMOR_LEATHER = 2
ARMOR_MAIL = 3
ARMOR_PLATE = 4
WEAPON_POLEARM = 6
WEAPON_STAFF = 8
HAND_TYPE_TWO_HAND = 4
RANGED_IDOL = 6
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

# Malorne Harness (T4) and Nordrassil Harness (T5) — the feral variant of
# druid tier. Harness rather than Regalia or Raiment is confirmed on stats
# from the pinned db, not on the name: see data/two-hop/feral-tokens.json.
# T6 (Thunderheart) is absent, so feral tier coverage stops at T5.
FERAL_TIER_PIECE_IDS = frozenset(
    {
        29096,
        29097,
        29098,
        29099,
        29100,
        30222,
        30223,
        30228,
        30229,
        30230,
    }
)

# common.proto Class enum. These are wowsims ids and are NOT WCL's class ids:
# WCL numbers Druid 2 and Warrior 11, which is the reverse reading of the same
# two numbers. Anything crossing between the two needs an explicit map.
CLASS_PALADIN = 2
CLASS_DRUID = 11


class SpecProfile:
    """Everything assemble_universe needs that differs per spec.

    Split deliberately into *paths* (which files to read) and *equip rules*
    (what the class can wear). The paths were always per-spec; the equip rules
    were hidden inside a function named for ret, and they are the part that is
    genuinely different rather than merely relocated — a druid is not a paladin
    with different filenames. See .scratch/phase-2/feral-coupling-audit.md.
    """

    def __init__(
        self,
        spec: str,
        *,
        ep_weights: Path,
        gear_sets: list[Path],
        wowhead_dir: Path,
        two_hop: Path | None,
        sunmote_upgrades: Path | None,
        tier_piece_ids: frozenset[int],
        class_id: int,
        armor_types: frozenset[int],
        ranged_type: int,
        allow_one_hand: bool,
        excluded_weapon_types: frozenset[int],
    ):
        self.spec = spec
        self.ep_weights = ep_weights
        self.gear_sets = gear_sets
        self.wowhead_dir = wowhead_dir
        self.two_hop = two_hop
        self.sunmote_upgrades = sunmote_upgrades
        self.tier_piece_ids = tier_piece_ids
        self.class_id = class_id
        self.armor_types = armor_types
        self.ranged_type = ranged_type
        self.allow_one_hand = allow_one_hand
        self.excluded_weapon_types = excluded_weapon_types


SPEC_PROFILES: dict[str, SpecProfile] = {
    "ret": SpecProfile(
        "ret",
        ep_weights=ROOT / "data/presets/ret/p2.ep-weights.json",
        # Upstream tbc-new ships one curated set per stage for retribution --
        # no BiS/Alt/Realistic split -- so any id appearing here is "BiS".
        # Feral cat does have that split; see its own entry below.
        gear_sets=[
            ROOT / "vendor/wowsims/ret_preraid.gear.json",
            ROOT / "vendor/wowsims/ret_p1.gear.json",
            ROOT / "vendor/wowsims/ret_p2.gear.json",
        ],
        wowhead_dir=ROOT / "data/wowhead-lists/ret",
        two_hop=ROOT / "data/two-hop/ret-tokens.json",
        # Kept out of two_hop because that file is the tier *set* map and
        # pool-hardening.test.ts pins it against wowsims db setIds; Sunmote
        # upgrades are raid drops exchanged at a vendor, not set pieces.
        sunmote_upgrades=ROOT / "data/two-hop/ret-sunmote-upgrades.json",
        tier_piece_ids=RET_TIER_PIECE_IDS,
        class_id=CLASS_PALADIN,
        armor_types=frozenset({ARMOR_LEATHER, ARMOR_MAIL, ARMOR_PLATE}),
        ranged_type=RANGED_LIBRAM,
        allow_one_hand=False,
        # Paladins wield polearms but not staves. wowsims
        # ui/core/player_classes/paladin.ts lists Polearm with
        # canUseTwoHand: true and omits Staff entirely.
        excluded_weapon_types=frozenset({WEAPON_STAFF}),
    ),
    "feral": SpecProfile(
        "feral",
        # Phase 1, because upstream ships no P2 EP preset for feral cat.
        ep_weights=ROOT / "data/presets/feral/p1.ep-weights.json",
        # Upstream ships sixteen curated cat sets against ret's three, split
        # BiS/Alt/Realistic and again by 6-piece against 9-piece tier bonus.
        # Only the p2 pair plus pre-raid is vendored, so "BiS" here means
        # "in an upstream p2 or pre-raid cat set" rather than a single verdict.
        gear_sets=[
            ROOT / "vendor/wowsims/feral_preraid.gear.json",
            ROOT / "vendor/wowsims/feral_p2_6p.gear.json",
            ROOT / "vendor/wowsims/feral_p2_9p.gear.json",
        ],
        wowhead_dir=ROOT / "data/wowhead-lists/feral",
        two_hop=ROOT / "data/two-hop/feral-tokens.json",
        # No feral Sunmote map collected yet.
        sunmote_upgrades=None,
        tier_piece_ids=FERAL_TIER_PIECE_IDS,
        class_id=CLASS_DRUID,
        # Druid is Leather + Cloth, per wowsims
        # ui/core/player_classes/druid.ts. Not a subset of ret's set either
        # way: druids take cloth, and never mail or plate.
        armor_types=frozenset({ARMOR_CLOTH, ARMOR_LEATHER}),
        ranged_type=RANGED_IDOL,
        # Dagger, Fist, Mace (1H and 2H), Off-hand and Staff -- so unlike ret,
        # one-handers are eligible and staves are the signature weapon.
        allow_one_hand=True,
        excluded_weapon_types=frozenset(),
    ),
}

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
# The badge vendor named without a price: "Vendor: G'eras (Badges of Justice)".
# BADGE_RE cannot match this -- its count group is mandatory -- so before this
# existed the row parsed to nothing and the item was recorded as having no
# origin at all. Cost 0 is a deliberate "unpriced": the guide states the
# currency but not the amount, and inventing a number would be a false claim.
BADGE_VENDOR_RE = re.compile(r"Badges?\s+of\s+Justice", re.IGNORECASE)
# Reputation vendors, in the three phrasings the collected guides actually use:
#   "Vendor: Nakodu (Lower City Exalted)"      -- npc named, faction in parens
#   "Vendor: Exalted with The Consortium"      -- standing first, no parens
# REP_RE already covers the third ("Requires Exalted with X"). All three name a
# faction and a standing, so each stays a parse rather than a lookup table.
VENDOR_REP_RE = re.compile(
    r"Vendor:[^(\n]*\(\s*(.+?)\s+(Friendly|Honored|Revered|Exalted)\s*\)",
    re.IGNORECASE,
)
VENDOR_STANDING_FIRST_RE = re.compile(
    r"Vendor:\s*(Friendly|Honored|Revered|Exalted)\s+with\s+([^(\n]+)",
    re.IGNORECASE,
)
# "Quest: Kael'thas and the Verdant Sphere (Tempest Keep: The Eye)". A quest
# reward that names a zone is obtained there, so the zone is a real source and
# the row belongs in that raid's view -- DROP_RE cannot see it because the text
# says Quest, not Drop. Quests naming no zone stay unparsed by design: there is
# no `quest` ItemSource variant, and inventing a zone would be worse than the
# curated-set fallback that already covers those rows.
QUEST_ZONE_RE = re.compile(r"Quest:\s*(.+?)\s*\(([^)]+)\)", re.IGNORECASE)
WOWHEAD_HEROIC_ZONE_RE = re.compile(r"^Heroic\s+(.+)$", re.IGNORECASE)
# "Requires Exalted with Shattered Sun Offensive". The standing and faction are
# both named, so this stays a parse rather than a lookup table.
REP_RE = re.compile(
    r"Requires\s+(Friendly|Honored|Revered|Exalted)\s+with\s+([^(\n]+)",
    re.IGNORECASE,
)

# Stat 5 (SpellDamage) is deliberately NOT here: data/presets/ret/p2.ep-weights
# .json prices it at 0.17, so calling it caster-only would let the junk filter
# reject items this repo's own EP model values. (The pre-merge domain review
# attributed that weight to ret's spell-power coefficients on Seal/Judgement of
# Blood and Crusader Strike — plausible, but untested here; the EP weight alone
# is sufficient reason.)
# Shared with the ItemSource union in packages/core/src/pool.ts, which imports
# the same file. A kind this script emits but that module cannot parse is a
# build failure, not a runtime surprise — so the list is loaded rather than
# retyped. pool.test.ts pins the JSON against the union.
ITEM_SOURCE_KINDS_JSON = ROOT / "packages/core/src/item-source-kinds.json"
ITEM_SOURCE_KINDS = frozenset(
    json.loads(ITEM_SOURCE_KINDS_JSON.read_text(encoding="utf-8"))["kinds"]
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


def wowsims_curated_item_ids(profile: SpecProfile) -> set[int]:
    """Union of item ids across the pinned gear-set presets (§bisTags).

    Empty for a spec with no vendored gear sets, which makes every entry
    untagged rather than falsely "BiS".

    Membership only. `BiS` itself is phase-scoped -- see
    `curated_set_phase` and `bis_set_labels_for_max_phase`.
    """
    return set(wowsims_curated_sets_by_item(profile))


# Upstream names its gear sets by the stage they are BiS *for*: `preraid`
# before Karazhan, `p1` for T4 content, `p2` for T5. Pre-raid is phase 1 --
# it is the set you take into a phase-1 raid.
CURATED_SET_PHASE: dict[str, int] = {"preraid": 1, "p1": 1, "p2": 2}


def curated_set_phase(label: str) -> int | None:
    """The phase a curated set is BiS for, or None if unrecognised.

    `feral_p2_6p` / `p2_9p` are the same phase split by tier-bonus count, so
    the leading `pN` is the phase and the suffix is a variant.
    """
    return CURATED_SET_PHASE.get(label.split("_", 1)[0])


def bis_set_labels_for_max_phase(
    sets_by_item: dict[int, list[str]], max_phase: int
) -> dict[int, list[str]]:
    """Curated sets that still make a *current* BiS claim at `max_phase`.

    "BiS" is a claim about a stage, exactly as wowsims scopes it -- there is no
    absolute BiS. A set for an earlier stage says "this was BiS before the
    content you are now running", which is the opposite of a recommendation.
    Without this, a phase-5 ret list badged Justicar (T4) chest, boots and
    crown plus five pre-raid pieces as `BiS`, because the union flattened three
    stage sets into one verdict (carry-forward 47 §1).

    Upstream vendors no set past `p2`, so beyond phase 2 the newest available
    stage is used rather than tagging nothing: the claim degrades to "the
    latest curated set upstream ships", which `curatedSets` then names.
    """
    known = {
        iid: [s for s in labels if curated_set_phase(s) is not None]
        for iid, labels in sets_by_item.items()
    }
    available = {
        phase
        for labels in known.values()
        for phase in (curated_set_phase(s) for s in labels)
        if phase is not None and phase <= max_phase
    }
    if not available:
        return {}
    target = max(available)
    scoped = {
        iid: sorted(s for s in labels if curated_set_phase(s) == target)
        for iid, labels in known.items()
    }
    return {iid: labels for iid, labels in scoped.items() if labels}


def wowsims_curated_sets_by_item(profile: SpecProfile) -> dict[int, list[str]]:
    """itemId -> the curated set names that equip it, sorted.

    Carried per item rather than flattened to one boolean because the set name
    is the whole provenance of the claim. A union says only "some upstream
    preset equipped this", which is what let Shapeshifter's Signet -- 25
    agility, 18 stamina, 20 expertise, no strength -- ship tagged a flat "BiS"
    on a retribution list (carry-forward 47 §1). Upstream really does equip it
    in all three ret sets, so the tag was not a cross-spec leak and not a bug
    in membership; the defect is that "BiS" asserts a per-item verdict the
    source never made. Naming the set lets the reader see it is a preset's
    choice, and lets `curatedSets` outrank a bare label downstream.
    """
    by_item: dict[int, list[str]] = {}
    for path in profile.gear_sets:
        if not path.is_file():
            continue
        doc = load_json(path)
        assert isinstance(doc, dict)
        # `ret_p2.gear.json` -> `p2`: the stem carries the spec prefix, which is
        # redundant once the row is in a spec's own universe file.
        label = path.stem.removesuffix(".gear")
        label = label.split("_", 1)[1] if "_" in label else label
        for item in doc.get("items") or []:
            if isinstance(item, dict) and item.get("id") is not None:
                by_item.setdefault(int(item["id"]), []).append(label)
    return {iid: sorted(set(names)) for iid, names in by_item.items()}


ARMOR_SLOTS = frozenset(
    {"head", "shoulder", "chest", "wrist", "hands", "waist", "legs", "feet"}
)


def eligible_d7(it: dict, profile: SpecProfile) -> bool:
    """D7 rules from PLAN.md / sub-phase 0 — not generate_pool.ret_equippable().

    Previously `ret_eligible_d7`, whose name was honest: four of these rules
    are class-specific, so they now come from `profile` rather than from
    module constants.
    """
    if it["id"] in KAEL_TEMP_LEGENDARY_IDS:
        return False
    # A non-empty classAllowlist is a hard equip restriction, so an item that
    # omits this class cannot be worn by this character at all. db.json carries
    # the field on 2006 items and nothing read it, which let 8 class-specific
    # SSC/TK trinkets into both shipping universes.
    allowlist = it.get("classAllowlist")
    if allowlist and profile.class_id not in allowlist:
        return False
    t = it.get("type")
    if t is None:
        return False
    slot = ITEM_TYPE_SLOT.get(t)
    if slot is None:
        return False
    if (it.get("quality") or 0) < MIN_QUALITY:
        return False
    if slot in ARMOR_SLOTS:
        return it.get("armorType") in profile.armor_types
    if slot == "weapon":
        if (
            not profile.allow_one_hand
            and it.get("handType") != HAND_TYPE_TWO_HAND
        ):
            return False
        if it.get("weaponType") in profile.excluded_weapon_types:
            return False
        return True
    if slot == "ranged":
        return it.get("rangedWeaponType") == profile.ranged_type
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
            # Without this the heroic drops were labelled `raid` and then
            # dropped at membership for naming a zone phase_raids.json has
            # never listed -- the item did not look excluded, it looked like a
            # raid drop from a raid that does not exist.
            if drop.get("difficulty") == DROP_DIFFICULTY_HEROIC:
                # The ItemSource `heroic` variant carries no boss field, so the
                # npc is deliberately not forwarded here.
                return {"kind": "heroic", "dungeon": str(zone)}
            out: dict = {"kind": "raid", "zone": str(zone)}
            if boss:
                out["boss"] = str(boss)
            return out
    if "rep" in first:
        rep = first["rep"] or {}
        faction = rep.get("factionName") or rep.get("faction")
        standing = rep.get("standing") or rep.get("rank")
        # db.json ships no faction table, so a row keyed only by repFactionId
        # resolves to "unknown with unknown" — a source that names nothing and
        # cannot be acted on. Returning None lets the Wowhead "Requires Exalted
        # with X" text supply the real one instead of being appended behind it,
        # which matters because pool.ts reads sources[0]. Haramad's Bargain
        # (29119) is the only affected row in the shipped tiers.
        if faction is None and standing is None:
            return None
        return {
            "kind": "rep",
            "faction": str(faction or "unknown"),
            "standing": str(standing or "unknown"),
        }
    if "faction" in first:
        return None
    return None


def source_zones(source: dict) -> set[str]:
    """Raid-zone attribution only. Heroic dungeons are keyed by a separate map
    (PHASE_HEROIC_DUNGEONS), so folding them in here would test a dungeon name
    against phase_raids.json and never match."""
    kind = source.get("kind")
    if kind in ("raid", "token"):
        z = source.get("zone")
        return {z} if z else set()
    return set()


def source_heroic_dungeons(source: dict) -> set[str]:
    if source.get("kind") != "heroic":
        return set()
    d = source.get("dungeon")
    return {d} if d else set()


# Wowhead's own typos, folded onto the phase_raids.json spelling. A misspelt
# zone is not merely cosmetic: it never matches a zone-keyed lookup, so the
# item advertises a raid that does not exist, and add_source keeps it as a
# second row beside the correct one.
ZONE_SPELLING_FIXES = {
    "maghteridon's lair": "Magtheridon's Lair",
    # The feral guide writes the full instance name where the ret guide writes
    # the short one; phase_raids.json carries only "Tempest Keep".
    "tempest keep: the eye": "Tempest Keep",
}


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
    return ZONE_SPELLING_FIXES.get(zone.lower(), zone)


def zone_sources(zone: str, boss: str) -> list[dict]:
    """One Wowhead zone parenthetical → the sources it names.

    Wowhead writes the difficulty into the parenthetical ("Heroic Magisters'
    Terrace"), and writes content dropping in more than one place as a single
    slashed row ("Black Temple / Hyjal Summit"). Split first, then classify
    each side: the other order leaves "Heroic A / B" as one bogus dungeon,
    because the heroic prefix only ever fronts the first name.
    """
    out: list[dict] = []
    if zone.endswith("(via"):
        zone = zone.split("(via")[0].strip()
    for one in zone.split("/"):
        one = one.strip()
        if not one:
            continue
        heroic_m = WOWHEAD_HEROIC_ZONE_RE.match(one)
        if heroic_m:
            out.append({"kind": "heroic", "dungeon": heroic_m.group(1).strip()})
            continue
        src: dict = {"kind": "raid", "zone": canonical_zone(one)}
        if boss and boss.lower() != "unknown":
            src["boss"] = boss
        out.append(src)
    return out


def parse_wowhead_source(text: str | None) -> list[dict]:
    if not text:
        return []
    out: list[dict] = []
    m = DROP_RE.search(text)
    if m:
        out.extend(zone_sources(m.group(2).strip(), m.group(1).strip()))
    else:
        qm = QUEST_ZONE_RE.search(text)
        if qm:
            out.extend(zone_sources(qm.group(2).strip(), ""))
    bm = BADGE_RE.search(text)
    if bm:
        cost = int(next(g for g in bm.groups() if g))
        out.append({"kind": "badge", "cost": cost})
    elif BADGE_VENDOR_RE.search(text):
        out.append({"kind": "badge", "cost": 0})
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
    rm = REP_RE.search(text)
    if rm:
        out.append(
            {
                "kind": "rep",
                "faction": rm.group(2).strip(),
                "standing": rm.group(1).strip().capitalize(),
            }
        )
    else:
        vm = VENDOR_REP_RE.search(text)
        if vm:
            out.append(
                {
                    "kind": "rep",
                    "faction": vm.group(1).strip(),
                    "standing": vm.group(2).strip().capitalize(),
                }
            )
        else:
            sm = VENDOR_STANDING_FIRST_RE.search(text)
            if sm:
                out.append(
                    {
                        "kind": "rep",
                        "faction": sm.group(2).strip(),
                        "standing": sm.group(1).strip().capitalize(),
                    }
                )
    return out


def is_list_only_source(source: dict) -> bool:
    """Badge/PvP/crafted/rep without a raid zone — list-driven membership."""
    return source.get("kind") in ("badge", "pvp", "crafted", "rep")


def heroic_dungeons_for_max_phase(max_phase: int) -> set[str]:
    """Same carryover policy as raid zones: everything with phase <= maxPhase."""
    return {d for d, phase in PHASE_HEROIC_DUNGEONS.items() if phase <= max_phase}


def zones_for_max_phase(max_phase: int, phase_raids: dict) -> set[str]:
    zones: set[str] = set()
    for row in phase_raids.get("zones") or []:
        if isinstance(row, dict) and row.get("phase", 99) <= max_phase:
            zones.add(str(row["name"]))
    return zones


def wowhead_lists_for_phase(
    max_phase: int, profile: SpecProfile
) -> list[tuple[str, dict]]:
    stages = WOWHEAD_STAGE_FOR_MAX_PHASE.get(max_phase, [])
    out: list[tuple[str, dict]] = []
    for stage in stages:
        path = profile.wowhead_dir / f"{stage}.json"
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
    spec: str = "ret",
) -> tuple[dict, dict]:
    profile = SPEC_PROFILES[spec]
    if not DB.is_file():
        print(f"missing {DB} — run pnpm sync:wowsims:restore", file=sys.stderr)
        sys.exit(2)

    db = load_json(DB)
    assert isinstance(db, dict)
    phase_raids = load_json(PHASE_RAIDS)
    assert isinstance(phase_raids, dict)
    atlasloot = load_json(ATLASLOOT) if ATLASLOOT.is_file() else {}
    two_hop = (
        load_json(profile.two_hop)
        if profile.two_hop and profile.two_hop.is_file()
        else {}
    )
    sunmote = (
        load_json(profile.sunmote_upgrades)
        if profile.sunmote_upgrades and profile.sunmote_upgrades.is_file()
        else {}
    )
    raid_recipes = load_json(RAID_RECIPES) if RAID_RECIPES.is_file() else {}

    # A recipe can drop in several zones (the SSC/TK belt patterns drop in
    # both). Attribute to the earliest-phase one so the craft appears on the
    # first shopping list that can actually produce it; ties break on name to
    # keep the artifact byte-stable.
    phase_of_zone = {
        str(z["name"]): int(z.get("phase", 99))
        for z in (phase_raids.get("zones") or [])
        if isinstance(z, dict) and "name" in z
    }
    raid_recipe_by_product: dict[int, dict] = {}
    for entry in (raid_recipes.get("entries") or []):
        if not isinstance(entry, dict):
            continue
        zones = [z for z in (entry.get("zones") or []) if isinstance(z, dict)]
        if not zones:
            continue
        best = min(
            zones,
            key=lambda z: (phase_of_zone.get(str(z.get("zone")), 99), str(z.get("zone"))),
        )
        raid_recipe_by_product[int(entry["productId"])] = {
            "zone": str(best["zone"]),
            "boss": best.get("boss"),
        }
    weights_raw = load_json(profile.ep_weights)
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
    curated_sets_by_item = wowsims_curated_sets_by_item(profile)
    # Membership stays the union: an item upstream equips at any stage is still
    # a real candidate to rank (that is ticket 12's widening). Only the *claim*
    # narrows to the current stage.
    bis_ids = set(curated_sets_by_item)
    bis_sets_at_phase = bis_set_labels_for_max_phase(
        curated_sets_by_item, max_phase
    )

    phase_zones = zones_for_max_phase(max_phase, phase_raids)
    phase_heroics = heroic_dungeons_for_max_phase(max_phase)

    # itemId -> list of (source, origin)
    source_acc: dict[int, list[tuple[dict, str]]] = defaultdict(list)
    origin_counter: Counter[str] = Counter()

    def add_source(item_id: int, source: dict | None, origin: str) -> None:
        if not source:
            return
        # Applied here rather than at each construction site so crafted sources
        # get the same attribution whichever input produced them (db.json and
        # Wowhead free text both emit them).
        recipe = raid_recipe_by_product.get(item_id)
        if recipe and source.get("kind") == "crafted":
            source = {**source, "recipeZone": recipe["zone"]}
            if recipe.get("boss"):
                source["recipeBoss"] = recipe["boss"]
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
        if not eligible_d7(it, profile):
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

    # Sunmote upgrades. Same `token` shape -- the piece is obtained from a
    # named raid boss via an intermediary -- with the base item named as the
    # token, since that is what the player actually trades in.
    for entry in (sunmote.get("entries") or []) if isinstance(sunmote, dict) else []:
        if not isinstance(entry, dict):
            continue
        sunmote_src: dict = {
            "kind": "token",
            "zone": entry["zone"],
            "token": f"Sunmote + {entry['baseName']}",
        }
        if entry.get("boss"):
            sunmote_src["boss"] = entry["boss"]
        add_source(int(entry["pieceId"]), sunmote_src, "sunmote")

    # wowhead lists for this maxPhase
    #
    # Under hold-out the list is still read — it is the answer key we grade
    # recall against — but it contributes neither sources nor membership, so
    # the universe is built only from db / atlasloot / two-hop / zone match.
    # Grading against a list that also populated the universe is circular for
    # exactly the items it added; see ticket 18.
    wowhead_list_ids: set[int] = set()
    wowhead_list_only: set[int] = set()
    for stage, doc in wowhead_lists_for_phase(max_phase, profile):
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

    # The curated gear sets are wowsims equipping an item on this spec, which is
    # a membership claim in its own right and the only one some items have:
    # Everbloom Idol and Bloodlust Brooch carry no db source, no AtlasLoot row,
    # and Wowhead prose our parser cannot read. Previously `bis_ids` was used
    # only to *label* rows that had already got in by another route, so an item
    # wowsims explicitly equips was dropped and the label never applied.
    #
    # `unknown` rather than a guessed badge cost or faction: the origin really
    # is unrecorded, and carrying no zone is what keeps these out of the raid
    # and boss filters, which is the behaviour these items need.
    curated_unsourced: set[int] = set()
    for iid in sorted(bis_ids):
        it = db_by_id.get(iid)
        if it is None or not eligible_d7(it, profile):
            continue
        if not source_acc.get(iid):
            add_source(iid, {"kind": "unknown"}, "curated")
            curated_unsourced.add(iid)

    eligible_count = sum(
        1 for it in db["items"] if eligible_d7(it, profile)
    )

    entries: list[dict] = []
    membership_stats = Counter()
    list_only_count = 0
    no_zone_excluded = 0

    for it in db["items"]:
        if not eligible_d7(it, profile):
            continue
        iid = int(it["id"])
        pairs = source_acc.get(iid) or []
        if not pairs:
            no_zone_excluded += 1
            continue

        sources = [s for s, _ in pairs]
        origins_for_item = {o for _, o in pairs}
        zones_hit = set()
        heroics_hit = set()
        for s in sources:
            zones_hit |= source_zones(s)
            heroics_hit |= source_heroic_dungeons(s)

        # An admitted heroic dungeon still only contributes the items whose own
        # phase reaches this tier -- MT drops phase-5 gear, but the same guard
        # is what stops a future phase-1 dungeon leaking into a p2 list.
        in_heroic = bool(heroics_hit & phase_heroics) and int(
            it.get("phase") or 99
        ) <= max_phase
        in_phase = bool(zones_hit & phase_zones)
        list_only = iid in wowhead_list_only and iid in wowhead_list_ids
        # No phase guard: these are persistent non-raid items whose own phase is
        # not the interesting fact about them. Everbloom Idol is phase 1 and
        # still what a cat wants at phase 2.
        # Only the ones with no recorded origin at all. A curated item that
        # *does* have a db source keeps whatever scope rules that source implies
        # -- several point at five-man dungeons outside PHASE_HEROIC_DUNGEONS,
        # and admitting those is ticket 17's question, not this one.
        curated = iid in curated_unsourced
        if not in_phase and not in_heroic and not list_only and not curated:
            continue

        if in_phase:
            membership_stats["zoneMatch"] += 1
        elif in_heroic:
            membership_stats["heroicMatch"] += 1
        elif list_only:
            list_only_count += 1
            membership_stats["listOnly"] += 1
        elif curated:
            membership_stats["curated"] += 1

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
            # `curatedSets` is the full provenance and stays unscoped: an item
            # dropped from the current set is still worth showing as having
            # been curated, it just no longer carries the BiS claim.
            entry["curatedSets"] = curated_sets_by_item[iid]
            if iid in bis_sets_at_phase:
                entry["bisTags"] = ["BiS"]
                entry["bisSets"] = bis_sets_at_phase[iid]
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
    known_zones = {
        str(z["name"]) for z in (phase_raids.get("zones") or []) if z.get("name")
    }
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
            # A raid/token zone that phase_raids.json does not list can never
            # match a zone-keyed lookup, so the row advertises a raid the rest
            # of the engine cannot find. "Maghteridon's Lair" shipped this way.
            elif s["kind"] in ("raid", "token") and s.get("zone") not in known_zones:
                source_errors.append(
                    f"{e['itemId']} {e['name']}: sources[{i}] zone "
                    f"{s.get('zone')!r} is not in phase_raids.json"
                )
            # The same trap one kind over: a heroic naming a dungeon the phase
            # map does not carry can never match a tier, so it would ship as a
            # source the reader cannot act on.
            elif s["kind"] == "heroic" and s.get("dungeon") not in PHASE_HEROIC_DUNGEONS:
                source_errors.append(
                    f"{e['itemId']} {e['name']}: sources[{i}] dungeon "
                    f"{s.get('dungeon')!r} is not in PHASE_HEROIC_DUNGEONS"
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

    tier_present = {e["itemId"] for e in entries} & profile.tier_piece_ids
    tier_expected: set[int] = set()
    for entry in (two_hop.get("entries") or []) if isinstance(two_hop, dict) else []:
        if not isinstance(entry, dict):
            continue
        piece_id = int(entry["pieceId"])
        if piece_id not in profile.tier_piece_ids:
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
                    db_by_id.get(iid) and eligible_d7(db_by_id[iid], profile)
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
        "spec": profile.spec,
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
        "--spec",
        default="ret",
        choices=sorted(SPEC_PROFILES),
        help="Which spec profile to build for (default ret)",
    )
    ap.add_argument(
        "--out",
        type=Path,
        help="Output path (default data/universes/{spec}-p{N}.json)",
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

    out_path = (
        args.out or DEFAULT_OUT_DIR / f"{args.spec}-p{args.max_phase}.json"
    )
    payload, report = assemble(
        args.max_phase,
        hold_out_wowhead=args.hold_out_wowhead,
        apply_junk_filter=args.apply_junk_filter,
        spec=args.spec,
    )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    report_path = (
        args.report
        or DEFAULT_OUT_DIR / f"{args.spec}-p{args.max_phase}.report.json"
    )
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
