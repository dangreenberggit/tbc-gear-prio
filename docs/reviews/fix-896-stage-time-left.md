# Pre-merge review — fix/896-stage-time-left

Diffed against: our repo `15dc77ed..946381b4` and the fork
`a29f3cd28..cb4bbfc94` on fork branch `fix/896-stage-time-left`. `15dc77ed`
is `dev`, and `a29f3cd28` is the fork commit `dev` pins. The fork diff
touches files under `ui/features/upgrades/`, `ui/app/tabs/` (a test) and
`assets/locales/en/upgrades.json`, none of which exists on `upstream/master`
(`24606be6b`), so no upstream wowsims file changed. No engine file under
`ui/features/upgrades/model/engine/` changed.

What the branch is for: tickets 896, 897 and 898 (each with a "Done when
(amended 2026-11-24)" section) and 899, in `.scratch/carry-forward/issues/`.
The owner chose the stage-only figure on 2026-11-24: "a sounds fine. if the
progress isnt done and doesn't show its actually done ("close to" 0?) then
it's not wrong at least" (quoted in ticket 896).

Reports (gitignored, the pair's `.scratch/agent-reports/`):
`2026-11-24-general-task-896-review-standards-spec.md` and
`2026-11-24-general-task-pre-merge-review-896.md`.

## What changed

- Fork `b7698dd9c`: the time left prices only the stage under way by
  wowsims' Bulk rule, time since the stage started per step done times the
  steps left (`upstream/master` `ui/features/bulk/model/progress.ts:34`,
  `:67`), with the clock restarted at each stage (`core_sim.ts:48-51`). The
  sims under way count by their iterations done (`progress.ts:60-65`),
  through the pool runner's new `onIterations`. `RUN_PROGRESS_ESTIMATOR`,
  the ten-candidate floor and the 35% hold are gone. The seconds round up,
  so the line never reads "0s remaining".
- Fork `d6c0e589a`: after Cancel the status line and dialog say
  "Cancelling" and "Cancelled", as the button does, where they said Stop.
- Fork `cb4bbfc94` (review fixes, below).
- Our repo: tickets (`3adfb0e2`), the re-pins (`873eddc6`, `946381b4`) and
  `packages/core/test/fork-run-progress.test.ts`, which follows the new
  tracker.

## Check output

`node --version` printed v22.23.2 in every shell.

- At `d6c0e589a`, fork `npx tsc --noEmit -p tsconfig.json`: rc=1,
  `StatusLine.test.tsx(30,56): error TS2322 ... Property 'durationMs' is
missing` (the standards reviewer's run, and mine in a scratch copy of
  `d6c0e589a`). Fork `npx vitest run ui/features/upgrades`: 917 passed.
- At `cb4bbfc94`, run by a fresh agent: fork `npx tsc --noEmit -p
tsconfig.json` rc=0; `npx vitest run ui/features/upgrades
ui/app/tabs/UpgradesTabBody.test.tsx` `Tests 929 passed (929)`, rc=0;
  `npx oxlint --max-warnings 0 ./ui` rc=0; `npx oxfmt --check
ui/features/upgrades` "All matched files use the correct format", rc=0.
  Our repo: `npx vitest run packages/core/test/fork-run-progress.test.ts
packages/core/test/wowsims-fork-parity.test.ts` `Tests 52 passed (52)`,
  rc=0.
- `pnpm sim-implemented-effects:generate` at the new pin: rc=0, "226
  implemented, 450 stub-only (fork commit cb4bbfc9...)".
- Not run here: `pnpm verify`, `pnpm merge-ready`, the layout gate, the
  desktop gate and the live runs. The orchestrator runs those.

## Findings

Two reviewers, neither of whom wrote the code: standards and spec (a
`general-task` on Opus, the `code-review` skill's two axes, with each
wowsims citation opened on `upstream/master`), and adversarial (the review's
caller, `general-task` on Opus). No separate domain axis: the diff states no
TBC, WCL or sim fact, and its wowsims question, whether the tab follows
Bulk's rule, is in the spec axis. The adversarial axis found F2 on its own
and nothing else; what it checked is under Notes.

- **F1**: the new `StatusLine.test.tsx` case built a `StoppedRanking`
  without `durationMs` (`run_state.ts:36`), so the fork's `tsc --noEmit`
  failed, which `pnpm verify` runs (`scripts/check_fork_lint.py:210`).
- **F2**: candidates count by each sim's iterations, but a ring, trinket or
  dual-wield weapon is one step of two sims run one after the other
  (`pool.ts:129-137`, the slot loop in `rank-candidates.ts` `bestSwapFor`,
  one `simming` per candidate at `rank-candidates.ts:98-99`). Such a step
  counts as nearly done at the end of its first sim (true share 0.5), then
  drops to 0 when its second sim starts (true share 0.5), with no event
  between, so the figure rises a little there. The comment at
  `observeIterations` said a `simming` event always follows a sim that ends.
- **F3**: the comment on `estimateRemainingMs` said "undefined until a step
  of the stage is done"; the code gives a figure as soon as sims are under
  way, and `fork-run-progress.test.ts:316-322` asserts that.
- **F4**: "Cancelled: the rows below come from the sims that finished." After
  a Cancel during the set bonuses, the re-sims or the final ranking, the
  engine drops the set figures and the finished re-sims
  (`rank.ts:230-233`, `dropSetFigures`), so some finished sims do not reach
  the rows.
- **F5**: "the rows below" shows when Filter by source hides every row,
  since `visibleRows` (`run_state.ts:129-130`) ignores the filter. The old
  string had the same gap.
- **F6**: when the seed count does not fit the first total
  (`doneAtLastCandidate` null), the candidates now show no time left, where
  the old code fell back to a linear figure; the commit does not list this
  as new.
- **F7**: the `d6c0e589a` commit body says "the empty table already says
  there is nothing to see"; a stopped run with no finished row draws no
  table or empty state (`UpgradesResults.tsx:89-90`).

## Fixes

- F1: `cb4bbfc94` adds `durationMs: 900`, as the case above it does. Red at
  `d6c0e589a` (tsc rc=1, the TS2322 above), green at `cb4bbfc94` (tsc rc=0,
  run by a fresh agent).
- F2, F3: `cb4bbfc94` corrects both comments in `run_progress.ts`; the F2
  comment states the two-slot case and its size. The behaviour is `wontfix`
  (below).

## Disposition

| ID  | Axis              | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | ----------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Standards         | fixed       | `cb4bbfc94`; the fork's `tsc --noEmit` red at `d6c0e589a`, green at `cb4bbfc94`                                                                                                                                                                                                                                                                                                                                                                                       |
| F2  | Spec, Adversarial | wontfix     | The error is at most half a step per two-slot candidate in flight, high in its first sim and low in its second, so across the candidates in flight it mostly cancels; against hundreds of candidates and bounds of 0.30 to 0.50 it is small. Which sims share a step only the engine knows; passing it would change a ported engine file's sim calls. The comment now says so (`cb4bbfc94`), and the live runs measure the figure against the bounds set before them. |
| F3  | Standards         | fixed       | `cb4bbfc94`; comment on `estimateRemainingMs`                                                                                                                                                                                                                                                                                                                                                                                                                         |
| F4  | Spec              | wontfix     | Every row shown comes from a candidate sim that finished, and the sentence does not say that every finished sim counts. The rows show no set figures after such a Cancel, so nothing on screen claims the dropped work.                                                                                                                                                                                                                                               |
| F5  | Spec              | wontfix     | Same as before this branch. A table that Filter by source emptied keeps its panes, and each pane says why it is empty (`UpgradesResults.tsx:86-88`), so "the rows below" points at rows the player hid.                                                                                                                                                                                                                                                               |
| F6  | Spec              | wontfix     | The tab always runs the engine's default seed count (`TAB_REPLICATE_SEED_COUNT`, `run_progress.ts:15`), for which `doneAtLastCandidateFor` always solves, so the path is not reached in the tab; Bulk too shows no figure without a known total (`progress.ts:32`).                                                                                                                                                                                                   |
| F7  | Standards         | wontfix     | Commit text only. The code is right: the status line says "Cancelled before any row finished." (`UpgradesResults.tsx:89`). Rewording would rewrite a commit the pair already pins; recorded here instead.                                                                                                                                                                                                                                                             |

## Notes

- What the adversarial axis checked and found sound: the time base (both
  `observe` and `observeIterations` take `Date.now() - startedAt`,
  `run.ts:86-88`, `:107-108`); request ids are unique per sim
  (`generateRequestId`, `worker_pool_sim_runner.ts:141`); the stats reads
  (`computeStats`) send no iteration reports; sims of the preparing and
  set-bonus stages are ignored, and every candidate and re-sim ends before
  the event that moves the activity on, so no stale share carries into the
  next stage; the re-sims' first-seed sims come from the store
  (`rank-replication.ts:64`, `sim-calls.ts:43`) and so add no share the
  stage size leaves out; the listener is removed when the run ends or
  fails (`run.test.ts`).
- The hand-worked figures in the new tests (`run.test.ts` 99 000 and
  34 000 ms) were reworked by hand and hold.
- "Cancelling after the current step finishes." says "step" while up to
  `concurrency` sims finish. The old string said the same. No finding.
- Whether the desktop transport sends iteration progress as the web one
  does is not checked here (ticket 897 says unverified); the live feral
  desktop run shows it.
- The pair's own index is stale (it matches `15dc77ed` while the files and
  branch match the tip), as the sandbox makes its `.git/worktrees` folder
  read-only; commits here go through a temporary index.
