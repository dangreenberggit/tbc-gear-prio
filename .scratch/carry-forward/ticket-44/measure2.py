"""Ticket 44, part 2: is every raid+token pair zone/boss-identical, and how many
same-kind multi-source rows name genuinely different zones?"""

import glob
import json
import os
from collections import Counter, defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
files = sorted(
    p
    for p in glob.glob(os.path.join(ROOT, "data", "universes", "*.json"))
    if not p.endswith(".report.json")
)

token_raid_disagree = []
token_raid_agree = 0
multi_zone_rows = []
same_zone_dup_rows = 0
kind0 = Counter()
seen_pairs = set()

for path in files:
    u = json.load(open(path, encoding="utf-8"))
    label = os.path.basename(path)
    for e in u["entries"]:
        srcs = e["sources"]
        kind0[srcs[0]["kind"]] += 1
        kinds = {s["kind"] for s in srcs}
        if kinds == {"raid", "token"} or ("token" in kinds and "raid" in kinds):
            tz = {(s.get("zone"), s.get("boss")) for s in srcs if s["kind"] == "token"}
            rz = {(s.get("zone"), s.get("boss")) for s in srcs if s["kind"] == "raid"}
            if tz == rz:
                token_raid_agree += 1
            else:
                token_raid_disagree.append((label, e["itemId"], e["name"], srcs))
        zs = sorted({s["zone"] for s in srcs if "zone" in s})
        if len(zs) > 1:
            multi_zone_rows.append((label, e["itemId"], e["name"], zs))
        elif len(srcs) > 1 and len(zs) == 1:
            same_zone_dup_rows += 1

print("=== raid+token agreement on (zone, boss) ===")
print(f"identical zone+boss: {token_raid_agree}")
print(f"disagree:            {len(token_raid_disagree)}")
for d in token_raid_disagree:
    print(f"  {d[0]} {d[1]} {d[2]}")
    for s in d[3]:
        print(f"     {s}")

print()
print("=== rows whose sources name MORE THAN ONE DISTINCT zone ===")
print(f"count (row-instances across all 6 files): {len(multi_zone_rows)}")
uniq = {}
for m in multi_zone_rows:
    uniq.setdefault((m[1], tuple(m[3])), []).append(m[0])
print(f"distinct (itemId, zoneset) combos: {len(uniq)}")
for m in multi_zone_rows:
    print(f"  {m[0]} {m[1]} {m[2]} -> {m[3]}")

print()
print(f"multi-source rows where all zones agree (or none): {same_zone_dup_rows}")
print()
print("=== which kind currently wins sources[0] ===")
for k, n in kind0.most_common():
    print(f"  {k:>8} {n}")
