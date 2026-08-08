#!/usr/bin/env python3
"""Ticket 65 sizing: what do the two P3 reputation vendors add to ret-p3?

Needs the upstream Factions module, which is NOT vendored (that is ticket 58).
Fetch it to a scratch path first, at the commit data/atlasloot.lock.json pins:

  gh api repos/Hoizame/AtlasLootClassic/contents/AtlasLootClassic_Factions/data-tbc.lua?ref=$(python -c "import json;print(json.load(open('data/atlasloot.lock.json'))['commit'])") --jq .content | base64 -d > /tmp/factions-tbc.lua

  python .scratch/carry-forward/notes/65-faction-overlap.py /tmp/factions-tbc.lua
"""
import json
import re
import sys

FACTIONS = (
    ("AshtongueDeathsworn", "Ashtongue Deathsworn"),
    ("TheScaleOfTheSands", "Scale of the Sands"),
)
RECIPE_RE = re.compile(r"(Plans|Pattern|Recipe|Design|Formula|Schematic):")


def faction_block(src: str, name: str) -> str:
    i = src.find(f'data["{name}"]')
    if i < 0:
        raise SystemExit(f"{name} not found — is this the Factions module?")
    j = src.find('\ndata["', i + 1)
    return src[i : j if j > 0 else len(src)]


def rows(block: str) -> list[tuple[int, str]]:
    """(itemId, trailing comment) for every `{ n, id }, -- Name` row."""
    return [
        (int(i), n.strip())
        for i, n in re.findall(r"\{\s*\d+,\s*(\d{4,6})\s*\},\s*--\s*(.+)", block)
    ]


def main() -> int:
    lua = sys.argv[1] if len(sys.argv) > 1 else "/tmp/factions-tbc.lua"
    src = open(lua, encoding="utf-8").read()
    items = json.load(open("data/items/index.json"))
    universe = json.load(open("data/universes/ret-p3.json"))
    uids = {e["itemId"] for e in universe["entries"]}
    gem_names = {g["name"] for g in json.load(open("vendor/wowsims/db.json"))["gems"]}

    for key, label in FACTIONS:
        block = faction_block(src, key)
        # Every id in the table, including recipe rows that carry no comment.
        all_ids = sorted({int(m) for m in re.findall(r"\{\s*\d+,\s*(\d{4,6})\s*\}", block)})
        gear = [i for i in all_ids if str(i) in items]
        recipes = [(i, n) for i, n in rows(block) if RECIPE_RE.match(n)]

        print("=" * 64)
        print(f"{label}: {len(all_ids)} rows | {len(gear)} gear | {len(recipes)} recipes")
        missing = [i for i in gear if i not in uids]
        print(f"  gear already in ret-p3: {len(gear) - len(missing)}")
        print(f"  gear missing from ret-p3: {len(missing)}")
        for i in missing:
            print(f"    + {i} {items[str(i)]['name']} [{items[str(i)]['slot']}]")

        crafted_gear, crafted_gems, unknown = [], [], []
        for i, n in recipes:
            out = n.split(":", 1)[1].strip()
            hits = [int(k) for k, v in items.items() if v["name"] == out]
            if hits:
                crafted_gear.append((i, out, any(h in uids for h in hits)))
            elif out in gem_names:
                crafted_gems.append((i, out))
            else:
                unknown.append((i, out))
        print(f"  recipe outputs: {len(crafted_gear)} gear, {len(crafted_gems)} gems, {len(unknown)} unresolved")
        for i, out, present in crafted_gear:
            print(f"    craft {i} -> {out} {'(in universe)' if present else '(NOT in universe)'}")
        for i, out in unknown:
            print(f"    ?? {i} -> {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
