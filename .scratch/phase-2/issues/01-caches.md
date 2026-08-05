Status: open
Type: task
Origin: PLAN.md §14 Phase 2, §11, §7
Blocks: none
Blocked by: none

# Caches — gear snapshot cache, SQLite store adapter, cache-hit contract

Branch: `phase-2/caches` off `phase-2/trust`.

First slice, because it is the only Phase 2 subplan that does **not** change the
shape of `Ranking`. Landing it first keeps the type stable while the other four
slices are written against it.

## What exists today

`rankUpgrades` already caches the **ranking** by content hash —
`packages/core/src/rank.ts:251` reads `rankingCacheKey(contentHash)` and
`:449` writes it — and `MemoryStore` (`packages/core/src/seams/store.ts`)
implements both the blob half and the job half of the `Store` interface.

So "re-run hits cache" is partly built. What is missing is the half §11 calls
the primary defence of the point budget.

## Scope

1. **Gear snapshot cache.** §11: *"Gear snapshots and sim results both live in
   `kv` under their content addresses"* and *"The gear cache is the primary
   defence of the WCL point budget and must land in Phase 2 at the latest."*
   Today a cache hit on the ranking still re-reads gear — §4 says so explicitly
   and that is correct behaviour, because the hash covers the logged gear and
   is not knowable until the read happens. The cache to add is one level down:
   the **gear snapshot for a resolved (reportCode, fightId, character)** is
   immutable and must be served from `kv` without a WCL call on the second run.
2. **Sim-result cache** under the content address of the `RaidSimRequest` +
   `simVersion`, per §11's "a sim result for a given request + version can never
   change". This is what makes a partial re-run cheap when only some candidates
   changed.
3. **`SqliteStore`** — the second `Store` adapter named in
   `packages/core/src/seams/store.ts`'s own header comment (*"SqliteStore
   (production, later)"*), against the two-table schema in §11 (`jobs`, `kv`).
   Write it against the same contract tests as `MemoryStore`, so the adapters
   are provably interchangeable. Deployment (§14 Phase 4) is out of scope —
   this is the adapter and its tests, not a deployed database.
4. **Retention semantics** from §11: gear snapshots and sim results immutable
   and permanent; job rows kept. No TTL logic here. (§12's short TTL on the
   *fight-list* query is a Phase 3 concern and explicitly not this ticket.)

## Gate box owned

> ☐ re-run hits cache; deltas stable

Two halves, and the second is the one that has teeth:

- **hits cache** — run the same input twice against a counting `GearSource` and
  a counting `SimRunner`; assert zero WCL gear reads and zero sim runs on the
  second pass.
- **deltas stable** — assert the second `Ranking`'s `items` are deep-equal to
  the first's, not merely that it returned. A cache that returns a
  *differently-ordered* ranking passes a naive check and fails the user.

## Testing

Per AGENTS.md § Testing: the primary test is at the module interface
(`rankUpgrades`) through recorded adapters. The `Store` contract tests are the
exception that proves the rule — they test an adapter pair directly, which is
what a seam with two implementations is for. Do **not** assert on stage
internals.

## Done when

- Second identical run performs zero WCL gear reads and zero sim runs, with a
  deep-equal `Ranking`.
- `SqliteStore` and `MemoryStore` pass one shared contract suite.
- `pnpm verify` green; `pre-merge-review` written to
  `docs/reviews/phase-2-caches.md`.
