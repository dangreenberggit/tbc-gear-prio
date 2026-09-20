# Visual review — upgrades-tab-walkthrough 453-466

Seat: Visual (gate-visual). Judges captured Upgrades-tab renders against each
ticket's acceptance sentence. Implements nothing, runs no git.

- **forkHead**: `85f0a545ee39d34fbff3b96a22c9621d1888d758` (from `index.json`)
- **forkDirty**: `false` (from `index.json`)
- **Capture errors**: 0 (every `index.json` entry has `errors: []`)
- Captures dir: `.scratch/stage-gate/upgrades-tab-walkthrough-453-466/visual/`
  (never committed — this handoff stands alone).

Harness limits (from `manifest.json` `note`, accepted as scoped): the harness
activates only `#upgrades-tab`, never `#bulk-tab`; a post-run capture is a
**running** state (~5 of ~467 rows), not a completed 'done'. The two acceptance
facts the harness cannot prove — 453 Batch-vs-Upgrades card-top parity, and 465
disable-after-a-COMPLETED-run — are covered by the executor's `live-verify.md`
(5a, 5d) and cited below.

## Per-ticket verdict

| Ticket | Verdict | Evidence |
| --- | --- | --- |
| 453 | pass | `facts.json` `453-454-461-462-pre` 1280: `upCardRect.top` 84 − `headerRect.bottom` 63 = **21px**; 1536: 84 − 63 = **21px**. Batch-card parity (21px, harness cannot open `#bulk-tab`) per `live-verify.md` 5a. `453-454-461-462-pre-pre-run-1280-0.png` shows the settings card seated just below the header. |
| 454 | pass | `facts.json` 1280: `rightRect.width` 237.78 / (`leftRect.width` 634.11 + 237.78) = **27.3%**; 1536: 295.42 / (787.78 + 295.42) = **27.3%** (both in 26–29%). 375: `bodyScrollWidth` `"375px"` == width (no horizontal scroll); `375-1.png` shows the settings card full-width, `375-0.png` shows the description full-width below it (stacked). |
| 455 | pass | `facts.json` `455-456-459-pre` 1280 and 375: `pruneLabel` == `"Sim only selected set items"`. Label visible in `455-456-459-pre-pre-run-1280-0.png`. |
| 456 | pass | `facts.json` `455-456-459-pre` 1280 and 375: `captionGone` **false** and `capNoteGone` **0** (the set-guarantee caption is absent). No caption paints in `455-456-459-pre-pre-run-1280-0.png`. Behavioural half (no-union past Sources) is `live-verify.md` 5e, out of Visual scope. |
| 458 | pass | `facts.json` `458-modal` 1280: `modalParentIsSimUi` **true**, `modalZ` **1055** > `headerZ` **100**, `backdropExists` **true**; `dialogRect` top 24.5 / left 390 overlaps `headerRect` (top 0, bottom 63) — the dialog paints over the header band. `458-modal-pre-run-1280-0.png` shows the Sources dialog drawn over the header, header items behind it. `elementFromPoint` proof in `live-verify.md` 5b. |
| 459 | pass | `facts.json` `455-456-459-pre` 1280 and 375: `disclosureText` == `"Other sets (3)"`. Visible in `455-456-459-pre-pre-run-1280-0.png` ("Other sets (3) >"). |
| 461 | pass | Pre-run `facts.json` `453-454-461-462-pre` (all three widths): `descExistsVisible` **true**, `descText` begins "Upgrades ranks every item your filters allow…". Post-run `facts.json` `461-462-post` 1280: `descHiddenPost` **true** (paragraph `.d-none`). `461-462-post-post-run-1280-0.png` shows the description gone with the running table in its place. |
| 462 | pass | `facts.json` `453-454-461-462-pre` (all widths): `navText` == `"Upgrades (New)"`, `navNewSpan` == `"New"` (green `.text-success` span per `live-verify.md` 5f). Post-run `461-462-post` 1280: `navTextPost` == `"Upgrades (New)"` (persists). |
| 465 | pass | `facts.json` `466-465-candidates` 1280 and `461-462-post` 1280: `runText` == `"Simulate"`. `466-...-0.png` shows the "Simulate" run button; `461-462-post-...-0.png` shows it dimmed during the running state. Disable-after-a-COMPLETED-run (harness captures mid-run only) per `live-verify.md` 5d. |
| 466 | pass | `facts.json` `466-465-candidates` 1280: `candidatesDisplay` **none** and `candidatesInputExists` **true** (row hidden from the surface, input still in the DOM). No Candidates row visible in `466-465-candidates-pre-run-1280-0.png`. |

## Findings

| Finding | blocking / advisory | Evidence |
| --- | --- | --- |
| Pre-existing baselined a11y violation: color-contrast (serious) on `.btn-outline-danger` (Stop button), 3.95:1 < 4.5:1. Not introduced by this batch (Stop styling untouched); wontfix per task. | advisory | `a11y.json` `461-462-post/1280` `violations[0]` |

No render-defect-class finding against any ticket's acceptance. All nine
acceptance sentences hold on the captured renders and facts; no verdict
contradicts a plan/executor claim (nothing to mark `contested:`).

## a11y counts per state

| Entry / width | violations |
| --- | --- |
| 453-454-461-462-pre / 1280 | 0 |
| 453-454-461-462-pre / 1536 | 0 |
| 453-454-461-462-pre / 375 | 0 |
| 458-modal / 1280 | 0 |
| 455-456-459-pre / 1280 | 0 |
| 455-456-459-pre / 375 | 0 |
| 466-465-candidates / 1280 | 0 |
| 461-462-post / 1280 | 1 (color-contrast, serious — pre-existing baselined wontfix) |

## Overall verdict

**pass.** All nine visually-judged tickets (453, 454, 455, 456, 458, 459, 461,
462, 465, 466) pass on the recorded captures and facts at fork
`85f0a545ee39` (clean). The single a11y violation is the pre-existing baselined
Stop-button contrast, not introduced here. Two acceptance facts the harness
cannot reach (453 Batch parity, 465 done-state disable) are carried by
`live-verify.md`, not by this seat.
