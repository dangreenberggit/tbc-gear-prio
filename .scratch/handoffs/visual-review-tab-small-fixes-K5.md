# Visual review: tab-small-fixes, unit K5 (tickets 605 and 606)

- Seat: gate-visual (Opus 5.5)
- Date: 2026-10-15
- Manifest: `.scratch/stage-gate/tab-small-fixes/visual/605-606b/manifest.json`
- Capture directory: `.scratch/stage-gate/tab-small-fixes/visual/605-606b/` (gitignored; this file stands on its own)
- `forkHead`: `899d8c2679596809cc58a25d80a7f1ce6cedf243` (`index.json`)
- `forkDirty`: `false` (`index.json`)
- Capture run: `run.log` ends `TAB_REVIEW_VERDICT {"outcome":"captured","entries":28,"errors":0,"a11yFailed":0,...}`; every entry in `index.json` has `errors: []` and one PNG.

## Verdicts

| Ticket | Verdict | Evidence |
| ------ | ------- | -------- |
| 605 (set-bonus popover side and name) | **pass** | Per-entry rows below. All 12 `-tip`/`-row` states at 375/653/768 have `tipSide` `top` and `tipRect.bottom` above `figureRect.top`; all at 1280 have `tipSide` `right` and `tipRect.left` (719) right of `figureRect.right` (708.9). `a11y.json` has `fail: []` and `warn: []` for all 24 605 states. |
| 606 (DPS figure inside the panel at 375) | **pass** | `facts.json` `606.375`: `row0DeltaRect` x 238–322 inside `scrollerRect` x 7–368; `scrollerScrollWidth` 602 > `scrollerClientWidth` 361. `606-post-run-375-0.png` shows the DPS column with its header in view and the Slot column cut at the right edge. |

Ticket 605 also asks for an assertion in `scripts/tab-harness/test-layout.mjs` on where the popover opens. That is a code condition, not a capture; this seat did not judge it.

## Ticket 605: per-entry verdicts

Acceptance (manifest, every 605 entry): "At 375, 653 and 768 the popover opens above the figure; at 1280 it opens to the right of the figure and may cover the row's own Slot cell; axe reports no aria-dialog-name."

Fixtures and rows: 605-313 = `feral-p3-p2bis` item 31042 ("Thunderheart Chestguard", trigger "-68.5"); 605-315 = `feral-p2-malorne4` item 29995 ("Leggings of Murderous Intent", trigger "+18.1"); 605-330 = `feral-p3-nordrassil4` item 31034 ("Thunderheart Gauntlets", trigger "-28.8"). `itemName` and `triggerText` in `facts.json` confirm each target row rendered; `tipShown` is 1 in all 24 states.

Coordinates are page pixels from `facts.json` (`tipRect`, `figureRect`, `slotRect`, `itemRect`, `rowRect`).

| Entry | Width | `tipSide` | Tip vs figure | Verdict | Evidence |
| ----- | ----- | --------- | ------------- | ------- | -------- |
| 605-313 | 375 | top | tip y 363–431.2, figure top 440.8 | pass | `605-313-row-post-run-375-0.png`, `605-313-tip-post-run-375-0.png` |
| 605-313 | 653 | top | tip y 363–431.2, figure top 440.8 | pass | `605-313-row-post-run-653-0.png`, `605-313-tip-post-run-653-0.png` |
| 605-313 | 768 | top | tip y 392–460.2, figure top 470.4 | pass | `605-313-row-post-run-768-0.png`, `605-313-tip-post-run-768-0.png` |
| 605-313 | 1280 | right | tip x 719–977.1, figure right 708.9 | pass | `605-313-row-post-run-1280-0.png`, `605-313-tip-post-run-1280-0.png` |
| 605-315 | 375 | top | tip y 363–431.2, figure top 440.9 | pass | `605-315-row-post-run-375-0.png`, `605-315-tip-post-run-375-0.png` |
| 605-315 | 653 | top | tip y 363–431.2, figure top 441.2 | pass | `605-315-row-post-run-653-0.png`, `605-315-tip-post-run-653-0.png` |
| 605-315 | 768 | top | tip y 363–431.2, figure top 441.7 | pass | `605-315-row-post-run-768-0.png`, `605-315-tip-post-run-768-0.png` |
| 605-315 | 1280 | right | tip x 719–978.2, figure right 708.9 | pass | `605-315-row-post-run-1280-0.png`, `605-315-tip-post-run-1280-0.png` |
| 605-330 | 375 | top | tip y 363–431.2, figure top 440.9 | pass | `605-330-row-post-run-375-0.png`, `605-330-tip-post-run-375-0.png` |
| 605-330 | 653 | top | tip y 363–431.2, figure top 441.7 | pass | `605-330-row-post-run-653-0.png`, `605-330-tip-post-run-653-0.png` |
| 605-330 | 768 | top | tip y 364–432.2, figure top 441.7 | pass | `605-330-row-post-run-768-0.png`, `605-330-tip-post-run-768-0.png` |
| 605-330 | 1280 | right | tip x 719–992.3, figure right 708.9 | pass | `605-330-row-post-run-1280-0.png`, `605-330-tip-post-run-1280-0.png` |

In every state the tip's horizontal span contains the figure's span when it opens on top, and the tip stays inside the viewport (`tipRect.right` at most 370.3 at `docClientWidth` 375).

Accessible name: `tipDialogRole` is `dialog` and `tipLabelledBy` is set (for example `base-ui-_r_la_`) in all 24 states; `tipText` starts with "Set-bonus breakdown", which does not appear in the tip PNGs, so the name text is present but not shown. For `-tip` entries axe runs on the popup itself (manifest `pane: false`, so `scripts/tab-harness/test-review.mjs:325` runs axe on `capture[0]`, the tip, while the hover is held). `a11yClassify` puts baselined findings in `warn` too (`scripts/tab-harness/test-tab-harness.mjs:566`), so an empty `warn` means axe found nothing, `aria-dialog-name` included. Before the fix the same rule fired on 12 of 12 tip captures (ticket 605, section 2).

## Ticket 606: per-width facts

Acceptance (manifest, entry `606`, fixture `ret-p3-p2`): "At 375 the first row's DPS cell lies inside the panel (its left and right between the panel's), and the panel still scrolls sideways for the remaining columns (scrollWidth > clientWidth)."

| Width | `scrollerRect` x | `row0DeltaRect` x | `scrollerScrollWidth` / `scrollerClientWidth` | Verdict | Evidence |
| ----- | ---------------- | ----------------- | --------------------------------------------- | ------- | -------- |
| 375 (the test) | 7–368 | 238–322 | 602 / 361 | **pass** | `facts.json` `606.375`; `606-post-run-375-0.png` |
| 653 (context) | 7–646 | 275–359 | 639 / 639 | context | `606-post-run-653-0.png` |
| 768 (context) | 7–761 | 390–474 | 754 / 754 | context | `606-post-run-768-0.png` |
| 1280 (context) | 310.1–1006.4 | 635.4–719.4 | 696 / 696 | context | `606-post-run-1280-0.png` |

`headerTexts` is "RankItemDPSSlotSourceFavoriteBatch sim" at all four widths, so DPS now comes before Slot. `row0DeltaText` is "+44.4". In `606-post-run-375-0.png`, `606-post-run-768-0.png` and `606-post-run-1280-0.png` the DPS header sits over the DPS numbers. At 653 and wider the table still fits its panel (scroll width equals client width), as before the change.

## Findings

| Finding | Severity | Evidence |
| ------- | -------- | -------- |
| At 375 and 653, for rows whose item name wraps to two lines, the popover's bottom edge covers about 6 px of the top of the row's own item name (the top of the first line, "Thunderheart"). The acceptance sentence does not forbid this; the session's reading of Q-606-popover-side drops the "never over the row's own Item or Slot cells" clause. | advisory | `605-313-row-post-run-375-0.png`, `605-330-row-post-run-375-0.png`; `facts.json` `605-313-row.375`: `tipRect` x 112–370.1 y to 431.2, `itemRect` x 88.5–227.5 y from 424.8; `605-313-row.653`: `tipRect` x 199–457.1, `itemRect` x 88.5–264.5 y from 424.8; `605-330-row.375` and `.653` the same (overlap 6.3 px and 5.5 px). |
| At 375, 653 and 768 (315 only at 768), the open-on-top popover also covers the top 6–13 px of its own row (padding above the figure, the top of the Slot cell). 605-313 and 605-330 at 768 do not reach their own row. | advisory | `facts.json` `605-315-row.375`: `rowRect.top` 418.3, `tipRect.bottom` 431.2, `itemRect.top` 433.25 (no item overlap); `605-313-row.768`: `rowRect.top` 466.4 > `tipRect.bottom` 460.2; `605-330-row.768`: `rowRect.top` 437.7 > `tipRect.bottom` 432.2. |
| At 1280 the right-opening popover covers the row's Slot cell, as allowed, and also the Source cell and the Favorite star; the batch-sim icon stays partly visible at the right edge. | advisory | `605-313-row-post-run-1280-0.png`, `605-315-row-post-run-1280-0.png`, `605-330-row-post-run-1280-0.png`; `facts.json` `605-*-row.1280`: `slotRect` x 719.4–817.4, `tipRect.right` 977.1–992.3, `rowRect.right` 1006.4. |
| `index.json` lists `staleBaseline: ["heading-order .ui-accordion-header"]`: that a11y baseline entry did not fire in this run. Every entry here has `pane: false`, so axe ran only on a row or a popup and could not reach the accordion header. This says nothing about whether the baseline entry is stale. | advisory | `index.json` `staleBaseline`; manifest `pane: false` on all 7 entries. |

No blocking findings.

## a11y counts per state

From `a11y.json`. Every state: fail 0, warn 0.

| Entry | 375 | 653 | 768 | 1280 |
| ----- | --- | --- | --- | ---- |
| 605-313-row | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| 605-313-tip | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| 605-315-row | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| 605-315-tip | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| 605-330-row | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| 605-330-tip | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| 606 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |

(Cells are fail / warn.)

## Contested

None. No verdict here contradicts a claim the plan or the executor states as fact. The first advisory finding depends on the session's reading of the owner's Q-606-popover-side answer (the Item-cell clause dropped); if that reading is reversed, the 375/653 states of 605-313 and 605-330 would need a fresh judgment.
