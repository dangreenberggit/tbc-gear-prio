Status: open
Type: task
Origin: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md (slice A audit of the per-spec checks, 2026-11-06)
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 452

# No check pins the size of any spec's phase-1 pool

## What happens today

The tab offers phases 1-5
(`ui/features/upgrades/components/PhaseSelector/PhaseSelector.tsx:7` at
fork `b603564ee`, the current pin), and phase 1 has a pool since ticket
505 (`docs/adr/0038-fork-pool-comes-from-wowsims-at-run-time.md:222`).
But `ui/features/upgrades/model/pool_source.test.ts:16-17` expects exactly
44 cells, "11 specs at phases 2-5", in `pool_source.cells.fixture.json`.
No recorded reason for leaving out phase 1 was found.

So a change to db.json, the presets or the pool rule that changes a
phase-1 pool passes `pnpm verify`, for every spec.

## Done when

The cells fixture has a phase-1 cell for each of the 11 spec ids, measured
the way its `_comment` says, and the test expects 55 cells.
