# SME rank judgment — ticket 223 ret P2 racing-ratio slice

## Verdict

**trust-with-caveats**

The ranking the repaired script produces is domain-sane. The screened-out set
is exactly what a ret paladin would ignore. But one printed number is
misleading in game terms, and one sentence in the reconciled docs is a claim
the ret run does not support.

## What was reviewed

- Character: ret paladin, pre-raid tuning fixture, `maxPhase 2`.
- Results from `npx tsx packages/core/test/measure-racing-ratio.ts`, run at
  `HEAD` of `feat/candidate-pool`. Reproduced the ticket's numbers exactly:
  eligible 240, full sims 233, screening sims 264, promoted 210, screened-out
  30, above-cutoff 78, ratio 0.9708.
- Item-level detail from a throwaway probe built from the same script (dumped
  names, slots and deltas per row). Probe deleted; tree is clean.
- Diff `2d11bd3..HEAD`: `packages/core/src/rank.ts`,
  `packages/core/test/measure-racing-ratio.ts`,
  `docs/plans/wowsims-tab/candidate-pool.md`, and the ticket file.

## Game problems

### 1. The 30 screened-out items are correct

Every one of the 30 is a deep loss, from -44.9 down to -81.3 DPS. In game
terms they fall into two groups a ret would never look at twice:

- **Wrong armour class.** Cowl of Nature's Breath, Big Bad Wolf's Head,
  Stonebough Jerkin, Forest Wind Shoulderpads, Bark-Gloves of Ancient Wisdom,
  Gnarled Chestpiece of the Ancients, Earthsoul Leggings, Runetotem's Mantle,
  Coral-Barbed Shoulderpads, Sunhawk Leggings, Fathom-Helm of the Deeps. A
  paladin wears plate. Cloth or leather in a plate slot throws away the armour
  and the stat budget both. These belong at the bottom.
- **Healer or caster plate.** Breastplate of the Lightbinder, Legplates of the
  Innocent, Brighthelm of Justice, Gauntlets of Renewed Hope, Pauldrons of the
  Justice-Seeker, Panzar'Thar Breastplate, Heart-Flame Leggings, Fire Crest
  Breastplate, Glowing Breastplate of Truth, Pauldrons of the Argent Sentinel.
  Spell power and mana regen do nothing for a ret's damage. Correct to drop.

The trinkets screened out — The Lightning Capacitor, Pendant of the Violet
Eye, Spyglass of the Hidden Fleet, Scarab of Displacement — are caster or
tanking trinkets. Correct.

The two screened weapons are also right: Despair and Legacy carry no
ret-relevant hit or crit budget for this tier and sit far below what the
character already holds.

**No finding here.** The screened-out set contains nothing a ret would want.
This is the strongest evidence in the slice that the repaired script produces
a real ranking rather than noise.

### 2. "78 above-cutoff of 240" is not what a game reader will think it means

The printed `above-cutoff rows: 78` counts all 30 screened-out rows as above
the cutoff. Verified: every one of the 30 screened items appears in the
`!belowCutoff` set, and 48 + 30 = 78.

In game terms this says a helm that loses the character 79 DPS is "above the
cutoff" — that is, worth showing as an upgrade. It is not. The genuine
above-cutoff set is **48 items**, and that is the number a ret would recognise
as sane for a pre-raid P2 pool of 240: roughly 3 to 4 real upgrades per slot
across 14 slots, thinning to 2 or 3 in the slots the character has already
solved (neck 3 of 17, finger 3 of 25, back 4 of 21).

48 of 240 is sane for ret P2. 78 of 240 is not, and the docs quote 78.

### 3. The 48 genuine upgrades look right for the tier

- Belt of One-Hundred Deaths at the top (+51.4) is the correct answer. It is
  the standard pre-raid and early-raid ret waist, a well-known strong piece.
- Twinblade of the Phoenix (+43.5) then Lionheart Executioner (+38.0) is the
  expected weapon ordering for this tier. Both are normal persistent loot you
  keep, not encounter-only items.
- Dragonspine Trophy (+25.2) as the top trinket is the community answer for
  every physical melee spec in this tier. Correct.
- Crystalforge Breastplate and Crystalforge War-Helm both showing (+24.2,
  +21.5) is right — that is the ret tier set and those pieces should rank.
- Furious Gizmatic Goggles (+23.3) at rank 7 is correct **only if the
  character is an engineer**. Goggles are profession-locked. If the fixture's
  ret is not an engineer, this row is unwearable and should not appear.
- Merciless Gladiator's Scaled Helm and Merciless Gladiator's Greatsword are
  arena loot, not raid loot. They are legitimate persistent gear and belong in
  a ranking, but a reader comparing this against a raid list should know two of
  the 48 come from a different acquisition path.
- Justicar Breastplate and Justicar Crown appearing far down (+6.9, +6.9) is
  correct — that is the previous, weaker paladin set.

Nothing well-known for ret P2 is conspicuously **absent** from the 48.

### 4. `ranged` has 4 eligible and 0 above cutoff

A ret paladin's ranged slot is a libram, and a libram's value is its effect,
not its stat line. Four eligible with nothing clearing the cutoff is plausible
if the character already holds a good libram, but it is the one slot where a
zero could instead mean the effect is not being valued. Flagged as unsure
rather than as a defect — an engineer should confirm librams are scored on
their effect and not on an empty stat map.

## Rows that look fine

The 48 genuine upgrades, in the order shown. Ordering below about +10 DPS sits
inside noise a ret would not argue over — Ring of Lethality at +2.8 against
Zierhut's Lost Treads at +2.8 is not a real ordering and nobody should try to
defend it.

## On the doc claims

### "Corroborates the feral P2 figure" — fair

0.9708 on ret P2 beside 0.9837 on feral P2 is a fair reading. Two specs, two
armour profiles, two candidate pools, same answer to within 1.3 points. As a
game-domain matter these are independent enough that agreement means
something.

### "At K=210 racing barely beats a full sweep" — fair for these two pools, over-reach as written

The sentence in `rank.ts` says "two pools, same conclusion that at K=210
racing barely beats a full sweep". Both pools are **P2 pre-raid pools**. A P2
pre-raid pool is shallow and flat by nature: the character owns few good
items, so most of the pool is a plausible upgrade and almost everything gets
promoted. That is a property of the tier, not of K.

A P3 pool behaves differently in game. The character already wears
near-optimal gear, most candidates are obvious losses, and far fewer deserve a
full sim. The one P3 figure on record (feral P3, 0.6457) says exactly that. So
"two pools agree" is really "two pools *of the same tier* agree", and the docs
should say so. As written a reader will carry "racing barely helps" into P3,
where the recorded number contradicts it.

### candidate-pool.md: "raising K promotes more of the pool, so the ratio can only rise" — fine

That is arithmetic, not a game claim, and it is right.

## Gate

**Would I trust this output as a ret who knows the game? Yes for the ranking,
no for the reported above-cutoff count.**

Before yes on the whole slice:

1. Stop reporting 78 as the above-cutoff figure, or say plainly that it
   includes 30 rows that were never measured and are all large losses. The
   game-facing number is 48.
2. Narrow the "two pools, same conclusion" sentence to P2 pools, so it does not
   read as a claim about P3.
3. Confirm the fixture ret has engineering, or drop Furious Gizmatic Goggles.

None of these change the ratio 0.9708 itself, which reproduces and is sound.

## Notes for engineering

- Screened-out rows are being counted as above-cutoff. 48 + 30 = 78.
- Goggles on a possibly-non-engineer character.
- Nothing above the cutoff in the libram slot — check librams are valued on
  their effect.
