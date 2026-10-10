# fix/585-resort-test-claims: no review round

No review round was run on this branch. The owner waived it and asked for the
merge, in these words:

> "well.notes that claim too much is iffy. have an agent fix those afterwards pretty quickly hopefully then merge again. no review needed"

This file exists because `pnpm merge-to-dev` requires a review file for the
branch. It is not a review.

## What the branch does

It fixes ticket 585, which holds rows A11, A12 and S21 of
`docs/reviews/feat-565-upstream-sync-tanstack.md`:

- A11: the re-sort test in the fork's
  `ui/features/upgrades/components/ResultsTable/ResultsTable.test.tsx` now
  starts its rows in neither Item order, so both header clicks move rows.
- A12 and S21: the fork lock `_comment` has a new entry that corrects the
  three over-broad sentences of the `e417a504e` entry.

Ticket 585's closing note records the mutation runs.

## Commits

- Fork `316326a95928bb441a94db1c21d1501b3b0c0726` (`vendor/tbc-new-fork`,
  branch `feat/upgrades-tab-react`): Start re-sort test rows out of Item order
- `243329e714747cf76183a73bbe99590b8e68ca13`: Pin fork 316326a95 for ticket 585
- `f77e14190e0ef6f28bd934d601d94d5852b062d8`: Close ticket 585
- This file's commit

## Disposition

| ID  | Axis | Disposition | Ticket / note |
| --- | ---- | ----------- | ------------- |
