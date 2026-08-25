Status: closed (2026-08-24, fork commit 37306d55c on feat/upgrades-tab —
sortable headers on all done-state tables with rank pinned to the row;
mid-run/Stop tables ruled out of scope at review because their Rank cells
are provisional landing-order counters, not engine ranks.)
Type: deferred feature
Origin: stage-gate `upgrades-ui-pass`, deferral decision, 2026-08-23
Blocks: none
Blocked by: none

# The Upgrades tab results tables have no sortable column headers

Deferred deliberately from the `upgrades-ui-pass` work; the reason is below.

Every results table on the tab — the shopping list, each per-slot pane, the
mid-run table — renders in one fixed order. Rank ascending, which is delta
descending. A reader who wants to sort by slot, by source, or by item name
cannot.

`gear_picker/item_list.tsx` already carries a header-sorting idiom in this
codebase, so this would be reuse rather than invention.

## Why it was deferred

The owner complaint that started ticket 278 was about the *default* order
being wrong, and that is fixed: the mid-run table no longer renders unsorted.
Header sorting is a different thing — new interaction machinery, with state to
hold (which column, which direction), a second ordering to keep consistent
with the Rank column's meaning, and no DOM test harness in the fork to catch a
regression in any of it.

That last point is the real cost. The fork has no DOM or component test
runner, so every assertion about sorting behaviour has to be made by hand on a
served page.

## Done when

- Headers on the results tables sort by that column, ascending and descending.
- The Rank column's meaning under a non-default sort is decided and stated —
  it is a position in the *engine's* order, so it either stays fixed to the
  row or is hidden when another column drives the order.
- Behaviour shown on a served page, since there is no harness to show it in.
