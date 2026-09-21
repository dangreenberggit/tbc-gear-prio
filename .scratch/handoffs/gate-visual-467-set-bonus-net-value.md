# Gate-Visual handoff — ticket 467 (set-bonus net value on the Upgrades tab)

Seat: Visual (Step 10). Model: Opus 4.8. Judged: 2026-09-20.

## Provenance (from `index.json`)

- `forkHead`: `011b205408e8eaf096d73528f15b11789d60812a`
- `forkDirty`: not recorded in `index.json` (no `forkDirty` key present in this capture set).
- Origin / page: `http://localhost:5173` `/tbc/druid/feralcat/`
- `generatedAt`: 2026-09-21T02:16:01Z
- No per-entry `errors` (all entries `errors: []`).

## Fixture note (executor deviation, not a defect)

Captured by a custom CDP script (`visual-capture.mjs`) against a FERAL cat P5 run
with Thunderheart (676) in the pool, worn2 config (2 Thunderheart worn at
shoulder/chest; hands+legs vacated to neutral so a candidate reaches the 4pc). The
frozen `tab-review` harness renders zero set-bonus rows, so 467's credit control
and set-bonus cell/tooltip cannot be exercised on it. Layout matches
`test-review.mjs`; `facts.json` is authoritative (live DOM), PNGs are supporting.
The `...-1.png` table clips are captured at the table's own width, so the
right-aligned DPS text sits at the clip edge and looks cut on the 375 clips — the
full cell text is in `facts.json` and confirmed on the 1280 clip.

## a11y

No `a11y.json` was produced in this capture directory. a11y counts per state:
**not captured** — outside this capture set. (Not a 467 render-defect input; noted
so the executor's ledger records that Visual did not receive a11y data here.)

## Per-view verdicts

| View | Verdict | Evidence |
| --- | --- | --- |
| (i) OFF — credit group greyed, reads Full set | pass | `facts.json` `467-i-off.{375,1280}` `groupDisabled: true`, `fullChecked: true`, `splitDisabledOff: true`; `467-i-off-post-run-1280-0.png` / `-375-0.png` show the "Set credit" group greyed with "Full set" selected. |
| (ii) ON — credit group enabled; one signed total + one short hint, no wrap/scroll at 375 | pass | `facts.json` `467-ii-on.{375,1280}` `splitDisabledOn: false` (enabled), `firstSetRowCell: "+80.5 DPS"`, `firstSetRowHint: "hover for detail"`, `hintScroll` scrollWidth==clientWidth (103==103), `tableScroll` scrollWidth==clientWidth; `467-ii-on-post-run-1280-1.png` shows "Thunderheart Leggings … +80.5 DPS / hover for detail" on one line under a "DPS" header; `467-ii-on-post-run-1280-0.png` / `-375-0.png` show the enabled group. |
| (iii) split — first set row total changes and table re-sorts | pass | `facts.json` `467-iii-split.{375,1280}` `splitChecked: true`, `firstSetRowCell: "+26.8 DPS"` (vs +80.5 in (ii)); `467-iii-split-post-run-375-1.png` shows Thunderheart Leggings moved from rank 2 to rank 7 (re-sort); `467-iii-split-post-run-375-0.png` shows "Split share" selected. |
| (iv) tooltip — mode header, item-alone, activation, two totals with active marked (ranked) & equal to cell | pass (with one advisory sub-clause, below) | `facts.json` `467-iv-tip.{375,1280}` `tipText` = "Set credit: split share / This piece alone: +9.0 DPS / 4pc, 2 more: +71.5 (share +17.9) / Full set end state: +73.1 DPS / Total (full set): +80.5 DPS / Total (split share): +26.8 DPS (ranked)"; `467-iv-tip-post-run-1280-0.png` / `-375-0.png` render the same. Active total +26.8 is marked (ranked) and equals `467-iii-split` `firstSetRowCell` "+26.8 DPS". |

## Findings

| Finding | blocking / advisory | Evidence |
| --- | --- | --- |
| Tooltip "each break with a minus figure" clause not exercised: the worn2 Thunderheart fixture completes the 4pc without breaking a worn set bonus, so the tooltip has no broken-set line / minus figure to show. | advisory | `facts.json` `467-iv-tip.375.tipText` (no minus figure present); manifest NOTE (worn2 vacates hands/legs to neutral). Fixture-coverage gap, not a render defect. |
| "(ranked)" sits on the active total line, not the header. The canonical plan sentence reads "opens with 'Set credit: split share (ranked)'". | advisory | `facts.json` `467-iv-tip.375.tipText`: header is "Set credit: split share"; "(ranked)" is on "Total (split share): +26.8 DPS (ranked)". Matches the manifest entry-iv and `index.json` acceptance (both place "(ranked)" on the total line). Read as met: the mode is named in the header and the active total carries the (ranked) mark. |
| No `a11y.json` in this capture directory. | advisory | Directory listing: only `index.json`, `facts.json`, `manifest.json`, and the PNGs. a11y counts unavailable to this seat. |

None of the findings is a render-defect of a 467 element. The pre-existing 5-column
table width (>375px) is the merge-time layout gate's concern, not 467, and is not
raised here.

`contested:` none. No verdict contradicts a plan/executor stated fact — the fixture
deviation is documented in the manifest NOTE and is consistent with what I saw.

## Overall verdict for 467: **pass**

All four canonical views render as specified on the authoritative facts and the
supporting PNGs. The one unexercised sub-clause (broken-set minus figure) is a
fixture-coverage limitation of the non-breaking worn2 case, recorded advisory for
the executor's deviation ledger — the break-line rendering was not visually
exercised and should be confirmed on a breaking case (e.g. the owner's
Thunderheart-over-worn-Malorne-2pc case named in ticket 467) at or before merge.
