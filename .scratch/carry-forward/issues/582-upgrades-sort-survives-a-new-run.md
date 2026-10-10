Status: closed
Type: task
Origin: docs/reviews/feat-565-upstream-sync-tanstack.md
Blocks: none
Blocked by: none
Related: 565

# A column sort on the Upgrades tab now survives a new run

## What changed

Before ticket 565, the results sort was React state in `ResultsPanes`
(fork `1b28ad005`, `components/ResultsPanes/ResultsPanes.tsx:32`,
`useState<ResultsSort>()`). `UpgradesResults` renders
`ProvisionalResultsTable` instead of `ResultsPanes` while a run is in flight
(`components/UpgradesResults/UpgradesResults.tsx:40-42` at `1b28ad005`), so
`ResultsPanes` unmounted and every new run opened in ΔDPS order.

Since fork `707456ecb` the sort lives in the tab's zustand store for the
page's lifetime (`model/upgrades_store.ts:25,36` at `eb0010112`,
`sort: []` set once at store creation). After a user sorts by, for example,
Item and runs again, the new results, the Rank numbers and the export text
open in Item order. The column head's arrow shows the sort.

The stage 565 plan listed "resetting it on a new run" as out of scope
(`.scratch/stage-gate/565-upstream-sync-tanstack/plan.md:238`, gitignored),
and described the old lifetime as "that component's lifetime" without
saying that the component unmounted on every run. The owner has not ruled
on the change. (Superseded: the owner ruled on 2026-10-09; see "Owner
ruling" under Comments.)

Found by the pre-merge review's adversarial axis, finding A2; the old
lifetime checked with `git -C vendor/tbc-new-fork show 1b28ad005:ui/features/upgrades/components/UpgradesResults/UpgradesResults.tsx`.

## Q-565-sort-across-runs

Keep the new behaviour (no work; the arrow shows the sort), or reset the
sort to ΔDPS order when a run starts (a small fork change in the run start
path plus one test, then a fork re-pin).

## Done when

The owner has ruled. If the ruling is "reset", a fork test fails when the
sort is not cleared at the start of a run, and the fork is re-pinned.

## Closing note (2026-10-09, stage 565-upstream-sync-tanstack, chunk RW2)

(Superseded by the owner ruling under Comments: no action resets the sort
at fork `e417a504e`.)

Orchestrator ruling: restore pre-branch behaviour; owner informed and may
overrule (decision-log row 2026-10-09T19:11Z, ticket 582). The branch is a
library migration, so the behaviour before it stands.

Fork `28ea7a36a` clears the stored sort when a run starts: `dispatchRun` in
`model/upgrades_store.ts` writes `sort: []` with the `started` run state, in
one notification, and on no other action. A fixture load keeps the sort, as
before the branch (`fixtureLoaded` went from done to done, so `ResultsPanes`
stayed mounted). Tests in `model/upgrades_store.test.ts`: "opens a new run in
the engine order, whatever the last result was sorted by" (failed before the
fix) and "keeps the sort when a recorded ranking loads, since no run started"
(fails when the reset runs on every action but `landed`; a mutation run,
not committed, logged in
`.scratch/stage-gate/565-upstream-sync-tanstack/parts/P2/rw2-a1-mutations.log`
lines 22-25, gitignored; to re-run, make `dispatchRun` write `sort: []` for
every action type except `landed` and run
`npx vitest run ui/features/upgrades/model/upgrades_store.test.ts` from the
fork).

One difference remains, found by the RW2 React review (RW2-R4): before the
branch a view toggle that left no rows also unmounted `ResultsPanes`
(`UpgradesResults.tsx:51,57` at `1b28ad005`) and so reset the sort; the stored
sort now survives that case. No change made.

## Comments

### Owner ruling (2026-10-09, stage 565-upstream-sync-tanstack, chunk RW4)

The owner overruled the RW2 closing note above, in these words:
"I think the users sort preference on the tabs table can stay without
resetting it." (decision-log row 2026-10-09T21:19Z, `note owner`).

Closed again as: owner ruling: keep the sort across runs; RW4 removed the
reset. Fork `e417a504e` takes the `sort: []` write out of `dispatchRun`
(`model/upgrades_store.ts`), so the column sort the user chose stays for
the page's lifetime: across a new run, a fixture load and a view toggle.
The RW2 test "opens a new run in the engine order" is replaced by "keeps
the sort the user chose when the next run starts and lands", which failed
against `59c43ddb7` (`npx vitest run
ui/features/upgrades/model/upgrades_store.test.ts` from the fork). The
fixture-load test stays. The RW2-R4 difference above (a view toggle that
left no rows used to reset the sort) no longer applies: no action resets
the sort.

### Pre-merge review round 4 (2026-10-09)

No log records the red run of "keeps the sort the user chose when the next
run starts and lands" against `59c43ddb7`; the decision log only states it
(row 2026-10-09T21:43Z). The result follows from the `59c43ddb7` code, where
`dispatchRun` wrote `sort: []` on `started`
(`git -C vendor/tbc-new-fork show 59c43ddb7:ui/features/upgrades/model/upgrades_store.ts`),
and the test reads the sort right after run 2 starts. Review finding S22.
