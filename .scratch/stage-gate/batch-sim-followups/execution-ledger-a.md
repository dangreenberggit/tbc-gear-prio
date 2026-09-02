# Execution ledger — Track A (tickets 347 + 349)

Plan: `plan-a.md` v2 (VERDICT proceed). Base: outer `b76390bfe68b21f43e4936b8218dd51041bd77cb`, fork `20dbb6f5d884bb63cca5a5bd3d6b9b9c31caf11d`, both clean and asserted at start. Branch `feat/upgrades-tab-batch-sim`, shared checkout.

## Deviation ledger

| Step | Plan said | Found | Action | Why |
| --- | --- | --- | --- | --- |
| 4 | Acceptance `grep -c "runBulkScreenChunks" <both>` → 1, 1 | 2 and 3 | adapt | The comments I wrote name the driver, so the raw line count is higher. The operative property is checked instead: `grep -c registerRunning` → 0, 0, and `grep -n "runBulkScreenChunks("` → exactly one call site in each runner. |
| 5(c) | "both return sites spread `...(screeningFallbacks.length ? …)`" | One `rankingBase` object feeds both the `PartialRanking` and the `Ranking` return | adapt | Spreading once on `rankingBase` covers both sites; a second spread would be dead code. |
| 8 | "reusing `bulk-screen-branch.test.ts`'s fixture builders (extract to `bulk-screen-fixture.ts` if it avoids duplication)"; case (5) "existing `bulk-screen-branch.test.ts` unchanged and green" | The two instructions pull opposite ways: a full extraction means editing the branch test | adapt | New shared `packages/core/test/bulk-screen-fixture.ts` carries the fixture for the new test; `bulk-screen-branch.test.ts` left untouched, honouring case (5) literally. It remains green (5 tests). Duplication is confined to the branch test's own copy, which no longer grows. |
| 8(4) | "zero candidate `run` calls after the baseline" | Asserted as `baselineCalls === 1` | adapt | Same property, stated as the total count of `run` calls, which is the stronger form. |
| 10 | Page `http://localhost:3333/tbc/feral_druid/` | That path 404s; the built route is `/tbc/druid/feralcat/` (`dist/tbc/druid/feralcat/`) | adapt | Wrong URL in the plan, unambiguous intent (the feral druid page). Also: the Go server serves `./dist` with `--usefs=true`, so the fork frontend must be built (`npx vite build`) before the page carries the new code — the plan does not say so for Step 10, only for Step 11. Confirmed the built bundle carries it before measuring. |

## Step outcomes

### Step 1 — Seam
`engine/seams/sim-runner.ts`: `BulkScreenRequest.signal?: AbortSignal`, `BulkScreenResult.failures?`, and the two exported error classes `BulkScreenAbortedError` / `BulkScreenIntegrityError` (both in the seam per the orchestrator note, so the engine never imports from `adapters/`). `RecordedSimRunner` unchanged.

Fork typecheck exit 0. `git diff --numstat` → `46 0` on that file (no line-ending flip).

### Step 2 — Guard (349) and integrity throws
`adapters/bulk_request_builder.ts`: `assertSingleStageChunk(request, candidateCount)` importing upstream's `shouldUseLegacyBulkSim` from `wasm/bulk_sim/estimate.js`. `adapters/bulk_wasm_sim_runner.ts`: the no-baseline and row-shortfall throws are now `BulkScreenIntegrityError` (value import, per the round-2 residual); `result.error` stays a plain `Error`.

Fork typecheck exit 0.

### Step 3 — Shared chunk driver
New `adapters/bulk_screen_driver.ts`. `userAborted` is the only cancel classifier; `SimSignals` registered per chunk; the guard sits outside the inner try; integrity errors rethrown. Generic parameter from the plan sketch dropped — both dispatches return `BulkSimResult`, so `BulkChunkDispatch` is concrete.

### Step 4 — Runners thin
Both `runBulkScreen` bodies are a single `runBulkScreenChunks` call.

```
bulk_wasm_sim_runner.ts registerRunning=0  runBulkScreenChunks( call sites=1
bulk_http_sim_runner.ts registerRunning=0  runBulkScreenChunks( call sites=1
```

Fork typecheck exit 0.

### Step 5 — rank.ts
`signal: deps.signal` threaded; the call wrapped with the three-way classification; `screeningFallbacks` collected from both the catch and `result.failures`; `Ranking.screeningFallbacks?` added and spread only when non-empty; the three comments amended (`Deps.signal`, the screening-pass comment, `DEFAULT_ITERATIONS`).

### Step 6 — partition header and boundary test
Header replaced with the measured table and both mechanisms. New `packages/core/test/bulk-boundary.test.ts`:

```
npx vitest run packages/core/test/bulk-boundary.test.ts
 ✓ packages/core/test/bulk-boundary.test.ts (3 tests) 5234ms
 Tests  3 passed (3)
```

3 passing, **not skipped**. The first test reproduces C13's table exactly under the fork harness — independent confirmation that n = 25 and n = 26 are single-stage at every count from 3,000 to 1,000,000 and the first multi-stage n floors at 27 above 28,000.

`bulk-partition.test.ts:41-43`'s stale "Go engages Medium at 26" comment replaced with a pointer to the new file.

### Step 7 — Driver tests
New `packages/core/test/bulk-screen-driver.test.ts`, 6 cases as specified. Case 4 follows round-2 condition **N1**: dispatch #1 triggers its own signals and then **resolves** with an error-bearing `BulkSimResult` (never rejects), which is what `index.ts:121-123` actually does, so the test also covers `bulkScreenResultFrom`'s `result.error` handling.

```
npx vitest run packages/core/test/bulk-screen-driver.test.ts
 ✓ (6 tests) 4536ms
 Tests  6 passed (6)
```

### Step 8 — Seam-level tests through rankUpgrades
New `packages/core/test/bulk-screen-fallback.test.ts` (4 cases) on the extracted `bulk-screen-fixture.ts`.

```
npx vitest run packages/core/test/bulk-screen-fallback.test.ts
 ✓ (4 tests) 8654ms
 Tests  4 passed (4)
```

Whole set including the untouched branch test and the HTTP fixture test:

```
npx vitest run packages/core/test/bulk-boundary.test.ts packages/core/test/bulk-screen-driver.test.ts \
  packages/core/test/bulk-screen-fallback.test.ts packages/core/test/bulk-screen-branch.test.ts \
  packages/core/test/bulk-partition.test.ts packages/core/test/bulk-screen-http-fixture.test.ts
 Test Files  6 passed (6)
      Tests  27 passed (27)
```

### Step 9 — Tab, contract, PROVENANCE cycle
Tab: `console.warn` per `screeningFallbacks` entry after `runAssumptions = ranking.assumptions`; Stop's comment amended. `candidate-pool.md` §5.1.4 item 4 amended with the aborted-chunk sentence and the discarded-sibling-chunks note.

PROVENANCE cycle, in order:

1. `npx vitest run packages/core/test/wowsims-fork-parity.test.ts` → 1 passed, 1 skipped (E-W3 green before any hash moved).
2. `rank.ts` → `599ad73d3eb5eb443bbb3ebfe204600355e61f100a2bb934bd87dbfa4888482d`; `seams/sim-runner.ts` → `03310d939b95d38c03e26c6a8af937ac882a20688c1b37b5e6fc5d7d2f430291`; adaptation text extended on both rows.
3. Fork commit `80395e68cd180341b1f9bf7c4c123fef769e4901` on `feat/upgrades-tab` — 9 files, +371/-130, exactly the Paths manifest.
4. `data/wowsims-fork.lock.json` `commit` → `80395e68cd18…`; `pnpm sim-implemented-effects:generate` → `wrote data\sim-implemented-effects.json -- 217 implemented, 451 stub-only (fork commit 80395e68cd180341b1f9bf7c4c123fef769e4901)`.
5. `pnpm verify` exit 0. Notably `check_engine_port_drift.py`: `engine port drift check ok: 33 ported files match PROVENANCE.md`.

Pre-existing, unrelated to this change: `check_ep_presets.py` reports `ret/p3.ep-weights.json` NOT VERIFIED at the current pin (1 of 20), and `warn_upstream_drift.py` warns (warning only).

Outer commit `701d310` — 8 files, +965/-6.

### Step 10 — Live cancel on HTTP, and the 349 Go-side arm

Setup: `npx vite build` in the fork (the Go server serves `./dist` under `--usefs=true`, so the built bundle must carry the new code — confirmed by finding the `screening fell back to per-candidate` string in `dist/tbc/bundle/preset_utils-C9N-LIgq.chunk.js` before measuring). `wowsims-backend` on port exactly 3333, no stray `wowsimtbc.exe`. Page `/tbc/druid/feralcat/`, Upgrades tab, phase 2, 5,000 iterations.

**(a) Cancel latency — PASS.** Instrument:

```js
const b = document.querySelector('.upgrades-stop-button');
const t0 = performance.now();
const obs = new MutationObserver(() => {
  if (b.disabled) { window.__stopMs = performance.now() - t0; obs.disconnect(); }
});
obs.observe(b, { attributes: true, attributeFilter: ['disabled'] });
b.click();
```

Readout: **`stopMs = 481`**, tab state `Stopped early`, `screeningFallbacks` warnings none. Pre-registered ≤ 3,000 ms (C21) — passed with 6x margin.

Server-side, the acceptance evidence. Chunks 1-3 each ran ~9 s single-stage; chunk 4 began at `08:17:33` and the log's **last line** is:

```
2026/09/02 08:17:33 [Bulk Sim] - Stage: high - Starting
  Candidates: 25
2026/09/02 08:17:36 [Bulk Sim] Cancelled
```

No `Stage: high - Starting` after it — the chunk was killed ~3 s into a ~9 s batch and no further bulk request was issued.

Incidental but useful: all three completed chunks logged `Stage: high` only, with `Input gear sets: 25 / Completed candidates: 25 / Survivors: 25` — live confirmation on the Go engine that n=25 at 5,000 iterations is single-stage with no culling.

**(b) 349 Go-side arm — PASS.** Temporary uncommitted edits: `MAX_CANDIDATES_PER_BULK_REQUEST = 27` (then 26) and the `assertSingleStageChunk(...)` call replaced by `void assertSingleStageChunk;`. Rebuilt between arms. 30,000 iterations, past the 28,001 flip.

```
n = 27:  08:18:49 [Bulk Sim] - Stage: medium - Starting   Candidates: 27
         08:18:51 [Bulk Sim] - Stage: medium - Finished
                    Input gear sets: 27  Completed candidates: 27  Survivors: 5
         08:18:51 [Bulk Sim] - Stage: high - Starting     Candidates: 5

n = 26:  08:19:40 [Bulk Sim] - Stage: high - Starting     Candidates: 26
```

Two stage lines at 27 with a 27→5 cull, one at 26. The Go engine flips exactly where upstream's TypeScript estimator predicts, which is the cross-engine claim the guard rests on. Both temporary edits reverted; `git -C $F status --porcelain` empty afterwards.

### Step 11 — Live cancel on WASM — **MISSED, recorded**

Setup: temporary `makeSimRunner(true)` at `upgrades_tab.tsx:464`; `localStorage['__tbc_new_wasmconcurrency'] = '4'`; the 3333 server **stopped** so no HTTP fallback was possible; `npx vite build`; static `dist` served on 4180.

Transport confirmed before measuring: `performance.getEntriesByType('resource')` showed **13 `sim_worker.js` and zero `net_worker.js`** — genuinely the in-browser WASM tournament.

Readout: **`wasmStopMs = 12131`**, tab state `Stopped early`, 0 rows.

**Pre-registered ≤ 5,000 ms (C21) — missed by 2.4x.** Recorded and continued per the stop-and-report rule. The abort does work: 12.1 s against a 332 s chunk is ~27x, and the tab reaches `stopped` with a `PartialRanking`. The residual latency is upstream's tournament, not the wiring — `batch.ts` dispatches a per-candidate sim per worker, and each in-flight one must reach its own next abort check, so the pass cannot stop faster than the currently-dispatched batch of individual sims drains. Shortening it means changing how `batch.ts` dispatches, which is out of this plan's scope. C21 was labelled hypothesis and is refuted for the WASM transport; the HTTP half of C21 (≤ 3 s) held at 481 ms. The WASM bulk route is default-off, so the latency a user can reach today is the HTTP one.

Temporary edit reverted; `git -C $F status --porcelain` **empty**; `dist` rebuilt from committed source before the layout gate ran.

### Step 12 — Layout gate, review rows, tickets

(a) `ls $F/dist/tbc/lib.wasm` → present (21,515,762 bytes), so the gate could not skip. `python scripts/check_layout_gate.py`:

```
layout gate: tab layout source changed since the last green run (recorded a78a247d6d08..., now 8c4c367d1cbb...) -- running the gate.
layout gate: OK -- 37 assertion(s) passed at widths 375, 653, 768, 1280
layout gate: PASSED. Advanced the baseline to 8c4c367d1cbb... in data/wowsims-fork-layout.lock.json
```

Output says **ran**, not skipped.

(b) `docs/reviews/feat-upgrades-tab-batch-sim.md`: D5 and P5 `defer` → `fixed` (superseded, ticket closed by this branch); S3 `wontfix` → `fixed — superseded by the shared driver`; A3/P4's note updated to say the cancel wiring landed. The Summary's "Open deferred work is fully ticketed: 345, 346, 347, 348, 349" line corrected — 347 and 349 are now closed.

(c) 347 and 349 both `Status: closed` with `## Resolution` sections carrying the option chosen, the driver design including the per-chunk-signal / user-flag reason, the measured latencies with the snippet that produced them, the chunk-failure decision, the C13 table, both mechanisms, the Go-side arm, and 339's bearing on the bound. Per round-2 condition **N2**, ticket 347 states why an integrity error discards completed chunks: no §5.1.4 constraint applies (that clause governs a Stop), and `rank.ts` re-sims those candidates through the loop anyway.

(d) `pnpm issues:open` → 347 and 349 absent.
