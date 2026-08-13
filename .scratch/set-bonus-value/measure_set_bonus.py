#!/usr/bin/env python3
"""
measure_set_bonus.py — ticket 99, Route B.

Measure the Thunderheart (T6) 2pc and 4pc set bonuses in isolation on a fixed
reference gear set, by equipping tier pieces vs matched non-set items in the
same slots and differencing DPS. No baseline character, no broken set on
either side, no `k`, no regression.

Reference set: vendor/wowsims/feral_p3_9p.gear.json (as committed).
Skeleton: data/presets/feral/p2.raid-sim-skeleton.json (the only feral
skeleton committed; cli.ts:282 loads the p2 path for every phase).

    python .scratch/set-bonus-value/measure_set_bonus.py
    python .scratch/set-bonus-value/measure_set_bonus.py --guard-only
"""

from __future__ import annotations

import argparse
import json
import math
import statistics
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LOCK = ROOT / "data/wowsims.lock.json"
GEAR = ROOT / "vendor/wowsims/feral_p3_9p.gear.json"
SKELETON = ROOT / "data/presets/feral/p2.raid-sim-skeleton.json"
DB = ROOT / "vendor/wowsims/db.json"
OUT_SCRATCH = ROOT / ".scratch/set-bonus-value/sims"
OUT_JSON = ROOT / ".scratch/set-bonus-value/measurements-2026-08-10.json"

CLI_BINARIES = {"win32-x64": "wowsimcli-windows.exe", "linux-x64": "wowsimcli"}

SEEDS = ("11", "22", "33", "44", "55")
DEFAULT_ITERATIONS = 3000

# Reference-set array indices for the four tier slots (ticket 99 table).
IDX = {"shoulder": 2, "chest": 4, "hands": 6, "legs": 8}
TIER = {"shoulder": 31048, "chest": 31042, "hands": 31034, "legs": 31044}
BSIDE = {"shoulder": 32377, "chest": 32252, "hands": 32347, "legs": 32271}

# Guard band for a plausible P3 feral (ticket 99 §3).
GUARD_LO, GUARD_HI = 2000.0, 2600.0

# label -> slots replaced with their B-side item
LADDER = {
    "A4": (),
    "A2": ("hands", "legs"),
    "A0": ("shoulder", "chest", "hands", "legs"),
    "S_shoulder": ("shoulder",),
    "S_chest": ("chest",),
    "S_hands": ("hands",),
    "S_legs": ("legs",),
    # Singles measured off the A0 side: three B-side pieces equipped, one tier
    # piece restored. Set count goes 0 -> 1, which crosses no bonus threshold,
    # so these price the raw stat difference alone. The S_* arms above cannot:
    # each drops the set 4 -> 3 and so carries the whole 4pc loss inside it.
    "R_shoulder": ("chest", "hands", "legs"),
    "R_chest": ("shoulder", "hands", "legs"),
    "R_hands": ("shoulder", "chest", "legs"),
    "R_legs": ("shoulder", "chest", "hands"),
}


def resolve_cli() -> Path:
    tag = json.loads(LOCK.read_text(encoding="utf-8"))["tag"]
    platform = "win32-x64" if sys.platform.startswith("win") else "linux-x64"
    return ROOT / "vendor" / f"wowsimcli-{tag}-{platform}" / CLI_BINARIES[platform]


def verify_bside() -> None:
    """Re-verify every B-side item is non-set before it is used (ticket 99 §5)."""
    db = json.loads(DB.read_text(encoding="utf-8"))
    items = {i["id"]: i for i in db["items"]}
    for slot, iid in BSIDE.items():
        it = items.get(iid)
        if it is None:
            raise RuntimeError(f"B-side item {iid} ({slot}) not in db.json")
        if it.get("setId") is not None or it.get("setName") is not None:
            raise RuntimeError(
                f"B-side item {iid} ({slot}) is a set piece: "
                f"setName={it.get('setName')} setId={it.get('setId')}"
            )
        print(
            f"  {slot:9s} B-side {iid} {it['name']} "
            f"ilvl={it['scalingOptions']['0']['ilvl']} setName=None"
        )


def to_proto_item(spec: dict) -> dict:
    """Mirror compose.ts toProtoItem: {} for empty, drop empty gems."""
    if not spec.get("id"):
        return {}
    out: dict = {"id": spec["id"]}
    if spec.get("enchant"):
        out["enchant"] = spec["enchant"]
    gems = spec.get("gems") or []
    if len(gems) > 0:
        out["gems"] = list(gems)
    return out


def socket_counts() -> dict[int, int]:
    db = json.loads(DB.read_text(encoding="utf-8"))
    return {i["id"]: len(i.get("gemSockets") or []) for i in db["items"]}


# The reference set gems every tier socket with 32194 (+8 agility). Leaving a
# B-side socket empty would charge the *gems* to the set bonus, not the item —
# the first run of this script did exactly that and produced negative bonuses.
FILLER_GEM = 32194


def build_items(gear: dict, replace: tuple[str, ...], sockets: dict[int, int]) -> list[dict]:
    items = [dict(i) for i in gear["items"]]
    for slot in replace:
        idx = IDX[slot]
        cur = items[idx]
        if cur.get("id") != TIER[slot]:
            raise RuntimeError(
                f"index {idx} holds {cur.get('id')}, expected tier {TIER[slot]}"
            )
        n = sockets.get(BSIDE[slot], 0)
        items[idx] = {
            "id": BSIDE[slot],
            "enchant": cur.get("enchant"),
            "gems": [FILLER_GEM] * n,
        }
    return [to_proto_item(i) for i in items]


def compose(skeleton: dict, items: list[dict]) -> dict:
    req = json.loads(json.dumps(skeleton))
    req.pop("simOptions", None)
    req.pop("requestId", None)
    player = req["raid"]["parties"][0]["players"][0]
    player["equipment"] = {"items": items}
    return req


def run_sim(cli: Path, req: dict, outfile: Path) -> dict:
    infile = outfile.with_suffix(".req.json")
    infile.parent.mkdir(parents=True, exist_ok=True)
    infile.write_text(json.dumps(req) + "\n", encoding="utf-8")
    cmd = [str(cli), "sim", "--infile", str(infile), "--outfile", str(outfile)]
    proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(
            f"wowsimcli exited {proc.returncode}\ncmd: {' '.join(cmd)}\n"
            f"stdout: {proc.stdout}\nstderr: {proc.stderr}"
        )
    result = json.loads(outfile.read_text(encoding="utf-8"))
    err = result.get("error")
    if isinstance(err, dict) and err.get("type") and err["type"] != "ErrorOutcomeNone":
        raise RuntimeError(f"sim error: {json.dumps(err)}")
    return result


def sim_arm(
    cli: Path,
    skeleton: dict,
    gear: dict,
    label: str,
    iterations: int,
    sockets: dict[int, int],
) -> dict:
    items = build_items(gear, LADDER[label], sockets)
    avgs: list[float] = []
    stdevs: list[float] = []
    print(f"  {label:11s}", end="", flush=True)
    for seed in SEEDS:
        req = compose(skeleton, items)
        req["simOptions"] = {
            "iterations": iterations,
            "randomSeed": seed,
            "debugFirstIteration": False,
        }
        result = run_sim(cli, req, OUT_SCRATCH / f"{label}-{seed}.json")
        done = int(result["iterationsDone"])
        if done != iterations:
            raise RuntimeError(f"{label} seed {seed}: iterationsDone={done}")
        avgs.append(float(result["raidMetrics"]["dps"]["avg"]))
        stdevs.append(float(result["raidMetrics"]["dps"]["stdev"]))
        print(f" {avgs[-1]:8.2f}", end="", flush=True)
    mean = statistics.mean(avgs)
    se = statistics.mean(stdevs) / math.sqrt(iterations)
    print(f"   mean={mean:8.2f}  spread={max(avgs) - min(avgs):5.2f}  SE~={se:5.2f}")
    return {
        "label": label,
        "replaced": list(LADDER[label]),
        "perSeed": avgs,
        "mean": mean,
        "spreadMaxMin": max(avgs) - min(avgs),
        "meanReportedSe": se,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--iterations", type=int, default=DEFAULT_ITERATIONS)
    ap.add_argument("--guard-only", action="store_true")
    args = ap.parse_args()
    iterations = args.iterations

    cli = resolve_cli()
    if not cli.is_file():
        print(f"missing wowsimcli at {cli}", file=sys.stderr)
        print("fetch: pnpm fetch:wowsimcli", file=sys.stderr)
        return 2

    gear = json.loads(GEAR.read_text(encoding="utf-8"))
    skeleton = json.loads(SKELETON.read_text(encoding="utf-8"))
    version = subprocess.check_output([str(cli), "version"], text=True).strip()
    OUT_SCRATCH.mkdir(parents=True, exist_ok=True)

    print(f"wowsimcli {version}")
    print(f"gear      {GEAR.relative_to(ROOT)}")
    print(f"skeleton  {SKELETON.relative_to(ROOT)}")
    print(f"seeds={list(SEEDS)} iterations={iterations}")
    print()
    print("=== B-side set-membership re-verification ===")
    verify_bside()
    sockets = socket_counts()
    print()
    print("=== socket parity (B-side gemmed to its own socket count) ===")
    socket_delta = {}
    for slot in IDX:
        a, b = sockets.get(TIER[slot], 0), sockets.get(BSIDE[slot], 0)
        socket_delta[slot] = b - a
        print(f"  {slot:9s} tier {a} sockets -> B-side {b} sockets ({b - a:+d})")
    print()

    print("=== guard sim: unmodified reference set (A4) ===")
    arms = {"A4": sim_arm(cli, skeleton, gear, "A4", iterations, sockets)}
    guard = arms["A4"]["mean"]
    if not (GUARD_LO <= guard <= GUARD_HI):
        print(
            f"\nGUARD FAILED: A4 mean {guard:.2f} outside [{GUARD_LO},{GUARD_HI}]. "
            "Diagnose gear injection before trusting any ladder result.",
            file=sys.stderr,
        )
        return 1
    print(f"  guard OK: {guard:.2f} within [{GUARD_LO}, {GUARD_HI}]")
    if args.guard_only:
        return 0

    print()
    print("=== ladder ===")
    for label in LADDER:
        if label == "A4":
            continue
        arms[label] = sim_arm(cli, skeleton, gear, label, iterations, sockets)

    m = {k: v["mean"] for k, v in arms.items()}

    # Ticket 99's own `Σ singles` uses S_* (one slot swapped off A4). Each of
    # those drops the set 4 -> 3, so each already contains the entire 4pc loss;
    # summing four double-counts it and drives every increment negative. That
    # is ticket 90's break confound reintroduced by the subtraction shape.
    singles_off_a4 = {s: m["A4"] - m[f"S_{s}"] for s in IDX}

    # Clean stat cost: R_* restores one tier piece onto the all-B-side set
    # (count 0 -> 1), crossing no bonus threshold.
    stat_cost = {s: m[f"R_{s}"] - m["A0"] for s in IDX}

    derived = {
        "singlesOffA4_confounded": singles_off_a4,
        "statCostOffA0": stat_cost,
        "4pc_increment": (m["A4"] - m["A2"])
        - (stat_cost["hands"] + stat_cost["legs"]),
        "2pc_increment": (m["A2"] - m["A0"])
        - (stat_cost["shoulder"] + stat_cost["chest"]),
        "total_set_value": (m["A4"] - m["A0"]) - sum(stat_cost.values()),
    }

    # Noise band: each derived quantity is a sum/difference of independent arm
    # means, so propagate the per-arm SE in quadrature over the arms involved.
    se = {k: v["meanReportedSe"] for k, v in arms.items()}

    def quad(*labels: str) -> float:
        return math.sqrt(sum(se[x] ** 2 for x in labels))

    bands = {
        "4pc_increment": quad("A4", "A2", "A0", "R_hands", "A0", "R_legs"),
        "2pc_increment": quad("A2", "A0", "A0", "R_shoulder", "A0", "R_chest"),
        "total_set_value": quad(
            "A4", "A0", "A0", "R_shoulder", "A0", "R_chest", "A0", "R_hands",
            "A0", "R_legs",
        ),
    }

    print()
    print("=== derived ===")
    for s in IDX:
        print(
            f"  {s:9s} stat cost (clean, off A0) = {stat_cost[s]:7.2f}"
            f"   | off-A4 single (confounded) = {singles_off_a4[s]:7.2f}"
        )
    for k in ("4pc_increment", "2pc_increment", "total_set_value"):
        print(f"  {k:16s} = {derived[k]:8.2f} DPS  +/- ~{bands[k]:.2f} (1 SE)")

    payload = {
        "simVersion": version,
        "gear": str(GEAR.relative_to(ROOT)).replace("\\", "/"),
        "skeleton": str(SKELETON.relative_to(ROOT)).replace("\\", "/"),
        "seeds": list(SEEDS),
        "iterations": iterations,
        "tierItems": TIER,
        "bsideItems": BSIDE,
        "fillerGem": FILLER_GEM,
        "socketDeltaBsideMinusTier": socket_delta,
        "arms": arms,
        "derived": derived,
        "noiseBands1Se": bands,
    }
    OUT_JSON.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print()
    print(f"wrote {OUT_JSON.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
