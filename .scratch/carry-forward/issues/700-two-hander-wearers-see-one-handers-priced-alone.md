Status: open
Type: task
Origin: docs/reviews/feat-dps-spec-coverage.md (D1)
Serves: .scratch/plans/upgrades-tab-finish-line.md
Blocks: none
Blocked by: none

# With a two-hander worn, the tab prices each one-hander next to an empty off hand and does not say so

A player who wears a two-hander (a staff caster, a shadow priest, an Arms
warrior, a hunter with a two-hand melee weapon) cannot see whether a
one-hander plus an off-hand item would beat the worn two-hander. Each
one-hander candidate is simmed with the off hand empty, so it usually reads
as a loss or falls below the cutoff (that it usually reads as a loss is
hypothesis, untested). The off-hand items themselves are held out and counted
in one line ("N off-hand items were not ranked ... Rank with a one-hander
worn to price them"), but nothing tells the player that the one-hander rows
were priced alone.

This predates feat/dps-spec-coverage: the off-hand guard and
`clearOffHandForTwoHander` are in tbc-new-fork@bc3cca6a1
`ui/features/upgrades/model/engine/rank.ts` (`git -C vendor/tbc-new-fork show
bc3cca6a1:ui/features/upgrades/model/engine/rank.ts | grep -n clearOffHandForTwoHander`).
The opposite direction is handled: a two-hander candidate clears the worn
off hand.

Code (fork 766e87be2, `ui/features/upgrades/model/engine/rank.ts`): the
blocked off-hand filter near the `mainHandLeavesOffHandFree` call, the
off-hand guard in `attemptEligibility`, and `clearOffHandForTwoHander`.

## Done means

A player wearing a two-hander can tell from the page that one-hander rows
were priced with an empty off hand, or the tab prices the best one-hander
and off-hand pair. Which of the two is a design call for the planner; check
whether wowsims already has a way to sim a weapon pair before building one.
