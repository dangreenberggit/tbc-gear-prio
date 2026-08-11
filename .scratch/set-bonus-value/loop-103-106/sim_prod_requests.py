#!/usr/bin/env python3
"""Sim the EXACT production request JSONs dumped by dump-requests.ts."""
from __future__ import annotations
import json, statistics, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
LOCK = ROOT / "data/wowsims.lock.json"
REQ_DIR = ROOT / ".scratch/set-bonus-value/loop-103-106/prod-requests"
OUT = ROOT / ".scratch/set-bonus-value/loop-103-106/sims-04"
OUT.mkdir(parents=True, exist_ok=True)
SEEDS = ("11", "22", "33", "44", "55")
ITERATIONS = 3000
CLI_BINARIES = {"win32-x64": "wowsimcli-windows.exe", "linux-x64": "wowsimcli"}


def resolve_cli() -> Path:
    tag = json.loads(LOCK.read_text(encoding="utf-8"))["tag"]
    plat = "win32-x64" if sys.platform.startswith("win") else "linux-x64"
    return ROOT / "vendor" / f"wowsimcli-{tag}-{plat}" / CLI_BINARIES[plat]


def run_sim(cli: Path, req: dict, tag: str, seed: str) -> float:
    req = json.loads(json.dumps(req))
    req["simOptions"] = {
        "iterations": ITERATIONS,
        "randomSeed": seed,
        "debugFirstIteration": False,
    }
    rp = OUT / f"{tag}-{seed}.req.json"
    op = OUT / f"{tag}-{seed}.json"
    rp.write_text(json.dumps(req))
    subprocess.run(
        [str(cli), "sim", "--infile", str(rp), "--outfile", str(op)],
        check=True, capture_output=True,
    )
    res = json.loads(op.read_text())
    return res["raidMetrics"]["dps"]["avg"]


def main() -> None:
    cli = resolve_cli()
    means = {}
    for tag in ("BASE", "CURSED", "VENG"):
        req = json.loads((REQ_DIR / f"{tag}.req.json").read_text())
        vals = [run_sim(cli, req, tag, s) for s in SEEDS]
        means[tag] = statistics.mean(vals)
        print(f"  {tag:8s}", "  ".join(f"{v:8.2f}" for v in vals),
              f"  mean={means[tag]:9.2f}  seed11={vals[0]:9.2f}")
        means[tag + "_seed11"] = vals[0]
    print()
    for tag in ("CURSED", "VENG"):
        print(f"  {tag} delta vs BASE (5-seed mean) = {means[tag]-means['BASE']:+8.2f}")
        print(f"  {tag} delta vs BASE (seed 11 only) = "
              f"{means[tag+'_seed11']-means['BASE_seed11']:+8.2f}")
    print(f"\n  CURSED - VENG (5-seed) = {means['CURSED']-means['VENG']:+8.2f}")


main()
