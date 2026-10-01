Status: open
Type: defect
Origin: stage-gate 511-512-set-credit, 2026-09-28 (`.scratch/stage-gate/511-512-set-credit/decision-log.md` lines 20, 46 and 69; gitignored)
Blocks: none
Blocked by: none
Related: 236, 243, 511, 512, 526

# The Upgrades tab's replicate seeds overlap, so its paired SE is too small

This ticket is a record only. Do not start a fix from it. The owner was
told this finding would be recorded unless they objected, and gave no
answer.

## What is wrong

The tab's paired-replication seeds are 11, 22, 33, 44 and 55. The sim
seeds iteration i of a run with `RandomSeed + i`, so two runs whose seeds
differ by less than the iteration count share most of their iterations.
The five replicates are therefore not independent, and the standard error
computed from their spread understates the real noise.

Line numbers below are at fork commit
`bb9e925e0d404f4caf82f7a202bd5296e6f7cdb0` (`data/wowsims-fork.lock.json`
`commit` on 2026-10-01). Paths are inside `vendor/tbc-new-fork`. Each line
was read with `git -C vendor/tbc-new-fork show <sha>:<path>`.

## The seeds

- `ui/core/components/individual_sim_ui/upgrades/engine/rank.ts:568`:
  `const DEFAULT_SEEDS = [11, 22, 33, 44, 55];`
- `rank.ts:724`: `const seeds = input.seeds ?? DEFAULT_SEEDS;`
- The tab passes no seeds. Its `RankInput` at
  `ui/core/components/individual_sim_ui/upgrades_tab.tsx:1784-1793` sets
  `iterations` from the picker and no `seeds`. The picker's value starts
  at 3000 (`upgrades_tab.tsx:106` and `660`).
- `engine/se.ts:19-35` (`assertUsableSeeds`) rejects only repeated seeds.
  It does not check spacing.

## The sim's seeding rule

- `sim/core/sim.go:348` calls `sim.reseedRands(int64(i))` before each
  iteration.
- `sim/core/sim.go:249`, inside `reseedRands`:
  `rseed := sim.Options.RandomSeed + i`.
- `sim/core/sim_concurrent.go:38-39`: a split run offsets each part's
  start seed by the iterations before it, so a split run uses the same
  seeds as an unsplit one.

So a run of N iterations from seed S uses the per-iteration seeds S to
S+N-1. At the tab's default 3000 iterations, seeds 11 and 22 share 2,989
of 3,000 iterations, and seeds 11 and 55, the furthest apart, share
2,956. This is arithmetic from `sim.go:249` and `sim.go:348`, not a
measurement.

## What the replicates feed

- `rank.ts:1530` calls `replicateTopItems` after the main pass.
  `rank.ts:1635-1674`: for the top `PAIRED_REPLICATE_TOP_N` rows (8,
  `engine/se.ts:6`), it sims the baseline and the candidate at each of the
  five seeds and sets:
  - `item.se = pairedReplicateSe(deltas)` (`rank.ts:1667`), the sample
    standard deviation of the five deltas over √5 (`engine/se.ts:37-48`);
  - `item.seMethod = "paired-replicate"` (`rank.ts:1668`);
  - `item.deltaDps` to the mean of the five deltas (`rank.ts:1669`);
  - `item.belowCutoff` from that mean (`rank.ts:1672`).
- `engine/view.ts:153-157` (`tieWindow`): the tie window between two rows
  is 2 × se. `engine/view.ts:180` groups a row with the group leader when
  their gap is within that window.

Effects, none measured:

- The paired se of the top eight rows is too small. Hypothesis, untested,
  for the size at the tab's default 3000 iterations. For the same seeds
  in `packages/core` at 3000 iterations, the doc comment above
  `DEFAULT_SEED_BASE` in `packages/core/src/rank.ts` records a
  `sampleSd/SE` of 0.087 where independence gives about 0.9 (ticket 236,
  `.scratch/handoffs/ticket-236-seed-spacing-measurements.md`).
- Because the tie window is 2 × se, the tab may split rows into different
  tie groups when their difference is within the real noise. Hypothesis,
  untested.
- The mean of five near-copies is close to the single-seed delta, so the
  mean `deltaDps` and the `belowCutoff` decision get little benefit from
  the extra sims. Hypothesis, untested.
- Other readers of `item.se` were not traced.

## Prior evidence

From `.scratch/stage-gate/511-512-set-credit/decision-log.md`
(gitignored, so a fresh checkout does not have it):

- Line 20, 2026-09-28: a verifier found that K1's seed replicates 11, 12
  and 13 shared 9,999 of 10,000 iterations, and recorded the lesson that
  any seed-replicate test must use seeds at least the iteration count
  apart.
- Line 46, 2026-09-28: the planner flagged that the tab's `DEFAULT_SEEDS`
  (11 to 55) overlap, as an out-of-scope finding.
- Line 69, 2026-09-28: K2's re-measure with independent seeds gave a
  spread that suggests real noise is about half of K1's upper-bound se.

## This was already fixed in `packages/core`

Ticket 236 found the same defect in `packages/core/src/rank.ts` and fixed
the seeds there (commits `70e634d2` and `c7ecba7c`, 2026-08-19). Ticket
236 is still `open`, for two acceptance boxes it marks as partial.
`packages/core/src/rank.ts` now uses `defaultSeedsFor(iterations)`, which
spaces seeds by the iteration count (`replicateSeeds`,
`packages/core/src/se.ts:114-120`). Its `assertUsableSeeds(seeds,
iterations)` (`packages/core/src/se.ts:74-95`) rejects seeds closer than
the iteration count.

The fork's engine was ported from core commit `12ce5841` (2026-08-14),
named in `engine/PROVENANCE.md` at the fork commit above. That commit is
an ancestor of `70e634d2`: `git merge-base --is-ancestor 12ce5841 70e634d2`
returns 0. The fork's `engine/se.ts` says it is "PORTED verbatim" from
core's `se.ts`, but it lacks the spacing check, so the port predates the
fix.

## What would close this

- The tab's default seeds are spaced by at least the run's iteration
  count, for every iteration count the picker allows.
- The fork's `assertUsableSeeds` rejects under-spaced seeds, as core's
  does.
- A test pins both, and `engine/PROVENANCE.md` and the parity test are
  updated for the changed files.
- The paired se on one tab ranking is compared before and after, with a
  command a reader can re-run.
