#!/usr/bin/env python3
"""
price_strength.py — cross-check for measure_malorne_4pc.py.

The Malorne (T4) 4pc is +30 Strength (a flat stat bonus, not an aura — see the
threshold probe in measure_malorne_4pc.py: no arm gains an aura over M0). So
its whole value is whatever 30 Strength is worth on this gear.

This prices Strength directly via the request's `bonusStats.stats` vector on
the UNMODIFIED reference set (M2). No item is swapped and the Malorne piece
count never changes, so no set threshold moves — this is the cleanest possible
measurement of the 4pc's mechanism.

Stat index 0 = Strength (data/proto/common.proto).

A large delta (+300 Str) is used so the signal dwarfs the ~3 DPS per-arm SE;
the per-point rate is then scaled back to 30 points. Linearity is checked by
also running +30 and +150.

    python .scratch/set-bonus-value/price_strength.py
"""

from __future__ import annotations

import json
import math
import statistics
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LOCK = ROOT / "data/wowsims.lock.json"
GEAR = ROOT / "vendor/wowsims/feral_p2_9p.gear.json"
SKELETON = ROOT / "data/presets/feral/p2.raid-sim-skeleton.json"
OUT_SCRATCH = ROOT / ".scratch/set-bonus-value/sims-malorne-4pc/strength"
OUT_JSON = ROOT / ".scratch/set-bonus-value/measurements-strength-price-2026-08-10.json"

CLI_BINARIES = {"win32-x64": "wowsimcli-windows.exe", "linux-x64": "wowsimcli"}
SEEDS = ("11", "22", "33", "44", "55")
ITERATIONS = 3000
STRENGTH_IDX = 0
DELTAS = (0, 30, 150, 300)


def resolve_cli() -> Path:
    tag = json.loads(LOCK.read_text(encoding="utf-8"))["tag"]
    platform = "win32-x64" if sys.platform.startswith("win") else "linux-x64"
    return ROOT / "vendor" / f"wowsimcli-{tag}-{platform}" / CLI_BINARIES[platform]


def to_proto_item(spec: dict) -> dict:
    if not spec.get("id"):
        return {}
    out: dict = {"id": spec["id"]}
    if spec.get("enchant"):
        out["enchant"] = spec["enchant"]
    if spec.get("gems"):
        out["gems"] = list(spec["gems"])
    return out


def run_sim(cli: Path, req: dict, outfile: Path) -> dict:
    infile = outfile.with_suffix(".req.json")
    infile.parent.mkdir(parents=True, exist_ok=True)
    infile.write_text(json.dumps(req) + "\n", encoding="utf-8")
    cmd = [str(cli), "sim", "--infile", str(infile), "--outfile", str(outfile)]
    proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"wowsimcli exited {proc.returncode}\n{proc.stdout}\n{proc.stderr}")
    result = json.loads(outfile.read_text(encoding="utf-8"))
    err = result.get("error")
    if isinstance(err, dict) and err.get("type") and err["type"] != "ErrorOutcomeNone":
        raise RuntimeError(f"sim error: {json.dumps(err)}")
    return result


def main() -> int:
    cli = resolve_cli()
    gear = json.loads(GEAR.read_text(encoding="utf-8"))
    skeleton = json.loads(SKELETON.read_text(encoding="utf-8"))
    items = [to_proto_item(i) for i in gear["items"]]
    version = subprocess.check_output([str(cli), "version"], text=True).strip()
    OUT_SCRATCH.mkdir(parents=True, exist_ok=True)

    print(f"wowsimcli {version}  gear={GEAR.name}  seeds={list(SEEDS)} iters={ITERATIONS}")
    print("pricing bonusStats.stats[0] (Strength) on the unmodified M2 reference set")
    print()

    arms = {}
    for d in DELTAS:
        avgs, stdevs = [], []
        print(f"  +{d:3d} Str", end="", flush=True)
        for seed in SEEDS:
            req = json.loads(json.dumps(skeleton))
            req.pop("requestId", None)
            player = req["raid"]["parties"][0]["players"][0]
            player["equipment"] = {"items": items}
            stats = list(player["bonusStats"]["stats"])
            stats[STRENGTH_IDX] += d
            player["bonusStats"]["stats"] = stats
            req["simOptions"] = {
                "iterations": ITERATIONS,
                "randomSeed": seed,
                "debugFirstIteration": False,
            }
            r = run_sim(cli, req, OUT_SCRATCH / f"str{d}-{seed}.json")
            if int(r["iterationsDone"]) != ITERATIONS:
                raise RuntimeError(f"str{d} seed {seed}: short run")
            avgs.append(float(r["raidMetrics"]["dps"]["avg"]))
            stdevs.append(float(r["raidMetrics"]["dps"]["stdev"]))
            print(f" {avgs[-1]:8.2f}", end="", flush=True)
        mean = statistics.mean(avgs)
        se = statistics.mean(stdevs) / math.sqrt(ITERATIONS)
        print(f"   mean={mean:8.2f}  SE~={se:5.2f}")
        arms[d] = {"perSeed": avgs, "mean": mean, "meanReportedSe": se}

    base = arms[0]["mean"]
    print()
    print("=== derived ===")
    derived = {}
    for d in DELTAS[1:]:
        delta = arms[d]["mean"] - base
        per = delta / d
        band = math.sqrt(arms[d]["meanReportedSe"] ** 2 + arms[0]["meanReportedSe"] ** 2)
        derived[d] = {
            "dpsDelta": delta,
            "dpsPerStrength": per,
            "impliedFourPc30Str": per * 30,
            "band1Se": band,
        }
        print(
            f"  +{d:3d} Str -> {delta:7.2f} DPS (+/-{band:.2f})  "
            f"= {per:6.4f} DPS/Str  -> 30 Str = {per * 30:6.2f} DPS"
        )

    OUT_JSON.write_text(
        json.dumps(
            {
                "simVersion": version,
                "gear": str(GEAR.relative_to(ROOT)).replace("\\", "/"),
                "skeleton": str(SKELETON.relative_to(ROOT)).replace("\\", "/"),
                "seeds": list(SEEDS),
                "iterations": ITERATIONS,
                "statIndex": STRENGTH_IDX,
                "arms": {str(k): v for k, v in arms.items()},
                "derived": {str(k): v for k, v in derived.items()},
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"\nwrote {OUT_JSON.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
