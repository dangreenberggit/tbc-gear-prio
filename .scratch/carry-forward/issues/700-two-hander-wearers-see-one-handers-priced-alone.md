Status: closed
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

## Closed, 2026-10-20 (stage dps-spec-coverage)

Verified by: main 40ef2f34, tests `packages/core/test/offhand-disclosure.test.ts`
("one-handed weapons while a two-hander is worn (ticket 700)"; re-run:
`pnpm exec vitest run packages/core/test/offhand-disclosure.test.ts`);
tbc-new-fork@5ec8def25, tests `ui/features/upgrades/hooks/useUpgradesSettings.offhand.test.tsx`
and `ui/features/upgrades/model/settings_pool.offhand.test.ts`; re-pinned in
main 060bb2cf; tab fixtures re-recorded at tbc-new-fork@5ec8def25

The owner ruled on 2026-10-20 (relayed by the coordinator) that a one-hander
simmed with an empty off hand is a meaningless row: a dual-wielder sims with
one weapon, and a caster loses its off-hand item's stats. So the done
condition above changed. While the worn main hand is a two-hander, the run
now holds out one-handed weapons before ordering, as it holds out off-hand
items: no sim, no row, no candidate-cap place, no Stop placeholder. The run
panel's eligible count leaves them out with the same predicate
(`oneHandBlockedEntries` in `engine/pool.ts`, shared by `rank.ts` and
`settings_pool.ts`). The substitutions list gets one line, field
`one-hand candidates`: "N one-handed weapons were not ranked, because you
wear a two-handed weapon." ("1 one-handed weapon was not ranked, ..." for
one). Two-handed candidates are still ranked, and nothing changes beside a
worn one-hander.

A first fix (a notice line only, fork 67d2d2074, main 1d6915a0 and
28aa5fd7) was replaced by these commits; history was not rewritten.

Red checks: the three new core tests fail on the notice-only code (main
28aa5fd7's `rank.ts` and `pool.ts`); the two fork count tests fail without
the `settings_pool.ts` change ("expected 2 to be 1").

Fixtures: the six two-hander recordings lose exactly their one-handed weapon
rows (feral P3 66 each, feral P2 49, feral P5 96, ret P3 68) and gain the line with the same N; every other row is unchanged. The only other change is that The
Fists of Fury (set 719) leaves `setBonuses` in the feral P3 and P5
recordings: both of its pieces are held-out one-handed weapons. Warlock and
enhancement (one-handers worn) are unchanged apart from `contentHash`
(ENGINE_VERSION).
