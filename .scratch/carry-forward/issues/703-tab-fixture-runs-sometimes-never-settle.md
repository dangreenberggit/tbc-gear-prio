Status: wontfix
Type: bug
Origin: feat/dps-spec-coverage fixture re-recording, 2026-10-20
Serves: .scratch/plans/upgrades-tab-finish-line.md
Blocks: none
Blocked by: none
Related: 684

# A tab run started from the page sometimes never settles; a retry settles in about 5 minutes

The recorder presses Run on the real tab the same way a player does, so the
hang may reach a player (hypothesis, untested: it has been seen only through
the recorder). Since stage `tab-checks-without-sims`, no gate and no
`pnpm verify` step records a result: the page checks render made-up fixtures.
A hang therefore costs only the person recording by hand.

## What happens

`pnpm tab-fixtures:record` starts the run, logs `run started`, and then logs
nothing more until its 25-minute limit ends it with
`record: Error: run did not settle in 25 min`
(`scripts/tab-fixtures/record.mjs:331` at the time; `grep -n "did not settle"
scripts/tab-fixtures/record.mjs` finds it now). The same command, run again with
no code change, settles in the usual time. It has happened twice on
2026-10-20, each time to a feral fixture, with the backend on `:3333` and
one recorder at a time:

- `feral-p2-malorne4`, fork `c89b0b912`: the first run did not settle; the
  retry settled in 246 s. Source: `data/tab-fixtures/README.md`, the
  2026-10-20 paragraph ("cause not found").
- `feral-p3-th-hands-legs`, fork `3797dd6b4`, in the pair
  `tbc-wt/dps-spec-coverage`: 1605 s wall, exit 1, with the error above. The
  next recording of the same fixture (fork `67d2d2074`) settled in 303 s,
  and at fork `5ec8def25` in 283 s. The two recordings before it in the
  same batch (feral-p3-p2bis, feral-p3-nordrassil4) settled in 288 s and
  285 s.

The failed run's log holds only the three lines `opening …`,
`run started` and the error. The backend's log for that run was not kept
(it was overwritten when the servers were restarted), so nothing shows
whether the backend stopped answering or the page stopped asking.

A different failure in the same session, possibly related (hypothesis,
untested): `ret-p3-p2` at fork `5ec8def25` failed after 91 s with
`CDP Page.navigate got no answer in 90s` (`scripts/tab-fixtures/run-guard.mjs:17`),
right after `feral-p3-th-hands-legs` finished.

## Done means

The cause is found from logs kept for a failing run (the page's console, the
recorder's CDP trace and the backend's log), and a recording either settles
or fails with a message that names what stopped.

## Notes

2026-10-24, stage `tab-checks-without-sims`: the recorder is now a by-hand
tool (`scripts/tab-fixtures/record.mjs` writes to `.scratch/tab-recordings/`
by default), and the layout gate, `pnpm tab-review` and
`pnpm tab-fixtures:smoke` read no recording. The `data/tab-fixtures/README.md`
paragraph cited above was removed in that stage; read it with
`git show 26d7dace:data/tab-fixtures/README.md`.

2026-11-09, branch `fix/703-run-hang`: the hang did not reproduce, and the
cause is not found. The second half of "Done means" is met; the first is not.

- **What changed.** `record.mjs` keeps each run's evidence in
  `.scratch/tab-recordings/logs/<time>-<spec>-p<phase>-<name>/`: the page's
  and workers' console, every backend request with sent, answered and
  finished times, every CDP command the recorder sent with its answer time
  or error, the recorder's lines with the tab's progress text, the
  backend's log lines for the run (or a line saying the backend wrote
  none), a summary, and on failure the backend's goroutine dump
  (`/debug/pprof/goroutine?debug=2`). The files are kept however the run
  ends: settled, failed, the 25-minute deadline, or Ctrl+C / SIGTERM. `dev-tab.mjs backend`
  now appends its log, with a time on each line, to
  `.scratch/dev-tab/backend-<port>.log`, so a restart no longer loses it.
  A run fails after `TBC_RECORD_STALL_S` (default 120) seconds when a
  backend request has no answer, when one sim is polled with no final
  answer, or when the page sends no backend request. The message names the
  request or sim, or quotes the last console line. A run the tab reports as
  failed now ends at once: before, the recorder waited only for "Took", so a
  failed run also looked like a 25-minute hang.
- **What ran.** 10 recordings, one at a time, alternating
  `feral-p2-malorne4` and `feral-p3-th-hands-legs`, at fork `b77e48ae3`.
  All 10 settled, in 190 s to 331 s ("Took" 183.3 s to 325.6 s). They ran
  in an agent sandbox with Playwright's headless shell in place of the full
  Chromium, which cannot start in that sandbox. Evidence: the ten
  `2026-11-10T02-*-feral-*` folders under `.scratch/tab-recordings/logs/` in
  the pair `tbc-wt/fix-703-run-hang`. Across them, the longest backend
  request took 0.3 s, the longest sim 2.4 s, the longest pause in backend
  traffic was 0.3 s, and no answer was other than 200. So the 120 s limits
  leave a wide margin.
- **Fault test.** With `TBC_RECORD_STALL_S=45`, the backend was paused with
  `SIGSTOP` 60 s into a run. 59 s later the recorder failed with
  `run stopped: backend request POST /asyncProgress?requestId=raidSimAsync-79d5b1f42557ba36 ... has had no answer for 50 s`
  (folder `2026-11-10T03-09-14-663Z-feral-p2-fault-sigstop`). A first
  attempt, folder `2026-11-10T02-59-08-783Z-feral-p2-fault-sigstop`, kept
  only two recorder lines (`evidence in`, `opening`) and no
  `summary.json`, so what ended it is not recorded. The pre-merge review
  (`docs/reviews/fix-703-run-hang.md`, finding A1) found that a signal or
  the deadline left such partial folders; the branch now keeps the files
  on both.
- **Two places a run could stall, from reading upstream code** (hypothesis,
  untested). (1) If a backend sim sends no progress for 10 minutes, the
  backend drops it (`asyncProgressSilenceTimeout`, `sim/web/main.go:154`)
  and the next poll gets 204. `worker_http.ts` then returns an empty
  payload, and `doAsyncRequest` waits on a promise nothing resolves
  (`ui/sim/workers/worker_pool.ts:281-282`). (2) `runSimConcurrent` waits
  for all of a candidate's split sims (`sim/core/sim_concurrent.go:540`),
  so one split sim that never ends stalls that candidate. With the default
  120 s limit the watchdog reports both as "sim ... polled ... with no final
  answer": in (1) the worker keeps polling every 50 ms and each poll gets a
  200 until the backend drops the sim after 10 minutes, so this rule fires
  long before the 204. The "page sent no backend request" message, which
  quotes the last answer other than 200, could show the 204 only with
  `TBC_RECORD_STALL_S` over 600.
- **Who else runs this path** (from code, hypothesis). The recorder's page
  sends its sims over HTTP to the Go backend
  (`ui/worker/local_worker.ts`). A player on the website runs them in WASM
  workers (`sim_worker.ts`). A player on the desktop build gets
  `net_worker.js` from the same Go server (`sim/web/main.go`, the
  `sim_worker.js` rewrite), so that player shares the recorder's whole sim
  path. Every player shares the tab, the ranking engine and
  `WorkerPool.doAsyncRequest`. Stall (1) needs the HTTP path. Stall (2) is
  in the Go backend; an engine sim that never ends would also stop a WASM
  worker.
- **Next.** The next hang names what stopped and leaves its evidence in
  that run's folder. Read `summary.json` and `backend-goroutines.txt`
  first.

## Closing note

2026-11-12, closed without a change on branch `fix/tab-polish`: not
reproduced, and the cause is unknown. Part 1 of "Done means" (find the
cause from a failing run's logs) is not met, because no run has failed
since the recorder started keeping those logs. Part 2 was met on
2026-11-09 (the note above).

- 8 more recordings at the pin `817c23d37`, one at a time, alternating
  `feral-p2-malorne4` and `feral-p3-th-hands-legs`, with one backend and
  one vite kept up for the whole batch as in October. All 8 settled, in
  200-319 s wall ("Took" 182.4-310.5 s), with 0 failed backend requests and
  no answer other than 200. With the 10 of 2026-11-09 and 1 of 2026-11-10,
  that is 19 settled recordings since the evidence change (`ea2254ed`).
  19 clean runs do not prove the hang is gone: at a 1-in-10 hang rate they
  would still happen about 14% of the time.
- The sim path has not changed since the forks that hung:
  `git -C vendor/tbc-new-fork diff --stat c89b0b912 817c23d37 -- ui/sim ui/worker sim/web sim/core`
  lists one generated file, `ui/sim/constants/missing_effects_auto_gen.ts`.
- If a recording fails again, read its folder under
  `.scratch/tab-recordings/logs/` (`summary.json`,
  `backend-goroutines.txt`, and `console.log` for a worker that logged
  "Created." but never "Ready") and file a new ticket from it.
- Two follow-ups, neither filed as a new ticket:
  - A sim that never answers, so the run never ends and Stop does not end
    it, is what a player could notice. That is ticket 574, which the owner
    has already decided.
  - The upstream `worker_http.ts` change for stall (1) above was not made.
    Stall (1) needs the HTTP path (desktop build or the recorder) and a
    backend sim that has already sent nothing for 10 minutes.

Investigation: `.scratch/agent-reports/2026-11-12-general-task-703-run-hang.md`
in the pair `tbc-wt/polish` (gitignored). Re-run: the recorder commands in
`packages/core/test/fixtures/tab-recordings/README.md:59,61`, one at a time,
with the backend and vite from `node scripts/dev-tab.mjs backend` and
`node scripts/dev-tab.mjs frontend`. Each of the 8 runs on 2026-11-12
printed `settled: Your current gear: ... DPS. Took ...s.` and exited 0
(`.scratch/agent-reports/2026-11-12-703-repro/status.log` in the pair).
