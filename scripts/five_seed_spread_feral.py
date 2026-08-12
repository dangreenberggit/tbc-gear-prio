#!/usr/bin/env python3
"""
five_seed_spread_feral.py — feral analog of five_seed_spread.py (issue #1 step 0).

Same method as ret's derivation: measure DPS spread on identical logged
feral gear across five independent seeds vs five repeats of one shared
seed. Ret's cutoff (3.4 dps / 0.15%) was derived once on ret and applied to
feral, whose rotation is noisier — this re-derives it on feral's own noise
floor rather than assuming ret's number transfers.

Uses the committed shredzepelin-cat RaidSimRequest fixture (produced by
scripts/compose_feral_raid_sim.py). Only simOptions.iterations / randomSeed
change.

    python scripts/five_seed_spread_feral.py
    python scripts/five_seed_spread_feral.py --iterations 5000
"""

from __future__ import annotations

import argparse
import json
import math
import statistics
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCK = ROOT / "data/wowsims.lock.json"
REQ = ROOT / "test/fixtures/shredzepelin-cat.raid-sim-request.json"
OUT_JSON = ROOT / "docs/five-seed-spread-feral.json"
OUT_SCRATCH = ROOT / ".scratch/phase1-five-seed-feral"

CLI_BINARIES = {
    "win32-x64": "wowsimcli-windows.exe",
    "linux-x64": "wowsimcli",
}

# Five distinct seeds for the independent arm; one seed repeated for shared.
INDEPENDENT_SEEDS = ("11", "22", "33", "44", "55")
SHARED_SEED = "42"
DEFAULT_ITERATIONS = 5000


def resolve_cli() -> Path:
    tag = json.loads(LOCK.read_text(encoding="utf-8"))["tag"]
    platform = "win32-x64" if sys.platform.startswith("win") else "linux-x64"
    binary = CLI_BINARIES[platform]
    return ROOT / "vendor" / f"wowsimcli-{tag}-{platform}" / binary


def run_sim(cli: Path, req: dict, outfile: Path) -> dict:
    infile = outfile.with_suffix(".req.json")
    infile.write_text(json.dumps(req) + "\n", encoding="utf-8")
    cmd = [str(cli), "sim", "--infile", str(infile), "--outfile", str(outfile)]
    proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(
            f"wowsimcli exited {proc.returncode}\n"
            f"stdout: {proc.stdout}\nstderr: {proc.stderr}"
        )
    result = json.loads(outfile.read_text(encoding="utf-8"))
    err = result.get("error")
    if isinstance(err, dict) and err.get("type") and err.get("type") != "ErrorOutcomeNone":
        raise RuntimeError(f"sim error: {json.dumps(err)}")
    return result


def extract_dps(result: dict) -> tuple[float, float, int]:
    dps = result["raidMetrics"]["dps"]
    avg = float(dps["avg"])
    stdev = float(dps["stdev"])
    done = int(result["iterationsDone"])
    return avg, stdev, done


def summarize(avgs: list[float], stdevs: list[float], iterations: int) -> dict:
    spread = max(avgs) - min(avgs)
    sample_sd = statistics.stdev(avgs) if len(avgs) > 1 else 0.0
    # Independent-SE formula the engine will report (PLAN.md §10).
    reported_ses = [s / math.sqrt(iterations) for s in stdevs]
    return {
        "avgs": avgs,
        "meanAvg": statistics.mean(avgs),
        "spreadMaxMin": spread,
        "sampleSdOfAvgs": sample_sd,
        "meanReportedSe": statistics.mean(reported_ses),
        "reportedSes": reported_ses,
    }


def recommend_cutoff(independent: dict, baseline_dps: float) -> dict:
    """Cutoff must sit above the *reported* independent-SE noise floor.

    Same derivation method as ret's (scripts/five_seed_spread.py): 2× the
    mean reported SE, floored at the plan's provisional 3 DPS, one decimal.
    pct stays 0.15% of baseline (the dual threshold) — issue #1 step 0 only
    asked to re-derive the noise floor, not the pct side of the dual gate.
    """
    se = independent["meanReportedSe"]
    floor = se * 2.0
    abs_dps = max(3.0, math.ceil(floor * 10) / 10)  # one decimal
    pct = 0.15
    return {
        "absDps": abs_dps,
        "pct": pct,
        "noiseFloorSe": se,
        "observedMeanSpreadMaxMin": independent["spreadMaxMin"],
        "basis": (
            f"max(3.0, 2× mean reported SE {se:.3f}) → {abs_dps}; "
            f"observed max−min of five means was only "
            f"{independent['spreadMaxMin']:.3f} (not the tie-group scale); "
            f"pct fixed at {pct}% of baseline "
            f"(~{baseline_dps * pct / 100:.2f} DPS at {baseline_dps:.1f})"
        ),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--iterations",
        type=int,
        default=DEFAULT_ITERATIONS,
        help=f"sim iterations (default {DEFAULT_ITERATIONS})",
    )
    args = parser.parse_args()
    iterations = args.iterations

    cli = resolve_cli()
    if not cli.is_file():
        print(f"missing wowsimcli at {cli}", file=sys.stderr)
        print("fetch: pnpm fetch:wowsimcli", file=sys.stderr)
        return 2
    if not REQ.is_file():
        print(f"missing request fixture at {REQ}", file=sys.stderr)
        print("regen: python scripts/compose_feral_raid_sim.py", file=sys.stderr)
        return 2

    base = json.loads(REQ.read_text(encoding="utf-8"))
    version = subprocess.check_output([str(cli), "version"], text=True).strip()
    OUT_SCRATCH.mkdir(parents=True, exist_ok=True)

    print(f"wowsimcli {version}")
    print(f"fixture {REQ.relative_to(ROOT)}")
    print(f"iterations={iterations}")
    print()

    independent_avgs: list[float] = []
    independent_stdevs: list[float] = []
    print("=== independent seeds ===")
    for seed in INDEPENDENT_SEEDS:
        req = json.loads(json.dumps(base))
        req["simOptions"] = {
            "iterations": iterations,
            "randomSeed": seed,
            "debugFirstIteration": False,
        }
        out = OUT_SCRATCH / f"indep-{seed}.json"
        print(f"  seed={seed} …", end="", flush=True)
        result = run_sim(cli, req, out)
        avg, stdev, done = extract_dps(result)
        if done != iterations:
            print(f" iterationsDone={done}, expected {iterations}", file=sys.stderr)
            return 1
        se = stdev / math.sqrt(iterations)
        print(f" avg={avg:.3f}  stdev={stdev:.3f}  SE~={se:.3f}")
        independent_avgs.append(avg)
        independent_stdevs.append(stdev)

    shared_avgs: list[float] = []
    shared_stdevs: list[float] = []
    print()
    print(f"=== shared seed ({SHARED_SEED} × {len(INDEPENDENT_SEEDS)}) ===")
    for i in range(len(INDEPENDENT_SEEDS)):
        req = json.loads(json.dumps(base))
        req["simOptions"] = {
            "iterations": iterations,
            "randomSeed": SHARED_SEED,
            "debugFirstIteration": False,
        }
        out = OUT_SCRATCH / f"shared-{SHARED_SEED}-{i}.json"
        print(f"  run {i + 1}/{len(INDEPENDENT_SEEDS)} …", end="", flush=True)
        result = run_sim(cli, req, out)
        avg, stdev, done = extract_dps(result)
        if done != iterations:
            print(f" iterationsDone={done}, expected {iterations}", file=sys.stderr)
            return 1
        print(f" avg={avg:.3f}  stdev={stdev:.3f}")
        shared_avgs.append(avg)
        shared_stdevs.append(stdev)

    indep = summarize(independent_avgs, independent_stdevs, iterations)
    shared = summarize(shared_avgs, shared_stdevs, iterations)
    cutoff = recommend_cutoff(indep, indep["meanAvg"])

    ratio = (
        indep["spreadMaxMin"] / shared["spreadMaxMin"]
        if shared["spreadMaxMin"] > 0
        else None
    )

    print()
    print("=== summary ===")
    print(
        f"independent  spread(max−min)={indep['spreadMaxMin']:.3f}  "
        f"sd(avgs)={indep['sampleSdOfAvgs']:.3f}  "
        f"mean reported SE={indep['meanReportedSe']:.3f}"
    )
    print(
        f"shared       spread(max−min)={shared['spreadMaxMin']:.3f}  "
        f"sd(avgs)={shared['sampleSdOfAvgs']:.3f}"
    )
    if ratio is not None:
        print(f"spread ratio independent/shared ~ {ratio:.1f}x")
    else:
        print("shared spread is 0 (deterministic given seed)")
    print(f"recommended cutoff: {cutoff['absDps']} DPS or {cutoff['pct']}%")
    print(f"  ({cutoff['basis']})")

    payload = {
        "simVersion": version,
        "fixture": str(REQ.relative_to(ROOT)).replace("\\", "/"),
        "iterations": iterations,
        "independentSeeds": list(INDEPENDENT_SEEDS),
        "sharedSeed": SHARED_SEED,
        "sharedRepeats": len(INDEPENDENT_SEEDS),
        "independent": indep,
        "shared": shared,
        "spreadRatioIndependentOverShared": ratio,
        "recommendedCutoff": cutoff,
        "retReference": {
            "note": "docs/five-seed-spread.json — ret's derivation on the slamaltman fixture",
            "recommendedCutoff": {"absDps": 3.4, "pct": 0.15},
        },
    }
    OUT_JSON.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print()
    print(f"wrote {OUT_JSON.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
