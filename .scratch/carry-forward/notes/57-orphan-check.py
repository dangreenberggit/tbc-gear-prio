"""Is the ticket-57 suppression lossless on the shipped universes?

For every `origin: wowhead` source that carries a zone or boss, on an item some
machine input also covers, check whether a non-wowhead row for the same zone
already sits beside it. Those rows are the ones ticket 57 proposes to stop
emitting; a row with no such sibling would be a real loss of coverage.

Expected: 0 without a sibling.
"""
import json, glob, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))


def load(rel):
    return json.load(open(os.path.join(ROOT, rel), encoding="utf-8-sig"))


atlas_ids = {int(k) for k in load("data/atlasloot_sources.json")}

two_hop = set()
for spec in ["ret", "feral"]:
    for e in load(f"data/two-hop/{spec}-tokens.json")["entries"]:
        two_hop.add(int(e["pieceId"]))

db = load("vendor/wowsims/db.json")
key = [k for k in ("items", "Items") if k in db][0]
db_sources = {}
for it in db[key]:
    iid = it.get("id") or it.get("ID")
    if iid:
        db_sources[int(iid)] = it.get("sources") or []


def covered(item_id):
    return item_id in atlas_ids or item_id in two_hop or bool(db_sources.get(item_id))


def carries_locus(src):
    return bool(src.get("boss")) or (src.get("kind") == "raid" and src.get("zone"))


total = 0
orphans = []

for path in sorted(glob.glob(os.path.join(ROOT, "data/universes/*-p*.json"))):
    if "report" in path:
        continue
    for entry in load(os.path.relpath(path, ROOT))["entries"]:
        iid = entry["itemId"]
        if not covered(iid):
            continue
        for src in entry.get("sources", []):
            if src.get("origin") != "wowhead" or not carries_locus(src):
                continue
            total += 1
            has_sibling = any(
                other.get("origin") != "wowhead" and other.get("zone") == src.get("zone")
                for other in entry["sources"]
            )
            if not has_sibling:
                orphans.append(
                    (os.path.basename(path), iid, entry.get("name"), src.get("zone"), src.get("boss"))
                )

print(f"wowhead locus rows on machine-covered items: {total}")
print(f"without a same-zone non-wowhead sibling:     {len(orphans)}")
for row in orphans:
    print("   ", row)
