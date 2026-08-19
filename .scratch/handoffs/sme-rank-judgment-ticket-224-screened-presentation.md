# SME rank judgment — ticket 224 screened-candidate presentation (feral-p3)

## Verdict

**trust-with-caveats** — for the presentation change itself.

Ticket 224 does what it set out to do. The name-ordered ruled-out block reads as
a set, not as a weak second ranking, and the promoted rows are untouched. I would
ship the presentation change.

The caveat is not about the presentation. It is about what the rows contain. The
weapon slot is carrying a large number of items a druid cannot equip, and one of
them is printed as a ranked upgrade at #16. That is a game-correctness problem
that ticket 224 neither caused nor fixes, but it sits in the output being judged,
so it is recorded below.

## What was reviewed

- Character: druid, feral spec, `maxPhase 3` (feral-p3).
- Output file:
  `C:\Users\dgree\AppData\Local\Temp\claude\C--Users-dgree-Code-lulz-tbc-gear-prio\adac01f1-dd57-43c4-8f15-17ddfb11911f\scratchpad\sme-input.txt`
  — weapon and trinket slots only: ranked rows, the new ruled-out disclosure, and
  a contrast block of the old screening-delta ordering.
- Produced by: `npx tsx packages/core/test/zz-render-224.ts`, script (throwaway,
  not committed) at
  `C:\Users\dgree\AppData\Local\Temp\claude\C--Users-dgree-Code-lulz-tbc-gear-prio\adac01f1-dd57-43c4-8f15-17ddfb11911f\scratchpad\render-224.ts`
- Item facts checked against `data/items/index.json` in the repo; weapon type
  codes against the `WeaponType` enum in `packages/core/src/proto/common_pb.ts`.

### Data caveat carried through this whole review

The **screening side is MODELLED, not shipped.** `DerivedNoiseSimRunner` perturbs
recorded truth with seeded Gaussian noise scaled `stdev/sqrt(iterations)`,
independent across candidates, **one fixed draw (draw 0)**. No artifact of a real
shipped screening ordering exists. Real screening shares one seed across
candidates, so real errors are plausibly correlated, and correlated errors
preserve order better than independent ones. Every `screen ~Δ` figure quoted
below is a **modelled** number. The truth side (full-iteration deltas on promoted
rows) is real recorded 3,000-iteration sims.

## Answers to the three questions

### 1. Trinket — does the ruled-out block still read as a ranking?

**No. Name order kills the priority reading.** This one works.

The 12 ruled-out trinkets run Ashtongue Talisman of Equilibrium, Eye of
Magtheridon, Memento of Tyrande, Moroes' Lucky Pocket Watch, Prism of Inner Calm,
Romulo's Poison Vial, Scarab of Displacement, Sextant of Unstable Currents,
Shadowmoon Insignia, Spyglass of the Hidden Fleet, The Lightning Capacitor, The
Skull of Gul'dan. That is visibly A-to-Z. A reader who knows the game reads it as
a list of things that were looked at and set aside, which is what it is.

Compare the old ordering in the same file: it opened Spyglass of the Hidden
Fleet, Eye of Magtheridon, Romulo's Poison Vial. That top-three reads as "these
were the closest calls" — a priority claim. The modelled screening does not
support that claim, and the reordering removes it. The original complaint about
the 12-trinket pole is addressed.

One residual: the `screen ~Δ` figures are still on the line, so a determined
reader can re-sort mentally. Twelve rows is few enough to do that by eye. See
question 3 for whether that matters.

### 2. Weapon — do the promoted rows survive as a genuine ranking?

**Yes as a ranking; the ordering is intact and reads correctly.** Nothing above
the screening boundary moved, the absolute rank numbers are preserved (#1, #2,
#3, #4, #16, #24, #29, #34), the tie groups survive, and the below-cutoff tail is
still delta-ordered under its own label. As a presentation-preservation check
this passes.

The top of the list is also game-plausible for feral. Vengeful Gladiator's Staff
at #1 (Δ96.75) and Staff of Natural Fury at #2 (Δ89.63) are both real feral
weapon-damage staves, and Pillar of Ferocity at #3 is the phase-3 feral staff
people actually chase. Wildfury Greatstaff and Terestian's Stranglestaff further
down are correct feral staves for their tiers. Cat and bear both scale off weapon
damage carried on the item rather than off the stat line, so the large top-end
gaps against the small mid-list ones look like the right shape.

Two of the ranked rows are **not equippable by a druid** — see Game problems.

### 3. Honesty — is the disclosure honest?

**Yes, with one wording fix I would make.**

Hiding 179 candidates behind one line is honest. The line says "179 candidate(s)
ruled out at screening (not ranked)" and names the flag that reveals them. It
states the count, states that they were not ranked, and offers the full list. A
reader is told exactly what was withheld and how to see it. Nothing is
misrepresented by the collapse.

**Showing the screening delta is the right call, not the wrong one.** Omitting
the number would be worse. Without a figure the reader cannot tell a candidate
that missed by a hair from one that is nowhere near, and has no basis to decide
whether to spend a full re-run on it. The tilde and the "screen ~" prefix already
mark it as approximate. For an engineering audience the number is the useful part
of the disclosure.

**The wording fix.** "Ruled out at screening" reads as a verdict about the item.
For most of these it is not — it is a verdict about a measurement that was not
precise enough to promote them. The honest reading of `screen ~Δ-25.65` on Hammer
of the Naaru is "measured roughly, came out below the bar, not measured further",
not "this item is bad". The trinket block shows the strain: the whole ruled-out
spread is roughly -24 to -40, while the ranked trinkets sit between +14 and -13. A
reader who assumes the screen figures are comparable to the ranked ones will
conclude these trinkets are far worse than they are. Consider "not promoted past
screening", or a one-line note that screening figures are low-precision and not
comparable to the ranked deltas.

I would not treat the near-boundary ordering as meaningful in either direction
here, because the screening side is modelled with independent noise and a single
draw. Whether the real correlated-error screening puts the same items near the
line is untested.

## Game problems

### P1 — a druid cannot equip 40 of the 78 ruled-out "weapons", and 2 of the ranked ones

In TBC a druid can wield **staff, mace (one- and two-hand), dagger, fist weapon
and polearm**. A druid cannot wield a **sword**, an **axe**, a **shield**, or a
held-in-off-hand item. Feral additionally uses no off-hand at all — cat and bear
forms occupy both hands with the main-hand weapon.

*Source note:* the druid proficiency list in the paragraph above is **recalled
game knowledge, not verified against a source in this repo** — the repo holds no
class-proficiency table to check it against, which is itself the point of this
finding. It is a well-established TBC rule and I am confident in it, but an
engineer acting on P1 should confirm it against a class reference before writing
a filter. Everything else in this finding — every item's `weaponType`,
`handType`, `slot` and `phase`, and the counts in the table — is **read directly
from `data/items/index.json`** with type codes resolved against the `WeaponType`
enum in `packages/core/src/proto/common_pb.ts`.

Counting `weaponType` in `data/items/index.json` across the 78 ruled-out weapon
rows:

| type | count | druid-legal? |
|---|---|---|
| Axe (1) | 7 | **no** |
| Dagger (2) | 12 | yes |
| Fist (3) | 3 | yes |
| Mace (4) | 14 | yes |
| Off-hand (5) | 11 | **no** |
| Polearm (6) | 0 | yes |
| Shield (7) | 11 | **no** |
| Staff (8) | 9 | yes |
| Sword (9) | 11 | **no** |

**40 of 78** are items no druid can put in a weapon hand. The shields are Aegis
of the Vindicator, Aldori Legacy Defender, Antonidas's Aegis of Rapt
Concentration, Bastion of Light, Bulwark of Azzinoth, Dragonheart Flameshield,
Felstone Bulwark, Illidari Runeshield, Kaz'rogal's Hardened Heart, Shield of
Impenetrable Darkness, Triptych Shield of the Ancients. The held-in-off-hand
items include Blind-Seers Icon, Karaborian Talisman, Fathomstone, Chronicle of
Dark Secrets, Jewel of Infinite Possibilities, Aran's Soothing Sapphire, Talisman
of Nightbane, Talisman of the Sun King, Scepter of Purification, Touch of
Inspiration, Signet of Unshakable Faith.

Worse, this is not confined to the hidden block. **Two ranked rows are swords:**

- **`#16 Cataclysm's Edge` Δ17.73 (0.91%)** — id 30902, `weaponType=9` (sword).
  Printed as a genuine ranked upgrade at rank 16. A druid cannot equip it.
- **`Twinblade of the Phoenix` Δ-21.82** — id 29993, `weaponType=9` (sword).
  Below cutoff, but still in the ranked projection.

**`Fist of Molten Fury`** (id 32945) is a legal weapon type for a druid but is
`handType=3`, an off-hand fist weapon. Feral does not use an off-hand, so its
Δ-479.66 is a comparison against nothing meaningful.

This is a candidate-eligibility problem, not a ticket 224 problem — but ticket 224
makes it more visible on the ranked side and less visible on the ruled-out side,
so it is worth recording now. Ticket 25 enforced `classAllowlist`, which is a
different rule: it catches items locked to one class, not items whose weapon type
a class never trained. Nothing outside the generated proto reads `weaponType` for
eligibility (searched `packages/core/src/` and `scripts/` for `WeaponTypeSword`
and `WeaponTypeAxe` — no hits).

### P2 — the deepest negative screen deltas mean "no weapon equipped", not "bad item"

The shield and off-hand rows cluster around Δ-470 to Δ-513, and `Fist of Molten
Fury` sits at Δ-479.66. Those are the deepest numbers on the page, and they are
not saying those items are terrible. They are saying that swapping a two-handed
feral staff for a shield leaves the character with no weapon damage. The
magnitude is a slot mismatch, not an item judgment. Once P1 is fixed these rows
should disappear rather than be re-scored. Until then, do not read the bottom of
the ruled-out list as information about item quality.

## Rows that look fine

- **All 20 trinkets**, ranked and ruled out, are genuinely `slot=trinket` and
  genuinely phase ≤ 3. No slot errors, no phase leakage.
- **Living Root of the Wildheart** appearing for a druid is correct — it is the
  druid-allowlisted trinket from ticket 25's table, and it belongs here.
- **Dragonspine Trophy #21 and Pendant of the Violet Eye #27** at the top of the
  trinket list is the expected feral shape for this tier.
- **Bloodlust Brooch and Hourglass of the Unraveller both at Δ0.00** is not
  suspicious on its face — an on-use trinket the sim does not fire and a proc that
  did not proc both land at exactly zero. Worth an engineering glance only to
  confirm they were simulated rather than silently skipped.
- The **weapon top four** (Vengeful Gladiator's Staff, Staff of Natural Fury,
  Pillar of Ferocity, Merciless Gladiator's Maul) are all correct feral
  two-handers and the ordering is defensible.
- **Counts reconcile**: 70 shortlist + 149 below cutoff + 179 ruled out = 398,
  matching `pool` and `ranking.items`. Nothing was lost in the partition.

## Gate

**Would I trust this output as a feral druid who knows the game?**

I trust the **presentation change**. The ruled-out block reads as a set, the
ranked rows are intact, and the disclosure tells the truth about what was
withheld. Ticket 224 can close on its own terms.

I do **not** yet trust the **weapon slot contents**, for reasons that predate this
ticket. Before yes:

1. Weapon-type proficiency is enforced for the class, so swords, axes, shields and
   held-in-off-hand items stop entering a druid's weapon slot. `Cataclysm's Edge`
   at rank #16 is what makes this a gate item rather than a cleanup item — it is
   above the fold and a player would act on it.
2. Feral's no-off-hand rule is applied, so off-hand-only weapons like `Fist of
   Molten Fury` stop being compared.
3. The ruled-out ordering claim is re-checked once a **real** shipped screening
   artifact exists. Everything above about near-boundary ordering rests on a
   modelled, independent-noise, single-draw (draw 0) screening side.

The trinket slot I would trust today, subject to the same modelled-screening
caveat.

## Notes for engineering

- `Cataclysm's Edge` is a sword shown as a ranked upgrade on a druid.
- Eleven shields and eleven off-hand items sit in a druid's weapon list.
- `Fist of Molten Fury` is an off-hand weapon; feral has no off-hand.
- The ~-500 deltas are "no weapon equipped", not "bad item" — do not tune on them.
- `Bloodlust Brooch` and `Hourglass of the Unraveller` both at exactly 0.00 —
  confirm they were simulated, not skipped.
- Consider rewording "ruled out at screening" to describe the measurement rather
  than the item, and add a note that screen figures are not comparable to ranked
  deltas.
