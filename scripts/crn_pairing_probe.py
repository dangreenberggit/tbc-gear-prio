#!/usr/bin/env python3
"""
crn_pairing_probe.py — does common-random-numbers pairing shrink the SE of a
gear-swap delta? Ticket 225 Q1, claim C22. **A probe, not a gate** — nothing
here runs under `pnpm verify`.

    python scripts/crn_pairing_probe.py <outdir> <iterations> <candidateItemId> <equipmentIndex>

Common random numbers is the standard variance-reduction trick for comparing
two configurations: run baseline and candidate on the *same* seed so shared
randomness cancels in the difference. If it worked here, the paired standard
deviation of the delta would fall well below the unpaired one, and the
cutoff could sit closer to the noise floor.

Reproduce C22 (each needs the pinned binary):

    python scripts/crn_pairing_probe.py .scratch/crn-probe 3000 28034 13
    python scripts/crn_pairing_probe.py .scratch/crn-probe 3000 29379 11

The first swaps trinket 29383 (Bloodlust Brooch) for 28034 (Hourglass of the
Unraveller); the second swaps a ring for 29379. Measured: paired sd 3.372 vs
unpaired 2.930 on the trinket, 2.627 vs 2.930 on the ring, against a
sqrt(2)*SE of ~3.03. No reduction — the RNG stream desyncs as soon as the
stats change, so "same seed" stops meaning "same fight" after the first
divergent roll.

**Read this before quoting the unpaired number.** The unpaired comparator is
a *rotation* of the same 16 runs (candidate seed i against baseline seed
i+1), not a fresh independent sample. That reuses the same run-to-run
variation on both sides, which biases the comparison *towards* finding
pairing helpful — so it is the conservative direction for the conclusion
"pairing does not help", and a real independent arm would only widen the
gap. Power is low either way: n=8 seeds.

Seeds are spaced a million apart because closely spaced seeds share RNG
streams and would understate every spread here — see
`scripts/seed_overlap_probe.py` and ticket 225 C20/C21.

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
# Spaced >= any iteration count used here, so each run is independent (C20).
SEEDS = [11, 100011, 2000011, 3000011, 4000011, 5000011, 6000011, 7000011]


def resolve_cli() -> Path:
    """Same resolution as scripts/five_seed_spread.py — one pinned binary."""
    tag = json.loads(LOCK.read_text(encoding="utf-8"))["tag"]
    platform = "win32-x64" if sys.platform.startswith("win") else "linux-x64"
    return ROOT / "vendor" / f"wowsimcli-{tag}-{platform}" / CLI_BINARIES[platform]


def run(cli: Path, request: dict, outdir: Path, tag: str, iterations: int):
    infile = outdir / f"crn_{tag}.req.json"
    outfile = outdir / f"crn_{tag}.out.json"
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
    if len(sys.argv) != 5:
        print(
            "usage: crn_pairing_probe.py <outdir> <iterations> "
            "<candidateItemId> <equipmentIndex>",
            file=sys.stderr,
        )
        return 2

    outdir = Path(sys.argv[1])
    iterations = int(sys.argv[2])
    candidate_id = int(sys.argv[3])
    equipment_index = int(sys.argv[4])

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

    baselines: list[tuple[float, float]] = []
    candidates: list[tuple[float, float]] = []
    for seed in SEEDS:
        baseline_request = json.loads(json.dumps(base))
        baseline_request["simOptions"] = {
            "iterations": iterations,
            "randomSeed": str(seed),
        }
        candidate_request = json.loads(json.dumps(baseline_request))
        items = candidate_request["raid"]["parties"][0]["players"][0]["equipment"][
            "items"
        ]
        items[equipment_index]["id"] = candidate_id
        baselines.append(run(cli, baseline_request, outdir, f"b{seed}_{iterations}", iterations))
        candidates.append(run(cli, candidate_request, outdir, f"c{seed}_{iterations}", iterations))

    print(
        f"iterations={iterations} candidate={candidate_id} "
        f"equipmentIndex={equipment_index} seeds={len(SEEDS)}"
    )
    print(f"  baseline avgs  {[round(b[0], 3) for b in baselines]}")
    print(f"  candidate avgs {[round(c[0], 3) for c in candidates]}")

    paired = [c[0] - b[0] for b, c in zip(baselines, candidates)]
    print(f"  paired deltas  {[round(d, 3) for d in paired]}")
    print(
        f"paired (same seed both sides): mean={statistics.mean(paired):.3f} "
        f"sd={statistics.stdev(paired):.3f}"
    )

    # Rotation, not an independent sample — see the module docstring.
    rotated = [
        candidates[i][0] - baselines[(i + 1) % len(baselines)][0]
        for i in range(len(baselines))
    ]
    print(
        f"unpaired (rotated comparator): mean={statistics.mean(rotated):.3f} "
        f"sd={statistics.stdev(rotated):.3f}"
    )

    mean_se = statistics.mean(b[1] for b in baselines)
    print(
        f"reported single-run SE={mean_se:.3f}  "
        f"sqrt(2)*SE={math.sqrt(2) * mean_se:.3f}  "
        f"(pairing helps only if paired sd is well below the unpaired sd)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
