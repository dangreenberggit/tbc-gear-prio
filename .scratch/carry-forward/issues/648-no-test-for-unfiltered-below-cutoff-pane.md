Status: closed
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 (Tab-adjacent)
Type: task
Origin: docs/reviews/feat-tab-view-filter.md, focused check (round 2), R2
Blocks: none
Blocked by: none
Related: 527, 647

# No test keeps "No upgrades found" for a pane that never had an upgrade

The review fix for AD1 (fork `4cf89e432`) makes `paneRows` in fork
`ui/features/upgrades/model/results_view.ts` say "No rows from the shown
sources." when the source cut empties a pane's main table that had rows
before the cut (`panesWithMainBeforeSourceCut`). No test covers the
opposite case: a pane whose rows were all below the cutoff before the cut,
with another source hidden, must keep `noSourceRow: false` ("No upgrades
found"). The mutant that drops the `panesWithMainBeforeSourceCut` term
probably passes every test (hypothesis, untested).

Done when: a `paneRows` test has a slot whose only rows are below the
cutoff, hides a source that does not empty it, expects `noSourceRow`
false, and fails with the `panesWithMainBeforeSourceCut` term removed.

## Resolution

Fork `88dcdb8dd` (2026-10-15), test only: `results_view.test.ts` "does not
blame the shown sources for a pane whose rows were all below the cutoff
before the cut". With the term removed from `paneRows` it fails
(`noSourceRow` true) and the other 43 tests in the file pass, so the
hypothesis above held: no earlier test caught that mutant.

Verified by: tbc-new-fork@88dcdb8dd, pinned via tbc-gear-prio@3076b0dc (`pnpm verify` rc=0); from `vendor/tbc-new-fork`, `corepack pnpm exec vitest run ui/features/upgrades/model/results_view.test.ts`; review `docs/reviews/feat-tab-view-filter.md` (R2).
