# Research report — web seat (Q2, Q3, Q4, Q5)

## Summary

The headline finding is that **web bulk sim already works today, entirely in the browser, with no server**. I ran a real bulk sim on the live public site (`https://www.wowsims.com/tbc/druid/feralcat/`, the `tbc-new` deployment that matches our fork — note `wowsims.github.io/tbc/` is the dead 2021 sim and has no batch tab at all) and it completed with results after ~60s at 12,500 iterations, with **zero POSTs to any sim endpoint**. The only network traffic was static assets plus four fetches of `sim_worker.js`. This works because `Sim.runBulkSim` has two branches: the WASM-concurrency branch (`sim.ts:565`, `runConcurrentBulkSim`) which reimplements the whole staged tournament in TypeScript under `ui/core/wasm/bulk_sim/`, and the `workerPool.bulkSimAsync` branch (`sim.ts:589`) which is the HTTP/local-server path. The handoff's "WASM stubs bulkSimAsync" claim is true but misleading — the stub at `sim_worker.ts:107` is never reached on web, because the WASM branch never dispatches that RPC.

For Q2 that means the answer to "is 'use their bulk results, then our own logic in the browser' viable?" is **yes, and it needs no extension point at all** — `Sim.runBulkSim` is public (`sim.ts:373`) and returns a full `BulkSimResult` we can post-process. `Sim.workerPool` is private with no accessor, so we cannot call `bulkSimAsync` directly, but we do not need to. For Q4 the "1 vs 4 workers" contradiction is resolved and **both agents were right about different things**: the pool is constructed with 1 (`sim.ts:164`) then resized to `min(4, floor(cores/2))` on the WASM path only (`sim.ts:179`); I confirmed live that a 20-core machine gets exactly 4, matching the 4 worker fetches. It **is** user-configurable via a settings picker. On local/native the pool stays at 1 by design. For Q5 the adaptive-iterations function is genuinely exported and pure, importable by a relative path with no adapter — with one caveat worth flagging to the planner: its module has an import cycle with `stage.ts`, which drags `WorkerPool` into the module graph.

One thing the planner should weigh: the live site's own banner says *"Download the local sim for faster results"* and *"This is an Alpha feature."*

---

## Q2 — Web architecture

### What our tab code can reach without modifying their files

The reachable public surface on `Sim` is three methods:

| Method | Site |
| --- | --- |
| `getBulkCombinationCount` | `$F/ui/core/sim.ts:341` |
| `getBulkCandidates` | `$F/ui/core/sim.ts:357` |
| `runBulkSim` | `$F/ui/core/sim.ts:373` |

`runBulkSim` signature (`sim.ts:373-380`): `(gearSets: Gear[], onProgress, reforgeConfig?, bulkSettings?, onCacheRestoreProgress?, abortSignal?) => Promise<BulkSimResult | ErrorOutcome>`.

**`workerPool.bulkSimAsync` is NOT directly reachable.** `Sim.workerPool` is `private readonly` (`sim.ts:101`) with no getter, and there is no `Sim.bulkSimAsync` method at all — the only one is `WorkerPool.bulkSimAsync` (`worker_pool.ts:139`). Places checked for an accessor: `sim.ts` (no getter on the field), and every `workerPool` consumer across `$F/ui` — all are either inside `sim.ts` or free functions receiving the pool as an explicit parameter (`sim_concurrent.ts:155,221`, `wasm/sim.ts:171`, `wasm/bulk_sim/index.ts:60`, `stage.ts:105,132,184,266`, `reforge.ts:12,119`, `batch.ts:52,84`). No component reads it.

### The two dispatch branches — this is the crux

`runBulkSim` forks on `shouldUseWasmConcurrency()` (`sim.ts:240-241`, requires `isWasm() && getWasmConcurrency() >= 2 && workerPool.getNumWorkers() >= 2`):

- **`sim.ts:565`** — `runConcurrentBulkSim(request, this.workerPool, …)`, the pure-TypeScript staged tournament in `$F/ui/core/wasm/bulk_sim/`. **This is what the live web site runs.**
- **`sim.ts:589`** — `await this.workerPool.bulkSimAsync(request, wrappedOnProgress, signals)`, which on the local build routes over HTTP: `worker_http.ts:64` → `makeHttpApiRequest` (`worker_http.ts:12-16`) → `POST /bulkSimAsync?requestId=<id>`, `Content-Type: application/x-protobuf`, body = `BulkSimRequest.toBinary(...)`, progress polled via `POST /asyncProgress` every 500ms (`worker_http.ts:33-49`). `net_worker.ts:3` passes an empty base URL, so same-origin.

The WASM stub (`sim_worker.ts:15-18`, bound at `:107`) is therefore **dead code on the web path** — reached only if a WASM page somehow had `wasmConcurrency < 2`, which would fall through to `sim.ts:589` and error. Worth a note in the plan as an edge case (`untested`).

### Request/response protos from TS

All in `$F/ui/core/proto/api.ts`:

| Type | Line | Top-level fields |
| --- | --- | --- |
| `BulkSimRequest` | `:993` | `requestId`, `baseRequest?: RaidSimRequest`, `candidates: BulkGearCandidate[]`, `optimizedCandidates`, `topResults: number`, `highStageIterations: number`, `reforgeRequest?`, `bulkSettings?: BulkSettings` |
| `BulkSimResult` | `:1887` | `baseline?: BulkGearResult`, `topResults: BulkGearResult[]`, `optimizedCandidates`, `stageMetrics: BulkSimStageMetrics[]`, `timings?`, `error?: ErrorOutcome` |
| `BulkGearCandidate` | `:1874` | `index: number`, `gear?: EquipmentSpec` |
| `BulkGearResult` | `:1916` | `candidateIndex: number`, `gear?: EquipmentSpec`, `dpsMetrics?: DistributionMetrics` |
| `BulkSimStageMetrics` | `:1933` | `stage`, `inputGearSets`, `survivors`, `iterations`, … |
| `BulkSettings` | `:1837` | `items: ItemSpec[]`, `iterationsPerCombo`, `useLegacyBulkSim`, `freezeRingSlot`, `freezeTrinketSlot`, `freezeWeaponSlot`, `freezeMainhandWeaponSlots`, `freezeOffhandWeaponSlots` |
| `BulkCombinationCountResult` | `:2016` | `rawCombinations`, `combinations`, `iterations`, `useLegacyBulkSim`, `error?` |
| `BulkCandidatesResult` | `:2054` | `candidates`, `rawCombinations`, `combinations`, `error?` |

Note: `BulkSimCombosRequest` **does not exist** anywhere in the tree; the equivalent is `BulkCombinationCountRequest` (`:2003`).

### Is "use their bulk results, then our own logic in the browser" viable?

**Yes, and it is the natural shape.** `runBulkSim` is public, returns a structured `BulkSimResult` with `topResults[]` carrying `candidateIndex` + `gear` + `dpsMetrics`, and we already own everything downstream. No modification to their files is required.

### Extension points that are not modifications

1. **`Sim.runBulkSim` as a plain public call** (`sim.ts:373`) — the primary one. Zero coupling to their UI.
2. **A second, independently-owned `WorkerPool`.** `WorkerPool`'s constructor takes only a worker count (`worker_pool.ts:48`) — no `Sim`, no URL, no options — so we can construct our own. **We already do this**: `$F/ui/core/components/individual_sim_ui/upgrades/adapters/wasm_sim_runner.ts:89` (`new WorkerPool(numWorkers)`). That is our code, in our subtree. This is the strongest extension point on the table, because it means we can call `runConcurrentBulkSim(request, ourPool, …)` (`wasm/bulk_sim/index.ts:60`) directly with our own pool sizing, bypassing `Sim` entirely.
3. **`getBulkCombinationCount` / `getBulkCandidates`** (`sim.ts:341,357`) — cheap pre-flight without committing to a run.
4. **Exported pure helpers under `wasm/bulk_sim/`** — see Q5.

Not an extension point: `$F/sim/web/main.go` is wowsims' Go code; adding handlers there is a modification and is out of scope per the owner's constraint. It is also **irrelevant to web**, since web never reaches it.

---

## Q3 — Live public site (browser observation)

### URL correction

`https://wowsims.github.io/tbc/` is **the wrong site**. It loads, but shows a banner: *"This sim is outdated and no longer maintained! Use the new sim at wowsims.com instead"* and is described as *"built for the original TBC Classic (2021)"*. I searched its DOM for both "bulk" and "batch" — **zero matches**; it has no batch tab. Its spec list uses flat paths (`/tbc/feral_druid/`).

The live site matching our fork is **`https://www.wowsims.com/tbc/`**, whose GitHub link is `https://github.com/wowsims/tbc-new` — the same upstream we vendor. Its spec paths are nested (`/tbc/druid/feralcat/`). Header reads "Phase 3 (3.2 - Td) - Alpha".

### What I ran

Loaded `https://www.wowsims.com/tbc/druid/feralcat/`, opened the **"Batch (New)"** tab, and clicked **Simulate Batch** at the default smallest state: **1 Combination, 12,500 iterations**. The tab's own copy: *"Batch Simming is a new feature akin to the Top Gear sim on Raidbots.com… This is an Alpha feature, so if you have feedback or find a bug, please report it!"* and a note *"Download the local sim for faster results."*

### Observed behavior

The run progressed through a **"Running baseline round"** phase showing `179 / 12500` then `6972 / 12500` iterations with a live ETA and a `1/2` round counter, then completed and rendered a Results view:

- `2,546.15` — Current Gear
- `2,544.94` — `-1.21 (0.05%)` with an **Equip** button

**No errors, not inert.** Completed in roughly 60 seconds.

### Exact network observations

Every request during the whole session, filtered to what matters:

```
GET  https://www.wowsims.com/tbc/druid/feralcat/            → 200
GET  https://www.wowsims.com/tbc/bundle/…entry.js           → 200
GET  https://www.wowsims.com/tbc/assets/database/db.json    → 200
GET  https://www.wowsims.com/tbc/sim_worker.js              (x4)
GET  https://www.wowsims.com/tbc/reforge_worker.js          (x3)
POST https://www.wowsims.com/cdn-cgi/rum?                   → 204
… static assets (fonts, item_slot jpgs, enchants/descriptions.json)
```

**The only POSTs in the entire log are to `/cdn-cgi/rum?` — Cloudflare Real User Monitoring telemetry, returning 204.** There is no `POST /bulkSimAsync`, no `POST /asyncProgress`, no `POST /raidSim`, no API endpoint of any kind. I re-queried with `urlPattern` `POST|bulk|Sim|api` and it returned **no matches at all** beyond what is listed.

**Verdict: the live web site runs bulk sim entirely in-page. There is no backend.**

### Corroborating check

I fetched the live worker source and searched it:

```js
const r = await fetch('/tbc/sim_worker.js'); const t = await r.text();
→ { len: 15825, hasBulk: false, unsupported: false }
```

The deployed `sim_worker.js` contains **no `bulkSimAsync` string at all** — not even the `"only supported by the HTTP worker"` error text. This independently confirms the bulk RPC is not involved: the work goes through `runConcurrentBulkSim` (`sim.ts:565`), which decomposes into ordinary `raidSimAsync` calls the WASM worker does implement.

---

## Q4 — Worker-count contradiction

**Both reports were right about different moments.** The pool is constructed with 1 and then resized.

### The full chain

- `$F/ui/core/sim.ts:164` — `this.workerPool = new WorkerPool(1);` — starts at **1**.
- `$F/ui/core/sim.ts:165-171` — the resize handler:
  ```ts
  this.wasmConcurrencyChangeEmitter.on(async () => {
      // Prevent using worker concurrency when not running wasm. Local sim has native threading.
      if (await this.workerPool.isWasm()) {
          const nWorker = Math.max(1, Math.min(this.wasmConcurrency, navigator.hardwareConcurrency));
          this.workerPool.setNumWorkers(nWorker);
      }
  });
  ```
- `$F/ui/core/sim.ts:182` — the constructor calls `setWasmConcurrency(...)`, which fires that emitter immediately.
- `$F/ui/core/worker_pool.ts:55,58` — constructor delegates to `setNumWorkers`, which calls `concurrencyPool.resize`.
- `$F/ui/core/concurrent_worker_pool.ts:31-32` — `resize` floors at 1.

### Where the value comes from — and the "4"

`$F/ui/core/sim.ts:173-181`:
```ts
let wasmConcurrencySetting = parseInt(window.localStorage.getItem(WASM_CONCURRENCY_STORAGE_KEY) ?? 'NaN');
if (isNaN(wasmConcurrencySetting)) {
    wasmConcurrencySetting = 0;
    if (navigator.hardwareConcurrency > 1) {
        wasmConcurrencySetting = Math.min(4, Math.floor(navigator.hardwareConcurrency / 2));
    }
}
```

It is backed by **localStorage**, not a proto (`sim.ts:173` read, `sim.ts:1067` write).

**Confirmed live**, which settles the contradiction empirically. On the running site:
```js
{ cores: 20, wasmConc: [["__tbc_new_wasmconcurrency", "4"]] }
```
`min(4, floor(20/2)) = 4` — and the network log shows **exactly 4 fetches of `sim_worker.js`**. The observation and the code agree.

### Can the user change it? Yes.

`$F/ui/core/components/settings_menu.tsx:186-208` — an `EnumPicker`, id `simui-concurrent-workers-picker` (`:193`), i18n label `info.options.use_multiple_cpu_cores.label` (`:194`), offering **Off (0)** plus every integer from 2 up to `navigator.hardwareConcurrency` (`:187-190`). `getValue` → `sim.getWasmConcurrency()` (`:197`); `setValue` → `sim.setWasmConcurrency(...)` (`:205`). Rendered only when `useConcurrentWorkersWrap.value && useConcurrentWorkers.value` (`:186`).

So the `4` at `sim.ts:179` is a **first-run cap, not a hardcode** — the user can raise it to 20 on this machine.

### What the tab actually gets

| Deployment | Pool size | Why |
| --- | --- | --- |
| **Web (WASM)** | `min(wasmConcurrency, hardwareConcurrency)`, default `min(4, floor(cores/2))` → **4** on ≥8-core machines | `sim.ts:167-169,179`; observed live |
| **Local (net_worker/HTTP)** | **1** | `isWasm()` guard at `sim.ts:167` is false, so `setNumWorkers` is never called. Comment at `:166`: "Local sim has native threading." Corroborated by `worker_http.ts:71-72` routing the split/combine RPCs to `noWasmConcurrency`, which errors (`:51-55`) |
| **Our upgrades adapter's own pool** | **4**, independent | `wasm_sim_runner.ts:35` `DEFAULT_WORKER_COUNT = 4`, used at `:89`; doc comment at `:33-34` says it "Matches upstream's own default" |

### The negative claim, measured against alternatives

Places checked that contain **no** 4-hardcode: `worker_pool.ts` (its only `4` is `Array(4)` for request-id hex at `:41`), `concurrent_worker_pool.ts`, `sim_concurrent.ts`, `worker_http.ts`, `net_worker.ts`, `sim_worker.ts`, `worker/types.ts`, and all of `ui/core/wasm/bulk_sim/` (which derives concurrency from `getNumWorkers()` — `index.ts:66`, `stage.ts:275`, `reforge.ts:37`, `batch.ts:91`). The only two `4`s in worker sizing are `sim.ts:179` (a cap) and `wasm_sim_runner.ts:35` (our own file's default).

### What it means for candidate parallelism

Web gets **4 concurrent single-threaded WASM workers by default on a typical machine**, raisable by the user to their core count. Critically, `runConcurrentBulkSim` splits work across `getNumWorkers()`, so **raising the setting scales bulk sim directly** — a real, free lever the plan can expose. Our adapter's separate pool at `wasm_sim_runner.ts:89` currently ignores the user's setting; the planner should decide whether to wire `DEFAULT_WORKER_COUNT` to `sim.getWasmConcurrency()` so the picker governs both.

**Held constant for the "4 vs 1" comparison:** same machine (20 logical cores), same browser, same fork revision. The difference is entirely the `isWasm()` branch at `sim.ts:167`, not machine or configuration.

---

## Q5 — Export check only (no cost measurement)

**Verified: genuinely exported, genuinely pure, importable with no adapter and no bulk routing.**

Definition site — `$F/ui/core/wasm/bulk_sim/statistics.ts:6`, with `export`:

```ts
export const getBulkSimTargetIterations = (targetErrorPct: number, metrics: DistributionMetrics | undefined, candidateCount: number): number => {
    if (!metrics || metrics.avg <= 0) return 0;
    const targetError = metrics.avg * (targetErrorPct / 100);
    if (targetError <= 0) return 0;
    const combinationMultiplier = bulkSimCombinationErrorMultiplier(candidateCount);
    return Math.ceil(Math.pow((metrics.stdev * combinationMultiplier) / targetError, 2));
};
```

Its helper is **not** exported — `statistics.ts:67-68`:
```ts
const bulkSimCombinationErrorMultiplier = (candidateCount: number): number =>
    Math.sqrt(Math.max(1, Math.log10(Math.max(candidateCount, BULK_SIM_COMBINATION_LOG_MIN))));
```

### Purity

The function touches only its arguments, numeric constants, and that helper. No worker, no `WorkerPool`, no bulk routing, no I/O, no globals. File imports (`statistics.ts:1-4`): `DistributionMetrics` from `'../../proto/api'` (**type only**), three numeric constants from `'./constants'` (`constants.ts` is 18 lines of literals with **no imports**), plus `getBulkSimStageMaxSurvivors` from `'./stage'` and types from `'./types'`.

### Import path that resolves

**No path alias exists.** Checked both config files: `$F/tsconfig.json` has `moduleResolution: "bundler"` (`:5`) and `allowImportingTsExtensions: true` (`:11`) but **no `baseUrl` and no `paths`**; `$F/vite.config.mts` (185 lines) has **no `resolve` block and no `alias` key** — it sets only `root: BASE_PATH` (`:100`) and `base: '/tbc/'` (`:99`). So the import is relative.

From a file directly in `.../individual_sim_ui/upgrades/`:
```ts
import { getBulkSimTargetIterations } from '../../../wasm/bulk_sim/statistics';
```
From `upgrades/adapters/`, one level deeper:
```ts
import { getBulkSimTargetIterations } from '../../../../wasm/bulk_sim/statistics';
```
This matches existing convention in that directory — `wasm_sim_runner.ts:26-30` reaches `ui/core` with exactly `'../../../../proto/api.js'`, `'../../../../worker_pool.js'`. Those neighbours use an explicit `.js` extension; `statistics.ts`'s own siblings omit it (`stage.ts:18` uses `'./statistics'`). Either resolves under `"bundler"`; the `.js` form is what `adapters/` uses consistently.

### Caveat the planner must weigh

`statistics.ts` has an **import cycle** with `stage.ts`: `statistics.ts:3` imports `getBulkSimStageMaxSurvivors` from `'./stage'`, and `stage.ts:18` imports four symbols back. `stage.ts` **does** depend on worker code — it takes a `WorkerPool` parameter at `:105,:132,:184,:266` and calls `workerPool.getNumWorkers()` at `:275`. So the *function* is pure, but *importing it drags `stage.ts` and its `WorkerPool` import into the module graph*. That is a bundling/coupling consideration, not a behavioural one — but it defeats the "no bulk routing" phrasing at the module level, and it matters if the intent was to reuse this in a context that should not know about workers.

Cost measurement deliberately **not** done — that is the local seat's job.

---

## Open / untested

1. **`untested`** — Whether the WASM path degrades correctly when `wasmConcurrency` is set to **Off (0)** or 1. By the code, `shouldUseWasmConcurrency()` (`sim.ts:241`) returns false, falling through to `sim.ts:589` `workerPool.bulkSimAsync`, which on WASM hits the stub (`sim_worker.ts:15-18`) and returns an empty array. **This looks like a real failure mode a user can trigger from the settings picker**, but I did not run it. Worth a plan step and possibly a ticket.
2. **`untested`** — Behavior at candidate counts above the 20-row `MinSurvivors` threshold on the **web/TS** tournament. All the 20-row and small-run findings in the handoff were measured against the **Go** implementation via the harness. The TS `wasm/bulk_sim/` code is a separate implementation; whether its culling matches Go's is **not established**. This is exactly the mismatched-comparison trap the handoff warns about — do not carry the Go 20-row numbers onto the web path without re-measuring.
3. **`untested`** — Whether `runConcurrentBulkSim` (`wasm/bulk_sim/index.ts:60`) can be called directly with our own `WorkerPool` from `wasm_sim_runner.ts`. It is exported and takes the pool as a parameter, so it appears callable, but I did not compile or run it.
4. **Open** — Our adapter's `DEFAULT_WORKER_COUNT = 4` (`wasm_sim_runner.ts:35`) is not wired to `sim.getWasmConcurrency()`. Deliberate or oversight? A planner decision, not a research finding.
5. **Open** — The live site labels Batch as **Alpha** and prompts users to download the local sim for speed. Upstream may change this path. The owner's standing instruction (use what exists on web now + leave a comment to switch when WASM batch is implemented upstream) should probably be reworded, since **WASM batch sim already is implemented** — just via `runConcurrentBulkSim` rather than the `bulkSimAsync` RPC. The comment should point at the RPC stub, not at "batch sim is missing on web".
6. **Not measured** (local seat's job) — adaptive-iterations cost at 0.2% target vs flat 3,000/5,000.
7. **Note on Q3 method** — I observed one spec (Feral Cat) at one combination count. I did not vary spec or candidate count, so the "no backend" finding is strictly about *this deployment's transport*, which is a per-site property and does not vary by spec. Held constant: same tab, same session, one page load.
