"""Ticket 886: in every stored recording under a folder, list on-mode screen
sets worn at 1 or more and the crossing check at w + 1, if any.

usage: python -I fixtures_886.py <folder>
"""
import json
import os
import sys


def walk(o, path=""):
    """Yield every dict that looks like an on-mode setScreen, with the ranking holding it."""
    if isinstance(o, dict):
        ss = o.get("setScreen")
        if isinstance(ss, dict) and ss.get("mode") == "on":
            yield o, ss
        for k, v in o.items():
            yield from walk(v, path + "/" + k)
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from walk(v, f"{path}[{i}]")


root = sys.argv[1]
found = 0
for dirpath, _, files in os.walk(root):
    for f in files:
        if not f.endswith(".json"):
            continue
        p = os.path.join(dirpath, f)
        try:
            d = json.load(open(p, encoding="utf-8"))
        except Exception:
            continue
        for ranking, ss in walk(d):
            sets = ss.get("sets", [])
            cross = {(c["setId"], c["count"]): c for c in ranking.get("crossingChecks", []) or []}
            verdicts = [(s["setId"], s["worn"], s["reach"], s.get("kept"), s.get("reason"), s.get("measure")) for s in sets]
            worn = [s for s in sets if s["worn"] >= 1]
            found += 1
            print(f"{os.path.relpath(p, root)}: {len(sets)} screened; sigma {ss.get('sigma')}")
            for v in verdicts:
                print("   ", v)
            for s in worn:
                c = cross.get((s["setId"], s["worn"] + 1))
                print(f"    worn>=1: set {s['setId']} w{s['worn']} r{s['reach']} crossing {None if c is None else c.get('dps')} bestStats {s.get('bestStats')} measure {s.get('measure')}")
print("on-mode screens found:", found)
