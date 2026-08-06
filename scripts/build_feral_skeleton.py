#!/usr/bin/env python3
"""
build_feral_skeleton.py — generate the feral cat RaidSimRequest skeleton.

Ret's skeleton came from a wowsims share link via `wowsimcli decodelink`
(PLAN.md §8.2, design C). No feral share link exists here, so this builds the
equivalent from sources that ARE pinned:

  - raid/encounter/buff blocks: copied from the ret skeleton, because they
    describe the FIGHT rather than the player and must match for the two specs
    to be comparable at all.
  - player class, talents, options, consumables, race, professions: from
    upstream ui/druid/feralcat/presets.ts at the pinned commit.
  - rotation: merged from the pinned vendor/wowsims/feral_default.apl.json.

The APL merge is not cosmetic. verification-log 2026-07-27 measured that for
ret the APL block -- prepullActions especially -- is what the Go sim actually
runs, and that `type`+`simple` alone produces a different, wrong DPS. So the
feral skeleton carries the same four APL fields.

    python scripts/build_feral_skeleton.py

Exit 0 ok, 2 missing inputs.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RET_SKELETON = ROOT / "data/presets/ret/p2.raid-sim-skeleton.json"
FERAL_APL = ROOT / "vendor/wowsims/feral_default.apl.json"
OUT = ROOT / "data/presets/feral/p2.raid-sim-skeleton.json"

APL_KEYS = ("prepullActions", "priorityList", "groups", "valueVariables")

# ui/druid/feralcat/presets.ts @ 8aa378b3. StandardTalents rather than
# MonocatTalents: it is the preset upstream lists first and the one its P2
# gear sets are built around.
TALENTS = "-503032132322105301251-05503301"

# OtherDefaults in the same file.
RACE = "RaceNightElf"
PROFESSION1 = "Engineering"
PROFESSION2 = "Enchanting"
REACTION_TIME_MS = 250
DISTANCE_FROM_TARGET = 0

# DefaultConsumables in the same file. The `potions`/`conjuredItems` menu
# arrays ret carries are deliberately omitted: check_raid_sim_skeleton.py's
# docstring records them as exported UI menus with an unknown filter, inert
# for ret, so inventing feral values would be fabrication rather than a port.
CONSUMABLES = {
    "potId": 22838,
    "battleElixirId": 22831,
    "guardianElixirId": 32067,
    "foodId": 27664,
    "mhImbueId": 34340,
    "conjuredId": 12662,
    "drumsId": "GreaterDrumsOfBattle",
    "superSapper": True,
    "goblinSapper": True,
    "scrollAgi": True,
    "scrollStr": True,
}


def main() -> int:
    for path in (RET_SKELETON, FERAL_APL):
        if not path.is_file():
            print(f"missing {path.relative_to(ROOT)}", file=sys.stderr)
            if path is FERAL_APL:
                print("  run: pnpm sync:wowsims:restore", file=sys.stderr)
            return 2

    skeleton = json.loads(RET_SKELETON.read_text(encoding="utf-8"))
    apl = json.loads(FERAL_APL.read_text(encoding="utf-8"))

    player = skeleton["raid"]["parties"][0]["players"][0]

    player["name"] = "feral"
    player["class"] = "ClassDruid"
    player["talentsString"] = TALENTS
    player["race"] = RACE
    player["profession1"] = PROFESSION1
    player["profession2"] = PROFESSION2
    player["reactionTimeMs"] = REACTION_TIME_MS
    player["distanceFromTarget"] = DISTANCE_FROM_TARGET
    player["consumables"] = CONSUMABLES

    # The spec-options oneof: exactly one of these may be set.
    player.pop("retributionPaladin", None)
    player["feralCatDruid"] = {"options": {"classOptions": {}}}

    # Rotation: the APL is what the Go sim runs (verification-log 2026-07-27).
    rotation = {"type": "TypeAPL"}
    for key in APL_KEYS:
        rotation[key] = apl.get(key)
    player["rotation"] = rotation

    # Gear is filled per-candidate by compose; ship the skeleton bare so a
    # stale ret item can never leak into a feral request.
    player["equipment"] = {"items": [{} for _ in range(17)]}

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(skeleton, indent=2) + "\n", encoding="utf-8")

    print(f"wrote {OUT.relative_to(ROOT)}")
    print(f"  class={player['class']} race={player['race']}")
    print(f"  talents={player['talentsString']}")
    print(f"  rotation.type={rotation['type']}, "
          f"prepullActions={len(rotation.get('prepullActions') or [])}, "
          f"priorityList={len(rotation.get('priorityList') or [])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
