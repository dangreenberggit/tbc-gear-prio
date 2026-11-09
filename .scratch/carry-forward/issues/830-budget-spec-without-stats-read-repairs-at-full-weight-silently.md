Status: closed
Type: bug
Origin: docs/reviews/feat-452-meta-repair-hit-cap.md (round 1, A4)
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 535, 746

# A budget spec ranked without a stats read repairs hit at full weight and says nothing

## What is wrong

When meta repair runs for a spec whose hit policy is a budget (ret,
feral, mage, shadow, warlock) and the sim runner has no `computeStats`,
repair counts hit gems at full value and the ranking carries no note
saying so. A full-weight spec in the same case does get its note.

- Fork `ui/features/upgrades/model/engine/rank.ts`: the budget path runs
  only under `if (hitCapReadable)`, and the full-weight note is pushed
  only in its `else if (capProfile.repair.kind === "fullWeight")`
  branch, so a budget spec with no reader gets neither.
- Main-repo test 535-S7 (`packages/core/test/fork-meta-repair.test.ts`)
  pins this silence for ret.
- Since ticket 535 this held for ret and feral; since ticket 746 it also
  holds for mage, shadow and warlock.

## Who reaches it

The tab's runner always has `computeStats`
(`ui/features/upgrades/model/adapters/worker_pool_sim_runner.ts:221` in
the fork), so the tab does not. The CLI path and tests without a stats
reader do (pre-merge review round 1, A4).

## Done when

A budget spec ranked by a runner without `computeStats` either gets a
note in the ranking's `substitutions` that says hit was counted at full
value, or is shown never to reach meta repair on that runner. A test
pins the chosen result in place of 535-S7's silence.

## Comments

## Closing note (2026-11-09)

Closed by showing that a budget spec never reaches meta repair without
a stats read. Fork commit `ed3255a80` on `fix/830-831-hit-budget` makes
`SimRunner.computeStats` required (`engine/seams/sim-runner.ts`),
removes the two `!deps.sim.computeStats` fallbacks in `engine/rank.ts`,
and passes the read through `stopGuardedDeps`, which used to drop it.
The fork's `RecordedSimRunner` rejects a read, because its recordings
hold sims only. So a hit-budget spec either repairs on its budget or
its run fails at the read; no silent full-weight path is left.

Chosen over the note because it removes the failure: the tab's runner
already had the read, and no CLI runs the fork engine (the main repo's
CLI runs `packages/core`), so a note would have named a case no player
can reach while test runners kept the silent path. The cost: tests that
ranked ret or feral on a runner without the read now run the budget
path the tab runs. `packages/core/test/fork-set-net.test.ts` run alone
took 24 s before and 184 s after
(`pnpm exec vitest run packages/core/test/fork-set-net`). A CPU profile
of its 497-A case (58 s) puts 41 s in `bestMinimalRepair`, the exact
repair search with the hit term, which the tab already runs for every
budget spec. 497-A's timeout rose to 180 s, and the file's
`runScenario` now yields to the event loop (`setImmediate`) before each
run: the fake sim answers in microtasks, so the longer file never gave
the loop back, and vitest's worker reported `Timeout calling
"onTaskUpdate"`, which failed `pnpm verify` with every test green.

Tests: main-repo 535-S7 now checks that ret, feral, mage, shadow and
warlock, on a runner with no `computeStats`, each fail at the first
read, after the baseline sim and before any candidate sim. 535-S2 and
705-W2, which pinned the full-weight repair of a runner with no read,
are deleted. The fork's `rank_cap.test.ts` pins the type: a `SimRunner`
without `computeStats` is a `@ts-expect-error`, so the fork's
type-check fails if the method turns optional again. Test runners that
lacked the read got one: `zeroHitStats` in
`packages/core/test/fork-engine-harness.ts`, and a `RecordedSimRunner`
subclass in E-W3 (`wowsims-fork-parity.test.ts`), which stays green.

Verified by: tbc-new-fork@ed3255a8036f63e75e25f732b5c3147a40a908f9;
`node --version; pnpm exec vitest run packages/core/test/fork-meta-repair.test.ts packages/core/test/wowsims-fork-parity.test.ts`
(52 passed); `node --version; pnpm verify` (rc 0, 4 min 52 s; `gates:
1612 ran, 0 skipped`; its fork tests check ran 825 tests at
`tbc-new-fork@ae2c8afc1`).
