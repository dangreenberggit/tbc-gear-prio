Status: open
Type: bug
Origin: Pre-merge review fix round, feat/upgrades-tab-batch-sim (2026-09-01)
Blocks: none
Blocked by: none

# The 25-candidate bulk batch bound is validated only at 5,000 iterations

Group: `.scratch/upgrades-tab-sim-followups/README.md`

## What

`MAX_CANDIDATES_PER_BULK_REQUEST = 25` (`engine/bulk/partition.ts`) exists to keep
every screening chunk inside both engines' single-stage, no-culling regime. The
bound is correct at today's default iteration count and **only** at that count:
the boundary it sits below moves DOWN as iterations rise, and nothing in the code
couples the constant to the caller's `iterations`.

The gate is `shouldUseLegacyBulkSim`, which compares an estimate of the pre-High
stages against `highStageIterations * candidateCount`
(`wasm/bulk_sim/estimate.ts:14-32`; `sim/core/bulk/estimate.go` on the Go side).
Because the candidate count is multiplied by the iteration count on one side of
that comparison, raising iterations lowers the candidate count at which the
estimator decides to run extra stages.

Measured boundaries:

| iterations | no-culling bound |
| --- | --- |
| 3,000 | 39 (TS side) |
| 5,000 | 32/33, on **both** engines |

So at 5,000 the constant 25 has margin. Extrapolating the same direction, a high
enough iteration count pushes the boundary below 25 and the bound silently stops
doing its job.

## Why it matters

Crossing the boundary is silent. A two-stage run culls candidates and returns
fewer rows than it was asked for, with **no error field set** — the web track
measured n=33 at 5,000 iterations returning 5 rows of 33. The only thing standing
between that and a silently truncated ranking is the row-completeness assertion in
`bulkScreenResultFrom` (`adapters/bulk_wasm_sim_runner.ts`), which turns it into a
thrown error rather than missing candidates. That assertion is a backstop, not a
fix: the user gets a failed screening pass instead of a wrong one.

## How it could be reached

`DEFAULT_ITERATIONS` is 5000 (`engine/rank.ts`), but the count is caller-supplied
(`RankInput.iterations`), so it is not pinned to the default. Ticket 339 is an
open owner decision to **raise the base iteration count** and adopt adaptive
iterations — which is exactly the change that would move this boundary, and it is
already on the board. The two tickets should be read together.

## What to do

Pick one; both are small.

1. **Assert the coupling.** Have `partitionForBulkScreen` (or its caller) take the
   iteration count and throw when `maxPerRequest` is not provably inside the
   single-stage regime for that count. Turns a silent regime change into a loud
   one at the point of the decision.
2. **Re-measure and re-derive the bound** whenever the default iteration count
   rises, and record the measurement next to the constant the way the current
   5,000-iteration numbers are recorded. Cheaper, but it is a process guarantee
   rather than a code one, and the failure it guards against is silent.

Option 1 is preferred precisely because the failure mode is silent; a comment
cannot catch a caller passing a high `iterations`.

## Acceptance

- [ ] Either the batch bound is checked against the iteration count in code, or
      the re-measurement obligation is recorded where someone raising the
      iteration count will encounter it.
- [ ] If asserting: a test covers an iteration count high enough to make the
      current constant invalid, and shows the assertion firing rather than a
      truncated screen.
- [ ] Ticket 339's decision, when taken, states what it does to this bound.

## Notes

The mechanism was originally documented wrongly — the comments said Go "engages
its Medium cull stage at 26", attributing the boundary to the Medium stage's
`MaxSurvivors: 25` rather than to `shouldUseLegacyBulkSim`. That was corrected in
the same fix round that filed this ticket (`partition.ts` and
`bulk_http_sim_runner.ts` comments). The corrected mechanism is what makes the
iteration-sensitivity visible, which is why this ticket exists.
