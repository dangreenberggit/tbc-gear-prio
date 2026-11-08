Status: open
Type: bug
Origin: docs/reviews/fix-852-810-sim-errors-bis-labels.md (round 1, row X1)
Serves: .scratch/plans/upgrades-tab-finish-line.md
Blocks: none
Blocked by: none
Related: 810, 430

# A stale result's gear-set badges name the new phase's sets

## What happens today

Hypothesis, untested on screen; read from the fork at `3e554d9d2`
(branch `fix/852-810`), all paths under `ui/features/upgrades/`:

- When the player changes the phase after a run, the run stays on screen
  with the stale notice: `changeScope` writes only settings
  (`model/upgrades_store.ts`, `changeScope`), and
  `UpgradesTabBodyInner.tsx` shows the notice and the old results together.
- The same scope change empties the selected sets
  (`model/settings_state.ts`, `afterScopeChange`), so the selection falls
  back to the new phase's default sets.
- Each row's gear-set badges come from the sets selected now
  (`UpgradesResults.tsx`, `selectedSets`: "The sim sets selected now";
  `hooks/useResultsView.ts`, `tagsOf = rowTagIndex(selectedSets)`).

So after a run at phase 3 and a switch to phase 4, a row of the phase 3
result can read "BIS (Fury)" from a phase 4 set the run never used, or
lose a badge from the phase 3 set it was ranked with.

The pool's own "BiS (Fury)" badge does not have this problem since review
fix A3 of the 852/810 branch: it takes its headings from the phase the
shown ranking ran at (`selectSettledPhase` in `model/upgrades_store.ts`).

## Done when

On a stale result after a phase change, every gear-set badge on a row is
true for the result on screen (or the badges are not shown while the
result is stale), and a fork test covers the phase change.
