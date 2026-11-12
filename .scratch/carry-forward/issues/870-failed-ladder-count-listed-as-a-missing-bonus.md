Status: closed
Type: bug
Origin: docs/reviews/fix-621-863-865-tab.md (round 2, row F1)
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 863

# A failed worn-set sim can list a break of a set bonus that does not exist

## What happens today

Hypothesis, untested on screen: when one of the worn-set ladder sims
fails, a row that drops a worn set by two or more pieces can list a break
of a bonus the set does not have, for example "Breaks Malorne Harness 3pc"
(Malorne Harness has bonuses only at 2 and 4 pieces, fork
`sim/druid/item_sets.go:76-120`). The fixer of the round 1 findings on
branch `fix/621-863-865-tab` raised it.

The code path is confirmed by reading, not by a run. Fork at `74b9c3bc1`,
paths under `ui/features/upgrades/model/engine/`:

1. `measureWornSetLadder` (`set-less-copies.ts:204-241`): when rung c's
   sim fails, both counts c and c + 1 become `unmeasured: "sim-failed"`,
   whatever counts hold a bonus.
2. `measureWornSetLadders` (`rank.ts:3573-3576`): an entry is `counted`
   when it is unmeasured, so a failed count 3 of Malorne is counted.
3. `countedLadderBreaks` (`rank.ts:3584-3590`) then accepts
   `(Malorne, 3)`, and the failed entry goes into `brokenSetValues` with
   threshold 3 (`rank.ts:2121-2131`).
4. `brokenSetBonuses` with that predicate (`set-value.ts:250-261,
   269-311`) lists every count from the worn count down to the count
   after the swap that the predicate accepts. A swap from 4 Malorne pieces
   to 2 lists thresholds 4 and 3; a single swap from 4 to 3 lists only 4.
   The row's own breaks (`view.ts:364-371`, `singleSwapBreaks`) use the
   same rule.
5. The label is `${setName} ${threshold}pc` (`utils/set_bonus_labels.ts:21`),
   shown through locale strings such as `tip_breaks`: "Breaks {{set}}
   {{threshold}}pc" (`assets/locales/en/upgrades.json:87`).

Count 3 of Malorne is unmeasured when rung 2 or rung 3 fails. Not checked:
whether any later step drops a break with no figure before it is shown.

It is older than this branch: the merge-base fork `b77e48ae3` has the same
`counted` rule (`git -C vendor/tbc-new-fork show b77e48ae3:ui/features/upgrades/model/engine/rank.ts | grep -n -A4 "const counted ="`,
lines 3486-3490) and the same `sim-failed` rungs in `set-less-copies.ts`.

## What to do

Find the direct signal for "this count has a bonus" when the ladder count
is unmeasured, and stop listing a break at a count with no bonus. Run a
case in `packages/core/test/fork-set-net.test.ts` (rung 2 or 3 of a
four-piece Malorne fails, a row drops two Malorne pieces) first, to see
whether the 3pc break shows.

## Done when

A fork-set-net case with a failed ladder rung shows breaks only at counts
where the set has a bonus, and it failed before the fix.

## Closing note

Fixed 2026-11-10 on branch `fix/867-870-tab-errors`, fork commit
`64ad50972` 'List a failed ladder count only if it has a bonus'.

The bug was real in the model run: case 870-A (worn Malorne 4, rung 3
fails, a Thunderheart pair takes Malorne to 2) listed Malorne breaks at
2, 3 and 4 before the fix (`expected [ 2, 3, 4 ] to deeply equal [ 2, 4 ]`).
The case reads the breaks from `brokenSetValues` and each row's
`singleBreaks`, `commitBreaks` and `futureBonuses[].breaks`; not
checked on screen.

The direct signal is the sim's own list of active set bonuses
(`SimRunner.activeSetBonuses`, ticket 644). In the fork's
`model/engine/rank.ts`, when a worn set has an unmeasured ladder count,
`wornSetBonusCounts` reads that list on the worn gear and on the worn
gear with the set's pieces sent set-less; the bonuses that go are the
set's, with their counts. An unmeasured count is counted as a break only
when that list has a bonus at it. No set name is matched.

When that list cannot be read, the count is counted as before, and a
line gives the read's error: "The <set> set bonuses were not all
measured, because the sim could not list the set's bonuses." (case
870-B). In that state a break at a count with no bonus can still be
listed: ticket 871. (Ticket 871, fork `4794a28d7`, later changed this
state: no failed count is counted, and 870-B now pins that.)

Verified by: in the pair,
`pnpm exec vitest run packages/core/test/fork-set-net.test.ts -t "870-"`.
870-A and 870-B failed before the fix and pass with it; the whole file
passes (108 tests).
