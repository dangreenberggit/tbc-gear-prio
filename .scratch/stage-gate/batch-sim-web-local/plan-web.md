# Plan — batch-sim-web (v2)

## Goal

On the web (WASM) deployment, the upgrades tab's **screening pass** runs through wowsims' native bulk machinery: the engine's ranking loop, when its runner offers a bulk-screening capability, hands each batch of candidates (partitioned to stay under the measured TS cull boundary) to a new adapter that builds a typed `BulkSimRequest` and executes it via the exported `runConcurrentBulkSim` on a pool sized from the user's own concurrency setting. The **accurate final pass is unchanged**: paired-seed replication over `DEFAULT_SEEDS` against a single baseline, exactly as `rankUpgrades` does today, so the tab's ranking semantics are untouched. The iteration default moves to 5,000. Every screened candidate still yields an observation (no row is lost to culling, guaranteed by the partitioner bound). A code comment marks the future switch to the `bulkSimAsync` RPC when upstream implements it in WASM. The old per-candidate loop remains the fallback when the runner lacks the capability or the user has worker concurrency Off. No wowsims-owned file is edited.

## Approach

**Chosen: native bulk as the cheap screening pass only (orchestrator option (a)); paired-seed replication stays as the accurate final pass.**

Why (a) over full substitution (b): `rankUpgrades` ranks on paired-seed `deltaDps` against one baseline (`rank.ts:360` `DEFAULT_SEEDS = [11,22,33,44,55]`; replication at `:1071-1108`). Bulk returns absolute `dpsMetrics` from the engine's own seed schedule with its own baseline probe and **no seed control**. Substituting one for the other changes the estimand, not just the estimator — a rank-correlation gate (option b) could only certify that two *different* measurements happened to agree on one fixture, and would be re-litigated on every future spec. The screening pass, by contrast, is exactly what bulk produces: an approximate DPS table used only to choose which candidates enter paired replication. There the owner's rule 4 ("use their code where the output is what we want") applies cleanly, and rule 1's shape ("cheap screening pass, then accurate final pass") is literally this design. Option (c) (narrow the goal, flag to owner) is unnecessary because (a) meets the brief without narrowing.

What (a) buys: the native tournament's adaptive High-stage iterations and stage metrics, upstream-maintained dispatch instead of our bespoke `promisePool` fan-out for the screening bulk, and — decisive for reconciliation — the **same `BulkSimRequest`** the local track posts over HTTP, built by one shared builder. Cost is a wash at matched accuracy (C10), so this is a convergence win, not a speed claim.

**Legacy-path justification (owner constraint 3).** Below 20 candidates, `shouldUseLegacyBulkSim` returns true (`estimate.ts:10-12`) and `runConcurrentBulkSim` runs High-only (`index.ts:116`). We still enter through the new batch system's own entry point; the High-only mode is that system's own decision for small runs, not us selecting the old code path. Since our partitioner caps every request under the boundary precisely so no candidate is culled, every request will take this High-only mode by design. That is the justification: it is the only mode of the new system that returns a row per candidate, which the tab requires.

**Strongest rejected alternative: `Sim.runBulkSim` (`sim.ts:373`).** Stable public signature, works on the live site (C2). It lost because (i) it uses `Sim`'s private pool and entangles the runner seam with the whole `Sim` object, breaking the adapter architecture; (ii) at `wasmConcurrency` Off/1 it falls through to the WASM `bulkSimAsync` stub (`sim.ts:241,589`; `sim_worker.ts:15-18,107`) — and per this revision we handle Off/1 by *not* taking the bulk path at all, which `Sim.runBulkSim` cannot express; (iii) it routes to the identical `runConcurrentBulkSim` internally (`sim.ts:565`), so it shares every behavior of the direct call while adding coupling. The prior review's fragility point (finding 6) is accepted and priced: calling `runConcurrentBulkSim` couples us to upstream internals whose constants can move in a sync. Mitigation is structural, not aspirational — Step 2's boundary measurement is committed as a re-runnable spike, and the partitioner reads its bound from one named constant, so an upstream shift is a one-constant re-measure, and the loop fallback still exists.

## Claims register

`$F` = `vendor/tbc-new-fork` (gitignored; main checkout only — executor verifies with `ls $F/ui/core/sim.ts` before starting). `U` = `$F/ui/core/components/individual_sim_ui/upgrades`.

| ID | Claim | Load-bearing | Verified by |
| --- | --- | --- | --- |
| C1 | Current loop: `raidSimAsync` per candidate, `DEFAULT_ITERATIONS = 3000` (`rank.ts:359`), `DEFAULT_SEEDS` at `:360`, screening dispatch via `promisePool` at `:858`, per-candidate call at `:727`, baseline at `:605`, set-bonus sims at `:1126,:1290`, paired replication at `:1071-1108`. | yes | reviewer-confirmed line set; re-run `grep -n "DEFAULT_ITERATIONS\|DEFAULT_SEEDS\|promisePool" $U/engine/rank.ts` |
| C2 | Web bulk sim runs entirely in-browser today; no sim POSTs on the live site. | yes | research-web.md §Q3 live network observation |
| C3 | The TS cull gate for tab-sized runs is `BULK_SIM_MIN_COMBINATIONS = 20` (`$F/ui/core/wasm/bulk_sim/constants.ts:3`) via `shouldUseLegacyBulkSim` (`estimate.ts:10-12`) → High-only at `index.ts:116`; at ≥20 a cost estimate sensitive to `highStageIterations` (`estimate.ts:14-32`) decides culling. **Settled by review.** | yes | `grep -n "BULK_SIM_MIN_COMBINATIONS" $F/ui/core/wasm/bulk_sim/constants.ts $F/ui/core/wasm/bulk_sim/estimate.ts` |
| C4 | `topResults` cannot recover culled candidates — applied to post-cull `latestResults` (`index.ts:125,141,166`; `statistics.ts:104-111`). **Settled by review.** | yes | `grep -n "topBulkSimResults\|latestResults" $F/ui/core/wasm/bulk_sim/index.ts` |
| C5 | `runConcurrentBulkSim` is exported, takes an explicit `WorkerPool` and `SimSignals`, and validates `baseRequest.raid.parties[0].players[0]` with class+equipment (`index.ts:45-64`). | yes | `grep -n "export const runConcurrentBulkSim\|validateBulkSimRequest" $F/ui/core/wasm/bulk_sim/index.ts` |
| C6 | The direct call executes correctly from our adapter with our own pool at sizes ≥1 and returns one row per candidate for sub-boundary requests. | yes | hypothesis, untested — Step 3 spike verifies |
| C7 | Pool sizing: constructed 1 (`sim.ts:164`), WASM-path resize to `min(wasmConcurrency, hardwareConcurrency)`; user picker writes localStorage `__tbc_new_wasmconcurrency`; **Off is the value 0** (`sim.ts:175`), a deliberate user choice; our adapter's default param is 4 further capped by `memoryCapFromDeviceMemory()` (`wasm_sim_runner.ts:35,88-90`). | no | research-web.md §Q4 + reviewer finding 10 |
| C8 | The seam is one-in/one-out (`sim-runner.ts:35-38`) and deliberately protojson-typed (`:12-21` load-bearing comment); recorded adapter keys per-request (`:41-47,66-84`). Any bulk capability must be an optional method in protojson vocabulary. | yes | read `$U/engine/seams/sim-runner.ts` |
| C9 | `engine/rank.ts` and `engine/seams/sim-runner.ts` carry PROVENANCE rows (`$U/engine/PROVENANCE.md:153` for rank.ts); edits arm the five-step ported-engine-file cycle in `docs/agents/known-traps.md`. Adapters under `adapters/` are believed *not* tracked (tools/README.md:11 states only `engine/` carries rows) — Step 1 confirms. | yes | `grep -n "rank.ts\|sim-runner.ts\|adapters" $U/engine/PROVENANCE.md` |
| C10 | Native adaptive iterations at matched accuracy cost ~1.01x a flat pass. | no | research-local.md §Q5 |
| C11 | Fork-side typecheck is `npm run type-check` from the fork root (`$F/package.json:24`, `tsc --noEmit`); spikes run under Node with the outer repo's tsx loader + `tools/register.mjs` per `tools/README.md:32-43`. | no | `grep -n "type-check" $F/package.json` |
| C12 | `SimSignals` comes from `signalManager.registerRunning(RequestTypes.RaidSim)` as in `wasm_sim_runner.ts:116`; whether a distinct `RequestTypes.BulkSim` exists and is required is unknown. | no (step-local) | hypothesis, untested — Step 3 discovers via `grep -n "RequestTypes" $F/ui/core/worker/types.ts` |
| C13 | `BulkSimRequest`/`BulkSimResult` field shapes per research-web.md §Q2 table (`$F/ui/core/proto/api.ts:993,1874,1887,1916`); adapter converts protojson via `RaidSimRequest.fromJson` as at `wasm_sim_runner.ts:112`. | yes | `grep -n "class BulkSimRequest\|class BulkSimResult" $F/ui/core/proto/api.ts` |
| C14 | Recorded-adapter tests live in the outer repo (`packages/core/test/`), fixtures under `$U/engine/fixtures/`; changing `DEFAULT_ITERATIONS` changes every `simCacheKey` and invalidates existing fixtures. | yes | `ls packages/core/test/ $U/engine/fixtures/` (executor confirms exact layout at Step 8) |
| C15 | Sub-partitioning a ≥boundary slot into chunks re-incurs one baseline probe per chunk; overhead is bounded by (chunks − slots) probes. | no | hypothesis, untested — Step 10 quotes actual probe counts from stage metrics |

## Steps

All relative paths under `$U` unless absolute. Vendor files outside the `upgrades/` subtree are read-only.

1. **Preflight.** Read `docs/agents/known-traps.md` § ported engine files. Confirm which files this plan touches are PROVENANCE-tracked: `grep -n "rank.ts\|sim-runner.ts\|adapters\|bulk" $U/engine/PROVENANCE.md`. Acceptance: a ledger note listing tracked files among {`engine/rank.ts`, `engine/seams/sim-runner.ts`, `engine/bulk/partition.ts` (new — decide whether new engine files need a row per PROVENANCE.md's own header), `adapters/*`}. Depends: C9.
2. **Measure the cull boundary.** New spike `tools/bulk-spike.mts` (run per C11's loader recipe). Synthetic requests at n = 19, 20, 25, 30 candidates, each at `highStageIterations` 3,000 **and** 5,000 (8 arms, everything else held constant). Record per arm: stages run, survivors, rows returned (from `stageMetrics` and `topResults.length`). Acceptance: a table in the spike output showing, for each arm, whether every candidate returned a row; the largest n at which **both** iteration settings return all rows becomes `MAX_CANDIDATES_PER_BULK_REQUEST` (expected 19 per C3; a different measured value wins over the model — measured beats modelled). Depends: C3, C4, C5, C13.
3. **Spike the direct call.** Same harness: build a real feral-p2 `BulkSimRequest` (typed `baseRequest` via `RaidSimRequest.fromJson`, one sub-boundary candidate chunk, `highStageIterations: 5000`), obtain `SimSignals` (discover the right `RequestTypes` member), call `runConcurrentBulkSim(request, pool, onProgress, signals)` at pool sizes 4 and 1. Acceptance: returns a `BulkSimResult` with one `topResults` row per candidate plus a `baseline`, at both pool sizes; `validateBulkSimRequest` passes; the working `RequestTypes` member is recorded. If pool-size-1 fails, record the failure mode — the runner then requires ≥2 workers and Off/1 users stay on the loop. If the call fails outright, **stop and escalate** (the fallback `Sim.runBulkSim` inherits the same internals and rescues nothing — no silent fallback). Depends: C5, C6, C12, C13.
4. **Seam capability (shared vocabulary — the local plan consumes these names verbatim).** Extend `engine/seams/sim-runner.ts` with an optional method, entirely in protojson vocabulary (engine stays proto-unaware per its own load-bearing comment):
   - `type BulkScreenCandidate = { index: number; gear: Readonly<Record<string, unknown>> }`
   - `type BulkScreenRequest = { baseRequest: RaidSimRequest; candidates: readonly BulkScreenCandidate[]; iterations: number }`
   - `type BulkScreenResult = { baseline: SimObservation; rows: ReadonlyArray<{ index: number; observation: SimObservation }> }`
   - `runBulkScreen?(req: BulkScreenRequest): Promise<BulkScreenResult>` on `SimRunner`
   - `bulkScreenCacheKey(req: BulkScreenRequest, simVersion: string): string` using the existing `stableStringify`
   - `RecordedSimRunner` gains `runBulkScreen` replaying by that key.
   Run the full PROVENANCE cycle for this file (parity test green → update sha256 → fork commit → re-pin `data/wowsims-fork.lock.json` → `pnpm sim-implemented-effects:generate` → `pnpm verify`). Acceptance: `npm run type-check` (fork root) exits 0; PROVENANCE cycle steps each ledgered. Depends: C8, C9, C11.
5. **Shared partitioner.** New `engine/bulk/partition.ts` (pure, protojson): `partitionForBulkScreen(candidates, maxPerRequest)` returning chunks each ≤ `MAX_CANDIDATES_PER_BULK_REQUEST` (constant defined here, value from Step 2), preserving candidate indices; sub-partitions any slot larger than the bound. Unit-tested directly (pure function, per AGENTS.md testing rules). Acceptance: unit test asserting no chunk exceeds the bound for sizes 1..60 and that indices round-trip. Depends: C3, C4 (via the Step-2 bound).
6. **Shared request builder.** New `adapters/bulk_request_builder.ts`: `buildBulkSimRequest(req: BulkScreenRequest): BulkSimRequest` — bridges protojson to typed protos (`RaidSimRequest.fromJson`, `EquipmentSpec` per candidate, `highStageIterations` from `req.iterations`). This is the module the local runner reuses to post the same request over HTTP. Acceptance: fork typecheck; spike from Step 3 rewired to use it. Depends: C13.
7. **`BulkWasmSimRunner`.** New `adapters/bulk_wasm_sim_runner.ts` implementing `SimRunner` including `runBulkScreen`: partition via Step 5, build via Step 6, run `runConcurrentBulkSim` per chunk, map `baseline` + `topResults[].candidateIndex/dpsMetrics` to `BulkScreenResult`. Pool sizing: read the user's setting (`__tbc_new_wasmconcurrency`); **0 or 1 means the bulk path is not offered** (`runBulkScreen` left undefined / factory returns the plain runner) — never clamp a deliberate Off upward; otherwise pool = `min(setting, hardwareConcurrency, memoryCapFromDeviceMemory())`, matching the existing runner's cap. Keep `wasm_sim_runner.ts` intact. Acceptance: fork typecheck; spike run through the new runner yields a row per candidate; with the localStorage key at 0 the factory yields no bulk capability, at N≥2 the pool is `min(N, hw, memCap)` (asserted in spike output). Depends: C5, C6, C7, C13.
8. **`rank.ts` restructure + iteration default (honest scope: this is the largest step).** In `engine/rank.ts`: (i) at the screening dispatch (the `:727`/`:858` region), branch on `deps.sim.runBulkScreen` — when present, screening observations come from `runBulkScreen` per partition and screening deltas are computed against its `baseline`; when absent, the existing per-candidate path runs unchanged. Set-bonus sims (`:1126,:1290`) and paired replication (`:1071-1108`) stay on `run()` untouched. (ii) `DEFAULT_ITERATIONS` 3000 → 5000. Run the full PROVENANCE cycle for `rank.ts`. Re-record fixtures invalidated by the key change (C14) and add a recorded `runBulkScreen` fixture so the primary `rankUpgrades` test exercises the bulk branch. Acceptance: `pnpm verify` green (outer repo, includes recorded-adapter tests); fork typecheck green; PROVENANCE cycle ledgered. Depends: C1, C4, C8, C9, C14. **Seam flag for local plan: `DEFAULT_ITERATIONS = 5000` and the `runBulkScreen` branch are shared tab code — the local track inherits both and must not diverge.**
9. **Upstream-switch comment.** At the `runConcurrentBulkSim` call site in `bulk_wasm_sim_runner.ts`: web uses the TS tournament because the WASM worker's `bulkSimAsync` RPC is a stub (`sim_worker.ts:15-18,107`); switch to `workerPool.bulkSimAsync` when upstream implements it. Acceptance: comment present, names the stub file:lines. Depends: C2.
10. **Equivalence measurement — pre-registered before running.** On feral-p2, run `rankUpgrades` end-to-end twice: loop runner vs bulk runner, both at 5,000. Win conditions, registered now: (a) identical screened-candidate count both ways; (b) per-partition Spearman rank correlation of screening deltas ≥ 0.95; (c) the paired-replication top-N selections overlap ≥ 90%; (d) final displayed ordering of shared top-N members identical within each row's reported error bars. Any miss = **stop and escalate with the numbers** — not adapt, not rationalize. Also quote actual baseline-probe counts per chunk (C15). Acceptance: all four registered conditions quoted with measured values in the ledger. Depends: C6, C10, C15.
11. **Verify + commit.** `pnpm verify` (outer repo); `npm run type-check` (fork root); commit per green slice on `feat/upgrades-tab-batch-sim`; fork-side commits follow the PROVENANCE cycle's fork-commit/re-pin order. Acceptance: both commands exit 0; `git -C $F status --porcelain` shows only `upgrades/` paths. Depends: C9, C11.

## Paths manifest

Create/modify; everything else in `vendor/tbc-new-fork` is read-only.

- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/tools/bulk-spike.mts` (new)
- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/seams/sim-runner.ts` (optional `runBulkScreen`, `bulkScreenCacheKey`, `RecordedSimRunner` support — PROVENANCE)
- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/bulk/partition.ts` (new, shared with local plan)
- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/adapters/bulk_request_builder.ts` (new, shared with local plan)
- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/adapters/bulk_wasm_sim_runner.ts` (new)
- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts` (dispatch branch + `DEFAULT_ITERATIONS` — PROVENANCE)
- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/PROVENANCE.md` (updated hashes)
- `data/wowsims-fork.lock.json` (re-pin per cycle)
- `C:\Users\dgree\Code\lulz\tbc-gear-prio\packages\core\test\` and `$U/engine/fixtures/` — re-recorded fixtures + new bulk-branch fixture (exact files located at Step 8)

No partition — single executor, sequential steps.

## Verify recipe

```
ls vendor/tbc-new-fork/ui/core/sim.ts                        # fork present (main checkout only)
pnpm verify                                                  # outer gate (incl. PROVENANCE + fixture checks)
npm --prefix vendor/tbc-new-fork run type-check              # fork-side tsc --noEmit
git -C vendor/tbc-new-fork status --porcelain                # only upgrades/ paths
grep -n "DEFAULT_ITERATIONS = 5000" vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts
grep -n "runBulkScreen" vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/seams/sim-runner.ts
grep -rn "runConcurrentBulkSim" vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/adapters/bulk_wasm_sim_runner.ts
```

Plus the Step 2 boundary table and Step 10's four registered conditions quoted in the executor's ledger.

## Out of scope

- Editing any wowsims-owned file (`sim.ts`, `wasm/bulk_sim/*`, `sim_worker.ts`, protos, `sim/web/main.go`).
- Replacing the paired-seed final pass with bulk metrics — explicitly rejected (option b); any future substitution needs its own measured-equivalence plan.
- Fixing the upstream `wasmConcurrency` Off/1 dead-stub in `Sim.runBulkSim` — ticket if Step 3 confirms; do not patch.
- Reforge optimization, `getBulkCombinationCount`/`getBulkCandidates` pre-flight UI, standalone use of `getBulkSimTargetIterations` (C10: no saving to chase).
- The local (Go server) path — sibling plan; it consumes `engine/bulk/partition.ts`, `adapters/bulk_request_builder.ts`, and the `runBulkScreen` seam names verbatim.
- Deleting `wasm_sim_runner.ts` — it is the live fallback for Off/1 users and missing-capability runners.

## Revision notes

- **Web finding 1 (blocking, C14 refuted):** C14 deleted; C4 now records the settled fact (`topResults` cannot un-cull). No step relies on it; row completeness is guaranteed by the partitioner bound instead (Steps 2, 5).
- **Web finding 2 (blocking, gate is 20):** C3 records the settled 20-gate and iteration-sensitive estimate; Step 2 measures exactly the 19/20/25/30 × 3,000/5,000 grid the orchestrator directed, and the partitioner (Step 5) guarantees the measured bound, sub-partitioning large slots.
- **Web finding 3 (blocking, seam cannot express batch) + local finding 1 (ranking substitution) + orchestrator directive 2:** resolved together by option (a) — bulk is screening-only; paired-seed replication is untouched; the `rank.ts` restructure is scoped honestly as Step 8 (largest step) with the dispatch branch named at its real call-site region. Defense of (a) vs (b)/(c) is in Approach.
- **Web finding 4 (SimSignals + typed baseRequest unbudgeted):** C12 and C13 register the obligations; Step 3 discovers the `RequestTypes` member and exercises `validateBulkSimRequest`; Step 6 owns the protojson→typed conversion as a real module.
- **Web finding 5 + local findings 3/4 (seam vocabulary, PROVENANCE):** seam extension is optional-method, protojson-only (Step 4), keeping the engine proto-unaware per `sim-runner.ts:12-21`; the five-step PROVENANCE cycle is embedded in Steps 4 and 8, and `PROVENANCE.md` + `data/wowsims-fork.lock.json` are in the manifest; Step 1 checks whether adapters are tracked.
- **Web finding 6 (fallback inherits blockers):** the silent fallback is removed — Step 3 failure is stop-and-escalate; the fragility of calling `runConcurrentBulkSim` directly is accepted and priced in Approach.
- **Web finding 7 (undecidable acceptance):** Step 10 pre-registers four win conditions (row count, Spearman ≥ 0.95, top-N overlap ≥ 90%, final ordering within error bars) before measuring; miss = stop.
- **Web finding 8 (no test obligation):** Step 8 re-records fixtures invalidated by the key change and adds a recorded `runBulkScreen` fixture keyed by the new `bulkScreenCacheKey` (Step 4), keeping the primary test at `rankUpgrades` through recorded adapters.
- **Web finding 9 (unknowable verify command):** settled by reading — `npm run type-check` at `$F/package.json:24`; spike loader recipe from `tools/README.md` (C11); recipe updated.
- **Web finding 10 (wasmConcurrency clamping):** Step 7 treats 0/1 as "no bulk capability" — the user's Off is honored, never clamped upward; the memory cap is kept.
- **Web finding 11 (decision-rule inversion):** stated in Step 2 and Step 10 — measured web numbers win over carried Go modelling; any conflict escalates with the numbers.
## Round-2 review conditions (binding on the executor — from plan-web-review.md round 2)

- **N1 (material, folds into Step 8):** the bulk screening branch must still compose each candidate's `RaidSimRequest` locally (`composeFor` is pure and pre-sim) and populate `winningRequests` (`rank.ts:618,820,969,1084`) and the row-metadata collections (`individualDeltasByItemId`, `candidateSkips`, `statDeltaBetween`, `isHitDriven`/`hitRegression`, `setBreakNote`, `rank.ts:740-768`) exactly as the loop does — only the DPS observation comes from bulk. Step 8 acceptance additionally requires a recorded-fixture test that runs the bulk branch through to `replicateTopItems` without a `RankError`.
- **N4 (minor, folds into Step 2 acceptance):** the two n=19 arms sit below `BULK_SIM_MIN_COMBINATIONS` and must agree with each other; if they differ, stop and diagnose before trusting the other six arms.
- **N2 (ledger note):** `scripts/check_engine_port_drift.py:202-209` is table-driven — a new untracked `engine/bulk/partition.ts` will not fail `pnpm verify`, and deliberately carries no PROVENANCE row (it has no core ancestor to trace). Step 1 records this conclusion instead of re-deriving it.
- **N3 (wording):** C15's per-chunk baseline probe count is a lower bound ("at least one"), not an upper bound — adaptive passes can add baseline segments (`stage.ts:196,288-294`; `index.ts:153-163`).

Additional binding conditions from the LOCAL plan's round-2 review (plan-local-review.md), because they land in modules this plan owns:

- **L-new-1 (blocking, folds into Step 6 and Step 2):** `topResults` defaults to **5** when unset (`index.ts:84`, `constants.ts:1`; Go identical at `bulk_sim.go:86-88,12`) and truncates the response independent of culling (`index.ts:166`; `statistics.ts:104-111` `.slice(0, limit)`). `buildBulkSimRequest` (Step 6) MUST set `topResults = candidates.length` on every request — the 340 harness does exactly this (`harness/main.go:106-107,133`), which is the only reason research-local's 212/212 table exists. Step 2's spike must assert row count per chunk so the boundary measurement cannot quietly succeed for the wrong reason.
Reconciliation conditions (binding — from reconciliation.md, routed by the orchestrator):

- **R1 (blocking, fixes Step 7 + Paths manifest + Verify recipe):** the only runner-construction site is `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx:446` (`private readonly sim = new WasmSimRunner();`, consumed by `rankUpgrades` at `:1175`) — one level ABOVE the `upgrades/` subtree. It is a **project-owned** file (its git history is entirely this project's ticket work), so editing it does not violate the no-wowsims-edits constraint. It is hereby ADDED to this plan's Paths manifest. Ownership split: **this plan introduces the runner factory in that file**; the local plan later extends only the factory's branch condition. The Verify recipe's `git -C $F status --porcelain` assertion is amended to permit `upgrades/` paths **plus `upgrades_tab.tsx`**.
- **R2 (blocking, folds into Steps 7 and 3):** setting `topResults` is not sufficient for row completeness — `statistics.ts:107` silently drops any result lacking `dpsMetrics` before slicing, and `index.ts:121-122` only catches results with `error` set. Step 7's mapping must assert, per chunk, that `topResults.length` equals the chunk's candidate count and every row carries `dpsMetrics`; on shortfall, throw (same integrity bar as local's guard). Step 3's spike asserts the count per chunk. This is not redundant with the partitioner bound — the bound prevents culling; this guards the dpsMetrics filter.
- **R3 (material, folds into Step 7):** export the `BulkSimResult` → `BulkScreenResult` mapping from `bulk_wasm_sim_runner.ts` as a named function; the local runner imports it — the mapping is single-sourced, never duplicated.
- **R4 (wording, Step 3 acceptance):** read as "a `BulkSimResult` whose `baseline` field is populated and whose `topResults` array has one row per candidate" — baseline is a separate field (`index.ts:165` vs `:166`), not an n+1th row.
- **Ledger handoff (folds into Step 11):** write, in one greppable place in the executor ledger, the measured `MAX_CANDIDATES_PER_BULK_REQUEST`, the working `RequestTypes` member, and the exported mapping function's name — the local executor's preflight reads them.

- **L-new-3 (decide, not ledger, in Step 1):** per round-2 N2, `scripts/check_engine_port_drift.py:202-209` is table-driven; new `engine/` files (`engine/bulk/partition.ts`, new fixture files) deliberately carry **no** PROVENANCE row (no core ancestor to trace) and will not fail `pnpm verify`. Recorded here as the decision; Step 1 confirms, does not re-open.

- **Orchestrator directive 7 (shared names, definitive):** `engine/bulk/partition.ts` (`partitionForBulkScreen`, `MAX_CANDIDATES_PER_BULK_REQUEST`), `adapters/bulk_request_builder.ts` (`buildBulkSimRequest`), and the seam capability `runBulkScreen` / `BulkScreenRequest` / `BulkScreenResult` / `bulkScreenCacheKey` in `engine/seams/sim-runner.ts` — the local plan consumes these verbatim.

---

# Amendment A1 (2026-09-01, execution loop-back) — replacement Steps 2, 3, 10; amended claims

See decision-log.md for the loop-back rationale. Everything not replaced here stands, including all binding conditions. Builds on landed state: fork `5ad56a5c9`, outer `d044e54`, verify green. Full amendment text follows.
Full amendment text: plan-web-amendment-A1.md (same directory) - binding.
