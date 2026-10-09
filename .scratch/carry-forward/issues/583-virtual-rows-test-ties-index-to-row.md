Status: open
Type: task
Origin: docs/reviews/feat-565-upstream-sync-tanstack.md
Blocks: none
Blocked by: none
Related: 565

# The virtual-rows test does not check that each data-index shows its own row

## What is missing

The main repo's tab harness reads a results table by scrolling and keeps
each rendered row by its `data-index` (`scripts/tab-harness/rows.mjs`,
`collectRows`). Fork `28ea7a36a` added
`ui/features/upgrades/components/ResultsTable/ResultRows.virtual.test.tsx`,
which renders 200 rows through the real `useVirtualRows` and checks the
tbody's `data-row-count`, that the rendered `data-index` values run
consecutively, and the spacer rows. It never checks that the row carrying
`data-index={i}` shows `rows[i]`.

Today they cannot drift: `ResultRows` takes the row, its position and so its
`data-index` from the same `index` (`components/ResultsTable/ResultsTable.tsx`
`rows[index]` and `position={index + 1}`; `ResultRow.tsx` writes
`data-index={position - 1}` and `data-item-id={row.itemId}`). A future edit
that rendered `rows[index + 1]` under `data-index={index}` would pass the
test, and the harness would then read the wrong row's content with no error.

Found by the pre-merge review's adversarial axis, round 2, finding A8.

## Done when

`ResultRows.virtual.test.tsx` asserts, in both its cases, that each rendered
row's `data-item-id` is `100000 + Number(data-index)` (the test's rows set
`itemId: 100_000 + index`), the assertion fails when `ResultRows` renders
`rows[index + 1]` (a mutation run, recorded in the commit body), and the fork
is re-pinned.
