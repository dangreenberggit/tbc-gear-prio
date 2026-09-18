# How the upgrades tab runs its sims — and the native path it does not use

This doc exists to stop a specific confusion recurring: **our fork upgrades tab
hand-rolls batch simming, while the engine it runs on ships a native batch-sim
primitive it never calls.** Both facts are true at once, they look
contradictory, and the code carries a comment asserting the native primitive
does not exist. This doc records what is actually there, why the assumption
drifted, and what is and is not safe to change.

Companion to [ADR-0025](adr/0025-upstream-has-a-gem-optimizer-we-stay-pinned-and-borrow-only-its-rules.md)
(the reforge/gem _optimizer_, reference-only) and
[`fork-phase-seams.md`](fork-phase-seams.md) (content-tier joints). This one is
about the _sim-dispatch_ path.

## How this was produced

Direct reads of the fork clone `vendor/tbc-new-fork` at HEAD
`cab940cd62c180083a695c30b37c8eb1562a8dc0` (branch `feat/upgrades-tab`, based on
upstream `feature/backend-reforge` = `cbf6b75`), 2026-08-31, cross-checked
against the pinned engine proto in `data/proto/`. `vendor/` is gitignored and
present only in the main checkout; re-run the greps there to re-verify. Every
`file:line` below is from the fork tree unless it names `data/proto/`.

## Headline

- **Our tab dispatches one ordinary `RaidSimRequest` per candidate**, through a
  bounded-concurrency loop we own. It does not build a `BulkSimRequest`, does not
  reuse upstream's `BulkTab`, and does not call the reforge optimizer.
- **The backend-reforge engine has a genuine native batch-sim primitive** —
  `BulkSimRequest`/`BulkSimResult`, a staged Reforge→Low→Med→High funnel, and an
  embedded reforge-optimize request — backed by a full Go package. Our tab
  ignores it.
- **The comment that justifies hand-rolling is stale.** It says "there is no bulk
  RPC." That was true for the `v0.0.101`-era engine our ranking engine was
  ported from; it is **false for the fork's backend-reforge engine.**

## What our tab actually does (verified)

Our added code is the tree `ui/core/components/individual_sim_ui/upgrades/`
plus `upgrades_tab.tsx` (the diff `cbf6b75...HEAD`). Inside it:

- The ranking engine (`upgrades/engine/`) is a port of this repo's
  `packages/core` — its comments cite `packages/core/src/...` throughout.
- It constructs its own runner: `new WorkerPoolSimRunner()` (`.../upgrades/engine/rank.ts:446`).
- It builds one task per candidate and runs them through our own bounded pool:
  `promisePool(tasks, concurrency)` (`rank.ts:858`/`:869`, helper at
  `.../upgrades/engine/promise-pool.ts:24`).
- Each task calls `deps.sim.run(...)` (`rank.ts:605`, `:727`, `:1126`, `:1290`).
- `WorkerPoolSimRunner.run` builds a single `RaidSimRequest` and calls
  `this.pool.raidSimAsync(proto, ...)` (`.../upgrades/adapters/worker_pool_sim_runner.ts:118`)
  on a `WorkerPool` it owns (`worker_pool_sim_runner.ts:89`), separate from `Sim`'s pool.

So "batch" for the tab is a **caller-side loop over independent single sims**,
concurrency coming only from the `WorkerPool`'s least-busy-worker balancing.
Reforge optimization is invoked **nowhere** — a count-grep for
`reforge|Reforge|bulkSim|BulkSim|BulkTab|reforgeOptimize` across `upgrades/`
returns **0**.

## The native path that exists on this engine (verified)

The backend-reforge engine — the one the fork builds against — has a real
server-side batch primitive:

- **Proto** (`vendor/tbc-new-fork/proto/api.proto`): `BulkSimRequest` (`:428`)
  carries a shared `base_request`, `repeated candidates`, `optimized_candidates`,
  `top_results`, `high_stage_iterations`, and an embedded `reforge_request`
  (`:435`); `BulkSimResult` at `:758`; a `BulkSimStage` enum (`:418`) with a
  Reforge → Low → Medium → High → Complete funnel; helper messages
  `BulkCombinationCountRequest` / `BulkCandidatesRequest` (`:794`/`:807`); and a
  full `ReforgeOptimizeRequest`/`Result` pair (`:445`/`:457`).
- **Go engine**: a dedicated `sim/core/bulk/` package (`bulk_sim.go`, `batch.go`,
  `candidates.go`, `generator.go`, `merge.go`, `carry_over.go`, `estimate.go`,
  `stage.go`, `statistics.go`, …) plus `sim/core/reforge_optimizer/` (a HiGHS LP
  solver). Wired into both `sim/wasm/main.go` and `sim/web/bulk.go`.
- **WorkerPool** already exposes both: `bulkSimAsync(...)`
  (`ui/core/worker_pool.ts:139`) and `reforgeOptimizeAsync(...)` (`:79`, returns
  `finalReforgeResult` at `:91`).

Design intent of the native path, read from the proto shape: it shares one
`base_request` across the batch, runs reforge optimization per candidate as a
pipeline stage, and applies a **cheap-pass / expensive-pass funnel** (`top_results`

- `high_stage_iterations`) so only survivors of the low-iteration pass get the
  expensive high-iteration run. Our flat per-candidate loop amortizes none of that.

## Why the assumption drifted

The runner's own header comment (`worker_pool_sim_runner.ts:12-23`) cites plan §2.4:
_"there is no bulk RPC — upstream's own Batch tab loops one ordinary sim per
combination client-side."_ That statement was **correct** for the engine the
`packages/core` ranking code was written against (`v0.0.101`), where the browser
Batch tab genuinely fanned combinations out client-side and no bulk wire message
existed.

The engine pin then split (see ticket 251):

- The **engine pin** (`data/wowsims.lock.json`) is tag `v0.0.119` / `3267f8d` —
  master-identical, and its `data/proto/api.proto` has **no** `BulkSim` message
  (only a client-side `BulkSettings` struct at `:597`; grep of `data/proto/`
  finds no `BulkSim`).
- The **fork** builds on `feature/backend-reforge` (`cbf6b75`), which **added** the
  whole bulk + reforge machinery above.

The ported comment travelled with the port and was never re-checked against the
fork's newer engine. It describes the engine the _ranking code_ came from, not
the engine the _fork_ runs on.

## The critical caveat before "just adopt it"

Adopting the native path is **not** a drop-in, because the halves have different
availability in a pure-browser (WASM) deployment:

- **`bulkSimAsync` is STUBBED in the WASM worker.** `sim_worker.ts:107` wires
  `unsupportedBulkSimAsync`, which logs _"bulkSimAsync is only supported by the
  HTTP worker."_ Only `worker_http.ts:64` implements it. So the native **bulk
  sim** needs the HTTP worker / a running server — a purely client-side WASM page
  cannot call it today.
- **Reforge optimization and candidate generation ARE WASM-available.**
  `reforgeOptimizeAsync` (`sim_worker.ts:99`, backed by the HiGHS LP solver
  initialized at `:100`), `bulkCandidates` (`:82`), and `bulkCombinationCount`
  (`:108-109`) all run in-browser. They are simply unused.

So the accurate statement is: the native **bulk-sim** primitive is real but
HTTP-worker-only, while the native **reforge optimizer** and **candidate
generator** are callable in the browser right now and left on the table.

## What is verified vs. inferred

- **Verified by direct read:** everything in "What our tab actually does," the
  proto messages and Go package existence, the WorkerPool methods, and the WASM
  stub of `bulkSimAsync`.
- **Inferred from proto/worker shape, not from a benchmark:** that the native
  path amortizes `base_request` setup, runs reforge per combo, and funnels
  iterations. The Go internals (`sim/core/bulk/bulk_sim.go`) were not opened.

## If someone acts on this

This doc records state; it does not decide a migration. Two things gate any
adoption decision, both open:

- **Confirm the funnel** — open `sim/core/bulk/bulk_sim.go` for how reforge is
  invoked per combo and whether Go caps combinations (inferred above, not read).
- **Settle the deployment** — native bulk _sim_ needs an HTTP worker; a WASM-only
  page can reach only the reforge optimizer and candidate generator.

Correct the stale comment at `worker_pool_sim_runner.ts:12-23` either way — it asserts
as fact ("there is no bulk RPC") something false for this engine.
