Status: closed
Type: task
Origin: pre-merge review round 15 on feat/round-11-followups, findings R15-A1, R15-A2, R15-P5, R15-ST1, R15-ST2, R15-ST3, R15-ST7 and R15-D1, 2026-10-05
Blocks: none
Blocked by: none
Related: 553, 554, 545

# Silence check: a new request can extend a hung worker's limit, and five comments are wrong or unsourced

## What is wrong

Line numbers are in `vendor/tbc-new-fork` at fork `4cdc02b8a` and in the
main repo at `b40b9449`.

1. **A new request can give a hung worker a fresh, longer limit
   (R15-A1, low).** `WorkerPool`'s `noteAsyncStart`
   (`ui/core/worker_pool.ts:518`) calls `SilenceMonitor.setRegime`, which
   re-arms the timer on any regime change (`ui/core/worker_silence.ts:88-92`).
   That skips `requestWaiting(othersWaiting = true)`, which exists to
   keep an earlier request's silence counting. Scenario: a worker hangs
   in its main loop (run limit 30 s, last message at t0); at t0+29 s a
   second `raidSimAsync` is posted to it; the regime moves from `run` to
   `presim` and arms 120 s, so the hung sim fails at about t0+149 s, not
   t0+30 s. One extension per run-to-presim change; the hung worker never
   leaves `presim`. Code reading only; that the tab rarely puts two sims
   on one worker is a hypothesis, untested.
2. **The freeze band is described wrongly (R15-A2).** The
   `worker_silence.ts` header (`:16-21`) says a freeze "that ends 0-5 s
   after the due time" fails a healthy worker. A freeze that ends before
   the due time, with less of the limit left than the worker needs for
   its next message, also fails it, every time (for example a 110 s
   freeze in a warm-up leaves 10 s of 120 s; feral's warm-up needs
   11.7 s). The bands it gives (29-35 s, 108-125 s) already include
   these. Ticket 553's close was corrected in the round 15 review commit.
3. **The start-up limit comment skips a step (R15-P5).** The
   `WORKER_SILENCE_LIMITS` comment in
   `ui/core/components/individual_sim_ui/upgrades/adapters/worker_pool_sim_runner.ts`
   (`:57-58`) says "ten times ... (1.8 s), plus 120 s", which is 138 s;
   the constant is 140 s. The rule rounds up to the next 10 s
   (`.scratch/stage-gate/545-worker-silence-check/measurement.md:13`).
4. **Feral's main-loop figure is the old one (R15-ST2).** The same
   comment (`:71`) lists "feral cat: ... main loop 1.1 s". Under the new
   regime rule that 1.144 s silence is a warm-up silence
   (`measurement.md:53`, `:71`); ticket 553's close uses 1.020 s.
5. **Three causal claims have no source and no "hypothesis" label
   (R15-ST1, AGENTS.md "Durable claims").** In `worker_silence.ts`:
   "Chrome freezes a page's dedicated workers with the page" (ticket 553
   cites Chromium `core/workers/dedicated_worker.cc:662-674`; the
   comment does not), and "vitest's fake performance.now() ignores
   setSystemTime". In `packages/core/test/fork-worker-silence.test.ts:155`:
   "`vi.setSystemTime` moves every pending timer's due time".
6. **A test name says a floor was measured (R15-ST3).**
   `fork-worker-silence.test.ts:726`, "uses the limits the tab was
   measured for": the run limit is the 30 s floor, not a measurement.
7. **Repeated and hard-coded comment text (R15-ST7, judgement).** The
   `FREEZE_MS` comment repeats the header's "a hidden tab delays a timer
   by about 1 s", and the generic `worker_silence.ts` header hard-codes
   the tab's bands (29-35 s, 108-125 s), which go stale if
   `WORKER_SILENCE_LIMITS` changes.
8. **The limits comment leaves out what sets warm-up time (R15-D1).**
   The warm-up is a fixed 100-iteration run (`sim/core/presim.go:35`),
   run only when the fight ends at a health value (`presim.go:66`), and
   one round for DPS specs because the only `Presimmer` is the tank
   healing model (`sim/core/health.go:272`, per the round 15 domain
   axis). So a warm-up takes about 100 times one iteration, and the
   120 s limit fails a spec whose single iteration at default boss
   health takes more than 1.2 s. Neither the comment nor ticket 553
   says so.

## What would close this

- Item 1: a regime change while another request is waiting does not
  push the deadline later than the earlier request's (for example arm
  the shorter of the remaining time and the new limit), with a pool test
  that fails at `4cdc02b8a`. Or a recorded decision to accept it.
- Items 2 to 8: the comments and the test name say only what the code
  and the cited measurements show, each causal claim with a source or
  "hypothesis, untested".
- Fork commit, lock bump, `pnpm sim-implemented-effects:generate`,
  `pnpm verify` (AGENTS.md "The forked tab repo").

## Closed 2026-10-05: reset removed, residual extension accepted by decision, items 2-8 fixed

Fork `3b75509aaf45ff0ca58c7fed649efcd54ab4794e` on `feat/upgrades-tab`
(parent `4cdc02b8a`), not pushed: "Re-base silence deadline; presim
limit 220 s". Main commit `95be23a9` "Pin fork with re-based silence
deadline (556)" moves `data/wowsims-fork.lock.json` to it, with
`pushed: false`. Plan and reports are in
`.scratch/stage-gate/555-557-silence-followups/` (gitignored).

- **Item 1: closed by removing the reset and by a recorded decision,
  not fixed.** The reset at a second post is removed: on a regime
  change, `SilenceMonitor.setRegime` keeps the time the timer was armed
  and applies the new limit from there (re-base). The presim-length
  extension that remains, up to `presimMs - runMs` = 190 s after the
  earlier request's run deadline, is accepted by session decision
  (`decision-log.md` in the folder above, gate B row F1). In this
  ticket's example the hung worker now fails at t0+220 s, not t0+30 s.
  Any rule that is safe for a second sim's warm-up must allow `presimMs`
  of silence after the first sim's last message, because that warm-up
  posts nothing until it ends (C3 in `plan.md`, by reading; hypothesis,
  untested). The change applies only when the second request gets no
  reply: a worker that answers the request's id arms a full limit on
  that message, as on every message (ticket 545 design). Two new tests
  in `packages/core/test/fork-worker-silence.test.ts` failed at
  `4cdc02b8a` and pass at `3b75509aa`: "a regime change while a request
  waits keeps the time the timer was armed" and "a second sim posted to
  a hung worker that answers nothing is judged from the worker's last
  message" (red run in `execution-report.md`, K1).
- **Items 2 to 8: fixed.** The fork comments are fixed in the same
  fork commit. The freeze band in the `worker_silence.ts` header now
  includes a freeze that ends before the due time, and the tab's bands
  moved beside `WORKER_SILENCE_LIMITS` (items 2 and 7); the start-up
  arithmetic rounds 137.8 s up to 140 s (item 3); feral's main loop
  reads 1.0 s (item 4); the Chromium and vitest claims in
  `worker_silence.ts` cite their sources (item 5); the limits comment
  says what sets the warm-up time (item 8). The test file is in the
  main repo, so its two parts are in main `95be23a9`, not the fork
  commit (`git -C vendor/tbc-new-fork show --stat 3b75509aa` lists
  only `worker_pool_sim_runner.ts` and `worker_silence.ts`): the
  fake-timers claim cites its source (item 5), and the limits test is
  "pins the tab's limits: 140 s start-up, the 30 s run floor, 220 s
  presim" (item 6).
- **`presimMs` is 220 s**, from ticket 557's page sims under the ticket
  545 rule: ten times enhancement shaman's 21.43 s warm-up, rounded up
  to the next 10 s.
- Checks on main `95be23a9`: `corepack pnpm verify` rc=0; `npx vitest
  run packages/core/test/fork-worker-silence.test.ts
  packages/core/test/rank.test.ts` rc=0 (109 passed); `python
  scripts/check_engine_port_drift.py` rc=0.
