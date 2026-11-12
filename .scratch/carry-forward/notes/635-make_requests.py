"""Build the ticket-635 sim requests: a 2x2 of {Wolfshead effect on/off} x
{Thunderheart 2pc on/off}, with every variant stat-identical.

Base gear: the feral p2_6p preset (phase 3's previous phase). Hands and legs
become Thunderheart Gauntlets 31034 and Leggings 31044 (no gems, legs keep the
preset enchant, hands carry none), so the 2pc is on. Malorne 2pc (shoulders,
chest) stays on in every variant.

- 2pc off: hands slot empty, the Gauntlets' item stats added as bonus stats.
- Wolfshead off: head slot empty, Wolfshead's item stats plus Glyph of
  Ferocity (enchant 3003) stats added as bonus stats.

So the only difference between variants is the set bonus and/or the
Wolfshead item effect (and the rotation's Wolfshead checks that read it).

Usage: python -I 635-make_requests.py <fork dir> <out dir> <iterations>
"""

import copy
import json
import pathlib
import sys

fork = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
iters = int(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)

NSTATS = 42
gear = json.loads((fork / "ui/specs/druid/feralcat/gear_sets/p2_6p.gear.json").read_text())["items"]
apl = json.loads((fork / "ui/specs/druid/feralcat/apls/default.apl.json").read_text())

HEAD, HANDS, LEGS = 0, 6, 8
assert gear[HEAD]["id"] == 8345 and gear[HEAD]["enchant"] == 3003
assert gear[HANDS]["id"] == 29947 and gear[LEGS]["id"] == 29995

gear[HANDS] = {"id": 31034}
gear[LEGS] = {"id": 31044, "enchant": gear[LEGS]["enchant"]}


def stats(m):
    s = [0.0] * NSTATS
    for k, v in m.items():
        s[int(k)] += v
    return s


TH_GAUNTLETS = {0: 39, 1: 32, 2: 34, 3: 20, 31: 287, 32: 252}  # db.json item 31034
WOLFSHEAD = {16: 10, 31: 109}  # db.json item 8345
GLYPH_FEROCITY = {17: 34, 18: 34, 20: 16}  # db.json enchant 3003

# Mirrors ui/specs/druid/feralcat/spec.ts simpleRotation with presets.ts DefaultRotation.
_simple_opts = {"biteweave": True, "ripMinComboPoints": 5, "biteMinComboPoints": 5, "mangleTrick": True, "maintainFaerieFire": True}
simple_rot = {
    "type": "TypeSimple",
    "simple": {"specRotationJson": json.dumps(_simple_opts)},
    "priorityList": [{"action": {"catOptimalRotationAction": _simple_opts}}],
}

base_player = {
    "apiVersion": 15,
    "name": "t635",
    "race": "RaceNightElf",
    "class": "ClassDruid",
    "consumables": {
        "potId": 22838, "battleElixirId": 22831, "guardianElixirId": 32067, "foodId": 27664,
        "mhImbueId": 34340, "conjuredId": 12662, "superSapper": True, "goblinSapper": True,
        "scrollAgi": True, "scrollStr": True,
    },
    "buffs": {"blessingOfKings": True, "blessingOfMight": "TristateEffectImproved", "unleashedRage": True},
    "talentsString": "-503032132322105301251-05503301",
    "profession1": "Engineering",
    "profession2": "Enchanting",
    "reactionTimeMs": 250,
    "distanceFromTarget": 0,
    "feralCatDruid": {"options": {}},
}

raid_tmpl = {
    "parties": [
        {
            "players": [None],
            "buffs": {
                "drums": "LesserDrumsOfBattle", "ferociousInspiration": 2, "battleShout": "TristateEffectImproved",
                "graceOfAirTotem": "TristateEffectImproved", "windfuryTotem": "TristateEffectImproved",
                "manaSpringTotem": "TristateEffectRegular", "strengthOfEarthTotem": "TristateEffectImproved",
                "totemTwisting": True,
            },
        }
    ],
    "numActiveParties": 1,
    "buffs": {
        "bloodlust": True, "arcaneBrilliance": True, "divineSpirit": "TristateEffectImproved",
        "giftOfTheWild": "TristateEffectImproved", "powerWordFortitude": "TristateEffectImproved", "shadowProtection": True,
    },
    "debuffs": {
        "exposeWeaknessUptime": 0.9, "exposeWeaknessHunterAgility": 1080, "bloodFrenzy": True,
        "exposeArmor": "TristateEffectImproved", "huntersMark": "TristateEffectImproved",
        "improvedSealOfTheCrusader": "TristateEffectImproved", "judgementOfWisdom": True, "misery": True,
        "curseOfRecklessness": True, "faerieFire": "TristateEffectImproved", "sunderArmor": True, "giftOfArthas": True,
    },
}

encounter = {
    "apiVersion": 15, "duration": 180, "durationVariation": 5,
    "executeProportion20": 0.2, "executeProportion25": 0.25, "executeProportion35": 0.35,
    "executeProportion45": 0.45, "executeProportion90": 0.9,
    "targets": [{
        "id": 31146, "name": "Raid Target", "level": 73, "mobType": "MobTypeMechanical",
        "stats": [0] * 17 + [320] + [0] * 9 + [54] + [0] * 3 + [7685, 0, 6070400] + [0] * 8,
        "minBaseDamage": 15113, "damageSpread": 0.5, "swingSpeed": 2, "parryHaste": True, "canCrush": True,
    }],
}

for rot_name, rot in (("apl", apl), ("simple", simple_rot)):
    for wolf in (True, False):
        for two in (True, False):
            g = copy.deepcopy(gear)
            bonus = [0.0] * NSTATS
            if not wolf:
                g[HEAD] = {}
                bonus = [a + b for a, b in zip(bonus, stats(WOLFSHEAD))]
                bonus = [a + b for a, b in zip(bonus, stats(GLYPH_FEROCITY))]
            if not two:
                g[HANDS] = {}
                bonus = [a + b for a, b in zip(bonus, stats(TH_GAUNTLETS))]
            p = copy.deepcopy(base_player)
            p["equipment"] = {"items": g}
            p["bonusStats"] = {"apiVersion": 15, "stats": bonus}
            p["rotation"] = rot
            raid = copy.deepcopy(raid_tmpl)
            raid["parties"][0]["players"] = [p]
            req = {
                "raid": raid,
                "encounter": encounter,
                "simOptions": {"iterations": iters, "randomSeed": 635},
                "type": "SimTypeIndividual",
            }
            name = f"{rot_name}-wolf{'1' if wolf else '0'}-th2pc{'1' if two else '0'}"
            (out / f"{name}.req.json").write_text(json.dumps(req))
            print(name)
