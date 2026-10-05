# Probe — warm-up and main-loop silences on warlock and shadow priest (553 item 3, K3, plan step 9)

Measured 2026-10-05 on the dev machine (`navigator.hardwareConcurrency` 20), browser build (wasm), page Simulate in one Browser-pane tab. Raw data: `probe-warlock.json`, `probe-priest.json` in this folder. All times are `performance.now()` on the page's main thread.

## Verdict

| Limit | Rule (plan, Approach) | Inputs | Result | Verdict |
| --- | --- | --- | --- | --- |
| presim | `10 × max(S_presim)` over feral, warlock, priest; round up to 10 s; floor 60 s; stop above 600 s | feral 11.704 s (545 2c), warlock 1.827 s, priest 4.473 s → max 11.704 s | 117.0 → **120 s** | **stands** (120 s) |
| run | `10 × max(S_gap)`; round up to 10 s; floor 30 s; stop above 60 s | feral 1.020 s (545 2c, page worker 0), warlock 0.223 s, priest 0.504 s → max 1.020 s | 10.2 → 20 s → floor **30 s** | **stands** (30 s) |

Without feral the run rule gives 10 × 0.504 = 5.0 → 10 s → floor 30 s, the same. Neither limit moves, so `WORKER_SILENCE_LIMITS`, the step-5 literal test and the `worker_silence.ts` band numbers (D-N2) are unchanged. Both specs completed; no "not completed" ticket is needed.

## Per spec

`S_presim` = post → that request's first `PresimRunning: false`. `S_gap` = longest gap between consecutive messages of one request after that `false`. `S_first` = post → first message.

### Warlock — `http://localhost:5173/tbc/warlock/dps/`

- Page phase "Phase 3 (2.2 - T6)". Gear: Gear tab, set "T5" (previous phase's preset).
- DPS shown 2099.90, DUR 2893.00 (run 2). Click → last message 2.70 s.

| Worker | `S_first` ms | `S_presim` ms | `S_gap` ms | Iterations |
| --- | --- | --- | --- | --- |
| 0 | 20.2 | **1,826.6** | **223.3** | 25 |
| 1 | 14.1 | 1,804.3 | 124.0 | 25 |
| 2 | 19.3 | 1,765.6 | 118.7 | 25 |
| 3 | 16.5 | 1,729.9 | 110.1 | 25 |

Run 1 (same settings, before the worker id was added to the probe lines): DPS 2107.78, DUR 2881.98. All four requests use one id, so rows cannot be split by worker; the bounds are `S_presim` ≤ 1,810 ms (first post → last first-`false`) and `S_gap` ≤ 649 ms (first `false` → last message). Both runs agree with the verdict.

### Shadow priest — `http://localhost:5173/tbc/priest/dps/`

- Page phase "Phase 3 (2.2 - T6)". Gear: Gear tab, set "P2 Preset" (previous phase's preset).
- DPS shown 1588.46, DUR 3822.40. Click → last message 6.07 s.

| Worker | `S_first` ms | `S_presim` ms | `S_gap` ms | Iterations |
| --- | --- | --- | --- | --- |
| 0 | 20.0 | 4,442.7 | **503.6** | 25 |
| 1 | 16.0 | **4,472.8** | 140.5 | 25 |
| 2 | 16.2 | 4,457.3 | 139.6 | 25 |
| 3 | 27.5 | 4,423.7 | 138.0 | 25 |

## Settings

- Fight, both specs: the page's JSON export (Export → JSON) with `encounter.useHealth = true` and `targets[0].stats[33]` (health) = 6,070,400, imported with Import → JSON; checked by exporting again. Page iterations 100; page Simulate once. The page splits it into four `raidSimAsync` requests of 25 iterations on page workers 0–3, all with one request id.
- After each probe the same export was imported with `useHealth = false` and page iterations were set back to 12,500. Warlock gear was set back to "T6". The shadow priest's gear before the probe matched no preset chip and was not saved, so that page keeps "P2 Preset".
- Console showed `Worker N: Ready, isWasm: true` for workers 0–3 before the probes. The only console error during the runs was a wowhead tooltip fetch (`tooltip/spell/0`), which does not involve the workers.

## Commands

- Wasm: not rebuilt. `dist/tbc/lib.wasm.gz` is dated 2026-10-04 18:19 -0700; the latest fork commit under `sim/` is `536645d01` at 2026-10-04 13:13 -0700 (`git -C vendor/tbc-new-fork log -1 --format=%ci -- sim/`).
- Server (PowerShell, cwd `vendor\tbc-new-fork`): `$env:PATH="C:\Users\dgree\AppData\Roaming\fnm\node-versions\v22.17.1\installation;"+$env:PATH; $env:WASM_WORKER="1"; node C:\Users\dgree\Code\lulz\tbc-gear-prio\vendor\tbc-new-fork\node_modules\vite\bin\vite.js serve --port 5173 --strictPort`. `:5173` was free.
- Probe lines, temporary, in `ui/core/worker_pool.ts`: `console.debug('[553] post', id, performance.now(), worker.workerId)` before `doApiCall` in `doAsyncRequest`, and `console.debug('[553] progress', id, performance.now(), progress.presimRunning, progress.completedIterations, worker.workerId)` at the top of `newProgressHandler`'s returned function. `console.debug` was wrapped in-page to keep the lines. The served module was checked to contain both lines before each run.
- Revert: both lines deleted by hand; the file is byte-identical to the copy saved before the edit (md5 `04deabc154f0025e492c346ef120a130`).

## Observation

The warm-up does not follow fight length across specs: shadow priest's fight is longer than feral's (DUR 3,822 s against about 2,691 s) but its warm-up is 4.5 s against 11.7 s; warlock's is 1.8 s at DUR 2,893 s. The cost per simulated second differs by spec. The runner comment's line "2.5x for a spec at 1,000 DPS, whose warm-up pass is longer" scales feral's own number; these probes do not test it.
