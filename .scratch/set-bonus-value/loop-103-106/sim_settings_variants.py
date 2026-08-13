#!/usr/bin/env python3
"""Sim baseline variants (subagent 10). Pinned CLI, seeds [11,22,33,44,55], 3000 iters."""
from __future__ import annotations
import json, statistics, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
LOCK = ROOT / "data/wowsims.lock.json"
REQ_DIR = ROOT / ".scratch/set-bonus-value/loop-103-106/base-variants2"
OUT = ROOT / ".scratch/set-bonus-value/loop-103-106/sims-10/settings"
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
    tags = sorted(p.stem.replace(".req", "") for p in REQ_DIR.glob("*.req.json"))
    print(f"CLI={cli}")
    per_seed: dict[str, list[float]] = {}
    for tag in tags:
        req = json.loads((REQ_DIR / f"{tag}.req.json").read_text())
        vals = [run_sim(cli, req, tag, s) for s in SEEDS]
        per_seed[tag] = vals
        print(f"  {tag:22s}", "  ".join(f"{v:8.2f}" for v in vals),
              f"  mean={statistics.mean(vals):9.2f}", flush=True)
    print()
    m = {t: statistics.mean(v) for t, v in per_seed.items()}
    b = m["C0_BASE"]
    print(f"  B0_BASE = {b:9.2f}   (07/08 measured 2219.82)")
    for t in tags:
        if t == "C0_BASE":
            continue
        d = [p - q for p, q in zip(per_seed[t], per_seed["C0_BASE"])]
        print(f"  {t:22s} delta vs B0 = {m[t]-b:+8.2f}   per-seed {['%.2f' % x for x in d]}")
    json.dump(per_seed, open(OUT / "per-seed.json", "w"), indent=2)


main()
