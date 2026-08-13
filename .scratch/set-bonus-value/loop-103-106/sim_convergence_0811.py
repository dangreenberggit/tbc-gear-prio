#!/usr/bin/env python3
"""Sim the convergence-check arms (2026-08-11).

argv[1] = 'simplerot' (default, owner's TypeSimple, comparable to the owner's
web runs) — the request payloads under convergence-arms-0811/ already carry the
owner's v2 settings + TypeSimple rotation, inherited from OWNER2_BASE.

Seeds [11,22,33,44,55] @ 3000 iterations, pinned CLI from data/wowsims.lock.json.
"""
from __future__ import annotations
import json, statistics, subprocess, sys
from pathlib import Path

ROOT = Path("C:/Users/dgree/Code/lulz/tbc-gear-prio")
LOCK = ROOT / "data/wowsims.lock.json"
REQ_DIR = ROOT / ".scratch/set-bonus-value/loop-103-106/convergence-arms-0811"
OUT = ROOT / ".scratch/set-bonus-value/loop-103-106/sims-convergence-0811"
OUT.mkdir(parents=True, exist_ok=True)
SEEDS = ("11", "22", "33", "44", "55")
ITERATIONS = 3000
CLI_BINARIES = {"win32-x64": "wowsimcli-windows.exe", "linux-x64": "wowsimcli"}
TAGS = ("OWNER2_BASE", "CURSED", "VENG", "BELT100")


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
    print("CLI:", cli, cli.exists(), flush=True)
    per: dict[str, list[float]] = {}
    for tag in TAGS:
        req = json.loads((REQ_DIR / f"{tag}.req.json").read_text())
        vals = [run_sim(cli, req, tag, s) for s in SEEDS]
        per[tag] = vals
        print(f"  {tag:14s}", "  ".join(f"{v:8.2f}" for v in vals),
              f" mean={statistics.mean(vals):9.2f}", flush=True)
    m = {t: statistics.mean(v) for t, v in per.items()}
    print()
    print(f"  baseline            = {m['OWNER2_BASE']:9.2f}")
    print(f"  CURSED - VENG       = {m['CURSED'] - m['VENG']:+8.2f}   (owner web +10.69)")
    cv = [a - b for a, b in zip(per["CURSED"], per["VENG"])]
    print(f"        per-seed {['%.3f' % x for x in cv]}")
    print(f"  CURSED - BASE       = {m['CURSED'] - m['OWNER2_BASE']:+8.2f}")
    print(f"  VENG   - BASE       = {m['VENG'] - m['OWNER2_BASE']:+8.2f}")
    print(f"  BELT100 - BASE      = {m['BELT100'] - m['OWNER2_BASE']:+8.2f}   (prediction)")
    bl = [a - b for a, b in zip(per["BELT100"], per["OWNER2_BASE"])]
    print(f"        per-seed {['%.3f' % x for x in bl]}")
    json.dump(per, open(OUT / "per-seed.json", "w"), indent=2)


main()
