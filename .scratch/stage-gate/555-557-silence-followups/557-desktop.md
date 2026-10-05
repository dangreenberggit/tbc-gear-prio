# 557 desktop build: longest worker silence per regime, one feral cat tab run

Measured 2026-10-05 (about 21:40-21:47Z) on the dev machine, desktop build: vite on `:5173` without `WASM_WORKER`, Go backend on `:3333`, one Upgrades-tab run on feral cat in the Browser pane. Fork `3b75509aaf45ff0ca58c7fed649efcd54ab4794e` plus four temporary probe lines in `ui/core/worker_pool.ts` (reverted, see Commands). Times are `performance.now()` on the page's main thread.

## Verdict

All three limits held. No worker was restarted. The run regime has the smallest margin, 6.7 times, which is below the factor of ten the limits rule uses.

| Regime | Longest silence (tab worker) | Where | Limit at `3b75509a` | Margin |
| --- | --- | --- | --- | --- |
| start-up (created to `ready`) | 0.654 s (worker 0, first page load); 0.348 s on the second load | page load, before the run | 140 s | 214× |
| presim (post to first `PresimRunning: false`) | 4.275 s (worker 3) | post of `raidSimAsync-f4f89361477874b7` to its first progress message, 61.1 s to 65.4 s after the click | 220 s | 51× |
| run | 4.483 s (worker 1) | between two progress messages of `raidSimAsync-46f2a3699c956d1`, 60.8 s to 65.3 s after the click | 30 s | 6.7× |

Under the run rule in `.scratch/stage-gate/545-worker-silence-check/measurement.md` (`10 × M_run`, floor 30 s, cap 90 s), 4.483 s gives 44.83 s. The run rule has no rounding step (`measurement.md:14`); only the start-up and presim rules round up to 10 s. (Corrected 2026-10-05 per `decision-log.md` row `runMs-rounding`; this sentence first said "50 s after rounding up to 10 s".) The 30 s limit is still 6.7 times the longest silence measured. Whether to raise `runMs` or accept the smaller margin on desktop is a decision for the ticket owner. This run changed nothing.

The two longest silences and the longest presim silence all fall in one window. Between 61.2 s and 64.6 s after the click, no worker of either pool sent any message (probe log, all events in that window). The cause is unknown. It may be a stall on the page's main thread or a stall in the backend (hypothesis, untested). A main-thread heartbeat added later in the run (from 258 s) saw stalls of up to 1.49 s. It was not running during the 61-65 s window.

## How the desktop build uses the pool and the silence monitor (code reading)

The desktop build uses the same pool and the same monitor as the browser build. Only the worker script differs.

- The tab ranks with `WorkerPoolSimRunner` on both transports. `upgrades_tab.tsx:880` builds it with `makeSimRunner()`, and `simRunner()` (`upgrades_tab.tsx:1859-1870`) returns it unless localStorage `upgradesTab.runner` is `bulk-http`. In this run that key was `null` and the tab's status element had `data-runner="WorkerPoolSimRunner"` (`upgrades_tab.tsx:1950`).
- `WorkerPoolSimRunner` builds `new WorkerPool(numWorkers, { silence: WORKER_SILENCE_LIMITS })` (`worker_pool_sim_runner.ts:154`). Each `SimWorker` with limits creates a `SilenceMonitor` (`worker_pool.ts:394-398`) and loads `SIM_WORKER_URL` = `/tbc/sim_worker.js` (`worker_pool.ts:33`, `:401`).
- Vite serves `/tbc/sim_worker.js` from `dist/tbc/local_worker.js` when `WASM_WORKER` is unset (`vite.config.mts:23`). `ui/worker/local_worker.ts:3` runs `setupHttpWorker("http://localhost:3333")`.
- The HTTP worker sends `ready` with `isWasm` false as soon as it starts. No wasm is downloaded (`ui/worker/worker_http.ts:87`). So the start-up regime is short.
- For `raidSimAsync` the worker POSTs the request, then polls `/asyncProgress` and posts every answer to the page as a `progress` message. It waits 50 ms between polls and stops at the final result (`worker_http.ts:52-70`). The backend answers a poll at once with the latest stored `ProgressMetrics` and does not wait for new progress (`sim/web/main.go:312-375`). So the page gets a message about every poll round trip plus 50 ms, whatever the sim is doing. The sim runs in a goroutine (`sim/core/api.go:145-148`), so the POST returns at once.
- The first stored progress is an empty `ProgressMetrics` (`sim/web/async_progress.go:32`), which reads as `PresimRunning: false`. So `noteProgress` (`worker_pool.ts:523-526`) ends the presim regime at the first poll answer. The run confirms this: all 495 `raidSimAsync` requests changed from `presim` to `run` on their first progress message. On desktop the warm-up is therefore judged against the run limit. The polls continue during the warm-up, so this is harmless as long as the polls keep arriving: the longest silence in the run regime was 4.48 s.
- `computeStats` is a plain request with one answer and no progress (`worker_http.ts:47-50`); the longest took 24 ms.

Because the desktop build uses the monitor, a run was needed.

## Run settings

- Page `http://localhost:5173/tbc/druid/feralcat/`, page phase "Phase 3 (2.2 - T6)".
- Gear: Gear tab, phase tab "Phase 2", set "BiS 6%" (the previous phase's preset; the same as 545).
- Fight: the page's JSON export with `encounter.useHealth = true` and `targets[0].stats[33]` = 441,198, the 545 2b fight (fight ends at a health value, about 180 s). Imported with Import → JSON and checked by a second export (`useHealth: true`, health 441,198, equipment unchanged). A health fight was chosen so that each sim runs a real warm-up, as in 545 2b.
- Upgrades tab: phase "Phase 3 (2.2 - T6)", iterations 3000 (tab default), "Sim only selected set items" off. Tab pool 4 workers.
- Desktop mode confirmed: `/tbc/sim_worker.js` as served was 21,519 bytes and contained `localhost:3333`, and the console showed `Worker N: Ready, isWasm: false` for the new page. `WASM_WORKER` was unset in the process, user and machine environments.
- Result: "Your current gear: 2456.4 DPS. Took 368s." 495 `raidSimAsync` and 29 `computeStats` requests. The browser-build run 545 2b used the same settings and gave the same DPS and request counts, and took 4,072 s.

## Timeline

- Page load: tab workers 0-3 created at 3,246-3,250 ms and ready at 3,582-3,598 ms (336-348 ms). The first load in this session, with a cold vite, took 645-654 ms. Page worker 0 took 950 ms and 447 ms.
- Click at 132,452 ms (t = 0). Last message at t = 368.3 s.
- t = 60.8 s to 65.4 s: the longest silences of workers 0-3, all in one window (see Verdict).
- t = 258 s: the heartbeat was started (100 ms `setInterval`). It recorded 42 gaps over 400 ms, the longest 1,489 ms.
- t = 368 s: the run settled with "Took 368s". No `created` event after the page load, so no worker was restarted.

## Distributions over the 495 `raidSimAsync` requests

| Measure | p50 | p99 | max |
| --- | --- | --- | --- |
| post to first progress message | 171 ms | 1,063 ms | 4,276 ms |
| longest gap between progress messages within one request | 353 ms | 1,514 ms | 4,483 ms |
| gap between consecutive progress messages, per tab worker (n 8,755) | 99 ms | 967 ms | — |
| request duration, post to final answer | 2,534 ms | — | 8,883 ms (min 323 ms) |
| progress messages per request | 18 | — | 49 (min 2) |

Longest silence per tab worker, by the monitor's own rule (see Method):

| Worker | start-up | presim | run |
| --- | --- | --- | --- |
| 0 | 0.654 s | 3.681 s | 1.435 s |
| 1 | 0.654 s | 1.239 s | **4.483 s** |
| 2 | 0.650 s | 1.145 s | 3.406 s |
| 3 | 0.645 s | **4.275 s** | 1.517 s |

## Method

- Probe lines (temporary) in `SimWorker`, each tagged `[557d]` with the worker id, whether the worker has silence limits (the tab pool) and `performance.now()`: one after `new window.Worker(...)` (created), one at the top of the message listener (message name, id, regime before the message), one in `refreshRegime` (new regime), and one in `doApiCall` before `requestWaiting` (request name, id, `hasWaitersOtherThan(id)`).
- Start-up events were read from the console with `read_console_messages`. Before the run, `console.debug` was wrapped in the page to push the `[557d]` lines into `window.__p557d`.
- Analysis (in-page JavaScript over `window.__p557d`, tab-pool events only) copies the monitor's timer: a message re-arms it, and a request re-arms it only when no other request waits (`worker_silence.ts`, `requestWaiting`). A regime change keeps the arm time. For each stretch between re-arms while a request was outstanding, the silence for a regime is the time from the arm to the end of the part of the stretch spent in that regime. This is the value the monitor compares with that regime's limit.
- Raw events were not saved to a file.

## Commands to re-run

1. Check the ports first: `Get-NetTCPConnection -LocalPort 5173,3333 -State Listen` (both were free here) and `preview_list`.
2. Copy `vendor/tbc-new-fork/ui/core/worker_pool.ts` to the scratchpad and record its md5 (`04deabc154f0025e492c346ef120a130` at `3b75509a`). Add the four probe lines above, before you load the page (an edit reloads the page through HMR).
3. `preview_start` `wowsims-backend` (builds `wowsimtbc.exe` from the fork and serves `:3333`; about 20 s here), then `preview_start` `wowsims-fork` (vite on `:5173`, desktop mode, because the entry in `.claude/launch.json` sets no `WASM_WORKER`). Close the extra tab that `wowsims-backend` opens.
4. Open `http://localhost:5173/tbc/druid/feralcat/`. Read the `created` and `ready undefined` console lines for start-up. Confirm `isWasm: false` and that `/tbc/sim_worker.js` contains `localhost:3333`.
5. Wrap `console.debug` in the page. Load "Phase 2" → "BiS 6%" in the Gear tab. Save the page's JSON export, then import it with `useHealth: true` and health 441,198. Open the Upgrades tab and check phase 3 and iterations 3000. Click `.upgrades-run-button`. Poll in calls of 40 s or less until "Took" appears.
6. Restore: import the saved export (here the re-export was byte-identical to it). Copy the saved `worker_pool.ts` back and check its md5. `git -C vendor/tbc-new-fork status --porcelain` must print nothing. `preview_stop` both servers and check that `:5173` and `:3333` have no listener.

## Side effects

- In this session the Browser pane was not shown on screen (`mcp__ccd_view__get_layout`: no open panes; the browser tool said "The Browser pane is currently hidden"). The page reported `document.visibilityState` "visible" throughout, and the run completed without a reload.
- The page's gear before this run was not saved. It was replaced by Phase 2 "BiS 6%" and stays so. The fight is back to the time-based export. This is browser localStorage for `localhost:5173` in the Browser pane, not a tracked file.

## Proposed line for the `WORKER_SILENCE_LIMITS` comment

Append after the rogue line in `ui/core/components/individual_sim_ui/upgrades/adapters/worker_pool_sim_runner.ts` (the list is append-only):

```
 * - feral cat, desktop build (HTTP worker, `:3333`): start-up 0.7 s, warm-up regime 4.3 s,
 *   main loop 4.5 s (ticket 557, 557-desktop.md); the desktop worker leaves the warm-up
 *   regime at its first poll, so its warm-up is judged against the run limit
```

The 4.5 s also makes the run limit 6.7 times the longest silence measured, not ten times. If the comment states a margin for the run limit, that sentence needs the same decision as `runMs`.
