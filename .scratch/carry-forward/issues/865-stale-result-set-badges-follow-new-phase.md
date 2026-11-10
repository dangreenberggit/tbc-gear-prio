Status: closed
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

## Closing note

Fixed 2026-11-10 on branch `fix/621-863-865-tab`, fork commit `937e27d04`
'Badge result rows from the sets the run used (865)'. Paths under the
fork's `ui/features/upgrades/`:

- The run records the sim sets picked when Run is clicked or a fixture
  loads: `MeasuredOn.selectedSets` (`model/run_state.ts`), filled by
  `model/run_session.ts` from the `selectedOptions` that
  `UpgradesTabBodyInner.tsx` passes to `start` and `loadFixture`.
- Each row's gear-set badges are built from those recorded sets
  (`hooks/useResultsView.ts`, `rankedSets`), no longer from the sets
  selected now. `UpgradesResults` no longer takes a `selectedSets` prop.

So a phase change after a run, which empties the selection
(`afterScopeChange`), leaves the stale result's badges naming the sets the
run was ranked with. Any other set pick after a run also leaves the badges
alone. The pool's "BiS" badge already took the ranked phase (`selectSettledPhase`).

Verified by, in the pair's fork (`vendor/tbc-new-fork`):
`npx vitest run ui/features/upgrades/model/run_session.test.ts ui/features/upgrades/components/UpgradesResults/UpgradesResults.view.test.tsx`.
The new test "keeps the sets picked at the click and at a fixture load
through a later phase change (ticket 865)" and the changed test "badges a
row with the name of each set the run was ranked with that holds it" both
failed with `model/run_session.ts` and `hooks/useResultsView.ts` reverted
and pass with the fix. Not checked on screen: no live tab or layout gate
run for this ticket.
