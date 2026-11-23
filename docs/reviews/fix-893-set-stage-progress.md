# Pre-merge review — fix/893-set-stage-progress

Diffed against: our repo `7811fc26..911ebce9` (`7811fc26` is `dev`; the
branch re-pins the fork, moves `forkCommit` in
`data/sim-implemented-effects.json`, changes
`packages/core/test/fork-run-progress.test.ts` and adds this file), and the
fork `2438dd874..ec6d15d31` on fork branch `fix/893-set-stage-progress`
(`2438dd874` is the pin on `dev`). The fork diff touches seven files under
`ui/features/upgrades/`. None exists on `upstream/master` (`24606be6b`;
`git -C vendor/tbc-new-fork ls-tree -r --name-only upstream/master -- ui/features/upgrades`
prints nothing), so no upstream wowsims file changed.

What the branch is for: ticket 893
(`.scratch/carry-forward/issues/893-set-bonus-stage-progress-stands-still.md`),
after the owner's "I'm not doing the PR yet, you need to get 893 knocked out"
(2026-11-23). Its "Done when": "The time left counts down during the set
stage (and stays true in every state), and the counter either moves or the
screen says plainly that this stage has no count. Match what wowsims' own bulk
sim shows during a stage with no count before inventing anything."

Reports (gitignored, in the pair's `.scratch/agent-reports/`): the reviews
`2026-11-23-general-task-893-review-{adversarial,domain,standards-spec}.md`
and the summary `2026-11-23-general-task-893-pre-merge-review.md`.

## What changed

As reviewed. The branch's final fork commit, `7ad984d47`, drops the time-left
line again; see § After the review.

- Fork `ec6d15d31`:
  - `progressBarOf` (`utils/format.ts`) gives the bar no count in the
    set-bonus stage, so the bar is unmeasured: no fill and no `663/699`.
  - `estimateRemainingMs` (`model/run_progress.ts`) gives no time left in that
    stage. Before, it held the figure from the last candidate for the whole
    stage.
  - The dialog shows the time left again, as "{{time}} remaining"
    (`bulk_tab.progress.time_remaining`) under the stage name, through a new
    leaf `RunProgressMessage` and hook `useRunProgress`, modelled on
    upstream's `BulkProgressMessage` and `useBulkProgress`. Ticket 542 added
    that line (`8fcdc6fb9`); the React port (`e364ca1d4`) dropped it, so at
    `2438dd874` no screen showed the time left.
  - Tests: `RunProgressDialog.test.tsx` (new, four cases) and two cases in
    `format.test.ts`.
- Our repo: the lock re-pin, `forkCommit` in the effects file, and the
  run-progress tests, which now expect no time left in the set stage.

What the dialog shows, stage by stage (adversarial scratch test: the real
tracker fed into the real dialog, synthetic times). Elapsed time ticks in
every stage (upstream's `ProgressTrackerDialog`, unchanged).

| Stage                     | Bar   | Counter   | Message                               |
| ------------------------- | ----- | --------- | ------------------------------------- |
| Starting                  | empty | none      | Starting…                             |
| Candidates                | fill  | `662/699` | Simming candidates, 37s remaining     |
| Set bonuses               | empty | none      | Measuring set bonuses                 |
| Re-simming the top rows   | fill  | `690/699` | Re-simming the top rows, 7s remaining |
| Last sim done             | fill  | `699/699` | Ranking results…, 0s remaining        |
| Run served from the store | empty | none      | Ranking results…                      |

## Check output

`node --version` printed v22.23.2 in every shell.

- Fork: `npx vitest run ui/features/upgrades/components/RunProgress ui/features/upgrades/utils/format.test.ts ui/features/upgrades/model`
  printed `Tests 605 passed (605)`;
  `npx oxlint --max-warnings 0 ui/features/upgrades` rc=0; `npx oxfmt --check`
  on the seven files, "All matched files use the correct format";
  `tsc --noEmit` rc=0.
- Our repo: `pnpm exec vitest run packages/core/test/fork-run-progress.test.ts`
  printed `Tests 59 passed (59)`. Before the branch, the changed assertions
  expected the figure held from the last candidate (9 200, 11 400, 2 000,
  5 200, 3 600); they now expect `undefined`.
- `git diff --word-diff=porcelain 7811fc26..HEAD -- data/sim-implemented-effects.json`:
  only `forkCommit` moved.
- `pnpm verify` at `911ebce9`, before this file:
  `verify: cached -- these inputs passed in full ... (1768 ran, 0 skipped)`
  (`.scratch/893-review/verify-0.log`). After this file: see the summary
  report.

## Findings

Three reviewers, each `general-task` on Opus, none of whom wrote the code:
adversarial, domain (against wowsims itself, `upstream/master`), and
standards and spec (the `code-review` skill). No reviewer found a correctness
bug or test theatre. Every wowsims citation in the fork commit checks out
(domain report, claim table).

- **P1** (all three: spec P1, adversarial A1, domain D1): the ticket's first
  clause, "The time left counts down during the set stage", is not met as
  written. In the set stage the time left is gone, not counting down
  (`run_progress.ts:132`, `else if (done < doneAtLastCandidate)`; the tests
  expect `undefined`). The branch follows the ticket's last sentence instead.
- **D2** (domain): the branch copies wowsims' one stage with no count,
  "Building candidate gear sets", which wraps a single engine call
  (`ui/features/bulk/model/run.ts:263-264`). Wowsims' own sim stages also
  depend on the stage before (`sim/core/bulk/bulk_sim.go:138-170`), yet each
  shows its own count and time left (`core_sim.ts:47-59`,
  `progress.ts:60-77`). A count per set-stage step would match those, and it
  would meet P1's clause.
- **A2** (adversarial): the bar goes from 95% full to an empty track for the
  whole set stage (244 s on the web run), then back to `663/699`.
- **S1** (standards): two places decide that the set stage has no count
  (`format.ts:208-209` and `run_progress.ts:129-145`), each with the same
  comment.
- **S2** (standards): `progressBarOf` makes a new `{}` on each update, where
  upstream's bar keeps one `UNMEASURED` object so that a reset can bail out
  (`ProgressTrackerBar.tsx:11-12`).

**Spec, clause by clause** (standards report): "counts down": not met (P1).
"Stays true in every state": met for what is shown. "The counter either moves
or the screen says plainly that this stage has no count": met as wowsims shows
it, with no count and an empty bar, and no sentence saying so; wowsims has
none either. "Match what wowsims' own bulk sim shows": met.

## After the review

The live web run (below) showed that the restored time-left line was far off,
so it was taken out again and the two fork commits were squashed into
`7ad984d47` "Show no count while set bonuses are measured (893)". The final
fork diff `2438dd874..7ad984d47` keeps only the set-stage change: it touches
`model/run_progress.ts`, `utils/format.ts`, `utils/format.test.ts` and the
new `components/RunProgress/RunProgressDialog.test.tsx` (three cases: count
while candidates are simmed, no count in the set stage, count again in
replication). `RunProgressDialog.tsx` is back to its `2438dd874` text, and
`RunProgressMessage.tsx`, `useRunProgress.ts` and `timeLeftText` are gone.
So in the table above the time-left parts of the Message column no longer
show, the Notes "0s remaining while ranking" and "Desktop reads high" no
longer reach the screen, and "What the branch adds that nothing asked for"
is empty. Red then green for the set-stage count, with `progressBarOf` put
back to its old body: 2 failed, then 41 of 41 passed
(`.scratch/893/red-check.sh`, log `.scratch/893/red-check.log`).

Live run, web (WASM) build at `ec6d15d31` (it differs from `7ad984d47` only
by the time-left line), feral phase 3 from the Phase 2 "BiS 6%" preset,
harness rc=0, 646 rows, done at 3381.2 s. Readbacks in the pair's gitignored
`.scratch/893/web/` (`analysis.txt`, `feral-p3-from-p2bis/tail.jsonl`,
`shot-*.png`):

- Set stage 3016.6 s to 3248.5 s (231.9 s): all 463 samples read no counter,
  no time left and an unmeasured bar, while the elapsed time went from
  50m 17s to 54m 08s. Screenshots at 3017.8, 3078.5, 3139.1 and 3199.8 s.
- Replication started at 663/699 and moved to 698/699.
- Rankings: `rows-equal.py` against the 2026-11-23 web feral readback and the
  2026-11-23 desktop feral readback both print
  `rows a=646 b=646 differing=0 baseline a=2448.7 b=2448.7`, rc=0.
- Time left while candidates were simmed, shown against really left:
  1h 05m 13s vs 2198 s at 1183 s; 59m 31s vs 2029 s at 1353 s;
  45m 05s vs 1690 s at 1691 s; 22m 39s vs 846 s at 2536 s; 5m 35s vs 365 s
  at the last candidate. That is 55-79% high mid-run, row L1.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | All three   | wontfix     | The ticket's own last sentence and the owner's standing ruling (match wowsims, don't invent) put wowsims first, and wowsims shows no time left in a stage it has no count for (`upstream/master` `ui/features/bulk/model/progress.ts:32`, `BulkProgressMessage.tsx:12-15`). Its dialog's Elapsed time keeps ticking through such a stage, and so does the tab's (`ProgressTrackerDialog.tsx`, `ElapsedTime.tsx`), so the screen does not stand still. A time left that counts down with no count needs a clock-driven estimate that nothing in wowsims has, and the set stage's cost is one fitted constant (45.34 candidates' time on the web run, 20.1 on desktop for the same run, `run_progress.ts:21-29`), so a countdown would reach zero early or late on other runs. The owner confirms this reading before 893 closes; if the owner wants D2 instead, this row becomes a `defer` with its ticket |
| D2  | Domain      | wontfix     | The ticket allows a stage with no count ("or the screen says plainly that this stage has no count"). The stage is several dependent steps (`set-phase.ts:110-149`, `:405-425`), and inside a step some results skip the later sims (`set-bonus-values.ts:136-150`), so a step's sim count depends on what it finds; whether each step could state an exact total when it starts, as wowsims' rounds do, is unverified. Counting each step means new progress events from the ported engine files and new step titles, which is new work for the owner to ask for, not a review fix. Same owner decision as P1                                                                                                                                                                                                                                                                                             |
| A2  | Adversarial | wontfix     | Upstream's bar ties the fill to the count (`ProgressTrackerBar.tsx`: `measured` gates both the bar's `value` and the `663/699` text), so keeping the fill keeps the frozen count that 893 reports. The empty track is how wowsims' own bar shows a stage with no count. Any other look needs an edit to the upstream `ui-kit` bar, which needs the owner's approval of that exact edit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| S1  | Standards   | wontfix     | The two are different outputs: the bar's count (`view.done` and `view.total`, read only by `progressBarOf`) and the time left. Each is decided where it is computed. Moving the bar's decision into `RunProgressTracker.view()` would change no behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| S2  | Standards   | wontfix     | Every stage already sends the bar a new object on each update (`{ current, total }`), so the set stage costs no more than the others, and an update re-renders only the bar leaf                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| L1  | Live run    | defer       | [894](../../.scratch/carry-forward/issues/894-run-dialog-time-left-line-missing-and-estimate-high.md). The restored time-left line read 55-79% high on the live web run, so fork `7ad984d47` takes it back out; the screen is as at `2438dd874` apart from the set stage's count. Showing the line again with a refit estimate is ticket 894                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

## Notes

- **"0s remaining" while ranking.** After the last sim the message reads
  "Ranking results…" with "0s remaining" until the dialog closes; with no row
  to re-sim it also shows `663/699` for about one frame (adversarial,
  `engine/rank.ts:215-219`). Wowsims also shows a zero time left
  (`progress.ts`, `simProgress`).
- **Desktop reads high.** Desktop's time left reads about 25 s high
  (`run_progress.ts:21-29`, from `fix/web-run-speed`). Players now see that
  line, since the branch shows it again.
- **Refit script.** The gitignored script that refits the estimator
  (`.scratch/worktree-archive/web-speed/wsp/phases.py`) crashes on traces
  from this build: the set-stage counter is now missing, and the message now
  carries the time left. A refit needs the script updated first.
- **Layout gate.** `data/wowsims-fork-layout.lock.json` still records the gate
  pass for `2438dd874`, and the dialog message is now two lines.
  `pnpm merge-to-dev` runs the layout gate.
- **Lock.** `pushed` is false until the fork branch is pushed.
- **Stale ticks after Stop.** Ticks from a stopped run could reach the next
  run's channel after `clearProgress`. This predates the branch; hypothesis,
  untested.
- **Citation.** The commit cites `progress.ts:32` but not `run.ts:263`, the
  call that uses it.
- **Live check.** When the domain reviewer looked, the live web run in the
  pair was still simming candidates, so the set-stage screen is not yet seen
  live.

## What the branch adds that nothing asked for

- The time-left line in every stage. The ticket assumes one is on screen;
  none was at `2438dd874`. It restores 542's line in wowsims' words and place.
- The `useRunProgress` hook and the `RunProgressMessage` leaf, after
  upstream's `useBulkProgress` and `BulkProgressMessage`. The hook re-reads
  the latest progress once in its effect (`useRunProgress.ts:13`), which
  upstream's does not; it is harmless.
