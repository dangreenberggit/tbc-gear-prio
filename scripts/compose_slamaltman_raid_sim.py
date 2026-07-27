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
LOCK = ROOT / "data/wowsims.lock.json"
FIXTURE = ROOT / "test/fixtures/slamaltman.raw.json"
SKELETON = ROOT / "test/fixtures/ret-p2.raid-sim-skeleton.json"
OUT_REQ = ROOT / "test/fixtures/slamaltman.raid-sim-request.json"
OUT_RES = ROOT / "test/fixtures/slamaltman.raid-sim-result.json"

# Same layout as scripts/fetch_wowsimcli.py — keep the binary names in sync.
CLI_BINARIES = {
    "win32-x64": "wowsimcli-windows.exe",
    "linux-x64": "wowsimcli",
}

# Probe knobs — enough for a plausible DPS, short enough for a sitting.
ITERATIONS = 3000
RANDOM_SEED = "42"

# Shared 19→17 table — packages/core/src/slots-table.json (via scripts/slots.py).
sys.path.insert(0, str(ROOT / "scripts"))
from slots import map_wcl_gear_to_sim  # noqa: E402


def resolve_cli() -> Path:
    """vendor/wowsimcli-<lock.tag>-<platform>/<binary> — same pin as db.json."""
    tag = json.loads(LOCK.read_text(encoding="utf-8"))["tag"]
    platform = "win32-x64" if sys.platform.startswith("win") else "linux-x64"
    binary = CLI_BINARIES[platform]
    return ROOT / "vendor" / f"wowsimcli-{tag}-{platform}" / binary


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
    return map_wcl_gear_to_sim(wcl_gear, wcl_to_item=wcl_to_item_spec)

def slim_distribution(d: dict | None) -> dict | None:
    if not d:
        return d
    keep = ("avg", "stdev", "min", "max", "minSeed", "maxSeed")
    return {k: d[k] for k in keep if k in d}


def slim_result(result: dict, sim_version: str) -> dict:
    """Drop per-spell action/aura payloads; keep raid/player DPS distributions."""
    out = {
        "error": result.get("error"),
        "iterationsDone": result.get("iterationsDone"),
        "firstIterationDuration": result.get("firstIterationDuration"),
        "avgIterationDuration": result.get("avgIterationDuration"),
        "simVersion": sim_version,
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


def main() -> int:
    cli = resolve_cli()
    if not cli.is_file():
        print(f"missing wowsimcli at {cli}", file=sys.stderr)
        print("fetch: pnpm fetch:wowsimcli", file=sys.stderr)
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

    version = subprocess.check_output([str(cli), "version"], text=True).strip()

    tmp_out = ROOT / ".scratch/phase0-close/slamaltman.raid-sim-result.raw.json"
    tmp_out.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        str(cli),
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
    err = result.get("error")
    if err not in (None, {}, {"type": "ErrorOutcomeNone"}):
        # Protojson often emits error as null; a typed error is a hard fail.
        if isinstance(err, dict) and err.get("type") and err.get("type") != "ErrorOutcomeNone":
            print(f"sim error: {json.dumps(err)}", file=sys.stderr)
            return 1
    done = result.get("iterationsDone")
    if done != ITERATIONS:
        print(
            f"iterationsDone={done!r}, expected {ITERATIONS}",
            file=sys.stderr,
        )
        return 1
    try:
        dps = result["raidMetrics"]["dps"]["avg"]
    except (KeyError, TypeError):
        print("missing raidMetrics.dps.avg", file=sys.stderr)
        print(json.dumps(result.get("error"), indent=2))
        return 1

    # Validate before writing the committed fixture — don't leave a green-looking
    # file behind a failed run.
    slim = slim_result(result, version)
    OUT_RES.write_text(json.dumps(slim, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT_RES.relative_to(ROOT)} (slimmed; full raw at {tmp_out.relative_to(ROOT)})")
    print(f"DPS avg={dps:.2f}  iterations={ITERATIONS}  seed={RANDOM_SEED}")
    print(f"wowsimcli version: {version}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
