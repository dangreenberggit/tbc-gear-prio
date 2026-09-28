# Visual review: 502-other-pieces-rule, popovers (plan steps 8 and 10)

- Seat: gate-visual (Opus 5.5)
- Manifest: `.scratch/stage-gate/502-other-pieces-rule/visual/popovers/manifest.json`. It has 27 entries, all with the same acceptance sentence. `visual/base/manifest.json` is byte-identical to it (checked with `cmp`).
- 502 capture (r1): `.scratch/stage-gate/502-other-pieces-rule/visual/popovers/`. From its `index.json`: `forkHead` = `cd2ca288a309aaeb4e9697590d9d8d92ed8d6f9a`, `forkDirty` = `true`, `generatedAt` = `2026-09-27T23:24:34.607Z`, 0 entry errors.
- Base capture: `.scratch/stage-gate/502-other-pieces-rule/visual/base/`. From its `index.json`: `forkHead` = `cd2ca288a309aaeb4e9697590d9d8d92ed8d6f9a`, `forkDirty` = `false`, `generatedAt` = `2026-09-27T23:34:40.971Z`, 0 entry errors.
- Earlier capture (r0): `.scratch/stage-gate/502-other-pieces-rule/visual/popovers-r0/`. In r0 the row clips showed the tab nav bar. r1 fixed this.
- Ticket: `.scratch/carry-forward/issues/502-scenario-d-tier4-outranks-new-tier-staff.md`
- Expected lines: `.scratch/stage-gate/502-other-pieces-rule/recordings/popover-{nordrassil4,p2bis,ret,th}.txt`

The capture directories may not be committed. Every figure this verdict relies on is quoted below.

## Per-ticket verdict

| Ticket | Half of the sentence | Verdict | Evidence |
|---|---|---|---|
| 502 | Set potential ON: order, one `{item name} stats` line per piece, one line per row at 1280, figure in the right-hand column, lines add up to Total, Total = row DPS cell | **pass** | ON entries and ON `-row` entries in `popovers/`; `popovers/facts.json` `*-on.1280` `tipText` and `dpsCell` |
| 502 | ON popover and row legible at 375 (31034, 31039 in nordrassil4) | **pass** | `popovers/nordrassil4-31034-on-post-run-375-0.png`, `popovers/nordrassil4-31039-on-post-run-375-0.png`, `popovers/nordrassil4-31034-on-row-post-run-375-0.png`, `popovers/nordrassil4-31039-on-row-post-run-375-0.png` |
| 502 | Set potential OFF: each popover or row reads the same as the same recording rendered by the base code | **pass** | all 12 OFF PNGs are byte-identical between `popovers/` and `base/`; OFF facts and OFF a11y results are equal (see below) |

Ticket 502's Visual acceptance is met on every part of the sentence. No blocking findings.

## ON half, per entry (502 capture)

"Sum" is the popover lines added up, checked by hand. Every popover line matches the expected text in `recordings/popover-*.txt` word for word and figure for figure. The base column is shown for context only; the ON half is judged on the 502 capture.

| Entry (width) | Lines under SET POTENTIAL (`popovers/facts.json`) | Sum = Total | Row DPS as rendered | Base Total (`base/facts.json`) | Verdict |
|---|---|---|---|---|---|
| nordrassil4-29096-on (1280) | Malorne Harness 2pc (0/2) +93.1; Gauntlets of Malorne stats -8.2 | -7.3 -47.2 +93.1 -8.2 = +30.4 | +30.4 (`nordrassil4-29096-on-row-post-run-1280-0.png`) | +53.5 | pass |
| nordrassil4-31034-on (1280) | 2pc (0/2) +103.1; Chestguard stats +12.7; 4pc (0/4) +79.4; Pauldrons stats +4.6; Leggings stats +7.8 | +18.7 -47.2 +103.1 +12.7 +79.4 +4.6 +7.8 = +179.1 | +179.1 (`nordrassil4-31034-on-row-post-run-1280-0.png`) | +154.0 | pass |
| nordrassil4-31034-on (375) | same as 1280 | +179.1 | +179.1 (`nordrassil4-31034-on-row-post-run-375-0.png`) | +154.0 | pass |
| nordrassil4-31039-on (1280) | 2pc (0/2) +103.1; Gauntlets stats +18.7; Breaks Nordrassil Harness 4pc -47.2; 4pc (0/4) +79.4; Chestguard stats +12.7; Leggings stats +7.8 | -202.0 +103.1 +18.7 -47.2 +79.4 +12.7 +7.8 = -27.5 | -27.5 (`nordrassil4-31039-on-row-post-run-1280-0.png`) | -66.7 | pass |
| nordrassil4-31039-on (375) | same as 1280 | -27.5 | -27.5 (`nordrassil4-31039-on-row-post-run-375-0.png`) | -66.7 | pass |
| nordrassil4-29100-on (1280) | Malorne Harness 2pc (0/2) +93.0; Breastplate of Malorne stats -7.3 | -10.0 -47.2 +93.0 -7.3 = +28.5 | +28.5 (`nordrassil4-29100-on-row-post-run-1280-0.png`) | +50.8 | pass |
| p2bis-29099-on (1280) | Malorne Harness 4pc (2/4) +21.3; Gauntlets of Malorne stats -21.2 | -36.5 +21.3 -21.2 = -36.4 | -36.4 (`p2bis-29099-on-row-post-run-1280-0.png`) | -15.2 | pass |
| p2bis-29097-on (1280) | no popover; `tipCount` = 0 | n/a | -21.3 (`p2bis-29097-on-post-run-1280-0.png`) | +0.1 (base had a popover: Item stats -21.3; Malorne Harness 4pc (2/4) +21.4; no picture taken, manifest is row-only) | pass |
| p2-30132-on (1280) | no SET POTENTIAL section; the expected lines in `popover-ret.txt` have none either | -13.2 = -13.2 | -13.2 (`p2-30132-on-row-post-run-1280-0.png`) | +7.8 (base counted Crystalforge 4pc (1/4) +21.0) | pass (nothing to order) |
| th-hands-legs-31039-on (1280) | Thunderheart Harness 4pc (2/4) +73.2; Thunderheart Chestguard stats +28.7 | -81.0 +73.2 +28.7 = +20.9 | +20.9 (`th-hands-legs-31039-on-row-post-run-1280-0.png`) | -7.9 | pass |

Every popover shows its lines on one line each, with figures right-aligned. The 375 popovers have the same layout as at 1280, with no wrap and no cut-off text.

Every ON entry and ON `-row` entry has `toggleChecked` = `true` in both captures.

The ON figures differ from the base on purpose: that is ticket 502's change. Whether the new figures are right for the game is the SME seat's call, not this seat's.

## OFF half: 502 capture compared with the base

| OFF entry | PNG, `popovers/` vs `base/` | Facts | a11y |
|---|---|---|---|
| nordrassil4-29096-off (popover: Item stats -7.3; Breaks Nordrassil Harness 4pc -47.2; Total -54.5) | byte-identical | equal | 0 = 0 |
| nordrassil4-31034-off (popover: +18.7; -47.2; Total -28.5) | byte-identical | equal | 0 = 0 |
| nordrassil4-29100-off (popover: -10.0; -47.2; Total -57.2) | byte-identical | equal | 0 = 0 |
| p2-30132-off (popover: Item stats + Crystalforge Battlegear 2pc -13.2; Total -13.2) | byte-identical | equal | 0 = 0 |
| nordrassil4-29096-off-row (rank 169, -54.5) | byte-identical | equal | 1 = 1, same node |
| nordrassil4-31034-off-row (rank 56, -28.5) | byte-identical | equal | 1 = 1, same node |
| nordrassil4-29100-off-row (rank 185, -57.2) | byte-identical | equal | 1 = 1, same node |
| p2-30132-off-row (rank 65, -13.2) | byte-identical | equal | 1 = 1, same node |
| nordrassil4-31039-off (row only, -202.0) | byte-identical | equal | 1 = 1, same node |
| p2bis-29099-off (row only, -36.5) | byte-identical | equal | 1 = 1, same node |
| p2bis-29097-off (row only, -21.3) | byte-identical | equal | 1 = 1, same node |
| th-hands-legs-31039-off (row only, -81.0) | byte-identical | equal | 1 = 1, same node |

How each column was checked:
- **PNG:** I compared the file bytes of every PNG in `popovers/` with the file of the same name in `base/`. All 12 OFF files are identical, and all 19 ON files differ. I also opened `base/nordrassil4-29096-off-post-run-1280-0.png` and confirmed it renders the same popover.
- **Facts:** I compared `facts.json` in both folders for every OFF key. This agrees with `base/check-b.txt`, which reports "OFF entries compared 12, OFF entries differing 0".

## Findings

| Finding | Class | Evidence |
|---|---|---|
| Resolved in r1: the row clips show the item row, not the tab nav bar. | resolved | every `*-row-post-run-*-0.png` in `popovers/` and `base/` |
| At 375 the row is wider than the table's scroll area, so the source column is cut off at "Hy…". The base code shows the same cut-off, so 502 did not cause it. The DPS figure is fully readable in both. | advisory, pre-existing | `popovers/nordrassil4-31034-on-row-post-run-375-0.png` vs `base/nordrassil4-31034-on-row-post-run-375-0.png`; `popovers/nordrassil4-31039-on-row-post-run-375-0.png` vs `base/nordrassil4-31039-on-row-post-run-375-0.png` |
| The 375 popover clips show only the box, so where it sits in the viewport is not recorded. The box itself is complete in both captures. | advisory | `popovers/nordrassil4-31034-on-post-run-375-0.png`, `base/nordrassil4-31034-on-post-run-375-0.png` |
| axe `color-contrast` (serious, 1 node) flags the epic-purple item name in every row clip. The base code has exactly the same count on every entry and width, so 502 did not cause it. On two ON rows (`p2-30132-on-row`, `th-hands-legs-31039-on-row`) the node path differs only because the row moved between the above-cutoff and below-cutoff tables, which is an expected ON rank change. No popover clip has a violation in either capture. | advisory, pre-existing | `popovers/a11y.json` vs `base/a11y.json`, all 31 keys |

No `contested:` line.

## a11y counts per state (502 capture; the base has the same count for every key)

| Entry / width | Violations |
|---|---|
| nordrassil4-29096-off/1280 | 0 |
| nordrassil4-31034-off/1280 | 0 |
| nordrassil4-31039-off/1280 | 1 (color-contrast, item name) |
| nordrassil4-29100-off/1280 | 0 |
| nordrassil4-29096-off-row/1280 | 1 |
| nordrassil4-31034-off-row/1280 | 1 |
| nordrassil4-29100-off-row/1280 | 1 |
| nordrassil4-29096-on/1280 | 0 |
| nordrassil4-31034-on/1280 | 0 |
| nordrassil4-31034-on/375 | 0 |
| nordrassil4-31039-on/1280 | 0 |
| nordrassil4-31039-on/375 | 0 |
| nordrassil4-29100-on/1280 | 0 |
| nordrassil4-29096-on-row/1280 | 1 |
| nordrassil4-31034-on-row/1280 | 1 |
| nordrassil4-31034-on-row/375 | 1 |
| nordrassil4-31039-on-row/1280 | 1 |
| nordrassil4-31039-on-row/375 | 1 |
| nordrassil4-29100-on-row/1280 | 1 |
| p2bis-29099-off/1280 | 1 |
| p2bis-29097-off/1280 | 1 |
| p2bis-29099-on/1280 | 0 |
| p2bis-29097-on/1280 | 1 |
| p2bis-29099-on-row/1280 | 1 |
| p2-30132-off/1280 | 0 |
| p2-30132-off-row/1280 | 1 |
| p2-30132-on/1280 | 0 |
| p2-30132-on-row/1280 | 1 |
| th-hands-legs-31039-off/1280 | 1 |
| th-hands-legs-31039-on/1280 | 0 |
| th-hands-legs-31039-on-row/1280 | 1 |

Every count of 1 is the same color-contrast violation on the item name.
