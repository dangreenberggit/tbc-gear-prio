Status: open
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
