Status: open
Type: performance
Origin: stage-gate run-progress-popover (ticket 542), round-4 estimator analysis, 2026-10-03; owner approved filing ("Ok")
Blocks: none
Blocked by: 542
Related: 542, 529

# The running table is rebuilt in full twice per finished candidate

## What is wrong

While a run is going, each finished candidate triggers two full rebuilds
of the Upgrades tab's running table: one for the progress tick and one for
the new row. Each rebuild copies, sorts and rebuilds every landed row, with
no throttle, and both finish before that pool worker sends its next
candidate. The cost per candidate therefore grows with the number of rows
landed. Fork commit `9b11bf214`: `upgrades_tab.tsx:1984-1992`, `:2943`
(`landedRowsTable`); `rank.ts:1647-1648`, `:1728`.

## Evidence

Run 1 of ticket 542 (full feral run, 364 candidates, concurrency 4):
from about the 219th candidate the sim server's busy cores fell from 13.4
to 9.5 and wall time per sim rose from 399 to 558 ms, while sim-server CPU
per sim stayed flat at 5.1-5.3 CPU-s. Re-run with
`node .scratch/handoffs/542-run-progress/replay.mjs .scratch/handoffs/542-run-progress/trace-run1.json --windows`
(the `--windows` flag lands with ticket 542's round-4 work). That the
rebuild causes the slowdown is a **hypothesis**: rebuild time was not
measured. Ticket 542's run 2 records long main-thread tasks to test it.
Ticket 529 records an unmeasured report of 2-second freezes on a 700-row
run.

## Done when

- The running table rebuilds at most once per animation frame, or appends
  rows instead of rebuilding.
- A full feral run is measured before and after, with wall time and the
  sim server's busy cores per window.
- Ticket 542's estimator constants (`slowdown`, `kappa`, `psi` in
  `run_progress.ts`) are refitted, because they model this rebuild cost.
