Status: open
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
