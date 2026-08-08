"""What would change if wowhead prose stopped contributing zone/boss claims
for items that already have a machine source?

Runs the real parser from assemble_universe.py so the answer is not a guess.
"""
import json, glob, os, sys, collections, importlib.util

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

spec = importlib.util.spec_from_file_location(
    "assemble_universe", os.path.join(ROOT, "scripts", "assemble_universe.py")
)
au = importlib.util.module_from_spec(spec)
sys.modules["assemble_universe"] = au
spec.loader.exec_module(au)


def load(p):
    return json.load(open(os.path.join(ROOT, p), encoding="utf-8-sig"))


atlas_ids = {int(k) for k in load("data/atlasloot_sources.json")}
two_hop = set()
for sp in ["ret", "feral"]:
    for e in load(f"data/two-hop/{sp}-tokens.json")["entries"]:
        two_hop.add(int(e["pieceId"]))
db = load("vendor/wowsims/db.json")
key = [k for k in ("items", "Items") if k in db][0]
db_src = {}
for it in db[key]:
    iid = it.get("id") or it.get("ID")
    if iid:
        db_src[int(iid)] = it.get("sources") or []

ZONE_KINDS = {"raid", "dungeon"}

kept = collections.Counter()
suppressed = collections.Counter()
suppressed_rows = []
prose_only_zone = []

seen = set()
for f in sorted(glob.glob(os.path.join(ROOT, "data/wowhead-lists/*/*.json"))):
    for e in json.load(open(f, encoding="utf-8-sig"))["entries"]:
        iid = int(e["itemId"])
        if iid in seen:
            continue
        seen.add(iid)
        parsed = au.parse_wowhead_source(e.get("wowheadSourceText"))
        has_machine = iid in atlas_ids or iid in two_hop or bool(db_src.get(iid))
        for s in parsed:
            kind = s.get("kind")
            carries_locus = bool(s.get("boss")) or (kind in ZONE_KINDS and s.get("zone"))
            if carries_locus and has_machine:
                suppressed[kind] += 1
                suppressed_rows.append((iid, e.get("itemName"), kind, s.get("zone"), s.get("boss")))
            else:
                kept[kind] += 1
                if carries_locus and not has_machine:
                    prose_only_zone.append((iid, e.get("itemName"), s.get("zone"), s.get("boss")))

print("distinct items:", len(seen))
print()
print("=== wowhead-parsed sources that would be SUPPRESSED (machine source exists) ===")
for k, v in suppressed.most_common():
    print(f"  {k:10} {v}")
print("  total:", sum(suppressed.values()))
print()
print("=== wowhead-parsed sources that would be KEPT ===")
for k, v in kept.most_common():
    print(f"  {k:10} {v}")
print("  total:", sum(kept.values()))
print()
print(f"=== zone/boss claims that survive on prose alone ({len(prose_only_zone)}) ===")
for iid, name, zone, boss in sorted(prose_only_zone):
    print(f"  {iid:6} {str(name)[:36]:36} zone={zone!r} boss={boss!r}")
