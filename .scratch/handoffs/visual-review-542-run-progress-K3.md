# Visual review: ticket 542 run progress component, unit K3

Seat: gate-visual (Opus). Captures judged from
`.scratch/handoffs/542-run-progress/` (Step 5a dry run, 40 candidates).

- `forkHead`: `4d447adcd2940437a0541be38345cf8e4ad8f60a` (`index.json`)
- `forkDirty`: `false` (`index.json`)
- Manifest entry: ticket 542, state `mid-run` (stated deviation: tab-review
  has no running state), widths `[1280]`.
- `index.json` `entries[0].errors`: `[]`.

## Verdict

| Ticket | Verdict | Evidence |
| --- | --- | --- |
| 542 | **pass** | Every clause of the manifest acceptance sentence is met; per-clause rows below. No blocking finding. |

## Per-clause verdicts (manifest acceptance sentence)

| Clause | Verdict | Evidence |
| --- | --- | --- |
| At 1280 px the component sits at the top of the results area and spans its width | pass | `542-half-1280-tab.png`: the component is the first thing under the tab nav in the results column; its left and right edges line up with the results table's left and right edges; the sidebar to the right is not overlapped. |
| A title over a divider | pass | All five panel clips (`542-preparing-1280-panel.png`, `542-candidates-1280-panel.png`, `542-half-1280-panel.png`, `542-set-bonuses-1280-panel.png`, `542-replication-1280-panel.png`): "Ranking upgrades" above a full-width rule. `facts.json` `styleProbe.pairs` "header border-bottom-color" / "-width" and "title font-size" / "font-weight" equal the Bulk dialog's; `styleProbeAllEqual` true. |
| Left: phase name over a bar that spans the column, done/total count under it | pass | `542-candidates-1280-panel.png`: "Simming candidates" above the bar, bar runs the full left column, "34/90" under the bar's right end (same place as the Bulk dialog's "3/6" in the owner's screenshot). Same in `542-half-1280-panel.png`, `542-set-bonuses-1280-panel.png`, `542-replication-1280-panel.png` ("54/90"). |
| Right: Elapsed Time, rows landed, time remaining, Stop button with the Bulk cancel styling | pass | `542-candidates-1280-panel.png`: "Elapsed Time: 12.5s", "33 rows landed", "44s remaining", "Stop" with ban icon. Stop styling: the panel's Stop has classes `btn btn-outline-cancel progress-tracker-modal-cancel-btn` (`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/run_progress_panel.tsx:68`), the same classes as the Bulk Cancel (`vendor/tbc-new-fork/ui/core/components/progress_tracker_modal.tsx:101`; both read from the current `vendor/tbc-new-fork` working tree; this seat runs no git, so whether that tree is still at `forkHead` is unverified). The owner's screenshot shows the Bulk Cancel filled; that it was hovered or focused when captured is a **hypothesis**, not measured. |
| Before the first sim count, moving stripes, not a filled bar | pass | `542-preparing-1280-panel.png`: striped bar, no count under it, "Building the candidate pool…". `facts.json` `preparingBarAnim` = "progress-bar-stripes", `preparingBarImg` = "linear-gradient(45deg,"; `captures.preparing.doneBefore` / `doneAfter` null. |
| From the first count, the Bulk green bar at done/total width | pass | `facts.json` `barDeterminateFromFirstSim` true. `542-candidates-1280-panel.png`: green fill about 160 of 447 px of track (36 %) against `captures.candidates.doneBefore` 33 / 90 (37 %). `542-set-bonuses-1280-panel.png` and `542-replication-1280-panel.png`: fill about 269 / 447 px (60 %) against 54/90 (60 %). One advisory below on `542-half-1280-panel.png`. |
| Deliberate deviation: count under the bar is a lighter grey | pass (ruled deviation) | `facts.json` `countColor` = `gray500` = "rgb(173, 181, 189)"; `countColorIsGray500` true. |
| Deliberate deviation: title left-aligned | pass (ruled deviation) | All panel clips: "Ranking upgrades" at the left edge. |
| Phase names follow the run (preparing, Simming candidates, Measuring set bonuses, Re-simming the top rows) | pass | Clips in run order: `542-preparing-1280-panel.png` "Building the candidate pool…" (phase `preparing`), `542-candidates-1280-panel.png` "Simming candidates", `542-half-1280-panel.png` and `542-set-bonuses-1280-panel.png` "Measuring set bonuses", `542-replication-1280-panel.png` "Re-simming the top rows". `facts.json` `phaseSequence` = preparing, candidates, set-bonuses, replication, ranking; `phaseSequenceIsFull` true; `setBonusesAtBoundary` true. `facts-run2.json` `phaseSequence` is the same on the full timed run. Clip timing per orchestrator ruling 4: `facts.json` `captures.half.panel.phaseBefore` = "set-bonuses". |
| Rows appear in the table under the component as they finish, no empty status row above the component | pass | `542-half-1280-tab.png`: seven ranked rows in the table directly under the component mid-run (phase set-bonuses); nothing between the tab nav and the component. `facts.json` `statusRowHiddenWhileRunning` true; `facts-run2.json` `statusRowHiddenWhileRunning` true. |
| The component covers and dims nothing | pass | `542-half-1280-tab.png`: no backdrop; the table, the sidebar ("364 eligible items", Simulate, Stop, Sources, Sim sets) and the background art render at full brightness; the component is in the page flow above the table. |
| Fact `panelFits375` is true | pass | `facts.json` `panelFits375` true; `at375.mobile.panelLeft` 7, `panelRight` 368, `panelWidth` 361. The table overflow at 375 px (`at375.mobile.outermostPast375` `upgrades-results-table-provisional` right 546; `layoutWidth375` 503) is outside ticket 542 per orchestrator ruling 3 and is not judged. |

## Findings

| Finding | Class | Evidence |
| --- | --- | --- |
| In the "50 %" clip the green fill is about 256 of 447 px (57 %) while the count reads 54/90 (60 %); 0.5 s later the fill is at 60 %. This reads as the bar's width transition still running when the clip was taken (**hypothesis**); the bar settles at the done/total width in the next clip. | advisory | `542-half-1280-panel.png` vs `542-set-bonuses-1280-panel.png`; `facts.json` `captures.half.sampleT` 14496 and `captures.set-bonuses.sampleT` 14999, both `doneBefore` "54". |
| Only one a11y state was scanned (phase set-bonuses); the preparing (striped bar) and replication states have no a11y scan. Zero violations in the one scanned state. | advisory | `a11y.json` `phase` "set-bonuses", `violations` []. |

No blocking findings.

## Contested

None. No verdict here contradicts a claim in the manifest or the
orchestrator's rulings.

## a11y counts per state

| State | Width | Phase at scan | Scope | Violations | Source |
| --- | --- | --- | --- | --- | --- |
| mid-run | 1280 | set-bonuses | `.upgrades-run-progress` | 0 | `a11y.json` |
| mid-run, preparing | 1280 | — | — | not scanned | no `a11y.json` entry |
| mid-run, replication | 1280 | — | — | not scanned | no `a11y.json` entry |

Related accessibility facts (not a11y-scan output): `facts.json`
`panelAriaLive` 0, `panelRoleTimer` 0, `panelInLiveRegion` false,
`progressbarRole` "progressbar", `progressbarName` "Ranking progress",
`announceChanges` 2.

## Not judged here

- `facts-run2.json` `e50Shown` −0.066 (remaining-time error at 50 %) is
  gated separately.
- `facts.json` `checks` (three FLAG lines on the 40-candidate dry run's
  estimator checks) and `facts-run2.json` `checks` are estimator facts, not
  render facts.
