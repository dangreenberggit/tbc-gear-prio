Status: open
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
