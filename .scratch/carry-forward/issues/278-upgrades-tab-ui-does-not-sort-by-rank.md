Status: closed
Type: UI defect
Origin: owner report, 2026-08-23
Blocks: none
Blocked by: none
Closed: 2026-08-23, branch feat/upgrades-ui-pass

## Outcome

Both halves reproduced on a served page and fixed, except one engine-side
finding that is its own ticket (see below).

**The mid-run path was the one losing the order**, as the "places the order
could be lost" list suspected first. `landedRowsTable` rendered rows in the
order their sims finished, with four columns and no Rank at all: 96 of 239
adjacent pairs inverted in the recorded repro. It now sorts a copy by delta at
render time and shares one row renderer and one header with the done-state
tables. Confirmed on a served page: 240 rows, five columns including Rank,
zero delta inversions across 239 adjacent pairs.

**The done-state order was measured, not inferred** — on the unmodified tip
`d49096e`, before any edit, with all four toggle states recorded (prune off,
set-potential off, BiS-only off, raid filter default), reading the shortlist
table and the below-cutoff table separately. 52 shortlist rows and 188
below-cutoff rows; deltas non-increasing in both, zero inversions.

**But the Rank column was not strictly ascending**: two inversions, at rows
21/20 and 25/24, both strictly inside exact delta ties. This is the question
line 34 of the original report anticipated — "sort by rank" and "sort by
delta" are not the same order once ties are involved. It is an engine defect,
not a UI one, and is filed as its own ticket rather than fixed in flight.

Full measurement record in `docs/verification-log.md`.

The wider UI pass was scoped into a plan and executed on this branch; the
parts deliberately not taken are tickets 279-281.

# The Upgrades tab UI does not sort by rank, and wants a UI pass

Owner report, 2026-08-23, after using the tab: **"the Upgrades tab UI does not
sort by rank"**, and more broadly **"the UI has a long way to go"**. Recorded
as reported; the first half is a specific claim to verify, the second is a
direction.

## The sort claim — needs verifying against the tab

**Unverified.** The engine sorts: `applyView` in `packages/core/src/view.ts`
orders rows through `compareRows`/`sortKeyFor`, which key on the DPS delta
(with `pinBis` and tie-group handling on top). Whether the *rendered* list
preserves that order is a separate question and has not been checked.

Places the order could be lost between the engine and the screen, none
confirmed:

- the row-landed skeleton path, which renders rows as they arrive during a run
  rather than through `applyView` (`landedRowsTable`);
- the per-slot sub-tab panes, which re-render a filtered subset;
- the post-sim filters (BiS-only, the content filter), which rebuild the table;
- a table the browser or CSS reorders visually after render.

The measurement session on 2026-08-23 read row *counts* per filter value but
never asserted on row *order*, so it would not have caught this. Reproduce
first, and say which of the paths above is at fault, before changing anything.

Worth checking at the same time: whether the intended order is by delta at all.
The shopping list shows a `Rank` column, and rank is assigned in the ranking,
so "sort by rank" and "sort by delta" may or may not be the same order once
below-cutoff rows and ties are involved.

## The UI pass

The owner wants a broader pass over the tab's presentation, not just this bug.
No specific asks beyond the sort were given; treat the sort as the one known
defect and gather the rest before designing.

Related and worth folding into the same pass:

- **Ticket 275** — the tab's toggle controls repeat the same field, label and
  visibility shape three times over (set-potential, BiS-only, and now the
  content filter follows the same pattern). A UI pass that touches these
  controls is the natural moment to collapse that duplication, rather than
  doing it as a standalone refactor.

## Done when

- The sort claim is reproduced or refuted on a served page, with the rendered
  order quoted — not inferred from the engine's own sort.
- If real, the path that loses the order is named and fixed, and the fix is
  shown on a served page.
- The wider UI pass is either scoped into its own plan or split into concrete
  tickets.
