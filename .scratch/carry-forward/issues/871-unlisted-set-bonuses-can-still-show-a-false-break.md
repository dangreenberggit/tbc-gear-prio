Status: closed
Type: bug
Origin: ticket 870's fix, 2026-11-10, branch `fix/867-870-tab-errors`
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 870, 867, 863

# When the sim cannot list a worn set's bonuses, a false break can still show

## What happens today

From code and a model run, not seen on screen. Fork paths under
`ui/features/upgrades/model/engine/`:

- Ticket 870's fix (fork `64ad50972`) counts a failed worn-set ladder
  count as a break only when the sim's list of the set's bonuses has a
  bonus at that count (`wornSetBonusCounts` in `rank.ts`).
- When that list cannot be read as well (`SimRunner.activeSetBonuses`
  rejects), every failed count is still counted, as before ticket 870. A
  row that drops worn Malorne Harness from 4 pieces to 2 can then still
  list "Breaks Malorne Harness 3pc", a bonus the set does not have.
- The ranking does add a line with the read's error: "The <set> set
  bonuses were not all measured, because the sim could not list the
  set's bonuses." Case 870-B in the main repo's
  `packages/core/test/fork-set-net.test.ts` pins this state: count 3 is
  `counted`.

This needs two failures on the same worn gear: a ladder sim and the
bonus-list read.

## The choice

With no list, the tab cannot tell which failed counts hold a bonus. Each
option is false in some state:

1. Keep counting every failed count (today). A row may name a bonus the
   set does not have.
2. Count no failed count. A row that loses a real bonus (Malorne 4pc)
   then shows no break for it, and its figure reads as complete.
3. Fall back to a table of which counts have a bonus. The owner's rule
   of 2026-11-06 in ticket 852 ("i dont know why we need to invent to new
   error, rather than just normally bubbling up whatever error we got
   from existing sim code") speaks against a tab-made fallback.

## Done when

The owner picks what the row shows when both a ladder sim and the bonus
list fail, and a fork-set-net case (870-B or a new one) pins it.

## Closing note

Ruling, 2026-11-10, from the orchestrating session (not an owner
quote): apply option 2 if each failure already gets its own line with
the sim's error, because the row then claims no break it did not measure
and the notes list says what was not measured.

Checked first, fork at `64ad50972`, paths under
`ui/features/upgrades/model/engine/`: in this state each failure already
has its own line. A failed ladder rung calls `onSimFailed`
(`set-less-copies.ts:236`), and `measureWornSetLadders` pushes "The value
of the <set> set on your gear was not fully measured, because its sim
failed." with the error (`rank.ts:3625`). The failed bonus-list read
pushes "The <set> set bonuses were not all measured, because the sim
could not list the set's bonuses." with the error (`rank.ts:3674`).

Fixed on branch `fix/867-870-tab-errors`, fork commit `4794a28d7` 'Claim
no unmeasured break when bonus list fails': when the list read fails,
`wornSetBonusCounts` (`rank.ts`) gives no counts, so no failed ladder
count is counted as a break. A runner with no bonus list at all (no
`activeSetBonuses`, not the tab's worker runner) still counts a failed
count, because there no line says the list is missing (case 476-D).

Verified by: in the pair,
`pnpm exec vitest run packages/core/test/fork-set-net.test.ts -t "870-B"`.
870-B now expects counts 3 and 4 not counted, Malorne breaks `[2]`, and
both lines; it failed before the fix (`[ 3, true ]`) and passes with it.
The whole file passes (111 tests).
