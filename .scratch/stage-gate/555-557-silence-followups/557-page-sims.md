# 557 page sims: warm-up cost per iteration for hunter, enhancement shaman, rogue

Measured 2026-10-05 on the dev machine (`navigator.hardwareConcurrency` 20), browser build (wasm), page Simulate in one Browser-pane tab. Fork `4cdc02b8a` plus two temporary probe lines in `ui/core/worker_pool.ts` (reverted, see Commands). All times are `performance.now()` on the page's main thread.

## Verdict

All three specs pass the 120 s warm-up limit by a wide margin. The slowest warm-up iteration measured is 214 ms (enhancement shaman), against the 1.2 s threshold (100 iterations, fork `sim/core/presim.go:35`).

| Spec | Warm-up (max `S_presim`) | Warm-up per iteration | Main loop per iteration | Longest main-loop silence | Against 1.2 s per iteration |
| --- | --- | --- | --- | --- | --- |
| hunter (BM, pet) | 15.08 s | 147-151 ms | 145-182 ms | 1.16 s | pass (8x under) |
| enhancement shaman (totems) | 21.43 s | 211-214 ms | 202-230 ms | 1.27 s | pass (5.6x under) |
| rogue (combat swords, dual wield) | 15.71 s | 155-157 ms | 148-201 ms | 1.48 s | pass (7.6x under) |

**Finding for the limits rule, not a failure.** The 553 plan's rule sets the presim limit at `10 × max(S_presim)`, rounded up to 10 s (`.scratch/stage-gate/553-554-silence-followups/probe.md`, Verdict table). All three new warm-ups are longer than feral's 11.7 s, the previous maximum. Under that rule, enhancement shaman's 21.43 s gives 214.3 s, rounded up to **220 s**; the current limit is 120 s. The limit still holds for every measured warm-up (21.4 s is 18% of 120 s), but the tenfold margin no longer does. The run rule is unchanged: `10 × 1.479 s = 14.8 s`, below the 30 s floor, so 30 s stands. Whether to raise `presimMs` or to accept a smaller margin is a decision for whoever owns ticket 556/557; this run changed nothing.

## Per spec

Column meanings follow `probe.md`: `S_first` = post to first message; `S_presim` = post to that request's first `PresimRunning: false`; `S_gap` = longest gap between consecutive messages of one request after that `false`. "Main loop per iteration" = (final message − first `false`) / 25. The page splits 100 iterations into four `raidSimAsync` requests of 25 on page workers 0-3, all with one request id; each request runs its own 100-iteration warm-up, so the four warm-ups run at the same time.

### Hunter, `http://localhost:5173/tbc/hunter/dps/`

- Page phase "Phase 3 (2.2 - T6)". Gear: Gear tab, phase tab "Phase 2", Gear Sets, Beast Mastery "2H - 6% hit" (the page default build is `P3_BM_2H_6P_GEARSET`, `ui/hunter/dps/sim.ts:73`). Pet: Ravager, uptime 100%.
- Request `raidSimAsync-4ad75c3dc72ebeef`. DPS shown 3062.92 (±27), DUR 1982.35 s. First post to last message 19.24 s.

| Worker | `S_first` ms | `S_presim` ms | Warm-up ms/iter | Main loop ms | Main loop ms/iter | `S_gap` ms | Iterations |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | 45.9 | 14,683.7 | 146.8 | 4,554.4 | 182.2 | **1,160.5** | 25 |
| 1 | 30.2 | 14,830.8 | 148.3 | 3,782.2 | 151.3 | 201.0 | 25 |
| 2 | 34.2 | **15,078.5** | 150.8 | 3,662.4 | 146.5 | 178.1 | 25 |
| 3 | 26.8 | 15,034.2 | 150.3 | 3,626.1 | 145.0 | 183.8 | 25 |

### Enhancement shaman, `http://localhost:5173/tbc/shaman/enhancement/`

- Page phase "Phase 3 (2.2 - T6)". Gear: Gear tab, set "P2 Preset" (the page held "P3 Preset" before).
- Request `raidSimAsync-a37ff7ab87489bcb`. DPS shown 2050.91 (±275), DUR 3038.69 s. First post to last message 27.11 s.

| Worker | `S_first` ms | `S_presim` ms | Warm-up ms/iter | Main loop ms | Main loop ms/iter | `S_gap` ms | Iterations |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | 34.3 | 21,347.9 | 213.5 | 5,759.0 | 230.4 | **1,268.5** | 25 |
| 1 | 35.3 | 21,137.3 | 211.4 | 5,052.0 | 202.1 | 298.4 | 25 |
| 2 | 26.0 | **21,427.2** | 214.3 | 5,256.9 | 210.3 | 332.4 | 25 |
| 3 | 35.4 | 21,248.3 | 212.5 | 5,078.6 | 203.1 | 297.5 | 25 |

### Rogue, `http://localhost:5173/tbc/rogue/dps/`

- Page phase "Phase 3 (2.2 - T6)". Gear: Gear tab, set "P2 Swords" (main hand 30082, off hand 32027: dual wield). The page held gear that matched no preset chip before (Warglaives 32837/32838); it was restored, see Settings.
- Request `raidSimAsync-dd842493d9543666`. DPS shown 1957.68 (±18), DUR 3101.53 s. First post to last message 20.54 s.

| Worker | `S_first` ms | `S_presim` ms | Warm-up ms/iter | Main loop ms | Main loop ms/iter | `S_gap` ms | Iterations |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | 32.2 | 15,513.1 | 155.1 | 5,022.5 | 200.9 | **1,479.1** | 25 |
| 1 | 29.1 | 15,520.1 | 155.2 | 3,690.6 | 147.6 | 176.9 | 25 |
| 2 | 26.5 | **15,713.7** | 157.1 | 3,770.4 | 150.8 | 234.4 | 25 |
| 3 | 38.1 | 15,616.6 | 156.2 | 3,715.2 | 148.6 | 184.4 | 25 |

## Can the page's own display replace the probe lines?

**Partly: the display marks when the warm-up ends, but the page shows no time.** Checked on enhancement shaman and rogue by polling the text of the page's `.results-sim` element every 50 ms during the run.

- During the warm-up the sidebar shows "0.00 0 / 100 iterations complete". It does not show the "presim running" text that `ui/core/components/sim_action.tsx:154` can render; hypothesis, untested: the page's combined progress for its four requests drops `presimRunning`.
- The display changes to "1 / 100" when the first main-loop iteration lands. Enhancement shaman: first post 76,022.7 ms, display left "0 / 100" at 97,402.4 ms, so 21.38 s; the probe's maximum `S_presim` is 21.43 s. Rogue: 58,437.2 ms to 74,145.5 ms, so 15.71 s; the probe gives 15.71 s.
- The final result shows only DPS (± stdev) and DUR. A search of the page text after the run found no elapsed time (`Took`, `ms`, `seconds`, `elapsed`: no match).

So a person with a stopwatch, from the Simulate click to the change from "0 / 100" to "1 / 100", gets the warm-up within the stopwatch's error (the click-to-first-post delay is about 0.1 s here: the display went blank at 76,100.8 ms, 78 ms after the first post). Dividing by 100 gives the per-iteration cost. It cannot give the per-worker split or the main-loop silences; those need the probe lines.

## Observations the tables do not show

- In all three specs the longest main-loop silence is on page worker 0 and falls between its first `false` and its first completed iteration (enhancement shaman: 97,370.6 to 98,639.1 ms). Feral's 1.020 s in 545 2c was also on page worker 0 (`measurement.md`, Results). Why worker 0 is slower is a hypothesis, untested.
- Cost per simulated second of warm-up (warm-up ms per iteration / DUR): hunter 0.076 ms/s, enhancement shaman 0.070 ms/s, rogue 0.051 ms/s, against feral 0.043 ms/s (117 ms, from its 11.7 s warm-up, / 2,691 s) and shadow priest 0.012 ms/s (44.7 ms / 3,822 s). Hunter and enhancement shaman are the costliest per simulated second measured so far, which agrees with Round 14's expectation.
- The page workers run four warm-ups at once, as the tab's pool does. A single worker alone may run faster (hypothesis, untested).

## Settings

- Fight, all three specs: page Export → JSON, `encounter.useHealth` set to `true` (`targets[0].stats[33]` was already 6,070,400 on all three pages), imported with Import → JSON. Checked on hunter by exporting again (`useHealth: true`, health 6,070,400, equipment unchanged); on the other two by the duration fields becoming disabled. Page iterations 100 (set after the import, because Import → JSON resets iterations to 12,500). Page Simulate once per spec.
- Console showed `Worker N: Ready, isWasm: true` for workers 0-3 on each page; no request to `localhost:3333` was in the network log.
- Restore after each probe:
  - Enhancement shaman: the same JSON imported with `useHealth: false`, then "P3 Preset". An export afterwards was identical to the export taken before the probe; iterations 12,500, as before.
  - Rogue: the export taken before the probe was imported back. An export afterwards was identical to it; iterations 12,500, as before.
  - **Hunter: not fully restored.** I changed the gear before saving an export, so the page's earlier gear (Cryptstalker Headpiece and Tunic, Bristleblitz Striker, matching no chip I checked) is lost. The page now has the fight back on time-based (`useHealth: false`, duration fields enabled), iterations back at 25,000 (the value it held before), and the Phase 3 Gear Set Beast Mastery "2H - 6% hit". This is browser localStorage for `localhost:5173` in the Browser pane, not a tracked file.

## Commands

- Wasm: not rebuilt. `dist/tbc/lib.wasm.gz` is dated Oct 4 18:19, 3,846,423 bytes (`ls -l vendor/tbc-new-fork/dist/tbc/lib.wasm.gz`); the latest fork commit under `sim/` is `536645d01` at 2026-10-04 13:13:28 -0700 (`git -C vendor/tbc-new-fork log -1 --format='%h %ci' -- sim/`).
- Server: **not started with `preview_start`.** The `wowsims-fork` entry in `.claude/launch.json` sets no `WASM_WORKER`, so it serves `local_worker.js` (desktop mode, `vendor/tbc-new-fork/vite.config.mts:23`). `.claude/launch.json` is tracked (`git ls-files .claude/launch.json`), so I did not add an entry. `WASM_WORKER` was unset in the process, user and machine environments. Instead, as in `probe.md`, PowerShell in the background: `$env:PATH="C:\Users\dgree\AppData\Roaming\fnm\node-versions\v22.17.1\installation;"+$env:PATH; $env:WASM_WORKER="1"; Set-Location C:\Users\dgree\Code\lulz\tbc-gear-prio\vendor\tbc-new-fork; node C:\Users\dgree\Code\lulz\tbc-gear-prio\vendor\tbc-new-fork\node_modules\vite\bin\vite.js serve --port 5173 --strictPort`. Before the start, `:5173` and `:3333` had no listener (`Get-NetTCPConnection -LocalPort 5173,3333 -State Listen`) and `preview_list` was empty. Stopped with TaskStop at the end; `:5173` had no listener afterwards.
- Probe lines, temporary, in `ui/core/worker_pool.ts`: `console.debug('[557] post', id, performance.now(), worker.workerId, totalIterations);` after `worker.noteAsyncStart(id);` in `doAsyncRequest`, and `console.debug('[557] progress', id, performance.now(), progress.presimRunning, progress.completedIterations, worker.workerId, progress.finalRaidResult != null);` after `ProgressMetrics.fromBinary(progressData)` in `newProgressHandler`'s returned function. In-page, `console.debug` was wrapped to push `[557]` lines into `window.__p557`; the served module was fetched and checked to contain both lines on each page before its run.
- Revert: the file was copied to the scratchpad before the edit (md5 `04deabc154f0025e492c346ef120a130`) and copied back; md5 after restore `04deabc154f0025e492c346ef120a130`. `git -C vendor/tbc-new-fork status --porcelain` printed nothing; fork HEAD `4cdc02b8a231e5376f2798be06348e00167868cc`.
- Analysis: in-page JavaScript over `window.__p557`, grouped by worker id (`[557] post` field 4, `[557] progress` field 6); see the column meanings above. Raw event arrays were not saved to files.

## Text for the `WORKER_SILENCE_LIMITS` comment's spec list

Proposed lines to append after the shadow priest line in `ui/core/components/individual_sim_ui/upgrades/adapters/worker_pool_sim_runner.ts:73` (the comment's list is append-only, decision-log row "K2 append-only spec list"):

```
 * - hunter (beast mastery, pet): warm-up 15.1 s, main loop 1.2 s (ticket 557)
 * - enhancement shaman (totems): warm-up 21.4 s, main loop 1.3 s (ticket 557)
 * - rogue (combat, dual wield): warm-up 15.7 s, main loop 1.5 s (ticket 557)
```

These lines make the sentence above the list at `:63-67` out of date: feral is no longer the longest warm-up, and the warm-up limit is now 5.6 times the longest one measured, not ten times. That sentence, and the `presimMs` value itself, need a decision before the lines go in (see Verdict).

## Specs not measured

None of the three asked for. Survival hunter, the other hunter and rogue builds, and elemental shaman were not run.
