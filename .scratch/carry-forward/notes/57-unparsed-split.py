"""How much of ticket 45's unparsed-prose backlog does ticket 57 make moot?

A row whose prose parses to nothing only matters if the item has no other
source. Split the unparsed rows by whether a machine input already covers the
item: the covered ones stop mattering once 57 lands, the uncovered ones are
still 45's job.
"""
import json, glob, os, sys, importlib.util

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

spec = importlib.util.spec_from_file_location(
    "assemble_universe", os.path.join(ROOT, "scripts", "assemble_universe.py")
)
au = importlib.util.module_from_spec(spec)
sys.modules["assemble_universe"] = au
spec.loader.exec_module(au)


def load(rel):
    return json.load(open(os.path.join(ROOT, rel), encoding="utf-8-sig"))


atlas_ids = {int(k) for k in load("data/atlasloot_sources.json")}

two_hop = set()
for sp in ["ret", "feral"]:
    for e in load(f"data/two-hop/{sp}-tokens.json")["entries"]:
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


moot, still_needed = [], []
for path in sorted(glob.glob(os.path.join(ROOT, "data/wowhead-lists/*/*.json"))):
    for e in json.load(open(path, encoding="utf-8-sig"))["entries"]:
        if au.parse_wowhead_source(e.get("wowheadSourceText")):
            continue
        row = (int(e["itemId"]), e.get("itemName"), e.get("wowheadSourceText"))
        (moot if covered(int(e["itemId"])) else still_needed).append(row)

print(f"unparsed rows total: {len(moot) + len(still_needed)}")
print(f"  on machine-covered items (ticket 57 makes moot): {len(moot)}")
print(f"  on uncovered items (ticket 45 still must fix)  : {len(still_needed)}")
print()
print("=== still needed by 45 ===")
for iid, name, prose in sorted(set(still_needed)):
    print(f"  {iid:6} {str(name)[:38]:38} {str(prose)[:58]}")
