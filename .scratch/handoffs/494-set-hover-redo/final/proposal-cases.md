# Set-bonus popover (494): the approved design applied to five more cases, revision 3

The owner approved revision 2 for Mantle of Malorne ("Looks good", owner-feedback-2.md). This file applies the same design to five more cases, revised after the owner's answers in owner-feedback-3.md. Cases 1 and 5 are approved as they are. Rendered on fork 2d13cdc7 with `proposal.diff` applied. Earlier versions: `proposal-rev2.diff` (the approved Mantle row) and `proposal-cases-r1.diff` (the first version of these cases). Pictures are in `cases/`; widths are 1280 unless a name says otherwise.

Orchestrator's correction: the agent's summary counted 5 error causes and 6 expected causes for case 4. Its own cause table lists 6 errors and 5 expected causes, and its recommended logging sites are 6. The counts below are corrected to match the table.

## Rules

- A part of the figure that has no separate value is folded into the first line's label:
  - For an item that completes a bonus when equipped: "Item stats + {set} {n}pc".
  - For a worn bonus the item breaks, when its value couldn't be measured: "Item stats − {set} {n}pc".
- Every break reads "Breaks {set} {m}pc". That includes a break Set potential charges on the way to a bonus, which sits under the Set potential heading.
- A value the tool couldn't work out reads "couldn't measure", and Set potential adds nothing for it.
- A plain "Item stats" line is left out when it equals the figure. If the popover would then hold only its Total, the row has no popover and no "set detail" hint. The rule applies in each toggle state separately. A folded first line ("Item stats + …" or "Item stats − …") is always kept, because it is the only place that bonus is named. This rule answers ticket 517.
- When Set potential adds nothing, there is no Set potential section.
- A line shown in both states keeps the same value in both. The first line comes from the off-state figure, and in the on state the rounding difference goes to the Set potential lines. The lines always add up to the row's figure.
- On narrow screens, labels may wrap. A set name and its piece count stay together, and the figure sits on the label's last line.

## Case 1: an item that completes a bonus when equipped (approved)

Crystalforge Greaves (30132), fixture `ret-p3-p2`. The player wears 1 Crystalforge Battlegear piece.

Off (row: rank 65, -13.2):

    Item stats + Crystalforge Battlegear 2pc     -13.2
    Total                                        -13.2

On (row: rank 11, +7.8):

    Item stats + Crystalforge Battlegear 2pc     -13.2
    SET POTENTIAL
    Crystalforge Battlegear 4pc (1/4)            +21.0
    Total                                         +7.8

- **Item stats + Crystalforge Battlegear 2pc:** the greaves' own stats, plus the Crystalforge 2-piece bonus they complete with the piece you already wear, change your DPS by -13.2 together.
- **Crystalforge Battlegear 4pc (1/4):** you wear 1 of the 4 pieces this bonus needs, and Set potential adds its value to this row.
- **Total:** the row's figure.

How it adds up: off, -13.2. On, -13.2 + 21.0 = +7.8.

Numbers: `deltaDps` -13.2451. The 4pc is 21.0700, above the ret floor of 4.81. The on total is 7.8249. Ticket 511 records that the Crystalforge 4pc is a party heal that adds no ret DPS.

Pictures: case1-crystalforge-greaves-off.png, case1-crystalforge-greaves-on.png, case1-crystalforge-greaves-off-row.png, case1-crystalforge-greaves-on-row.png, case1-crystalforge-greaves-375-on.png.

## Case 2: nothing to add beyond the figure

Nordrassil Chestplate (30222), fixture `feral-p3-th-hands-legs`.

Off (rank 7) and on (rank 10): the cell reads "+16.8", with no "set detail" hint and no popover.

The figure is the chestplate's own stats (+16.8 against your current chest). Set potential adds nothing, for three reasons:
- The Nordrassil 4pc measures -60.46, which is below the 5.09 floor.
- Reaching it breaks your Thunderheart 2pc (106.24).
- The Nordrassil 2pc is `not-implemented-in-sim`.

A popover would only repeat the cell. Owner: "this is a tooltip that redunantly shows the same info twice, and its the same info that would also be in the row already without the tooltip, so its recursive redundancy. I think the answer here is no tooltip needed". The owner's alternative, a message such as "no measurable benefit from set bonuses", was not used. A player loses nothing without it: the row's figure is the item's own stats, the same as for any item from no set.

Pictures: case2-nordrassil-chest-off.png, case2-nordrassil-chest-on.png (the row with the figure hovered), case2-nordrassil-chest-off-row.png, case2-nordrassil-chest-on-row.png.

## Case 3: Set potential charges a break on the way to a bonus

Thunderheart Cover (31039), fixture `feral-p3-nordrassil4`. The player wears four Nordrassil Harness pieces and a helm from no set. A scan of all five fixtures found five rows where the rule charges such a break:
- Thunderheart Cover and Stag-Helm of Malorne in `feral-p3-nordrassil4`.
- Thunderheart Gauntlets, Leggings and Cover in `feral-p3-p2bis`.

Off (rank 279): the cell reads "-202.0", with no hint and no popover. The figure is the item's own stats.

On (rank 184):

    Item stats                                  -202.0
    SET POTENTIAL
    Thunderheart Harness 2pc (0/2)              +103.1
    Breaks Nordrassil Harness 4pc                -47.2
    Thunderheart Harness 4pc (0/4)               +79.4
    Total                                        -66.7

- **Item stats:** the Cover's own stats give 202.0 DPS less than the helm you wear now.
- **Thunderheart Harness 2pc (0/2):** you wear 0 of the 2 pieces this bonus needs, and Set potential adds its value.
- **Breaks Nordrassil Harness 4pc:** the second Thunderheart piece has to replace one of your Nordrassil pieces, which breaks the Nordrassil 4-piece bonus, and Set potential subtracts it.
- **Thunderheart Harness 4pc (0/4):** you wear 0 of the 4 pieces this bonus needs, and Set potential adds its value.
- **Total:** the row's figure.

How it adds up: -202.0 + 103.1 - 47.2 + 79.4 = -66.7.

Owner: ""getting 2 pc breaks" seems unnecessary. that could be wrong but i dont get this wordiness. you could just say "breaks..."".

Numbers: `deltaDps` -202.0457. Bonuses 103.1285 and 79.4277. The break is 47.1879. The on total is -66.6773.

Pictures: case3-thunderheart-cover-off.png, case3-thunderheart-cover-on.png, case3-thunderheart-cover-375-off.png, case3-thunderheart-cover-375-on.png, case3-thunderheart-cover-off-row.png, case3-thunderheart-cover-on-row.png.

## Case 4 (synthetic): a value the tool couldn't measure

Mantle of Malorne (29100), fixture `synthetic/feral-p3-nordrassil4-unmeasured.json`. This is a copy of `feral-p3-nordrassil4` with three values deleted on this row: the Nordrassil 4pc break value and both Malorne bonus values. It models the engine failing to measure the Nordrassil 4pc bonus, which also leaves both Malorne values unset (`rank.ts:2037-2087`, `2548-2579`). These pictures are synthetic.

Off (rank 185):

    Item stats − Nordrassil Harness 4pc          -57.2
    Total                                        -57.2

On (rank 179):

    Item stats − Nordrassil Harness 4pc          -57.2
    SET POTENTIAL
    Malorne Harness 2pc (0/2)         couldn't measure
    Malorne Harness 4pc (0/4)         couldn't measure
    Total                                        -57.2

- **Item stats − Nordrassil Harness 4pc:** the mantle's stats, minus the Nordrassil 4-piece bonus it breaks, change your DPS by -57.2. The split between the two couldn't be measured.
- **Malorne Harness 2pc (0/2) couldn't measure:** the tool tried to work out this bonus's value and could not, so Set potential adds nothing for it. The same holds for the 4pc line.
- **Total:** the row's figure. It is the same in both states.

Why "couldn't measure". Owner: ""couldnt measure" and "not measured" are two different things though, so if theres a better way thats not longer text that would be more accurate, that would be better. Maybe even "error measuring"". The engine has 11 causes that leave such a value unset (fork `upgrades/engine/rank.ts`):

| Cause | Where | Kind | Console log today |
| --- | --- | --- | --- |
| No neutral replacement item for a vacated slot (break value) | 2368 | expected | none |
| A higher threshold's break value of the same set is missing, so this one is skipped | 2316 | expected (dependent) | none |
| Gem repair threw while measuring a break | 2384-2386 | error | none |
| Sim threw while measuring a break | 2394-2395 | error | none |
| Too few set pieces in the pool to build the bonus package | 1740 | expected | none |
| Gem repair threw while measuring a bonus package | 1775-1790 | error | none; a page "substitutions" line says "the sim failed" even for a repair failure (1528-1533) |
| Sim threw while measuring a bonus package | 1805-1819 | error | none; same page line |
| Worn-1 4pc: no break-free pair of pieces for the correcting pair sim | 1873-1889, 2042 | expected | none |
| Worn-1 4pc: gem repair threw for the pair | 2159-2161 | error | none |
| Worn-1 4pc: the pair sim threw | 2168-2169 | error | none |
| A bonus's correction needs a break value that is missing | 2070-2073, 2087 | expected (dependent) | none |

That is 6 errors and 5 expected cases. "couldn't measure" is true for all of them. "error measuring" is false for the 5 expected cases. It is 3 characters longer than "not measured". None of these causes writes to the browser console today (no `console.` call exists under `upgrades/engine/`), so the owner's assumption that errors are logged does not hold. Adding logging to the 6 error sites is a separate change to a ported engine file.

Pictures: case4-synthetic-mantle-unmeasured-off.png, case4-synthetic-mantle-unmeasured-on.png, case4-synthetic-mantle-unmeasured-375-off.png, case4-synthetic-mantle-unmeasured-375-on.png, case4-synthetic-mantle-unmeasured-off-row.png, case4-synthetic-mantle-unmeasured-on-row.png.

## Case 5: the approved Mantle row at 768 and 375 (approved)

The text is identical to revision 2 at both widths and in both states. The popover opens above the figure and stays inside the screen:

| Width | State | Popover left edge (px) | Popover right edge (px) |
| --- | --- | --- | --- |
| 768 | off | 418 | 698 |
| 768 | on | 417 | 698 |
| 375 | off | 90 | 370 |
| 375 | on | 89 | 370 |

At 375 the table row itself runs past the right edge of the screen, as it did before this work. check-mantle-1280-off.png and check-mantle-1280-on.png confirm that the approved 1280 popover is unchanged.

Pictures: case5-mantle-768-off.png, case5-mantle-768-on.png, case5-mantle-375-off.png, case5-mantle-375-on.png, and their -row pictures.

## Ticket 517

After this change a plain "Item stats" line never equals the figure. A scan of all five fixtures found no row where one would, and the code drops it when it does. A folded first line can still equal the figure, and it stays:
- case 1 off, which is 4 rows in `ret-p3-p2`
- case 4

That line is the only place the completed or unmeasured bonus is named. 517 closes with this change.
