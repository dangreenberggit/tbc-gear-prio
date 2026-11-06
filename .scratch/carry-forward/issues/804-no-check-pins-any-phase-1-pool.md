Status: open
Type: task
Origin: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md (slice A audit of the per-spec checks, 2026-11-06)
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 452, 746

# No check pins the size of any spec's phase-1 pool

## What happens today

The tab offers phases 1-5
(`ui/features/upgrades/components/PhaseSelector/PhaseSelector.tsx:7` at
fork `b603564ee`, the pin on 2026-11-06), and phase 1 has a pool since
ticket 505 (`docs/adr/0038-fork-pool-comes-from-wowsims-at-run-time.md:222`).
But the fork's `ui/features/upgrades/model/pool_source.test.ts:16-17`
expects exactly 44 cells, "11 specs at phases 2-5", in
`pool_source.cells.fixture.json`. The slice A audit found no recorded
reason for leaving out phase 1 in the fixture's `_comment`, the test, or
ADR-0038. If the fork's history shows phase 1 was left out on purpose,
stop and report it.

So a change to db.json, the presets or the pool rule that changes a
phase-1 pool passes `pnpm verify`, for every spec.

## How

Measure each number of each phase-1 cell independently of `pool_source.ts`. The
fixture's `_comment` warns: "A size copied without that check pins
whatever the code does". The script that measured the existing cells is
not in any checkout (same `_comment`), so write the measurement down in
the `_comment` for the new cells. This is a fork change: it needs a pair
and the two-step re-pin (`docs/agents/paired-worktrees.md` § Re-pin after
a fork change). This ticket is worked in slice D, with 746, so one re-pin
carries both.

## Done when

The cells fixture has a phase-1 cell for each of the 11 spec ids, each of
its numbers (`exclude`, `include`, `bisRows`) measured independently, the `_comment` says how, the test expects 55
cells, and the re-pin is on the branch.
