#!/usr/bin/env python3
"""
seed_overlap_probe.py — do wowsimcli seeds that are close together produce
independent runs? Ticket 225, claim C20. **A probe, not a gate** — nothing
here runs under `pnpm verify`.

    python scripts/seed_overlap_probe.py <outdir> <iterations> <seed> [seed ...]

The finding, in one sentence: seeds spaced closer than `iterations` apart
give a sample spread far *smaller* than the sim's own reported standard
error, so they are not independent replicates.

Reproduce C20 with these four runs (each needs the pinned binary):

    python scripts/seed_overlap_probe.py .scratch/seed-probe 5000 11 12 13
    python scripts/seed_overlap_probe.py .scratch/seed-probe 5000 11 100011 2000011 3000011
    python scripts/seed_overlap_probe.py .scratch/seed-probe 3000 11 22 33 44 55
    python scripts/seed_overlap_probe.py .scratch/seed-probe 3000 11 3011 6011 9011 12011

At 5000 iterations, seeds 11/12/13 give a sample sd of ~0.02 DPS while the
mean reported SE is ~1.67; seeds a million apart give ~1.49, which is the
same order as the reported SE. At 3000, DEFAULT_SEEDS (11, 22, 33, 44, 55 —
`rank.ts`) give ~0.19 against a reported SE of ~2.17, and seeds 3000 apart
give ~1.11.

**Why this matters.** `usesPairedReplication` computes the shipped SE from
runs at `DEFAULT_SEEDS`. If those runs share most of their RNG streams, that
SE is measuring seed overlap rather than simulation noise, and it is
optimistic. `docs/verification-log.md` "Stage 1, first sitting" read the
0.099 spread as "seeds barely move the mean"; this probe says the seeds
barely differ. That defect is filed as its own ticket.

**Hypothesis for the mechanism, untested in upstream source:** iteration `i`
seeds from `randomSeed + i`, so two runs whose seeds differ by less than
`iterations` share all but that many streams. This script measures the
symptom; it does not read the generator.

Exit codes: 0 measured, 2 the pinned binary or the fixture is absent.
"""

from __future__ import annotations

import json
import math
import statistics
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCK = ROOT / "data/wowsims.lock.json"
REQUEST = ROOT / "test/fixtures/slamaltman.raid-sim-request.json"
CLI_BINARIES = {"win32-x64": "wowsimcli-windows.exe", "linux-x64": "wowsimcli"}


def resolve_cli() -> Path:
    """Same resolution as scripts/five_seed_spread.py — one pinned binary."""
    tag = json.loads(LOCK.read_text(encoding="utf-8"))["tag"]
    platform = "win32-x64" if sys.platform.startswith("win") else "linux-x64"
    return ROOT / "vendor" / f"wowsimcli-{tag}-{platform}" / CLI_BINARIES[platform]


def run_seed(cli: Path, base: dict, outdir: Path, iterations: int, seed: str):
    request = json.loads(json.dumps(base))
    request["simOptions"] = {"iterations": iterations, "randomSeed": seed}
    infile = outdir / f"probe_{seed}_{iterations}.req.json"
    outfile = outdir / f"probe_{seed}_{iterations}.out.json"
    infile.write_text(json.dumps(request) + "\n", encoding="utf-8")
    proc = subprocess.run(
        [str(cli), "sim", "--infile", str(infile), "--outfile", str(outfile)],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(
            f"wowsimcli exited {proc.returncode}\n"
            f"stdout: {proc.stdout}\nstderr: {proc.stderr}"
        )
    dps = json.loads(outfile.read_text(encoding="utf-8"))["raidMetrics"]["dps"]
    return float(dps["avg"]), float(dps["stdev"]) / math.sqrt(iterations)


def main() -> int:
    if len(sys.argv) < 4:
        print(__doc__.strip().splitlines()[2], file=sys.stderr)
        print(
            "usage: seed_overlap_probe.py <outdir> <iterations> <seed> [seed ...]",
            file=sys.stderr,
        )
        return 2

    outdir = Path(sys.argv[1])
    iterations = int(sys.argv[2])
    seeds = sys.argv[3:]

    cli = resolve_cli()
    if not cli.is_file():
        print(f"missing wowsimcli at {cli}", file=sys.stderr)
        print("fetch: pnpm fetch:wowsimcli", file=sys.stderr)
        return 2
    if not REQUEST.is_file():
        print(f"missing request fixture at {REQUEST}", file=sys.stderr)
        return 2

    outdir.mkdir(parents=True, exist_ok=True)
    base = json.loads(REQUEST.read_text(encoding="utf-8"))

    print(f"fixture {REQUEST.relative_to(ROOT)}  iterations={iterations}")
    averages: list[float] = []
    standard_errors: list[float] = []
    for seed in seeds:
        average, standard_error = run_seed(cli, base, outdir, iterations, seed)
        averages.append(average)
        standard_errors.append(standard_error)
        print(f"  seed={seed:>9}  avg={average:10.4f}  reportedSE={standard_error:7.4f}")

    if len(averages) < 2:
        print("need at least two seeds to report a spread", file=sys.stderr)
        return 2

    sample_sd = statistics.stdev(averages)
    mean_se = statistics.mean(standard_errors)
    print(
        f"spread max-min={max(averages) - min(averages):.4f}  "
        f"sampleSd={sample_sd:.4f}  meanReportedSE={mean_se:.4f}  "
        f"sampleSd/SE={sample_sd / mean_se:.3f}"
    )
    # Not an assertion: seeds spaced >= iterations apart should land near 1.0,
    # and closely spaced seeds far below it. The ratio is the whole finding.
    print(
        "  (ratio near 1.0 = independent runs; far below 1.0 = shared RNG streams)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
