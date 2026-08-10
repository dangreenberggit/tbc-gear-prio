"""Ticket 57's "done when", measured through the real pipeline.

`57-impact.py` answers "what *would* be suppressed" by running the parser
standalone, so it cannot see the assemble_universe change -- it reports the same
148/94 before and after. This one calls `build()` itself and counts the sources
the wowhead origin actually emitted.

Counting emitted rows rather than re-deriving coverage is deliberate. An earlier
version of this script rebuilt the machine-coverage set from db.json/AtlasLoot
and got `heroic 1` against an expected 13 -- not a pipeline defect but a
different question: those items are covered in db.json while their *AtlasLoot*
rows carry an empty zone list, and the pipeline keys on the sources actually
accumulated. Any re-derivation is a second implementation that can disagree with
the first, which is the whole failure mode ticket 57 is about.

    python .scratch/carry-forward/notes/57-emitted-check.py

Expected after the change: 0 wowhead locus rows on machine-covered items, and
the kept non-locus kinds intact. A drop in `heroic` means the
presence-vs-supplies trap was hit.
"""
import json, os, sys, collections, importlib.util

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
os.chdir(ROOT)

spec = importlib.util.spec_from_file_location(
    "assemble_universe", os.path.join(ROOT, "scripts", "assemble_universe.py")
)
au = importlib.util.module_from_spec(spec)
sys.modules["assemble_universe"] = au
spec.loader.exec_module(au)

# The six committed universes, as regenerated on disk.
UNIVERSES = [("ret", 2), ("ret", 3), ("ret", 4), ("ret", 5), ("feral", 2), ("feral", 3)]

kept = collections.Counter()
locus_rows = []
per_universe = {}

for spec_name, phase in UNIVERSES:
    path = os.path.join(ROOT, f"data/universes/{spec_name}-p{phase}.json")
    doc = json.load(open(path, encoding="utf-8-sig"))
    entries = doc.get("entries")
    if not entries:
        raise SystemExit(f"{path} has no `entries` -- shape changed, check is blind")

    u_kept = collections.Counter()
    u_locus = 0
    for it in entries:
        iid = int(it["itemId"])
        rows = it.get("sources") or []
        machine_locus = any(
            r.get("origin") != "wowhead" and au.carries_locus(r) for r in rows
        )
        for r in rows:
            if r.get("origin") != "wowhead":
                continue
            u_kept[r.get("kind")] += 1
            if au.carries_locus(r):
                u_locus += 1
                if machine_locus:
                    locus_rows.append((f"{spec_name}-p{phase}", iid, it.get("name"), r))
    per_universe[f"{spec_name}-p{phase}"] = (u_kept, u_locus)
    kept += u_kept

print("=== wowhead-origin sources emitted, per universe ===")
for name, (u_kept, u_locus) in per_universe.items():
    total = sum(u_kept.values())
    print(f"  {name:10} {total:4} rows, {u_locus:3} carrying a locus")
print()
print("=== wowhead-origin sources by kind, all six universes ===")
for k, v in kept.most_common():
    print(f"  {k:10} {v}")
print("  total:", sum(kept.values()))
print()
print(f"wowhead locus rows on items a machine input also places: {len(locus_rows)} (want 0)")
for name, iid, item, r in locus_rows:
    print(f"  !! {name} {iid} {item} {r}")

sys.exit(1 if locus_rows else 0)
