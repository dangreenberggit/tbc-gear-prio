Status: closed
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

## Closed 2026-10-05: fixed at fork 4cdc02b8a

Same fork commit and re-pin as ticket 553: fork
`4cdc02b8a231e5376f2798be06348e00167868cc` on `feat/upgrades-tab`, not
pushed; main commit `82ded354` "Re-pin fork to 4cdc02b8a for tickets
553 and 554". Plan and reports are in
`.scratch/stage-gate/553-554-silence-followups/` (gitignored).

1. **The tab's wiring is tested.** A new
   `describe("WorkerPoolSimRunner silence opt-in")` in
   `packages/core/test/fork-worker-silence.test.ts` builds
   `WorkerPoolSimRunner` through `importForkUpgrades`:
   - "fails a lookup on a worker that never becomes ready at the start
     limit, and restarts it". With `{ silence: WORKER_SILENCE_LIMITS }`
     removed from the runner, this case failed with
     `AssertionError: expected 'pending' to be 'rejected'` (run once,
     then reverted; K2 in `execution-report.md`).
   - "uses the limits the tab was measured for" pins
     `{ startMs: 140_000, runMs: 30_000, presimMs: 120_000 }`.
2. **Both ranking-level cases are renamed, not deleted.** Both
   `describe`s now end "a baseline sim rejection becomes RankError
   sim-failed with the sim's message" (`fork rankUpgrades` in
   `fork-worker-silence.test.ts`, `rankUpgrades` in `rank.test.ts`).
   Both `it`s read "maps the thrown error to sim-failed and keeps its
   text". They check a rule that holds with or without the silence
   check, and the names now say only that. The fork case stays because
   it is the only one that runs the fork's `rank.ts`.
3. **Untested paths.**
   - Two sims on one worker: "keeps the presim limit while any sim on
     the worker is before its main loop".
   - An abort during a silence: "an abort during a silence neither
     stops the check nor hangs". The sim and the abort request both
     reject at the limit, with no unhandled rejection.
   - A retiring worker (`shouldDestroy`): no test, skipped on purpose.
     The tab cannot reach it: `setNumWorkers` is called only by the
     page's own pool (`git -C vendor/tbc-new-fork grep -n setNumWorkers
     -- ui` gives `ui/core/sim.ts:177` plus `ui/core/worker_pool.ts`).
4. **The three comments are fixed.**
   - The `WORKER_SILENCE_LIMITS` comment gives each limit's rule
     separately. The run limit is the 30 s floor, not ten times a
     measurement. It lists the measured silences per spec (feral,
     warlock, shadow priest) and says the factor of ten is a margin
     whose reasons are hypotheses.
   - The `WorkerPoolOptions` comment says pages without the option get
     no silence check, and that `doAsyncRequest`'s `finally` removes a
     settled request's progress entry and recomputes the regime on
     every page (harmless on success).
   - The "no error under a progress id" statement in `doAsyncRequest`
     cites `ui/worker/worker_interface.ts:38-44` and is marked
     hypothesis, untested.
5. **Cleanups.** A module-level `progressIdOf` is used by both
   `getProgressName` and `hasWaitersOtherThan`. The test labels "(D-N1)"
   and "(D-N2)" are replaced with what is tested
   (`grep -rn 'D-N[0-9]' packages/core/test/` gives no output).

Checks: `npx vitest run packages/core/test/fork-worker-silence.test.ts
packages/core/test/rank.test.ts` rc=0 (107 passed);
`corepack pnpm fork-lint:check` rc=0; `corepack pnpm verify` rc=0.
