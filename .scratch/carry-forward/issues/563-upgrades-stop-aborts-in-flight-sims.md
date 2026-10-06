Status: open
Type: task
Origin: stage 558-p2-results-parity, plan step 17 (`.scratch/stage-gate/558-p2-results-parity/plan.md`, gitignored, owner's checkout); carried from ticket 559
Blocks: none
Blocked by: none
Related: 558, 559, 560

# Stop on the Upgrades tab could abort the sims already running

## Owner's ruling this follows

> Stop resulting in a fairly quickly graceful finish of currently running sims is fine for now.

(2026-10-06, row Q-559-stop-abort in `.scratch/stage-gate/558-p2-results-parity/decision-log.md`, gitignored, owner's checkout.) "For now" leaves a real abort as later work. This ticket records it so the finding does not get lost. It is not a request to start it.

## What happens today

Ticket 559 chose option (a): Stop aborts no sim. The engine checks `signal.aborted` between sims. It returns a `PartialRanking` with every row simmed so far, and the hook shows it as `stopped`. While the in-flight sims finish, the progress dialog says "Stopping — finishing the current step."

Measured wait from the Stop click to the dialog closing, ret, previous-phase preset gear, 3000 iterations:

- P1: 18.7 s for ret and 36.3 s for feral (`.scratch/stage-gate/558-upstream-react-port/live-check.md`).
- P2 at fork `b15f397cb`: 7.12 s for ret. There were 5 rows at the click and 9 rows were kept (`.scratch/stage-gate/558-p2-results-parity/live-check.md`).

Both files are gitignored, in the owner's checkout. The wait depends on where the in-flight sims are when Stop lands (hypothesis, untested).

## What a real abort costs

Making the adapter abort is simple. `WorkerPoolSimRunner.run` registers each sim on its own `SimSignalManager`, and `abortType` would reject every in-flight sim (`ui/features/upgrades/model/adapters/worker_pool_sim_runner.ts:199,217`; `ui/sim/sim_signal_manager.ts:76`). The work is in the engine, because only the candidate loop turns a rejected sim into a skipped row (`rank.ts:1604`). At fork `b15f397cb`, in `ui/features/upgrades/model/engine/rank.ts`, these seven sim sites would each need to treat an error raised after `signal.aborted` as a Stop:

1. Baseline: `rank.ts:1099`, which wraps any error as `RankError("sim-failed")`.
2. Replication: `simFor` at `rank.ts:2158`. It passes only the module-private `StopRefusedSim` (class at `rank.ts:3993`) through and wraps everything else. Its callers are at 2114 and 2130.
3-7. The set phase: `rank.ts:2229`, `2624`, `2986`, `3462` and `3983`, which handle errors in different ways.

Without that, an abort during the baseline or replication shows the error state instead of "Stopped" (`plan-review.md` round 1, F1).

The same edits are needed in:

- the parity twin `packages/core/src/rank.ts` in this repo, so that `packages/core/test/wowsims-fork-parity.test.ts` (E-W3) stays green;
- the PROVENANCE cycle for a ported engine file (`docs/agents/known-traps.md`, "Before editing a ported engine file"), followed by a fork re-pin.

Also check `SimSignalManager.abortType`. It awaits each trigger while it iterates a live `Map`, so a run started right after a settled Stop could have its sims aborted. The adapter should snapshot its own in-flight set (`plan-review.md` round 1, F14).

## Done when

- Stop aborts the in-flight sims in every phase: pool building, baseline, candidate loop, set phase and replication. Each phase ends in `stopped`, never `failed`.
- Tests run on the real engine and cover a Stop in each of the four sim phases: baseline, candidates, set phase and replication. Ticket 533's tests in `packages/core/test/fork-set-net.test.ts` are the pattern.
- The parity test passes, and `pnpm verify` is green with the lock on the new fork tip.
- An L6 live check measures the Stop → dialog-closed time and compares it with the figures above.
