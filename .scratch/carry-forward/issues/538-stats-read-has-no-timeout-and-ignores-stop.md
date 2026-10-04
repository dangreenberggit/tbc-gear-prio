Status: closed
Type: defect
Origin: pre-merge review round 11 on feat/tab-signoff-followups, finding A1, 2026-10-03
Blocks: none
Blocked by: none
Related: 535, 533

# A stats read has no timeout and Stop cannot end it

## What was found

Since ticket 535, the Upgrades tab reads the character's hit from the sim
with `computeStats` before meta repair, once for the baseline and once per
repaired set version. Line numbers below are in `vendor/tbc-new-fork` at
fork `3613d654f`; read them with
`git -C vendor/tbc-new-fork show 3613d654f:<path> | sed -n <from>,<to>p`.

- `ui/core/worker_pool.ts:114-117`: `WorkerPool.computeStats` awaits the
  worker's answer with no timeout.
- `ui/core/components/individual_sim_ui/upgrades/engine/rank.ts` about
  lines 1108-1135: the baseline read is a plain call, not raced against
  the run's abort signal.
- `rank.ts` about lines 3989-3995: the Stop guard refuses new reads after
  Stop, but does not end a read that has started.

So if a worker never answers a stats read, the run waits forever and Stop
does not end it (hypothesis, untested: no run has been seen to hang on a
read).

Ticket 535's "Wall time" paragraph records one feral "after" recording
that stalled before its first sim until the recorder's 25-minute watchdog
killed it; its cause is unknown, and the reviewer then named the missing
timeout as a hypothesis.

## What would close this

1. Try to reproduce the hang, or show from the code that a stats read
   cannot block forever. Record the command.
2. If a read can block: race each read against the run's abort signal and
   a timeout, and treat a timeout like a failed read (one console warning,
   no cached ranking, full-weight repair, as test 535-S3 does for a failed
   read). Add a test that a never-answering `computeStats` with Stop
   returns a `PartialRanking`, as tests 533-S/W do for sims.

## Closed 2026-10-04

Closed on the Stop fix. The timeout in close condition 2 is **not**
added; the owner chose a different safety net as a follow-up, ticket 545
(see "The timeout decision" below). Plan and reviews:
`.scratch/stage-gate/round-11-followups/` (gitignored). Fork line
numbers below are at `7d4d69d6a`; read them with
`git -C vendor/tbc-new-fork show 7d4d69d6a:<path> | sed -n <from>,<to>p`.
The transport files are unchanged from `7d4d69d6a` to `1f102770e`
(`git -C vendor/tbc-new-fork diff --quiet 7d4d69d6a 1f102770e -- ui/core/worker_pool.ts ui/core/concurrent_worker_pool.ts ui/worker sim/web`, rc=0).

### Can a stats read block for ever? (condition 1, from the code)

Yes, but only when the worker that received it never answers. This is
code reading; no run has been seen to hang on a read.

- Go `core.ComputeStats` (`sim/core/api.go:13-25`) is one synchronous
  call with no sim loop, channel or goroutine, so the sim side cannot
  block.
- **Paths that answer.** A handler that throws is caught and answered
  with `error` (`ui/worker/worker_interface.ts:46-53`), and the pool
  rejects the call on `error` (`ui/core/worker_pool.ts:397-400`). A
  refused HTTP connection rejects the `fetch` inside that handler, so it
  is answered the same way.
- **Paths that never answer**, each on one worker:
  - A worker that never finished starting. If the wasm module fails to
    load, the pool only logs it (`worker_pool.ts:375-380`; a failed load
    is not memoized, `:65-70`, so one worker can fail alone), the
    worker's `onReady` never resolves (resolved only at `:365`), and every
    call on it waits in `await this.onReady` (`:466-470`).
  - On the desktop build, a server that accepts the request and never
    answers: the HTTP worker's `fetch` has no timeout
    (`ui/worker/worker_http.ts:30-35`).
- **A crash after the worker is ready** gives error replies to later
  calls; only the sim in flight at the crash hangs (plan review round 5,
  H3: a Go runtime exit makes later calls throw, and the handler's
  `catch` answers with `error`). Hypothesis, untested in a run: it rests
  on the local Go toolchain's `wasm_exec.js:555-558`, and whether the
  build toolchain matches is unverified.
- **One worker, not the pool.** The tab builds its own pool
  (`upgrades_tab.tsx:880`): 4 workers by default
  (`upgrades/adapters/worker_pool_sim_runner.ts:50`), and the user's worker
  setting can raise it (`upgrades/adapters/bulk_wasm_sim_runner.ts:87-90,178-180`).
  The other workers can be healthy.
- **Why the hang moves to a sim.** A worker that never became ready keeps
  its `setup` task (`worker_pool.ts:351`, cleared only at `:366`), and
  least-busy routing takes the minimum work amount
  (`ui/core/concurrent_worker_pool.ts:85-91`). So the dead worker is
  skipped while a healthy worker is idle, and gets the next request once
  every healthy worker is busy. The tab runs as many sims at once as it
  has workers (`worker_pool_sim_runner.ts:103-106`), so that almost always
  happens at the next full batch; it does not happen when fewer requests
  remain than healthy workers, as at the end of a stage.

### The 25-minute feral stall in ticket 535 (condition 1, from the record)

Its cause is unknown. Ticket 535's "Wall time" paragraph says the
backend's log showed no sim before the next attempt began. That backend
log was not kept: `ls .scratch/stage-gate/535-meta-repair-hit/after-logs/`
lists no backend log, and the recording's own log
(`after-logs/feral-repeat-1.log`) has only "run started" and the watchdog
kill. A run starts with a sim: the baseline sim (`rank.ts:1095-1107`)
comes before the first stats read (`:1115`), and in a recording the
baseline is never a cache hit (fresh Chrome, per-instance `MemoryStore`,
`upgrades_tab.tsx:884`). So a first sim that never got an answer could
explain the stall (hypothesis, untested). That is the dead-worker hang
ticket 545 targets.

Ticket 535 also keeps the sentence "The reviewer's hypothesis, untested:
`WorkerPool.computeStats` has no timeout" as a candidate cause. This
reading argues against a stats read as the place the run stopped: the
first read is sent only after the baseline sim answers. It does not rule
out a dead worker, which would hang that first sim instead. Ticket 535 is
not edited.

### No repro

None was run. The code answers condition 1. A stats-read marker could not
place a stall that may have begun at the first sim, and the stall's cause
is ticket 535's question.

### The fix (condition 2, Stop part)

- Fork `1f102770e` "Race stats reads against Stop (538)": one helper,
  `readStats` in `upgrades/engine/rank.ts`, used by the baseline read, the
  set phase's version reads and `stopGuardedDeps`' `computeStats`. It
  refuses a read once the signal has aborted, attaches its abort listener
  before the read starts, races the read against Stop (`StopRefusedSim`),
  and has no timeout. The baseline read's `catch` treats `StopRefusedSim`
  as no failure: no warning, no note, and the candidate loop returns the
  `PartialRanking`. PROVENANCE row for `rank.ts` moved to sha256
  `8f36da79`.
- Each successful read logs `console.debug` "`[upgrades] stats read <n> ms`".
  This times reads on either build; the browser build's read time is
  unmeasured.
- Test 538-H in `packages/core/test/fork-meta-repair.test.ts` (main
  `9c57c89d`): a `computeStats` that aborts the run inside the read and
  never answers. The run resolves with `complete: false`, writes no
  `[upgrades]` warning, and caches no ranking (a second run on the same
  store reads the hit again). Before the fork edit it timed out at 30 s;
  after it, `npx vitest run packages/core/test/fork-meta-repair.test.ts packages/core/test/fork-set-net.test.ts`
  rc=0, 125 tests, 535-S3 and 535-V5 unchanged.
- **Reach.** Stop now ends a hang that starts in a stats read. It does not
  end a sim already in flight on a dead worker, because Stop is itself a
  request to that worker (`sendAbortById` → `doApiCall`,
  `worker_pool.ts:262-264`, `:513-518`). So a worker that is dead from the
  start still hangs that sim, with no recovery but a page reload.

### The timeout decision (condition 2, timeout part)

The read timeout is **not** added. This departs from close condition 2.
It was put to the owner as Q-538-timeout with three options: 1, Stop only;
2, a time limit on the lookup; 3, fail every lookup and sim on a worker
that has sent nothing for N seconds. The owner chose option 3 ("3 sound
ok", 2026-10-04), as a follow-up: **ticket 545**.

The facts behind the options:

- A browser-build sim reports progress and yields to its worker's event
  loop about every 100 ms in the main loop (`sim/core/sim.go:335-342`), so
  a healthy busy worker should answer a read within about one yield. Code
  reading; the browser build's read time is unmeasured. A desktop-build
  read was measured at about 6 to 13 ms (ticket 535 plan, C56). Sim setup
  and the warm-up pass for health-percentage fights do not yield
  (`sim.go:146`, `sim/core/presim.go:35,103`); their durations are
  unmeasured.
- So a read timeout of tens of seconds would rarely fire on a healthy
  run (code reading). But on both no-answer paths the worker is dead for
  sims too, so a read timeout would almost always only move the hang to a
  later sim on that worker, after a warning, a note and a run that caches
  no ranking (`rank.ts:1241-1250`).
- A per-worker silence check would cover sims too. The desktop server
  already aborts an async sim whose progress has been silent for 10
  minutes (`sim/web/main.go:154,244-253`). Its costs: N must exceed a
  healthy worker's longest silences (start-up and the warm-up pass), which
  are unmeasured, so ticket 545 starts with that measurement; and the
  check is opt-in for the tab's pool so other sim pages are unchanged.

### How this ticket stands

Closed on the Stop fix. The owner has answered Q-538-timeout; the
follow-up is ticket 545, and 538 is not reopened for it.

### Corrections to earlier plan wording

- An earlier round said the stall "cannot be placed"; a later round
  placed it outside any stats read (review N2). Round 5 review H1 withdrew the stronger
  form, that the stall happened before the tab asked the sim anything:
  the record supports only "cause unknown", above.
- Round 4's per-sim wait estimates for the browser build were withdrawn
  (review G1): a running sim yields about every 100 ms, the tab's default
  iteration count was wrong in them, and the large figures came from the
  deleted bulk path.
