#!/usr/bin/env python3
"""Belt single-swap under OUR default APL rotation (rotation lever check).
Takes the convergence-arms-0811 payloads and substitutes the TypeAPL rotation
block from corrected-arms/OWNER2_BASE.req.json; gear/settings otherwise identical.
"""
import json, statistics, subprocess, sys
from pathlib import Path
ROOT = Path("C:/Users/dgree/Code/lulz/tbc-gear-prio")
LOCK = ROOT / "data/wowsims.lock.json"
REQ_DIR = ROOT / ".scratch/set-bonus-value/loop-103-106/convergence-arms-0811"
APL_SRC = ROOT / ".scratch/set-bonus-value/loop-103-106/corrected-arms/OWNER2_BASE.req.json"
OUT = ROOT / ".scratch/set-bonus-value/loop-103-106/sims-convergence-0811-apl"
OUT.mkdir(parents=True, exist_ok=True)
SEEDS = ("11","22","33","44","55"); ITERATIONS = 3000
tag_lock = json.loads(LOCK.read_text())["tag"]
cli = ROOT / "vendor" / f"wowsimcli-{tag_lock}-win32-x64" / "wowsimcli-windows.exe"
apl = json.loads(APL_SRC.read_text())["raid"]["parties"][0]["players"][0]["rotation"]
def run(req, tag, seed):
    req = json.loads(json.dumps(req))
    req["simOptions"] = {"iterations": ITERATIONS, "randomSeed": seed, "debugFirstIteration": False}
    rp = OUT / f"{tag}-{seed}.req.json"; op = OUT / f"{tag}-{seed}.json"
    rp.write_text(json.dumps(req))
    subprocess.run([str(cli),"sim","--infile",str(rp),"--outfile",str(op)], check=True, capture_output=True)
    return json.loads(op.read_text())["raidMetrics"]["dps"]["avg"]
per = {}
for tag in ("OWNER2_BASE","BELT100"):
    req = json.loads((REQ_DIR / f"{tag}.req.json").read_text())
    req["raid"]["parties"][0]["players"][0]["rotation"] = apl
    vals = [run(req, tag, s) for s in SEEDS]
    per[tag] = vals
    print(f"  {tag:14s}", "  ".join(f"{v:8.2f}" for v in vals), f"mean={statistics.mean(vals):9.2f}", flush=True)
b = statistics.mean(per["OWNER2_BASE"]); m = statistics.mean(per["BELT100"])
print(f"  [APL] baseline       = {b:9.2f}")
print(f"  [APL] BELT100 - BASE = {m-b:+8.2f}")
print("        per-seed", ['%.3f' % (x-y) for x,y in zip(per['BELT100'],per['OWNER2_BASE'])])
json.dump(per, open(OUT/"per-seed.json","w"), indent=2)
