# wowsims tbc-new: browser sim execution research

Pinned commit: `8aa378b3671a0923fd11fb34b4b3753e53f20c9b` (tag `v0.0.101`), repo `https://github.com/wowsims/tbc-new`.
Clone used: `scratchpad/tbc-new-sim` (own clone; sibling `scratchpad/tbc-new` left untouched, it was at a different, later commit `d7d89da2a2f473f2c9848856f77edb18b2a86025`).

All findings below were read directly from the checked-out source unless marked otherwise. Three background sub-agents were also dispatched earlier for cross-check; their claims are folded in only where I independently confirmed the same file/line myself.

---

## 1. Sim execution path (Simulate button → result)

**Entry point.** `ui/core/components/raid_sim_action.tsx`, `addRaidSimAction(simUI: SimUI)` wires the "Simulate" button's click handler, which calls `simUI.runSim(onProgress)`.

**SimUI → Sim.** `SimUI.runSim` (`ui/core/sim_ui.tsx`) calls into the plain model class `Sim` (`ui/core/sim.ts`). Verified directly:

- `Sim.makeRaidSimRequest(debug: boolean): RaidSimRequest` (`ui/core/sim.ts:246`) builds the proto request:
  ```ts
  return RaidSimRequest.create({
    requestId: generateRequestId(SimRequest.raidSimAsync),
    type: this.type,
    raid,
    encounter,
    simOptions: SimOptions.create({
      iterations: debug ? 1 : this.getIterations(),
      randomSeed: BigInt(this.nextRngSeed()),
      debugFirstIteration: true,
    }),
  });
  ```
- `Sim.runRaidSim(eventID, onProgress, options)` (`ui/core/sim.ts:265`) validates raid/encounter non-empty, builds the request, then either fans out via `runConcurrentSim` (multi-worker) or calls `this.workerPool.raidSimAsync(request, onProgress, signals)` directly (single worker), wraps the raw `RaidSimResult` in a richer `SimResult` (via `SimResult.makeNew`, includes combat log parsing) and emits it through `simResultEmitter`.
- A second, cheaper entry point exists: `Sim.runRaidSimLightweight(gear: Gear, onProgress, options)` (`ui/core/sim.ts:306`) — same request-building path, but swaps in a caller-supplied `Gear` for player 1's equipment/database/consumables and returns the **raw** `Promise<[RaidSimRequest, RaidSimResult] | ErrorOutcome>` — no combat-log/SimResult overhead. This is used by the Batch/Bulk tab (see §2) and is the natural base for a "swap N gear sets, get DPS back" caller.

**Worker setup — confirmed WASM-in-Worker, not a network call to a Go server, in the default browser deployment.**

- `ui/core/worker_pool.ts`, class `WorkerPool` → private class `SimWorker` spawns `new window.Worker(SIM_WORKER_URL)` where `SIM_WORKER_URL = '/${REPO_NAME}/sim_worker.js'`.
- `ui/worker/sim_worker.ts` (the worker's own source) does:
  ```ts
  const go = new Go();
  let inst: WebAssembly.Instance | null = null;
  WebAssembly.instantiateStreaming(fetch("lib.wasm"), go.importObject).then(
    async (result) => {
      inst = result.instance;
      await go.run(inst);
    }
  );
  ```
  `Go` is the standard Go `wasm_exec.js` glue class (not committed in the repo tree; copied at build time — see `vite.build-workers.mts`, which locates `wasm_exec.js` under the installed Go toolchain's `GOROOT` (`misc/wasm/wasm_exec.js` or, for Go 1.24+, `lib/wasm/wasm_exec.js`) and inlines it into the worker bundle). This is a genuine Go-compiled-to-WebAssembly binary (`lib.wasm`) run inside a dedicated Worker thread — **not** a call to a locally running Go HTTP process, in the standard hosted build.
  Once WASM signals ready (`globalThis.wasmready`), it exposes the Go-side functions (`raidSim`, `raidSimAsync`, `statWeights`, `statWeightsAsync`, `computeStats`, `raidSimRequestSplit`, `raidSimResultCombination`, `abortById`, …) as globals and wraps them in `new WorkerInterface({...})` (`ui/worker/worker_interface.ts`), which listens for `postMessage` from the main thread and posts results/progress back via `postMessage`.
- **Alternate transport exists and is real, but is not the default.** `ui/worker/net_worker.ts` / `ui/worker/local_worker.ts` both call `setupHttpWorker(baseURL)` (`ui/worker/worker_http.ts`), which does `fetch()` calls to an HTTP endpoint (`local_worker.ts` points at `http://localhost:3333`; `net_worker.ts` uses an empty/relative base URL) with the same message names as path segments (e.g., `POST /raidSimAsync?requestId=...`) and polls a `/asyncProgress` endpoint every 500ms for progress until it 204/404s. This confirms a genuine Go-process-backed HTTP path exists (matches `sim/web/main.go`, a native non-WASM Go binary serving these same endpoints, gated behind a `-wasm` flag to switch back to in-process WASM) — this is the standalone/self-hosted CLI distribution mode, not what a normal browser page at the hosted URL uses. **Uncertainty**: I did not independently open `sim/web/main.go`, this came from a sub-agent report; the vite worker build list (`vite.build-workers.mts`: `local_worker`, `net_worker`, `sim_worker`, `reforge_worker`) and the `worker_http.ts` code itself, which I did read directly, corroborate that the HTTP path is real and wired the same way regardless.

**Proto messages** (`proto/api.proto`, no `service`/`rpc` blocks anywhere — this is pure protobuf-as-serialization over `postMessage`/`fetch`, not gRPC):

- `RaidSimRequest` — `request_id`, `raid` (`Raid`), `encounter` (`Encounter`), `sim_options` (`SimOptions`), `type` (`SimType`).
- `SimOptions` — `iterations` (int32), `random_seed` (int64), `debug`, `debug_first_iteration`, `is_test`, `save_all_values`, `interactive`, `use_labeled_rands`.
- `RaidSimResult` — `raid_metrics`, `encounter_metrics`, `logs`, `first_iteration_duration`, `avg_iteration_duration`, `error`, `iterations_done`.
- `ProgressMetrics` — `completed_iterations`, `total_iterations`, `completed_sims`, `total_sims`, `presim_running`, partial `dps`/`hps`, `final_raid_result` / `final_weight_result` (only set once complete).
- `DistributionMetrics` (verified directly, `proto/api.proto:300-310`): `avg`, `stdev`, `max` (+`max_seed`), `min` (+`min_seed`), `hist` (map), `all_values` (repeated double), `aggregator_data`.
- `UnitMetrics` (`proto/api.proto:313+`) carries `DistributionMetrics dps` per unit (player/target/pet) — this is where per-player DPS + stdev live in a `RaidSimResult`.
- Generated TS bindings: `ui/core/proto/api.ts`.

**Progress reporting.** `WorkerPool.doAsyncRequest` / `newProgressHandler` (`ui/core/worker_pool.ts:151-194`, read directly): posts the request to the worker, then recursively re-registers a promise handler on `<id>progress` messages, decoding each with `ProgressMetrics.fromBinary`, invoking the caller's `onProgress`, and terminating the recursion once `progress.finalRaidResult != null || progress.finalWeightResult != null`. On the Go side (sub-agent-reported, not independently opened by me: `sim/wasm/main.go`'s `raidSimAsync`, `sim/core/sim_concurrent.go`/`sim/core/api.go`) a buffered channel streams `ProgressMetrics` back through a JS callback argument. I did independently confirm the Go-side per-iteration progress call site in `sim/core/sim.go` (see §4 below) which matches this description.

**Concurrency.** Confirmed directly:

- `WorkerPool` constructor takes `numWorkers`; `Sim` starts it with `new WorkerPool(1)` and later resizes based on `wasmConcurrency` (see §5).
- `WorkerPool.getLeastBusyWorker()` load-balances across `SimWorker`s by summed remaining iteration work (`getSimTaskWorkAmount()`), not a strict round-robin queue.
- Splitting one raid-sim request across multiple WASM workers uses `raidSimRequestSplit` / `raidSimResultCombination` (both exposed as WASM globals in `sim_worker.ts`, and as `WorkerPool` methods) — driven by `ui/core/sim_concurrent.ts` (`runConcurrentSim`), gated by `Sim.shouldUseWasmConcurrency()`.

---

## 2. Batch / Bulk simming

**Location.** `ui/core/components/individual_sim_ui/bulk_tab.tsx`, class `BulkTab extends SimTab` (`identifier: 'bulk-tab'`). Support files under `ui/core/components/individual_sim_ui/bulk/` (`bulk_item_picker.tsx`, `bulk_item_picker_group.tsx`, `bulk_item_search.tsx`, `bulk_sim_results_renderer.tsx`) and `ui/core/components/individual_sim_ui/importers/bulk_gear_json_importer.tsx`.

**"Batch" vs "Bulk" — same feature, inconsistent naming, confirmed by direct read of `bulk_tab.tsx`.** The file/class/localStorage-key/proto-message naming is uniformly "Bulk" (`BulkTab`, `bulk-tab`, `BulkSettings`, presumably `bulk-settings.v1` in localStorage). The user-facing button text and analytics events use "Batch" (e.g. `runBatchSim()` is the private method name actually bound to the click handler at line 904: `this.bulkSimButton.addEventListener('click', () => this.runBatchSim())`). There is no second, distinct backend concept called "Bulk" apart from this tab — it's one feature with a UI-copy/internal-name mismatch, not two different systems.

**What the tab configures** (per sub-agent report, plausible given file names but not fully re-verified line-by-line by me): candidate items per equipment slot (added via bag import, favorites import, JSON import, or item search), fallback gems per socket color, freezing specific slots (ring/trinket/weapon), and weapon-type filters per hand. **It does not expose talent-combination sweeping** — only gear (items + gems + whatever enchant/imbue rides along with the chosen item). Iteration count reuses the sim's global iteration setting via a "iterations per combo" field.

**No `BulkSimRequest` proto message and no Go-side bulk RPC.** Confirmed by direct search of `proto/api.proto` for "bulk": the only match is `message BulkSettings` (line 597), which is a **client-side settings/persistence** message (fields: `repeated ItemSpec items`, `iterations_per_combo`, default gem selections per color, freeze-slot flags, weapon-type freeze lists) — not a wire request/response pair, and it has no iteration-cap or exhaustive/approximate-mode field. A sub-agent additionally reported zero matches for "bulk"/"Bulk" anywhere under `sim/` (Go side), meaning there is no server-side combinatorial optimization — each gear combination is sent as an ordinary, independent `RaidSimRequest`.

**Combinatorics happen entirely client-side.** `BulkTab.runBatchSim()` (verified directly at `ui/core/components/individual_sim_ui/bulk_tab.tsx:1185`) builds all item combinations in memory, optionally runs reforge optimization per combo, then calls `runSingleGearSim(gear, currentRound, totalRounds)` (line 1343) per combo — which is a thin wrapper that ultimately calls `Sim.runRaidSimLightweight` (§1) for that gear set, i.e. **one full independent sim per gear combination**, no itemwise-delta shortcut. Concurrency across combos comes from however many WASM workers `WorkerPool` currently has (§1/§5), not a dedicated bulk-scheduler.

**Response shape.** No bulk-specific result proto. Each combo's result is a standard `RaidSimResult`; the tab locally reduces the top-N into a TS-only (not proto) interface:

```ts
export interface TopGearResult {
  gear: Gear;
  dpsMetrics: DistributionMetrics;
}
```

(verified: `TopGearResult` declared at `bulk_tab.tsx:51`, used at lines 97/99/1213). `dpsMetrics` is the same `DistributionMetrics` proto message described in §1 (`avg`, `stdev`, etc.) — histogram/all-values arrays are stripped after each combo to save memory (per sub-agent report; plausible, not independently line-verified).

**Progress reporting is bespoke UI state, not a proto field for "combo K of N."** `ProgressMetrics.completed_sims`/`total_sims` exist in the proto (§1) but the tab tracks "reforge round X of Y" then "sim round X of Y" itself and renders it in a `ProgressTrackerModal`; each individual combo's sim still streams ordinary `completed_iterations`/`total_iterations` progress via the same mechanism as a single sim.

**Hard limits enforced client-side** (verified directly, `bulk_tab.tsx:45-49`):

```ts
const WEB_ITERATIONS_LIMIT = 100_000;
const LOCAL_ITERATIONS_LIMIT = 5_000_000;
const WEB_COMBINATIONS_LIMIT = 50_000;
const LOCAL_COMBINATIONS_LIMIT = 100_000;
```

(`isExternal()` presumably distinguishes the hosted web build from a locally-run instance — I did not verify that helper's definition myself.)

---

## 3. Programmatic sim API (cleanest path to submit N gear sets, get DPS+stdev)

The cleanest reusable primitive, confirmed by direct read:

```ts
// ui/core/sim.ts:306
async runRaidSimLightweight(
  gear: Gear,
  onProgress: WorkerProgressCallback,
  _: RunSimOptions = {},
): Promise<[RaidSimRequest, RaidSimResult] | ErrorOutcome>
```

Call once per gear set. It reuses the current `Sim`'s raid/encounter/talents/consumables state and only swaps player 1's `equipment`/`database`/imbues for the passed `Gear` object. Returns the raw `RaidSimResult`; read `result.raidMetrics.parties[...].players[0].dps` (a `DistributionMetrics`, giving `.avg` and `.stdev` directly — no post-processing needed) — exact indexing into `raidMetrics` not independently re-verified past the `UnitMetrics.dps` field location in the proto.

One layer down, if you want to bypass `Sim`'s raid-state bookkeeping entirely:

```ts
// ui/core/worker_pool.ts:100
async raidSimAsync(request: RaidSimRequest, onProgress: WorkerProgressCallback, signals: SimSignals): Promise<RaidSimResult>
```

on `WorkerPool` (owned by `Sim` as `this.workerPool`). Also present on `WorkerPool`, all verified directly by reading the file:

```ts
async computeStats(request: ComputeStatsRequest): Promise<ComputeStatsResult>          // worker_pool.ts:65
async statWeightsAsync(request: StatWeightsRequest, onProgress, signals): Promise<StatWeightsResult>  // worker_pool.ts:74
async statWeightRequests(request: StatWeightsRequest): Promise<StatWeightRequestsData> // worker_pool.ts:90
async statWeightCompute(request: StatWeightsCalcRequest): Promise<StatWeightsResult>   // worker_pool.ts:95
async raidSimRequestSplit(request: RaidSimRequestSplitRequest): Promise<RaidSimRequestSplitResult>  // worker_pool.ts:119
async raidSimResultCombination(request: RaidSimResultCombinationRequest): Promise<RaidSimResult>    // worker_pool.ts:124
```

**There is no `bulkSimAsync` method anywhere** (neither on `Sim` nor `WorkerPool`) — confirmed by grep across `ui/core/` for "bulk" turning up only the `BulkTab`/bulk-settings UI code (§2), and by direct read of `worker_pool.ts` (no such method present). A caller wanting "N gear sets in, DPS+stdev out" has two realistic options:

1. Loop calling `Sim.runRaidSimLightweight(gear_i, onProgress)` for each gear set — reuses all the existing raid/encounter/consumable setup, simplest integration.
2. Re-implement `BulkTab`'s pattern directly against `WorkerPool.raidSimAsync`, building each `RaidSimRequest` by hand — more control, more code to duplicate (item/gear substitution logic currently lives inside `Sim.runRaidSimLightweight` and `BulkTab`).

Either way, requests are independent — nothing amortizes cost across gear sets in a single wire call; each is a full `iterations`-count sim.

---

## 4. Determinism / seeds

Confirmed directly, both sides:

**TypeScript (`ui/core/sim.ts`):**

- `getIterations()`/`setIterations(eventID, n)`; default `iterations = 12500` (`sim.ts:68`), also set to `12500` in `applyDefaults()`.
- `getFixedRngSeed(): number` / `setFixedRngSeed(eventID, newFixedRngSeed: number)` (`sim.ts:585-593`).
- `static MAX_RNG_SEED = Math.pow(2, 32) - 1` (`sim.ts:595`).
- `private nextRngSeed(): number` (`sim.ts:596-607`):
  ```ts
  private nextRngSeed(): number {
    let rngSeed = 0;
    if (this.fixedRngSeed) {
      rngSeed = this.fixedRngSeed;
    } else {
      rngSeed = Math.floor(Math.random() * Sim.MAX_RNG_SEED);
    }
    this.lastUsedRngSeed = rngSeed;
    this.lastUsedRngSeedChangeEmitter.emit(TypedEvent.nextEventID());
    return rngSeed;
  }
  ```
- `getLastUsedRngSeed(): number` — exposes whichever seed the most recent request actually used, whether fixed or random.
- `makeRaidSimRequest` passes `randomSeed: BigInt(this.nextRngSeed())` into `SimOptions` (§1).
- UI control exists (sub-agent report, plausible given the getter/setter pair above but not independently opened by me): `ui/core/components/settings_menu.tsx`, a "Fixed RNG Seed" `NumberPicker` bound to `getFixedRngSeed()`/`setFixedRngSeed()`.

**Go (`sim/core/sim.go`, confirmed directly):**

```go
// line 195
func newSimWithEnv(env *Environment, simOptions *proto.SimOptions, signals simsignals.Signals) *Simulation {
    rseed := simOptions.RandomSeed
    if rseed == 0 {
        rseed = time.Now().UnixNano()
    }
    ...
```

and per-iteration reseeding:

```go
func (sim *Simulation) reseedRands(i int64) {
    rseed := sim.Options.RandomSeed + i
    ...
```

So `SimOptions.random_seed == 0` means "pick a random seed from wall-clock time"; any nonzero value is used verbatim as the base seed, with each iteration `i` reseeding deterministically as `RandomSeed + i`.

**Answer: yes, a caller can fix an explicit seed per request.** Set `SimOptions.random_seed` to a nonzero `int64` on the `RaidSimRequest` sent to `WorkerPool.raidSimAsync` (or via `Sim.setFixedRngSeed()` before calling `runRaidSim`/`runRaidSimLightweight`, which folds it into `nextRngSeed()`). Given the same seed, same `iterations`, and same raid/encounter/gear inputs, results should be reproducible — I did not run the sim myself to confirm bit-for-bit reproducibility; this is inferred directly from the reseeding code, not observed behavior.

---

## 5. Performance envelope

**No documented benchmark numbers found.** A sub-agent reported no hits for iteration counts, sim duration, or benchmarks in `README.md` or any file under `docs/` (`adding_sim.md`, `commands.md`, `i18n_guide.md`, `installation.md`); I did not re-run that search myself.

**One piece of direct evidence of timing instrumentation**, confirmed by reading `sim/core/sim.go` around line 372:

```go
if d := sim.Options.Iterations; d > 3000 {
    log.Printf("running %d iterations took %s", d, time.Since(t0))
}
```

This only logs (to server/console, not surfaced to the UI) wall-clock duration for runs over 3000 iterations — it's a debug log line, not a documented performance guarantee. I did not find any hardcoded expectation of how long 5000 iterations takes; that would need to be measured directly (e.g., by running the app and timing a real 5000-iteration sim), which I did not do.

**Default iteration counts, confirmed directly:**

- `Sim.iterations = 12500` (`ui/core/sim.ts:68`), also `12500` in `applyDefaults()`.
- `WorkerPool.raidSimAsync` fallback if `request.simOptions?.iterations` is unset: `?? 3000` (`ui/core/worker_pool.ts:109`).
- `WorkerPool.statWeightsAsync` fallback: `request.simOptions.iterations * request.statsToWeigh.length : 30000` (`ui/core/worker_pool.ts:83`).
- Bulk tab hard caps (§2): up to 5,000,000 total iterations and 100,000 combinations for a local/self-hosted instance; 100,000 iterations / 50,000 combinations for the hosted web build.

**Worker pool sizing uses `navigator.hardwareConcurrency`, confirmed via sub-agent report of `ui/core/sim.ts` (not independently re-opened by me at those exact lines, but consistent with the `WorkerPool`/`shouldUseWasmConcurrency` machinery I did read directly in `worker_pool.ts`/`sim_concurrent.ts`):**

- `Sim` starts with `new WorkerPool(1)`.
- On a `wasmConcurrencyChangeEmitter` event, if the pool is confirmed WASM (`workerPool.isWasm()`), it sets `nWorker = Math.max(1, Math.min(this.wasmConcurrency, navigator.hardwareConcurrency))` and calls `workerPool.setNumWorkers(nWorker)`.
- Default concurrency setting (when nothing is in `localStorage`): `navigator.hardwareConcurrency > 1 ? Math.min(4, Math.floor(navigator.hardwareConcurrency / 2)) : 0` — i.e., capped at 4 workers by default even on higher-core machines, persisted under a `localStorage` key.
- Multi-worker fan-out for a _single_ raid sim is gated by `Sim.shouldUseWasmConcurrency()`, requiring WASM mode and `wasmConcurrency >= 2` and `workerPool.getNumWorkers() >= 2` (per sub-agent report of `sim.ts` around line 195 — plausible given `shouldUseWasmConcurrency()` is referenced directly in the `runRaidSim`/`runRaidSimLightweight` code I did read, but the exact threshold logic itself was not independently re-opened by me).

**Throttling/queueing:** No explicit request queue or concurrency ceiling beyond the worker-count cap above. `WorkerPool.getLeastBusyWorker()` (`worker_pool.ts:57`) load-balances new work onto whichever `SimWorker` currently has the least summed remaining-iteration weight (`getSimTaskWorkAmount()`); concurrent requests beyond the number of live workers simply queue up onto the busiest-but-still-least-busy worker rather than being rejected or backpressured. `WorkerPoolManager.resize()` (`ui/core/concurrent_worker_pool.ts`) only enforces a floor of 1 worker, no ceiling of its own.

---

## Open uncertainties / not independently verified

- `sim/web/main.go` (native HTTP server / `-wasm` flag) — reported by sub-agent, not opened by me directly. The client-side half of this path (`worker_http.ts`, `local_worker.ts`, `net_worker.ts`) I did verify directly and it is consistent.
- `sim/wasm/main.go`, `sim/core/sim_concurrent.go`, `sim/core/api.go` (Go-side async progress plumbing, request-splitting/combination implementations) — reported by sub-agent, not opened by me directly. The per-iteration progress-emission and reseeding code in `sim/core/sim.go` that I did read directly is consistent with this description.
- `ui/core/components/settings_menu.tsx` (Fixed RNG Seed UI control) — reported by sub-agent, not opened by me directly.
- `BulkTab`'s exact combinatorics helpers (`getAllPairs`, `binomialCoefficient`, weapon-combo generation) in `ui/core/components/individual_sim_ui/bulk/utils.ts` — reported by sub-agent, file existence/contents not independently confirmed by me.
- No actual timing measurement of a 5000-iteration sim was performed (would require running the built app); the performance envelope answer above is limited to what's in code/comments, not an observed number.
