Status: open
Type: bug
Origin: stage-gate tab-follow-ups, K3 step 10
Blocks: none
Blocked by: none
Related: 682

# The tab fixture recorder hangs for a long time after it writes the fixture

## What a person running the recorder sees

`scripts/tab-fixtures/record.mjs` logs that it wrote the fixture file, and
then the process does not exit. The command returns much later, with
rc 0, and the fixture is complete and valid.

On 2026-10-17, in the pair `tbc-wt/tab-follow-ups` on fork `3bdacb8c6`,
two recordings ran:

- `ret-p3-p2` exited normally after 214 s wall (the tab reported
  "Took 183.5s").
- `feral-p5-th4pc` wrote its file at about 391 s (the tab reported
  "Took 383.2s"), but the process exited only after 2767 s. It hung for
  about 38 minutes after its work was done.

Source: `.scratch/stage-gate/tab-follow-ups/execution-report.md` in the
main checkout, § K3, "What I did" and "Notes / concerns". The same numbers
are in ticket 682's closing note.

## Cause

Not investigated. Hypothesis, untested: the browser shutdown
(`client.close()`, `chrome.kill()`) or the keep-awake release
(`releaseKeepAwake()`, `scripts/tab-fixtures/keep-awake.mjs`) in the
`finally` block of `main()` blocks the exit. The keep-awake file's header
comment records an earlier recording that hung about 47 minutes after an
idle-timeout standby entry; whether this hang has the same cause is also
untested.

## Done when

A long recording (such as `feral-p5-th4pc`) exits within a few seconds of
logging `wrote ...`, or the recorder prints why it is still waiting and
ends that wait itself.

## Comments

### 2026-11-10, branch `fix/684-recorder-exit`

Not reproduced; the cause is still unknown, so the ticket stays open.

- **The one hang ran on Windows.** The K3 agent's transcript
  (`/mnt/c/Users/dgree/.claude/projects/C--Users-dgree-Code-lulz-tbc-gear-prio/a4723b7e-ab62-4150-a84b-dceb40174268/subagents/agent-a8a3c16d6b36e8a9b.jsonl`)
  ran `corepack pnpm ... tab-fixtures:record ... > log 2>&1` in the
  background at 2026-10-17T18:42:32Z. The fixture's `recordedAt` is
  18:49:20Z, and the command returned at 19:28:39Z. No Claude session
  under `/mnt/c/Users/dgree/.claude/projects/` logged anything between
  18:42 and 19:28 UTC that day, so a sleeping machine is not ruled out
  (hypothesis, untested: the Windows System event log is not readable
  from WSL, and the sandbox blocks `powershell.exe`).
- **Linux, 15 runs, no hang.** On 2026-10-20 a batch of re-recordings
  killed any recorder still alive 30 s after `wrote` and logged "hung
  after write". Its log, as the transcript shows it, has an `end` line
  with rc 0 and no "hung" line for each of `p2bis`, `nordrassil4`,
  `th-hands-legs` and ret `p2`. Its `feral-p5-th4pc` run (453 s) wrote
  its file, but the transcript does not show how that run ended
  (`~/.claude/projects/-home-daniel-Code-lulz-tbc-gear-prio/9985d2ac-7a9f-40cc-8622-96d09dc8a33a/subagents/agent-aa701f7a61ecf4c87.jsonl`).
  The ten ticket-703 runs on 2026-11-09 each exited within 0.5 s of
  `wrote`: the next run's evidence folder name is its start time, about
  0.47 s after the previous run's `wrote` line in its `recorder.log`
  (`/home/daniel/Code/lulz/tbc-gear-prio/.scratch/703-evidence/tab-recordings-logs/`).
  On 2026-11-10, at `tbc-gear-prio@72bc2060`, `pnpm tab-fixtures:record`
  for `feral-p3-th-hands-legs` ("Took 295.8s") logged `wrote` at
  16:26:59.969Z and its exit line at 16:26:59.973Z, and the command
  returned at 16:27:00.031Z with rc 0 (`recorder.log` in
  `.scratch/tab-recordings/logs/2026-11-10T16-21-40-191Z-feral-p3-th-hands-legs/`,
  gitignored; how it was run:
  `.scratch/agent-reports/2026-11-10-general-task-684-live-exit.md`).
  These Linux runs test neither suspect in "Cause": `holdKeepAwake` does
  nothing off Windows, and on Linux `chrome.kill()` sends a signal and
  does not wait.
- **What names the cause next time.** `record.mjs` now logs
  `exiting with code N at <ISO time>` from its exit hook, to the console
  and to `recorder.log`, whose lines carry times. If a command returns
  long after that time, the recorder was not the one waiting (pnpm, the
  shell, or a sleeping machine was). If the line itself comes late, the
  timed `recorder.log` lines before it show the step that took the time.
- On Windows the one step after `wrote` with no time limit is
  `spawnSync("taskkill", ...)` in `launchChrome`'s `kill`
  (`scripts/tab-harness/test-tab-harness.mjs`). It is unchanged, because
  recordings now run on WSL.
