#!/usr/bin/env python3
"""
measure_malorne.py — ticket 92.

Measure the Malorne Harness (T4) 2pc set bonus `B` directly, on the P2 feral
reference set, by differencing sims. Adapted from measure_set_bonus.py
(ticket 99) — same binary resolution, gear injection, socket/gem handling,
seed looping and result parsing.

Reference set: vendor/wowsims/feral_p2_9p.gear.json — equips exactly TWO
Malorne pieces (shoulder 29100, chest 29096), so only the 2pc is live.

Ladder (avoids the threshold-straddling trap):
  M2  = as committed, 2 Malorne pieces, 2pc ACTIVE
  M0  = both replaced with non-set B-side, 0 pieces, no bonus
  R_x = M0 with ONE Malorne piece restored (0 -> 1 piece, crosses NO
        threshold, so the delta is raw stats only)

  stat_x = D(R_x) - D(M0)
  B      = (D(M2) - D(M0)) - (stat_shoulder + stat_chest)

    python .scratch/set-bonus-value/measure_malorne.py
    python .scratch/set-bonus-value/measure_malorne.py --guard-only
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
GEAR = ROOT / "vendor/wowsims/feral_p2_9p.gear.json"
SKELETON = ROOT / "data/presets/feral/p2.raid-sim-skeleton.json"
DB = ROOT / "vendor/wowsims/db.json"
OUT_SCRATCH = ROOT / ".scratch/set-bonus-value/sims-malorne"
OUT_JSON = ROOT / ".scratch/set-bonus-value/measurements-malorne-2026-08-10.json"

CLI_BINARIES = {"win32-x64": "wowsimcli-windows.exe", "linux-x64": "wowsimcli"}

SEEDS = ("11", "22", "33", "44", "55")
DEFAULT_ITERATIONS = 3000

# Reference-set array indices for the two equipped Malorne slots.
IDX = {"shoulder": 2, "chest": 4}
TIER = {"shoulder": 29100, "chest": 29096}
# Non-set leather replacements, socket-count matched (see write-up).
BSIDE = {"shoulder": 28755, "chest": 30730}

# Plausible band for a P2 feral on this reference set.
GUARD_LO, GUARD_HI = 1700.0, 2400.0

# The P2 reference set gems every Malorne socket with 24028 (+8 agility).
# Leaving a B-side socket empty would charge the gems to the set bonus.
FILLER_GEM = 24028

# label -> slots replaced with their B-side item
LADDER = {
    "M2": (),
    "M0": ("shoulder", "chest"),
    "R_shoulder": ("chest",),
    "R_chest": ("shoulder",),
}


def resolve_cli() -> Path:
    tag = json.loads(LOCK.read_text(encoding="utf-8"))["tag"]
    platform = "win32-x64" if sys.platform.startswith("win") else "linux-x64"
    return ROOT / "vendor" / f"wowsimcli-{tag}-{platform}" / CLI_BINARIES[platform]


def verify_bside(items_by_id: dict) -> None:
    """Fail loudly if any chosen B-side item is a set piece."""
    for slot, iid in BSIDE.items():
        it = items_by_id.get(iid)
        if it is None:
            raise RuntimeError(f"B-side item {iid} ({slot}) not in db.json")
        if it.get("setId") is not None or it.get("setName") is not None:
            raise RuntimeError(
                f"B-side item {iid} ({slot}) is a set piece: "
                f"setName={it.get('setName')} setId={it.get('setId')}"
            )
        so = it["scalingOptions"]["0"]
        print(
            f"  {slot:9s} B-side {iid} {it['name']:38s} ilvl={so['ilvl']} "
            f"armorType={it.get('armorType')} sockets={len(it.get('gemSockets') or [])} "
            f"setName=None setId=None"
        )
        print(f"            stats={so['stats']}")


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


def build_items(gear: dict, replace: tuple[str, ...], sockets: dict[int, int]) -> list[dict]:
    items = [dict(i) for i in gear["items"]]
    for slot in replace:
        idx = IDX[slot]
        cur = items[idx]
        if cur.get("id") != TIER[slot]:
            raise RuntimeError(
                f"index {idx} holds {cur.get('id')}, expected Malorne {TIER[slot]}"
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


def sim_arm(cli, skeleton, gear, label, iterations, sockets) -> dict:
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
    db = json.loads(DB.read_text(encoding="utf-8"))
    items_by_id = {i["id"]: i for i in db["items"]}
    sockets = {i["id"]: len(i.get("gemSockets") or []) for i in db["items"]}
    version = subprocess.check_output([str(cli), "version"], text=True).strip()
    OUT_SCRATCH.mkdir(parents=True, exist_ok=True)

    print(f"wowsimcli {version}")
    print(f"gear      {GEAR.relative_to(ROOT)}")
    print(f"skeleton  {SKELETON.relative_to(ROOT)}")
    print(f"seeds={list(SEEDS)} iterations={iterations}")
    print()
    print("=== A-side: confirm exactly two Malorne pieces equipped ===")
    equipped_set = [
        (i, it["id"], items_by_id[it["id"]]["name"])
        for i, it in enumerate(gear["items"])
        if it.get("id") and items_by_id.get(it["id"], {}).get("setId") == 640
    ]
    for i, iid, nm in equipped_set:
        print(f"  index {i}: {iid} {nm} (setId 640)")
    if len(equipped_set) != 2:
        print(
            f"\nABORT: reference set has {len(equipped_set)} Malorne pieces, "
            "expected exactly 2 — the 4pc would confound this ladder.",
            file=sys.stderr,
        )
        return 1
    print()
    print("=== B-side set-membership re-verification ===")
    verify_bside(items_by_id)
    print()
    print("=== socket parity ===")
    socket_delta = {}
    for slot in IDX:
        a, b = sockets.get(TIER[slot], 0), sockets.get(BSIDE[slot], 0)
        socket_delta[slot] = b - a
        sba = [x for x in (items_by_id[TIER[slot]].get("socketBonus") or []) if x]
        sbb = [x for x in (items_by_id[BSIDE[slot]].get("socketBonus") or []) if x]
        print(f"  {slot:9s} Malorne {a} sockets -> B-side {b} sockets ({b - a:+d})")
        print(f"            socketBonus nonzero: Malorne={sba} B-side={sbb}")
    print()

    print("=== guard sim: unmodified reference set (M2) ===")
    arms = {"M2": sim_arm(cli, skeleton, gear, "M2", iterations, sockets)}
    guard = arms["M2"]["mean"]
    if not (GUARD_LO <= guard <= GUARD_HI):
        print(
            f"\nGUARD FAILED: M2 mean {guard:.2f} outside [{GUARD_LO},{GUARD_HI}].",
            file=sys.stderr,
        )
        return 1
    print(f"  guard OK: {guard:.2f} within [{GUARD_LO}, {GUARD_HI}]")
    if args.guard_only:
        return 0

    print()
    print("=== ladder ===")
    for label in LADDER:
        if label == "M2":
            continue
        arms[label] = sim_arm(cli, skeleton, gear, label, iterations, sockets)

    m = {k: v["mean"] for k, v in arms.items()}
    stat_cost = {s: m[f"R_{s}"] - m["M0"] for s in IDX}
    gross = m["M2"] - m["M0"]
    B = gross - sum(stat_cost.values())

    se = {k: v["meanReportedSe"] for k, v in arms.items()}

    def quad(*labels: str) -> float:
        return math.sqrt(sum(se[x] ** 2 for x in labels))

    # B = M2 - M0 - (R_sh - M0) - (R_ch - M0) = M2 + M0 - R_sh - R_ch
    band = quad("M2", "M0", "R_shoulder", "R_chest")

    print()
    print("=== derived ===")
    for s in IDX:
        print(f"  {s:9s} clean stat cost (off M0) = {stat_cost[s]:7.2f}")
    print(f"  gross (M2 - M0)                = {gross:7.2f}")
    print(f"  B = Malorne 2pc                = {B:7.2f} DPS  +/- ~{band:.2f} (1 SE)")
    print(f"  signal/noise                   = {abs(B) / band:5.2f} sigma")

    payload = {
        "simVersion": version,
        "gear": str(GEAR.relative_to(ROOT)).replace("\\", "/"),
        "skeleton": str(SKELETON.relative_to(ROOT)).replace("\\", "/"),
        "seeds": list(SEEDS),
        "iterations": iterations,
        "malorneItems": TIER,
        "bsideItems": BSIDE,
        "fillerGem": FILLER_GEM,
        "socketDeltaBsideMinusTier": socket_delta,
        "arms": arms,
        "derived": {
            "statCostOffM0": stat_cost,
            "gross_M2_minus_M0": gross,
            "malorne_2pc_B": B,
        },
        "noiseBand1Se": {"malorne_2pc_B": band},
    }
    OUT_JSON.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print()
    print(f"wrote {OUT_JSON.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
