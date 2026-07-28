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

    out = {
        "spec": "ret",
        "epPreset": "data/presets/ret/p2.ep-weights.json",
        "note": (
            "Curated from ret.generated.json: db sources where present, "
            "HAND map in scripts/curate_ret_pool.py otherwise. No null sources."
        ),
        "entries": entries,
    }
    OUT.write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} ({len(entries)} entries, 0 null sources)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
