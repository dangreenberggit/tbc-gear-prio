# Visual review: ticket 536, non-set rows show their set break

Verdict for ticket 536: **pass**. All four manifest entries meet their
acceptance sentence. There is one advisory finding about the capture
script, which is not a defect in the tab: every row clip (`*-1.png`) shows
the tab's navigation bar, not the row.

## Capture provenance

From `.scratch/stage-gate/536-non-set-breaks/visual/index.json`:

- `forkHead`: `cdb4235059eb48486030268ef467125b97f5e442`. This matches the
  commit the executor named.
- `forkDirty`: `false`
- `generatedAt`: `2026-10-03T06:35:16.116Z`
- `errors`: empty for all four entries.
- Fixture: `feral-p2-malorne4`, state `post-run`, width 1280. No pane.

## Per-entry verdicts

| Entry | Acceptance (from manifest) | Verdict | Evidence |
| --- | --- | --- | --- |
| `536-mal4-29995-off` | DPS cell +15.0 with sub-line 'set detail'. Popover has exactly 'Item stats +37.9', 'Breaks Malorne Harness 4pc -22.9', 'Total +15.0'. | pass | `536-mal4-29995-off-post-run-1280-0.png` shows the three lines in order. `facts.json` `536-mal4-29995-off.1280`: `dpsCell` "+15.0set detail", `subLine` "set detail", `tipCount` 1, `lineCount` 3, `line1`..`line3` as required, `line4` null. |
| `536-mal4-30055-off` | Popover has exactly 'Item stats +12.9', 'Breaks Malorne Harness 4pc -22.9', 'Total -10.0'. | pass | `536-mal4-30055-off-post-run-1280-0.png` shows the three lines in order. `facts.json` `536-mal4-30055-off.1280`: `lineCount` 3, `line1`..`line3` as required, `line4` null. |
| `536-mal4-30222-off` | Set row still has exactly 'Item stats +5.5', 'Breaks Malorne Harness 4pc -22.9', 'Total -17.4'. Its Breaks line has the same form as row 29995's. | pass | `536-mal4-30222-off-post-run-1280-0.png` shows the three lines in order. `facts.json` `536-mal4-30222-off.1280` `line2` is the same string as `536-mal4-29995-off.1280` `line2`: "Breaks Malorne Harness", a non-breaking space (U+00A0), "4pc -22.9". In the two PNGs the Breaks line has the same layout: label on the left, value on the right, same font and colour. |
| `536-mal4-29995-on` | The same as `-off`, with the set-potential toggle on. | pass | `facts.json` `536-mal4-29995-on.1280` `toggleChecked` is true (the `-off` entry has false), so the toggle click took effect. `dpsCell`, `subLine`, `lineCount` and `line1`..`line3` are the same as the `-off` entry. The `-on` and `-off` PNGs are byte-identical: md5 of `-0.png` is `363ef7a92b2837849a30e9b6e0fbccd9` for both, and md5 of `-1.png` is `10e017b5ab75ed4073a1d3b00364cde6` for both (command: `md5sum *.png` in the capture directory). |

## Ticket 536 "What would close this"

1. A non-set row shows a "Breaks <set> <n>pc" line with the bonus value on
   current gear, and the line matches a set row's break line. **Met.**
   29995 and 30055 are non-set rows: in
   `data/tab-fixtures/feral-p2-malorne4.json` neither has a `setContext`.
   Both show "Breaks Malorne Harness 4pc -22.9". The fixture's
   `ranking.brokenSetValues` prices the Malorne Harness threshold-4 break
   at 22.857 DPS, which rounds to 22.9. Row 30222 is a set row and shows
   the same string (`facts.json` `line2`).
2. The row's DPS figure does not change. **Met.** `facts.json`
   `dpsCell` shows +15.0, -10.0 and -17.4. The fixture's `deltaDps` for
   29995, 30055 and 30222 is 14.976, -10.014 and -17.422.
3. A gate-visual judgement on a recorded fixture render that includes row
   29995. **Met** by this review.

## Findings

| Finding | Severity | Evidence |
| --- | --- | --- |
| The row clips show the tab's navigation bar (Gear, Settings, ..., Upgrades), not the requested result row. So the DPS cell's "+15.0" and "set detail" are confirmed by DOM text only, not by pixels. This is a defect in the capture script, not in the tab. Hypothesis, untested: the clip rectangle was taken in the wrong scroll frame. | advisory | `536-mal4-29995-off-post-run-1280-1.png`, `536-mal4-30055-off-post-run-1280-1.png`, `536-mal4-30222-off-post-run-1280-1.png`, `536-mal4-29995-on-post-run-1280-1.png` |
| The "Item stats" figure equals the rounded total minus the rounded break value, not the unrounded difference. For 29995, 14.976 + 22.857 = 37.833, which would round to 37.8, but the tab shows +37.9 = 15.0 + 22.9. 30055 (12.844 shown as +12.9) and 30222 (5.436 shown as +5.5) follow the same rule. As a result, the three lines add up exactly as shown. The set row 30222 follows the same rule, and the acceptance sentences give these figures, so this is not a defect for ticket 536. I record it so that the rule is known. Hypothesis, untested: the tab derives the line from the rounded figures. I checked only that the numbers fit this rule, not the code. | advisory | `facts.json` `line1` for all three rows; `data/tab-fixtures/feral-p2-malorne4.json` `ranking.items[].deltaDps` and `ranking.brokenSetValues[0].dps` |

There are no blocking findings, and nothing is contested.

## Accessibility counts per state

From `a11y.json`. Each state has zero violations:

| State | Violations | Scan time |
| --- | --- | --- |
| `536-mal4-29995-off/1280` | 0 | 1161 ms |
| `536-mal4-30055-off/1280` | 0 | 929 ms |
| `536-mal4-30222-off/1280` | 0 | 894 ms |
| `536-mal4-29995-on/1280` | 0 | 1128 ms |
