Status: open
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
