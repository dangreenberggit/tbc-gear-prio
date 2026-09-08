# Brief — batch-sim follow-up tickets (347, 349 | 345, 346, 348)

Opened 2026-09-02 on `feat/upgrades-tab-batch-sim` (outer 4d5bcbc, fork
20dbb6f5d, tree clean). Parent stage: `.scratch/stage-gate/batch-sim-web-local/`
(decision-log.md, execution-ledger-{web,local}.md, review at
docs/reviews/feat-upgrades-tab-batch-sim.md). Owner's rule: these tickets
are cleared through the orchestration loop BEFORE any merge ask.

Two tracks, planned separately, executed in parallel worktrees if their
files are disjoint (verify before spawning).

## Track A — code (tickets 347, 349)
- 347: Stop does not cancel an in-flight bulk screening chunk on either
  transport; per-chunk fresh signals cannot support a pre-dispatch check
  (see ticket for the three ranked options + acceptance + the chunk-failure
  rider). Both runners must behave identically.
- 349: `MAX_CANDIDATES_PER_BULK_REQUEST = 25` is validated only at 5,000
  iterations; the no-cull boundary moves DOWN as iterations rise; nothing
  couples `input.iterations` to the bound.
Done means: both tickets' acceptance checklists satisfied; tests at the
`rankUpgrades` seam or pure-function level; `pnpm verify`, fork typecheck
and the layout gate green; PROVENANCE cycle for any engine edit; tickets
closed with their resolution written in.

## Track B — measurement (tickets 345, 346, 348)
- 345: re-verify equivalence condition (c) with a design the metric can
  express (deeper ranked set and/or the loop-vs-loop seed control, half done).
- 346: bulk measured 1.6x slower on WASM at UNMATCHED accuracy (adaptive
  7,091 vs flat 5,000 iterations); re-measure at matched accuracy — this is
  the named revisit trigger for the WASM bulk default.
- 348: ~1.6% multiplicative bulk-vs-loop slope on deep downgrades; may close
  into 346 if it vanishes at matched accuracy.
One measurement campaign answers all three. Pre-register win conditions
before running. Runs are hours of in-browser compute: a single owner of the
browser, 15-minute wait discipline, evidence dumps committed under this
stage dir. Done means: each ticket carries its measured answer and is
closed, or is re-scoped to a precise follow-up with numbers.

## Constraints (unchanged)
No wowsims file edits (`vendor/tbc-new-fork` outside `upgrades/` +
`upgrades_tab.tsx` is read-only). Measured beats modelled; state what was
held constant before reporting a difference. A candidate approach the plan
drops carries a stated reason.
