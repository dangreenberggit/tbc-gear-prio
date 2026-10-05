# Measurement — 545 worker silences (K1, plan steps 1-2)

Measured 2026-10-04 on the dev machine (`navigator.hardwareConcurrency` 20, `deviceMemory` 32), browser build (wasm), one page session of the Upgrades tab on feral cat. Raw data: `measurement-time.json` (2a), `measurement-health.json` (2b), `measurement-probe.json` (2c), all in this folder. All times are `performance.now()` on the page's main thread, so a gap includes any time the main thread was busy before it handled the message.

## Verdict (OQ-1)

**C.** Inputs: `M_run` = 1.144 s (≤ 9 s), `S_start` = 1.777 s (≤ 18 s), `S_presim(default)` = 11.704 s measured (9 s < 11.704 s ≤ 60 s). B needs `S_presim(default)` ≤ 9 s and fails on it. The extrapolation check passes: `S_presim(H) × 6,070,400 / H` = 18.891 s from the 2b maximum, 1.61× the measured 11.704 s, inside the 2× bound. Every message the recorder saw was classified (start-up, run, presim).

Limits under C's rule, for step 3 (arithmetic from the numbers below, not a separate measurement):

| Regime | Rule | Value |
| --- | --- | --- |
| start-up | `10 × S_start + 120 s`, round up to 10 s, cap 300 s | 10 × 1.777 + 120 = 137.8 → **140 s** |
| run | `10 × M_run`, floor 30 s, cap 90 s | 10 × 1.144 = 11.4 → floor → **30 s** |
| presim | `10 × S_presim(default)`, round up to 10 s, floor 60 s, cap 600 s | 10 × 11.704 = 117.0 → **120 s** |

## Commands

- Wasm build (fork `536645d01`, PowerShell in `vendor\tbc-new-fork`): `$env:GOWASM="satconv,signext"; $env:GOOS="js"; $env:GOARCH="wasm"; go build -ldflags "-w -s" -o dist/tbc/lib.wasm ./sim/wasm/` rc=0; then Git Bash `gzip -9 -f -n -k dist/tbc/lib.wasm` rc=0. `dist/tbc/lib.wasm.gz` 3,846,423 bytes, 2026-10-04 18:19. Go 1.25.4, no `wasm-opt`. `dist/tbc/sim_worker.js` (Oct 4 12:54) is newer than `ui/worker/`, so `vite.build-workers.mts` was not run.
- Server: `$env:PATH="C:\Users\dgree\AppData\Roaming\fnm\node-versions\v22.17.1\installation;"+$env:PATH; $env:WASM_WORKER="1"; node C:\Users\dgree\Code\lulz\tbc-gear-prio\vendor\tbc-new-fork\node_modules\vite\bin\vite.js serve --port 5173 --strictPort` (`:5173` was free). Console showed `Worker 0: Ready, isWasm: true`; no request to `localhost:3333`.
- Recorder: temporary edit to `ui/core/worker_pool.ts` (25 added lines): a module counter gives each `SimWorker` an `inst`; events pushed to `globalThis.__workerEvents` on construction, on `postMessage`, at the top of the message listener (with `ProgressMetrics` decoded for `progress`: `presimRunning`, `completedIterations`, `totalIterations`, final), and on the main thread's `wasmModule` reply. Reverted with `git -C vendor/tbc-new-fork checkout -- ui/core/worker_pool.ts` after this file was written.
- Analysis: in-page JavaScript over `__workerEvents`, per request id (`id` and `${id}progress`) and per worker instance. 2a's `[upgrades] stats read` console lines were pushed out of the console buffer before they were read; 2b's were captured by wrapping `console.debug`.

## Settings

- Page: `http://localhost:5173/tbc/druid/feralcat/` (the plan's `/tbc/feral_druid/` serves the landing page). Page phase 3 (2.2 - T6).
- Gear: Gear tab, phase tab "Phase 2", set "BiS 6%" (previous phase's preset; same preset as fixture `feral-p3-p2bis.json`).
- Tab iterations 3000 (tab default). Page iterations 12,500 (2a, 2b); 100 for 2c.
- Worker count: tab pool 4 workers (`inst` 1-4 = tab workers 0-3); page pool 4 workers (`inst` 0 = page worker 0, created first; `inst` 5-7 = page workers 1-3, created after page worker 0 was ready).
- 2a fight: page default, time-based, duration 180 s ± 5 s, one target "Raid Target", health 6,070,400 (unused on a time-based fight).
- 2b fight: full JSON export of the page, `encounter.useHealth = true`, `targets[0].stats[33]` (`Stat.StatHealth` = 33) = `H` = round(2451.1 × 180) = **441,198**; imported; duration pickers disabled after import.
- 2c fight: the same export with `useHealth = true` and health left at 6,070,400; page Simulate once.
- After 2c the original export was imported again (time-based fight) and page iterations set back to 12,500.
- **Difference between 2a and 2b:** the Upgrades tab's phase dropdown read "Phase 2 (2.1 - T5)" during 2a (227 eligible items, 12 sources, 264 candidates). The JSON import set it to "Phase 3 (2.2 - T6)", so 2b ranked 364 eligible items from 14 sources (401 candidates). Both runs use the same 3000-iteration sims, so the per-message silences compare; the wall times do not.

## Results

| Field | 2a time-based | 2b health (`H` = 441,198) | 2c probe (default health) |
| --- | --- | --- | --- |
| Wall time | 2063 s ("Took 2063s.") | 4072 s ("Took 4072s."); budget 1.5 × 2063 = 3095 s exceeded, abort line 2 × 2063 = 4126 s not reached; completed | 14.8 s (budget 10 min) |
| DPS shown | 2451.1 (`DPS_1`) | 2456.4 | 2255.90 |
| Average fight length | 180 s ± 5 s (time-based) | not shown by the tab; derived `H / DPS` = 441,198 / 2456.4 ≈ 180 s | not read from the page; derived 6,070,400 / 2255.9 ≈ 2,691 s |
| Requests | 280 `raidSimAsync`, 17 `computeStats` | 495 `raidSimAsync`, 29 `computeStats` | 1 split, 4 `raidSimAsync` (25 iterations each), 1 combination |
| `S_first` max (post → first message) | 200 ms | 1,144 ms | 38 ms |
| `S_gap` max (run regime, one request) | 590 ms | 866 ms | 1,020 ms (page worker 0), 205-215 ms others |
| `S_lookup` max (`computeStats` post → answer) | 25 ms | 37 ms | — |
| `[upgrades] stats read` lines | not seen (console buffer dropped them) | 29 lines, 12-44 ms | — |
| `S_presim` max | 49 ms (presim messages are sent on a time-based fight; the presim does no work) | 1,373 ms = `S_presim(H)` (median 773, p99 1,115, n 495) | 10,922 / 11,180 / 11,253 / 11,704 ms = `S_presim(default)`, measured per request |
| Longest silence per tab worker while a request waited (`inst` 1/2/3/4) | 518 / 586 / 590 / 539 ms | 1,099 / 1,212 / 1,139 / 1,373 ms | — (page workers) |
| `t_iter` (ms per main-loop iteration) | median 7.71 (min 5.40, max 10.50, n 280) | median 7.52 (min 5.36, max 9.81, n 495) | 96.6-105.2 per request |
| Unanswered requests, error replies | 0, 0 | 0, 0 | 0, 0 |

`M_run` = max over 2a and 2b of `S_first`, `S_gap`, `S_lookup` = **1,144 ms** (2b, a `raidSimAsync` whose first message, `PresimRunning: true`, arrived 1,144 ms after the post).

### Start-up (`S_start`, created → `ready`, page load before 2a)

| inst | Pool / worker | created → `wasmModuleRequest` | created → module reply | `S_start` |
| --- | --- | --- | --- | --- |
| 0 | page 0 | 241 ms | 664 ms | 1,006 ms |
| 1 | tab 0 | 169 ms | 587 ms | 928 ms |
| 2 | tab 1 | 168 ms | 586 ms | **1,777 ms** |
| 3 | tab 2 | 168 ms | 586 ms | 926 ms |
| 4 | tab 3 | 167 ms | 586 ms | 1,776 ms |
| 5-7 | page 1-3 | 937-938 ms | 937-938 ms | 992-996 ms |

Localhost; excludes a real download (rule in the plan).

### Observations the table does not show

- The four longest 2a gaps (518-590 ms, one per tab worker) all start within 72 ms of each other at `t` ≈ 267.3 s, so the main thread most likely did not handle messages for about half a second (hypothesis: main-thread work, untested). A per-worker timer on the main thread would be delayed by the same stall.
- In 2b, 14 of 495 requests show `S_first` 607-1,144 ms with `S_presim` 0: `PresimRunning: true` and `false` arrived in the same main-thread turn, so that request's presim silence is counted in `S_first` (run regime) instead. A phase-aware monitor sees this as run-regime silence of about 1 s.
- On wasm the id answer (empty payload) arrived anywhere in the progress stream (`idAnsAtMs` column), not first; every one had length 0.
- 2b top 20 gaps: 19 in the presim regime (1,036-1,373 ms), 1 in the run regime (`S_first` 1,144 ms).

## OQ-1 table inputs

| Input | Value | Source |
| --- | --- | --- |
| `S_start` | 1.777 s (tab worker max) | start-up table |
| `M_run` | 1.144 s | 2b `S_first` |
| `S_presim(H)` | 1.373 s at `H` = 441,198 | 2b |
| `S_presim(default)` | 11.704 s, measured (max of 4 page-worker requests) | 2c |
| Extrapolated `S_presim(default)` | 1.373 × 6,070,400 / 441,198 = 18.891 s; measured / extrapolated = 0.62 | check, within 2× |
| `t_iter` | 7.5-7.7 ms (180 s fight), about 100 ms (2,691 s fight) | 2a, 2b, 2c |

B: `M_run` ≤ 9 s yes, `S_start` ≤ 18 s yes, `S_presim(default)` ≤ 9 s **no**. C: `M_run` ≤ 9 s yes, `S_start` ≤ 18 s yes, 9 s < `S_presim(default)` ≤ 60 s **yes**. Fits-none conditions: none met. **Verdict: C.**
