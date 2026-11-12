"""Summarize ticket-635 sim outputs: DPS mean, standard error, and a few
cast counts per iteration, then the 2pc value with and without Wolfshead.

Usage: python -I 635-summarize.py <dir with *.out.json>
"""

import json
import math
import pathlib
import sys

d = pathlib.Path(sys.argv[1])
SPELLS = {768: "CatForm", 33983: "MangleCat", 27002: "Shred", 27008: "Rip", 24248: "Bite", 27003: "Rake"}

res = {}
for f in sorted(d.glob("*.out.json")):
    r = json.loads(f.read_text())
    if r.get("error"):
        print(f.name, "ERROR", r["error"]["message"][:200])
        continue
    p = r["raidMetrics"]["parties"][0]["players"][0]
    n = p["dps"]["aggregatorData"]["n"]
    mean, sd = p["dps"]["avg"], p["dps"]["stdev"]
    casts = {}
    for a in p["actions"]:
        sid = a["id"].get("spellId")
        if sid in SPELLS:
            casts[SPELLS[sid]] = casts.get(SPELLS[sid], 0) + sum(t["casts"] for t in a["targets"]) / n
    name = f.name.replace(".out.json", "")
    res[name] = (mean, sd / math.sqrt(n), n)
    cs = " ".join(f"{k}={v:.1f}" for k, v in sorted(casts.items()))
    print(f"{name:28s} dps={mean:8.1f} se={sd / math.sqrt(n):.2f} n={n}  casts/iter: {cs}")

print()
for rot in ("apl", "simple"):
    for wolf in ("1", "0"):
        on, off = res.get(f"{rot}-wolf{wolf}-th2pc1"), res.get(f"{rot}-wolf{wolf}-th2pc0")
        if on and off:
            diff = on[0] - off[0]
            se = math.sqrt(on[1] ** 2 + off[1] ** 2)
            label = "Wolfshead effect on " if wolf == "1" else "Wolfshead effect off"
            print(f"{rot:6s} {label}: TH 2pc worth {diff:7.1f} +/- {se:.2f} DPS (1 SE, independent-sample bound)")
