#!/usr/bin/env python3
"""
measure_pkg_gap_line_a.py — Line A of subagent 03-package-gap.

Sims the four-piece T6 package arm on shredzepelin's real gear THREE ways:
  PKG_PROD    — exact production payload (equipmentForCandidateSwap, sequential,
                dumped once via a tsx script that calls the real exported
                function, then read back here as a fixed items array).
  PKG_FILLER  — flat filler-gem payload (measure_shredzepelin_t6.py's policy),
                cross-check against the already-recorded +80.80.
  PKG_BESTGEMS— T6 package arm with every socket filled with 24028 (Delicate
                Living Ruby, Red +8 agi) — the same gem the baseline actually
                uses in every one of its tier-slot sockets (confirmed via
                combatant_info_events dump: 29100/29096/28741/28545/29966 all
                gems=[24028,...]). None of the four T6 items have a meta
                socket (31048 [4,3], 31042 [3,4,2], 31034 [3], 31044 [3] —
                yellow/blue/red colors only, no color 1), so there is no meta
                to preserve here.

Plus BASE (unmodified gear), guarded against the stored baseline the same way
measure_shredzepelin_t6.py is.

    python .scratch/set-bonus-value/loop-103-106/measure_pkg_gap_line_a.py
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
RAW_FIXTURE = ROOT / "test/fixtures/shredzepelin-cat.raw.json"
SLOTS_TABLE = ROOT / "packages/core/src/slots-table.json"
PROD_PAYLOAD = ROOT / ".scratch/set-bonus-value/loop-103-106/payload-dump.json"
OUT_SCRATCH = ROOT / ".scratch/set-bonus-value/loop-103-106/sims-103-request"
OUT_JSON = ROOT / ".scratch/set-bonus-value/loop-103-106/measurements-line-a.json"

CLI_BINARIES = {"win32-x64": "wowsimcli-windows.exe", "linux-x64": "wowsimcli"}

SEEDS = ("11", "22", "33", "44", "55")
ITERATIONS = 3000

IDX = {"shoulder": 2, "chest": 4, "hands": 6, "legs": 8}
TIER = {"shoulder": 31048, "chest": 31042, "hands": 31034, "legs": 31044}

GUARD_TARGET = 2152.0998
GUARD_TOL = 15.0

FILLER_GEM = 32194
BEST_RED_GEM = 24028  # Delicate Living Ruby — confirmed baseline's actual gem


def resolve_cli() -> Path:
    tag = json.loads(LOCK.read_text(encoding="utf-8"))["tag"]
    platform = "win32-x64" if sys.platform.startswith("win") else "linux-x64"
    return ROOT / "vendor" / f"wowsimcli-{tag}-{platform}" / CLI_BINARIES[platform]


def load_slot_orders() -> tuple[list[str], list[str]]:
    table = json.loads(SLOTS_TABLE.read_text(encoding="utf-8"))
    return list(table["wclOrder"]), list(table["simOrder"])


def wcl_to_item_spec(slot: dict) -> dict:
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
    db = json.loads((ROOT / "vendor/wowsims/db.json").read_text(encoding="utf-8"))
    return {i["id"]: len(i.get("gemSockets") or []) for i in db["items"]}


def build_filler_or_bestgems(
    base_gear: list[dict], sockets: dict[int, int], gem_id: int
) -> list[dict]:
    items = [dict(i) for i in base_gear]
    for slot in ("shoulder", "chest", "hands", "legs"):
        idx = IDX[slot]
        cur = items[idx]
        n = sockets.get(TIER[slot], 0)
        items[idx] = {
            "id": TIER[slot],
            "enchant": cur.get("enchant"),
            "gems": [gem_id] * n,
        }
    return [to_proto_item(i) for i in items]


def build_base(base_gear: list[dict]) -> list[dict]:
    return [to_proto_item(i) for i in base_gear]


def load_prod_package_items() -> list[dict]:
    """Read the production t6Package equipment array dumped by
    dump-payloads.ts (subagent 01), convert each SimItemSpec to the
    wowsimcli proto item shape the same way to_proto_item does."""
    dump = json.loads(PROD_PAYLOAD.read_text(encoding="utf-8"))
    specs = dump["t6Package"]
    return [to_proto_item(s) for s in specs]


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


def sim_items(cli: Path, skeleton: dict, label: str, items: list[dict]) -> dict:
    avgs: list[float] = []
    stdevs: list[float] = []
    print(f"  {label:14s}", end="", flush=True)
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
    mean = statistics.mean(avgs)
    se = statistics.mean(stdevs) / math.sqrt(ITERATIONS)
    print(f"   mean={mean:8.2f}  spread={max(avgs) - min(avgs):5.2f}  SE~={se:5.2f}")
    return {
        "label": label,
        "perSeed": avgs,
        "mean": mean,
        "spreadMaxMin": max(avgs) - min(avgs),
        "meanReportedSe": se,
    }


def main() -> int:
    cli = resolve_cli()
    if not cli.is_file():
        print(f"missing wowsimcli at {cli}", file=sys.stderr)
        return 2
    if not PROD_PAYLOAD.is_file():
        print(f"missing production payload dump at {PROD_PAYLOAD}", file=sys.stderr)
        print("expected subagent 01's dump-payloads.ts output", file=sys.stderr)
        return 2

    base_gear = load_shredzepelin_gear()
    skeleton = json.loads(SKELETON.read_text(encoding="utf-8"))
    sockets = socket_counts()
    version = subprocess.check_output([str(cli), "version"], text=True).strip()
    OUT_SCRATCH.mkdir(parents=True, exist_ok=True)

    print(f"wowsimcli {version}")
    print(f"gear      {RAW_FIXTURE.relative_to(ROOT)} (actor 'shredzepelin')")
    print(f"skeleton  {SKELETON.relative_to(ROOT)}")
    print(f"prodPayload {PROD_PAYLOAD.relative_to(ROOT)}")
    print(f"seeds={list(SEEDS)} iterations={ITERATIONS}")
    print()

    print("=== guard sim: BASE ===")
    base_items = build_base(base_gear)
    arms = {"BASE": sim_items(cli, skeleton, "BASE", base_items)}
    guard = arms["BASE"]["mean"]
    diff = guard - GUARD_TARGET
    if abs(diff) > GUARD_TOL:
        print(
            f"\nGUARD FAILED: BASE mean {guard:.2f} vs target {GUARD_TARGET:.2f} "
            f"(diff {diff:+.2f}, tolerance +/-{GUARD_TOL}).",
            file=sys.stderr,
        )
        return 1
    print(f"  guard OK: {guard:.2f} vs target {GUARD_TARGET:.2f} (diff {diff:+.2f})")
    print()

    print("=== package arms ===")
    arms["PKG_PROD"] = sim_items(cli, skeleton, "PKG_PROD", load_prod_package_items())
    arms["PKG_FILLER"] = sim_items(
        cli,
        skeleton,
        "PKG_FILLER",
        build_filler_or_bestgems(base_gear, sockets, FILLER_GEM),
    )
    arms["PKG_BESTGEMS"] = sim_items(
        cli,
        skeleton,
        "PKG_BESTGEMS",
        build_filler_or_bestgems(base_gear, sockets, BEST_RED_GEM),
    )

    print()
    print("=== deltas vs BASE ===")
    deltas = {}
    for k in ("PKG_PROD", "PKG_FILLER", "PKG_BESTGEMS"):
        d = arms[k]["mean"] - arms["BASE"]["mean"]
        deltas[k] = d
        print(f"  {k:14s} delta = {d:+8.2f} DPS")

    payload = {
        "simVersion": version,
        "gearSource": str(RAW_FIXTURE.relative_to(ROOT)).replace("\\", "/"),
        "skeleton": str(SKELETON.relative_to(ROOT)).replace("\\", "/"),
        "seeds": list(SEEDS),
        "iterations": ITERATIONS,
        "guardTargetDps": GUARD_TARGET,
        "guardToleranceDps": GUARD_TOL,
        "fillerGem": FILLER_GEM,
        "bestRedGem": BEST_RED_GEM,
        "arms": arms,
        "deltasVsBase": deltas,
    }
    OUT_JSON.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print()
    print(f"wrote {OUT_JSON.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
