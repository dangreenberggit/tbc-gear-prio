# 06 — owner settings diff (iteration 5)

Subagent `06-owner-settings-diff`. Read-only on production source. All throwaway
artefacts under `.scratch/set-bonus-value/loop-103-106/`. Branch
`feat/set-bonus-value`, nothing committed, nothing under `packages/` or `data/`
modified.

## What I was asked

1. Structured diff of `owner-settings-export.json` against
   `data/presets/feral/p2.raid-sim-skeleton.json` and the composed requests in
   `prod-requests/`; explicitly check `exposeWeaknessHunterAgility` and whether
   the owner's baseline **gear** matches ours.
2. Price the differences individually with the pinned wowsimcli, seeds
   [11,22,33,44,55] @ 3000 iterations, every candidate arm built through the
   real `equipmentForCandidateSwap`.
3. If a concrete divergence appears, emit a web-importable
   `our-settings-for-web-import.json` + companion note.

## Headline

**Both residues are explained, and neither is a settings bug in the sense the
loop was hunting.** Two independent differences, each measured:

| difference | what it is | 103 (+64 vs +97) | 106 (flat vs ~+10) |
|---|---|---|---|
| **baseline gear** | the owner's export is a *different, better-geared character* — 10 of 17 slots differ | −7.9 DPS on the package delta | **+4.49** on CURSED−VENG |
| **rotation** | owner runs `TypeSimple` (biteweave/mangleTrick); our skeleton runs the upstream `TypeAPL` default | **+31.1** on the package delta | **+3.14** on CURSED−VENG |
| **both together** | | **+87.63** (owner ground truth **+97**) | **+7.78** (owner ground truth **~+10**) |

Everything else — raid buffs, party buffs, individual buffs, debuffs, talents,
encounter, `reactionTimeMs`, race, professions — is **byte-identical**. The
`exposeWeaknessHunterAgility: 1080` lead is confirmed **dead**: 1080 on both
sides.

## Part 1 — the diff

### Command

```
python -c "
import json
o=json.load(open('.scratch/set-bonus-value/loop-103-106/owner-settings-export.json'))
s=json.load(open('data/presets/feral/p2.raid-sim-skeleton.json'))
p=s['raid']['parties'][0]['players'][0]
... (full script inline in the transcript; prints each block sorted)
"
```

### Result table

| field group | owner value | ours | verdict |
|---|---|---|---|
| `raidBuffs` / `raid.buffs` | arcaneBrilliance, bloodlust, divineSpirit=Improved, giftOfTheWild=Improved, powerWordFortitude=Improved, shadowProtection | identical set, identical values | **SAME** |
| `debuffs` (12 keys) | incl. `exposeWeaknessUptime 0.9`, `exposeWeaknessHunterAgility 1080` | identical 12 keys, identical values | **SAME** — the 1080 lead is dead |
| `partyBuffs` | drums=LesserDrumsOfBattle, totemTwisting=true, ferociousInspiration=2, battleShout/graceOfAir/strengthOfEarth/windfury=Improved, manaSpring=Regular | identical | **SAME** |
| `player.buffs` | blessingOfKings, blessingOfMight=Improved, unleashedRage | identical | **SAME** |
| `talentsString` | `-503032132322105301251-05503301` | identical | **SAME** |
| `race` / `profession1` / `profession2` | NightElf / Engineering / Enchanting | identical | **SAME** |
| `reactionTimeMs` | 250 | 250 | **SAME** |
| encounter duration / durationVariation | 180 / 5 | 180 / 5 | **SAME** |
| encounter executeProportion20/25/35/45/90 | 0.2/0.25/0.35/0.45/0.9 | identical | **SAME** |
| target level / mobType / stats / minBaseDamage / damageSpread / swingSpeed / parryHaste | 73 / MobTypeMechanical / [.. 320 .. 54 .. 7685 .. 6070400 ..] / 15113 / 0.5 / 2 / true | identical | **SAME** |
| `target.canCrush` | absent | `true` | **DIFF (no counterpart)** — absent in an `IndividualSimSettings` export; wowsims' UI derives it. Not priced; hypothesis: inert for a level-73 boss target where crushing already applies. |
| `encounter.apiVersion` | 14 | 13 | **DIFF, cosmetic** — export-format version, not a sim input |
| `consumables.drumsId` | *(absent — drums live in `partyBuffs.drums`)* | `GreaterDrumsOfBattle` | **DIFF (no counterpart)**; see note below |
| `consumables.potions` / `conjuredItems` | list of owned ids | absent | **DIFF, cosmetic** — UI dropdown inventory, not a sim input |
| all other consumables (potId 22838, battleElixirId 22831, guardianElixirId 32067, foodId 27664, mhImbueId 34340, conjuredId 12662, superSapper, goblinSapper, scrollAgi, scrollStr) | | identical | **SAME** |
| `rotation.type` | `TypeSimple` (`biteweave`, `ripMinComboPoints 5`, `biteMinComboPoints 5`, `mangleTrick`, `maintainFaerieFire`) | `TypeAPL` (upstream `feral_default.apl.json`, ~1000 lines) | **DIFF — priced, large** |
| **equipment** | see below | see below | **DIFF — priced, large** |

Note on drums: our skeleton sets **both** `partyBuffs.drums = LesserDrumsOfBattle`
(matching the owner) **and** a player-level `consumables.drumsId =
GreaterDrumsOfBattle`. The owner sets only the party-level one. Whether the
player-level field is additive, overriding, or ignored when the party buff is
present is **untested** — I did not price it, because the two priced differences
already close both gaps and isolating it would have cost another 40 sims. Worth
a follow-up ticket; **hypothesis**: it is why our APL carries a `Drums` cast
group at all.

### The gear — this is the cheap explanation, and it is real

```
python -c "... zip(owner.player.equipment.items, prod-requests/BASE.req.json items) ..."
```

**10 of 17 slots differ.** The owner's export is not shredzepelin's gear. Names
resolved from `vendor/wowsims/db.json`:

| slot | ours (shredzepelin, from `test/fixtures/shredzepelin-cat.raw.json`) | owner's export |
|---|---|---|
| neck | 278827 Amulet of Bitter Hatred | 30017 Telonicus's Pendant of Mayhem |
| back | 278819 The Frost Lord's War Cloak | 29994 Thalassian Wildercloak |
| waist | 29247 Girdle of the Deathdealer | 30106 Belt of One-Hundred Deaths *(2 sockets, gemmed)* |
| legs | 28741 Skulker's Greaves *(3 sockets)* | 29995 Leggings of Murderous Intent *(0 sockets)* |
| finger1 | 30052 Ring of Lethality | 29997 Band of the Ranger-General |
| finger2 | 30834 Shapeshifter's Signet | 30052 Ring of Lethality |
| trinket1 | 28034 Hourglass of the Unraveller | 30627 Tsunami Talisman |
| weapon | 28658 Terestian's Stranglestaff | 32014 Merciless Gladiator's Maul |
| relic | 29390 Everbloom Idol | 32387 Idol of the Raven Goddess |
| shoulder enchant | 2983 | 2986 |

Head (8345 Wolfshead Helm), shoulder/chest items, wrist, hands, feet and the
empty ranged slot match. Baseline gem counts differ too: ours 11, owner's 10.

Two of our ids — **278827** and **278819** — are outside the TBC id range and
resolve to non-TBC names in the pinned db. That is a separate smell, out of
scope here; flagged for the director.

**Consequence for 103 specifically**: the socket-capacity story that iteration 3
already falsified is *even less* applicable on the owner's gear. Their baseline
legs (29995) have **no** sockets, so the T6 legs (31044, 1 socket) are a socket
*gain* for them and a socket *loss* for us — the package arm carries 12 gems on
the owner's baseline vs 10 on ours.

## Part 2 — pricing

### Method

`.scratch/set-bonus-value/loop-103-106/build-owner-gear-arms.ts` builds eight
arms. **Every candidate arm goes through the real
`equipmentForCandidateSwap`** (imported from `packages/core/src/rank.js`), and
the T6 package applies its four swaps **sequentially**, mirroring
`rank.ts:1066-1074`. No slot is hand-substituted anywhere — the `repairMeta`
trap from iterations 2/4/5 is avoided by construction. The owner's baseline is
read straight from their export into `SimItemSpec[]`; our baseline is built the
same way `dump-requests.ts` does it (fixture → `equipmentFromLoggedGear` +
`repairMeta` for the baseline's own gems).

```
pnpm exec tsx .scratch/set-bonus-value/loop-103-106/build-owner-gear-arms.ts
```

Output (verbatim):

```
OURS_BASE written; ids= 8345,278827,29100,278819,29096,29966,29947,29247,28741,28545,30052,30834,28034,29383,28658,0,29390 gems= 11
OURS_PKG written; ids= 8345,278827,31048,278819,31042,29966,31034,29247,31044,28545,30052,30834,28034,29383,28658,0,29390 gems= 10
OURS_CURSED written; ids= 32235,278827,29100,278819,29096,29966,29947,29247,28741,28545,30052,30834,28034,29383,28658,0,29390 gems= 13
OURS_VENG written; ids= 33672,278827,29100,278819,29096,29966,29947,29247,28741,28545,30052,30834,28034,29383,28658,0,29390 gems= 13
OWNER_BASE written; ids= 8345,30017,29100,29994,29096,29966,29947,30106,29995,28545,29997,30052,30627,29383,32014,0,32387 gems= 10
OWNER_PKG written; ids= 8345,30017,31048,29994,31042,29966,31034,30106,31044,28545,29997,30052,30627,29383,32014,0,32387 gems= 12
OWNER_CURSED written; ids= 32235,30017,29100,29994,29096,29966,29947,30106,29995,28545,29997,30052,30627,29383,32014,0,32387 gems= 12
OWNER_VENG written; ids= 33672,30017,29100,29994,29096,29966,29947,30106,29995,28545,29997,30052,30627,29383,32014,0,32387 gems= 12
```

Note `OURS_*` reproduces `prod-requests/` exactly — `OURS_BASE` sims to 2152.10
on seed 11, matching the stored artifact baseline 2152.0998 that iteration 4
established.

### Run 1 — our skeleton's APL rotation, both gear sets

```
python .scratch/set-bonus-value/loop-103-106/sim_owner_arms.py
```
(pinned CLI from `data/wowsims.lock.json` v0.0.101, seeds 11/22/33/44/55,
3000 iterations; log `sim_owner_arms.stdout.log`)

```
  OURS_BASE     2152.10   2152.02   2152.16   2152.07   2152.31   mean=  2152.13
  OURS_PKG      2216.17   2216.62   2216.90   2216.74   2216.63   mean=  2216.61
  OURS_CURSED   1949.97   1949.78   1950.23   1950.37   1950.38   mean=  1950.15
  OURS_VENG     1950.05   1950.18   1950.12   1949.96   1949.68   mean=  1950.00
  OWNER_BASE    2264.03   2264.04   2264.04   2264.07   2263.88   mean=  2264.01
  OWNER_PKG     2320.53   2320.49   2320.72   2320.41   2320.65   mean=  2320.56
  OWNER_CURSED  2071.74   2071.89   2071.93   2071.52   2071.28   mean=  2071.67
  OWNER_VENG    2066.73   2066.72   2067.35   2067.38   2066.96   mean=  2067.03

  [OURS]  baseline 2152.13   T6 4pc +64.48   CURSED-VENG  +0.15  per-seed [-0.08,-0.39,0.12,0.41,0.70]
  [OWNER] baseline 2264.01   T6 4pc +56.55   CURSED-VENG  +4.64  per-seed [5.01,5.17,4.57,4.14,4.32]
```

`OURS` reproduces the loop's established figures exactly (+64.48 package,
+0.15 CURSED−VENG), which validates the harness.

### Run 2 — the owner's `TypeSimple` rotation, both gear sets

The owner's `player.rotation` object was ported verbatim onto each of the eight
requests (only that field changed):

```
python -c "... p['rotation']=owner.player.rotation ... -> owner-arms-simplerot/"
python .scratch/set-bonus-value/loop-103-106/sim_owner_arms_simplerot.py
```
(log `sim_owner_arms_simplerot.stdout.log`)

```
  OURS_BASE     2202.35   2202.39   2202.34   2202.37   2202.43   mean=  2202.38
  OURS_PKG      2316.07   2315.98   2316.11   2316.17   2316.22   mean=  2316.11
  OURS_CURSED   2047.90   2047.85   2047.74   2047.89   2047.86   mean=  2047.85
  OURS_VENG     2041.21   2041.13   2041.01   2041.04   2041.08   mean=  2041.10
  OWNER_BASE    2333.39   2333.40   2333.24   2333.39   2333.31   mean=  2333.35
  OWNER_PKG     2420.91   2420.84   2421.12   2421.00   2421.03   mean=  2420.98
  OWNER_CURSED  2179.18   2179.34   2179.42   2179.50   2179.31   mean=  2179.35
  OWNER_VENG    2171.59   2171.46   2171.45   2171.63   2171.69   mean=  2171.56

  [OURS]  baseline 2202.38   T6 4pc +113.73  CURSED-VENG  +6.75  per-seed [6.68,6.72,6.73,6.85,6.78]
  [OWNER] baseline 2333.35   T6 4pc  +87.63  CURSED-VENG  +7.78  per-seed [7.58,7.87,7.97,7.87,7.62]
```

### The 2x2, isolated

**103 — T6 four-piece package delta (owner ground truth +97):**

| | our APL rotation | owner's TypeSimple | rotation effect |
|---|---|---|---|
| **our gear** | **+64.48** *(= stored +64.07)* | +113.73 | **+49.25** |
| **owner gear** | +56.55 | **+87.63** | **+31.08** |
| gear effect | −7.93 | −26.10 | |

**106 — CURSED(32235) − VENG(33672) (owner ground truth ~+10):**

| | our APL rotation | owner's TypeSimple | rotation effect |
|---|---|---|---|
| **our gear** | **+0.15** *(= stored −0.084)* | +6.75 | **+6.60** |
| **owner gear** | +4.64 | **+7.78** | **+3.14** |
| gear effect | +4.49 | +1.03 | |

Both diagonal cells move from "our stored figure" to "the owner's ground truth":
+64 → **+87.6** against a reported +97, and flat → **+7.78** against a reported
~+10. Both remaining residues are single-digit and in the right direction. The
owner's own runs were at 25000 iterations with a different seed
(`simOptions` in our skeleton: `iterations 25000, randomSeed 443754031`) and
their "+97" / "~+10" are round numbers read off a UI, so I would not chase the
last ~9 DPS and ~2 DPS without an exported *result* rather than an exported
*setting*.

**Interaction is large and not ignorable**: the rotation is worth +49 on our
gear but only +31 on the owner's, and the gear is worth −8 under our APL but
−26 under TypeSimple. Neither difference can be priced without the other, which
is why the "toggle everything individually" framing only partly applies — there
were only two live settings to toggle, and they do not superpose.

### Suspects the task named that turned out to be non-differences

`totemTwisting`, drums flavour (`LesserDrumsOfBattle`), sappers, agi/str
scrolls, `durationVariation 5`, `MobTypeMechanical`, `level 73`, `parryHaste`,
the talents string, and `reactionTimeMs` are all **already identical** in our
skeleton — nothing to toggle. I did not burn sims on them. `canCrush` and the
player-level `drumsId` are the only unpriced differences, both structural
mismatches between the two export formats rather than settings the owner chose.

## The lift I had to write, and what I inferred

There is no `IndividualSimSettings` → `RaidSimRequest` lift in our code
(ticket 72; `packages/core/src/compose.ts:5-7`). I **did not write one** — I took
the alternative the task offered and selectively ported the owner's fields onto
our skeleton, which is what the per-setting pricing needed anyway. That was
cheap because the diff came back nearly empty: the only field that needed
porting was `player.rotation`.

What I inferred rather than verified:

- **Equipment lift**: the owner's `items[15]` is `{}`; I mapped it to an
  id-less `SimItemSpec` with `gems: []`, matching what
  `equipmentFromLoggedGear` produces for an unfilled slot. Our composed request
  shows `0` there, same as our own baseline, so this is consistent — but it is
  my mapping, not a round-trip through wowsims.
- **`name` and `race`**: I kept `"shredzepelin"` and the skeleton's race for the
  owner-gear arms so the only variable is gear. Iteration 4 established name is
  cosmetic.
- **I did not port** `bonusStats`, `itemSwap`, `healingModel`, `cooldowns` — all
  empty/zero in the owner's export and in our skeleton.
- **Untested**: whether the owner's actual web run used the same
  `feralCatDruid.options` defaults. Their export has `"options": {}`, our
  skeleton has `"options": {"classOptions": {}}`. **Hypothesis**: equivalent
  after proto defaulting, since both are empty messages.

## Part 3 — web-import file

Produced, since Part 1 found concrete divergences:

- `.scratch/set-bonus-value/loop-103-106/our-settings-for-web-import.json`
- `.scratch/set-bonus-value/loop-103-106/our-settings-for-web-import.md`

## Conclusion

The 103 and 106 residues are **not defects in the swap builder, the gem
handling, or the sim request settings**. They are the sum of two things the
loop had no way to see until the export arrived:

1. The owner benchmarked on **different gear** — a better-geared character than
   the shredzepelin fixture our report ranks against. Worth +4.49 on the helm
   ordering, −7.9 on the package delta.
2. The owner benchmarked with a **different rotation** — wowsims' `TypeSimple`
   biteweave/mangleTrick preset, where our skeleton ships upstream's default
   APL. Worth +31 on the package delta and +3 to +7 on the helm ordering.

With both applied, our pipeline produces **+87.63** against the owner's +97 and
**+7.78** against the owner's ~+10 — close enough that the remaining gap is
plausibly iteration count, seed, and rounding in the owner's reading.

### For the director to consider proposing (I implemented nothing)

- The rotation is the big lever and it is **our** choice, not the owner's error:
  our skeleton pins upstream's default APL, and that APL is worth ~50 DPS *less*
  on the package delta than the TypeSimple preset the owner actually plays. If
  the report is meant to advise this player, the skeleton's rotation should
  match how they play. That is a `data/presets/feral/` change gated by
  `pnpm sim-defaults:check` — a `data-pipeline-work` job, not this loop's.
- The double drums specification (`partyBuffs.drums` **and**
  `consumables.drumsId`, at different strengths) is unexplained and unpriced.
- `278827` / `278819` in the shredzepelin baseline are not TBC item ids in the
  pinned db. Separate concern, possibly a fixture or id-mapping issue.
