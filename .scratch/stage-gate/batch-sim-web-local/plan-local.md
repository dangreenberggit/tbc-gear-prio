# Plan — batch-sim-local (v2)

## Goal

When the upgrades tab is served by the packaged local Go server (`wowsimtbc`, HTTP/net_worker transport), the **screening pass** of `rankUpgrades` runs through wowsims' native bulk machinery over HTTP: a new runner adapter implements the `runBulkScreen` capability the web plan added to `engine/seams/sim-runner.ts`, partitions candidates with the shared `partitionForBulkScreen`, builds the same typed `BulkSimRequest` via the shared `buildBulkSimRequest`, and posts each chunk to the Go server with `WorkerPool.bulkSimAsync`, where the fork's native bulk engine runs it High-only at NumCPU concurrency. The **accurate final pass is unchanged**: paired-seed replication over `DEFAULT_SEEDS` against a single baseline, exactly as `rank.ts` does after the web plan landed — the ranking's estimand is untouched. `DEFAULT_ITERATIONS` is already 5,000 (web Step 8); this plan does not touch it. A truncated or evicted server response is a hard error, never silently rendered. On any page not served by the Go server (including the vite dev server on 5173), the tab takes the web plan's WASM branch, which is itself a native-bulk path. No wowsims-owned file is edited.

## Approach

**Chosen: local is a transport implementation of the web plan's seam capability, nothing more.** The web plan (v2, lands first) already made the architectural decisions: bulk is screening-only, the seam speaks protojson (`runBulkScreen`/`BulkScreenRequest`/`BulkScreenResult`/`bulkScreenCacheKey`), partitioning and request-building are shared modules, and `rank.ts` branches on `deps.sim.runBulkScreen`. What remains for local is one adapter: the same `BulkSimRequest` the WASM runner feeds to `runConcurrentBulkSim` is instead posted to `/bulkSimAsync` (C1), and the same `BulkScreenResult` mapping applies to the returned `BulkSimResult`. This dissolves the old plan's central problem — v1 tried to substitute bulk `dpsMetrics` for paired-seed `deltaDps` (review finding 1); v2 inherits web's answer: bulk only chooses who enters replication, replication is untouched.

**Partition bound: reuse web's `MAX_CANDIDATES_PER_BULK_REQUEST` (measured on the TS path, expected 19) unchanged, not a Go-specific bound.** The Go path could safely go to 25 per chunk (under 26 skips the Medium cull stage, C3), so a Go bound would save baseline probes: 212 feral-p2 candidates make ceil(212/19) = 12 chunks at the web bound vs 9 at a Go bound of 25 — 3 extra probes at ~5,400 iterations each (extrapolated from the measured 70,575 iterations across 13 probes, research-local §Q1b), ≈ 16k iterations, roughly 1–2% of a screening pass. Against that: a transport-dependent bound makes the partitioner's contract depend on where the request will run, splits the fixture story (cache keys embed the request, so chunking differences double the fixtures), and puts a second constant under upstream drift. We buy uniformity for ~2% (extrapolated, Step 6 quotes the real probe counts).

**Transport predicate: `await pool.isWasm()`, accepting that the choice is made server-side.** Which worker script loads is decided by the serving server (`main.go:401-405` rewrites `sim_worker.js` → `net_worker.js`; vite does not), so a page from vite on 5173 gets WASM even with a Go server on 3333. That is not a defect to engineer around — it is the correct answer: `isWasm()` reports the transport the pool *actually has*, deterministically, from the worker ready message (`worker_pool.ts:315`, `worker_http.ts:74`), and posting bulk requests to a server that did not serve the page is a configuration this plan explicitly does not support. Documented constraint: **the HTTP bulk path engages only under the packaged `wowsimtbc` server; the dev path (vite 5173) takes the WASM branch**, which after web v2 is also native bulk — dev loses nothing but the HTTP transport. Every live acceptance check below names which server serves the page.

**Strongest rejected alternative: per-slot bulk requests with slot-level culling semantics (v1's shape).** It solved a problem the tab no longer has: once bulk is screening-only and the partitioner guarantees no culling, "slots" stop being the partition key — chunks are. Per-slot partitioning would add 13-way structure the engine's flat candidate pool doesn't carry (`rank.ts` candidates are EP-ordered with slot as an attribute, review finding 1) and would still need the chunk bound for slots over the boundary. Second rejected alternative: a Go-specific chunk bound — rejected above with numbers.

## Claims register

`$F` = `vendor/tbc-new-fork` (gitignored; main checkout only — executor verifies `ls $F/ui/core/sim.ts` first). `$U` = `$F/ui/core/components/individual_sim_ui/upgrades`.

| ID | Claim | Load-bearing | Verified by |
| --- | --- | --- | --- |
| C1 | On the packaged local build, `WorkerPool.bulkSimAsync` posts a `BulkSimRequest` protobuf to the Go server at `/bulkSimAsync`, progress polled via `/asyncProgress`. | yes | `$F/ui/core/worker/worker_http.ts:64,12-16,33-49`; `net_worker.ts:3` (reviewer-confirmed) |
| C2 | Go bulk cull gates: under 101 candidates skips Low, under 26 skips Medium; High always runs; so any chunk ≤ 25 (a fortiori ≤ 19) returns every candidate. | yes | `$F/sim/core/bulk/stage.go:29-59`; harness 13/13 slots, 212/212 rows (research-local §Q1a) |
| C3 | The web bound (expected 19) is stricter than the Go no-cull bound (25); reusing it on the Go path can never cause culling. | yes | Follows from C2 + web Step 2's measured bound; executor re-checks: measured web bound ≤ 25, else escalate |
| C4 | No survivor knob exists in the proto; none is needed since culling never engages under the bound. | yes | `grep -rn "min_survivors\|max_survivors" $F/proto/` → no matches |
| C5 | `isWasm()` resolves deterministically from the worker ready message; the HTTP worker calls `.ready(false)` (`worker_http.ts:74`), so under the packaged server it resolves `false`; which worker script loads is a server-side rewrite (`main.go:401-405`), so vite-served pages resolve `true`. | yes | `worker_pool.ts:32,183-189,315`; `worker_interface.ts:65-67`; `main.go:401-405` (reviewer-confirmed). Live confirmation per serving server: Step 1 |
| C6 | On local, the tab's pool stays 1 worker (`sim.ts:164-171` `isWasm()` guard); the Go server does its own NumCPU threading per request (`stage.go:69,71`), with no user-facing knob. | no | `sim.ts:164-171`; research-local §Q6 five-site grep table + positive control |
| C7 | The 10-minute server-side progress eviction (`main.go:216-224`) makes `/asyncProgress` return 204 (`main.go:309-312`), which the client treats as normal completion (`worker_http.ts:40-42` `break`) — a silent-truncation path, not an error. | yes | Read those lines (reviewer-confirmed) |
| C8 | Web v2 landed first and created: `runBulkScreen`/`BulkScreenRequest`/`BulkScreenResult`/`bulkScreenCacheKey` in `$U/engine/seams/sim-runner.ts`; `partitionForBulkScreen` + `MAX_CANDIDATES_PER_BULK_REQUEST` in `$U/engine/bulk/partition.ts`; `buildBulkSimRequest` in `$U/adapters/bulk_request_builder.ts`; the `rank.ts` bulk branch; `DEFAULT_ITERATIONS = 5000`; a recorded `runBulkScreen` fixture path; and a discovered working `RequestTypes` member for `SimSignals`. | yes | Step 1 grep set (verbatim commands in Verify recipe); web plan Steps 4–8 |
| C9 | Files this plan edits are not PROVENANCE-tracked: it creates one adapter and touches the runner-construction site; `$U/engine/PROVENANCE.md` tracks `engine/` files only (tools/README.md:11), and web Step 1 confirmed adapter tracking status. | yes | `grep -n "adapters\|bulk_http" $U/engine/PROVENANCE.md` at Step 1; if any touched file has a row, the five-step known-traps cycle applies (Step 3 contingency) |
| C10 | `BulkSimResult.topResults[].{candidateIndex,gear,dpsMetrics}` plus a baseline row from the Go engine carry what `BulkScreenResult` needs, same shape the WASM runner maps. | yes | `$F/ui/core/proto/api.ts:993,1874,1887,1916`; harness per-slot result files (research-local §Q1a); web Step 7's mapping |
| C11 | Sequential HTTP bulk requests do not collide server-side (fresh UUID per request, `main.go:212`, mutex-guarded). | no | reviewer-confirmed at `main.go:212`; end-to-end Step 6 |
| C12 | Per-chunk screening cost: ~12 chunks × (chunk iterations + ~5,400-iteration baseline probe); the 3-extra-probe cost of the web bound vs a Go bound is ≈ 16k iterations, ~1–2% of screening. **Extrapolated from research-local §Q1b measurements, not directly measured**; Step 6 quotes actual stage metrics. | no | research-local §Q1b (13 probes, 70,575 iters) + arithmetic; labeled extrapolated |
| C13 | `WorkerPool.bulkSimAsync` accepts `SimSignals` and abort is wired (`worker_pool.ts:214-216`); the `RequestTypes` member that works was recorded by web Step 3. | yes | `worker_pool.ts:139-157,214-216`; web executor's ledger entry from its Step 3 |
| C14 | A single chunk's bulk run under the bound completes far inside the 10-minute eviction window (per-slot runs of 11–29 candidates completed in the harness), so eviction is a tail risk, not the common case — but Step 2's guard makes it an error either way. | no | research-local §Q1a harness runs; hypothesis, untested at exactly 5,000-iteration chunk sizing — Step 6 observes wall behavior |

## Steps

All paths relative to `$U` unless absolute. Vendor files outside `upgrades/` are read-only.

1. **Preflight: confirm web outcomes, PROVENANCE status, and transport ground truth.**
   Files: none.
   (a) Verify web's landed state: `grep -n "runBulkScreen\|bulkScreenCacheKey" engine/seams/sim-runner.ts`; `ls engine/bulk/partition.ts adapters/bulk_request_builder.ts adapters/bulk_wasm_sim_runner.ts`; `grep -n "DEFAULT_ITERATIONS = 5000" engine/rank.ts`; read the web executor's ledger for the measured `MAX_CANDIDATES_PER_BULK_REQUEST` and the working `RequestTypes` member. Acceptance: all present; bound ≤ 25 (C3) — if the bound exceeds 25 or anything is missing, stop and escalate.
   (b) `grep -n "adapters\|bulk_http\|sim-runner\|rank.ts" engine/PROVENANCE.md`; ledger which files this plan may touch are tracked. Acceptance: ledger note (C9).
   (c) Build and run the packaged server per `docs/agents/known-traps.md`'s dev-server note; on **the page served by the Go server (port 3333)**, evaluate `await new WorkerPool(1).isWasm()` → must be `false`; on **the page served by vite (5173)**, the same expression → must be `true`. Acceptance: both observations ledgered with the serving server named. Depends: C5, C8, C9.

2. **`BulkHttpSimRunner` adapter.**
   Files: new `adapters/bulk_http_sim_runner.ts`.
   Implements `SimRunner` including `runBulkScreen`: partition via `partitionForBulkScreen(candidates, MAX_CANDIDATES_PER_BULK_REQUEST)` (web's constant, reused per Approach), build each chunk via `buildBulkSimRequest`, execute `pool.bulkSimAsync(request, onProgress, signals)` **sequentially** per chunk (server is NumCPU-parallel per request, C6), map `baseline` + `topResults[].candidateIndex/dpsMetrics` to `BulkScreenResult` (import the mapping from `bulk_wasm_sim_runner.ts` if web exported it; else write it here — adapter code, no shared-module invention). Non-bulk `run()` delegates as today's runner does.
   **Truncation guard (C7):** after each chunk resolves, assert `topResults` has exactly one row per chunk candidate plus a baseline; on any shortfall or missing final result, throw a descriptive error — never return a partial `BulkScreenResult`. This converts the 204-eviction silent path into a hard failure.
   **Abort (C13):** signals come from `signalManager.registerRunning(<RequestTypes member from web Step 3>)` at the same site pattern as `wasm_sim_runner.ts:116`; pass them into every `bulkSimAsync` call (aborts the in-flight chunk via `worker_pool.ts:214-216`) and check `signals` for abort before dispatching each next chunk (skips the remainder). Include a load-bearing comment citing C2/C3 (why the bound guarantees no culling) and C7 (why the row-count guard exists).
   Acceptance: fork typecheck (`npm --prefix $F run type-check`) exits 0. Depends: C1, C2, C3, C7, C8, C10, C13.

3. **Runner selection at construction.**
   Files: the tab's runner-construction site (executor locates it — expected in `adapters/` or the tab wiring that today constructs `WasmSimRunner`/`BulkWasmSimRunner`; web Step 7's factory is the anchor). Choose `BulkHttpSimRunner` when `await pool.isWasm()` resolves `false`; otherwise keep web's factory decision unchanged (bulk-WASM at concurrency ≥ 2, plain loop runner at Off/1). **Contingency:** if the construction site turns out to be a PROVENANCE-tracked engine file, run the full five-step cycle from `docs/agents/known-traps.md` (parity test → sha256 → fork commit → re-pin `data/wowsims-fork.lock.json` → `pnpm sim-implemented-effects:generate` → `pnpm verify`) and add the file + `PROVENANCE.md` + lock file to the commit; ledger it. Acceptance: fork typecheck green; on the Go-served page the constructed runner is `BulkHttpSimRunner` (console-observable), on the vite-served page it is web's runner. Depends: C5, C8, C9.

4. **Recorded fixture for the HTTP-sourced bulk screen.**
   Files: fixture files under `engine/fixtures/` (web Step 8's convention), test extension where the existing `rankUpgrades` recorded-adapter tests live (`packages/core/test/` in the outer repo — extend in place). Record one real `BulkScreenResult` set from the **Go-served** tab (packaged server), keyed by `bulkScreenCacheKey` — the same key scheme as web's fixture, so the engine test is transport-blind; the point of this fixture is that Go-engine observations (not TS-engine ones) flow through `rankUpgrades`' bulk branch green. No assertions on stage internals. Acceptance: test runs offline and green inside `pnpm verify`. Depends: C8, C10.

5. **Equivalence measurement — pre-registered before running.**
   On feral-p2, page served by the **packaged Go server**, run `rankUpgrades` end-to-end twice: loop runner vs `BulkHttpSimRunner`, both at 5,000 iterations. Win conditions, registered now (mirroring web Step 10 so the two transports are held to the same bar): (a) identical screened-candidate count both ways; (b) per-chunk Spearman rank correlation of screening deltas ≥ 0.95; (c) paired-replication top-N selections overlap ≥ 90%; (d) final displayed ordering of shared top-N members identical within each row's reported error bars. Any miss = **stop and escalate with the numbers** — not adapt. Acceptance: all four conditions quoted with measured values in the ledger. Depends: C8, C10.

6. **End-to-end acceptance and cost observation.**
   Page served by the **packaged Go server**: run the full tab flow on feral-p2. Observe in the network panel: screening issues exactly ceil(candidates / bound) `POST /bulkSimAsync` calls and **zero per-candidate `raidSimAsync` posts during the screening phase** (the baseline, set-bonus sims, and paired replication still post `raidSimAsync` — that is the design, not a failure); every chunk passes the Step-2 row-count guard; progress UI updates during chunks; a user cancel mid-screening stops the in-flight chunk and issues no further bulk posts. Quote actual per-chunk stage metrics and baseline-probe counts against C12's extrapolation. Then the vite-served page (5173): confirm the tab takes the WASM branch (no `/bulkSimAsync` posts; web behavior intact). Acceptance: all observations ledgered with serving server named per check; C14 flipped to observed or the eviction behavior escalated. Depends: C5, C6, C11, C12, C14.

7. **Verify + commit.** `pnpm verify` (outer repo); `npm --prefix $F run type-check`; `git -C $F status --porcelain` shows only `upgrades/` paths; commit per green slice on `feat/upgrades-tab-batch-sim`. Depends: C9.

## Paths manifest

- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/adapters/bulk_http_sim_runner.ts` (new)
- The tab runner-construction site (modify; located at Step 3 — expected under `$U/adapters/` or `$U` tab wiring; **contingency**: if it is a tracked `engine/` file, add `$U/engine/PROVENANCE.md` + `data/wowsims-fork.lock.json` per the five-step cycle)
- `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/fixtures/` (new recorded HTTP-sourced bulk fixture)
- `C:\Users\dgree\Code\lulz\tbc-gear-prio\packages\core\test\` (extend the existing `rankUpgrades` recorded-adapter test in place)

Everything else in `vendor/tbc-new-fork` — including all files web v2 created — is read-only for this plan. No partition: single executor, sequential steps.

## Verify recipe

```
ls vendor/tbc-new-fork/ui/core/sim.ts                          # fork present (main checkout only)
grep -n "runBulkScreen" vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/seams/sim-runner.ts
grep -n "MAX_CANDIDATES_PER_BULK_REQUEST" vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/bulk/partition.ts
pnpm verify
npm --prefix vendor/tbc-new-fork run type-check
git -C vendor/tbc-new-fork status --porcelain                  # only upgrades/ paths
grep -rn "bulkSimAsync" vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/adapters/bulk_http_sim_runner.ts
```

Plus, from the executor's ledger: Step 1(c)'s two `isWasm()` observations (server named each), Step 5's four registered conditions with measured values, and Step 6's network-panel observations under both servers.

## Out of scope

- Editing any wowsims-owned file (`sim/web/main.go`, `worker_http.ts`, `worker_pool.ts`, protos, `sim/core/bulk/*`) — including fixing the 10-minute eviction server-side or adding a concurrency knob (C6/C7: flag, don't build).
- Everything web v2 owns and already delivered: the seam capability, partitioner, request builder, `rank.ts` bulk branch, `DEFAULT_ITERATIONS = 5000`, the WASM runner, the upstream-switch comment. This plan reads them; it does not modify them.
- Making the HTTP bulk path work on vite-served pages (documented constraint in Approach) or any client-side detection of "a Go server exists somewhere".
- Concurrent (parallel) chunk posts — sequential only; the server parallelizes internally (C6).
- A Go-specific partition bound (rejected in Approach with numbers) and any bespoke screening/iteration schedule.
- Other universes; all measurements are feral-p2.
- Pre-merge review and merging — normal loop, after execution.

## Round-2 review conditions (binding on the executor — from plan-local-review.md round 2)

- **new-1 (blocking, resolved via web's builder):** `topResults` defaults to 5 and truncates every response independent of culling (`index.ts:84`, `constants.ts:1`; Go `bulk_sim.go:86-88,12,183`). C10 now DEPENDS on web Step 6's `buildBulkSimRequest` setting `topResults = candidates.length` (made binding in plan-web.md § Round-2 conditions, L-new-1). Step 1(a) preflight additionally runs `grep -n "topResults" adapters/bulk_request_builder.ts` and escalates if absent.
- **new-2 (material):** C2's mechanism is completed: Go also gates on `shouldUseLegacyBulkSim` (`estimate.go:7-18`, applied `bulk_sim.go:114,130-132`) — iteration-sensitive, same order and configs as TS (`index.ts:116-117` — verified line-parallel), which is *why* web's bound transfers. C3's escalation is two-sided: escalate if the measured web bound exceeds 25 **or** if web's bound was measured under builder conditions local's chunks will not reproduce (in particular the `topResults` setting).
- **new-3 (minor):** the new-engine-file PROVENANCE question is decided (not ledgered) in plan-web.md L-new-3: table-driven checker, new files carry no row.

Reconciliation conditions (binding — from reconciliation.md, routed by the orchestrator):

- **R1 (blocking, fixes Step 3 + Paths manifest + Verify recipe):** the runner-construction site is `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx:446` — project-owned, outside `upgrades/`, ADDED to this plan's Paths manifest. The web plan introduces the runner factory there; **this plan extends only the factory's branch condition** (isWasm false → `BulkHttpSimRunner`). The Verify recipe's `git status --porcelain` assertion is amended to permit `upgrades/` paths plus `upgrades_tab.tsx`.
- **R3 (material, fixes Step 2):** the `BulkSimResult` → `BulkScreenResult` mapping is imported from web's exported named function in `bulk_wasm_sim_runner.ts` — the "else write it here" branch is deleted; never duplicate the mapping.
- **R5 (material, folds into Step 4):** fixture keys embed `simVersion` (`sim-runner.ts:46`) sourced from the running engine (`wasm_sim_runner.ts:93`); a Go-served recording may carry a different version value than a WASM one. Step 4 must state the `simVersion` the fixture is recorded under and confirm the offline test resolves that value.
- **R6 (minor):** C9's / Step 3's PROVENANCE contingency is dead (`upgrades_tab.tsx` is outside `engine/`, carries no row); the live condition is R1's manifest/gate amendment above.

## Revision notes

- **Finding 1 (blocking — dpsMetrics vs paired-seed delta):** dissolved by adopting web v2's architecture per orchestrator directive 1 — bulk is the screening pass only; paired replication and the single baseline are untouched (Goal, Approach). The old C11 ordering-diff gate is replaced by Step 5's four pre-registered conditions comparing `rankUpgrades`-to-`rankUpgrades` across runners, not bulk-to-bulk.
- **Finding 2 (blocking — server-side transport decision):** modeled explicitly in C5 and Approach: `isWasm()` reports the transport the pool actually has; the HTTP path engages only under the packaged server, vite pages take the (also-native-bulk) WASM branch, argued as acceptable per directive 2. Every live acceptance check (Steps 1c, 3, 5, 6) names the serving server.
- **Finding 3 (blocking — proto in the seam):** gone — this plan adds nothing to the seam; it implements web's protojson-vocabulary `runBulkScreen` (C8), and the proto bridge lives in the shared `buildBulkSimRequest` adapter.
- **Finding 4 (material — PROVENANCE):** this plan touches no `engine/` file in the expected case (C9, Step 1b verifies); the Step 3 contingency spells out the five-step cycle and adds the affected files to the manifest if the construction site is tracked.
- **Finding 5 (material — silent 204 eviction):** C7 registers the mechanism; Step 2's row-count guard converts truncation into a hard error; Step 6 checks the guard live; C14 notes chunk runs are short, making eviction a guarded tail risk.
- **Finding 6 (material — AbortSignal/progress):** Step 2 specifies the signal source (`signalManager.registerRunning` with the `RequestTypes` member web Step 3 recorded, C13), in-flight abort via the pool wiring, and pre-dispatch skip of remaining chunks; Step 6 tests a live cancel.
- **Finding 7 (material — undecidable ordering gate):** replaced by Step 5's four pre-registered thresholds (count equality, Spearman ≥ 0.95, overlap ≥ 90%, error-bar ordering), identical to web Step 10's bar; miss = stop.
- **Finding 8 (material — conditioned on a nonexistent web plan):** web v2 exists and lands first; all conditionals removed — C8 names its concrete outcomes and Step 1 verifies them as preflight, with escalation if absent.
- **Finding 9 (minor — C6 misattribution):** the bespoke-screening rejection is no longer argued from the adaptive-vs-flat wash; it follows from adopting web's architecture (owner rules 1 and 4), and the old C6 measurement survives only as web's C10 context.
- **Finding 10 (minor — extrapolated numbers unlabeled):** C12 carries the "extrapolated, not measured" label explicitly and Step 6 quotes the real stage metrics; the old flat-212 figure is dropped entirely.
- **Finding 11 (minor — fixture cache key):** Step 4 keys the recorded HTTP fixture by web's `bulkScreenCacheKey` (C8), names the fixture and test locations, and states its purpose (Go-engine observations through the same transport-blind engine test).
