#!/usr/bin/env python3
"""Sim the corrected-gear arms (subagent 07). argv[1] = 'apl' | 'simplerot'."""
from __future__ import annotations
import json, statistics, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
LOCK = ROOT / "data/wowsims.lock.json"
MODE = sys.argv[1] if len(sys.argv) > 1 else "apl"
SUB = "corrected-arms" if MODE == "apl" else "corrected-arms-simplerot"
REQ_DIR = ROOT / ".scratch/set-bonus-value/loop-103-106" / SUB
OUT = ROOT / ".scratch/set-bonus-value/loop-103-106/sims-07" / MODE
OUT.mkdir(parents=True, exist_ok=True)
SEEDS = ("11", "22", "33", "44", "55")
ITERATIONS = 3000
CLI_BINARIES = {"win32-x64": "wowsimcli-windows.exe", "linux-x64": "wowsimcli"}
TAGS = ("OURS_BASE", "OURS_PKG", "OURS_CURSED", "OURS_VENG",
        "OWNER2_BASE", "OWNER2_PKG", "OWNER2_CURSED", "OWNER2_VENG",
        "OWNER2_BASE_NOAHUNE", "OURS_BASE_NOAHUNE")


def resolve_cli() -> Path:
    tag = json.loads(LOCK.read_text(encoding="utf-8"))["tag"]
    plat = "win32-x64" if sys.platform.startswith("win") else "linux-x64"
    return ROOT / "vendor" / f"wowsimcli-{tag}-{plat}" / CLI_BINARIES[plat]


def run_sim(cli: Path, req: dict, tag: str, seed: str) -> float:
    req = json.loads(json.dumps(req))
    req["simOptions"] = {"iterations": ITERATIONS, "randomSeed": seed,
                         "debugFirstIteration": False}
    rp = OUT / f"{tag}-{seed}.req.json"
    op = OUT / f"{tag}-{seed}.json"
    rp.write_text(json.dumps(req))
    subprocess.run([str(cli), "sim", "--infile", str(rp), "--outfile", str(op)],
                   check=True, capture_output=True)
    return json.loads(op.read_text())["raidMetrics"]["dps"]["avg"]


def main() -> None:
    cli = resolve_cli()
    print(f"MODE={MODE} CLI={cli}")
    per_seed: dict[str, list[float]] = {}
    for tag in TAGS:
        req = json.loads((REQ_DIR / f"{tag}.req.json").read_text())
        vals = [run_sim(cli, req, tag, s) for s in SEEDS]
        per_seed[tag] = vals
        print(f"  {tag:22s}", "  ".join(f"{v:8.2f}" for v in vals),
              f"  mean={statistics.mean(vals):9.2f}", flush=True)
    print()
    m = {t: statistics.mean(v) for t, v in per_seed.items()}
    for side in ("OURS", "OWNER2"):
        b = m[f"{side}_BASE"]
        print(f"  [{side}] baseline         = {b:9.2f}")
        print(f"  [{side}] T6 4pc pkg delta = {m[f'{side}_PKG'] - b:+8.2f}   (ground truth +97)")
        pk = [p - q for p, q in zip(per_seed[f"{side}_PKG"], per_seed[f"{side}_BASE"])]
        print(f"           per-seed {['%.2f' % x for x in pk]}")
        cv = [a - c for a, c in zip(per_seed[f"{side}_CURSED"], per_seed[f"{side}_VENG"])]
        print(f"  [{side}] CURSED - VENG    = {m[f'{side}_CURSED'] - m[f'{side}_VENG']:+8.2f}   (ground truth ~+10)")
        print(f"           per-seed {['%.2f' % x for x in cv]}")
        na = m[f"{side}_BASE_NOAHUNE"]
        print(f"  [{side}] Ahune neck+back worth = {b - na:+8.2f}  (base {b:.2f} vs stripped {na:.2f})")
        print()
    json.dump(per_seed, open(OUT / "per-seed.json", "w"), indent=2)


main()
