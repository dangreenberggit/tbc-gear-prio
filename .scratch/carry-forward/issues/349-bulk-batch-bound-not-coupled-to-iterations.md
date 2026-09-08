Status: closed
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

## Resolution (2026-09-02, `feat/upgrades-tab-batch-sim`, fork `80395e68c`)

**Option 1** — assert the coupling in code — implemented, using upstream's own
estimator rather than a transcribed formula. **And this ticket's premise is
wrong at 25, which the fix records rather than quietly leaving.**

### The premise, corrected

The claim was that "a high enough iteration count pushes the boundary below 25".
It does not. Running upstream's `shouldUseLegacyBulkSim` over twelve iteration
counts gives the first multi-stage `n`:

| iterations | first multi-stage n | | iterations | first multi-stage n |
| --- | --- | --- | --- | --- |
| 3,000 | 40 | | 28,000 | 28 |
| 5,000 | 33 | | 28,001 | **27** |
| 7,500 | 31 | | 30,000 | 27 |
| 10,000 | 30 | | 50,000 | 27 |
| 15,000 | 28 | | 100,000 | 27 |
| 20,000 | 28 | | 1,000,000 | 27 |

The boundary does move down as iterations rise, exactly as the ticket says — but
it **floors at 27** and never goes lower, not even at a million iterations. `n =
25` and `n = 26` are single-stage at every one of these counts.

Two mechanisms, both identical on the Go side (`sim/core/bulk/estimate.go` and
`stage.go` carry the same formula and the same constants):

- **At n ≤ 25 no pre-High stage runs at all.** Medium requires `candidateCount >
  maxSurvivors` (25) and Low requires > 100 (`wasm/bulk_sim/stage.ts:69-76`), so
  the estimate reduces to `high×(n+1) ≥ high×n` — true for **any** `high`.
- **At n = 26 Medium does run**, and the comparison becomes `1000×27 + high×26 ≥
  high×26` — again true for any `high`, because the Medium term is added to a
  quantity already equal to the right-hand side.

Only at n = 27 does the inequality start to depend on the iteration count at all,
and it flips at 28,001. So the shipped bound of 25 is **iteration-invariant by
construction**, not by luck at today's default: the failure this ticket feared
cannot happen at this constant, and ticket 339's raise to 5,000 (closed;
adaptive not adopted) could not have reached it either.

The earlier "39 at 3,000" figure in the table above was measured on a narrower
probe and is superseded by 40; the direction and the mechanism were right.

### The Go engine measured, not inferred

The table is the TypeScript estimator. Because the fix relies on the two engines
agreeing, the boundary was also driven live against the packaged Go server
(`wowsimtbc` on :3333, feral cat druid) with the chunk bound temporarily raised
and the guard temporarily disabled, at **30,000 iterations** — past the 28,001
flip:

```
n = 27:  2026/09/02 08:18:49 [Bulk Sim] - Stage: medium - Starting
           Candidates: 27
         2026/09/02 08:18:51 [Bulk Sim] - Stage: medium - Finished
           Input gear sets: 27
           Completed candidates: 27
           Survivors: 5          <- 22 of 27 culled, no error field set
         2026/09/02 08:18:51 [Bulk Sim] - Stage: high - Starting
           Candidates: 5

n = 26:  2026/09/02 08:19:40 [Bulk Sim] - Stage: high - Starting
           Candidates: 26        <- one stage, no medium, nothing culled
```

Two stage lines at 27, one at 26 — the Go engine flips exactly where upstream's
TypeScript estimator says it does. Both edits were reverted; the fork tree was
confirmed clean afterwards.

### The guard

`adapters/bulk_request_builder.ts` gains:

```ts
export function assertSingleStageChunk(request: BulkSimRequest, candidateCount: number): void
```

which calls upstream's `shouldUseLegacyBulkSim` on the **actual built request**
and throws naming the count and the iteration count when it would go multi-stage.
The chunk driver calls it per chunk, deliberately outside the try that degrades
transport failures, so it can never be swallowed as one. Upstream's function
rather than a transcribed formula, so the check cannot drift from the thing it
is checking (borrow upstream, don't mirror).

`packages/core/test/bulk-boundary.test.ts` reproduces the whole table, asserts 25
stays single-stage at 1,000,000 iterations, and **makes the guard fire** —
(27 candidates, 30,000 iterations) throws; (25, 1,000,000) and (26, 1,000,000)
do not.

`MAX_CANDIDATES_PER_BULK_REQUEST` is left at 25. 26 would also be safe; leaving
it is deliberate.

## Acceptance

- [x] Either the batch bound is checked against the iteration count in code, or
      the re-measurement obligation is recorded where someone raising the
      iteration count will encounter it. **Checked in code**, per built chunk,
      against upstream's own estimator.
- [x] If asserting: a test covers an iteration count high enough to make the
      current constant invalid, and shows the assertion firing rather than a
      truncated screen. `bulk-boundary.test.ts` fires it at (27, 30,000) — the
      current constant is never invalid, so the test uses the first count that
      is, which is what the ticket is asking to demonstrate.
- [x] Ticket 339's decision, when taken, states what it does to this bound. 339
      is closed (base raised to 5,000, adaptive not adopted); the bound is
      iteration-invariant, so the answer is "nothing", now recorded in
      `partition.ts`'s header and `DEFAULT_ITERATIONS`'s comment.

## Notes

The mechanism was originally documented wrongly — the comments said Go "engages
its Medium cull stage at 26", attributing the boundary to the Medium stage's
`MaxSurvivors: 25` rather than to `shouldUseLegacyBulkSim`. That was corrected in
the same fix round that filed this ticket (`partition.ts` and
`bulk_http_sim_runner.ts` comments). The corrected mechanism is what makes the
iteration-sensitivity visible, which is why this ticket exists.
