# Visual review: tab-view-filter, unit 527 (plan step 5)

Seat: gate-visual (Opus 5.5). Date: 2026-10-15.

- Manifest: `.scratch/stage-gate/tab-view-filter/review-527.json` (pair `C:\Users\dgree\Code\lulz\tbc-wt\tab-view-filter`)
- Captures: `.scratch/stage-gate/tab-view-filter/review-out/` (`index.json` `generatedAt` 2026-10-15T19:06:27.221Z)
- `forkHead`: `c99dd97e400ecb8f835f60e7723672628ce36a84`
- `forkDirty`: `false`
- `index.json` `errors` is empty for all ten entry/width pairs; `staleBaseline` is empty.

## Overall verdict for ticket 527, close condition 4: pass

All ten entry/width pairs pass. The ticket's sentence ("every row ... names Black Temple ... at least one row ... 'Your current gear' DPS ... same as in the unfiltered capture") holds at 1280 and 375:
`facts.json` `527-black-temple.{1280,375}.tableText` names Black Temple in all 9 Source cells, `rows` is 9, and `status` equals `527-unfiltered.{1280,375}.status` ("Your current gear: 2,082.7 DPS. Took 106.8s.").

## Per-entry verdicts

| Entry | Width | Verdict | Evidence |
|---|---|---|---|
| 527-control-closed | 1280 | pass | `527-control-closed-post-run-1280-1.png` shows View options, Set potential, BiS only, "Filter by source" button, "Showing all sources" under it. `facts.json` `527-control-closed.1280.fieldsetScroll` 696 = `fieldsetClient` 696; `dialogOpen` false; `summaryRect` (692-825 x, bottom 161.7) inside `fieldsetRect` (310-1006 x, bottom 161.7). |
| 527-control-closed | 375 | pass | `527-control-closed-post-run-375-1.png`: BiS only wraps to a second line beside the button; no control or text cut off. `facts.json` `527-control-closed.375.fieldsetScroll` 361 = `fieldsetClient` 361; `summaryRect.right` 250 < `fieldsetRect.right` 368; `dialogOpen` false. |
| 527-control-open | 1280 | pass | `527-control-open-post-run-1280-0.png`: title "Filter by source", Raids (8) and Other sources (6), every box ticked, Show all / Hide all. `facts.json` `527-control-open.1280.sections` 2, `rows` 14, `checked` 14, `dialogScroll` 498 = `dialogClient` 498. |
| 527-control-open | 375 | pass | `527-control-open-post-run-375-0.png`: long labels (Serpentshrine Cavern, Magtheridon's Lair, Reputation vendor, Source not recorded) wrap onto two lines, none cut off. `facts.json` `527-control-open.375.dialogRect` left 24.5 / right 350.5 (inside 375), `dialogScroll` 324 = `dialogClient` 324, `sections` 2, `rows` 14, `checked` 14. |
| 527-unfiltered | 1280 | pass | `527-unfiltered-post-run-1280-1.png`: 19 rows, sources from Black Temple, Hyjal Summit, Tempest Keep, plus Blacksmithing, Leatherworking, PvP vendor, Reputation vendor. `527-unfiltered-post-run-1280-2.png` shows the status line. `facts.json` `527-unfiltered.1280.summary` "Showing all sources", `stale` false, `tabs` 17. |
| 527-unfiltered | 375 | pass | `527-unfiltered-post-run-375-1.png` (19 rows), `527-unfiltered-post-run-375-2.png` (status line), `527-unfiltered-post-run-375-3.png` (17 tabs). `facts.json` `527-unfiltered.375.summary` "Showing all sources", `stale` false, `tabs` 17. |
| 527-black-temple | 1280 | pass | `527-black-temple-post-run-1280-1.png`: 9 rows, Rank 1..9, every Source cell starts "Black Temple"; the 9 rows are the 9 Black Temple rows of `527-unfiltered-post-run-1280-1.png` in the same order. `527-black-temple-post-run-1280-3.png`: "13 of 14 sources hidden". `527-black-temple-post-run-1280-4.png`: same 17 tab names as `527-unfiltered-post-run-1280-3.png`, badges dropped. `facts.json` `527-black-temple.1280.rows` 9, `stale` false, `dialogOpen` false, `status` = `527-unfiltered.1280.status`, `tabs` 17. |
| 527-black-temple | 375 | pass | `527-black-temple-post-run-375-1.png`: 9 rows, Rank 1..9. Source column is not painted in the 375 clip (see advisory A1), so the Source check rests on `facts.json` `527-black-temple.375.tableText` (all 9 Source cells begin "Black Temple"). `527-black-temple-post-run-375-3.png`: "13 of 14 sources hidden", nothing cut off. `527-black-temple-post-run-375-4.png`: 17 tabs. `facts.json` `527-black-temple.375.status` = `527-unfiltered.375.status`, `stale` false, `dialogOpen` false. |
| 527-emptied-pane | 1280 | pass | `527-emptied-pane-post-run-1280-0.png`: Ranged (0) tab underlined, pane reads "No rows from the shown sources.", no table; View options row with "13 of 14 sources hidden" stays above. `facts.json` `527-emptied-pane.1280.activeTab` "Ranged (0)", `empty` "No rows from the shown sources.", `rows` 0, `tabs` 17, `stale` false, `status` = `527-unfiltered.1280.status`. |
| 527-emptied-pane | 375 | pass | `527-emptied-pane-post-run-375-0.png`, `-375-1.png` (Ranged (0) selected, still present), `-375-2.png` (empty-state text). `facts.json` `527-emptied-pane.375.activeTab` "Ranged (0)", `rows` 0, `tabs` 17, `stale` false, `status` = `527-unfiltered.375.status`. |

Plan step 5 fact list (plan.md line 98) checked: `stale` false in every entry; `status` equal across all entries and widths; `fieldsetScroll` = `fieldsetClient` at 375; `sections` 2; dialog `rows` 14; `527-black-temple.rows` 9 is > 0 and < `527-unfiltered.rows` at both widths (19 at 1280, 16 at 375); `tabs` 17 everywhere; `summary` "13 of 14 sources hidden"; `empty` "No rows from the shown sources.".

## Findings

| # | Finding | Severity | Evidence |
|---|---|---|---|
| A1 | At 375 px the DPS and Source columns are not painted in the table clips: the clip is 602 px wide and content stops at about x=360. The 375 Source check therefore rests on the `tableText` fact, not on the image. The same happens in the unfiltered state, so it is not caused by the filter; whether the table scrolls sideways there cannot be judged from a still image. | advisory | `527-black-temple-post-run-375-1.png`, `527-unfiltered-post-run-375-1.png`, `527-control-closed-post-run-375-0.png` |
| A2 | The `rows` fact at 375 (16) is lower than the rows painted in the clip (19, ranks 1-19). The fact is not a reliable row count at 375. contested: the caller's hypothesis that the table shows 16 rows at 375 because of windowing; the clip shows 19. No acceptance item depends on it (9 < 16 and 9 < 19). | advisory | `facts.json` `527-unfiltered.375.rows` 16; `527-unfiltered-post-run-375-1.png` |
| A3 | axe `color-contrast` fails (serious) on epic item-name links at 375: 1 in 527-control-closed, 5 in 527-unfiltered, none in 527-black-temple although the same names (for example Torch of the Damned) are shown. These are the upstream epic colour already tracked by open ticket 571, not the filter control. | advisory (covered by ticket 571) | `a11y.json` `527-control-closed/375`, `527-unfiltered/375`; `527-black-temple/375` fail 0 |
| A4 | A `heading-order` warning that is not baselined appears only in the emptied-pane state, on the JSON export `h6`; it is the only non-baselined a11y result in this run. Whether the earlier "No upgrades found" empty state gives the same warning was not captured. | advisory | `a11y.json` `527-emptied-pane/1280`, `527-emptied-pane/375` |
| A5 | The acceptance text names a "'#' column"; the rendered header is "Rank". The column runs 1..9 under the filter, so the check passes; the naming difference is noted only so the ledger matches the screen. | advisory | `527-black-temple-post-run-1280-1.png` |

No blocking findings.

## a11y counts per state (fail / warn)

| State | 1280 | 375 |
|---|---|---|
| 527-control-closed | 0 / 1 (heading-order, baselined) | 1 color-contrast / 1 (baselined) |
| 527-control-open | 0 / 0 | 0 / 0 |
| 527-unfiltered | 0 / 1 (baselined) | 5 color-contrast / 1 (baselined) |
| 527-black-temple | 0 / 1 (baselined) | 0 / 1 (baselined) |
| 527-emptied-pane | 0 / 1 (heading-order, not baselined) | 0 / 1 (heading-order, not baselined) |

Source: `a11y.json`.
