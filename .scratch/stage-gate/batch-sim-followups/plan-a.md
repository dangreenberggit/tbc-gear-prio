# Plan — batch-sim-followups-track-a (tickets 347 + 349) — v2

Repo root `$R` = `C:\Users\dgree\Code\lulz\tbc-gear-prio`. Fork `$F` = `$R\vendor\tbc-new-fork` (separate git repo, gitignored). `$U` = `$F\ui\core\components\individual_sim_ui\upgrades`. Base: outer `4d5bcbc`, fork `20dbb6f5d`, both trees clean.

(v1 superseded; see plan-a-review.md round 1. Orchestrator note: the planner corrected itself mid-text in Step 5 — `BulkScreenIntegrityError` must live in `engine/seams/sim-runner.ts` (the engine may not import from `adapters/`); Step 2 and the Paths manifest are to be read with that correction, as the manifest already states.)

## Revision notes (F1–F10)

| Finding | Disposition |
| --- | --- |
| F1 (blocking) | Fixed. The driver classifies on its own `userAborted` flag, set only by the `AbortSignal` listener or the pre-entry check, never on `SimSignals.isTriggered()`. `SimSignals` are re-registered **per chunk** and the listener triggers the in-flight chunk's signals; upstream's `batch.ts:132-134` candidate-error trigger therefore poisons only its own chunk, which is exactly the chunk that failed. Defended in Approach; new C25. |
| F2 (material) | Fixed. Step 3 now carries real, nested `try/finally` control flow with the listener removed on every exit path. |
| F3 (material) | Fixed. `bulkScreenResultFrom` throws a new `BulkScreenIntegrityError` for the row-shortfall and missing-baseline checks; the driver rethrows that class and the guard's error unconditionally. Only engine-reported `result.error` and dispatch rejections (transport) degrade to the loop. New C26. |
| F4 (material) | Fixed. First multi-stage `n` floors at **27** (≥ 28,001 iterations); 25 and 26 are single-stage at every count. Corrected in Steps 5, 6 and the Approach. |
| F5 (material) | Fixed. Header states both: at n ≤ 25 no pre-High stage runs (`high×(n+1) ≥ high×n`); at n = 26 Medium runs and single-stage follows from `1000×27 + high×26 ≥ high×26`. |
| F6 (material) | Stated and justified in Approach (completed-chunk rows are discarded on Stop; the alternative and why it loses). New C27. |
| F7 (minor) | Step 12(b) now also flips review row S3 (`wontfix` on the duplicated loop) to `fixed — superseded by the shared driver`. |
| F8 (minor) | Boundary test (3) (`MAX === Medium.maxSurvivors`) dropped; the table and the guard tests remain. |
| F9 (minor) | Step 12(a) asserts the gate **ran** (its output says ran, not skipped) after checking `dist/tbc/lib.wasm` exists; C19 corrected to "engine/**/*.ts globbed". |
| F10 (minor) | Option-2 rationale registered as C28. The `signal?.aborted` co-classifier in `rank.ts` is dropped — the driver already maps any error during a user abort to `BulkScreenAbortedError`, so `rank.ts` classifies on the class alone. |

## Goal

When this plan is done: pressing Stop during the bulk screening pass aborts the in-flight chunk on both transports (Go/HTTP and the in-browser WASM tournament) within seconds, issues no further bulk request, and the tab lands in its `stopped` state with a `PartialRanking`; a chunk whose bulk request fails for an engine or transport reason no longer fails the whole screening pass but degrades to per-candidate simming for that chunk's candidates, disclosed on the `Ranking` and in the tab's console log, while an integrity failure (row shortfall, no baseline — ticket 349's guard) still surfaces as an error; every screening chunk is checked in code, against upstream's own `shouldUseLegacyBulkSim` on the actual built request, to be inside the single-stage (no-cull) regime for the caller's iteration count, with a test that shows the guard firing; ticket 349's premise ("a high enough iteration count pushes the boundary below 25") is corrected in the ticket and the code comments with a measured table; both tickets are closed; `pnpm verify`, the fork type-check and the layout gate are green.

## Approach

**347 — Option 1 (bridge the caller's `AbortSignal` through the seam), implemented once in a shared chunk driver both runners call.** `BulkScreenRequest` gains `signal?: AbortSignal`. A new `adapters/bulk_screen_driver.ts` owns the chunk loop for both transports. Two facts shape it. First, the old pre-dispatch check was dead because each chunk's `SimSignals` was manufactured inside the loop with nothing able to reach it (ticket 347 Correction, C2) — so the cancel source must outlive the chunk. Second, upstream itself triggers the chunk's `SimSignals` on any candidate error (`batch.ts:132-134`, C25) to stop the rest of that batch, which means `signals.abort.isTriggered()` cannot distinguish "user pressed Stop" from "one candidate panicked". The driver therefore keeps its own `userAborted` boolean, set only by the `AbortSignal` listener or by `signal.aborted` at entry; it registers a **fresh `SimSignals` per chunk** (so upstream's error-trigger on chunk k cannot poison chunk k+1) and the listener triggers whichever chunk's signals are in flight. Classification after a chunk error is on `userAborted`, never on the signal. A pass-level single signal (v1) was rejected precisely because of C25: one candidate error would have read as a Stop and thrown away the rest of the pass.

The in-flight abort itself rides on machinery upstream already has: `worker_pool.ts:214-216` subscribes each request to `signals.abort` and calls `sendAbortById`; the Go server's `/abortById` calls `simsignals.AbortById`; the raid sim checks the flag every iteration (`sim.go:327`) (C4). The runners shrink to a constructor plus a one-line `dispatch(request, signals)`, so identical behaviour on both transports is a property of the code shape.

The measured evidence that decides against Option 3 (accept-and-disclose): exposure is one chunk's wall time, **7.4–12.7 s on HTTP (n=21–32) and 332 s on WASM (n=25)** (C7, C8). 332 s is not a latency any Stop contract can honestly call "finish in-flight work", and the two transports must not differ, so disclosure is out even though WASM bulk is default-off today. Option 2 (tab owns the runners' `SimSignalManager`s) loses because the WASM runner is constructed inside `makeSimRunner` and the HTTP one inside the tab's `simRunner()` (C5), so the tab would have to reach into two adapters' private managers and call `abortType` — a second cancel concept beside the `AbortController` it already holds, and exactly the tab-to-adapter coupling the seam exists to prevent (C28).

**Rider (chunk failure) — degrade to the loop for engine/transport failures, surface integrity failures.** Three error kinds leave a chunk: (i) the engine reports `result.error` (a candidate panic collapses into this, `index.ts:121-122`, C12) or the dispatch rejects (HTTP status, worker death) — the driver records `{ indices, reason }` and continues; those candidates carry no row, and `rank.ts` already falls through to `deps.sim.run` for a candidate without a screened row (C11), where a genuinely bad candidate becomes the loop's `candidateSkips` "sim" row, named. (ii) `bulkScreenResultFrom` finds a row shortfall or no baseline — a structural wrongness ticket 349's guard exists to catch — now typed `BulkScreenIntegrityError` and rethrown by the driver, never degraded (C26). (iii) The single-stage guard throws — a programming error, thrown outside the try. A user abort during any of these is classified first and becomes `BulkScreenAbortedError`. A pass where every chunk failed for kind (i) throws a plain Error listing the reasons; `rank.ts` catches non-abort, non-integrity errors from `runBulkScreen`, records a fallback for the whole attempt set, and runs the loop. Fallbacks surface as `Ranking.screeningFallbacks` (present only when non-empty, so route-equivalence tests stay byte-identical) and as a `console.warn` line in the tab. Naming the failing candidate instead was rejected: a bulk error does not identify it (C12), and for a ≤25-candidate pool one bad candidate would deny the user 24 rows the loop produces.

**Stop discards completed-chunk rows (F6).** On abort the driver throws; the screening numbers from chunks that had finished are dropped. Justification: `rank.ts` dispatches no candidate when `signal.aborted` (C9), and screening supplies *only* DPS numbers — every row is composed by the loop's `runCandidate`, which also calls `deps.sim.run` for attempts screening never priced (a second slot of a multi-slot item, or an attempt that hit a repair skip). Running the loop after Stop to "land the paid-for rows" would therefore issue new sims, which §5.1.4 forbids. The cost of discarding is bounded: at most the finished chunks are re-screened on the next run (≤ 12.7 s each on HTTP, C7), and per-candidate cache rows are unaffected. Caching screened observations at the driver level was rejected because the `screen:` cache key is per composed request and is only known inside the loop (`cacheScreenResult`, `rank.ts:971`) (C27).

**349 — assert the coupling in code using upstream's own estimator, and correct the premise.** Upstream's `shouldUseLegacyBulkSim` was executed under Node for twelve iteration counts (C13): the first multi-stage `n` falls from 40 (3,000) to 33 (5,000) to 28 (15,000–28,000) and then **floors at 27 for every count ≥ 28,001, including 1,000,000**; `n = 25` and `n = 26` are single-stage at every count. Two mechanisms, both identical on the Go side (C15): at `n ≤ 25` no pre-High stage runs (Medium requires `candidateCount > maxSurvivors = 25`, `stage.ts:69-76`; Low requires > 100), so the estimate is `high×(n+1) ≥ high×n`, true for any `high`; at `n = 26` Medium runs and the comparison is `1000×27 + high×26 ≥ high×26`, again true for any `high` (C14). So the shipped 25 is iteration-invariant by construction — the ticket's feared failure cannot happen at 25 — but nothing says so, and a future 27 would fail silently above 28,000 iterations. Hence the ticket's Option 1: a per-chunk guard calling upstream's function on the actual built request. A transcribed formula is rejected (borrow upstream, don't mirror). Option 2 (process obligation only) is rejected because the failure is silent.

## Claims register

| ID | Claim | Load-bearing | Verified by |
| --- | --- | --- | --- |
| C1 | Stop's handler only calls `this.abortController?.abort()`; the signal reaches `rankUpgrades` as `deps.signal` and nothing else. | yes | `grep -n "abortController" $U/../upgrades_tab.tsx` → lines 474, 941-942, 1200, 1253, 1275 |
| C2 | Both bulk runners create a fresh `SimSignals` per chunk inside the loop and nothing outside can trigger it; no `abortType` call exists in `$U`. | yes | `grep -rn "registerRunning\|abortType" $U/adapters/` → `bulk_http_sim_runner.ts:71`, `bulk_wasm_sim_runner.ts:123`, zero `abortType` |
| C3 | `TriggerSignal.trigger()` is once-only; `onTrigger` fires immediately if already triggered. | yes | `sed -n 9,38p $F/ui/core/sim_signal_manager.ts` (13-16, 30-32) |
| C4 | `doAsyncRequest` subscribes to `signals.abort` and calls `sendAbortById(id)`; Go `/abortById` → `simsignals.AbortById(requestId)`; the bulk run is registered under `request.requestId`; the raid sim checks abort every iteration. | yes | `sed -n 208,217p $F/ui/core/worker_pool.ts`; `sed -n 122,125p $F/sim/web/main.go`; `sed -n 53,56p $F/sim/core/bulk/bulk_sim.go`; `sed -n 326,329p $F/sim/core/sim.go` |
| C5 | WASM bulk runner is built inside `makeSimRunner` (`bulk_wasm_sim_runner.ts:187-204`), HTTP one inside `simRunner()` (`upgrades_tab.tsx:1157-1167`); the tab calls `makeSimRunner()` with bulk off (`:464`). | yes | `sed -n 187,204p $U/adapters/bulk_wasm_sim_runner.ts`; `sed -n 464p $U/../upgrades_tab.tsx`; `sed -n 1157,1167p $U/../upgrades_tab.tsx` |
| C6 | On abort both engines return `error.type = ErrorOutcomeAborted` (`index.ts:115`; `bulk_sim.go:125-127`), which `bulkScreenResultFrom` throws on (`:37-39`); the Go server logs `[Bulk Sim] Cancelled` (`bulk_sim.go:58-60`). | yes | `sed -n 115p $F/ui/core/wasm/bulk_sim/index.ts`; `sed -n 56,60p $F/sim/core/bulk/bulk_sim.go`; `sed -n 36,39p $U/adapters/bulk_wasm_sim_runner.ts` |
| C7 | HTTP chunk wall time at 5,000 iterations: 7.39 s (n=21), 9.35 s (n=25), 12.71 s (n=32). | yes | `sed -n 46,57p $R/.scratch/carry-forward/issues/347-stop-does-not-cancel-bulk-screening.md` |
| C8 | WASM chunk wall time: 332 s for n=25 at pool 4. | yes | `grep -n "332" $R/.scratch/stage-gate/batch-sim-web-local/execution-ledger-web.md` |
| C9 | `rank.ts` skips screening and dispatches nothing when `signal.aborted` (`:1149-1152`) and returns a `PartialRanking` when `aborted` (`:1182`); a throw from `runBulkScreen` currently propagates to the tab's `error` state (`upgrades_tab.tsx:919-922`). | yes | `sed -n 1149,1152p $U/engine/rank.ts`; `sed -n 1182p $U/engine/rank.ts`; `sed -n 919,922p $U/../upgrades_tab.tsx` |
| C10 | The TS tournament checks `signals.abort.isTriggered()` before each candidate sim (`batch.ts:58,102`) and each stage (`index.ts:115`). | no | `grep -n "isTriggered" $F/ui/core/wasm/bulk_sim/batch.ts $F/ui/core/wasm/bulk_sim/index.ts` |
| C11 | A candidate with no screened row falls through `readCachedScreen` → `readCachedSim` → `deps.sim.run`; a `run` throw becomes a `candidateSkips` "sim" row naming the item. | yes | `sed -n 966,1003p $U/engine/rank.ts` |
| C12 | One rejected candidate fails its whole chunk's request (`index.ts:121-122`). | yes | `sed -n 121,122p $F/ui/core/wasm/bulk_sim/index.ts` |
| C13 | Upstream's `shouldUseLegacyBulkSim` under Node: first multi-stage n = 40 @3,000; 33 @5,000; 31 @7,500; 30 @10,000; 28 @15,000/20,000/28,000; 27 @28,001/30,000/50,000/100,000/1,000,000. `n=25` and `n=26` single-stage at all twelve counts; `n=27` flips at 28,001. | yes | Measured 2026-09-02 by a temporary vitest file (since deleted); re-runnable as Step 6's `npx vitest run packages/core/test/bulk-boundary.test.ts` |
| C14 | Structural reason: Medium runs only when `candidateCount > 25`, Low only above 100 (`stage.ts:69-76`); with no pre-High stage the estimate is `high×(n+1) ≥ high×n`; at n=26 it is `1000×27 + high×26 ≥ high×26` (`estimate.ts:26-32`). | yes | `sed -n 21,43p $F/ui/core/wasm/bulk_sim/stage.ts`; `sed -n 69,83p $F/ui/core/wasm/bulk_sim/stage.ts`; `sed -n 5,33p $F/ui/core/wasm/bulk_sim/estimate.ts` |
| C15 | Go's estimator and stage table are the same formula and constants (minCombinations 20; Medium 1000/25; Low 100/100; scale refs 1000/100). | yes | `sed -n 7,38p $F/sim/core/bulk/estimate.go`; `sed -n 24,47p $F/sim/core/bulk/stage.go`; `sed -n 13p $F/sim/core/bulk/bulk_sim.go`; `sed -n 20,21p $F/sim/core/bulk/bulk_sim.go`; both engines measured flipping 32/33 at 5,000: `grep -n "32/33" $R/.scratch/stage-gate/batch-sim-web-local/execution-ledger-local.md` |
| C16 | `buildBulkSimRequest` sets `highStageIterations: req.iterations` and `topResults: candidates.length`. | yes | `sed -n 67,78p $U/adapters/bulk_request_builder.ts` |
| C17 | The fork harness loads `wasm/bulk_sim/estimate.ts` and `proto/api.ts` under vitest after `loadForkEngineEnvironment()`. | yes | Same measurement as C13 (the probe imported both through `packages/core/test/fork-engine-harness.ts`) |
| C18 | `rank.ts` and `seams/sim-runner.ts` have PROVENANCE rows (160, 164); `bulk/partition.ts` and `adapters/` do not; `pnpm verify` runs `engine-port-drift:check`. | yes | `grep -n "rank.ts\|seams/sim-runner.ts\|partition" $U/engine/PROVENANCE.md`; `grep -n "engine-port-drift" $R/package.json` |
| C19 | The layout gate's digest globs `upgrades/engine/**/*.ts` (so `rank.ts`, `seams/sim-runner.ts`, `bulk/partition.ts` move it; `adapters/` do not), runs headless on the WASM loop with a 120 s / 5-row run phase over its own `http-server` on a rebuilt `$F/dist`, and **skips silently** when `dist/tbc/lib.wasm` is absent. | yes | `sed -n 155,162p $R/scripts/check_layout_gate.py`; `sed -n 46,58p $R/scripts/check_layout_gate.py`; `sed -n 474,488p $F/test-layout.mjs` |
| C20 | E-W3 parity compares ranked deltas and composed requests; a field present only when non-empty changes neither. | yes | `sed -n 1,40p $R/packages/core/test/wowsims-fork-parity.test.ts`; Step 9 runs it |
| C21 | Post-fix cancel latency, Stop click → `stopped`: HTTP ≤ 3 s; WASM ≤ 5 s. | no | hypothesis, untested — Steps 10-11 measure; reasoning: per-iteration abort check (C4), HTTP poll every 500 ms (`worker_http.ts:46`) |
| C22 | Review rows deferring to 347 (P5; A3/P4 note), 349 (D5), and S3 (`wontfix` on the duplicated loop); `merge-ready` requires a closed ticket's defer rows changed to `fixed`. | yes | `grep -n "^| A3/P4\|^| D5\|^| S3\|^| P5" $R/docs/reviews/feat-upgrades-tab-batch-sim.md` → 132, 138, 141, 144; `sed -n 78,87p $R/docs/agents/known-traps.md` |
| C23 | Ticket 339 is closed (base raised to 5,000; adaptive not adopted). | no | `sed -n 1p $R/.scratch/carry-forward/issues/339-adaptive-iterations-and-base-iteration-count.md` |
| C24 | The contract sentence to amend is `candidate-pool.md:359`. | no | `sed -n 359p $R/docs/plans/wowsims-tab/candidate-pool.md` |
| C25 | Upstream triggers the chunk's own `SimSignals` on any candidate error, so `isTriggered()` cannot tell a Stop from a candidate failure. | yes | `sed -n 132,134p $F/ui/core/wasm/bulk_sim/batch.ts` → `if (candidateResult.error) { signals.abort.trigger(); }` |
| C26 | `bulkScreenResultFrom` has three throw sites: `result.error` (`:37-39`, engine-reported), no baseline (`:42-44`), row shortfall (`:46-51`); the last two are the integrity checks. | yes | `sed -n 36,51p $U/adapters/bulk_wasm_sim_runner.ts` |
| C27 | Screened observations are cached only inside the loop per composed request (`cacheScreenResult` at `rank.ts:971`), so the driver cannot cache a finished chunk's rows itself. | no | `sed -n 966,974p $U/engine/rank.ts` |
| C28 | Option 2 would need the tab to hold both runners' private `bulkSignals` managers and call `abortType`, which is a second cancel concept beside `abortController`. | yes | `grep -n "private readonly bulkSignals" $U/adapters/bulk_wasm_sim_runner.ts $U/adapters/bulk_http_sim_runner.ts` (both `private`); C1, C5 |

## Steps

Single executor, sequential. Node v22 in every shell (`node --version`; PATH pin in `docs/agents/known-traps.md` § Before running node). Edit with the harness Edit tool (CRLF trap). Fork type-check: `node $F/node_modules/typescript/bin/tsc --noEmit -p $F/tsconfig.json`.

**Step 1 — Seam.** `$U/engine/seams/sim-runner.ts`: add `signal?: AbortSignal` to `BulkScreenRequest` (doc: "the caller's Stop; a runner aborts the in-flight chunk and issues no further chunk"); add `failures?: ReadonlyArray<{ indices: readonly number[]; reason: string }>` to `BulkScreenResult` (doc: "chunks whose request failed for an engine or transport reason; their candidates carry no row and the caller sims them itself"); add `export class BulkScreenAbortedError extends Error` (`name = 'BulkScreenAbortedError'`, message "bulk screen aborted by the caller's signal") **and `export class BulkScreenIntegrityError extends Error`** (per the Step 5 correction: both error classes live in the seam so the engine never imports from `adapters/`). `RecordedSimRunner` unchanged. Acceptance: fork type-check exit 0. Depends on C18.

**Step 2 — Guard (349) and integrity throws.** `$U/adapters/bulk_request_builder.ts`: add `export function assertSingleStageChunk(request: BulkSimRequest, candidateCount: number): void`, importing `shouldUseLegacyBulkSim` from `../../../../wasm/bulk_sim/estimate.js`; throws `Error("bulk chunk of <n> candidates at <highStageIterations> iterations would take the multi-stage (culling) path; keep MAX_CANDIDATES_PER_BULK_REQUEST <= 26 — see engine/bulk/partition.ts")` on `false`. Doc: why upstream's function, why it runs client-side for the Go transport too (C15). `$U/adapters/bulk_wasm_sim_runner.ts`: import `BulkScreenIntegrityError` from the seam and make the no-baseline and row-shortfall throws (`:42-51`) use it; the `result.error` throw (`:37-39`) stays a plain Error (engine-reported → degradable). Acceptance: fork type-check exit 0; Step 6 tests. Depends on C14-C16, C26.

**Step 3 — Shared chunk driver.** New `$U/adapters/bulk_screen_driver.ts`:

```ts
export async function runBulkScreenChunks(
  req: BulkScreenRequest,
  deps: { signals: SimSignalManager; simVersion: string;
          dispatch: (request: BulkSimRequest, signals: SimSignals) => Promise<BulkSimResult> },
): Promise<BulkScreenResult> {
  const chunks = partitionForBulkScreen(req.candidates, MAX_CANDIDATES_PER_BULK_REQUEST);
  let userAborted = req.signal?.aborted ?? false;   // the ONLY cancel classifier (C25)
  let inFlight: SimSignals | undefined;
  const onAbort = () => { userAborted = true; void inFlight?.abort.trigger(); };
  req.signal?.addEventListener('abort', onAbort, { once: true });
  const rows = [], failures = []; let baseline;
  try {
    for (const chunk of chunks) {
      if (userAborted) break;
      const request = buildBulkSimRequest({ ...req, candidates: chunk });
      assertSingleStageChunk(request, chunk.length);          // outside the inner try: never degraded
      const signals = deps.signals.registerRunning(RequestTypes.BulkSim);   // fresh per chunk (C25)
      inFlight = signals;
      try {
        const mapped = bulkScreenResultFrom(await deps.dispatch(request, signals), chunk.length, deps.simVersion);
        baseline ??= mapped.baseline; rows.push(...mapped.rows);
      } catch (err) {
        if (userAborted) throw new BulkScreenAbortedError();
        if (err instanceof BulkScreenIntegrityError) throw err;   // 349's guard surfaces (C26)
        failures.push({ indices: chunk.map(c => c.index), reason: messageOf(err) });
      } finally {
        inFlight = undefined; deps.signals.unregisterRunning(signals);
      }
    }
    if (userAborted) throw new BulkScreenAbortedError();
    if (baseline === undefined) throw new Error(`bulk screen: every chunk failed — ${failures.map(f => f.reason).join('; ')}`);
    return { baseline, rows, ...(failures.length ? { failures } : {}) };
  } finally {
    req.signal?.removeEventListener('abort', onAbort);
  }
}
```
The listener does not await `trigger()` (it fans out `sendAbortById` round trips, C4). Comments: why the flag and not the signal (C25); why per-chunk signals; why the guard sits outside the inner try; why integrity errors are rethrown. Acceptance: fork type-check exit 0; Step 7 tests green. Depends on C3, C4, C6, C10, C12, C25, C26.

**Step 4 — Runners become thin.** `bulk_wasm_sim_runner.ts`: `runBulkScreen(req)` = `runBulkScreenChunks(req, { signals: this.bulkSignals, simVersion: await this.version(), dispatch: (request, signals) => runConcurrentBulkSim(request, this.bulkPool, () => {}, signals) })`; keep `bulkScreenResultFrom`, `bulkPoolSizeFrom`, `makeSimRunner` and headers; drop the unused partition import; keep the "TS tournament, not the stub RPC" comment on the dispatch line. `bulk_http_sim_runner.ts`: same with `dispatch: (request, signals) => this.bulkPool.bulkSimAsync(request, () => {}, signals)`; delete lines 64-70 (describes the removed structure); move the 204-eviction paragraph (92-102) to the dispatch line; replace the bound paragraph (74-90) with a two-line pointer to `partition.ts`. Acceptance: `grep -c "registerRunning" <both>` → 0, 0; `grep -c "runBulkScreenChunks" <both>` → 1, 1; fork type-check exit 0. Depends on C2, C5.

**Step 5 — `rank.ts`.** (a) `screenCandidates` passes `signal: deps.signal` (`:873-883`) and wraps the call: `catch (err) { if (err instanceof BulkScreenAbortedError) return undefined; if (err instanceof BulkScreenIntegrityError) throw err; screeningFallbacks.push({ candidates: attempts.length, reason }); return undefined; }` — both classes imported from the seam (`seams/sim-runner.ts`), never from `adapters/`. After a successful call, push each `result.failures` entry as `{ candidates: indices.length, reason }`. (b) `const screeningFallbacks: { candidates: number; reason: string }[] = []` beside `candidateSkips` (`:695`). (c) `Ranking.screeningFallbacks?: readonly { candidates: number; reason: string }[]` (doc: absent when none, so route-equivalent runs stay byte-identical); both return sites spread `...(screeningFallbacks.length ? { screeningFallbacks } : {})`. (d) Comments: `Deps.signal` (`:178-181`) → "in-flight per-candidate sims finish; an in-flight bulk screening chunk is aborted (ticket 347); nothing further is dispatched"; `:1147-1148` → "a runner's abort surfaces as `BulkScreenAbortedError` and is treated like an abort observed before the pass"; `DEFAULT_ITERATIONS` (`:377-379`) → "moves DOWN as iterations rise but 25 and 26 stay single-stage at every count and the first multi-stage n floors at 27 above 28,000 (upstream's estimator, measured in `packages/core/test/bulk-boundary.test.ts`); `assertSingleStageChunk` checks every chunk regardless". Acceptance: fork type-check exit 0; Steps 7-8 green; `npx vitest run packages/core/test/bulk-screen-branch.test.ts` green. Depends on C9, C11, C13, C20.

**Step 6 — `partition.ts` header and boundary test.** (a) `partition.ts:15-47` header: keep the corrected gate description; replace the iteration paragraph with the C13 table and both mechanisms (F5): "at n ≤ 25 no pre-High stage runs, so the estimate is `high×(n+1) ≥ high×n` for any `high`; at n = 26 Medium runs and the comparison is `1000×27 + high×26 ≥ high×26`, again always true; n = 27 flips at 28,001 iterations. 25 is therefore inside at any count; `adapters/bulk_request_builder.ts`'s `assertSingleStageChunk` checks each built request against upstream's estimator so a raised constant fails loudly." (b) New `$R/packages/core/test/bulk-boundary.test.ts` (fork-present skip; `loadForkEngineEnvironment()` then `pathToFileURL` imports of `estimate.ts`, `proto/api.ts`, `partition.ts`, `bulk_request_builder.ts`, as in `bulk-screen-http-fixture.test.ts:36-37`): (1) for each of the twelve counts, the first `n` in 20..120 returning `false` equals C13's value; (2) `shouldUseLegacyBulkSim(create({ highStageIterations: 1_000_000 }), MAX_CANDIDATES_PER_BULK_REQUEST) === true`; (3) `assertSingleStageChunk` throws for (27 candidates, 30,000) with "multi-stage" in the message and does not throw for (25, 1,000,000) or (26, 1,000,000). (c) `bulk-partition.test.ts:41-43`: replace the stale "Go engages Medium at 26" comment with a pointer to `bulk-boundary.test.ts`. Acceptance: `npx vitest run packages/core/test/bulk-boundary.test.ts packages/core/test/bulk-partition.test.ts` exit 0, 3 new tests **passing, not skipped**. Depends on C13-C17.

**Step 7 — Driver tests.** New `$R/packages/core/test/bulk-screen-driver.test.ts` (fork-present skip; harness import of the driver, `sim_signal_manager.ts`, `proto/api.ts`). Fake `dispatch` returns a minimal `BulkSimResult.create` (baseline `dpsMetrics`, `topResults` with `candidateIndex` + `dpsMetrics` per candidate, one `stageMetrics`). Cases: (1) 60 candidates → 3 dispatches (25/25/10), rows for all 60, `failures` absent, each request has `highStageIterations === req.iterations` and `topResults === chunk.length`; (2) abort before entry → 0 dispatches, rejects `BulkScreenAbortedError`; (3) abort mid-chunk: dispatch #1 calls `controller.abort()` then resolves normally → no dispatch #2, rejects `BulkScreenAbortedError`, and dispatch #1's `signals.abort.isTriggered()` is true after the abort; (4) dispatch #1 triggers its own `signals.abort` (mimicking `batch.ts:132-134`) and rejects → dispatch #2 and #3 still run with **untriggered** signals, rows for chunks 2-3, one `failures` entry with chunk 1's indices, baseline from chunk 2 (this is F1's regression test); (5) dispatch #2 rejects with `new BulkScreenIntegrityError('row shortfall')` → rejects with that same error, no dispatch #3; (6) all dispatches reject → rejects with a plain Error containing every reason. Acceptance: `npx vitest run packages/core/test/bulk-screen-driver.test.ts` exit 0, 6 passing. Depends on C3, C6, C12, C25, C26.

**Step 8 — Seam-level tests through `rankUpgrades`.** New `$R/packages/core/test/bulk-screen-fallback.test.ts` reusing `bulk-screen-branch.test.ts`'s fixture builders (extract to `packages/core/test/bulk-screen-fixture.ts` if it avoids duplication). Cases: (1) `runBulkScreen` rejects `new Error("boom")` → `items` deep-equal the no-bulk route's, `screeningFallbacks` = `[{ candidates: <attempts>, reason: "boom" }]`, `run` called once per attempt (count via a wrapping runner); (2) rows for the first half, `failures` for the rest → items equal the no-bulk route's, `screeningFallbacks[0].candidates` = omitted count, `run` called exactly for omitted attempts plus baseline/replication; (3) `runBulkScreen` rejects `new BulkScreenIntegrityError('x')` → `rankUpgrades` rejects with it; (4) `runBulkScreen` calls `controller.abort()` then rejects `BulkScreenAbortedError` → `complete === false`, every item `simmed === false`, zero candidate `run` calls after the baseline, no `ranking:` store row, `screeningFallbacks` absent; (5) existing `bulk-screen-branch.test.ts` unchanged and green. Acceptance: `npx vitest run packages/core/test/bulk-screen-fallback.test.ts packages/core/test/bulk-screen-branch.test.ts` exit 0. Depends on C9, C11, C20, C26.

**Step 9 — Tab, contract sentence, PROVENANCE cycle, fork commit, re-pin.** (a) `upgrades_tab.tsx`: after `runAssumptions = ranking.assumptions` (`:1272`), `for (const f of ranking.screeningFallbacks ?? []) console.warn(\`[upgrades] screening fell back to per-candidate sims for ${f.candidates} candidates: ${f.reason}\`)`; amend the Stop comment (`:938-940`) to "finish in-flight per-candidate sims, abort an in-flight screening chunk, dispatch nothing new". (b) `candidate-pool.md:359`: append "Since ticket 347, an in-flight **bulk screening chunk** is aborted rather than finished (both transports), and its finished sibling chunks' numbers are discarded — see the ticket's resolution; in-flight per-candidate sims still finish." (c) PROVENANCE cycle per `known-traps.md` § ported engine file: parity test green → update sha256 + adaptation text for `rank.ts` (signal threaded; `BulkScreenAbortedError` = abort; engine/transport chunk failures degrade and are disclosed as `screeningFallbacks`; integrity errors surface) and `seams/sim-runner.ts` (`signal`, `failures`, the two error classes) → fork commit (subject ≤ 50 chars, imperative; body says why) → `data/wowsims-fork.lock.json` `commit` = new tip → `pnpm sim-implemented-effects:generate` → `pnpm verify`. Acceptance: `git -C $F status --porcelain` empty; `git -C $F log -1 --format=%H` equals the lock's `commit`; `pnpm verify` exit 0. Depends on C18, C20, C24.

**Step 10 — Live cancel on HTTP, and the 349 Go-side arm.** Server: `wowsims-backend` launch entry (port exactly 3333; stop a stray `wowsimtbc.exe` first). Page `http://localhost:3333/tbc/feral_druid/`, Upgrades tab, feral P2 defaults, 5,000 iterations. (a) In DevTools: `const t0=performance.now(); const b=document.querySelector('.upgrades-stop-button'); new MutationObserver(()=>{ if(b.disabled) console.log('stop→disabled ms', performance.now()-t0); }).observe(b,{attributes:true}); b.click();` ~2 s after the Go log's first `Running ... iterations on ... concurrent sims` line for the chunk. Record the ms, the Go log's `[Bulk Sim] Cancelled` with no later bulk request line, and the tab's `stopped` state. Pre-registered ≤ 3,000 ms (C21); if exceeded, record and continue. (b) 349 arm at 30,000 iterations: TEMPORARY uncommitted edits `MAX_CANDIDATES_PER_BULK_REQUEST = 27` and the guard call commented out in the driver; run: first chunk's Go log shows two stage lines (Medium then High); set 26: one stage line. Stop after the first chunk each time. Revert; `git -C $F status --porcelain` empty. Acceptance: readouts recorded in ticket 347 (a) and 349 (b) with the commands. Depends on C4, C6, C15, C21.

**Step 11 — Live cancel on WASM.** TEMPORARY uncommitted `makeSimRunner(true)` at `upgrades_tab.tsx:464`; `localStorage['__tbc_new_wasmconcurrency']='4'`; stop the 3333 server (so a WASM page cannot fall back to HTTP); `npx vite build` in `$F` (needs `dist/tbc/lib.wasm` from `make host`, `ls $F/dist/tbc/lib.wasm`); serve with `wowsims-fork-prod` (4180). Confirm the console shows `Bulk sim request: candidates=25` from a `sim_worker`, not `net_worker`. Press Stop ~10 s into the first chunk with the same snippet. Pre-registered ≤ 5,000 ms (C21). Revert; `git -C $F status --porcelain` empty. Acceptance: ms figure recorded; state `stopped`; exactly one `Bulk sim request` line. Depends on C5, C8, C21.

**Step 12 — Layout gate, review rows, tickets.** (a) `ls $F/dist/tbc/lib.wasm` (must exist, else the gate skips silently — C19); `python $R/scripts/check_layout_gate.py`; its output must say the gate **ran** and passed (not "skipped"); commit the advanced `data/wowsims-fork-layout.lock.json`. (b) `docs/reviews/feat-upgrades-tab-batch-sim.md`: D5 and P5 → `fixed` ("superseded in this round: ticket closed by feat/upgrades-tab-batch-sim Step N"); S3 → `fixed — superseded by the shared driver (adapters/bulk_screen_driver.ts)`; A3/P4's note updated to say the wiring landed (C22). (c) Close 347 and 349 (`Status: closed`, `## Resolution`): 347 — option, driver design incl. the per-chunk-signal/user-flag reason (C25), measured latencies from Steps 10-11 with commands, chunk-failure decision incl. integrity vs degradable; 349 — C13 table, both mechanisms, the guard, Step 10(b) Go arm, and that 339 is closed and the bound is iteration-invariant (C23). (d) `pnpm issues:open` lists neither; `pnpm merge-to-dev --check-only` prints ok. Outer commits per green slice. Acceptance: those outputs; `git status --porcelain` empty in `$R`. Depends on C19, C22, C23.

## Paths manifest

Fork (`$F`):
- `ui/core/components/individual_sim_ui/upgrades/engine/seams/sim-runner.ts` (modify; PROVENANCE row; both error classes live here)
- `ui/core/components/individual_sim_ui/upgrades/engine/rank.ts` (modify; PROVENANCE row)
- `ui/core/components/individual_sim_ui/upgrades/engine/bulk/partition.ts` (modify, header)
- `ui/core/components/individual_sim_ui/upgrades/engine/PROVENANCE.md` (modify)
- `ui/core/components/individual_sim_ui/upgrades/adapters/bulk_screen_driver.ts` (new)
- `ui/core/components/individual_sim_ui/upgrades/adapters/bulk_request_builder.ts` (modify)
- `ui/core/components/individual_sim_ui/upgrades/adapters/bulk_wasm_sim_runner.ts` (modify)
- `ui/core/components/individual_sim_ui/upgrades/adapters/bulk_http_sim_runner.ts` (modify)
- `ui/core/components/individual_sim_ui/upgrades_tab.tsx` (modify; plus temporary reverted edits in Steps 10-11)

Outer (`$R`):
- `packages/core/test/bulk-boundary.test.ts` (new)
- `packages/core/test/bulk-screen-driver.test.ts` (new)
- `packages/core/test/bulk-screen-fallback.test.ts` (new)
- `packages/core/test/bulk-screen-fixture.ts` (new, only if Step 8 extracts builders)
- `packages/core/test/bulk-partition.test.ts` (modify, comment)
- `data/wowsims-fork.lock.json` (modify)
- whatever `pnpm sim-implemented-effects:generate` rewrites under `data/` (modify)
- `data/wowsims-fork-layout.lock.json` (modify)
- `docs/plans/wowsims-tab/candidate-pool.md` (modify, one sentence)
- `docs/reviews/feat-upgrades-tab-batch-sim.md` (modify, rows D5/P5/S3/A3-P4)
- `.scratch/carry-forward/issues/347-stop-does-not-cancel-bulk-screening.md` (close)
- `.scratch/carry-forward/issues/349-bulk-batch-bound-not-coupled-to-iterations.md` (close)

No partition: single executor.

## Verify recipe

```
node --version                                   # v22.x, every shell
npx vitest run packages/core/test/wowsims-fork-parity.test.ts
npx vitest run packages/core/test/bulk-boundary.test.ts packages/core/test/bulk-screen-driver.test.ts packages/core/test/bulk-screen-fallback.test.ts packages/core/test/bulk-screen-branch.test.ts packages/core/test/bulk-partition.test.ts
node $F/node_modules/typescript/bin/tsc --noEmit -p $F/tsconfig.json
git -C $F status --porcelain                     # empty
pnpm verify
ls $F/dist/tbc/lib.wasm && python scripts/check_layout_gate.py   # output must say RAN + pass
pnpm issues:open                                 # 347 and 349 absent
pnpm merge-to-dev --check-only                   # ok
```
Plus Steps 10-11 readouts (ms figures, Go log lines, console lines) written into the tickets with the snippets that produced them.

## Out of scope

- Track B (345, 346, 348).
- Flipping the WASM bulk default (`makeSimRunner(true)` is a temporary test edit; 346 is the revisit trigger).
- Changing `MAX_CANDIDATES_PER_BULK_REQUEST` (26 would also be safe; leaving it is deliberate).
- Wiring Stop to `abortType`, or cancelling the per-candidate loop's in-flight sims.
- Landing already-screened rows after Stop (see Approach, F6).
- Naming the failing candidate inside a failed chunk.
- Any edit to `packages/core/src/**`, or to wowsims-owned files in `$F` outside `upgrades/` and `upgrades_tab.tsx`.
- Per-chunk progress reporting during screening; the layout gate's 120 s deadline.

## Round-2 review conditions (binding — plan-a-review round 2, VERDICT proceed)

- **N1 (minor, Step 7 case 4):** upstream never rejects on a candidate error — `batch.ts:132-134` triggers the signal, then `index.ts:121-123` RESOLVES with a `BulkSimResult` carrying `error`. Case (4) must have dispatch #1 trigger its signals and resolve with an error-bearing result (not reject), so the test also covers `bulkScreenResultFrom`'s `result.error` handling.
- **N2 (minor, ticket 347 resolution):** an integrity error on chunk k discards completed chunks' rows and skips the rest — intended, but state the reason in the ticket (no §5.1.4 constraint applies; `rank.ts` re-sims through the loop anyway).
- **Residual:** the two error classes are values — `adapters/` must import them with a value import, not `import type`.
