Status: open
Type: task
Origin: pre-merge review round 14 on feat/round-11-followups, findings R14-A3, R14-P1, R14-A4, R14-ST2, R14-ST3, R14-P2, R14-ST4 and R14-ST6, 2026-10-05
Blocks: none
Blocked by: none
Related: 545, 553

# Ticket 545's silence check: tests miss the tab's wiring, and three comments are wrong

## What is wrong

Line numbers are in `vendor/tbc-new-fork` at fork `b8ba9b800` and in the
main repo at `63c55c03`.

1. **No test reaches the tab's wiring (R14-A3, R14-P1).** Every pool test
   in `packages/core/test/fork-worker-silence.test.ts` builds its own
   `WorkerPool` with test limits (`POOL_LIMITS`, `:247`). No test refers
   to `WORKER_SILENCE_LIMITS` or `WorkerPoolSimRunner` (`grep -c` gives
   0). If the `{ silence: WORKER_SILENCE_LIMITS }` option were dropped at
   `upgrades/adapters/worker_pool_sim_runner.ts:117`
   (path under `ui/core/components/individual_sim_ui/`), every test would
   still pass.
2. **The two ranking-level cases would pass without ticket 545 (R14-A3).**
   The new `describe` in `packages/core/test/rank.test.ts` and
   `fork-worker-silence.test.ts:466-494` use a stub sim whose `run` throws
   the silence text. That checks the rule that a thrown sim error becomes
   `sim-failed`, which this range did not change. Their names promise
   more.
3. **Paths with no test (R14-A4).** A worker being retired
   (`shouldDestroy`, `ui/core/worker_pool.ts:515`), two sims on one
   worker, and an abort during a silence.
4. **Three comments say more than the code does.**
   - `worker_pool_sim_runner.ts:53-55` says each limit is "ten times the
     longest silence measured"; the run limit is the 30 s floor, as the
     same comment says later (R14-ST3).
   - `worker_pool.ts:88` says pages without the option "behave as
     before"; the `finally` at `:303-306` removes the progress entry on
     every page (R14-P2). The change is harmless on success, but the
     comment should say it.
   - `worker_pool.ts:274-276` states "a worker never posts an error under
     a progress id" as fact; it is code reading (R14-ST2). Cite the code
     or say "hypothesis".
5. **Small cleanups.** `SimWorker.hasWaitersOtherThan` rebuilds the
   progress-id format at `worker_pool.ts:509`, which `getProgressName`
   (`:141`) already owns (R14-ST4). Test names and comments use
   gitignored plan labels such as "(D-N1)" and "(D-N2)"
   (`fork-worker-silence.test.ts:122`, `:356`); say what is tested instead
   (R14-ST6).

## What would close this

1. A test that builds the tab's sim runner (or reads its pool's options)
   and fails if the silence option or its limits are dropped.
2. Either rename the two ranking-level cases to what they check, or
   remove one, since both check the same existing rule.
3. Tests for the paths in item 3, or a recorded reason to skip each.
4. The comment and cleanup fixes in items 4 and 5: one fork commit and a
   re-pin, per AGENTS.md "The forked tab repo".
