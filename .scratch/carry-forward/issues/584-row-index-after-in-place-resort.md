Status: open
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
