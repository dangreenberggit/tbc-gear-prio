Status: closed
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

## Closing note

Fixed 2026-11-10 on branch `fix/621-863-865-tab`, fork commit `550c01576`
"Show each failed set-phase sim's own error (863)". Paths are under the
fork's `ui/features/upgrades/model/engine/`. Each place now adds a line to
the ranking's "Items left out and other notes" list, ending in the sim's
own error. The list shows the first line and sends the full text to the
browser console, as it does for every other line.

| Place                       | Line the player sees (before the error)                                                                    | Test (`packages/core/test/fork-set-net.test.ts`) |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Same-gear gate              | "The <set> <n>-piece set bonus was not measured, because its sim failed."                                  | 511-U                                            |
| Crossing gate               | the same sentence, for the crossed count                                                                   | 863-X                                            |
| Set step sim                | "The <set> <n>-piece set bonus was not measured on some rows, because their sim failed."                   | 511-U, 511-PC                                    |
| Bonus-off sim (break split) | the same "on some rows" sentence, for each bonus the step loses                                            | 511-LF                                           |
| Worn-1 pair sim (2pc value) | "The <set> 2-piece set bonus was not measured, because its sim failed."                                    | 863-F                                            |
| Set screen sim              | "The <set> set was kept without the quick check that can skip it, because the check's sim failed."         | 511-SF, 511-SA                                   |
| Worn-set ladder sim         | "The value of the <set> set at <n> pieces on your gear was not measured, because its sim failed."          | 476-D, 863-L                                     |

The worn-set ladder was not in this ticket's list; it is a set-phase sim
too. Its line names the failed sim's piece count, not a bonus, because the
ladder does not know which counts hold a bonus: one failed sim at 3 pieces
leaves counts 3 and 4 unmeasured, and a line per count would name a
Malorne 3-piece bonus that does not exist (case 863-L).

Identical lines (many rows' step sims failing with one error) show once
(`uniqueSubstitutions`). A sim that Stop refused adds no line: a Stop after
the candidate loop clears the set phase and its lines. The old tab-written
reason "the sims that measure it failed." is gone; when no sim ran because
the gate's requests could not be built, the line says "the sims that
measure it could not be built."

Verified by:
`pnpm exec vitest run packages/core/test/fork-set-net.test.ts packages/core/test/wowsims-fork-parity.test.ts`
(107 passed) in the pair, and in the pair's fork
`npx vitest run ui/features/upgrades/components/SubstitutionsList`
(4 passed). With the three engine files put back to fork `937e27d04`, the
eight changed set-net cases failed (8 failed, 43 passed with a `-t` filter),
`863-L` failed, and the SubstitutionsList case "shows every engine line as
one plain sentence" failed. Not checked on screen: no live tab run.

Not fixed here: a failed set-bonus read (`activeSetBonuses`, a
`computeStats` call, not a sim) still drops the set with only a console
warning. Filed as ticket 867.
