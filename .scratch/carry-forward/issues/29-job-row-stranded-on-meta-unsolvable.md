Status: closed
Type: bug
Origin: `docs/reviews/feat-content-hash.md` Adversarial finding A3
Blocks: none
Blocked by: none

# A `meta-unsolvable` throw strands its job row `running`

`rankUpgrades` creates a job row on the cache-miss path and drives it
`create` → `running` → `done`, with an `error` update on the sim-failure path
(`packages/core/src/rank.ts`, the `deps.sim.run` catch).

`equipmentForCandidateSwap` can also throw, inside the candidate loop and
therefore **after** `job.create`:

```
packages/core/src/rank.ts  (equipmentForCandidateSwap)
  if (err instanceof MetaUnsolvableError) {
    throw new RankError("meta-unsolvable", err.message);
  }
```

That `RankError` propagates out of `rankUpgrades` with no `job.update`, so the
row is left `status: "running"` forever.

## Why it is minor today

Nothing consumes job rows in production yet — there is no
`findByContentHash` and no web path (see ticket 24's note, and ADR-0019's
consequence that the job surface is a handle rather than the §7 dedupe
payoff). The blob cache is keyed separately, so **no number is wrong** and no
caller currently observes the stranded row.

## Why it should still be fixed

The moment the Phase 2 job API attaches to a `running` row instead of starting
a second sim — which is exactly §7's second payoff — a stranded row becomes a
job that never completes and never errors. A caller would wait on it forever.

## Done when

Every path that leaves `rankUpgrades` after `job.create` either completes or
errors the row. The obvious shape is a `try`/`catch` around the candidate loop
(or the whole post-create body) that marks `error` with the `RankError` kind
and rethrows, rather than one `catch` per throw site.

Test: a `rankUpgrades` call whose gem palette makes the meta unsolvable leaves
its row `error`, not `running`. `meta-repair.test.ts` already has palettes that
trigger `MetaUnsolvableError`.

## Resolved 2026-08-04

One `catch` around the whole post-create body, as suggested above, marking
`error` with `err.kind` when it is a `RankError` and rethrowing unchanged. The
existing per-site `catch` on the baseline sim collapsed into it.

**The per-site shape was the actual defect**, not just the one missed path: it
leaves the next throw added below the row to re-open the hole silently. The
wrapper covers every exit by construction.

Test is at the `rankUpgrades` seam (`rank.test.ts`, "errors the job row when
the run throws after the row is created"). It throws from `Store.put`, which
runs after every sim, so the run is otherwise complete and only the exit path
is under test — the meta-unsolvable throw leaves by the same route, without
needing a palette rigged to be unsolvable. Mutation-checked: deleting the
`job.update` fails it with `expected 'running' to be 'error'`.
