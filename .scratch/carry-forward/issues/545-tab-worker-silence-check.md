Status: open
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
