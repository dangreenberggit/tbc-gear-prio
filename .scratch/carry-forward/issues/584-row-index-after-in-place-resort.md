Status: closed
Type: task
Origin: docs/reviews/feat-565-upstream-sync-tanstack.md
Blocks: none
Blocked by: none
Related: 565, 583

# No test checks a row's data-index and Rank after the table is re-sorted in place

## What is missing

The main repo's tab harness keeps each rendered row by its `data-index` and
returns the rows sorted by that index (`scripts/tab-harness/rows.mjs`,
`collectRows`, the `seen` map and the final `sort((a, b) => a - b)`). So the
harness trusts that, after any re-render, each row's `data-index` is its
current position in the table.

In the fork, `ResultRow` is wrapped in `memo` and keyed by `row.id`
(`components/ResultsTable/ResultsTable.tsx`, `key={row.id}`), and it writes
`data-index={position - 1}` and the Rank cell from `position`
(`components/ResultsTable/ResultRow.tsx`). When a sort is clicked on a table
already on screen, React moves the existing row elements, and each one must
re-render with its new `position`. Today it does: `memo` uses the default
shallow compare, and `position` is a prop.

No test covers that path. `ResultsTable.test.tsx` checks positions only for a
sort given at first render ("orders rows by the sort it is given and numbers
them in the order shown"); the test that clicks a sort header checks names
only. Fork `59c43ddb7`'s `ResultRows.virtual.test.tsx` ties `data-index` to
the row shown, but only in input order, with no sort. A future `memo`
comparator that skipped `position` would leave stale `data-index` values and
Rank numbers on moved rows while the DOM order looks right, and the harness
would read the rows in the wrong order with no error (hypothesis, untested:
no such mutation has been run).

The fork lock's `_comment` entry for `59c43ddb7` (`data/wowsims-fork.lock.json`,
appended by `57405c8f`) says the harness "cannot read one row's content under
another row's index unnoticed"; the evidence for that is one mutation in
input order with no sort, so the sentence claims more than was tested.

Found by the pre-merge review's round 3: adversarial finding A10 and
standards finding S19.

## Done when

- A fork test re-sorts a table already rendered (a header click or a new
  `sort` in the store) and asserts each row's `data-index`, `data-item-id`
  and Rank cell against the sorted order.
- A mutation run, recorded in the commit body, shows that assertion failing
  when `ResultRow`'s `memo` is given a comparator that ignores `position`.
- The fork is re-pinned, and the new lock `_comment` entry states what the
  virtual-rows and re-sort tests cover, without the word "cannot".

## Closing note (2026-10-09, stage 565-upstream-sync-tanstack, chunk RW4)

Fork `e417a504e`, in `components/ResultsTable/ResultsTable.test.tsx`:

- "renumbers the rows it moves when a header is clicked on a table already
  shown" renders a sortable table, clicks the Item header twice, and after
  each click checks every row's `[data-index, data-item-id, Rank cell]`
  against the sorted order (descending, then ascending) and that each row
  is the same element as before the click.
- The landing-row test ("keeps each row's element when rows arrive ahead of
  it") now checks the same three values after a row arrives above another
  (RW4 React review, RW4-R4).
- The file's `useVirtualRows` mock now returns one `measureRow` for every
  render, as the real hook's `virtualizer.measureElement` is; with a new
  ref each render every memoised row rendered again, which hid this fault.

Mutation run, not committed: `ResultRow`'s `memo` given the comparator
`(prev, next) => prev.row === next.row && prev.context === next.context &&
prev.ref === next.ref`. Both tests above fail (a moved row keeps
`data-index` 3 and Rank 4 at the top); every tab test at `59c43ddb7`
passes it (`npx vitest run upgrades`, 55 files, 414 tests). Log:
`.scratch/stage-gate/565-upstream-sync-tanstack/parts/P2/rw4-mutations.log`
(gitignored). The fork commit body records it in one line.

The fork lock's `_comment` entry for `59c43ddb7` now says only what its
test shows (a row in input order, no sort), and the `e417a504e` entry
states what the virtual-rows, re-sort and landing tests cover, and that no
test re-sorts while the real windowing is scrolled.

## Comments

### Pre-merge review round 4 (2026-10-09)

Two sentences above claim more than the evidence shows. "descending, then
ascending": `FOUR` already starts in descending Item order, so the first
click moves no row and only the ascending click catches the comparator
mutation (`rw4-mutations.log` run 1 fails on Cataclysm's Edge at the top).
"every tab test at `59c43ddb7` passes it": run 2 used the `59c43ddb7`
`ResultsTable.test.tsx` inside the RW4 tree, so the store file and its test
were RW4's; neither renders a row, so the conclusion holds. The test change
and the matching lock `_comment` correction are ticket 585 (review findings
A11, A12, S21).
