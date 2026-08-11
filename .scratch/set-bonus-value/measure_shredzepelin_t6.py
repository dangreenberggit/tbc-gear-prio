#!/usr/bin/env python3
"""
measure_shredzepelin_t6.py — bounded measurement, no judgment.

Substitute the four Thunderheart (T6) pieces onto shredzepelin's ACTUAL
current gear (as recorded in the offline GearSource fixture
test/fixtures/shredzepelin-cat.raw.json, the same fixture cli.ts loads for
this character — see cli.ts:340) and measure the DPS delta of the all-four
swap plus each of the four single swaps, mirroring the conventions of the
already-validated measure_set_bonus.py (resolve_cli, to_proto_item, compose,
run_sim, FILLER_GEM socket parity, seeds, iterations, mean/SE).

    python .scratch/set-bonus-value/measure_shredzepelin_t6.py
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
SKELETON = ROOT / "data/presets/feral/p2.raid-sim-skeleton.json"
DB = ROOT / "vendor/wowsims/db.json"
RAW_FIXTURE = ROOT / "test/fixtures/shredzepelin-cat.raw.json"
SLOTS_TABLE = ROOT / "packages/core/src/slots-table.json"
OUT_SCRATCH = ROOT / ".scratch/set-bonus-value/sims-shredz-t6"
OUT_JSON = ROOT / ".scratch/set-bonus-value/measurements-shredz-t6-2026-08-10.json"

CLI_BINARIES = {"win32-x64": "wowsimcli-windows.exe", "linux-x64": "wowsimcli"}

SEEDS = ("11", "22", "33", "44", "55")
ITERATIONS = 3000

# Sim-order indices for the four tier slots (packages/core/src/slots-table.json
# simOrder), matching measure_set_bonus.py's IDX table.
IDX = {"shoulder": 2, "chest": 4, "hands": 6, "legs": 8}
TIER = {"shoulder": 31048, "chest": 31042, "hands": 31034, "legs": 31044}

GUARD_TARGET = 2152.0998  # ranking.baseline.dps in shredzepelin-p3.json
GUARD_TOL = 15.0

FILLER_GEM = 32194

ARMS = {
    "BASE": (),
    "T6_ALL": ("shoulder", "chest", "hands", "legs"),
    "T6_shoulder": ("shoulder",),
    "T6_chest": ("chest",),
    "T6_hands": ("hands",),
    "T6_legs": ("legs",),
}


def resolve_cli() -> Path:
    tag = json.loads(LOCK.read_text(encoding="utf-8"))["tag"]
    platform = "win32-x64" if sys.platform.startswith("win") else "linux-x64"
    return ROOT / "vendor" / f"wowsimcli-{tag}-{platform}" / CLI_BINARIES[platform]


def load_slot_orders() -> tuple[list[str], list[str]]:
    table = json.loads(SLOTS_TABLE.read_text(encoding="utf-8"))
    return list(table["wclOrder"]), list(table["simOrder"])


def wcl_to_item_spec(slot: dict) -> dict:
    """Mirror packages/core/src/slots.ts toItemSpec."""
    iid = slot.get("id") or 0
    if not iid:
        return {"gems": []}
    gems = [
        g.get("id")
        for g in (slot.get("gems") or [])
        if g and isinstance(g.get("id"), int) and g.get("id", 0) > 0
    ]
    out = {"id": iid, "gems": gems}
    ench = slot.get("permanentEnchant")
    if ench:
        out["enchant"] = ench
    return out


def map_wcl_gear_to_sim(wcl_gear: list[dict]) -> list[dict]:
    """Mirror packages/core/src/slots.ts mapWclGearToSim / scripts/slots.py."""
    wcl_order, sim_order = load_slot_orders()
    if len(wcl_gear) != len(wcl_order):
        raise ValueError(
            f"expected {len(wcl_order)} WCL gear slots, got {len(wcl_gear)}"
        )

    by_slot: dict[str, dict] = {}
    for idx, name in enumerate(wcl_order):
        if name in ("SHIRT", "TABARD"):
            continue
        by_slot[name] = wcl_to_item_spec(wcl_gear[idx])

    items = [by_slot[name] for name in sim_order]

    expected_ids = []
    for name in sim_order:
        wcl_idx = wcl_order.index(name)
        expected_ids.append(wcl_gear[wcl_idx].get("id") or 0)
    got_ids = [item.get("id") or 0 for item in items]
    if got_ids != expected_ids:
        raise AssertionError(
            f"slot map round-trip failed:\n  got {got_ids}\n  expected {expected_ids}"
        )
    return items


def load_shredzepelin_gear() -> list[dict]:
    raw = json.loads(RAW_FIXTURE.read_text(encoding="utf-8"))
    actors = {a["id"]: a for a in raw["actors"]}
    for ev in raw["combatant_info_events"]:
        actor = actors.get(ev["sourceID"])
        if actor and actor["name"].lower() == "shredzepelin":
            return map_wcl_gear_to_sim(ev["gear"])
    raise RuntimeError("shredzepelin not found in raw fixture combatant_info_events")


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


def item_names() -> dict[int, str]:
    db = json.loads(DB.read_text(encoding="utf-8"))
    return {i["id"]: i["name"] for i in db["items"]}


def build_items(
    base_gear: list[dict], substitute: tuple[str, ...], sockets: dict[int, int]
) -> list[dict]:
    items = [dict(i) for i in base_gear]
    for slot in substitute:
        idx = IDX[slot]
        cur = items[idx]
        n = sockets.get(TIER[slot], 0)
        items[idx] = {
            "id": TIER[slot],
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
    base_gear: list[dict],
    label: str,
    sockets: dict[int, int],
) -> dict:
    items = build_items(base_gear, ARMS[label], sockets)
    avgs: list[float] = []
    stdevs: list[float] = []
    resources_len: int | None = None
    print(f"  {label:12s}", end="", flush=True)
    for seed in SEEDS:
        req = compose(skeleton, items)
        req["simOptions"] = {
            "iterations": ITERATIONS,
            "randomSeed": seed,
            "debugFirstIteration": False,
        }
        result = run_sim(cli, req, OUT_SCRATCH / f"{label}-{seed}.json")
        done = int(result["iterationsDone"])
        if done != ITERATIONS:
            raise RuntimeError(f"{label} seed {seed}: iterationsDone={done}")
        avgs.append(float(result["raidMetrics"]["dps"]["avg"]))
        stdevs.append(float(result["raidMetrics"]["dps"]["stdev"]))
        print(f" {avgs[-1]:8.2f}", end="", flush=True)
        if resources_len is None:
            try:
                party = result["raidMetrics"]["parties"][0]
                player = party["players"][0]
                resources_len = len(player.get("resources") or [])
            except (KeyError, IndexError, TypeError):
                resources_len = -1
    mean = statistics.mean(avgs)
    se = statistics.mean(stdevs) / math.sqrt(ITERATIONS)
    print(f"   mean={mean:8.2f}  spread={max(avgs) - min(avgs):5.2f}  SE~={se:5.2f}")
    return {
        "label": label,
        "substituted": list(ARMS[label]),
        "perSeed": avgs,
        "mean": mean,
        "spreadMaxMin": max(avgs) - min(avgs),
        "meanReportedSe": se,
        "resourcesLenSeed0": resources_len,
    }


def main() -> int:
    cli = resolve_cli()
    if not cli.is_file():
        print(f"missing wowsimcli at {cli}", file=sys.stderr)
        print("fetch: pnpm fetch:wowsimcli", file=sys.stderr)
        return 2

    base_gear = load_shredzepelin_gear()
    skeleton = json.loads(SKELETON.read_text(encoding="utf-8"))
    version = subprocess.check_output([str(cli), "version"], text=True).strip()
    OUT_SCRATCH.mkdir(parents=True, exist_ok=True)

    print(f"wowsimcli {version}")
    print(f"gear      {RAW_FIXTURE.relative_to(ROOT)} (actor 'shredzepelin')")
    print(f"skeleton  {SKELETON.relative_to(ROOT)}")
    print(f"seeds={list(SEEDS)} iterations={ITERATIONS}")
    print()

    names = item_names()
    sockets = socket_counts()
    worn_ids = {slot: base_gear[idx].get("id") or 0 for slot, idx in IDX.items()}
    print("=== worn items in the four tier slots (BASE) ===")
    socket_delta = {}
    for slot in IDX:
        worn = worn_ids[slot]
        worn_name = names.get(worn, "?")
        worn_sockets = sockets.get(worn, 0)
        tier_sockets = sockets.get(TIER[slot], 0)
        socket_delta[slot] = tier_sockets - worn_sockets
        print(
            f"  {slot:9s} worn {worn} {worn_name} ({worn_sockets} sockets) "
            f"-> T6 {TIER[slot]} {names.get(TIER[slot], '?')} "
            f"({tier_sockets} sockets, {tier_sockets - worn_sockets:+d})"
        )
    print()

    print("=== guard sim: shredzepelin's unmodified gear (BASE) ===")
    arms = {"BASE": sim_arm(cli, skeleton, base_gear, "BASE", sockets)}
    guard = arms["BASE"]["mean"]
    diff = guard - GUARD_TARGET
    if abs(diff) > GUARD_TOL:
        print(
            f"\nGUARD FAILED: BASE mean {guard:.2f} vs target {GUARD_TARGET:.2f} "
            f"(diff {diff:+.2f}, tolerance +/-{GUARD_TOL}). "
            "Could not reconstruct shredzepelin's baseline gear from "
            f"{RAW_FIXTURE.relative_to(ROOT)}.",
            file=sys.stderr,
        )
        return 1
    print(f"  guard OK: {guard:.2f} vs target {GUARD_TARGET:.2f} (diff {diff:+.2f})")

    print()
    print("=== T6 substitution arms ===")
    for label in ARMS:
        if label == "BASE":
            continue
        arms[label] = sim_arm(cli, skeleton, base_gear, label, sockets)

    m = {k: v["mean"] for k, v in arms.items()}
    deltas = {k: m[k] - m["BASE"] for k in ARMS if k != "BASE"}
    sum_singles = sum(
        deltas[f"T6_{s}"] for s in ("shoulder", "chest", "hands", "legs")
    )

    print()
    print("=== deltas vs BASE ===")
    for k in ARMS:
        if k == "BASE":
            continue
        print(f"  {k:12s} delta = {deltas[k]:+8.2f} DPS")
    print(f"  {'sum of singles':12s}       = {sum_singles:+8.2f} DPS")
    print(f"  {'T6_ALL':12s} delta       = {deltas['T6_ALL']:+8.2f} DPS")

    print()
    print("=== resources array length (empirical set-bonus-threshold check) ===")
    for label in ("BASE", "T6_ALL"):
        print(f"  {label:12s} resources[len]={arms[label]['resourcesLenSeed0']}")

    payload = {
        "simVersion": version,
        "gearSource": str(RAW_FIXTURE.relative_to(ROOT)).replace("\\", "/"),
        "gearSourceActor": "shredzepelin",
        "skeleton": str(SKELETON.relative_to(ROOT)).replace("\\", "/"),
        "seeds": list(SEEDS),
        "iterations": ITERATIONS,
        "guardTargetDps": GUARD_TARGET,
        "guardToleranceDps": GUARD_TOL,
        "wornItemIds": worn_ids,
        "tierItems": TIER,
        "fillerGem": FILLER_GEM,
        "socketDeltaTierMinusWorn": socket_delta,
        "arms": arms,
        "deltasVsBase": deltas,
        "sumOfSingles": sum_singles,
    }
    OUT_JSON.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print()
    print(f"wrote {OUT_JSON.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
