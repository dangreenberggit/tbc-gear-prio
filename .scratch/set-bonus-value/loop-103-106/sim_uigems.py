#!/usr/bin/env python3
"""Sim the UI-gem-semantics arms (subagent 08). argv[1] = 'simplerot' | 'apl'."""
from __future__ import annotations
import json, statistics, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
LOCK = ROOT / "data/wowsims.lock.json"
MODE = sys.argv[1] if len(sys.argv) > 1 else "simplerot"
SUB = "uigems-arms" if MODE == "apl" else "uigems-arms-simplerot"
REQ_DIR = ROOT / ".scratch/set-bonus-value/loop-103-106" / SUB
OUT = ROOT / ".scratch/set-bonus-value/loop-103-106/sims-08" / MODE
OUT.mkdir(parents=True, exist_ok=True)
SEEDS = ("11", "22", "33", "44", "55")
ITERATIONS = 3000
CLI_BINARIES = {"win32-x64": "wowsimcli-windows.exe", "linux-x64": "wowsimcli"}
TAGS = ("OWNER2_BASE", "PKG_PROD", "PKG_UIMIGRATE",
        "PKG_UIONLY_shoulder", "PKG_UIONLY_chest",
        "PKG_UIONLY_hands", "PKG_UIONLY_legs")


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
    b = m["OWNER2_BASE"]
    print(f"  baseline = {b:9.2f}   (07 measured 2219.82 under simplerot)")
    for t in TAGS[1:]:
        d = [p - q for p, q in zip(per_seed[t], per_seed["OWNER2_BASE"])]
        print(f"  {t:22s} delta = {m[t]-b:+8.2f}   per-seed {['%.2f' % x for x in d]}")
    print()
    print(f"  PKG_UIMIGRATE - PKG_PROD = {m['PKG_UIMIGRATE']-m['PKG_PROD']:+8.2f}"
          f"   (residue to explain: -16.42)")
    json.dump(per_seed, open(OUT / "per-seed.json", "w"), indent=2)


main()
