Status: closed
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

## Closed, 2026-10-20 (stage dps-spec-coverage)

Verified by: main 9e12e390, test `packages/core/test/offhand-disclosure.test.ts`
("Stop placeholders for rings and trinkets"; re-run: `pnpm exec vitest run packages/core/test/offhand-disclosure.test.ts`),
fork fix tbc-new-fork@3797dd6b4, re-pinned in main 5cc39958

The slot was wrong. The test ranks a mage wearing
`vendor/wowsims/mage_p3_sword.gear.json` with its worn rings and trinkets
added to the pool, and stops the run after the first candidate sim. Before
the fix the placeholders for Ring of Ancient Knowledge (32527, worn in
finger2) and Icon of the Silver Crescent (29370, worn in trinket2) had no
`slotChoice`, so the tab's readers (`effectiveSlot`, `slotLabel`) named
finger1 and trinket1:

    - "29370": "trinket2",  + "29370": "trinket1",
    - "32527": "finger2",   + "32527": "finger1",

`placeholderSlotChoice` (fork `model/engine/rank.ts`, core
`packages/core/src/rank.ts`) now names the slot for any weapon, ring or
trinket placeholder with exactly one legal placement, the same rule a simmed
row uses to set `slotChoice`. The test passes with the fix: the four rows
name finger1, finger2, trinket1 and trinket2. An unworn ring or trinket
still has two legal slots, so its placeholder names none, as before.
