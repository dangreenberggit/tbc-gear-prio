"""Measure multi-source shapes in data/universes/*.json for ticket 44."""

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

pair_counts = Counter()
pair_examples = defaultdict(list)
same_kind_multi = Counter()
same_kind_examples = defaultdict(list)
total_entries = 0
multi_kind_entries = 0
multi_source_entries = 0


def zones(sources):
    return {s.get("zone") for s in sources if "zone" in s}


for path in files:
    u = json.load(open(path, encoding="utf-8"))
    label = os.path.basename(path)
    for e in u["entries"]:
        total_entries += 1
        srcs = e["sources"]
        if len(srcs) > 1:
            multi_source_entries += 1
        kinds = sorted({s["kind"] for s in srcs})
        if len(kinds) > 1:
            multi_kind_entries += 1
            for i in range(len(kinds)):
                for j in range(i + 1, len(kinds)):
                    key = (kinds[i], kinds[j])
                    pair_counts[key] += 1
                    if len(pair_examples[key]) < 6:
                        pair_examples[key].append(
                            (label, e["itemId"], e["name"], srcs)
                        )
        kc = Counter(s["kind"] for s in srcs)
        for k, n in kc.items():
            if n > 1:
                same_kind_multi[k] += 1
                if len(same_kind_examples[k]) < 8:
                    same_kind_examples[k].append(
                        (label, e["itemId"], e["name"], [s for s in srcs if s["kind"] == k])
                    )

print(f"files: {[os.path.basename(f) for f in files]}")
print(f"total entries (all files, rows not deduped): {total_entries}")
print(f"entries with >1 source row: {multi_source_entries}")
print(f"entries with >1 DISTINCT kind: {multi_kind_entries}")
print()
print("=== kind pairs ===")
for key, n in pair_counts.most_common():
    print(f"{key[0]:>8} + {key[1]:<10} {n}")
    for ex in pair_examples[key]:
        print(f"      {ex[0]} {ex[1]} {ex[2]}")
        for s in ex[3]:
            print(f"         {s}")
print()
print("=== multiple sources of the SAME kind ===")
for k, n in same_kind_multi.most_common():
    print(f"{k}: {n} entries")
    for ex in same_kind_examples[k]:
        zs = [s.get("zone") for s in ex[3]]
        print(f"      {ex[0]} {ex[1]} {ex[2]} zones={zs}")
