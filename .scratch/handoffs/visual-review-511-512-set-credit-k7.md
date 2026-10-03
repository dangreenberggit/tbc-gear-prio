# Visual review: 511-512-set-credit, chunk K7 (plan step 37, after K6B)

All six entries pass. There are no blocking findings.

This file replaces the handoff from the paused K7 run. That run judged the popover before the split, at fork `04de6a46`, from the captures now in `visual/k7-paused/`.

- Seat: gate-visual (Opus). Judged only. No git, no browser, no servers.
- Manifest: `.scratch/stage-gate/511-512-set-credit/visual/k7/manifest.json` (6 entries, 11 captures).
- Capture run: `.scratch/stage-gate/511-512-set-credit/visual/k7-review.log` prints `tab-review: fixture feral-p3-p2bis settled with 683 rows in 2.0s` and `TAB_REVIEW_VERDICT {"outcome":"captured","entries":11,"errors":0,...}`. The fixture is `data/tab-fixtures/feral-p3-p2bis.json` at main `5251fb23`, recorded at fork `f09d218e`.
- `index.json`: `forkHead` = `f09d218ed4e9afc2d1a1350f3b67572c33b5cd0b`, `forkDirty` = `false`, `generatedAt` = `2026-10-02T19:39:40.668Z`. Every entry has `errors: []`.
- Acceptance sentences:
  - The three Thunderheart entries (31034, 31048, 31039) use the K6B sentence from `plan-k6b-patch.md` 35B.6 (line 369), as plan item 8 ("Changes to other plan sections") requires. The manifest text matches it word for word.
  - The two dropped-set entries (33675, 33673) keep the K5ON sentence.
  - Ticket 511's "What would close this" (items 1-3) has no visual item. This review judges only the plan sentences.

## Per-entry verdicts

| Entry | Width | Verdict | Evidence |
|---|---|---|---|
| setpot-on | 1280 | pass | `facts.json` `setpot-on.1280.toggleChecked` = true. Every later entry also has `toggleChecked` = true at 1280 and at 653. |
| p2bis-31034-gauntlets | 1280 | pass | `p2bis-31034-gauntlets-post-run-1280-0.png`; `facts.json` `p2bis-31034-gauntlets.1280.line1`-`line6`, `headingCount` = 1, `dpsCell` = "+117.0set detail" |
| p2bis-31034-gauntlets | 653 | pass | `p2bis-31034-gauntlets-post-run-653-0.png`; `facts.json` `p2bis-31034-gauntlets.653.line1`-`line6`, `headingCount` = 1, `dpsCell` = "+117.0set detail" |
| p2bis-31048-pauldrons | 1280 | pass | `p2bis-31048-pauldrons-post-run-1280-0.png`; `facts.json` `p2bis-31048-pauldrons.1280.line1`-`line6`, `headingCount` = 1, `dpsCell` = "+117.0set detail" |
| p2bis-31048-pauldrons | 653 | pass | `p2bis-31048-pauldrons-post-run-653-0.png`; `facts.json` `p2bis-31048-pauldrons.653.line1`-`line6`, `headingCount` = 1, `dpsCell` = "+117.0set detail" |
| p2bis-31039-cover | 1280 | pass | `p2bis-31039-cover-post-run-1280-0.png`; `facts.json` `p2bis-31039-cover.1280.line1`-`line6`, `headingCount` = 1, `dpsCell` = "+35.4set detail" |
| p2bis-31039-cover | 653 | pass | `p2bis-31039-cover-post-run-653-0.png`; `facts.json` `p2bis-31039-cover.653.line1`-`line6`, `headingCount` = 1, `dpsCell` = "+35.4set detail" |
| p2bis-33675-dropped-584-tunic | 1280 | pass | `p2bis-33675-dropped-584-tunic-post-run-1280-0.png`; `facts.json` `p2bis-33675-dropped-584-tunic.1280.headingCount` = 0, `line1`-`line3`, `line4` = null, `dpsCell` = "-71.3set detail" |
| p2bis-33675-dropped-584-tunic | 653 | pass | `p2bis-33675-dropped-584-tunic-post-run-653-0.png`; `facts.json` `p2bis-33675-dropped-584-tunic.653.headingCount` = 0, `line1`-`line3`, `line4` = null, `dpsCell` = "-71.3set detail" |
| p2bis-33673-dropped-584-legguards | 1280 | pass | `p2bis-33673-dropped-584-legguards-post-run-1280-0.png` (row shows -10.7 with no "set detail"); `facts.json` `p2bis-33673-dropped-584-legguards.1280.tippyExists` = false, `tipCount` = 0, `subLine` = null |
| p2bis-33673-dropped-584-legguards | 653 | pass | `p2bis-33673-dropped-584-legguards-post-run-653-0.png` (same row, -10.7); `facts.json` `p2bis-33673-dropped-584-legguards.653.tippyExists` = false, `subLine` = null |

## The K6B check: Thunderheart rows

The popover text and the DPS cell are the same at 1280 and at 653 (`facts.json` `tipText` is identical for each row at both widths). The two `-0.png` captures of each row show the same lines.

| Row | Popover lines as shown (`line1`-`line6`) | Sum of shown lines | Total shown | DPS cell |
|---|---|---|---|---|
| Gauntlets 31034 | Item stats +3.7 / SET POTENTIAL / Thunderheart Leggings (2pc) +62.5 / Breaks Malorne Harness 2pc -59.1 / Thunderheart Pauldrons and Thunderheart Chestguard (4pc) +109.9 / Total +117.0 | 3.7 + 62.5 - 59.1 + 109.9 = 117.0 | +117.0 | +117.0 |
| Pauldrons 31048 | Item stats +14.7 / Breaks Malorne Harness 2pc -96.3 / SET POTENTIAL / Thunderheart Chestguard (2pc) +129.4 / Thunderheart Gauntlets and Thunderheart Leggings (4pc) +69.2 / Total +117.0 | 14.7 - 96.3 + 129.4 + 69.2 = 117.0 | +117.0 | +117.0 |
| Cover 31039 | Item stats -194.6 / SET POTENTIAL / Thunderheart Gauntlets (2pc) +174.2 / Breaks Malorne Harness 2pc -57.4 / Thunderheart Pauldrons and Thunderheart Chestguard (4pc) +113.2 / Total +35.4 | -194.6 + 174.2 - 57.4 + 113.2 = 35.4 | +35.4 | +35.4 |

How each clause of the sentence reads on these captures:

- **Item stats first, then the row's own break lines.** All three rows start with Item stats (`line1`). Only Pauldrons has an own break line: "Breaks Malorne Harness 2pc -96.3" is `line2`, above the heading (`line3` = "Set potential").
- **One Set potential heading.** `headingCount` = 1 for all three rows.
- **A step that breaks no worn bonus is one line.** Gauntlets `line3` (Leggings, 2pc), Cover `line3` (Gauntlets, 2pc), and both Pauldrons steps (`line4` Chestguard 2pc, `line5` Gauntlets and Leggings 4pc). Each names the pieces it adds and the count it reaches.
- **A step that breaks a worn bonus is two lines.** Gauntlets and Cover each have "Breaks Malorne Harness 2pc" with a negative value (`line4`: -59.1 and -57.4). The next line (`line5`) names the pieces and "(4pc)". `tipText` holds no lowercase "breaks" for any row, so no pieces line carries "breaks" text.
- **Pauldrons (own break only, no split step).** Its own swap already breaks Malorne 2pc, so neither of its Set potential steps breaks a worn bonus. Its popover has no Breaks line under the heading, which is what the sentence asks for in that case. It reads the same as in the paused run (`p2bis-31048-pauldrons-post-run-1280-0.png`).
- **Then Total.** `line6` is Total for all three rows. `line7` and `line8` are null, so the facts recorded every line.
- **The lines add up to the Total within 0.1 DPS.** The shown lines add up exactly for all three rows (table above).

Cross-check against the exact values. The source is `.scratch/stage-gate/511-512-set-credit/k7/compare-feral.out`, which ends `RESULT PASS`. Item stats and the 2pc steps are from the paused handoff's figures, which `compare-feral.out` shows are unchanged ("differing paths: 0; largest numeric difference 0").

- Gauntlets: 3.7274 + 62.5294 - 59.1672 + 109.8677 = 116.9573. The shown -59.1 is 0.067 from -59.1672. That is the largest gap on this row.
- Cover: -194.5627 + 174.2045 - 57.4646 + 113.2343 = 35.4115. The shown -57.4 is 0.065 from -57.4646.
- Pauldrons: 14.6905 - 96.2603 + 129.3192 + 69.2079 = 116.9573. The shown +129.4 is 0.081 from 129.3192, the largest gap of all three rows.
- X - Y for the shown lines: Gauntlets 109.9 - 59.1 = 50.8 against the step 50.7005; Cover 113.2 - 57.4 = 55.8 against 55.7697. Both are within 0.1.

Each DPS cell equals its popover Total at both widths (`dpsCell` facts). At 1280, `setpot-on-post-run-1280-0.png` also shows the cells before any hover: Gauntlets +117.0 (rank 1), Pauldrons +117.0 (rank 4), Cover +35.4 (rank 7). This order matches `compare-feral.out` ("top 5 [31034, 31042, 31044, 31048, 33716]").

## The dropped-set check: set 584

- Tunic 33675: the DPS cell reads -71.3 (`dpsCell`). The popover shows Item stats +25.0, the row's own break line "Breaks Malorne Harness 2pc -96.3", and Total -71.3. There is no Set potential heading (`headingCount` = 0) and no step line (`line4` = null). The tunic `-0.png` captures at both widths show only those three lines. 25.0 - 96.3 = -71.3.
- Legguards 33673: the DPS cell reads -10.7. The row has no "set detail" link (`subLine` = null), and no popover opened (`tippyExists` = false). The sentence allows a row with no popover.

## No-break space in facts.json

The facts strings hold a no-break space (U+00A0) between "Harness" and "2pc". The caller says this is intended. Every popover PNG shows "Malorne Harness 2pc" with an ordinary-looking space.

## Findings

| Finding | Severity | Evidence |
|---|---|---|
| The row clip (the second capture) of every hovered entry shows the site's top navigation bar, not the table row. The four 1280 row clips are byte-identical (md5 `dee501ee...`). The 653 clips of Pauldrons and Tunic are byte-identical (md5 `abc0ab37...`). The 653 clips of Gauntlets and Cover differ in bytes but also show only the navigation bar. No PNG shows any hovered row at 653. The DPS-cell verdicts rest on the `dpsCell` facts and, at 1280, on `setpot-on-post-run-1280-0.png`. The paused run had the same defect. Cause unknown (hypothesis: the capture script, or a fixed nav bar over the scrolled row). The Legguards row clip, the only capture of its entry, renders correctly. | advisory | `p2bis-31034-gauntlets-post-run-1280-1.png`, `p2bis-31034-gauntlets-post-run-653-1.png`, `p2bis-31039-cover-post-run-653-1.png`, `p2bis-31048-pauldrons-post-run-653-1.png`, `p2bis-33675-dropped-584-tunic-post-run-653-1.png` |
| The Gauntlets 2pc line now reads +62.5. The paused run's capture read +62.6, and plan 35B.6 (W-L6) quotes +62.6 for the fixture recorded before K6B. The exact value is 62.5294, so +62.5 is the nearer tenth. The step's DPS is unchanged (`compare-feral.out`, largest numeric difference 0). Only the rounding spread changed, because the step now has one more line. Not contested: W-L6 describes the fixture before the re-record, and plan item 8 replaces that check for step 37. | advisory | `facts.json` `p2bis-31034-gauntlets.1280.line3` |
| Shown step lines differ from the exact values by up to 0.081 DPS, which is less than 0.1. The lines still add up exactly to the Total. | advisory | `facts.json` `p2bis-31048-pauldrons.1280.line4` (+129.4 against 129.3192); `p2bis-31034-gauntlets.1280.line4` (-59.1 against -59.1672) |
| `setpot-on-post-run-1280-0.png` renders the page down to about 900 px and is blank below that. It is a full-page capture of a setup step that this review does not judge. | advisory | `setpot-on-post-run-1280-0.png` |
| axe color-contrast (serious) fails on epic-purple item names (`#a335ee` on dark rows, ratio 2.35-3.59). This is existing row styling and is outside this acceptance. No violation is on a popover. | advisory | `a11y.json` `setpot-on/1280` (13 nodes), `p2bis-33673-dropped-584-legguards/1280` and `/653` (1 node each) |

## a11y counts per state (`a11y.json`)

| State | Violations |
|---|---|
| setpot-on/1280 | color-contrast (serious): 13 nodes (item names in the results table) |
| p2bis-31034-gauntlets/1280 | 0 |
| p2bis-31034-gauntlets/653 | 0 |
| p2bis-31048-pauldrons/1280 | 0 |
| p2bis-31048-pauldrons/653 | 0 |
| p2bis-31039-cover/1280 | 0 |
| p2bis-31039-cover/653 | 0 |
| p2bis-33675-dropped-584-tunic/1280 | 0 |
| p2bis-33675-dropped-584-tunic/653 | 0 |
| p2bis-33673-dropped-584-legguards/1280 | color-contrast (serious): 1 node (the Legguards item name in the below-cutoff table) |
| p2bis-33673-dropped-584-legguards/653 | color-contrast (serious): 1 node (same element) |
