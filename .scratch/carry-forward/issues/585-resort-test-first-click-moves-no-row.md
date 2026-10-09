Status: open
Type: task
Origin: docs/reviews/feat-565-upstream-sync-tanstack.md
Blocks: none
Blocked by: none
Related: 565, 584

# The re-sort test's first click moves no row, and the lock note claims more than the tests show

## What is wrong

Fork `e417a504e` added the test "renumbers the rows it moves when a header
is clicked on a table already shown"
(`ui/features/upgrades/components/ResultsTable/ResultsTable.test.tsx`). It
clicks the Item header twice and, after each click, checks every row's
`[data-index, data-item-id, Rank cell]`.

The table starts as `FOUR = [fixtureRow(3), fixtureRow(0), fixtureRow(2),
fixtureRow(1)]` (same file, the `FOUR` constant). By `testing/ranking_fixture.ts`
that is Vengeful Gladiator's Greatsword, Torch of the Damned, Cursed Vision of
Sargeras, Cataclysm's Edge: already the descending Item order that the first
click asks for. So the first click moves no row, and its checks pass under a
`ResultRow` `memo` comparator that ignores `position`. Only the second click
(ascending) catches that fault. `rw4-mutations.log` run 1 agrees: the failing
value `['3', '30902', '4']` is Cataclysm's Edge at the top, the ascending
order. (`.scratch/stage-gate/565-upstream-sync-tanstack/parts/P2/rw4-mutations.log`,
gitignored.)

The test still catches the targeted mutation, so nothing is broken today.
What is wrong is the coverage of the first half and three sentences of record:

- The fork lock `_comment` entry for `e417a504e` (`data/wowsims-fork.lock.json`)
  says the re-sort test checks "in both directions"; only the ascending
  direction moves rows.
- The same entry says the comparator "passed every tab test at 59c43ddb7".
  Run 2 of the log used the `59c43ddb7` `ResultsTable.test.tsx` inside the RW4
  tree, so `upgrades_store.ts` and its test were RW4's. Neither renders a row,
  so the conclusion holds; the sentence overstates what was run.
- The same entry says "A ResultRow memo comparator that ignores position fails
  both of those tests". One comparator was run (`prev.row === next.row &&
  prev.context === next.context && prev.ref === next.ref`); the sentence
  states a whole class.

Found by the pre-merge review's round 4: adversarial findings A11 and A12,
standards finding S21.

## Done when

- The re-sort test's first click moves at least one row (start `FOUR` in an
  order that is neither Item order, or click another column first), and the
  same comparator mutation fails the test at the first click's check, run and
  logged.
- The next fork lock `_comment` entry corrects the three sentences above: the
  direction the test covers, what run 2 ran, and the one comparator tried.
