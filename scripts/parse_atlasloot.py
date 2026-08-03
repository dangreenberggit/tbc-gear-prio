#!/usr/bin/env python3
"""
parse_atlasloot.py -- extract item→source mappings from vendored AtlasLoot TBC loot data.

Reads vendor/atlasloot/data-tbc.lua (line/regex parser, no Lua VM) and writes
data/atlasloot_sources.json: item ID (string key) → list of ItemSource records.

Boss loot from dungeon and raid tables in data-tbc.lua produces only:
  - kind "raid" for raid-instance boss drops
  - kind "heroic" for dungeon boss drops under HEROIC_DIFF

Normal-mode dungeon drops are parsed but discarded — they do not clear the
raid-scoped pool's quality/relevance bar and are omitted from output.

Usage:
    python scripts/parse_atlasloot.py
    python scripts/parse_atlasloot.py --lua vendor/atlasloot/data-tbc.lua --out data/atlasloot_sources.json
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LUA = ROOT / "vendor" / "atlasloot" / "data-tbc.lua"
DEFAULT_DB = ROOT / "vendor" / "wowsims" / "db.json"
DEFAULT_OUT = ROOT / "data" / "atlasloot_sources.json"
DEFAULT_RECIPES_OUT = ROOT / "data" / "two-hop" / "raid-recipes.json"

# AtlasLoot stores only the recipe's *item* id in the loot table; the crafted
# product it teaches appears nowhere in the data structures. The trailing
# comment ("-- Pattern: Swiftstrike Shoulders") is the only place upstream
# records the product, so this two-hop joins on the product *name* and then
# resolves that name to an id via db.json. Weaker than the id joins used
# elsewhere — a comment typo or a rename upstream silently drops a row, which
# is why the generated file is committed and row-count asserted rather than
# rebuilt implicitly at assemble time.
RECIPE_COMMENT_RE = re.compile(
    r"\{\s*\d+\s*,\s*(\d+)[^}]*\}\s*,\s*--\s*"
    r"(?:Plans|Pattern|Schematic|Recipe|Design|Formula|Manual|Technique)\s*:\s*(.+)"
)

INSTANCE_ZONE_ALIASES: dict[str, str] = {
    "Karazhan": "Karazhan",
    "MagtheridonsLair": "Magtheridon's Lair",
    "GruulsLair": "Gruul's Lair",
    "SerpentshrineCavern": "Serpentshrine Cavern",
    "TempestKeep": "Tempest Keep",
    "HyjalSummit": "Hyjal Summit",
    "BlackTemple": "Black Temple",
    "SunwellPlateau": "Sunwell Plateau",
    "ZulAman": "Zul'Aman",
    # Doomwalker and Doom Lord Kazzak are outdoor, so they have no MapID and
    # wowsims' db.json carries no sources for their drops at all. AtlasLoot is
    # the only place their loot tables exist, and this alias is what lets them
    # resolve — without it the whole block is dropped as zone-unresolved.
    "WorldBossesBC": "World Bosses",
}

DATA_BLOCK_RE = re.compile(r'^data\["([^"]+)"\]\s*=\s*\{', re.MULTILINE)
CONTENT_TYPE_RE = re.compile(r"ContentType\s*=\s*(\w+)")
MAP_ID_RE = re.compile(r"MapID\s*=\s*(\d+)")
ITEMS_START_RE = re.compile(r"items\s*=\s*\{")
NPC_ID_RE = re.compile(r"^\s*npcID\s*=\s*(\d+)\s*,?\s*$")
NPC_ID_LIST_RE = re.compile(r"^\s*npcID\s*=\s*\{([^}]+)\}\s*,?\s*$")
NAME_RE = re.compile(r'^\s*name\s*=\s*AL\["([^"]+)"\]\s*,?\s*$')
DIFF_RE = re.compile(
    r"^\s*\[(NORMAL_DIFF|HEROIC_DIFF|RAID10_DIFF|RAID25_DIFF|RAID10H_DIFF|RAID25H_DIFF)\]\s*=\s*\{\s*$"
)
LOOT_RE = re.compile(r"^\s*\{\s*(\d+)\s*,\s*(\d+)\s*[,}]")
IGNORE_SOURCE_RE = re.compile(r"^\s*IgnoreAsSource\s*=\s*true\s*,?\s*$")

RAID_CONTENT = {"RAID10_CONTENT", "RAID25_CONTENT"}
DUNGEON_CONTENT = "DUNGEON_CONTENT"


def extract_brace_block(text: str, open_brace: int) -> str:
    depth = 0
    for i in range(open_brace, len(text)):
        ch = text[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[open_brace : i + 1]
    raise ValueError(f"unbalanced braces at offset {open_brace}")


def first_npc_id(line: str) -> int | None:
    m = NPC_ID_RE.match(line)
    if m:
        return int(m.group(1))
    m = NPC_ID_LIST_RE.match(line)
    if m:
        nums = [int(x.strip()) for x in m.group(1).split(",") if x.strip().isdigit()]
        return nums[0] if nums else None
    return None


def source_key(src: dict) -> tuple:
    return (src["kind"], src.get("zone"), src.get("boss"), src.get("dungeon"))


def resolve_zone(
    npc_id: int | None,
    instance_key: str,
    map_zone: str | None,
    *,
    zones_by_id: dict[int, str],
    npc_zone_by_id: dict[int, int],
    stats: dict,
) -> str | None:
    if npc_id is not None and npc_id in npc_zone_by_id:
        zone = zones_by_id.get(npc_zone_by_id[npc_id])
        if zone:
            stats["zone_via_npc"] += 1
            return zone
    if map_zone:
        stats["zone_via_mapid"] += 1
        return map_zone
    alias = INSTANCE_ZONE_ALIASES.get(instance_key)
    if alias:
        stats["zone_via_instance_alias"] += 1
        return alias
    stats["zone_unresolved"] += 1
    return None


def parse_items_section(
    items_text: str,
    *,
    instance_key: str,
    is_dungeon: bool,
    is_raid: bool,
    map_zone: str | None,
    zones_by_id: dict[int, str],
    npcs_by_id: dict[int, str],
    npc_zone_by_id: dict[int, int],
    stats: dict,
) -> dict[int, list[dict]]:
    out: dict[int, list[dict]] = defaultdict(list)
    lines = items_text.splitlines()

    boss_npc: int | None = None
    boss_name: str | None = None
    ignore_boss = False
    current_diff: str | None = None
    depth = 0

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("--"):
            continue

        opens = line.count("{")
        closes = line.count("}")

        if depth == 1 and opens and stripped.startswith("{"):
            boss_npc = None
            boss_name = None
            ignore_boss = False
            current_diff = None

        if depth == 2:
            if IGNORE_SOURCE_RE.match(line):
                ignore_boss = True
            npc = first_npc_id(line)
            if npc is not None:
                boss_npc = npc
            nm = NAME_RE.match(line)
            if nm:
                boss_name = nm.group(1)
            dm = DIFF_RE.match(line)
            if dm:
                current_diff = dm.group(1)
                if is_raid and current_diff == "HEROIC_DIFF":
                    raise SystemExit(
                        f"raid instance {instance_key!r} has HEROIC_DIFF on boss "
                        f"{boss_name!r} — parser assumed raids lack heroic; fix before continuing"
                    )

        if depth >= 3 and current_diff and not ignore_boss:
            lm = LOOT_RE.match(line)
            if lm:
                item_id = int(lm.group(2))
                if is_dungeon:
                    if current_diff != "HEROIC_DIFF":
                        stats["dungeon_normal_skipped"] += 1
                        depth += opens - closes
                        if depth <= 0:
                            break
                        continue
                    kind = "heroic"
                    dungeon = map_zone or INSTANCE_ZONE_ALIASES.get(instance_key) or instance_key
                    src: dict = {"kind": kind, "dungeon": dungeon}
                elif is_raid:
                    zone = resolve_zone(
                        boss_npc,
                        instance_key,
                        map_zone,
                        zones_by_id=zones_by_id,
                        npc_zone_by_id=npc_zone_by_id,
                        stats=stats,
                    )
                    if zone is None:
                        stats["items_unresolved_zone"] += 1
                        depth += opens - closes
                        if depth <= 0:
                            break
                        continue
                    boss = boss_name or (npcs_by_id.get(boss_npc) if boss_npc else None)
                    src = {"kind": "raid", "zone": zone}
                    if boss:
                        src["boss"] = boss
                else:
                    depth += opens - closes
                    if depth <= 0:
                        break
                    continue

                existing = out[item_id]
                if not any(source_key(s) == source_key(src) for s in existing):
                    existing.append(src)
                    stats["items_emitted"] += 1

        depth += opens - closes
        if depth <= 0:
            break

    return out


def parse_lua(
    lua_text: str,
    *,
    zones_by_id: dict[int, str],
    npcs_by_id: dict[int, str],
    npc_zone_by_id: dict[int, int],
) -> tuple[dict[str, list[dict]], dict]:
    stats: dict = defaultdict(int)
    merged: dict[int, list[dict]] = defaultdict(list)

    for match in DATA_BLOCK_RE.finditer(lua_text):
        instance_key = match.group(1)
        block = extract_brace_block(lua_text, match.end() - 1)
        stats["instances"] += 1

        content_m = CONTENT_TYPE_RE.search(block)
        content = content_m.group(1) if content_m else None
        is_dungeon = content == DUNGEON_CONTENT
        is_raid = content in RAID_CONTENT
        if not is_dungeon and not is_raid:
            stats["instances_skipped"] += 1
            continue

        map_m = MAP_ID_RE.search(block)
        map_id = int(map_m.group(1)) if map_m else None
        map_zone = zones_by_id.get(map_id) if map_id else None

        items_m = ITEMS_START_RE.search(block)
        if not items_m:
            continue
        items_block = extract_brace_block(block, items_m.end() - 1)

        partial = parse_items_section(
            items_block,
            instance_key=instance_key,
            is_dungeon=is_dungeon,
            is_raid=is_raid,
            map_zone=map_zone,
            zones_by_id=zones_by_id,
            npcs_by_id=npcs_by_id,
            npc_zone_by_id=npc_zone_by_id,
            stats=stats,
        )
        for item_id, sources in partial.items():
            for src in sources:
                if not any(source_key(s) == source_key(src) for s in merged[item_id]):
                    merged[item_id].append(src)

    # String keys for JSON output (consumer-friendly lookup by str(id)).
    output = {str(item_id): sources for item_id, sources in sorted(merged.items())}
    return output, dict(stats)


def load_db(path: Path) -> dict:
    if not path.is_file():
        raise SystemExit(f"missing {path} — run python scripts/sync_wowsims.py --update")
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def parse_raid_recipes(
    lua_text: str,
    sources: dict,
    *,
    item_ids_by_name: dict[str, int],
    raid_zones: set[str],
) -> tuple[list[dict], dict]:
    """Recipe-item drops → crafted-product rows, for recipes that drop in a raid."""
    stats: dict = defaultdict(int)
    rows: dict[int, dict] = {}
    for recipe_id_raw, product_name_raw in RECIPE_COMMENT_RE.findall(lua_text):
        recipe_id = int(recipe_id_raw)
        product_name = product_name_raw.strip()
        stats["recipe_comments"] += 1
        product_id = item_ids_by_name.get(product_name)
        if product_id is None:
            # Enchants, gems and consumables are taught by raid recipes too, but
            # they are not equippable items and never enter the gear universe.
            stats["product_not_an_item"] += 1
            continue
        raid_drops = [
            src
            for src in (sources.get(str(recipe_id)) or [])
            if src.get("kind") == "raid" and src.get("zone") in raid_zones
        ]
        if not raid_drops:
            stats["recipe_not_raid_dropped"] += 1
            continue
        existing = rows.get(product_id)
        zones = existing["zones"] if existing else []
        for src in raid_drops:
            if src not in zones:
                zones.append(src)
        if existing is None:
            rows[product_id] = {
                "productId": product_id,
                "productName": product_name,
                "recipeId": recipe_id,
                "zones": zones,
            }
            stats["raid_recipe_products"] += 1
    return [rows[k] for k in sorted(rows)], dict(stats)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lua", type=Path, default=DEFAULT_LUA)
    ap.add_argument("--db", type=Path, default=DEFAULT_DB)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--recipes-out", type=Path, default=DEFAULT_RECIPES_OUT)
    args = ap.parse_args()

    if not args.lua.is_file():
        print(f"missing {args.lua} — run python scripts/sync_atlasloot.py --update", file=sys.stderr)
        return 2

    db = load_db(args.db)
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
    npc_zone_by_id = {
        int(n["id"]): int(n["zoneId"])
        for n in (db.get("npcs") or [])
        if isinstance(n, dict) and "id" in n and "zoneId" in n
    }

    lua_text = args.lua.read_text(encoding="utf-8")
    sources, stats = parse_lua(
        lua_text,
        zones_by_id=zones_by_id,
        npcs_by_id=npcs_by_id,
        npc_zone_by_id=npc_zone_by_id,
    )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8") as fh:
        json.dump(sources, fh, indent=2, sort_keys=True)
        fh.write("\n")

    print(f"  wrote {len(sources)} item keys -> {args.out}")
    for key in sorted(stats):
        print(f"  {key}: {stats[key]}")

    item_ids_by_name: dict[str, int] = {}
    for it in db.get("items") or []:
        if isinstance(it, dict) and "id" in it and "name" in it:
            item_ids_by_name.setdefault(str(it["name"]), int(it["id"]))
    phase_raids = json.loads(
        (ROOT / "data" / "phase_raids.json").read_text(encoding="utf-8")
    )
    raid_zones = {str(z["name"]) for z in phase_raids.get("zones") or []}
    recipe_rows, recipe_stats = parse_raid_recipes(
        lua_text,
        sources,
        item_ids_by_name=item_ids_by_name,
        raid_zones=raid_zones,
    )
    args.recipes_out.parent.mkdir(parents=True, exist_ok=True)
    with args.recipes_out.open("w", encoding="utf-8") as fh:
        json.dump(
            {
                "kind": "raid-recipe-map",
                "generatedBy": "scripts/parse_atlasloot.py",
                "notes": [
                    "Recipe→product join comes from the trailing comment on each "
                    "AtlasLoot loot row; the product name is resolved to an id via "
                    "vendor/wowsims/db.json items[].name.",
                    "Only recipes dropping in a data/phase_raids.json zone are kept.",
                ],
                "entries": recipe_rows,
            },
            fh,
            indent=2,
        )
        fh.write("\n")
    print(f"  wrote {len(recipe_rows)} raid-recipe products -> {args.recipes_out}")
    for key in sorted(recipe_stats):
        print(f"  {key}: {recipe_stats[key]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
