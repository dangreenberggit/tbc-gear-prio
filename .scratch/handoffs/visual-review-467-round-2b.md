# Visual review: ticket 467, upgrades-tab-closeout round 2b (Step 9)

Seat: gate-visual. Input: `.scratch/stage-gate/upgrades-tab-closeout/round-2b/`
(`index.json`, `feral-p2.json`, `ret-p2.json`, `feral-worn{4,3,2,1,0}.json`,
50 PNGs at width 1280). The capture directory is gitignored. This file
records every number that the verdicts use.

- `forkHead`: `5e00931759b3ff1b30495f705a81e77381fb95f3` (from `index.json`)
- `forkDirty`: `false` (from `index.json`)
- `rule490`: "best-stop (owner confirmed 2026-09-24)" (from `index.json`)
- Captured with: `capture2.mjs`, a scratchpad script, in headless Chrome
  against the live :5173 dev server with backend :3333 (`index.json`
  `capturedWith`). `pnpm tab-review` was not used.
- Primary states (`feral-p2`, `ret-p2`) load the Phase 2 preset gear with the
  page phase at 3. The `feral-worn*` states are constructed worn counts.

## Acceptance sentence judged (plan amendment N3)

> For each captured set row, the OFF figure is the row's own simmed delta.
> Walk every threshold named by a value line or a 'to reach Npc' break group,
> in threshold order, counting a missing value line as 0. Keep a running
> total of each threshold's value minus its group's break lines. Under
> best-stop, the ON figure equals OFF plus the largest running total, or OFF
> when none is positive. When the sub-line reads 'not counted', ON equals
> OFF. The tooltip is the same in both states. No DPS sub-line text extends
> past its cell.

How I applied the sentence: the "not counted" sub-line is now "uncounted". A
`breaks <set> <k>pc` line without "to reach" is the row's own break and is
already inside OFF. "activates Npc (included in this number)" is inside OFF.
"Full set end state" is not part of the credit. A value line that is not
shown counts as 0.

Method: a script matched every row that has a set sub-line in the `off` and
`on` row lists of each `<label>.json` by `itemId`. For each row it parsed the
tooltip, computed the running totals, and compared OFF + max(0, largest
running total) with the ON figure, using a tolerance of ±0.2 for the
one-decimal rounding. It also checked these conditions:

- The tooltip text and the sub-line are equal in the two states.
- No set row is present in only one state.
- Every non-set row present in both states has the same figure in both.
- No tooltip line is left unparsed.

## Per-state verdicts

| State | Verdict | Set rows | Evidence |
|---|---|---|---|
| feral-p2 (primary) | pass | 16/16 | `feral-p2-tip-Thunderheart-off.png`: Thunderheart Gauntlets, 2pc +74.1, then 4pc +114.2 − 96.2, gives totals 74.1 and 92.1. So ON = 3.7 + 92.1 = 95.8, and the capture shows +95.9. `feral-p2-tip-Thunderheart-on.png`: Chestguard, whose own break −96.2 is inside OFF −78.1. The totals are 74.1 and 188.3, so ON = +110.2 (shown +110.2). `feral-p2-tip-Nordrassil-{off,on}.png`: Handgrips 60.5 − 96.2 = −35.7, which is not positive, so ON = OFF = −14.8. `feral-p2-tip-Malorne-{off,on}.png`: Gauntlets −21.3 + 21.3 = 0.0 (shown +0.1). `feral-p2-tip-NordrassilChestplate-{off,on}.png`: −90.6 + 60.5 = −30.1. Breastplate of Malorne is worn, so it has no row (`feral-p2.json` `errors`). |
| ret-p2 (primary) | pass | 14/14 | `ret-p2-tip-Crystalforge-{off,on}.png`: Greaves −13.2 + 21.1 = 7.9 (shown +7.8). `ret-p2-tip-Justicar-{off,on}.png`: Crown −25.8 + 15.3 = −10.5. `ret-p2-tip-Lightbringer-{off,on}.png`: the only line is "Full set end state", so ON = OFF = +3.9. |
| feral-worn4 | pass | 15/15 | `feral-worn4-tip-BreastplateofMalorne-{off,on}.png`: 2pc +65.6, then 4pc 0 − 103.0. The totals are 65.6 and −37.4, so ON = −97.9 + 65.6 = −32.3. `feral-worn4-tip-NordrassilChestplate-{off,on}.png`: 65.2 − 103.0 = −37.8, so ON = OFF = −92.2. `feral-worn4.json`: Stag-Helm (head) has "to reach 2pc: breaks Thunderheart 4pc −76.9", so its totals are −11.3 and −114.3 and ON = OFF = −100.2. The table PNGs show no set row: `feral-worn4-table-off.png` and `-on.png` have the same md5 and hold 2 shortlist rows. |
| feral-worn3 | pass | 12/12 | `feral-worn3-tip-BreastplateofMalorne-{off,on}.png`: totals 63.5 and 63.5 + 69.5 − 115.3 = 17.7, so ON = −19.5 + 63.5 = 44.0 (shown +44.1). `feral-worn3-tip-NordrassilChestplate-{off,on}.png`: 63.0 − 115.3 = −52.3, so ON = OFF = −13.0. `feral-worn3-tip-Thunderheart-{off,on}.png`: only an "activates 4pc" line, so ON = OFF = +79.9. |
| feral-worn2 | pass | 15/15 | `feral-worn2-tip-Thunderheart-{off,on}.png`: Chestguard 28.0 + 78.0 = 106.0. `feral-worn2-tip-BreastplateofMalorne-{off,on}.png`: totals 62.3 and 62.3 − 108.6 = −46.3, so ON = 8.6 + 62.3 = 70.9. `feral-worn2-tip-GauntletsofMalorne-{off,on}.png`: the break is the row's own, inside OFF, so ON = −140.8 + 62.3 = −78.5. `feral-worn2-tip-NordrassilChestplate-{off,on}.png`: the 4pc value line is not shown (0) and the "to reach 4pc" break is −108.6, so ON = OFF = +15.1. |
| feral-worn1 | pass | 14/14 | `feral-worn1-tip-Thunderheart-{off,on}.png`: Pauldrons, "activates 2pc" inside OFF, 4pc (1/4) +108.1, so ON = 112.3 + 108.1 = 220.4 (shown +220.3). `feral-worn1.json`: the Malorne rows have totals 87.6 and 107.3, for example Mantle −9.7 + 107.3 = 97.6. |
| feral-worn0 | pass | 15/15 | `feral-worn0-tip-Thunderheart-{off,on}.png`: Chestguard 17.9 + 92.9 + 93.8 = 204.6. `feral-worn0.json`: every Nordrassil row is OFF + 44.8, and every Malorne row is OFF + 91.4. |

**Ticket 467, acceptance sentence: pass on all 7 states. 101 set rows checked;
0 fail.**

- Every row satisfies ON = OFF + max(0, largest running total) within ±0.2.
  The largest gap is 0.1, which comes from rounding.
- The tooltip text is the same OFF and ON on all 101 rows, and so is the
  sub-line.
- No set row is present in only one state.
- Every non-set row present in both states has the same figure in both:
  feral-p2 35, ret-p2 35, worn4 40, worn3 33, worn2 34, worn1 28, worn0 28.
- ON ≥ OFF on every set row, which is the best-stop property that plan
  amendment N1 states.
- The "(n/k)" counts match the pieces worn before the swap (ticket 479):
  "4pc (1/4)" at worn 1 (`feral-worn1-tip-Thunderheart-off.png`), "4pc (2/4)"
  at worn 2 (`feral-worn2-tip-Thunderheart-off.png`), and Malorne "4pc (2/4)"
  in feral-p2, where Mantle and Breastplate are worn
  (`feral-p2-tip-Malorne-off.png`, `feral-p2.json` `gearWorn`).
- Sub-line clause: every set sub-line in the 14 state lists reads
  "set detail". `feral-worn2.json` `probe493` measures 15 rendered sub-lines
  (15 more are in hidden per-slot panes and are skipped). Its `maxOverflow` is
  0 at 1280 and 768 and −3.5 at 653 and 375, at Source 7, 10 and 11 rem. None
  extends past its cell. The visual check agrees: no sub-line overprints the
  Source text on any table PNG, including the two-line Source rows in
  `feral-worn1-table-on.png` rows 11 and 13 and `ret-p2-table-on.png` row 11.
- The "uncounted" clause holds only because no row triggers it. No row in any
  state has the sub-line "uncounted" (see finding 8).

## Findings (placement and legibility)

| # | Finding | Severity | Evidence |
|---|---|---|---|
| 1 | Tooltips are readable. Every line is one line, and no figure wraps away from its label. The text is light on the dark tooltip background. Every tooltip is fully on screen (the smallest `tipRect.top` is 286). The widest is 386 px and the tallest is 85 px. Nothing is clipped. | pass (no defect) | `tipRect` in every `<label>.json` `captures` entry; `feral-worn4-tip-BreastplateofMalorne-on.png` (widest, 4 lines) |
| 2 | Known, ticket 495: the tooltip opens above its row, 10 px above the row top. It covers about 1 to 1.5 rows (50 to 85 px; the row pitch is about 56 px). It hides the item names, Slot, Source and, in some captures, the DPS figure of the row above, which is the value a reader compares against. | advisory (ticketed, 495) | `feral-worn0-tip-Thunderheart-off.png` (covers rank 2's Slot and Source); `feral-worn3-tip-BreastplateofMalorne-on.png` (covers the lower edge of rank 1's "+79.9 DPS" and the Source text of rank 2); `tipRect` and `rowRect` gap 9.7 to 10.4 px in every state JSON |
| 3 | Known, ticket 494: the future lines do not name their set. For example, "2pc (0/2): +62.3" follows "breaks Thunderheart Harness 2pc", and the tooltip does not explain "Full set end state". | advisory (ticketed, 494) | `feral-worn2-tip-GauntletsofMalorne-on.png`; `feral-worn4-tip-BreastplateofMalorne-on.png` |
| 4 | Known, ticket 495: DPS figures touch the Slot text with no gap ("Shoulder+220.3 DPS"). | advisory (ticketed, 495) | `feral-worn1-table-on.png` row 1; `feral-p2-table-on.png` row 2; `feral-worn0-table-on.png` row 3 |
| 5 | New and not ticketed: figures of 100 DPS or more (six characters, such as "+220.3 DPS") are wider than the 77 px DPS cell. They run about 8 to 12 px past the cell's right edge, where "set detail" ends, into the Source column. The gap to the Source text shrinks to about 3 px ("+220.3 DPS" next to "Black Temple"). No text overlaps, and it is legible. With "Set potential" ON, this is common: 4 of the top 4 rows in `feral-worn0-table-on.png`. Ticket 495 item 2 covers only the Slot side. | advisory | `feral-worn1-table-on.png` row 1; `feral-worn0-table-on.png` rows 1–4; `feral-worn2-table-on.png` row 1 (pixel estimates from enlarged crops, not DOM measurements) |
| 6 | New and not ticketed: the focus outline drawn around the DPS cell while its tooltip is open passes through glyphs. It crosses the figure's sign on the left and the "S" of "DPS" on the right, and it runs through the last letter of "set detail". The outline follows the element's content, which is wider than the cell. Text stays legible. | advisory | `feral-worn1-tip-Thunderheart-on.png` ("+220.3 DPS"); `feral-p2-tip-Thunderheart-on.png` ("+110.2 DPS"); `feral-p2-tip-NordrassilChestplate-off.png` ("-90.6 DPS") |
| 7 | Item names cut short with an ellipsis are ticket 489's owner trade-off. This review does not judge it. | not judged | `feral-p2-table-on.png` rows 1–4 |
| 8 | The "uncounted" (not-counted) branch is not exercised. All 202 set rows across the 14 state lists read "set detail", and `probe493` `texts` is `["set detail"]`. The sentence's clause holds only because no row triggers it. | advisory | `setLine` in all seven `<label>.json` files |
| 9 | Some off and on tooltip pairs show different rows, so their OFF and ON PNGs are not a same-row comparison. `feral-p2-tip-Thunderheart-off.png` is Thunderheart Gauntlets, and `-on.png` is Thunderheart Chestguard. The same-tooltip check for those rows rests on the row lists in `feral-p2.json`, which do match. | advisory | `feral-p2.json` `captures` |
| 10 | The sub-line fits with no spare room: `probe493` `maxOverflow` is exactly 0 at 1280 and 768. "set detail" ends on the cell's right edge. This meets the sentence, and any longer string would overflow. The probe ran on feral-worn2 only. The other states rely on the visual check. | advisory | `feral-worn2.json` `probe493` |

No finding blocks ticket 467's acceptance sentence. No `contested:` items.
Every figure and tooltip line in `index.json` matches the row lists, and the
`index.json` gear descriptions match `gearWorn` (for example, feral-p2 wears
Mantle and Breastplate of Malorne).

## Round 2 findings: dispositions

Findings from `.scratch/handoffs/visual-review-467-round-2.md`:

| Round-2 finding | Disposition | Evidence |
|---|---|---|
| The "hover for set detail" sub-line ran past the DPS column and overprinted the Source text (blocking for the tab) | **fixed.** The string is now "set detail" (63.6 px in the 77 px cell), and no row overprints. | `feral-worn2.json` `probe493` `maxOverflow` 0 at 1280 and 768; `feral-worn1-table-on.png` rows 11 and 13 and `ret-p2-table-on.png` row 11 (two-line Source, no overlap); `feral-worn2-tip-BreastplateofMalorne-on.png` ("Magtheridon's Lair" clear of "set detail") |
| DPS figures with 5 or more characters touch the Slot text (advisory) | **still present.** Now ticketed as 495 item 2. It also appears on the Source side for 6-character figures (finding 5 above). | `feral-worn1-table-on.png` row 1 ("Shoulder+220.3 DPS"); `feral-p2-table-on.png` row 2 |
| The `not_counted` branch was not exercised (advisory) | **still present.** It is now the "uncounted" string, and 0 rows use it. | `setLine` in all seven `<label>.json` files |
| No `.upgrades-baseline-summary` PNG clip (advisory) | **not applicable.** Round 2b has no `manifest.json` requesting it. The summary text is recorded instead. | `<label>.json` `summary`, for example `feral-worn2.json`: "Your current gear: 2603.6 DPS. Took 184s." |
| No a11y counts captured (round 2's a11y section) | **still present** | no `a11y.json` or `facts.json` in `round-2b/` |

## a11y counts per state

Not captured. The capture script wrote no `a11y.json` and no `facts.json`.
No a11y count can be reported for any of the 14 states (7 labels × OFF/ON).
The plan's layout-gate run (`failed:0 a11yFailed:0`, plan Step 6) is the only
a11y evidence for this tip. This review did not observe that run.

## Per-row arithmetic (all 101 set rows)

Running totals are cumulative across thresholds, in threshold order. Each
threshold adds its value line (0 when the line is not shown) plus its
"to reach" break lines (negative numbers). Expected ON = OFF + the largest
positive total, or OFF when no total is positive.

#### feral-p2 (16 set rows)

| Row | Slot | OFF | ON | Running totals (threshold: total) | Expected ON | Result |
|---|---|---|---|---|---|---|
| Thunderheart Gauntlets | Hands | +3.7 | +95.9 | 2pc: +74.1, 4pc: +92.1 | +95.8 | pass |
| Thunderheart Leggings | Legs | -11.6 | +80.5 | 2pc: +74.1, 4pc: +92.1 | +80.5 | pass |
| Nordrassil Handgrips | Hands | -14.8 | -14.8 | 4pc: -35.7 | -14.8 | pass |
| Nordrassil Feral-Kilt | Legs | -19.8 | -19.8 | 4pc: -35.7 | -19.8 | pass |
| Gauntlets of Malorne | Hands | -21.3 | +0.1 | 4pc: +21.3 | +0.0 | pass |
| Greaves of Malorne | Legs | -36.5 | -15.2 | 4pc: +21.3 | -15.2 | pass |
| Vengeful Gladiator's Dragonhide Tunic | Chest | -71.3 | -71.3 | none | -71.3 | pass |
| Thunderheart Chestguard | Chest | -78.1 | +110.2 | 2pc: +74.1, 4pc: +188.3 | +110.2 | pass |
| Vengeful Gladiator's Dragonhide Spaulders | Shoulder | -80.4 | -80.4 | none | -80.4 | pass |
| Thunderheart Pauldrons | Shoulder | -81.6 | +106.8 | 2pc: +74.1, 4pc: +188.3 | +106.7 | pass |
| Nordrassil Feral-Mantle | Shoulder | -86.7 | -26.2 | 4pc: +60.5 | -26.2 | pass |
| Nordrassil Chestplate | Chest | -90.6 | -30.1 | 4pc: +60.5 | -30.1 | pass |
| Primalstrike Vest | Chest | -113.5 | -113.5 | none | -113.5 | pass |
| Thunderheart Cover | Head | -194.6 | -102.4 | 2pc: +74.1, 4pc: +92.1 | -102.5 | pass |
| Stag-Helm of Malorne | Head | -202.1 | -180.8 | 4pc: +21.3 | -180.8 | pass |
| Nordrassil Headdress | Head | -206.4 | -206.4 | 4pc: -35.7 | -206.4 | pass |

#### ret-p2 (14 set rows)

| Row | Slot | OFF | ON | Running totals (threshold: total) | Expected ON | Result |
|---|---|---|---|---|---|---|
| Lightbringer Breastplate | Chest | +3.9 | +3.9 | none | +3.9 | pass |
| Lightbringer Greaves | Legs | +2.9 | +2.9 | none | +2.9 | pass |
| Crystalforge Greaves | Legs | -13.2 | +7.8 | 4pc: +21.1 | +7.9 | pass |
| Lightbringer Shoulderbraces | Shoulder | -14.0 | -14.0 | none | -14.0 | pass |
| Lightbringer War-Helm | Head | -15.2 | -15.2 | none | -15.2 | pass |
| Crystalforge War-Helm | Head | -16.0 | +5.1 | 4pc: +21.1 | +5.1 | pass |
| Lightbringer Gauntlets | Hands | -17.6 | -17.6 | none | -17.6 | pass |
| Crystalforge Shoulderbraces | Shoulder | -18.0 | +3.1 | 4pc: +21.1 | +3.1 | pass |
| Justicar Crown | Head | -25.8 | -10.5 | 4pc: +15.3 | -10.5 | pass |
| Crystalforge Gauntlets | Hands | -26.0 | -4.9 | 4pc: +21.1 | -4.9 | pass |
| Justicar Shoulderplates | Shoulder | -30.6 | -15.3 | 4pc: +15.3 | -15.3 | pass |
| Justicar Greaves | Legs | -31.0 | -15.7 | 4pc: +15.3 | -15.7 | pass |
| Justicar Gauntlets | Hands | -32.8 | -17.5 | 4pc: +15.3 | -17.5 | pass |
| Justicar Breastplate | Chest | -46.7 | -31.3 | 4pc: +15.3 | -31.4 | pass |

#### feral-worn4 (15 set rows)

| Row | Slot | OFF | ON | Running totals (threshold: total) | Expected ON | Result |
|---|---|---|---|---|---|---|
| Vengeful Gladiator's Dragonhide Tunic | Chest | -72.2 | -72.2 | none | -72.2 | pass |
| Vengeful Gladiator's Dragonhide Spaulders | Shoulder | -76.8 | -76.8 | none | -76.8 | pass |
| Nordrassil Feral-Mantle | Shoulder | -84.4 | -84.4 | 4pc: -37.8 | -84.4 | pass |
| Nordrassil Chestplate | Chest | -92.2 | -92.2 | 4pc: -37.8 | -92.2 | pass |
| Mantle of Malorne | Shoulder | -94.8 | -29.2 | 2pc: +65.6, 4pc: -37.4 | -29.2 | pass |
| Nordrassil Feral-Kilt | Legs | -96.7 | -96.7 | 4pc: -37.8 | -96.7 | pass |
| Vengeful Gladiator's Dragonhide Legguards | Legs | -97.3 | -97.3 | none | -97.3 | pass |
| Breastplate of Malorne | Chest | -97.9 | -32.3 | 2pc: +65.6, 4pc: -37.4 | -32.3 | pass |
| Stag-Helm of Malorne | Head | -100.2 | -100.2 | 2pc: -11.3, 4pc: -114.3 | -100.2 | pass |
| Nordrassil Handgrips | Hands | -100.8 | -100.8 | 4pc: -37.8 | -100.8 | pass |
| Nordrassil Headdress | Head | -101.9 | -101.9 | 4pc: -114.7 | -101.9 | pass |
| Gauntlets of Malorne | Hands | -106.6 | -41.0 | 2pc: +65.6, 4pc: -37.4 | -41.0 | pass |
| Fel Leather Gloves | Hands | -107.9 | -107.9 | none | -107.9 | pass |
| Primalstrike Vest | Chest | -116.6 | -116.6 | none | -116.6 | pass |
| Greaves of Malorne | Legs | -135.4 | -69.8 | 2pc: +65.6, 4pc: -37.4 | -69.8 | pass |

#### feral-worn3 (12 set rows)

| Row | Slot | OFF | ON | Running totals (threshold: total) | Expected ON | Result |
|---|---|---|---|---|---|---|
| Thunderheart Pauldrons | Shoulder | +79.9 | +79.9 | none | +79.9 | pass |
| Nordrassil Feral-Mantle | Shoulder | -5.1 | -5.1 | 4pc: -52.3 | -5.1 | pass |
| Nordrassil Chestplate | Chest | -13.0 | -13.0 | 4pc: -52.3 | -13.0 | pass |
| Mantle of Malorne | Shoulder | -15.9 | +47.6 | 2pc: +63.5, 4pc: +17.7 | +47.6 | pass |
| Nordrassil Feral-Kilt | Legs | -19.0 | -19.0 | 4pc: -52.3 | -19.0 | pass |
| Breastplate of Malorne | Chest | -19.5 | +44.1 | 2pc: +63.5, 4pc: +17.7 | +44.0 | pass |
| Nordrassil Handgrips | Hands | -22.7 | -22.7 | 4pc: -52.3 | -22.7 | pass |
| Thunderheart Cover | Head | -27.1 | -27.1 | none | -27.1 | pass |
| Gauntlets of Malorne | Hands | -29.9 | +33.6 | 2pc: +63.5, 4pc: +17.7 | +33.6 | pass |
| Greaves of Malorne | Legs | -59.7 | +3.8 | 2pc: +63.5, 4pc: +17.7 | +3.8 | pass |
| Stag-Helm of Malorne | Head | -118.7 | -55.2 | 2pc: +63.5, 4pc: +17.7 | -55.2 | pass |
| Nordrassil Headdress | Head | -118.9 | -118.9 | 4pc: -52.3 | -118.9 | pass |

#### feral-worn2 (15 set rows)

| Row | Slot | OFF | ON | Running totals (threshold: total) | Expected ON | Result |
|---|---|---|---|---|---|---|
| Thunderheart Chestguard | Chest | +28.0 | +106.0 | 4pc: +78.0 | +106.0 | pass |
| Nordrassil Chestplate | Chest | +15.1 | +15.1 | 4pc: -108.6 | +15.1 | pass |
| Breastplate of Malorne | Chest | +8.6 | +70.9 | 2pc: +62.3, 4pc: -46.3 | +70.9 | pass |
| Thunderheart Pauldrons | Shoulder | +2.1 | +80.1 | 4pc: +78.0 | +80.1 | pass |
| Nordrassil Feral-Mantle | Shoulder | -4.0 | -4.0 | 4pc: -108.6 | -4.0 | pass |
| Mantle of Malorne | Shoulder | -14.7 | +47.6 | 2pc: +62.3, 4pc: -46.3 | +47.6 | pass |
| Thunderheart Cover | Head | -109.4 | -31.4 | 4pc: +78.0 | -31.4 | pass |
| Vengeful Gladiator's Dragonhide Legguards | Legs | -110.4 | -110.4 | none | -110.4 | pass |
| Nordrassil Feral-Kilt | Legs | -118.9 | -118.9 | none | -118.9 | pass |
| Stag-Helm of Malorne | Head | -123.8 | -61.5 | 2pc: +62.3, 4pc: -46.3 | -61.5 | pass |
| Nordrassil Headdress | Head | -124.9 | -124.9 | 4pc: -108.6 | -124.9 | pass |
| Nordrassil Handgrips | Hands | -131.9 | -131.9 | none | -131.9 | pass |
| Greaves of Malorne | Legs | -136.6 | -74.3 | 2pc: +62.3 | -74.3 | pass |
| Gauntlets of Malorne | Hands | -140.8 | -78.5 | 2pc: +62.3 | -78.5 | pass |
| Fel Leather Gloves | Hands | -144.8 | -144.8 | none | -144.8 | pass |

#### feral-worn1 (14 set rows)

| Row | Slot | OFF | ON | Running totals (threshold: total) | Expected ON | Result |
|---|---|---|---|---|---|---|
| Thunderheart Pauldrons | Shoulder | +112.3 | +220.3 | 4pc: +108.1 | +220.4 | pass |
| Thunderheart Chestguard | Chest | +111.0 | +219.1 | 4pc: +108.1 | +219.1 | pass |
| Thunderheart Leggings | Legs | +100.6 | +208.7 | 4pc: +108.1 | +208.7 | pass |
| Nordrassil Feral-Mantle | Shoulder | +1.1 | +61.6 | 4pc: +60.5 | +61.6 | pass |
| Thunderheart Cover | Head | -3.4 | +104.7 | 4pc: +108.1 | +104.7 | pass |
| Nordrassil Chestplate | Chest | -3.8 | +56.7 | 4pc: +60.5 | +56.7 | pass |
| Mantle of Malorne | Shoulder | -9.7 | +97.6 | 2pc: +87.6, 4pc: +107.3 | +97.6 | pass |
| Breastplate of Malorne | Chest | -9.7 | +97.5 | 2pc: +87.6, 4pc: +107.3 | +97.6 | pass |
| Nordrassil Feral-Kilt | Legs | -19.3 | +41.2 | 4pc: +60.5 | +41.2 | pass |
| Nordrassil Handgrips | Hands | -22.3 | +38.2 | 4pc: +60.5 | +38.2 | pass |
| Gauntlets of Malorne | Hands | -30.5 | +76.8 | 2pc: +87.6, 4pc: +107.3 | +76.8 | pass |
| Greaves of Malorne | Legs | -34.5 | +72.8 | 2pc: +87.6, 4pc: +107.3 | +72.8 | pass |
| Stag-Helm of Malorne | Head | -220.6 | -113.3 | 2pc: +87.6, 4pc: +107.3 | -113.3 | pass |
| Nordrassil Headdress | Head | -221.8 | -161.3 | 4pc: +60.5 | -161.3 | pass |

#### feral-worn0 (15 set rows)

| Row | Slot | OFF | ON | Running totals (threshold: total) | Expected ON | Result |
|---|---|---|---|---|---|---|
| Thunderheart Chestguard | Chest | +17.9 | +204.6 | 2pc: +92.9, 4pc: +186.7 | +204.6 | pass |
| Thunderheart Gauntlets | Hands | +15.6 | +202.3 | 2pc: +92.9, 4pc: +186.7 | +202.3 | pass |
| Thunderheart Pauldrons | Shoulder | +8.6 | +195.3 | 2pc: +92.9, 4pc: +186.7 | +195.3 | pass |
| Nordrassil Chestplate | Chest | +5.2 | +50.0 | 4pc: +44.8 | +50.0 | pass |
| Nordrassil Feral-Mantle | Shoulder | +2.2 | +46.9 | 4pc: +44.8 | +47.0 | pass |
| Breastplate of Malorne | Chest | -2.0 | +89.3 | 2pc: +81.9, 4pc: +91.4 | +89.4 | pass |
| Nordrassil Handgrips | Hands | -4.2 | +40.6 | 4pc: +44.8 | +40.6 | pass |
| Thunderheart Leggings | Legs | -6.3 | +180.4 | 2pc: +92.9, 4pc: +186.7 | +180.4 | pass |
| Mantle of Malorne | Shoulder | -6.9 | +84.4 | 2pc: +81.9, 4pc: +91.4 | +84.5 | pass |
| Gauntlets of Malorne | Hands | -12.4 | +78.9 | 2pc: +81.9, 4pc: +91.4 | +79.0 | pass |
| Nordrassil Feral-Kilt | Legs | -13.7 | +31.1 | 4pc: +44.8 | +31.1 | pass |
| Greaves of Malorne | Legs | -29.1 | +62.2 | 2pc: +81.9, 4pc: +91.4 | +62.3 | pass |
| Thunderheart Cover | Head | -199.5 | -12.8 | 2pc: +92.9, 4pc: +186.7 | -12.8 | pass |
| Stag-Helm of Malorne | Head | -214.4 | -123.1 | 2pc: +81.9, 4pc: +91.4 | -123.0 | pass |
| Nordrassil Headdress | Head | -215.0 | -170.2 | 4pc: +44.8 | -170.2 | pass |
