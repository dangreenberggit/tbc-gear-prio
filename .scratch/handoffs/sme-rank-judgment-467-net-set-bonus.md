# SME rank judgment: net set-bonus handling, feral cat at worn Thunderheart 2

Round: `upgrades-tab-closeout/round-2`, Step 5. Ticket: 467 (with 476, 477, 478).
This file did not exist before this round, so nothing was replaced. An earlier
round's judgment on the same ticket is in a different file,
`.scratch/handoffs/sme-rank-judgment-467-set-bonus-net-value.md`; this file does
not supersede its text, only its verdict for this build.

## Verdict

**do-not-trust** for the "Set potential" ON view. The OFF view is trustworthy.

The ON arithmetic follows the 467 model exactly on every row. The problem is a
game fact the model gets wrong: at worn Thunderheart hands + legs, a Malorne or
Nordrassil piece for the head, shoulder or chest slot does **not** break the
Thunderheart 2pc. Malorne 2pc can be completed in those free slots with the
Thunderheart 2pc kept. The ON view subtracts the Thunderheart 2pc (−108.6) from
those rows anyway, and the tooltip tells the reader that the piece "breaks
Thunderheart Harness 2pc". Breastplate of Malorne shows −37.7 (ON rank 66). By the
game, its ON value is about +70.9 (8.6 + 62.3), which would put it at ON rank 3.

**contested:** the step's brief describes the Malorne/Nordrassil rows as rows
"which break the worn Thunderheart 2pc". That is true only for the hands and legs
pieces. It is false for Breastplate/Mantle/Stag-Helm of Malorne and Nordrassil
Chestplate/Feral-Mantle/Headdress.

## What was reviewed

- Character: feral cat, `/tbc/druid/feralcat/`, fork engine
  `371da7dce972ea8bf6267daadf9f20627f7e58bb` (confirmed with
  `git -C vendor/tbc-new-fork rev-parse HEAD`). Backend sim, 3000 iterations,
  baseline 2603.6 DPS.
- Worn gear (from `gearWorn` in `feral-worn2.json`): Wolfshead Helm, Choker of
  Endless Nightmares, Shoulderpads of the Stranger, Thalassian Wildercloak,
  Bloodsea Brigand's Vest, Vindicator's Dragonhide Bracers, Vengeful Gladiator's
  Staff, Idol of the Raven Goddess, **Thunderheart Gauntlets**, Belt of
  One-Hundred Deaths, **Thunderheart Leggings**, Shadowmaster's Boots, Band of the
  Eternal Champion, Unstoppable Aggressor's Ring, Tsunami Talisman, Bloodlust
  Brooch. Thunderheart (set 676) worn = 2, so the Thunderheart 2pc is active.
- Inputs, all under `.scratch/stage-gate/upgrades-tab-closeout/round-2/`:
  `sme-feral-worn2-off.json`, `sme-feral-worn2-on.json` (rows extracted from the
  rendered table, tooltips captured by hovering the DPS cell),
  `feral-worn2.json` (raw capture: worn gear, capture list, `errors: []`), and the
  PNGs `feral-worn2-table-{off,on}.png`,
  `feral-worn2-tip-{Thunderheart,Malorne,Nordrassil}-{off,on}.png`. I did not
  produce these; the executor captured them from the live tab. I read them as
  given.
- Set definitions read from the fork sim, `vendor/tbc-new-fork/sim/druid/item_sets.go`
  (grep for `Name: "Malorne Harness"` etc.):
  - Malorne Harness 2pc: 4% chance on a landed melee hit to gain 20 energy in
    Cat Form. 4pc: +30 Strength in Cat Form.
  - Nordrassil Harness: **no 2pc in the sim**. 4pc: Shred +75 damage.
  - Thunderheart Harness 2pc: Mangle (Cat) costs 5 less energy. 4pc: Rip, Swipe
    and Ferocious Bite deal 15% more damage.
- Item slots and set ids read from `data/items/index.json` (python lookup by id):
  Malorne 640 and Nordrassil 641 each have a head, shoulder, chest, hands and legs
  piece. Thunderheart 676 worn pieces are hands (31034) and legs (31044).

## Question 1: do the ON figures follow from OFF plus the tooltip lines?

Arithmetically, yes, on every set row. Computed from the two JSON files:

| Row | Slot | OFF | Tooltip terms added in ON | ON expected | ON shown |
|---|---|---|---|---|---|
| Thunderheart Chestguard | chest | +28.0 | +78.0 | +106.0 | +106.0 |
| Thunderheart Pauldrons | shoulder | +2.1 | +78.0 | +80.1 | +80.1 |
| Thunderheart Cover | head | −109.4 | +78.0 | −31.4 | −31.4 |
| Breastplate of Malorne | chest | +8.6 | +62.3 −108.6 | −37.7 | −37.7 |
| Mantle of Malorne | shoulder | −14.7 | +62.3 −108.6 | −61.0 | −61.0 |
| Stag-Helm of Malorne | head | −123.8 | +62.3 −108.6 | −170.1 | −170.1 |
| Greaves of Malorne | legs | −136.6 | +62.3 (break already in OFF) | −74.3 | −74.3 |
| Gauntlets of Malorne | hands | −140.8 | +62.3 (break already in OFF) | −78.5 | −78.5 |
| Nordrassil Chestplate | chest | +15.1 | −108.6 | −93.5 | −93.5 |
| Nordrassil Feral-Mantle | shoulder | −4.0 | −108.6 | −112.6 | −112.7 (rounding) |
| Nordrassil Headdress | head | −124.9 | −108.6 | −233.5 | −233.5 |
| Nordrassil Feral-Kilt | legs | −118.9 | none (break in OFF) | −118.9 | −118.9 |
| Nordrassil Handgrips | hands | −131.9 | none (break in OFF) | −131.9 | −131.9 |
| Vengeful Gladiator's Dragonhide Legguards | legs | −110.4 | none (break in OFF) | −110.4 | −110.4 |
| Fel Leather Gloves | hands | −144.8 | none (break in OFF) | −144.8 | −144.8 |

Every non-set row is identical in OFF and ON. No row subtracts a single break
twice. "Full set end state: +108.2" for Thunderheart matches the chest + shoulder
package (28.0 + 2.1 + 78.0 = 108.1), so the +78.0 4pc figure agrees with its own
package.

But a reader **cannot** tell from the tooltip which break line is already inside
OFF and which one ON adds. Nordrassil Chestplate (OFF +15.1, break not inside)
and Nordrassil Feral-Kilt (OFF −118.9, break inside) show the same line,
"breaks Thunderheart Harness 2pc: -108.6". The only difference is line order on
the Malorne rows. See finding F2.

## Findings

| # | Finding | Severity | Evidence |
|---|---|---|---|
| F1 | ON subtracts the Thunderheart 2pc from Malorne head/shoulder/chest rows although the Malorne 2pc can be completed in head/shoulder/chest with the Thunderheart 2pc kept. Breastplate of Malorne should be about +70.9 in ON, not −37.7; Mantle about +47.6, not −61.0; Stag-Helm about −61.5, not −170.1. Breastplate drops from OFF rank 9 to ON rank 66 when the game says it should rise to about rank 3. | **major** (misranks by 108.6 DPS; this is the case the ON view exists for) | Slots from `data/items/index.json` (Malorne 640 has head/shoulder/chest pieces; worn Thunderheart is hands/legs only). ON rows in `sme-feral-worn2-on.json`. The only gain credited is "2pc (1/2): +62.3"; no Malorne 4pc line is shown, so the row is charged a break that only the 4pc path needs (the 4pc takes 4 of 5 slots, so it must use hands or legs) while it is credited only the 2pc. |
| F2 | The tooltip states a false game fact on non-Thunderheart-slot pieces: "breaks Thunderheart Harness 2pc" on Breastplate/Mantle/Stag-Helm of Malorne and on Nordrassil Chestplate/Feral-Mantle/Headdress. The same text appears on hands/legs rows, where it is true and already inside OFF. The OFF tooltip shows the break too, next to an OFF figure that does not include it (Nordrassil Chestplate: "+15.1" with "breaks … -108.6"). | **major** for an engineer checking the fixes; the tooltip cannot be used to audit the ON figure | `feral-worn2-tip-Nordrassil-off.png`, `feral-worn2-tip-Malorne-off.png`; rows 30222 vs 30229 in both JSON files. |
| F3 | Nordrassil rows are charged the full Thunderheart 2pc loss in ON while no Nordrassil gain is credited or shown. No player would give up a 108.6 DPS bonus to complete a set whose bonus the tool itself values at nothing. For such a set, ON should equal OFF. Nordrassil Chestplate goes from OFF rank 5 (+15.1, breaks nothing) to ON rank 207 (−93.5). | **major** (same cause as F1) | ON − OFF = −108.6 on all three Nordrassil non-hands/legs rows; no Nordrassil future line in any tooltip. Because ON differs from OFF, the future bonus was measured (an unmeasured one would zero the whole credit, per `rankableSetPotential` in `view.ts`) and came out at or below the 5.09 floor. |
| F4 | The Nordrassil 4pc (Shred +75, per `item_sets.go`) comes out at or below 5.09 DPS. **Recalled, unverified:** a cat that Shreds as its main builder casts Shred often enough that +75 per Shred should be worth tens of DPS at 2600 DPS, not under 5. I cannot see the hidden number, so this is a suspicion, not a proven error. | minor / needs a number | Absence of any Nordrassil future line in both JSON files; ON − OFF arithmetic above. |
| F5 | This worn-2 run does not exercise the 476 case (worn 4 or more, a swap that breaks both 2pc and 4pc) or the 477 trigger (worn 3, commit path breaks a threshold no package measured), or 478 A4 (a same-set piece replacing a worn same-set piece: no such row here). It shows those fixes did not break the worn-2 arithmetic. It does not show they work. | note | Row list in both JSON files; ticket 476/477/478 trigger conditions. |
| F6 | The "hover for set detail" subline under the DPS figure overlaps the Source column text ("Black Temple") in the ON table. Visual, outside this seat's lane; noted for the visual seat. | cosmetic | `feral-worn2-table-on.png`, rows 1 and 2. |

## Question 2: is the ON reordering sensible, and are the magnitudes plausible?

- **Thunderheart Chestguard and Pauldrons rise to the top in ON: sensible.**
  Wearing Thunderheart 2 with chest and shoulder free, either piece is one step
  toward the 4pc, and the 4pc is a real DPS bonus. Chestguard +106.0 above
  Pauldrons +80.1 matches their own deltas (+28.0 vs +2.1).
- **Thunderheart Cover stays a loss in ON (−31.4): sensible.** The worn head is
  Wolfshead Helm. **Recalled, unverified:** Wolfshead's energy on shifting into
  Cat Form is why powershifting cats keep it over tier heads through most of TBC.
  All head candidates losing 110–125 DPS in OFF is what that predicts.
- **Malorne hands/legs and Nordrassil hands/legs falling: sensible.** They do
  break the worn Thunderheart 2pc, and that loss is already in OFF.
- **Malorne and Nordrassil head/shoulder/chest falling: not sensible.** See F1
  and F3. Malorne chest and shoulder should rise in ON; Nordrassil
  head/shoulder/chest should not move.
- **Thunderheart 4pc ≈ +78 (3.0% of 2603.6):** plausible. The sim's 4pc is +15%
  to Rip, Swipe and Ferocious Bite. **Recalled, unverified:** Rip plus Ferocious
  Bite are roughly a fifth of a cat's damage in a single-target fight, and 15% of
  that is about 3%.
- **Thunderheart 2pc B ≈ 108.6 (4.2%):** plausible but at the high end.
  **Recalled, unverified:** 5 energy off Mangle is a few percent more energy if
  Mangle is only kept up as a debuff. 4.2% fits if the rotation Mangles more often
  than that. I would not argue with it without a combat log. I am not confident
  whether the Thunderheart 2pc or 4pc is the larger one for TBC cats.
- **Malorne 2pc ≈ +62.3 (2.4%):** plausible. The sim's bonus is a 4% chance on a
  landed melee hit for 20 energy. **Recalled, unverified:** ferals commonly kept
  the Malorne 2pc into T5 because it was strong, which fits a value of this size.

## Question 3: what would mislead an engineer checking 476/477/478?

1. F2: the tooltip does not say which breaks are already in the figure, so
   "OFF + tooltip lines = ON" cannot be checked by reading one row. It works only
   if the reader already knows which slots the worn set occupies.
2. F1/F3: an engineer who sees the Malorne and Nordrassil rows fall in ON and
   the arithmetic check out will conclude the net model is right. The arithmetic
   is right. The break it subtracts does not exist in the game for those slots.
3. F5: a green worn-2 run is not evidence for 476 or 477; neither trigger is
   present.

## Rows that look fine

- All non-set rows are unchanged between OFF and ON.
- Everbloom Idol at the top of OFF (+40.8) over a worn Idol of the Raven Goddess:
  **recalled, unverified**, Everbloom adds Shred damage and is a normal cat idol
  upgrade.
- Vengeful Gladiator's Dragonhide Tunic has no set line: the PvP set bonuses do
  nothing for PvE damage, and one piece activates nothing.
- Every hands/legs row that replaces a worn Thunderheart piece has the −108.6 loss
  inside OFF exactly once and is not charged again in ON.
- "(3/4)" and "(1/2)" piece counts are correct for worn Thunderheart 2 and worn
  Malorne 0.

## Gate

As a feral who knows the game, I trust the OFF view. I do not trust the ON view
while it tells me Breastplate of Malorne costs me my Thunderheart 2pc. Before yes:

- A head, shoulder or chest piece of another set must not be charged a worn
  bonus that a cheaper threshold of its own set does not need to break. When the
  only credited gain is a 2pc that fits in free slots, the row's ON loss is 0.
- A set whose own future bonuses are credited at nothing must not be charged a
  commit break; its ON figure equals OFF.
- The tooltip must not say a piece "breaks" a worn bonus unless equipping that
  piece alone breaks it; a loss that only the full-set path causes needs its own
  wording.
- 476 and 477 need their own live cases (worn Thunderheart 4 with a
  tier-swap candidate; worn 3) before anyone reads them as confirmed live.

## Notes for engineering

- Malorne chest at worn Thunderheart hands+legs: shown −37.7 in ON, game says
  about +70.9.
- Nordrassil chest at worn Thunderheart hands+legs: shown −93.5 in ON, game says
  +15.1 (same as OFF).
- Same tooltip line means "already in the number" on hands/legs and "added in ON"
  on chest/shoulder/head.

## Confidence and caveats

- The ON arithmetic check is exact, computed from the two JSON files.
- F1 and F3 rest on slot data read from `data/items/index.json` and on the set
  rule that any two pieces of a set turn on its 2pc. High confidence.
- My statement that the break comes from the 4pc path is an inference from the
  tooltip (only the 2pc is credited, and only the 4pc path must use hands or legs).
  I did not trace the engine to prove it, and the skill does not ask me to.
- F4 and all magnitude judgments are recalled game knowledge, unverified. The
  hidden Nordrassil 4pc value is not in the inputs.
- One run at 3000 iterations; single-row deltas under about 5 DPS are noise.
