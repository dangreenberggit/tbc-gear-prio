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
leaves the next throw added below the row to re-open the hole silently.

**Two limits on "every exit", stated because the first draft of this note
overclaimed.** The wrapper covers every exit *from `rankAfterJobCreated`*:

1. The `job.update(status: "running")` immediately after `job.create` is
   **outside** the try. A store that throws there leaves the row `queued`, not
   `running` — not a stranded attach target, so the Phase 2 hazard does not
   apply, but it is not "by construction" either.
2. Recording the failure is **best-effort**. If the store is itself what
   broke, the error-path `job.update` fails too; that error is swallowed so the
   caller still sees the original failure rather than the bookkeeping one.

Tests at the `rankUpgrades` seam in `rank.test.ts`:

- *"errors the job row when the run throws after the row is created"* — throws
  from `Store.put`, which runs after every sim, so the run is otherwise
  complete and only the exit path is under test. The meta-unsolvable throw
  leaves by the same route, without needing a palette rigged to be unsolvable.
  Asserts `status`, `errorKind` and `errorDetail`, and that the original error
  message propagates.
- *"keeps the original error when the store cannot record the failure"* —
  pins limit 2.

Re-run:

```
pnpm vitest run packages/core/test/rank.test.ts -t "job row"
```

Mutation-checked, both directions:

| mutation | result |
|---|---|
| delete the error-path `job.update` | `expected 'running' to be 'error'` |
| `errorKind` back to `"sim-failed"` | `expected 'sim-failed' to be 'internal'` |
| remove the best-effort inner `catch` | `expected [Function] to throw error including 'blob write exploded' but got 'job table is on fire'` |
