Status: closed
Type: task
Origin: stage 558-p3-settings-gates, chunk K4 step 16 (`.scratch/stage-gate/558-p3-settings-gates/cdp-k4.md`, gitignored, owner's checkout); filed at Gate C K4 (amendment A-K4-ticket-566 in that stage's `plan-review.md`)
Blocks: none
Blocked by: none
Related: 560

# Upgrades tab: the run's progress counter ends short of its total

## What was seen

A capped live run on the React Upgrades tab ended with the progress dialog reading **42/63**. The run finished normally (`done: true`), so 21 of the 63 steps the counter promised were never taken.

The run: retribution, the page's default phase 3, start gear the `P2` preset, cap 10 candidates, 500 iterations, fork `feat/upgrades-tab-react` at `b5178bbf7` (tab code; only the harness differed). Command, from the fork worktree `C:/Users/dgree/Code/lulz/tbc-gear-prio-wt-react-port/vendor/tbc-new-fork` with `WASM_WORKER=1 node node_modules/vite/bin/vite.js serve --port 5174 --strictPort` running:

```
node ui/features/upgrades/tools/run-tab-cdp.mjs --origin http://localhost:5174 --phase 3 --candidates 10 --iterations 500 --preset-tab "Phase 2" --preset P2 --trace-tail --out <dir>
```

`--trace-tail` writes `<dir>/tail.jsonl`, one sample of the dialog's stage message, counter text and row count every 500 ms. In the recorded trace (`C:/Users/dgree/Code/lulz/tbc-gear-prio/.scratch/stage-gate/558-p3-settings-gates/cdp-k4/tail.jsonl`, gitignored, owner's checkout, 68 samples):

- the counter reached 27/63 when the last row landed, at 9.35 s;
- it then advanced one step every 1.0-2.0 s under "Re-simming the top rows" to 42/63 at 33.67 s;
- the run settled at 34.17 s with the counter at 42/63.

The ranking is not affected: the run's rows and baseline DPS (2,093.7) matched the earlier part's capped run.

## Cause

Hypothesis, untested: the total budgets re-sims for more rows than the re-sim stage runs (for example, for every candidate where only the top rows are re-simmed). Where to start reading, in the fork under `ui/features/upgrades/`:

- `model/engine/rank.ts:1652`, `:1749` and `:2145` (`totalSims`, `totalSimsForProgress`), the engine's `simming` progress events;
- `model/run_progress.ts:54` (`replicationBoundary`) and `:306` (`observeSimming`), which turn those events into the dialog's `done/total`;
- `utils/format.ts:124` (`progressBarOf`), which hands `done`/`total` to the dialog.

## What this ticket must settle first

Check the old tab before changing anything: run the same capped run on the old tab (fork commit `cb561067`, `ui/core/components/individual_sim_ui/upgrades_tab.tsx`) and read where its counter ends. If the old tab also ends short, this is an old bug in the engine's total and the React port carries it unchanged. If the old tab reaches its total, the React port's progress code (`model/run_progress.ts`) introduced it.

## Done when

A capped run ends with the counter's done equal to its total, or the dialog's total is documented as an upper bound with the reason; the same trace command above shows it; and the ticket names which of the two cases it was.

## Finding (2026-10-07, stage 566-progress-total, branch `feat/upstream-react-port`)

Fixed. The case is **old engine bug, carried unchanged**.

**Cause.** The engine sets the total once, before ranking, as `1 + c + (seeds - 1) * (1 + min(8, c))`, where `c` counts the first `cap` candidates plus every worn item outside them (`git -C vendor/tbc-new-fork show 095e0afa2:ui/features/upgrades/model/engine/rank.ts | sed -n '1416,1428p'`). Replication then re-sims only the rows above the cutoff, at most 8, and none when no row qualifies, and each re-sim resent that first total unchanged (same file, `:1766-1778` and `:1803-1812`). In the run above, `c` was 26 and 3 rows cleared the cutoff, so the total was 63 and the run took 43 sims.

**Old tab comparison.** This command compares the old tab's engine with the React port's engine before the fix, and prints nothing (grep rc 1, re-run 2026-10-07):

```
git -C vendor/tbc-new-fork diff cb561067:ui/core/components/individual_sim_ui/upgrades/engine/rank.ts 095e0afa2:ui/features/upgrades/model/engine/rank.ts | grep -nE '^[-+].*(totalSims|replicaSims|bumpProgress|simsDone)'
```

Fork commit `407433773`'s body gives the same comparison with `HEAD` in place of `095e0afa2`. Read it with `095e0afa2`: `HEAD` now includes `407433773` itself, so that form prints the fix's own lines (4 lines at fork `d580988a3`).

**Fix.**

- Fork `feat/upgrades-tab-react`, `407433773`: `replicateTopItems` in `model/engine/rank.ts` restates the total once it knows how many rows it re-sims, in one extra `simming` event; `model/run_progress.ts` takes that total as the final count (`finalTotal`); the `rank.ts` row in `model/engine/PROVENANCE.md` carries the new sha256.
- Fork `d580988a3`: `tools/run-tab-cdp.mjs --trace-tail` records every change of the counter text as `result.json`'s `counterChanges`.
- Port `9ce92a9b`: the same hunk in `packages/core/src/rank.ts`, the tests below, and the re-pin to `407433773`. Port `e4320d30`: re-pin to `d580988a3`. Port `e6bf063a`: layout baseline.

**Tests**, in `packages/core/test/fork-run-progress.test.ts` (`npx vitest run packages/core/test/fork-run-progress.test.ts`):

- "ends with done equal to total", over four recordings: `seven`, `twelve`, `zero-qualify` and `capped`. Before the engine fix, `seven`, `zero-qualify` and `capped` failed and `twelve` passed (3 failed, 53 passed).
- "caps the candidates and has fewer rows above the cutoff than the cap", which checks the `capped` recording.
- "uses total when a replication event passes the projection and no total was restated" and "returns the restated total when there is one", two pure tests of the tracker's final count.
- "N3 and N4: counts a row after the boundary event, then takes the engine's total" replaces "... then self-checks".

After the fix the file passed 58 of 58. The red and green logs are `test-red.log` and `test-green.log` in `.scratch/stage-gate/566-progress-total/` (owner's checkout, gitignored).

The core twin has its own test, added at the close: "restates the total after ranking and ends on done === total" in `packages/core/test/rank.test.ts` (`npx vitest run packages/core/test/rank.test.ts -t "ticket 566"`). It runs core's `rankUpgrades` with five seeds on the M1 block's synthetic sim and checks that the first `simming` event after `ranking` repeats `done` with `done + (seeds - 1) * (1 + rows re-simmed)`, and that the last `simming` event has `done === total`. With `packages/core/src/rank.ts` put back to port `60d6fbc1` it fails (`expected 7 to be 6`: no restating event, so the first event after `ranking` is already a re-sim); with the fix it passes. E-W3 compares rankings only, so before this test nothing checked core's progress events.

**Live run.** The command above, at fork `407433773` plus the `counterChanges` edit that became `d580988a3`, on a `WASM_WORKER=1` dev server on port 5174 (`cdp-566.md` in the same stage folder). The counter read `27/63` when the last candidate landed, then `27/43` at 7.42 s: the engine restated the total from 63 to 43. 43 is the formula with 3 rows re-simmed: `1 + (10 + 16) + 4 * (1 + 3)`. It then stepped to `42/43` at 25.28 s, and the run settled at 26.4 s. Baseline DPS was 2,093.7, as in the run above.

**The last tick.** The last counter text written to the page was `42/43`, not `43/43`. The 43rd sim is the completion that closes the dialog, and the dialog's bar is upstream's `ui/ui-kit/ProgressTrackerDialog/ProgressTrackerBar.tsx` (`git -C vendor/tbc-new-fork cat-file -e 42c75dc9:ui/ui-kit/ProgressTrackerDialog/ProgressTrackerBar.tsx` succeeds). Drawing that tick would need a change near that upstream-owned file. The session ruled to close on the exact total; its line in the stage's `decision-log.md`:

> 2026-10-07T10:19Z | ef13ce60-a835-4a9f-b024-892080124bda | row Q-566-last-tick | accepted (session ruling): close 566 | the bug was the total (63 against 43 steps run), now exact; the last tick is the completion that closes the dialog, and drawing it would need a delay or a change near upstream's ProgressTrackerBar (upstream-owned) for a frame nobody reads; the executor's "the owner raised the visible counter" is wrong: the session filed 566 from K4's executor note | evidence: cdp-566.md counterChanges; ui/ui-kit/ProgressTrackerDialog/ProgressTrackerBar.tsx upstream-owned per report

**SHAs.** Fork `feat/upgrades-tab-react`: `407433773040bb0cfd621553aab92049936cb6dd`, `d580988a3375e06b86839450d279077d6ca2fb93`. Port `feat/upstream-react-port`: `9ce92a9b57ea9dedf16513b45b3e057cb4f322b7`, `e4320d30ab74d2036c832807a8a2c513ab00e640`, `e6bf063a8a3525be46c0cdf83993a94ec7cd161f`.
