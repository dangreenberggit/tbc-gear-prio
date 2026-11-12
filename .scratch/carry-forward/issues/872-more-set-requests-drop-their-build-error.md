Status: closed
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

## Closing note

Fixed 2026-11-10 on branch `fix/867-870-tab-errors`, fork commit
`365eb7cce` 'Show build errors in the last set-phase places'. Paths under
the fork's `ui/features/upgrades/model/engine/`. Each line shows the
tab's sentence, and under it the caught error's first line (ticket 874):

1. Package sim (`rank.ts`): the package's plain version is kept as a
   `BuildFailure` when it cannot be built, and the line is "The <set>
   <n>-piece set bonus was not measured, because the sims that measure it
   could not be built." No made-up error, no "its sim failed".
2. Step gear (`stepGear`): it returns the reason. A build error gives
   "The <set> <n>-piece set bonus was not measured on some rows, because
   their sims could not be built."; a failed gem repair, which was silent
   too, gives "... on some rows, because no gem swap could turn your meta
   gem on." A failed partner comparison keeps the first such reason.
3. Step break split (`queueBonusOff`): "On some rows, the cost of breaking
   the <set> <n>-piece set bonus was not measured apart from the pieces
   that break it, because their sim could not be built."
4. Worn-1 pair (`measurePairTwoPiece`): a build error gives "The <set>
   2-piece set bonus was not measured, because the sims that measure it
   could not be built."; a failed gem repair, silent before, gives "...
   because no gem swap could turn your meta gem on."
5. Worn-set ladder (`measureWornSetLadder`, `set-less-copies.ts`): each
   rung is built before its sim; a rung that cannot be built gives "The
   value of the <set> set on your gear was not fully measured, because
   its sim could not be built."
6. Worn set's bonus list (`wornSetBonusCounts`): "The <set> set bonuses
   were not all measured, because the check that lists the set's bonuses
   could not be built."; no failed ladder count is then a break, as for a
   failed read (ticket 871).

No place needed an owner's choice: each line follows the "could not be
built" wording ticket 869 used.

Verified by: in the pair,
`pnpm exec vitest run packages/core/test/fork-set-net.test.ts -t "872-"`.
872-P, 872-S, 872-B, 872-W, 872-L and 872-R (one per place) failed with
the fork's `rank.ts` and `set-less-copies.ts` put back to `038876c98` (6
failed) and pass with the fix. The scenarios make a request fail to
build with `Scenario.composeFailsWhen` (the compose throws) or
`databaseWithout` / `databaseOmits` (`applyCopies` finds no row).
872-P runs without the broken-set flag: with it on, the gate composes
the package gear first, so a compose error there would fail the run
(from reading `rank.ts`, untested).
