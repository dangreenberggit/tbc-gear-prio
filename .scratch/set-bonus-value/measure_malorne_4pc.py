#!/usr/bin/env python3
"""
measure_malorne_4pc.py — follow-up to measure_malorne.py (ticket 92).

Measure the Malorne Harness (T4) 4pc set bonus directly on the same P2 feral
reference set that produced the 2pc figure (B = 131.10 +/- 6.60 DPS).

Reference set: vendor/wowsims/feral_p2_9p.gear.json equips exactly TWO Malorne
pieces as committed (index 2 = 29100 shoulder, index 4 = 29096 chest). The
other two Malorne pieces are 29097 (hands, index 6) and 29099 (legs, index 8);
those slots currently hold non-set items 29947 and 28741.

LADDER — never price a stat swap across a moving threshold.
  M2  as committed                                    -> 2 pieces (2pc live)
  M4  M2 + hands 29097 + legs 29099                   -> 4 pieces (2pc + 4pc)
  M0  shoulder->28755, chest->30730                   -> 0 pieces (no bonus)
  H1  M0 + hands 29097                                -> 1 piece  (no bonus)
  L1  M0 + legs 29099                                 -> 1 piece  (no bonus)

  M4 - M2 crosses ONLY the 4-piece threshold (the 2pc is live on both sides).
  H1 - M0 and L1 - M0 cross NO threshold (0 -> 1 piece), so each is the raw
  stat value of swapping that one item in. Hence:

      B4 = (M4 - M2) - (H1 - M0) - (L1 - M0)

  Error: per-arm SE = reported per-iteration stdev / sqrt(iterations); combine
  the five arms in quadrature (M0 enters with weight 2 -> variance 4x).

    python .scratch/set-bonus-value/measure_malorne_4pc.py
    python .scratch/set-bonus-value/measure_malorne_4pc.py --guard-only
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
OUT_SCRATCH = ROOT / ".scratch/set-bonus-value/sims-malorne-4pc"
OUT_JSON = ROOT / ".scratch/set-bonus-value/measurements-malorne-4pc-2026-08-10.json"

CLI_BINARIES = {"win32-x64": "wowsimcli-windows.exe", "linux-x64": "wowsimcli"}

SEEDS = ("11", "22", "33", "44", "55")
DEFAULT_ITERATIONS = 3000
MALORNE_SET_ID = 640

IDX = {"shoulder": 2, "chest": 4, "hands": 6, "legs": 8}
# What the reference file holds in each of those indices as committed.
COMMITTED = {"shoulder": 29100, "chest": 29096, "hands": 29947, "legs": 28741}
# The Malorne piece for each slot.
TIER = {"shoulder": 29100, "chest": 29096, "hands": 29097, "legs": 29099}
# Verified non-set leather replacements for the two worn Malorne slots.
BSIDE = {"shoulder": 28755, "chest": 30730}

GUARD_LO, GUARD_HI = 1700.0, 2400.0
FILLER_GEM = 24028  # +8 agility, the gem the reference set uses everywhere

# label -> {slot: item id to place}. Anything unlisted stays as committed.
LADDER: dict[str, dict[str, int]] = {
    "M2": {},
    "M4": {"hands": 29097, "legs": 29099},
    "M0": {"shoulder": 28755, "chest": 30730},
    "H1": {"shoulder": 28755, "chest": 30730, "hands": 29097},
    "L1": {"shoulder": 28755, "chest": 30730, "legs": 29099},
}


def resolve_cli() -> Path:
    tag = json.loads(LOCK.read_text(encoding="utf-8"))["tag"]
    platform = "win32-x64" if sys.platform.startswith("win") else "linux-x64"
    return ROOT / "vendor" / f"wowsimcli-{tag}-{platform}" / CLI_BINARIES[platform]


MELEE_STATS = {"17", "18", "20", "21", "0", "1", "2"}
CASTER_STATS = {"3", "4", "5", "6", "7", "8", "9", "10", "11", "12"}


def verify_replacements(items_by_id: dict) -> None:
    """Every non-Malorne item we introduce must be non-set and melee leather."""
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
        stats = so["stats"]
        # 3 = Intellect on the wowsims stat enum; reject caster gear outright.
        if str(stats.get("3", 0)) not in ("0",) and int(stats.get("3", 0)) > 0:
            raise RuntimeError(f"B-side item {iid} ({slot}) carries Intellect: {stats}")
        if not (MELEE_STATS & set(k for k, v in stats.items() if v)):
            raise RuntimeError(f"B-side item {iid} ({slot}) has no melee stats: {stats}")
        print(
            f"  {slot:9s} B-side {iid} {it['name']:38s} ilvl={so['ilvl']} "
            f"armorType={it.get('armorType')} sockets={len(it.get('gemSockets') or [])} "
            f"setName=None setId=None"
        )
        print(f"            stats={stats}")
    for slot in ("hands", "legs"):
        it = items_by_id[TIER[slot]]
        so = it["scalingOptions"]["0"]
        if it.get("setId") != MALORNE_SET_ID:
            raise RuntimeError(f"{TIER[slot]} is not Malorne (setId={it.get('setId')})")
        print(
            f"  {slot:9s} Malorne {TIER[slot]} {it['name']:38s} ilvl={so['ilvl']} "
            f"sockets={len(it.get('gemSockets') or [])} setId={it.get('setId')}"
        )
        print(f"            stats={so['stats']}")


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


def build_items(gear: dict, place: dict[str, int], sockets: dict[int, int]) -> list[dict]:
    items = [dict(i) for i in gear["items"]]
    for slot, new_id in place.items():
        idx = IDX[slot]
        cur = items[idx]
        if cur.get("id") != COMMITTED[slot]:
            raise RuntimeError(
                f"index {idx} holds {cur.get('id')}, expected committed {COMMITTED[slot]}"
            )
        n = sockets.get(new_id, 0)
        items[idx] = {
            "id": new_id,
            "enchant": cur.get("enchant"),
            "gems": [FILLER_GEM] * n,
        }
    return [to_proto_item(i) for i in items]


def malorne_count(gear: dict, place: dict[str, int], items_by_id: dict) -> int:
    items = [dict(i) for i in gear["items"]]
    for slot, new_id in place.items():
        items[IDX[slot]] = {"id": new_id}
    return sum(
        1
        for it in items
        if it.get("id") and items_by_id.get(it["id"], {}).get("setId") == MALORNE_SET_ID
    )


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


def player_metrics(result: dict) -> dict:
    return result["raidMetrics"]["parties"][0]["players"][0]


def _key(idobj: dict) -> str:
    for k in ("spellId", "itemId", "otherId"):
        if idobj.get(k):
            return f"{k}:{idobj[k]}:{idobj.get('tag', 0)}"
    return "unknown"


def _casts(action: dict) -> int:
    return sum(t.get("casts", 0) for t in action.get("targets", []))


# Spell 37311 is the extra Energy resource stream the T4 2pc proc opens; its
# presence/absence is the empirical proof that the 2pc is live in an arm.
TWOPC_ENERGY_SPELL = 37311
SHRED_SPELL = 27002


def threshold_probe(result: dict) -> dict:
    """Empirical evidence of which bonuses are live, per the 2pc run's method."""
    p = player_metrics(result)
    res_keys = sorted(_key(r.get("id", {})) for r in p.get("resources", []))
    aura_keys = sorted(_key(a.get("id", {})) for a in p.get("auras", []))
    shred = next(
        (a for a in p.get("actions", []) if a.get("id", {}).get("spellId") == SHRED_SPELL),
        None,
    )
    energy = {
        _key(r.get("id", {})): r.get("gain")
        for r in p.get("resources", [])
        if r.get("type") == "ResourceTypeEnergy"
    }
    return {
        "resourceStreams": len(p.get("resources", [])),
        "resourceKeys": res_keys,
        "twoPcEnergyStreamPresent": any(
            f"spellId:{TWOPC_ENERGY_SPELL}:" in k for k in res_keys
        ),
        "twoPcEnergyGain": energy.get(f"spellId:{TWOPC_ENERGY_SPELL}:0"),
        "energyStreams": energy,
        "auraCount": len(p.get("auras", [])),
        "auraKeys": aura_keys,
        "shredCasts": _casts(shred) if shred else None,
        "actionCount": len(p.get("actions", [])),
        "actionKeys": sorted(_key(a.get("id", {})) for a in p.get("actions", [])),
    }


def sim_arm(cli, skeleton, gear, label, iterations, sockets, items_by_id) -> dict:
    place = LADDER[label]
    items = build_items(gear, place, sockets)
    count = malorne_count(gear, place, items_by_id)
    avgs: list[float] = []
    stdevs: list[float] = []
    probe: dict = {}
    print(f"  {label:4s} ({count}pc)", end="", flush=True)
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
        if seed == SEEDS[0]:
            probe = threshold_probe(result)
        print(f" {avgs[-1]:8.2f}", end="", flush=True)
    mean = statistics.mean(avgs)
    se = statistics.mean(stdevs) / math.sqrt(iterations)
    print(f"   mean={mean:8.2f}  spread={max(avgs) - min(avgs):5.2f}  SE~={se:5.2f}")
    return {
        "label": label,
        "malornePieces": count,
        "placed": place,
        "perSeed": avgs,
        "mean": mean,
        "spreadMaxMin": max(avgs) - min(avgs),
        "meanReportedSe": se,
        "thresholdProbe": probe,
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
    print("=== reference set: confirm exactly two Malorne pieces as committed ===")
    equipped = [
        (i, it["id"], items_by_id[it["id"]]["name"])
        for i, it in enumerate(gear["items"])
        if it.get("id") and items_by_id.get(it["id"], {}).get("setId") == MALORNE_SET_ID
    ]
    for i, iid, nm in equipped:
        print(f"  index {i}: {iid} {nm} (setId {MALORNE_SET_ID})")
    if len(equipped) != 2:
        print(f"\nABORT: expected 2 Malorne pieces, found {len(equipped)}", file=sys.stderr)
        return 1
    print()
    print("=== replacement verification (non-set / melee, and 4pc pieces) ===")
    verify_replacements(items_by_id)
    print()
    print("=== declared Malorne count per arm ===")
    for label, place in LADDER.items():
        print(f"  {label:4s} -> {malorne_count(gear, place, items_by_id)} pieces  place={place}")
    print()

    print("=== guard sim: unmodified reference set (M2) ===")
    arms = {"M2": sim_arm(cli, skeleton, gear, "M2", iterations, sockets, items_by_id)}
    guard = arms["M2"]["mean"]
    if not (GUARD_LO <= guard <= GUARD_HI):
        print(f"\nGUARD FAILED: M2 mean {guard:.2f} outside band", file=sys.stderr)
        return 1
    print(f"  guard OK: {guard:.2f} within [{GUARD_LO}, {GUARD_HI}]")
    if args.guard_only:
        return 0

    print()
    print("=== ladder ===")
    for label in LADDER:
        if label == "M2":
            continue
        arms[label] = sim_arm(cli, skeleton, gear, label, iterations, sockets, items_by_id)

    m = {k: v["mean"] for k, v in arms.items()}
    stat_hands = m["H1"] - m["M0"]
    stat_legs = m["L1"] - m["M0"]
    gross = m["M4"] - m["M2"]
    b4 = gross - stat_hands - stat_legs

    se = {k: v["meanReportedSe"] for k, v in arms.items()}
    # B4 = M4 - M2 - H1 - L1 + 2*M0
    band = math.sqrt(
        se["M4"] ** 2 + se["M2"] ** 2 + se["H1"] ** 2 + se["L1"] ** 2 + 4 * se["M0"] ** 2
    )

    print()
    print("=== threshold-state verification (seed 11) ===")
    for label in LADDER:
        p = arms[label]["thresholdProbe"]
        print(
            f"  {label:4s} ({arms[label]['malornePieces']}pc) resources={p['resourceStreams']} "
            f"2pcEnergyStream={p['twoPcEnergyStreamPresent']} "
            f"2pcEnergyGain={p['twoPcEnergyGain']} auras={p['auraCount']} "
            f"actions={p['actionCount']} shredCasts={p['shredCasts']}"
        )
    base = set(arms["M0"]["thresholdProbe"]["auraKeys"])
    for label in LADDER:
        if label == "M0":
            continue
        extra = sorted(set(arms[label]["thresholdProbe"]["auraKeys"]) - base)
        print(f"  {label:4s} auras absent from M0: {extra}")

    print()
    print("=== derived ===")
    print(f"  hands 29097 raw stat value (H1 - M0) = {stat_hands:8.2f}")
    print(f"  legs  29099 raw stat value (L1 - M0) = {stat_legs:8.2f}")
    print(f"  gross (M4 - M2)                      = {gross:8.2f}")
    print(f"  B4 = Malorne 4pc                     = {b4:8.2f} DPS +/- ~{band:.2f} (1 SE)")
    print(f"  signal/noise                         = {abs(b4) / band:6.2f} sigma")

    payload = {
        "simVersion": version,
        "gear": str(GEAR.relative_to(ROOT)).replace("\\", "/"),
        "skeleton": str(SKELETON.relative_to(ROOT)).replace("\\", "/"),
        "seeds": list(SEEDS),
        "iterations": iterations,
        "tierItems": TIER,
        "bsideItems": BSIDE,
        "fillerGem": FILLER_GEM,
        "arms": arms,
        "derived": {
            "statValueHands": stat_hands,
            "statValueLegs": stat_legs,
            "gross_M4_minus_M2": gross,
            "malorne_4pc_B4": b4,
        },
        "noiseBand1Se": {"malorne_4pc_B4": band},
    }
    OUT_JSON.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print()
    print(f"wrote {OUT_JSON.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
