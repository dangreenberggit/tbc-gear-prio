# Amendment A1 — plan-web.md: replacement Steps 2, 3, 10; amended claims

Scoped amendment per the execution loop-back of 2026-09-01. Everything not
replaced here stands unchanged, including the Round-2 and Reconciliation
conditions (L-new-1, R1–R6) and Step 10's four pre-registered thresholds.
Builds on the landed state: fork commit `5ad56a5c9` (spike harness), outer
commit `d044e54` (re-pin), verify green.

## Measurement environment (binding for Steps 2, 3, 10)

- **Server:** the `.claude/launch.json` `wowsims-fork` vite entry on
  `http://localhost:5173` (fork root, built `dist/tbc/lib.wasm` present).
  This is the WASM path by construction — the vite server does not rewrite
  `sim_worker.js` to `net_worker.js`, so `isWasm()` resolves true, which is
  the branch under test. No Go server is involved; if one is running on
  3333 it is irrelevant to these steps.
- **Harness:** the committed browser spike `tools/bulk-spike.mts`
  (fork commit `5ad56a5c9`), loaded by a spike page. Primary mount: a new
  `$U/tools/bulk-spike.html` with a module script importing
  `./bulk-spike.mts`, opened at
  `http://localhost:5173/tbc/ui/core/components/individual_sim_ui/upgrades/tools/bulk-spike.html`
  (vite dev serves and transforms source files under its root; executor
  confirms the URL resolves). Fallback if vite will not serve it: a
  dev-only import in `upgrades_tab.tsx` (project-owned per R1) gated on
  `?bulkSpike=1`, removed before Step 11's final commit — ledger the
  temporary edit either way.
- **Readout:** the spike prints one JSON line per arm to the console,
  prefixed `BULK_SPIKE_RESULT `, and sets `window.__bulkSpikeDone = true`
  on completion. The executor drives the page with the session's browser
  tooling (`preview_start` name `wowsims-fork`, `navigate`,
  `read_console_messages` / `javascript_tool`) and quotes the JSON lines
  verbatim in the ledger. No screenshot is evidence; the JSON lines are.

## Cross-track bound rule (binding on Step 5 and the ledger handoff)

One shared constant serves both engines, and it must guarantee the
no-culling, row-per-candidate regime on **both**: Go runs High-only below
26 candidates (Medium engages at 26, Low at 101); TS at 5,000 iterations is
High-only up to a derived 32 (flip at 33). Pre-registered rule:

> `MAX_CANDIDATES_PER_BULK_REQUEST = min(measured web bound, 25)`.

Expected value **25**. Defense: 25 is the largest value inside both
engines' High-only regimes; taking web's larger 32 would force local to
either cull or diverge from the shared constant, and the only cost of 25 on
web is slightly more chunks — one extra baseline probe per extra chunk,
bounded and quoted in Step 10. Local's Step 1(a) assertion (bound ≤ 25)
therefore holds by construction; its two-sided escalation is settled by
this rule, not by a number in the ledger. If the measured web bound comes
back **below 25**, the shared constant is that measured value; if it comes
back below 20 — contradicting the derivation by a margin the `dpsMetrics`
filter alone should not produce — **stop and escalate** with the arm
outputs. Step 5 hard-codes the constant per this rule; the ledger handoff
records both the measured web bound and the applied constant, greppable.

## Replacement Step 2

2. **Confirm row completeness at the derived boundary (browser).** The
   stage-selection half of the old Step 2 is already answered exactly by
   executing upstream's own pure functions (ledger, 2026-09-01): flip at
   n=40 @3,000 and n=33 @5,000; higher iterations move the boundary
   *down*; the binding setting is 5,000, so the derived web bound is 32.
   What remains — and what only a real run can answer — is whether every
   candidate returns a row with `dpsMetrics` inside that regime
   (`statistics.ts:107` can drop rows without any culling; R2/L-new-1).
   Arms, all at `highStageIterations: 5000`, `topResults = n`, run in the
   environment above: **n = 19** (sanity, deep inside the regime),
   **n = 25** (the expected shared constant), **n = 32** (derived edge),
   **n = 33** (first arm past the derived boundary — the grid now has an
   arm on the far side). Pre-registered expectations: 19, 25, 32 return
   exactly n rows, every row carrying `dpsMetrics`; 33 shows multi-stage
   metrics and/or fewer rows. Acceptance: the four `BULK_SPIKE_RESULT`
   lines quoted in the ledger; the measured web bound = the largest
   complete-row n among {19, 25, 32} (step down from 32 one at a time if
   32 drops rows); the shared constant then set by the cross-track rule
   above. A complete n=33 means the derivation was conservative — record
   it, the rule still caps the constant at 25. Measured beats derived
   throughout. Depends: C3 (as amended), C4, C5, C13, C16.

## Replacement Step 3

3. **Spike the direct call (browser).** Same page and readout. Build a
   real feral-p2 `BulkSimRequest` (typed `baseRequest` via
   `RaidSimRequest.fromJson` — note the explicit cast obligation, C13
   amended), one chunk at the shared constant's size,
   `highStageIterations: 5000`, `topResults = candidates.length`; obtain
   `SimSignals` via `signalManager.registerRunning(RequestTypes.BulkSim)`
   (`ui/core/sim_signal_manager.ts:1-5` — verified by reading, this step
   confirms by execution); call
   `runConcurrentBulkSim(request, pool, onProgress, signals)` at pool
   sizes 4 and 1. Acceptance (R4 wording): a `BulkSimResult` whose
   `baseline` **field** is populated and whose `topResults` **array** has
   one row per candidate, every row carrying `dpsMetrics` (R2 count
   asserted per chunk in the spike), at both pool sizes;
   `validateBulkSimRequest` passes; the working `RequestTypes` member
   ledgered for the local handoff. If pool-size-1 fails, record the
   failure mode — the runner then requires ≥2 workers and Off/1 users
   stay on the loop. If the call fails outright, **stop and escalate**
   (the `Sim.runBulkSim` fallback inherits the same internals and rescues
   nothing — no silent fallback). Depends: C5, C6, C12, C13, C16.

## Replacement Step 10

10. **Equivalence measurement — pre-registered, in the browser.** The four
    win conditions are **unchanged** from v2 and remain registered before
    running: (a) identical screened-candidate count both ways; (b)
    per-partition Spearman rank correlation of screening deltas ≥ 0.95;
    (c) paired-replication top-N selection overlap ≥ 90%; (d) final
    displayed ordering of shared top-N members identical within each
    row's reported error bars. Environment: extend the spike page to run
    `rankUpgrades` end-to-end twice on feral-p2 at 5,000 — once with the
    loop runner, once with `BulkWasmSimRunner` — dumping each run's full
    ranking output as JSON (`BULK_SPIKE_RESULT` lines / `window.__bulkSpikeResults`).
    This is minutes of in-browser compute, not a quick spike; the
    executor waits on `window.__bulkSpikeDone` rather than a fixed
    timeout. The statistics (Spearman, overlap) are computed offline from
    the quoted JSON by a throwaway script in the session scratchpad, with
    the formulas and inputs quoted in the ledger. Also quote actual
    baseline-probe counts per chunk (C15) — this prices the 25-vs-32
    chunking cost of the cross-track rule. Any missed condition =
    **stop and escalate with the numbers** — not adapt, not rationalize.
    Acceptance: all four conditions quoted with measured values in the
    ledger. Depends: C6, C10, C15, C16.

## Amended claims

| ID | Amended claim | Load-bearing | Verified by |
| --- | --- | --- | --- |
| C3 (revised) | TS stage selection has **two** early-returns: `BULK_SIM_MIN_COMBINATIONS = 20`, then the cost estimate (`estimate.ts:14-32`), which stays High-only up to n=39 @3,000 and n=32 @5,000; raising `highStageIterations` moves the boundary **down**. Measured by executing upstream's own pure functions under Node (ledger, Step-2 partial result). | yes | re-run the ledger's pure-function sweep (fork root, tsx loader + shims per execution-ledger-web.md §Step 2 partial) |
| C11 (revised) | Fork typecheck working form on this machine: `node vendor/tbc-new-fork/node_modules/typescript/bin/tsc --noEmit` with cwd at the fork root (`npm --prefix … run type-check` fails on Windows — bare relative script path). The Node spike recipe is **dead** for sim execution: `WorkerPool` needs `window.Worker` + `lib.wasm` (`worker_pool.ts:32,309`; `ui/worker/sim_worker.ts:123`). | no | ledger §Gate results; `node vendor/tbc-new-fork/node_modules/typescript/bin/tsc --noEmit` exits 0 |
| C12 (revised) | `SimSignals` request type is `RequestTypes.BulkSim` (`0x8`, `ui/core/sim_signal_manager.ts:1-5`) — verified by reading and typecheck; unverified by execution until Step 3 runs. | no | Step 3 acceptance |
| C13 (amended) | As before, plus: `RaidSimRequest.fromJson` rejects the seam's `Readonly<Record<string, unknown>>` (TS2345); `buildBulkSimRequest` (Step 6) needs an explicit cast to `JsonValue` with a why-comment citing the seam's deliberate protojson typing — a cast `wasm_sim_runner.ts:112` never needed because it passes a fresh literal. | yes | ledger §Incidental finding for Step 6 |
| C16 (new) | The vite `wowsims-fork` server on 5173 serves the spike page and boots real WASM sim workers there (`dist/tbc/lib.wasm` present, 21.5 MB; `isWasm()` true because no `net_worker.js` rewrite occurs on vite). | yes | hypothesis, untested — Step 2's first arm verifies; failure to mount/boot = stop and escalate |

## Verify recipe correction

Replace the fork typecheck line with:

```
# from vendor/tbc-new-fork (cwd matters):
node node_modules/typescript/bin/tsc --noEmit
```

## Consequences stated for the record

- **Step 5** hard-codes `MAX_CANDIDATES_PER_BULK_REQUEST` per the
  cross-track rule (expected 25), not the raw measured web bound; both
  values go into the ledger handoff for local's Step 1(a).
- Step 6's spec now includes the C13 cast obligation.
- The spike page (`tools/bulk-spike.html`, and the `upgrades_tab.tsx`
  fallback hook if used) joins the Paths manifest; the tab hook, if
  created, is removed before Step 11's final commit.
- Stop-and-escalate semantics are unchanged at every gate (Steps 2, 3, 10).

---

# A1.1 corrections (binding — round-3 review, routed by the orchestrator)

- **A1-1 (blocking, replaces the Measurement environment server choice):** C16 is REFUTED — `vite.config.mts:20-25` maps `/tbc/sim_worker.js` -> `/tbc/local_worker.js`, an HTTP worker (`makeHttpApiRequest` x3, zero `WebAssembly` refs), so on 5173 `isWasm()` is FALSE and the pool never resizes past 1. The measurement server is the `.claude/launch.json` **`wowsims-fork-prod`** entry (http-server over `vendor/tbc-new-fork/dist` on port 4180 — no rewrite, real `sim_worker.js`). Binding precondition, asserted before any arm runs and quoted in the ledger: `await workerPool.isWasm() === true`; stop and escalate if false. If prod-serving the spike page needs a copy of the page into `dist/`, ledger the temporary file and remove it before Step 11's final commit. C16 is restated against port 4180 and remains hypothesis-until-asserted.
- **A1-2 (material):** every `BULK_SPIKE_RESULT` JSON line must carry provenance fields: `isWasm`, `getNumWorkers()`, and the resolved worker URL — so the ledger shows on its face which transport produced the numbers.
- **A1-3 (minor):** if the measured web bound comes back at or above 25, the 25 cap is recorded in the ledger as an applied decision ("web capability left on the table: measured bound N > 25"), not a silent floor.
- **A1-4 (minor):** the n=33 arm's expectation is falsifiable: assert `stageMetrics.length > 1`. A complete single-stage n=33 contradicts the derivation -> escalate, not shrug.
