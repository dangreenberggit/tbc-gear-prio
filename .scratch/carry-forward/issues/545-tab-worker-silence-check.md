Status: closed
Type: task
Origin: owner ruling on Q-538-timeout, 2026-10-04 ("3 sound ok"), stage-gate run round-11-followups (`.scratch/stage-gate/round-11-followups/q-538-timeout.md`)
Blocks: none
Blocked by: none
Related: 538, 535

# The Upgrades tab cannot recover from a sim worker that never answers

## What the owner chose

Ticket 538 asked for two safety nets on the hit-rating lookup the
Upgrades tab makes before gem repair: Stop ends a waiting lookup, and the
lookup gives up by itself after a fixed time. Ticket 538 shipped only the
first. Q-538-timeout offered three options: 1, Stop only; 2, a time limit
on the lookup; 3, fail every lookup and sim on a worker that has sent
nothing for N seconds. The owner chose option 3 ("3 sound ok",
2026-10-04). This ticket is that option.

The check is **opt-in**, turned on only by the Upgrades tab's own worker
pool, so every other sim page keeps today's behaviour. It covers lookups
(`computeStats`) and sims.

## Why (facts and their sources)

Line numbers below are in `vendor/tbc-new-fork` at fork `7d4d69d6a`; read
them with `git -C vendor/tbc-new-fork show 7d4d69d6a:<path> | sed -n <from>,<to>p`.
The transport files (`ui/core/worker_pool.ts`,
`ui/core/concurrent_worker_pool.ts`, `ui/worker/*`, `sim/web/*`) are
unchanged from `7d4d69d6a` to fork `1f102770e`.

- **Which requests can go unanswered (code reading, not observed).** A
  handler that throws is answered with an error
  (`ui/worker/worker_interface.ts:46-53`). No answer comes in two cases:
  - A worker that never finished starting. If the wasm module fails to
    load, the pool only logs it (`ui/core/worker_pool.ts:375-380`), the
    worker's `onReady` never resolves (`:353-355`, resolved only at
    `:365`), and every call on that worker waits on it (`:466-470`).
  - On the desktop build, a server that accepts a request and never
    answers: the HTTP worker's `fetch` has no timeout
    (`ui/worker/worker_http.ts:30-35`).
  A worker crash after it is ready gives error replies to later calls;
  only the sim in flight at the crash hangs (plan review round 5, H3;
  hypothesis, untested in a run: it rests on the local Go toolchain's
  `wasm_exec.js`, and whether the build toolchain matches is unverified).
- **Such a worker still gets work.** A worker that never became ready
  keeps its `setup` task (`worker_pool.ts:351`, cleared only at `:366`),
  and least-busy routing takes the minimum work amount
  (`concurrent_worker_pool.ts:85-91`). So it is skipped while a healthy
  worker is idle, and it gets the next request once every healthy worker
  is busy. The tab runs as many sims at once as it has workers
  (`upgrades/adapters/worker_pool_sim_runner.ts:103-106`), so that is the
  usual case, but not at the end of a stage. Code reading, not observed.
- **Stop cannot end a sim on such a worker.** Stop is itself a request to
  that worker (`worker_pool.ts:262-264`, `:513-518`). Ticket 538 makes
  Stop end a hang that starts in a lookup; it does not end a hung sim.
- **The tab already handles a failed sim.** The candidate loop drops a
  failed sim's row (`upgrades/engine/rank.ts:3998-4003`, comment), and the
  set phase ends the run with `sim-failed` (`rank.ts:2152-2160`). So a
  silence check that fails the sim ends the hang with no new loop code.
  Whether that outcome is the one we want is part of this ticket.
- **Precedent.** The desktop server already aborts an async sim whose
  progress has been silent for 10 minutes (`sim/web/main.go:154`,
  `:244-253`). It does not cover a server that accepts and never answers.
- **Worker count.** The tab builds its own pool (`upgrades_tab.tsx:880`,
  `makeSimRunner()`): 4 workers by default
  (`worker_pool_sim_runner.ts:50`); the user's worker setting can raise it
  to `max(2, min(setting, hardwareConcurrency, memoryCap))`
  (`upgrades/adapters/bulk_wasm_sim_runner.ts:87-90,178-180`).
- **The one long stall on record.** One feral recording in ticket 535
  stalled for 25 minutes until the recorder's watchdog killed it
  (`.scratch/stage-gate/535-meta-repair-hit/after-logs/feral-repeat-1.log`,
  gitignored). Its cause is unknown. Ticket 535 says the backend's log
  showed no sim before the next attempt began; that log was not kept
  (`ls .scratch/stage-gate/535-meta-repair-hit/after-logs/` has none). A
  run starts with a sim (`rank.ts:1095-1107`, before the first lookup at
  `:1115`), so a first sim that never got an answer could explain it
  (hypothesis, untested). If that is what happened, only this ticket's
  check would have ended it without the user acting (hypothesis,
  untested: it assumes a worker stuck on an unanswered request sends no
  messages; the HTTP worker's polling code was not read for this).

## What is measured and what is not

- Measured: one `/computeStats` lookup on the desktop build takes about 6
  to 13 ms (ticket 535 plan, C56:
  `.scratch/stage-gate/535-meta-repair-hit/plan-r5.md:412`).
- Code reading only: during the main sim loop a browser-build worker
  reports progress and yields about every 100 ms
  (`sim/core/sim.go:335-342`), so a healthy busy worker is not silent for
  long there.
- **Not measured:** a healthy worker's two long silences, which N must
  exceed:
  - start-up: the pool posts nothing between `setup` and `ready` while the
    wasm module is fetched, compiled and started (`worker_pool.ts:349-366`,
    `ui/worker/sim_worker.ts`);
  - the warm-up pass for fights that end at a boss health percentage:
    100 iterations (`sim/core/presim.go:35`) run with no progress callback
    (`presim.go:103`), after sim setup (`sim.go:146`).
  The browser build's lookup time is also unmeasured. Ticket 538 added a
  `console.debug` line, `[upgrades] stats read <n> ms`, that times every
  lookup on either build.

## What would close this

1. **Measure first.** One browser-build session (`WASM_WORKER` set, see
   `vendor/tbc-new-fork/vite.config.mts:23`) on a health-percentage fight
   and a time-based fight: record each worker's longest gap between
   messages at start-up, during the warm-up pass and during the main loop,
   and the `[upgrades] stats read` times. Record the command, the spec,
   the fight and the numbers. Choose N from these numbers, with a stated
   margin.
2. An opt-in silence check on the Upgrades tab's pool: when a worker has
   sent nothing for N seconds, every request waiting on it fails with an
   error. Only the Upgrades tab's pool turns it on.
3. Decide, and record, what the run shows when a sim fails this way (the
   dropped row and the `sim-failed` run error the loop already gives, or
   something else).
4. A test that a never-answering worker fails its waiting lookup and sim
   after N seconds.

## Closed 2026-10-05: fixed at fork b8ba9b800

Fixed by one fork commit on `feat/upgrades-tab` in
`dangreenberggit/tbc-new`, not pushed (the remote still names
`7d4d69d6a`, `git -C vendor/tbc-new-fork ls-remote origin
refs/heads/feat/upgrades-tab`):

- `b8ba9b800f274791c7a70b4d5484bb45dd91c281` "Fail requests on silent
  tab workers (545)": `ui/core/worker_silence.ts` (new),
  `ui/core/worker_pool.ts`,
  `upgrades/adapters/worker_pool_sim_runner.ts`.

The main-repo commit "Re-pin fork to b8ba9b800 for ticket 545" moves
`data/wowsims-fork.lock.json` to `b8ba9b800` with `pushed: false` and
adds the tests. Plan, measurement and evidence are in
`.scratch/stage-gate/545-worker-silence-check/` (gitignored, so a fresh
checkout does not have them): `plan.md`, `gate-b-directives.md`,
`measurement.md` with three JSON files, `live-check.md`,
`execution-report.md`.

### Item 1: the measurement and the limits

`measurement.md` records one browser-build (wasm) session of the tab on
feral cat, on the time-based fight, on a fight that ends at zero boss
health (health 441,198, about a 180 s fight), and one page sim at the
default boss health 6,070,400 with 100 iterations. Longest silences
while a request waited: start-up 1.777 s, sims and lookups 1.144 s, the
warm-up pass (presim) 11.704 s at the default health (measured, not
extrapolated). The plan's decision table picks candidate C: three
regimes, chosen from the `PresimRunning` flag in the progress messages.

| Regime | Limit | Rule |
| --- | --- | --- |
| start-up (created to `ready`) | 140 s | 10 × 1.777 s + 120 s for the wasm download, rounded up to 10 s |
| run (after `ready`) | 30 s | 10 × 1.144 s, raised to the 30 s floor |
| warm-up pass | 120 s | 10 × 11.704 s, rounded up to 10 s |

The 10× margin is 2.5× for a spec at 1,000 DPS, whose warm-up pass is
longer, and 4× for a slower machine (hypothesis, untested). The 120 s
download allowance is about 32 kB/s for the 3.8 MB module (hypothesis).

### Item 2: the check

The option is set only at `worker_pool_sim_runner.ts:117`
(`WORKER_SILENCE_LIMITS`, `:63`); every other `new WorkerPool` site gets
none, so other sim pages behave as before. A per-worker timer is re-armed
by every message the worker sends. When it fires and a request is
waiting, every waiting request fails with "Sim worker <id> sent nothing
for <N> s; it was restarted", callers waiting for `ready` fail too, and
the worker is terminated and set up again with the check still on
(`worker_pool.ts:513-525`).

- **The wasm sim path.** On the browser build the worker answers a sim's
  request id with an empty payload, and the result then arrives only on
  the progress channel. The id answer is posted after the sim
  goroutine's first yield, not at once: after sim setup, the whole
  warm-up pass and the first main-loop sleep (plan review N5a). The
  progress entry's reject was a no-op; it is now real
  (`worker_pool.ts:274-284`), and only the silence check calls it,
  since a worker never posts an error under a progress id. So a sim
  that goes quiet after its id was answered now fails.
- **Regime per worker.** The regime is tracked per worker and set by the
  latest progress message on that worker. A warm-up pass blocks the Go
  thread, so no other sim on that worker can send during it.
- **Idle workers.** A request on a worker that was idle gets a full
  limit from when it was posted (D-N1). When nothing waits, the timer
  goes idle.
- **Stale progress entry (D-N3).** `doAsyncRequest`'s `finally`
  (`worker_pool.ts:300`) always deletes the `${id}progress` entry, so a
  rejected call leaves nothing waiting and an idle worker is never
  restarted. On success the delete does nothing.

### Item 3: what the run shows when a sim fails this way

The existing handling stands; no new loop code. At fork `b8ba9b800`:

- A candidate sim that fails is dropped with the worker text in the
  "dropped from the ranking" note (`upgrades/engine/rank.ts:1602-1613`).
- A ring, trinket or one-hand that fails on one slot only is still
  ranked from the other slot and also carries that note.
- A baseline or replication sim failure ends the run with "Ranking
  failed: Sim worker <id> sent nothing for N s; it was restarted"
  (`rank.ts:1101`, `:2161`).
- Set-phase package sims show `unmeasured: "sim-failed"` rows
  (`rank.ts:2580`, `:2648`).
- The same-gear gate (`set-less-copies.ts:159`), the worn-set ladder
  (`:200`, `:215`), the set screen (`set-screen.ts:282`), step sims and
  pair 2pc sims log the text to the console only.

### Known limits (not fixed)

- **Routing after a persistent failure.** A restarted worker holds the
  least work, so least-busy routing sends it the next request. If the
  cause persists, about one candidate in four (with 4 workers) is
  dropped, each after 30 s (hypothesis, untested; plan C19).
- **Laptop sleep.** A laptop that sleeps during a run may lose one row
  on resume: the main-thread timer can fire before the worker's queued
  progress arrives (hypothesis, untested; plan C17).
- **Not proven to fix 535.** The cause of ticket 535's stall is unknown.

### Item 4: tests

`npx vitest run packages/core/test/fork-worker-silence.test.ts
packages/core/test/rank.test.ts` gives rc=0, 97 passed, with fake
timers. Cases: a never-ready worker fails a lookup and a sim at the
start-up limit and not before, and its restarted worker fails again; the
wasm pattern (id answered with an empty payload, two progress messages,
then silence) fails at the run limit after the last message, and the
restarted worker fails a second silence; a worker that sends progress
every 100 ms never fails; a warm-up pass under and over its limit; no
restart of an idle worker; a pool without the option still waits; a
baseline sim rejected with the worker text gives `RankError` kind
`sim-failed` (on both the fork engine and `packages/core/src/rank.ts`).
`corepack pnpm fork-lint:check` and `corepack pnpm verify` rc=0.

### Live check

One feral run of the tab on the browser build with the check on
completed with no silence error: 2451.1 DPS, "Took 2062s.", the same as
the run without the check (2063 s). No live run provoked a dead worker:
no devtools path mutes one worker of the tab's pool; the wasm-pattern
test stands in for it.
