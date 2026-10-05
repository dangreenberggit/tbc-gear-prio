Status: closed
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

## Closed 2026-10-05: fixed at fork 4cdc02b8a

Fixed by one fork commit on `feat/upgrades-tab` in
`dangreenberggit/tbc-new`, not pushed (the remote still names
`7d4d69d6a`, `git -C vendor/tbc-new-fork ls-remote origin
refs/heads/feat/upgrades-tab`):

- `4cdc02b8a231e5376f2798be06348e00167868cc` "Derive the silence regime
  from worker state (553)": `ui/core/worker_pool.ts`,
  `ui/core/worker_silence.ts`,
  `upgrades/adapters/worker_pool_sim_runner.ts`.

The main-repo commit `82ded354` "Re-pin fork to 4cdc02b8a for tickets
553 and 554" moves `data/wowsims-fork.lock.json` to `4cdc02b8a` with
`pushed: false` and adds the tests. Plan, review, probe and reports are
in `.scratch/stage-gate/553-554-silence-followups/` (gitignored, so a
fresh checkout does not have them): `plan.md`, `plan-review.md`,
`gate-b-directives.md`, `probe.md` with two JSON files,
`execution-report.md`.

### Item 1: the warm-up limit now always applies

Chosen: the plan's candidate Y′. A worker's regime now comes from its
state, not from the order of its messages:

- not ready: the start-up limit (140 s);
- any async request posted and not yet past its first
  `PresimRunning: false`: the warm-up limit (120 s);
- otherwise: the run limit (30 s).

`SimWorker` recomputes the regime at `ready`, when a request is posted,
on each progress message, when a request settles, and after a restart
(`ui/core/worker_pool.ts`, `regime()` and `refreshRegime()`). A
`PresimRunning: true` that reaches the page late no longer matters: the
warm-up is judged against 120 s from the post. This also covers a sim
posted to a worker that is not ready yet.

The rule fits the 545 data (plan claim C1, re-run by the round-1 plan
reviewer on `.scratch/stage-gate/545-worker-silence-check/measurement-health.json`
and `measurement-time.json`): every `raidSimAsync` request saw a
`PresimRunning: false` (495 of 495 health rows, 280 of 280 time rows);
in 14 health rows the `true` arrived with the `false` (`sPresim` 0,
`sFirst` 607-1,144 ms); the longest post to first `false` was 1,385 ms
(health) and 200 ms (time); the longest main-loop gap was 866 ms and
590 ms.

Tests, in the pool suite of `packages/core/test/fork-worker-silence.test.ts`.
Each failed at `b8ba9b800` with "expected 'rejected' to be 'pending'"
and passes at `4cdc02b8a`:

- "judges a warm-up whose start message arrives late against the presim limit"
- "keeps the presim limit for a sim posted before the worker is ready"
- "fails a warm-up with no start message at the presim limit"
- "keeps the presim limit while any sim on the worker is before its main loop"

What Y′ gives up (accepted in the plan, "Weakening Y′ accepts"):

- A worker that dies between a request's post and its first
  `PresimRunning: false` is failed after 120 s, not 30 s. With two sims
  on one worker, a main-loop death of one waits 120 s while the other is
  still before its main loop.
- Every async request type goes through `doAsyncRequest`, so
  `statWeightsAsync`, `bulkSimAsync` and `reforgeOptimizeAsync`, not
  only `raidSimAsync`, are under the warm-up limit from their post until
  their first `PresimRunning: false` or until they settle. Such a
  request that sends no progress before its final message waits 120 s,
  not 30 s, before it fails. Today this changes nothing in the tab: only
  the tab turns the check on, and its runner sends only `raidSimAsync`
  and `computeStats` (`upgrades/adapters/worker_pool_sim_runner.ts:162`,
  `:192` at `4cdc02b8a`).

Cause of the late message: still a hypothesis. Go sends
`PresimRunning: true` and then only calls `runtime.Gosched()`
(`sim/core/sim.go:149-154`). A possible later engine change, for the
owner to consider: a short sleep after that send (plan candidate U), so
the message reaches the page before the warm-up starts. Y′ does not
need it, and this ticket does not change the engine.

### Item 2: a frozen page or a sleeping machine

Chosen: the plan's design G. Each arm sets one timer. When the timer
fires more than 5 s (`FREEZE_MS`) after its due time, the monitor reads
that as a frozen page or a sleeping machine and re-arms a full limit in
the current regime instead of failing (`ui/core/worker_silence.ts`,
`arm()`). Tests, in the monitor suite:

- "re-arms a full limit instead of failing when its timer fires more
  than 5 s late": failed at `b8ba9b800` with
  `expected [ [ 'run', 1000 ] ] to deeply equal []`
- "fails when its timer fires at most 5 s late": passes at both commits
- "a late fire re-arms with the limit of the regime the monitor is in":
  failed at `b8ba9b800` with
  `expected [ [ 'presim', 5000 ] ] to deeply equal []`

What G gives:

- A dead worker in a hidden tab is still failed at about its limit plus
  1 s. Chrome aligns a single timer set from a message handler to 1 s
  wake-ups. Its once-a-minute throttling applies only to timer chains
  nested deeper than level 6, after the tab has been hidden 60 s or
  5 min (plan C17:
  https://developer.chrome.com/blog/timer-throttling-in-chrome-88;
  Chromium `main` `dom_timer.cc:327-364`,
  `frame_scheduler_impl.cc:494-504`. That Chromium `main` matches the
  stable release is an inference).
- A frozen page also freezes its dedicated workers, so a worker's
  silence during a freeze says nothing about it (plan C16: Chromium
  `core/workers/dedicated_worker.cc:662-674`). For system sleep this is
  a hypothesis, untested.

What G costs:

- A worker that died before a freeze or sleep is failed up to one limit
  (30 s, or 120 s in a warm-up) after the freeze or sleep ends, not at
  once.
- A frozen page or a sleeping machine can still fail a healthy worker
  when the freeze or sleep ends 0-5 s after the timer's due time: the
  timer is then not late enough to re-arm. At the tab's limits that is
  a freeze of about 29-35 s in the main loop, or about 108-125 s in a
  warm-up. In that band the outcome depends on whether the worker's
  queued message runs before the overdue timer on resume, which Chrome
  does not document (plan C18, hypothesis, untested;
  https://developer.chrome.com/blog/page-lifecycle-api). `FREEZE_MS`
  stays at 5,000 ms: a lower value is untested against Chrome's 1 s
  hidden-tab alignment.
- Whether a Chrome timer whose deadline passes during system sleep
  fires at wake or keeps its remaining time is not in Chrome's docs or
  the HTML spec (plan C20, hypothesis). G re-arms in both cases, because
  the monitor measures lateness with `Date.now()`, which keeps counting
  through sleep (hypothesis, untested in Chrome).

Related, not fixed here: Chrome 133+ Energy Saver can freeze a hidden,
CPU-intensive tab after 5 min (plan C19,
https://developer.chrome.com/blog/freezing-on-energy-saver). Filed as
ticket 555.

### Item 3: other specs and the desktop build

Probe (`probe.md`, 2026-10-05, browser build, page Simulate, 100
iterations, default boss health 6,070,400, previous phase's preset
gear):

- warlock: warm-up (post to first `PresimRunning: false`) at most
  1.827 s, longest main-loop gap 0.223 s;
- shadow priest: 4.473 s and 0.504 s.

With feral's 11.704 s and 1.020 s from ticket 545, the plan's rules,
written before measuring, give: warm-up limit 10 x 11.704 s, rounded up
to 120 s, so it stands; run limit 10 x 1.020 s, rounded up to 20 s,
then the 30 s floor, so it stands. No limit moved.

Warm-up time does not follow fight length across specs: shadow priest's
3,822 s fight warmed up in 4.5 s, feral's 2,691 s fight in 11.7 s. The
`WORKER_SILENCE_LIMITS` comment now lists the three specs' numbers, says
the factor of ten is a margin, and marks its reasons as hypotheses.

Desktop build: dispositioned by code reading, with no desktop session
(plan claim C8; the plan put a `:3333` session out of scope, although
this ticket's close condition 1 asked for one). `/asyncProgress`
answers 200 with the latest stored metrics on every poll and 204 only
for an unknown or finished id (`sim/web/main.go:325-331`, `:353-361`);
registration stores empty metrics (`sim/web/async_progress.go:32`); the
HTTP worker polls every 50 ms and posts each result
(`ui/worker/worker_http.ts:52-70`); every message re-arms the timer. So
a healthy desktop worker sends a message about every 50 ms during a sim
(inference from reading; not run).

### Checks

`npx vitest run packages/core/test/fork-worker-silence.test.ts
packages/core/test/rank.test.ts` rc=0 (107 passed);
`corepack pnpm fork-lint:check` rc=0; `corepack pnpm verify` rc=0
(1571 ran, 1 skipped). No tab run was made with this change.
