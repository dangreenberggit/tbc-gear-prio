Status: open
Type: defect
Origin: pre-merge review round 14 on feat/round-11-followups, findings R14-A1, R14-D1, R14-A2, R14-D2 and R14-P3, 2026-10-05
Blocks: none
Blocked by: none
Related: 545

# The tab's worker silence check can fail a healthy sim

## What is wrong

Ticket 545 (fork `b8ba9b800`) fails every request on an Upgrades-tab
worker that sends nothing for a set time: 140 s at start-up, 30 s while
a sim runs, 120 s during a warm-up pass (`WORKER_SILENCE_LIMITS`,
`upgrades/adapters/worker_pool_sim_runner.ts:63`). A false failure drops
a candidate row, or ends the whole run with "Ranking failed" when the
baseline or a replication sim fails (`upgrades/engine/rank.ts:1101`,
`:2161`). It never gives a wrong number. Three ways a healthy worker can
hit a limit:

1. **The warm-up limit does not always apply (R14-A1, R14-D1).** The
   worker switches to the 120 s warm-up limit only when a progress
   message with `PresimRunning: true` reaches the main thread
   (`ui/core/worker_pool.ts:325`, `noteProgress`). In 14 of 495 measured
   requests that message arrived in the same main-thread turn as the
   `false` one (`.scratch/stage-gate/545-worker-silence-check/measurement.md`,
   "Observations the table does not show"), so the whole warm-up ran
   under the 30 s run limit. The measured warm-up at the default boss
   health was 11.7 s on feral cat, a 2.6× margin under 30 s, not the
   stated 10×. A slower spec or a slower machine on a health-based fight
   could pass 30 s (hypothesis, untested). Whether the late message comes
   from a busy main thread or from the worker posting late (Go sends it
   and then only calls `runtime.Gosched()`, `sim/core/sim.go:150-154`) is
   not known.
2. **A frozen or suspended page (R14-A2).** If the browser freezes a
   hidden tab, or the machine sleeps, the overdue timer may run before
   the worker's next message when the page resumes
   (`ui/core/worker_silence.ts:89-97`), and every running sim fails at
   once (hypothesis, untested).
3. **The limits rest on one spec and one build (R14-D2, R14-P3).** All
   limits come from feral cat on the browser build (`measurement.md`).
   Cost per simulated second differs by spec (pets, totems, DoTs), and
   the 2.5× factor covers fight length only (hypothesis, untested). The
   check is also on for the tab on the desktop build, which was not
   measured (`plan.md:152` put it out of scope); whether 30 s fits the
   HTTP worker's polling (`ui/worker/worker_http.ts:52-70`) is unchecked.

## Where it was found

Branch `feat/round-11-followups` at `63c55c03`, fork `b8ba9b800`. Review
round 14 (`docs/reviews/feat-round-11-followups.md`, Round 14).

## What would close this

1. A measurement on a health-based fight at default boss health for at
   least one low-DPS spec, and one desktop-build session, recording the
   longest silence per regime, as in ticket 545 item 1.
2. Either keep the warm-up limit in force for the whole first silence of
   a sim on a health-based fight (so a late `PresimRunning: true` cannot
   cut it to 30 s), or raise the run limit above the measured warm-up
   with the stated margin. Record the choice.
3. A decision on page freeze: for example, on `visibilitychange` or a
   timer that fires far later than set, re-arm instead of failing.
   Record the choice, with a test if the code changes.
