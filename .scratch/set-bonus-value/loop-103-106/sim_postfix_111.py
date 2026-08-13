import json, statistics, subprocess, sys
from pathlib import Path
ROOT = Path("C:/Users/dgree/Code/lulz/tbc-gear-prio")
LOCK = ROOT / "data/wowsims.lock.json"
REQ_DIR = ROOT / ".scratch/set-bonus-value/loop-103-106/uigems-arms-simplerot"
OUT = ROOT / ".scratch/set-bonus-value/loop-103-106/sims-111-postfix"
OUT.mkdir(parents=True, exist_ok=True)
SEEDS = ("11","22","33","44","55"); ITERATIONS = 3000
tag_lock = json.loads(LOCK.read_text())["tag"]
cli = ROOT / "vendor" / f"wowsimcli-{tag_lock}-win32-x64" / "wowsimcli-windows.exe"
print("CLI:", cli, cli.exists())
def run_sim(req, tag, seed):
    req = json.loads(json.dumps(req))
    req["simOptions"] = {"iterations": ITERATIONS, "randomSeed": seed, "debugFirstIteration": False}
    rp = OUT / f"{tag}-{seed}.req.json"; op = OUT / f"{tag}-{seed}.json"
    rp.write_text(json.dumps(req))
    subprocess.run([str(cli),"sim","--infile",str(rp),"--outfile",str(op)], check=True, capture_output=True)
    return json.loads(op.read_text())["raidMetrics"]["dps"]["avg"]
per = {}
for tag in ("OWNER2_BASE","PKG_PROD_POSTFIX"):
    req = json.loads((REQ_DIR / f"{tag}.req.json").read_text())
    vals = [run_sim(req, tag, s) for s in SEEDS]
    per[tag] = vals
    print(f"  {tag:18s}", "  ".join(f"{v:8.2f}" for v in vals), f"mean={statistics.mean(vals):9.2f}", flush=True)
b = statistics.mean(per["OWNER2_BASE"]); m = statistics.mean(per["PKG_PROD_POSTFIX"])
print(f"  delta PKG_PROD_POSTFIX - OWNER2_BASE = {m-b:+8.2f}")
json.dump(per, open(OUT/"per-seed.json","w"), indent=2)
