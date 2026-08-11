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

ROOT = Path(__file__).resolve().parents[3]
LOCK = ROOT / "data/wowsims.lock.json"
SKELETON = ROOT / "data/presets/feral/p2.raid-sim-skeleton.json"
DB = ROOT / "vendor/wowsims/db.json"
RAW_FIXTURE = ROOT / "test/fixtures/shredzepelin-cat.raw.json"
SLOTS_TABLE = ROOT / "packages/core/src/slots-table.json"
OUT_SCRATCH = ROOT / ".scratch/set-bonus-value/loop-103-106/sims-106-helms"
OUT_JSON = ROOT / ".scratch/set-bonus-value/loop-103-106/measurements-106-helms.json"

CLI_BINARIES = {"win32-x64": "wowsimcli-windows.exe", "linux-x64": "wowsimcli"}

SEEDS = ("11", "22", "33", "44", "55")
ITERATIONS = 3000
ITERATIONS_HI = 20000

# Head is sim-order index 0 (packages/core/src/slots-table.json simOrder).
HEAD_IDX = 0
# Item ids from ticket 106 / 01-payload-dump.md.
CURSED_ID = 32235   # Cursed Vision of Sargeras
VENG_ID = 33672     # Vengeful Gladiator's Dragonhide Helm
# Exact gems + enchant the production equipmentForCandidateSwap payload
# carries for BOTH helm arms per 01-payload-dump.md step 5/8: meta socket
# gem 32409 (Relentless Earthstorm Diamond, active meta) + yellow-socket
# gem 32194 (Delicate Crimson Spinel, red), enchant 3003 carried from the
# worn Wolfshead Helm (8345).
HELM_GEMS = [32409, 32194]
HELM_ENCHANT = 3003

GUARD_TARGET = 2152.0998  # ranking.baseline.dps in shredzepelin-p3.json
GUARD_TOL = 15.0

ARMS = {
    "BASE": None,
    "CURSED": CURSED_ID,
    "VENG": VENG_ID,
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


def build_items(base_gear: list[dict], helm_id: int | None) -> list[dict]:
    items = [dict(i) for i in base_gear]
    if helm_id is not None:
        items[HEAD_IDX] = {
            "id": helm_id,
            "enchant": HELM_ENCHANT,
            "gems": list(HELM_GEMS),
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
    iterations: int,
    tag: str,
) -> dict:
    items = build_items(base_gear, ARMS[label])
    avgs: list[float] = []
    stdevs: list[float] = []
    print(f"  [{tag}] {label:8s}", end="", flush=True)
    for seed in SEEDS:
        req = compose(skeleton, items)
        req["simOptions"] = {
            "iterations": iterations,
            "randomSeed": seed,
            "debugFirstIteration": False,
        }
        result = run_sim(cli, req, OUT_SCRATCH / f"{tag}-{label}-{seed}.json")
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
        "iterations": iterations,
        "perSeed": avgs,
        "mean": mean,
        "spreadMaxMin": max(avgs) - min(avgs),
        "meanReportedSe": se,
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
    print(f"seeds={list(SEEDS)}")
    print(f"helm gems={HELM_GEMS} enchant={HELM_ENCHANT}")
    print()

    print("=== guard sim: shredzepelin's unmodified gear (BASE), 3000 iters ===")
    arms_3k = {"BASE": sim_arm(cli, skeleton, base_gear, "BASE", ITERATIONS, "3k")}
    guard = arms_3k["BASE"]["mean"]
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
    print("=== helm arms, 3000 iters ===")
    for label in ("CURSED", "VENG"):
        arms_3k[label] = sim_arm(cli, skeleton, base_gear, label, ITERATIONS, "3k")

    m3 = {k: v["mean"] for k, v in arms_3k.items()}
    deltas_3k = {k: m3[k] - m3["BASE"] for k in ("CURSED", "VENG")}
    cursed_minus_veng_3k = m3["CURSED"] - m3["VENG"]

    print()
    print("=== deltas vs BASE (3000 iters) ===")
    for k in ("CURSED", "VENG"):
        print(f"  {k:8s} delta = {deltas_3k[k]:+8.2f} DPS")
    print(f"  CURSED - VENG = {cursed_minus_veng_3k:+8.2f} DPS")

    print()
    print("=== high-precision confirmation: CURSED vs VENG, 20000 iters ===")
    arms_20k = {}
    for label in ("CURSED", "VENG"):
        arms_20k[label] = sim_arm(
            cli, skeleton, base_gear, label, ITERATIONS_HI, "20k"
        )
    m20 = {k: v["mean"] for k, v in arms_20k.items()}
    cursed_minus_veng_20k = m20["CURSED"] - m20["VENG"]
    print()
    print("=== CURSED - VENG (20000 iters) ===")
    print(f"  CURSED - VENG = {cursed_minus_veng_20k:+8.2f} DPS")

    payload = {
        "simVersion": version,
        "gearSource": str(RAW_FIXTURE.relative_to(ROOT)).replace("\\", "/"),
        "gearSourceActor": "shredzepelin",
        "skeleton": str(SKELETON.relative_to(ROOT)).replace("\\", "/"),
        "seeds": list(SEEDS),
        "guardTargetDps": GUARD_TARGET,
        "guardToleranceDps": GUARD_TOL,
        "helmGems": HELM_GEMS,
        "helmEnchant": HELM_ENCHANT,
        "cursedId": CURSED_ID,
        "vengId": VENG_ID,
        "arms3k": arms_3k,
        "deltasVsBase3k": deltas_3k,
        "cursedMinusVeng3k": cursed_minus_veng_3k,
        "arms20k": arms_20k,
        "cursedMinusVeng20k": cursed_minus_veng_20k,
    }
    OUT_JSON.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print()
    print(f"wrote {OUT_JSON.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
