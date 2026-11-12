Status: closed
Type: bug
Origin: ticket 863's fix, 2026-11-10, reading `setBonusCountsInReach` in the fork's `rank.ts`
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 863, 644

# A set whose bonus read fails is dropped with no line for the player

## What happens today

Read from the fork on branch `fix/621-863-865-tab` (paths under
`ui/features/upgrades/model/engine/`):

- With the broken-set flag on, `setBonusCountsInReach` (`rank.ts`) asks
  the sim which set bonuses are active (`SimRunner.activeSetBonuses`, a
  `computeStats` call) on the worn gear and on the set's largest package.
- When that call fails, the catch writes only a `console.warn`
  ("set <id>: its bonus counts were not read") and records no counts for
  the set. The set then gets no set-bonus entry, no count is tried, and
  no crossing gate runs.
- The ranking adds no substitution line for it, so the player sees a set
  with no set figures and no reason. the main repo's
  `packages/core/test/fork-set-net.test.ts` case 644-D pins this: it checks the warning, and no line.

Ticket 863 made every failed set-phase sim show the sim's error. This read
is a `computeStats` call, not a sim, so 863 left it as it was.

The owner, 2026-11-06, in ticket 852: "i dont know why we need to invent to
new error, rather than just normally bubbling up whatever error we got from
existing sim code".

## Done when

A failed set-bonus read shows the call's own error in the ranking's lines,
and case 644-D checks that line.

## Closing note

Fixed 2026-11-10 on branch `fix/867-870-tab-errors`, fork commit
`66ed075c3` 'Show the error when a set's bonus counts fail'. In the
fork's `ui/features/upgrades/model/engine/rank.ts`,
`setBonusCountsInReach` now reports each set it gives no counts, with
the reason, and the set phase adds this line (field "<set> set"):

- read failed: "The <set> set bonuses were not all measured, because
  the sim could not list the set's bonuses." and, on the next line, the
  read's own error;
- the largest package's gem repair failed (the same silent drop, case
  644-R): "The <set> set bonuses were not all measured, because no gem
  swap could turn your meta gem on." and the repair's error.

The page shows the first line; the error is in the browser console, as
for the other set-phase lines. A read that Stop refused adds no line, as
before. The console warnings are still written.

Verified by: in the pair,
`pnpm exec vitest run packages/core/test/fork-set-net.test.ts -t "644-D|644-R"`.
Both cases failed before the fix (2 failed) and pass with it; the whole
file passes (106 tests).
