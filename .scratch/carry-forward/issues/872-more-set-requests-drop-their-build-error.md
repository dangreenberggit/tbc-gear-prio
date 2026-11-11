Status: open
Type: bug
Origin: ticket 869's fix, 2026-11-10, branch `fix/867-870-tab-errors`
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 869, 863

# Six more set-phase requests that cannot be built drop or misname their error

## What happens today

Read from the fork at `0f286ebc3` (branch `fix/867-870-tab-errors`),
paths under `ui/features/upgrades/model/engine/`. From code; none of
these is seen on screen or covered by a test.

Ticket 869 made `versionGears` (`rank.ts`) return a `BuildFailure` with
the caught error for each request it cannot build, and made the set
screen and the same-gear and crossing gates show it. Six other places
still lose the error, or say a sim failed when none ran:

1. The package's own sim (`rank.ts:2570`): with no request it throws
   `new Error("the package request could not be built")`, and the catch
   adds "The <set> <n>-piece set bonus was not measured, because its sim
   failed." with that made-up text. No sim ran, and the real error in
   the `BuildFailure` is dropped. Hypothesis, untested: with the
   broken-set flag on, the gate's own `composeFor` call before it fails
   the run first, so this is reached only with the flag off.
2. The step gear (`stepGear`, `rank.ts:3007`): a `BuildFailure` becomes
   undefined, and no line or warning names it.
3. The step's break split (`rank.ts:3268`): a console warning only.
4. The worn-1 pair that measures the 2pc (`rank.ts:3480`): a console
   warning only; its failed sim does get a line (`onSimFailed`).
5. The worn-set ladder (`set-less-copies.ts:229`): `applyCopies` runs
   inside the sim's `try`, so a request that cannot be built gives "The
   value of the <set> set on your gear was not fully measured, because
   its sim failed." The error does show; "its sim failed" is false.
6. The worn set's bonus list (`wornSetBonusCounts`, `rank.ts`, added by
   ticket 870): `applySetLessCopies` runs inside the read's `try`, so a
   set-less request that cannot be built gives "The <set> set bonuses
   were not all measured, because the sim could not list the set's
   bonuses." The error does show; no sim call failed.

The owner, 2026-11-06, in ticket 852: "i dont know why we need to invent
to new error, rather than just normally bubbling up whatever error we got
from existing sim code".

## Done when

Each of the six adds a line that ends in the caught error and does not
say a sim failed when none ran, and a fork-set-net case covers each one
that a scenario can reach (`Scenario.databaseWithout` makes `applyCopies`
throw).
