#!/usr/bin/env python3
"""
compose_slamaltman_raid_sim.py — Phase 0 Box 1.

Hand-compose a RaidSimRequest from slamaltman's logged CombatantInfo gear,
run it through the pinned wowsimcli, and write request/result fixtures.

The skeleton (buffs, talents, consumes, encounter, rotation) comes from a
wowsims CLI export of the stock ret P2 preset — that is a RaidSimRequest.
We only replace equipment (+ assumed race). We do NOT start from the
decodelink IndividualSimSettings output; those are different protobuf
messages (PLAN.md §8.2).

Slot mapping is drop-and-reorder (PLAN.md §8.4). Ported from
scripts/verify_fixture.py — do not invent a filter-only path here.

    python scripts/compose_slamaltman_raid_sim.py
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "test/fixtures/slamaltman.raw.json"
SKELETON = ROOT / "test/fixtures/ret-p2.raid-sim-skeleton.json"
CLI = ROOT / "vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe"
OUT_REQ = ROOT / "test/fixtures/slamaltman.raid-sim-request.json"
OUT_RES = ROOT / "test/fixtures/slamaltman.raid-sim-result.json"

# WCL client order (19). Indices 3 and 18 are shirt/tabard — dropped.
WCL_ORDER = [
    "head",
    "neck",
    "shoulder",
    "SHIRT",
    "chest",
    "waist",
    "legs",
    "feet",
    "wrist",
    "hands",
    "finger1",
    "finger2",
    "trinket1",
    "trinket2",
    "back",
    "mainhand",
    "offhand",
    "ranged",
    "TABARD",
]

# Sim equipment order (17). Not WCL order — back is the famous reordering.
SIM_ORDER = [
    "head",
    "neck",
    "shoulder",
    "back",
    "chest",
    "wrist",
    "hands",
    "waist",
    "legs",
    "feet",
    "finger1",
    "finger2",
    "trinket1",
    "trinket2",
    "mainhand",
    "offhand",
    "ranged",
]

# Probe knobs — enough for a plausible DPS, short enough for a sitting.
ITERATIONS = 3000
RANDOM_SEED = "42"


def wcl_to_item_spec(slot: dict) -> dict:
    """Map one WCL gear entry to a wowsims ItemSpec (protojson).

    permanentEnchant is already the tbc-new effectId namespace (R19).
    temporaryEnchant is a consumable — different namespace; omit it.
    """
    item_id = slot.get("id")
    if not item_id:
        return {}
    out: dict = {"id": item_id}
    ench = slot.get("permanentEnchant")
    if ench:
        out["enchant"] = ench
    gems = [g["id"] for g in (slot.get("gems") or []) if g.get("id")]
    if gems:
        out["gems"] = gems
    return out


def map_equipment(wcl_gear: list) -> list:
    by_slot = {}
    for idx, name in enumerate(WCL_ORDER):
        if name in ("SHIRT", "TABARD"):
            continue
        by_slot[name] = wcl_to_item_spec(wcl_gear[idx])
    items = [by_slot[name] for name in SIM_ORDER]
    # Prove we didn't silently filter-only: back must be WCL index 14's item.
    assert items[3]["id"] == wcl_gear[14]["id"], (
        f"back slot wrong: sim[3]={items[3]!r} wcl[14]={wcl_gear[14]!r}"
    )
    assert items[0]["id"] == wcl_gear[0]["id"]
    assert items[14]["id"] == wcl_gear[15]["id"]
    return items


def main() -> int:
    if not CLI.is_file():
        print(f"missing wowsimcli at {CLI}", file=sys.stderr)
        print(
            "fetch: curl -sL -o /tmp/cli.zip "
            "https://github.com/wowsims/tbc-new/releases/download/v0.0.101/"
            "wowsimcli-windows.exe.zip && unzip into "
            "vendor/wowsimcli-v0.0.101-win32-x64/",
            file=sys.stderr,
        )
        return 2
    if not SKELETON.is_file():
        print(f"missing skeleton RaidSimRequest at {SKELETON}", file=sys.stderr)
        print(
            "re-export: wowsims.com ret P2 → Export → CLI → "
            "test/fixtures/ret-p2.raid-sim-skeleton.json",
            file=sys.stderr,
        )
        return 2

    raw = json.loads(FIXTURE.read_text(encoding="utf-8"))
    # The fixture holds every combatant. events[0] is NOT the named character —
    # it was Hagguth (Warrior) in the slamaltman capture. Match via actors.
    actors = {a["id"]: a for a in raw["actors"]}
    target = None
    for ev in raw["combatant_info_events"]:
        actor = actors.get(ev["sourceID"])
        if actor and actor.get("name", "").lower() == "slamaltman":
            target = ev
            break
    if target is None:
        print("slamaltman not found in fixture actors/events", file=sys.stderr)
        return 2
    print(
        f"using sourceID={target['sourceID']} "
        f"({actors[target['sourceID']]['subType']}) — "
        f"NOT events[0]"
    )
    gear = target["gear"]
    items = map_equipment(gear)

    req = json.loads(SKELETON.read_text(encoding="utf-8"))
    player = req["raid"]["parties"][0]["players"][0]
    player["equipment"] = {"items": items}
    # Logged faction is Alliance; race itself is unreadable from WCL (R8).
    # Human is the assumed Alliance race for this probe — disclosed, not exact.
    player["race"] = "RaceHuman"
    player["name"] = "slamaltman"
    req["simOptions"] = {
        "iterations": ITERATIONS,
        "randomSeed": RANDOM_SEED,
        "debugFirstIteration": False,
    }
    # Drop any requestId from the live export — not load-bearing for cli sim.
    req.pop("requestId", None)

    OUT_REQ.parent.mkdir(parents=True, exist_ok=True)
    OUT_REQ.write_text(json.dumps(req, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT_REQ.relative_to(ROOT)}")

    tmp_out = ROOT / ".scratch/phase0-close/slamaltman.raid-sim-result.raw.json"
    tmp_out.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        str(CLI),
        "sim",
        "--infile",
        str(OUT_REQ),
        "--outfile",
        str(tmp_out),
        "--verbose",
    ]
    print("running:", " ".join(cmd))
    proc = subprocess.run(cmd, cwd=ROOT)
    if proc.returncode != 0:
        print(f"wowsimcli exited {proc.returncode}", file=sys.stderr)
        return proc.returncode

    result = json.loads(tmp_out.read_text(encoding="utf-8"))
    # Full protojson is hundreds of KB of per-action histograms. The committed
    # RecordedSimRunner fixture keeps the observation shape we'll key on later.
    slim = slim_result(result)
    OUT_RES.write_text(json.dumps(slim, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT_RES.relative_to(ROOT)} (slimmed; full raw at {tmp_out.relative_to(ROOT)})")

    try:
        dps = slim["raidMetrics"]["dps"]["avg"]
    except (KeyError, TypeError):
        print("WARN: could not find raidMetrics.dps.avg", file=sys.stderr)
        print(json.dumps(slim.get("error"), indent=2))
        return 1

    version = subprocess.check_output([str(CLI), "version"], text=True).strip()
    print(f"DPS avg={dps:.2f}  iterations={ITERATIONS}  seed={RANDOM_SEED}")
    print(f"wowsimcli version: {version}")
    return 0


def slim_distribution(d: dict | None) -> dict | None:
    if not d:
        return d
    keep = ("avg", "stdev", "min", "max", "minSeed", "maxSeed")
    return {k: d[k] for k in keep if k in d}


def slim_result(result: dict) -> dict:
    """Drop per-spell action/aura payloads; keep raid/player DPS distributions."""
    out = {
        "error": result.get("error"),
        "iterationsDone": result.get("iterationsDone"),
        "firstIterationDuration": result.get("firstIterationDuration"),
        "avgIterationDuration": result.get("avgIterationDuration"),
        "simVersion": "v0.0.101",
        "raidMetrics": {
            "dps": slim_distribution((result.get("raidMetrics") or {}).get("dps")),
        },
    }
    parties = (result.get("raidMetrics") or {}).get("parties") or []
    if parties and (parties[0].get("players") or []):
        player = parties[0]["players"][0]
        out["playerMetrics"] = {
            "name": player.get("name"),
            "dps": slim_distribution(player.get("dps")),
        }
    return out


if __name__ == "__main__":
    raise SystemExit(main())
