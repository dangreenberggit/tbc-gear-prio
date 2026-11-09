Status: open
Type: bug
Origin: ticket 852's fix, 2026-11-08, reading every caller of `versionGears` in the fork's `rank.ts`
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 852, 494

# Some set-phase sim failures do not show the sim's error

## What happens today

Lines are in the fork's `ui/features/upgrades/model/engine/` at fork commit
`e1f0a16d8` (branch `fix/852-810`). When one of these sims fails, the
player does not see the sim's error:

- The same-gear gate's two sims (`set-less-copies.ts:161`,
  `measureSameGearBonus` catches every failure and returns undefined). The
  package loop then adds "The <set> <n>-piece set bonus was not measured,
  because the sims that measure it failed." (`rank.ts:2375`,
  `SET_BONUS_SKIP_REASONS.measuringSimsFailed`): the tab's own wording,
  with no error text.
- The crossing gate uses the same function; a failed sim leaves the gate
  not cleared (`rank.ts:2625`).
- A set step sim (`rank.ts:2779`, `runCounted`), the worn-1 pair sim that
  measures a 2-piece bonus (`rank.ts:3273`) and a set-screen sim
  (`set-screen.ts:269`, `:284`) write only a `console.warn`.

What the player sees in the last three cases is hypothesis, untested: the
code adds no substitution line for them.

The package sim already does what the owner asks: its failure adds "its
sim failed." followed by the sim's error (`SET_BONUS_SKIP_REASONS.simFailed`).

The owner, 2026-11-06, in ticket 852: "i dont know why we need to invent to
new error, rather than just normally bubbling up whatever error we got from
existing sim code".

## What to do

For each place above, decide how the sim's own error reaches the player, as
the package sim's failure already shows it.

## Done when

Every set-phase sim failure shows the sim's error, and a test covers each
place.
