# Pre-merge review — fix/684-recorder-exit

Reviewed range: `ea2254ed271ed6b824120a8df74d0269e4c32300..5a2b9a633b178e8c6191d7b17366c7f8b63eae81`

## Dispatch note

- **Tooling check:** `python scripts/check_merge_ready.py --product-files`
  printed `scripts/tab-fixtures/record.mjs` (rc 0). The review axes read
  that file only. The other changed file,
  `.scratch/carry-forward/issues/684-fixture-recorder-hangs-after-writing.md`,
  is agent tooling (`TOOLING_PATHS`), so it got `instruction-review`
  (section "Instruction review" below).
- **Lane:** small change. `git diff --shortstat dev...HEAD` printed
  `2 files changed, 53 insertions(+)`. `git diff --name-only dev...HEAD`
  printed `.scratch/carry-forward/issues/684-fixture-recorder-hangs-after-writing.md`
  and `scripts/tab-fixtures/record.mjs`; neither starts with `data/`,
  `vendor/` or `packages/core/src/`, and neither has `.generated.` in its
  name.
- **Reviewer:** one fresh `general-task` subagent on Opus (review lane),
  with the adversarial brief and the `code-review` skill's Standards and
  Spec checks, spawning no subagents. `codex` is not on `PATH`
  (`command -v codex` exited 1).
- **Domain axis skipped:** the diff adds a process exit log line and a
  ticket note; it has no TBC, WCL or wowsims content.
- `pnpm verify` passed on `5a2b9a63` (rc 0, "gates: 1646 ran, 0 skipped",
  node v22.23.2), as the caller reported; not rerun by this review.

## Adversarial

**Adversarial: clean.** The reviewer checked, with file:line:

- The exit handler (`scripts/tab-fixtures/record.mjs:244-246`) does only
  synchronous work: `log` calls `console.log` and `evidence.note`, which
  buffers or calls `fs.appendFileSync` (`scripts/tab-harness/run-evidence.mjs:290-300, 313`).
- The line reaches `recorder.log` on every exit path that runs exit
  handlers: the normal end (`evidence.close` has set `closed`), a thrown
  error (`record.mjs:524-526`), the run deadline's `process.exit(1)`
  (`run-guard.mjs:108`), and SIGINT, SIGTERM and SIGHUP through
  `exitOnSignals` (`process-group.mjs:44-49`). The evidence module's own
  exit hook is registered earlier (`run-evidence.mjs:375`), so it flushes
  first. SIGKILL and `taskkill /F` run no handlers; that gap is expected.
- A throwing exit handler does not change the exit code: the reviewer ran
  it on node v22.23.2 with codes 0 and 3, and both were kept.
- `main()` ends with an explicit `process.exit` (`record.mjs:522-527`), so
  open handles cannot hold the process after `wrote`. The only steps after
  `wrote` are the `finally` block (`record.mjs:511-518`).

Unexamined, because the diff touches none of them: `RankError` handling,
the silent-wrong-number lane, test theatre, and `packages/core` purity.

## Domain

Skipped (see the dispatch note).

## Standards + Spec

**Standards: clean.** The comment at `record.mjs:241-243` says why the line
exists and names the ticket. The diff adds no test; `record.mjs` is a
by-hand tool with no agreed test seam (`docs/workflow.md:170-171`), and the
ticket records a live run that printed the line.

**Spec.** The code does what the brief's last sentence asks ("If it does
not reproduce, add what makes the next occurrence name its cause, and keep
the ticket open with a note on what was run"). The ticket is still
`Status: open`.

- **P1** — the ticket note said "If the line itself comes late, the timed
  `recorder.log` lines before it show the step that took the time." After
  `evidence kept in` (`record.mjs:513`) no line is logged until the exit
  line, so a late exit line narrows the wait to `client.close()`,
  `chrome.kill()` and `releaseKeepAwake()` together (`record.mjs:516-518`),
  not to one step. Checked by reading `record.mjs:495-527`.

## Instruction review (ticket 684 note)

Path: full. The note is new text that the next agent on ticket 684 acts
on. Intent (this review's reading of the brief): record what was run, and
tell the next investigator how to read the new exit line.

**Check 1, cold read.** One fresh `general-task` (Opus) investigator got
the ticket at `5a2b9a63` and a made-up Windows occurrence
(`$TMPDIR/684-trial/scenario.txt`: `evidence kept in` at 09:06:40.195Z,
the exit line at 09:44:51.402Z, the command returning 68 ms later). It
followed the note as intended: it compared the exit line with the return
time and cleared pnpm and the shell, then read the cleanup calls and
named the Windows `taskkill` as the one call that can block
(`test-tab-harness.mjs:229-232`). It quoted these sentences as wrong or
misleading:

- "the timed `recorder.log` lines before it show the step that took the
  time" — the same as P1.
- "If a command returns long after that time, the recorder was not the one
  waiting (pnpm, the shell, or a sleeping machine was)" reads as though a
  late exit line rules out sleep. Log times are wall-clock times
  (`run-evidence.mjs:313` uses `Date.now()`), so a sleep during any step
  looks the same as a blocked step. Finding I1.
- "It is unchanged, because recordings now run on WSL" — the cold reader
  objected only because the made-up scenario ran on Windows. Finding I2.
- The original "Cause" section names `client.close()` and
  `releaseKeepAwake()` as suspects, and neither can block (`ws.close()`,
  `test-tab-harness.mjs:334`; `child.kill()`, `keep-awake.mjs:47-49`).
  This sentence is from `dev`, not this branch. Finding I3.

**Check 2, the files the note names.** Read by this review:

| File                                                                                                                 | Result                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.scratch/tab-recordings/logs/2026-11-10T16-21-40-191Z-feral-p3-th-hands-legs/recorder.log`                          | agrees: line 39 `wrote` at 16:26:59.969Z, line 42 exit line at 16:26:59.973Z; "Took 295.8s" is on the `settled` line                                               |
| `.scratch/684-live/batch-1.log`                                                                                      | agrees: line 7 `recorder returned 2026-11-10T16:27:00.031Z rc=0`                                                                                                   |
| `.scratch/agent-reports/2026-11-10-general-task-684-live-exit.md`                                                    | agrees: line 4 names `fix/684-recorder-exit` at `72bc2060`                                                                                                         |
| `/home/daniel/Code/lulz/tbc-gear-prio/.scratch/703-evidence/tab-recordings-logs/`                                    | finding V1                                                                                                                                                         |
| `scripts/tab-fixtures/record.mjs`, `scripts/tab-harness/test-tab-harness.mjs`, `scripts/tab-fixtures/keep-awake.mjs` | agrees: `taskkill` through `spawnSync` with no timeout is the one blocking step on Windows; `holdKeepAwake` returns a no-op off Windows (`keep-awake.mjs:37`)      |
| the two session transcripts the note cites                                                                           | not read: no finding depends on them, so the note's claims from them (the 2026-10-17 Windows timings and the 2026-10-20 Linux batch) are unverified by this review |

- **V1** — the note said "The ten ticket-703 runs on 2026-11-09 each
  exited within 0.5 s of `wrote`". The folder names are UTC times on
  2026-11-10 (`2026-11-10T02-14-54-079Z-...` to `...T02-53-39-368Z-...`).
  For the first nine feral runs the next folder starts 0.417 s to 0.476 s
  after the `wrote` line. The tenth (`2026-11-10T02-53-39-368Z-feral-p3-th-hands-legs`,
  `wrote` at 02:58:38.927Z) is followed by
  `2026-11-10T02-59-08-783Z-feral-p2-fault-sigstop`, 29.9 s later, so the
  folders bound its exit only to 29.9 s. Command:
  `for d in $(ls <703 dir>); do grep -m1 ' wrote ' <d>/recorder.log; done`
  against the folder names.

**Check 3, trial run.** The cold read above is the new-text run. A second
fresh `general-task` (Opus) got the ticket as on `dev` (no `## Comments`)
and the same scenario. It reached the same conclusion from the code alone
(the recorder waited; `taskkill` or a sleep; the logs cannot tell the two
apart), in 8 tool calls against the new-text run's 4. The note changes
what the next agent reads first, not what it concludes, so the trial
shows no harm. Not a finding.

**Rubric pass** (`writing-for-agents`): nothing beyond P1, I1 and V1.

## Summary

The code change is clean on all three checks. Every finding is wording in
ticket 684's note (bookkeeping). P1, I1 and V1 were fixed by rewording the
note in the review commit; I2 and I3 are `wontfix`. No finding blocks the
merge.

Round 2 skipped: every commit after round 1's `<through-sha>` only edits
this review file or ticket 684 (bookkeeping fixes for P1, I1 and V1).
`git log --oneline 5a2b9a63..HEAD` at the time of writing: the review
commit only (it is the commit that adds this file).

Ticket 684 stays open on purpose: the hang did not reproduce, and the
brief says to keep the ticket open with a note on what was run.

Tickets: filed 0, closed 0
(`git diff --name-status dev...HEAD -- '.scratch/carry-forward/issues/*.md'`
lists 684 as `M`; no `Status:` line is added).

## Disposition

| ID  | Axis               | Disposition | Ticket / note                                                                                                                                                                                         |
| --- | ------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | Spec               | fixed       | ticket 684 note now says the last timed line shows where the wait started, and that after `evidence kept in` a wait is in `client.close()`, `chrome.kill()` or `releaseKeepAwake()`                   |
| I1  | Instruction review | fixed       | ticket 684 note now says log times are wall-clock times, so a sleep during any step looks like a blocked step, and a late return after the exit line points at pnpm, the shell, or a sleep after exit |
| I2  | Instruction review | wontfix     | the sentence gives the reason `taskkill` was left unbounded; the objection came from the made-up Windows scenario, not from the note                                                                  |
| I3  | Instruction review | wontfix     | the "Cause" text is the ticket's original hypothesis from `dev`; the new note's last bullet already names `taskkill` as the one step with no time limit                                               |
| V1  | Instruction review | fixed       | ticket 684 note now says 2026-11-10 (UTC), nine runs within 0.42 s to 0.48 s, and the tenth bounded only to 29.9 s                                                                                    |
