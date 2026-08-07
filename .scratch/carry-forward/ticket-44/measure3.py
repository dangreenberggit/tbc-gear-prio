"""Ticket 44, part 3: the ticket's own claims, and boss-field corruption."""

import glob
import json
import os
from collections import Counter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
files = sorted(
    p
    for p in glob.glob(os.path.join(ROOT, "data", "universes", "*.json"))
    if not p.endswith(".report.json")
)

rep_and_badge = []
quest_and_crafted = []
rep_beats_raid = []
badge_beats_raid = []
unknown_beats_named = []
polluted_boss = []
all_kinds = Counter()

for path in files:
    u = json.load(open(path, encoding="utf-8"))
    label = os.path.basename(path)
    for e in u["entries"]:
        srcs = e["sources"]
        kinds = {s["kind"] for s in srcs}
        all_kinds.update(kinds)
        if "rep" in kinds and "badge" in kinds:
            rep_and_badge.append((label, e["itemId"], e["name"], srcs))
        if "quest" in kinds and "crafted" in kinds:
            quest_and_crafted.append((label, e["itemId"], e["name"], srcs))
        k0 = srcs[0]["kind"]
        if k0 == "rep" and "raid" in kinds:
            rep_beats_raid.append((label, e["itemId"], e["name"], srcs))
        if k0 == "badge" and "raid" in kinds:
            badge_beats_raid.append((label, e["itemId"], e["name"], srcs))
        if k0 == "unknown" and kinds - {"unknown"}:
            unknown_beats_named.append((label, e["itemId"], e["name"], srcs))
        # a raid boss field that embeds a token name (" - " separator)
        for s in srcs:
            b = s.get("boss")
            if b and " - " in b:
                polluted_boss.append((label, e["itemId"], e["name"], s))

print("kinds present anywhere:", dict(all_kinds))
print()
print(f"items with BOTH rep and badge: {len(rep_and_badge)}")
for x in rep_and_badge[:10]:
    print("  ", x)
print(f"items with BOTH quest and crafted: {len(quest_and_crafted)}")
for x in quest_and_crafted[:10]:
    print("  ", x)
print()
print("=== ticket claim: a rep row outranks a raid row at sources[0] ===")
print(f"count: {len(rep_beats_raid)}")
for x in rep_beats_raid[:10]:
    print("  ", x)
print(f"badge at [0] while a raid row exists: {len(badge_beats_raid)}")
for x in badge_beats_raid[:10]:
    print("  ", x)
print(f"unknown at [0] while a named row exists: {len(unknown_beats_named)}")
for x in unknown_beats_named[:10]:
    print("  ", x)
print()
print("=== boss fields containing an embedded token name (' - ') ===")
print(f"row-instances: {len(polluted_boss)}")
uniq = sorted({(x[1], x[3].get("boss")) for x in polluted_boss})
print(f"distinct (itemId, boss): {len(uniq)}")
for x in uniq:
    print("  ", x)
