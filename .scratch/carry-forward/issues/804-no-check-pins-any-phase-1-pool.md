Status: closed
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

## Comments

2026-11-06 (closed, slice D executor): fixed in fork commit
`24f6575ca` "Pin the phase-1 pool of every spec" on fork branch
`feat/452-meta-repair-hit-cap`, carried into this repo by the
main-repo commit "Re-pin the fork for the hit policy and phase-1
cells" on `feat/452-meta-repair-hit-cap` (the commit that closes this
ticket). The fork's history has no line saying phase 1 was left out
on purpose; the old phase-1 lines are about the p2-p5 candidate lists
that ADR-0038:222 replaced.

The numbers come from the script that measured the 44 existing cells,
`measure_pool_rule.py` (2026-10-17), found in the main checkout at
`/home/daniel/Code/lulz/tbc-gear-prio/.scratch/stage-gate/tab-wowsims-items/poolrule/`
and copied into this slice's stage folder
`.scratch/stage-gate/452d-meta-repair-hit-cap/poolrule/` (gitignored).
It reads `db.json`, the presets and the gear JSON itself and imports
nothing from `pool_source.ts`. Edits to the copy: `REPO`/`PAIR` set to
the worktree; the missing-effects count assert (450) replaced by a
print (449 today); the universe read falls back to an empty universe
when a cell's file is absent (no phase-1 universe file exists; the
universe feeds only the comparison columns, never the pool sizes); and
ticket 686's BiS rule (every preset of the phase counts as BiS). Run
with `--picker --default-run`, it first reproduced all 44 committed
cells exactly, then measured the 11 phase-1 cells with no further
edit. The fixture now holds 55 cells, its `_comment` records the
method, and `pool_source.test.ts` expects 55.

Verified by: tbc-new-fork@24f6575ca21e75bcf0df78e3e2ad593671a22a20;
`vendor/tbc-new-fork/node_modules/.bin/vitest run --root vendor/tbc-new-fork ui/features/upgrades/model/pool_source.test.ts`
(124 passed)
