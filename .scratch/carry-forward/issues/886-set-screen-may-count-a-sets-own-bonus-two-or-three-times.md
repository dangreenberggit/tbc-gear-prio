Status: closed
Verified by: `pnpm exec vitest run packages/core/test/fork-set-net.test.ts -t "886-"` (3 passed; 886-W1 and 886-W3 failed before the fix with "expected 3 to be close to +0", 886-WU fails with the unmeasured-crossing guard removed: "expected 450 to be undefined") on tbc-new-fork@697f84ca3a1bb2b4d3ae168fc949f5640cb88d14; review in docs/reviews/fix-886-887-set-screen-and-tidy.md
Type: task
Origin: .scratch/agent-reports/2026-11-18-general-task-sum-of-singles-explained.md
Blocked by: none

# Set screen may count a set's own bonus two or three times when the set is worn at 1 or 3 pieces

A behaviour question for the owner, to be looked at after the naming
review. Closed 2026-11-20; see Resolution.

## What may be wrong

**The set screen may count the set's own bonus more than once for sets
worn at 1 (or 3) pieces.** Confirmed by test 2026-11-20 (Resolution below). Singles are plain sims
(`rank.ts:1115, 1132`). When a set is worn at 1, each single swap of
one of its pieces reaches 2 pieces, so it includes the 2pc gain. The
code itself expects this: `CrossingGate.count` is "the count a one-item
swap reaches" (`rank.ts:384`). `sumOfSinglesEstimate` corrects only
*other* sets' broken bonuses (`set-value.ts:222` skips the completing
set). So `sumOfSinglesDpsAt(setId, 3)` at worn 1 counts the 2pc gain
twice. Then `measure` adds `pairDps`, which counts it a third time
(`set-screen.ts:344-355`). In partner choice this cancels, because
every group gets the same extra amount. In the screen, `measure` is
compared *across* sets (`set-screen.ts:407+`). An inflated set can
take a top-2 slot or raise the band and push out another set. If
`SCREEN_ON_RULE` was scored on recordings that had this property, the
scoring may already absorb it (`set-screen.ts:44-48`). A unit test of
`sumOfSinglesDpsAt` at worn 1 would confirm or rule it out.

The file:line references above are to fork commit `1283e6eb7`, under
`ui/features/upgrades/model/engine/`.

## Why it matters

If it is true, a set worn at 1 or 3 pieces can look more valuable in
the set screen than it really is. It can take one of the top-2 slots
and push another set out, so that other set gets no bonus sims.

## How to settle it

A unit test of the set screen's estimate for a set worn at 1 piece,
as the report suggests.

## Source

`.scratch/agent-reports/2026-11-18-general-task-sum-of-singles-explained.md`,
section 3, item 1.

## Comments

Owner's words, 2026-11-18: "Set bonus question seems like a separate issue for afterwards"

## Resolution (2026-11-20)

**Real, and fixed; no set the screen keeps moved.** At worn w, each own
delta of the set reaches w + 1 pieces alone, so it held the bonus at w + 1
once. The estimate summed one per added piece and the pair added it again:
at worn 1 the 2pc was counted 4 times in the measure for a 4pc target, and
at worn 3 the 4pc was counted 4 times for a 6pc target.

- Tests (main repo, `packages/core/test/fork-set-net.test.ts`): `886-W1: at
  worn 1 the screen counts the 2pc once, not once per added piece plus the
  pair` and `886-W3: at worn 3 of a set with a 6pc, the screen counts the 4pc
  once`. They count the bonus in the estimate (0) and in the measure (1).
  `886-WU: when the crossing check at worn + 1 has no value, the screen keeps
  the set unread` covers the case where the bonus to take out is unknown.
  511-SN and 511-SD's expected measures moved to match
  (`docs/set-bonus-fixture-derivations.md`).
- Fix (fork `697f84ca3`): `rank.ts` runs the crossing checks before the
  screen and `estimatedDeltaAt` takes the crossing check's value out once per
  added piece; a crossing check that ran with no value leaves the estimate
  unset, so the screen keeps the set.
- `SCREEN_ON_RULE` was scored (K5E) on estimates with the extra bonus in
  them. Scoring again with it taken out (11 characters, N = 1000 bonus
  values) gives the same four robustness results as C203 and keeps the same
  sets on every character, with no near misses. The family's passing rules
  go from 117 to 116, and `choose` now picks the tab's rule. Script, command
  and output: `.scratch/set-bonus-value/886-rescore/` (its README); it loads
  the gitignored K5E scorer from the main checkout. Moved measures: 672 (215.8 to 178.4), 530 (40.9 to
  0.4), 676 (333.1 to 103.5) and 635 (3.5 to 7.2, its crossing value is
  noise). No re-tune and no owner ruling needed.
- Stored tab recordings: only ret-p3-p2's Crystalforge (629, worn 1) has a
  crossing value. Its fixed measure is -18.9, measure + 2 sigma = 0.71, so it
  stays ranked and in the top 2. Nothing moves. The recording still stores
  the old measure (-16.74); recordings are not re-recorded for this, and
  nothing reads it back.
