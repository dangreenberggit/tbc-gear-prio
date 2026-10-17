#!/usr/bin/env python3
"""Keep BOSS_UNIT_TO_ENCOUNTER honest against AtlasLoot's boss vocabulary.

A TBC encounter can be several killable units (the Illidari Council is four;
M'uru becomes Entropius). Wowhead sometimes credits a drop to the unit and
AtlasLoot always to the encounter, so without folding, one real drop reaches
the universe under two names and `boss` -- a shipped filter control -- lists a
boss that is not an encounter.

The table is only trustworthy while each value is a real AtlasLoot encounter
and each key is not. Both halves are re-derived here rather than asserted, so a
table entry cannot quietly start naming an encounter that no longer exists.

The vocabulary comes from `boss` fields in data/atlasloot_sources.json, but
the parser writes five-man drops as `heroic {dungeon}` rows with no boss. A
db.json `raid` row in a five-man zone (28288 The Mechanar · Pathaleon the
Calculator, force-included since ticket 157) therefore names a boss that file
cannot know. Such a boss is accepted only when its zone is not a
phase_raids.json raid and AtlasLoot's own five-man table lists the item under
an encounter of exactly that name; raid bosses stay held to the parsed file.
That table is read from vendor/atlasloot/data-tbc.lua, which is gitignored,
so a five-man boss fails while the Lua is absent instead of passing unchecked.

Run via `pnpm verify` (`pnpm boss-aliases:check`).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ATLASLOOT = ROOT / "data/atlasloot_sources.json"
ATLASLOOT_LUA = ROOT / "vendor/atlasloot/data-tbc.lua"
PHASE_RAIDS = ROOT / "data/phase_raids.json"
UNIVERSES = ROOT / "data/universes"

sys.path.insert(0, str(ROOT / "scripts"))
from assemble_universe import BOSS_UNIT_TO_ENCOUNTER, canonical_boss  # noqa: E402
from parse_atlasloot import (  # noqa: E402
    CONTENT_TYPE_RE,
    DATA_BLOCK_RE,
    DUNGEON_CONTENT,
    ITEMS_START_RE,
    LOOT_RE,
    NAME_RE,
    extract_brace_block,
)


def dungeon_encounter_loot(lua_text: str) -> set[tuple[str, int]]:
    """(encounter name, item id) for every boss in AtlasLoot's five-man tables.

    Walks the items block with the same depth rules as
    parse_atlasloot.parse_items_section: an encounter opens at depth 1, its
    `name` sits at depth 2, its loot rows at depth 3 and below.
    """
    pairs: set[tuple[str, int]] = set()
    for match in DATA_BLOCK_RE.finditer(lua_text):
        block = extract_brace_block(lua_text, match.end() - 1)
        content = CONTENT_TYPE_RE.search(block)
        if not content or content.group(1) != DUNGEON_CONTENT:
            continue
        items_m = ITEMS_START_RE.search(block)
        if not items_m:
            continue
        depth = 0
        name: str | None = None
        for line in extract_brace_block(block, items_m.end() - 1).splitlines():
            stripped = line.strip()
            if stripped.startswith("--"):
                continue
            if depth == 1 and stripped.startswith("{"):
                name = None
            if depth == 2:
                nm = NAME_RE.match(line)
                if nm:
                    name = nm.group(1)
            if depth >= 3 and name:
                lm = LOOT_RE.match(line)
                if lm:
                    pairs.add((name, int(lm.group(2))))
            depth += line.count("{") - line.count("}")
            if depth <= 0:
                break
    return pairs


def phase_raid_zones() -> set[str]:
    doc = json.loads(PHASE_RAIDS.read_text(encoding="utf-8-sig"))
    return {str(z["name"]) for z in doc["zones"]}


def atlasloot_boss_names() -> set[str]:
    names: set[str] = set()

    def walk(node: object) -> None:
        if isinstance(node, dict):
            for key, value in node.items():
                if key == "boss" and isinstance(value, str):
                    names.add(value)
                else:
                    walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(json.loads(ATLASLOOT.read_text(encoding="utf-8-sig")))
    return names


def emitted_boss_names() -> dict[str, set[tuple[int, str | None]]]:
    """Boss name → the (item id, zone) pairs that name it in any universe."""
    out: dict[str, set[tuple[int, str | None]]] = {}
    for path in sorted(UNIVERSES.glob("*-p*.json")):
        if path.name.endswith(".report.json"):
            continue
        doc = json.loads(path.read_text(encoding="utf-8-sig"))
        for entry in doc["entries"]:
            for source in entry.get("sources") or []:
                boss = source.get("boss")
                if isinstance(boss, str):
                    zone = source.get("zone")
                    out.setdefault(boss, set()).add(
                        (entry["itemId"], zone if isinstance(zone, str) else None)
                    )
    return out


def main() -> int:
    known = atlasloot_boss_names()
    raid_zones = phase_raid_zones()
    dungeon_loot: set[tuple[str, int]] | None = None
    accepted_dungeon_bosses: list[str] = []
    failures: list[str] = []

    for unit, encounter in BOSS_UNIT_TO_ENCOUNTER.items():
        if encounter not in known:
            failures.append(
                f"BOSS_UNIT_TO_ENCOUNTER maps {unit!r} onto {encounter!r}, "
                f"which is not a boss AtlasLoot names. The target must be a "
                f"real encounter."
            )
        # `Trash` is a genuine AtlasLoot bucket rather than a unit, so a key
        # matching a known name is only wrong when it is not the target itself.
        if unit in {n.lower() for n in known} and unit != encounter.lower():
            failures.append(
                f"BOSS_UNIT_TO_ENCOUNTER folds {unit!r}, but AtlasLoot lists "
                f"it as an encounter in its own right — folding it would erase "
                f"a real boss."
            )

    for boss, hits in sorted(emitted_boss_names().items()):
        item_ids = {item_id for item_id, _ in hits}
        if canonical_boss(boss) != boss:
            failures.append(
                f"{boss!r} reached the universe unfolded (items "
                f"{sorted(item_ids)[:5]}); canonical_boss maps it to "
                f"{canonical_boss(boss)!r}. Regenerate the universes."
            )
        elif boss in known:
            continue
        elif all(zone is not None and zone not in raid_zones for _, zone in hits):
            if dungeon_loot is None:
                if not ATLASLOOT_LUA.is_file():
                    failures.append(
                        f"{boss!r} (items {sorted(item_ids)[:5]}) is a five-man "
                        f"boss, and checking it needs {ATLASLOOT_LUA.relative_to(ROOT)}, "
                        f"which is absent. Run `pnpm sync:atlasloot:restore`."
                    )
                    continue
                dungeon_loot = dungeon_encounter_loot(
                    ATLASLOOT_LUA.read_text(encoding="utf-8")
                )
            unlisted = sorted(i for i in item_ids if (boss, i) not in dungeon_loot)
            if unlisted:
                failures.append(
                    f"{boss!r} names five-man drops (items {unlisted[:5]}) that "
                    f"AtlasLoot's dungeon tables do not list under an encounter "
                    f"of that name. Either the boss or the item is wrong."
                )
            else:
                accepted_dungeon_bosses.append(boss)
        else:
            failures.append(
                f"{boss!r} is not in AtlasLoot's boss vocabulary (items "
                f"{sorted(item_ids)[:5]}). Either it is a sub-unit that "
                f"belongs in BOSS_UNIT_TO_ENCOUNTER, or AtlasLoot is missing "
                f"an encounter and this check needs widening — decide which, "
                f"do not silence it."
            )

    if failures:
        for line in failures:
            print(f"boss-alias check FAILED: {line}", file=sys.stderr)
        return 1

    print(
        f"boss aliases ok: {len(BOSS_UNIT_TO_ENCOUNTER)} folded, "
        f"every emitted boss is one of AtlasLoot's {len(known)} encounters"
        + (
            f" or a five-man encounter its dungeon tables list "
            f"({', '.join(accepted_dungeon_bosses)})"
            if accepted_dungeon_bosses
            else ""
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
