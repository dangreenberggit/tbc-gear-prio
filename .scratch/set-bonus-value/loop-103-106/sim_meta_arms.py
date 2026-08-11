#!/usr/bin/env python3
"""Subagent 05: sim BASE + the three controlled meta arms, 5 seeds x 3000 iters."""
from __future__ import annotations
import json, statistics, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
LOCK = ROOT / "data/wowsims.lock.json"
PROD = ROOT / ".scratch/set-bonus-value/loop-103-106/prod-requests"
ARMS = ROOT / ".scratch/set-bonus-value/loop-103-106/meta-arms"
OUT = ROOT / ".scratch/set-bonus-value/loop-103-106/sims-05"
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
    return json.loads(op.read_text())["raidMetrics"]["dps"]["avg"]


def main() -> None:
    cli = resolve_cli()
    srcs = {
        "BASE": PROD / "BASE.req.json",
        "META_ACTIVE": ARMS / "META_ACTIVE.req.json",
        "META_DEAD": ARMS / "META_DEAD.req.json",
        "NO_META": ARMS / "NO_META.req.json",
    }
    res = {}
    for tag, path in srcs.items():
        req = json.loads(path.read_text())
        vals = [run_sim(cli, req, tag, s) for s in SEEDS]
        res[tag] = vals
        print(f"  {tag:12s}", "  ".join(f"{v:8.2f}" for v in vals),
              f"  mean={statistics.mean(vals):9.2f}  seed11={vals[0]:9.2f}")

    b_mean = statistics.mean(res["BASE"])
    b_11 = res["BASE"][0]
    print()
    for tag in ("META_ACTIVE", "META_DEAD", "NO_META"):
        m = statistics.mean(res[tag])
        print(f"  {tag:12s} delta vs BASE: 5-seed mean {m-b_mean:+8.2f}   "
              f"seed11 {res[tag][0]-b_11:+8.2f}")
    print()
    ma = statistics.mean(res["META_ACTIVE"])
    md = statistics.mean(res["META_DEAD"])
    nm = statistics.mean(res["NO_META"])
    print(f"  META_ACTIVE - META_DEAD (5-seed) = {ma-md:+8.2f}   "
          "(conditional meta bonus MINUS recolouring cost)")
    print(f"  META_ACTIVE - NO_META    (5-seed) = {ma-nm:+8.2f}   "
          "(whole meta-gem decision vs best ordinary red)")
    print(f"  META_DEAD   - NO_META    (5-seed) = {md-nm:+8.2f}   "
          "(dead meta's own unconditional stats vs 32194)")
    print()
    print("  paired per-seed META_ACTIVE - META_DEAD:",
          "  ".join(f"{a-d:+7.2f}" for a, d in
                   zip(res["META_ACTIVE"], res["META_DEAD"])))
    print("  paired per-seed META_ACTIVE - NO_META   :",
          "  ".join(f"{a-n:+7.2f}" for a, n in
                   zip(res["META_ACTIVE"], res["NO_META"])))


main()
