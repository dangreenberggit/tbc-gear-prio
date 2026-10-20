Status: open
Type: task
Origin: docs/reviews/feat-dps-spec-coverage.md (A1 fix, fixer's listed change)
Serves: .scratch/plans/upgrades-tab-finish-line.md
Blocks: none
Blocked by: none

# Check where Stop placeholders for rings and trinkets are filed

After a Stop, an unsimmed candidate becomes a placeholder row. The A1 fix on
feat/dps-spec-coverage gives a weapon placeholder the hand a simmed row would
get (`slotChoice`). Rings and trinkets have two slots each, and the worker
that made the A1 fix reported that a placeholder for an item worn in the
second slot still falls back to the first slot. Whether the tab shows such a
row in the wrong place or with the wrong label is hypothesis, untested.

Code (fork 766e87be2, `ui/features/upgrades/model/engine/rank.ts`): the
placeholder block after the abort check; readers `effectiveSlot` in
`model/results_view.ts` and `slotLabel` in `utils/format.ts`. Core copy:
`packages/core/src/rank.ts`.

## Done means

A test aborts a run with a ring or trinket worn in its second slot still
unsimmed and shows which slot its placeholder row names. If it names the
wrong one, the placeholder takes the slot a simmed row would; if not, close
this ticket with the test as the evidence.
