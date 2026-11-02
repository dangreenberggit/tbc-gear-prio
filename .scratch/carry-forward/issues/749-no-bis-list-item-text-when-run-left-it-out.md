Status: closed
Type: bug
Origin: docs/reviews/fix-wrong-advice-text.md (round 4, R4-1)
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 (Tab-adjacent)
Blocks: none
Blocked by: none
Related: 614, 625, 748

# Under BiS only, "No BiS-list item for this slot." shows when the slot has a BiS-list item that the run left out

## What is wrong

Under "BiS only", a slot pane with no BiS-list row in the run says "No
BiS-list item for this slot." (fork `assets/locales/en/upgrades.json:152`,
key `upgrades_tab.results.empty_no_bis_row`; chosen by `noBisListRow` in
`ui/features/upgrades/model/results_view.ts:117`, shown by
`components/ResultsPane/ResultsPane.tsx:51`). The pane decides this from the
run's rows only, but the run's candidates are already cut before the sim:

- the pre-run Sources settings and the set prune drop entries
  (`model/settings_pool.ts:208-213` `effectivePool`, called from
  `model/run.ts:115`);
- `poolFor` drops items with a missing effect, items under the item-level
  floor, and heroic five-man items under the exclude policy
  (`model/pool_source.ts:153-156`), and the BiS tag is attached only to the
  entries that survive (`:157`, `:167`).

So when the slot's BiS-list item comes from a source the player unticked
before the run (or is cut by one of the rules above), the pane says the slot
has no BiS-list item although the BiS list names one. If the player wears
that item and it was cut too, the pane says it about the item they wear
(hypothesis, untested: depends on whether a worn item stays a row when its
source is unticked).

Read from the code at fork `4fd85ca4a`; not run in the tab (hypothesis,
untested for the screen itself). From before branch `fix/wrong-advice-text`:
the text came in with fork `08afcdcce` (2026-10-11) and is in the `dev` pin
`05da8b9ab`.

## Done when

The pane's text is true when the slot's BiS-list item is not among the run's
candidates, the owner has approved any new words (player-facing text, one
plain sentence in player words), and a test pins the text for a slot whose
BiS-list item the Sources settings left out of the run.

## Resolution

Closed on branch `fix/wrong-advice-text`, 2026-11-02.

Verified by: `tbc-new-fork@4626c5d7b`, re-pinned in `tbc-gear-prio@8741a765`;
`npx vitest run ui/features/upgrades ui/app` in the pair's fork (85 files,
844 tests passed) and `pnpm verify` in the pair (exit 0, its fork tests at
4626c5d7b: 68 files, 761 tests passed).

The owner's rulings on empty-state text, 2026-11-02, word for word as the
coordinator passed them on:

- "a generic one that can be used regardless of filters. it doesnt need tobe so long."
- "i dont like the term "the cutoff". they dont know a cutoff exists and we shouldnt have to explain it either."

What changed (fork `results_view.ts`, `ResultsPane.tsx`, the en upgrades
locale, `schemas/upgrades.schema.json`, tests):

- "No BiS-list item for this slot." is gone, with its key
  `upgrades_tab.results.empty_no_bis_row` and the `no-bis-list-row` reason.
  Under BiS only, a slot pane with no row shows "No items to show" / "Try
  widening your filters.", which is true whether or not the run left the
  slot's BiS-list item out: nothing is on screen, and BiS only and Sources
  are filters.
- "No rows from the shown sources." now needs the slot to have had a row
  before "Filter by source" cut it, so a pane that BiS only had already
  emptied is not blamed on the source filter (as ticket 648 rules for a main
  table already empty).
- Tests: `results_view.test.ts` "under BiS only, gives a slot pane with no
  BiS-list row the no-upgrades reason" and "under BiS only, says no row comes
  from the shown sources only for a slot that had a BiS-list row before the
  source cut"; `ResultsPanes.test.tsx` "under BiS only gives a slot with no
  BiS-list row the generic empty text, never that the slot has no BiS-list
  item" pins the on-screen text. The fixture's chest slot has no BiS-list row,
  which is what the pane sees when the Sources settings left that item out;
  the pane reads only the run's rows, so the two cases cannot differ on screen.
