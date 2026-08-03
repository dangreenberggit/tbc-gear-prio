#!/usr/bin/env python3
"""
curate_ret_pool.py — build data/pools/ret.json from ret.generated.json.

Fills remaining source:null gaps with a hand map (PLAN.md §8.3.2). Exits
non-zero if any entry would still ship without a source.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "data/pools/ret.generated.json"
OUT = ROOT / "data/pools/ret.json"

# Hand-filled ItemSource for generated rows db.json cannot resolve.
# Prefer kind: token for tier pieces (zone = where the token drops).
HAND: dict[int, dict] = {
    # --- T6 tokens / SWP / Hyjal / BT ---
    34485: {"kind": "token", "zone": "Hyjal Summit", "token": "Lightbringer Girdle"},
    34569: {"kind": "token", "zone": "Hyjal Summit", "token": "Onslaught Treads"},
    34546: {"kind": "token", "zone": "Hyjal Summit", "token": "Onslaught Belt"},
    34943: {"kind": "raid", "zone": "Sunwell Plateau", "boss": "Kalecgos"},
    34891: {"kind": "raid", "zone": "Sunwell Plateau", "boss": "Brutallus"},
    34561: {"kind": "token", "zone": "Hyjal Summit", "token": "Lightbringer Boots"},
    30977: {"kind": "token", "zone": "Black Temple", "token": "Onslaught Greaves"},
    30975: {"kind": "token", "zone": "Black Temple", "token": "Onslaught Breastplate"},
    30990: {"kind": "token", "zone": "Black Temple", "token": "Lightbringer Breastplate"},
    30972: {"kind": "token", "zone": "Black Temple", "token": "Onslaught Battle-Helm"},
    30979: {"kind": "token", "zone": "Black Temple", "token": "Onslaught Shoulderblades"},
    30969: {"kind": "token", "zone": "Black Temple", "token": "Onslaught Gauntlets"},
    30997: {"kind": "token", "zone": "Black Temple", "token": "Lightbringer Shoulderbraces"},
    29993: {"kind": "raid", "zone": "Tempest Keep", "boss": "Kael'thas Sunstrider"},
    34431: {"kind": "token", "zone": "Sunwell Plateau", "token": "Lightbringer Bands"},
    34441: {"kind": "token", "zone": "Sunwell Plateau", "token": "Onslaught Bracers"},
    34388: {"kind": "raid", "zone": "Sunwell Plateau", "boss": "Felmyst"},
    34941: {"kind": "raid", "zone": "Sunwell Plateau", "boss": "Eredar Twins"},
    34944: {"kind": "raid", "zone": "Sunwell Plateau", "boss": "Eredar Twins"},
    34942: {"kind": "raid", "zone": "Sunwell Plateau", "boss": "Eredar Twins"},
    34568: {"kind": "token", "zone": "Sunwell Plateau", "token": "Onslaught Boots"},
    34892: {"kind": "raid", "zone": "Sunwell Plateau", "boss": "Kil'jaeden"},
    # --- Arena / PvP ---
    35069: {"kind": "pvp", "via": "arena", "season": 4},
    35015: {"kind": "pvp", "via": "arena", "season": 4},
    34989: {"kind": "pvp", "via": "arena", "season": 4},
    34997: {"kind": "pvp", "via": "arena", "season": 4},
    35091: {"kind": "pvp", "via": "arena", "season": 4},
    35066: {"kind": "pvp", "via": "arena", "season": 4},
    35068: {"kind": "pvp", "via": "arena", "season": 4},
    35088: {"kind": "pvp", "via": "arena", "season": 4},
    35090: {"kind": "pvp", "via": "arena", "season": 4},
    35067: {"kind": "pvp", "via": "arena", "season": 4},
    35070: {"kind": "pvp", "via": "arena", "season": 4},
    33688: {"kind": "pvp", "via": "arena", "season": 3},
    33663: {"kind": "pvp", "via": "arena", "season": 3},
    33670: {"kind": "pvp", "via": "arena", "season": 3},
    34014: {"kind": "pvp", "via": "arena", "season": 3},
    33731: {"kind": "pvp", "via": "arena", "season": 3},
    33730: {"kind": "pvp", "via": "arena", "season": 3},
    33751: {"kind": "pvp", "via": "arena", "season": 3},
    35161: {"kind": "pvp", "via": "honor"},
    35146: {"kind": "pvp", "via": "honor"},
    35163: {"kind": "pvp", "via": "honor"},
    35148: {"kind": "pvp", "via": "honor"},
    35176: {"kind": "pvp", "via": "honor"},
    35178: {"kind": "pvp", "via": "honor"},
    33812: {"kind": "pvp", "via": "honor"},
    33911: {"kind": "pvp", "via": "honor"},
    33813: {"kind": "pvp", "via": "honor"},
    33910: {"kind": "pvp", "via": "honor"},
    32793: {"kind": "pvp", "via": "honor"},
    # --- ZA / badges / misc T4–T5 ---
    33501: {"kind": "raid", "zone": "Zul'Aman", "boss": "Halazzi"},
    33810: {"kind": "raid", "zone": "Zul'Aman", "boss": "Zul'jin"},
    33514: {"kind": "raid", "zone": "Zul'Aman", "boss": "Nalorakk"},
    33512: {"kind": "raid", "zone": "Zul'Aman", "boss": "Jan'alai"},
    33331: {"kind": "raid", "zone": "Zul'Aman", "boss": "Akil'zon"},
    33296: {"kind": "raid", "zone": "Zul'Aman", "boss": "Hex Lord Malacrass"},
    33516: {"kind": "raid", "zone": "Zul'Aman", "boss": "timed chest"},
    33513: {"kind": "raid", "zone": "Zul'Aman", "boss": "timed chest"},
    30009: {
        "kind": "raid",
        "zone": "Serpentshrine Cavern",
        "boss": "Fathom-Lord Karathress",
    },
    30132: {
        "kind": "token",
        "zone": "Tempest Keep",
        "token": "Greaves of the Fallen Champion",
    },
    30121: {
        "kind": "token",
        "zone": "Tempest Keep",
        "token": "Greaves of the Fallen Hero",
    },
    30129: {
        "kind": "token",
        "zone": "Serpentshrine Cavern",
        "token": "Chestguard of the Fallen Champion",
    },
    30120: {
        "kind": "token",
        "zone": "Serpentshrine Cavern",
        "token": "Helm of the Fallen Hero",
    },
    30122: {
        "kind": "token",
        "zone": "Serpentshrine Cavern",
        "token": "Pauldrons of the Fallen Hero",
    },
    30119: {
        "kind": "token",
        "zone": "Serpentshrine Cavern",
        "token": "Gauntlets of the Fallen Hero",
    },
    29074: {"kind": "token", "zone": "Karazhan", "token": "Justicar Greaves"},
    29020: {"kind": "token", "zone": "Karazhan", "token": "Warbringer Gauntlets"},
    29075: {"kind": "token", "zone": "Karazhan", "token": "Justicar Shoulderplates"},
    29023: {"kind": "token", "zone": "Karazhan", "token": "Warbringer Shoulderplates"},
    31298: {
        "kind": "rep",
        "faction": "The Shattered Hand",
        "standing": "Exalted",
    },
    30740: {"kind": "raid", "zone": "Magtheridon's Lair", "boss": "Magtheridon"},
    30738: {"kind": "raid", "zone": "Karazhan", "boss": "Netherspite"},
    278827: {"kind": "raid", "zone": "Hellfire Peninsula", "boss": "world drop"},
    29283: {"kind": "raid", "zone": "Karazhan", "boss": "Violet Signet quest"},
    29282: {"kind": "raid", "zone": "Karazhan", "boss": "Violet Signet quest"},
    29281: {"kind": "raid", "zone": "Karazhan", "boss": "Violet Signet quest"},
    29381: {"kind": "badge", "cost": 25},
    30375: {"kind": "raid", "zone": "Tempest Keep", "boss": "Void Reaver"},
    31180: {"kind": "world"},
    31275: {"kind": "world"},
    29335: {"kind": "raid", "zone": "Auchenai Crypts", "boss": "Exarch Maladaar"},
    34680: {"kind": "rep", "faction": "Shattered Sun Offensive", "standing": "Exalted"},
    31255: {"kind": "crafted", "profession": "leatherworking"},
    28031: {"kind": "rep", "faction": "Kurenai", "standing": "Revered"},
    18465: {"kind": "raid", "zone": "Dire Maul", "boss": "Tribute run"},
}

# Known-good pieces that must stay in the curated 12/slot even if EP ranked them out.
FORCE: list[dict] = [
    {
        "itemId": 30106,
        "name": "Belt of One-Hundred Deaths",
        "slot": "waist",
        "phase": 2,
        "ep": 200,
        "source": {
            "kind": "raid",
            "zone": "Serpentshrine Cavern",
            "boss": "Lady Vashj",
        },
    },
    {
        "itemId": 30900,
        "name": "Bow-stitched Leggings",
        "slot": "legs",
        "phase": 3,
        "ep": 200,
        "source": {"kind": "raid", "zone": "Hyjal Summit", "boss": "Kaz'rogal"},
    },
    {
        "itemId": 33122,
        "name": "Cloak of Darkness",
        "slot": "back",
        "phase": 1,
        "ep": 200,
        "source": {"kind": "crafted", "profession": "leatherworking"},
    },
    {
        "itemId": 32526,
        "name": "Band of Devastation",
        "slot": "finger",
        "phase": 3,
        "ep": 200,
        "source": {"kind": "raid", "zone": "Black Temple", "boss": "Illidan Stormrage"},
    },
    {
        "itemId": 32348,
        "name": "Soul Cleaver",
        "slot": "weapon",
        "phase": 3,
        "ep": 200,
        "source": {"kind": "raid", "zone": "Black Temple", "boss": "Mother Shahraz"},
    },
    {
        "itemId": 30902,
        "name": "Cataclysm's Edge",
        "slot": "weapon",
        "phase": 3,
        "ep": 200,
        "source": {"kind": "raid", "zone": "Hyjal Summit", "boss": "Archimonde"},
    },
    {
        "itemId": 28773,
        "name": "Gorehowl",
        "slot": "weapon",
        "phase": 1,
        "ep": 180,
        "source": {"kind": "raid", "zone": "Karazhan", "boss": "Prince Malchezaar"},
    },
    {
        "itemId": 30090,
        "name": "World Breaker",
        "slot": "weapon",
        "phase": 2,
        "ep": 190,
        "source": {
            "kind": "raid",
            "zone": "Serpentshrine Cavern",
            "boss": "Hydross the Unstable",
        },
    },
    {
        "itemId": 28430,
        "name": "Lionheart Executioner",
        "slot": "weapon",
        "phase": 2,
        "ep": 170,
        "source": {"kind": "crafted", "profession": "blacksmithing"},
    },
    {
        "itemId": 27484,
        "name": "Libram of Avengement",
        "slot": "ranged",
        "phase": 1,
        "ep": 50,
        "source": {"kind": "badge", "cost": 20},
    },
    {
        "itemId": 30063,
        "name": "Libram of Absolute Truth",
        "slot": "ranged",
        "phase": 2,
        "ep": 55,
        "source": {
            "kind": "raid",
            "zone": "Serpentshrine Cavern",
            "boss": "Fathom-Lord Karathress",
        },
    },
    {
        "itemId": 32323,
        "name": "Shadowmoon Destroyer's Drape",
        "slot": "back",
        "phase": 3,
        "ep": 200,
        "source": {"kind": "raid", "zone": "Black Temple", "boss": "Mother Shahraz"},
    },
    {
        "itemId": 32606,
        "name": "Girdle of the Lightbearer",
        "slot": "waist",
        "phase": 3,
        "ep": 195,
        "source": {"kind": "raid", "zone": "Black Temple", "boss": "Gurtogg Bloodboil"},
    },
    {
        "itemId": 32332,
        "name": "Torch of the Damned",
        "slot": "weapon",
        "phase": 3,
        "ep": 210,
        "source": {"kind": "raid", "zone": "Black Temple", "boss": "Reliquary of Souls"},
    },
    {
        "itemId": 29993,
        "name": "Twinblade of the Phoenix",
        "slot": "weapon",
        "phase": 2,
        "ep": 205,
        "source": {
            "kind": "raid",
            "zone": "Tempest Keep",
            "boss": "Kael'thas Sunstrider",
        },
    },
    {
        "itemId": 27983,
        "name": "Libram of Zeal",
        "slot": "ranged",
        "phase": 1,
        "ep": 45,
        "source": {"kind": "badge", "cost": 15},
    },
    {
        "itemId": 28296,
        "name": "Libram of the Lightbringer",
        "slot": "ranged",
        "phase": 1,
        "ep": 40,
        "source": {"kind": "raid", "zone": "Karazhan", "boss": "Attumen the Huntsman"},
    },
    {
        "itemId": 31033,
        "name": "Libram of Righteous Power",
        "slot": "ranged",
        "phase": 1,
        "ep": 48,
        "source": {"kind": "badge", "cost": 15},
    },
    {
        "itemId": 33950,
        "name": "Vengeful Gladiator's Libram of Vengeance",
        "slot": "ranged",
        "phase": 3,
        "ep": 60,
        "source": {"kind": "pvp", "via": "arena", "season": 3},
    },
    {
        "itemId": 33842,
        "name": "Vengeful Gladiator's Libram of Justice",
        "slot": "ranged",
        "phase": 3,
        "ep": 58,
        "source": {"kind": "pvp", "via": "arena", "season": 3},
    },
    {
        "itemId": 33077,
        "name": "Merciless Gladiator's Libram of Justice",
        "slot": "ranged",
        "phase": 2,
        "ep": 52,
        "source": {"kind": "pvp", "via": "arena", "season": 2},
    },
]

TOP_N = 12


def ensure_force(entries: list[dict]) -> list[dict]:
    by_slot: dict[str, list[dict]] = {}
    for e in entries:
        by_slot.setdefault(e["slot"], []).append(e)
    forced_ids = {f["itemId"] for f in FORCE}
    for force in FORCE:
        by_slot.setdefault(force["slot"], [])
    out: list[dict] = []
    for slot in sorted(by_slot):
        forced = [dict(f) for f in FORCE if f["slot"] == slot]
        rest = [e for e in by_slot[slot] if e["itemId"] not in forced_ids]
        rest.sort(key=lambda e: e.get("ep") or 0, reverse=True)
        out.extend((forced + rest)[:TOP_N])
    return out


def main() -> int:
    if not GENERATED.is_file():
        print(f"missing {GENERATED} — run pnpm pool:generate", file=sys.stderr)
        return 2
    gen = json.loads(GENERATED.read_text(encoding="utf-8"))
    entries = []
    missing: list[tuple[int, str]] = []
    for e in gen["entries"]:
        src = e.get("source") or HAND.get(e["itemId"])
        if not src:
            missing.append((e["itemId"], e["name"]))
            continue
        entries.append(
            {
                "itemId": e["itemId"],
                "name": e["name"],
                "slot": e["slot"],
                "phase": e["phase"],
                "ep": e["ep"],
                "source": src,
            }
        )

    if missing:
        print(f"{len(missing)} entries still lack source:", file=sys.stderr)
        for item_id, name in missing:
            print(f"  {item_id} {name}", file=sys.stderr)
        return 1

    entries = ensure_force(entries)

    out = {
        "spec": "ret",
        "epPreset": "data/presets/ret/p2.ep-weights.json",
        "note": (
            "Curated from ret.generated.json: db sources where present, "
            "HAND map + FORCE includes in scripts/curate_ret_pool.py. "
            "No null sources. Ranged = librams; Kael temps excluded upstream."
        ),
        "entries": entries,
    }
    OUT.write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} ({len(entries)} entries, 0 null sources)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
