Status: blocked
Type: task
Origin: docs/reviews/feat-565-upstream-sync-tanstack.md
Blocks: none
Blocked by: owner ruling Q-565-sort-across-runs
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
on the change.

Found by the pre-merge review's adversarial axis, finding A2; the old
lifetime checked with `git -C vendor/tbc-new-fork show 1b28ad005:ui/features/upgrades/components/UpgradesResults/UpgradesResults.tsx`.

## Q-565-sort-across-runs

Keep the new behaviour (no work; the arrow shows the sort), or reset the
sort to ΔDPS order when a run starts (a small fork change in the run start
path plus one test, then a fork re-pin).

## Done when

The owner has ruled. If the ruling is "reset", a fork test fails when the
sort is not cleared at the start of a run, and the fork is re-pinned.
