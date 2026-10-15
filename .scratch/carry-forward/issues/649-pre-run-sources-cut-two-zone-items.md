Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 (Tab-adjacent)
Type: bug
Origin: docs/reviews/feat-tab-view-filter.md, focused check (round 2), R3
Blocks: none
Blocked by: none
Related: 527, 647

# The pre-run Sources box can cut an item from two raids with one ticked

Fork `ui/features/upgrades/model/settings_pool.ts` `effectivePool` keeps a
pool entry only when an offered source key that is not excluded matches it,
and the offered keys are each entry's first zone (`validSourceKeysOf`). So
an item from zones Z1 and Z2, where no entry has Z2 first, is cut when Z1
is unticked, though Z2 is not. This is the defect the review of
`feat/tab-view-filter` found in the results filter (D4, fixed there in fork
`959c56d9a`); the pre-run box is older and still has it. Whether any real
pool has such an item is untested.

Done when: `effectivePool` keeps an entry while any source it matches is
not excluded, and every zone an entry matches can be unticked (see 647),
with a test on a two-zone entry whose second zone is no entry's first.
