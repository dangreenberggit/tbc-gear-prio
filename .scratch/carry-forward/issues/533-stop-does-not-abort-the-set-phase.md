Status: closed
Type: defect
Origin: pre-merge review round 10 of feat/tab-signoff-followups, finding A4 (`docs/reviews/feat-tab-signoff-followups.md`), 2026-10-02
Blocks: none
Blocked by: none
Related: 511, 512, 526, 347

# Stop does nothing while the set phase runs

## What was found

The Upgrades tab's Stop button only calls `abortController.abort()`
(`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`,
about lines 1485-1487, at fork `f09d218e`). In the fork engine's
`upgrades/engine/rank.ts`, `signal` is read before `buildSetBonuses`
(about line 1636) and not after it. None of the set-phase sims that
tickets 511 and 512 added checks it: the worn-set ladder, the set screen,
the same-gear gates, the crossing gates, the step-gear sims and the
bonus-off sims.

So a Stop pressed during the set phase waits for that phase to finish
and then gets a complete ranking. How long the wait is on a real run is a
hypothesis, untested. The set phase runs many sims per set, and a full
feral run takes about nine minutes.

Found by reading the code (review finding A4). Nobody ran the tab to
file this.

## What would close this

1. Every set-phase sim loop in `rank.ts`, `set-screen.ts` and
   `set-less-copies.ts` checks `signal` (or passes it to the sim seam), and
   an aborted set phase returns the same aborted result as an aborted
   candidate loop.
2. A test in `packages/core/test/fork-set-net.test.ts` aborts during the
   set phase and asserts that no further set sims are dispatched.
   Command: `npx vitest run packages/core/test/fork-set-net.test.ts; echo rc=$?`
   (the suite is fork-gated, so CI skips it).
3. The engine change follows the PROVENANCE cycle in
   `docs/agents/known-traps.md` § Before editing a ported engine file.

## Closed 2026-10-02

Plan: `.scratch/stage-gate/533-stop-set-phase/plan.md` (gitignored). An
independent reviewer passed it with two comment findings, fixed in the
fourth fork commit.

**Scope was widened** to paired replication, which also ran after the
candidate loop and never read the signal. The orchestrator's ruling
(Q-533-replication): "widen 533 to cover the paired-replication pass", and
"Drop the part-way replication, don't keep or finish it", because the tab's
stopped state shows no rows (`upgrades_tab.tsx`, ticket 286).

Fork commits (`dangreenberggit/tbc-new`, branch `feat/upgrades-tab`):

- `74db453ff` Check Stop before every set-phase sim. `rankUpgrades` gives
  `buildSetBonuses` and `measureSetSteps` a runner that throws
  `StopRefusedSim` before it starts a sim once `Deps.signal` has aborted.
  An aborted run drops every set-phase output, so it returns the same
  `PartialRanking` as a Stop during the last candidate sim.
- `84c841cf8` Skip set-phase sim warnings after Stop (`rank.ts` and
  `set-screen.ts`).
- `105a6f38e` Check Stop before every replication sim. Replication returns
  its paired deltas, and the call site writes them only when the run was
  not stopped.
- `26a89e58d` Tidy Stop-guard comments (review findings F1, F2).

Main re-pin: `a489955e` Re-pin fork to 26a89e58d for ticket 533. The tests
are in `packages/core/test/fork-set-net.test.ts`: 533-S/W (three
scenarios), 533-R and 533-K.

Red outputs, before each fix
(`npx vitest run packages/core/test/fork-set-net.test.ts -t "533"`, rc=1
each time):

- 533-S, before the guard: "Stop during call 4: expected 16 to be 5"
  (511-SR gear), "Stop during call 5: expected 20 to be 6" (492-F gear),
  "Stop during call 7: expected 23 to be 8" (case 8 gear). A Stop during
  the first set-phase sim still sent every later sim.
- 533-S/W, before the warning change: "Stop during call 4: expected "warn"
  to not be called at all, but actually been called 6 times", each with a
  `StopRefusedSim`.
- 533-R, before the replication change: "Stop during call 16: expected 24
  to be 17".

Checks at the re-pin, Node v22.17.1:

- `npx vitest run packages/core/test/wowsims-fork-parity.test.ts`: rc=0
  (E-W3) before each of the four hash moves.
- `npx vitest run packages/core/test/fork-set-net.test.ts packages/core/test/fork-set-fixtures.test.ts packages/core/test/fork-sim-database.test.ts packages/core/test/wowsims-fork-parity.test.ts --reporter=verbose`:
  rc=0, 94 passed, 1 skipped.
- `python scripts/check_engine_port_drift.py`: rc=0.
- `python scripts/check_fork_lint.py`: rc=0.
- `pnpm verify`: rc=0.

The live tab was not run. No recorded fixture captures a Stop.
