Status: open
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
