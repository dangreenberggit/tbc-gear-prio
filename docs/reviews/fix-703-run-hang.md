# Pre-merge review — fix/703-run-hang

Reviewed range: `86b5f5e10d88b177c71b8532933369b9fe76c2ba..5b98dc8ca5233a6fe52031eea1a6bc0a589efd1b`
Reviewed range: `5b98dc8ca5233a6fe52031eea1a6bc0a589efd1b..b3e0081a57f2c38f062bd66744ba4ffbf389548a`
Reviewed range: `b3e0081a57f2c38f062bd66744ba4ffbf389548a..485b8ba1e8a01fd1999439682d7d6e1262af86d2`

## Dispatch note

- Tooling check: `python scripts/check_merge_ready.py --product-files`
  printed `scripts/dev-tab.mjs`, `scripts/tab-fixtures/record.mjs`,
  `scripts/tab-fixtures/run-evidence.mjs` and
  `scripts/tab-fixtures/run-evidence.test.mjs` (rc=0). The axes read those
  four files. The one other changed file, the ticket
  `.scratch/carry-forward/issues/703-tab-fixture-runs-sometimes-never-settle.md`,
  is on `TOOLING_PATHS`. `instruction-review` was not run on it: it is a
  ticket, not agent instructions, and the Spec axis read it as its spec and
  checked its account of the runs (same practice as
  `docs/reviews/fix-644-655-set-bonus-list.md`).
- Lane: `git diff --shortstat dev...HEAD` gave 5 files changed, 753
  insertions, 13 deletions, so this is not a small change; full axes ran.
- Domain axis skipped: the diff is recorder and dev-server tooling (CDP
  events, backend request trace, a stall watchdog) and states no TBC, WCL
  or wowsims fact.
- Reviewers: `codex` is not on `PATH` (`which codex` rc=1), so each axis
  was a fresh `general-task` (Opus) subagent, the review type
  `~/.claude/routing.md` § Decision table row 1 names. The Standards + Spec
  axis ran the `code-review` skill.
- The fork pin does not move (`git diff --quiet dev...HEAD --
data/wowsims-fork.lock.json`), so there is no fork range.

## Adversarial

The unit test passes (13/13, `node --version` v22.23.2,
`vitest run scripts/tab-fixtures/run-evidence.test.mjs`, rc=0).

- **A1 (medium): evidence is incomplete or missing on the 25-minute
  deadline and on a signal.** `armRunDeadline` (`run-guard.mjs:85-94`)
  calls `process.exit(1)`; the only handler left is `onExit`
  (`run-evidence.mjs:249-257`), which writes `summary.json` with no error
  text and does not copy `backend.log`, take the goroutine dump or write the
  last request and console lines. A run whose backend traffic keeps flowing
  but never shows "Took" takes this path, because no stall rule fires while
  requests keep arriving. On SIGINT or SIGTERM nothing handles the signal
  (no `process.on(` for a signal in `scripts/tab-fixtures/`); a Node
  one-liner showed SIGTERM skips the `exit` handler (rc=143, no file), so
  no summary or backend log is written and up to 1 s of buffered lines is
  lost.
- **A2 (low-medium, test theatre):** "forgets a sim once its polls stop"
  (`run-evidence.test.mjs:58`) still passes with the forget code
  (`run-evidence.mjs:137-140`) deleted (mutation run in a copy under
  `$TMPDIR`): at t=100 s the sim has run 100 s, under the 120 s limit, so
  the result is null either way.
- **A3 (low): the run's `backend.log` can be silently empty.** When the
  backend on :3333 was started from another checkout and this checkout has
  an old log, the copy writes 0 bytes (`run-evidence.mjs:205-207, 335-347`)
  and `summary.backendLog` names the path as if it were found (`:243-244`).
  From reading the code, not run.
- **A4 (low):** `log("evidence kept in")` at `record.mjs:502` runs after
  `close()` has stopped the flush timer and removed the exit hook
  (`run-evidence.mjs:391-394`), so that line never reaches `recorder.log`.
- **A5 (low, hypothesis, untested): the stall message can blame the wrong
  thing.** `Target.detachedFromTarget` is not handled, so a request of a
  worker that was ended mid-request stays in flight and 120 s later the
  message says the backend request "has had no answer". It says the same
  when the response headers arrived but the body did not finish.

Checked, nothing found: lost server output in `dev-tab.mjs` (a scratch copy
of its pipe-then-exit pattern, 33 runs with bursts up to 300 KB, lost
nothing); the watchdog firing on a healthy run (longest measured sim 2.4 s
against 120 s; polls every 50 ms, `worker_http.ts:68` in the fork, against
the 15 s gap rule); the "run failed" check (`upgrades-status-alert` holds
text only when the run status is `error`, `StatusLine.tsx:61-63`); exit
codes (a thrown error is rethrown and the process exits 1).

Unexamined: `packages/core` purity and `RankError` handling (the diff
touches neither); whether CDP reports worker requests on the worker's own
session in a live run (no live run allowed).

## Standards + Spec

**Standards:** no hard violations; three code-quality rows (below).

**Spec:**

- **P1 (wrong claim in the ticket):** the ticket's "Two places a run could
  stall" says stall (1) is reported as "the page sent no backend request"
  with the 204 quoted. During the 10 silent minutes the worker keeps
  polling `/asyncProgress` every 50 ms (`worker_http.ts:54-68`) and each
  poll gets a 200; the 204 comes only after `asyncProgressSilenceTimeout`
  (10 min, `main.go:154,244`). So the sim rule (`run-evidence.mjs:136-143`)
  fires first, at 120 s, with "sim … polled … with no final answer"; the
  "no request" message can quote the 204 only when `TBC_RECORD_STALL_S` is
  over 600.
- **P2 (partial gap):** the same as A1. The folder
  `.scratch/tab-recordings/logs/2026-11-10T02-59-08-783Z-feral-p2-fault-sigstop`
  shows a signal-ended run: two recorder lines and no `summary.json`. The
  ticket does not mention this first fault attempt, and the doc comment at
  `run-evidence.mjs:184-188` says a deadline-ended run "still leaves its
  files".
- **P3 (partial against "the recorder's CDP trace"):** the trace keeps
  console events and backend-URL network events only
  (`run-evidence.mjs:261-318`); the recorder's own CDP commands are not
  logged.
- **P4 (stale citation):** the ticket cites the 25-minute error as
  `record.mjs:331`; it is now at `record.mjs:416`
  (`grep -n RUN_LIMIT_MS record.mjs`).

Checked and consistent: in the 10 repro folders, run start to close took
190–331 s, "Took" 183.3–325.6 s, the longest sim 2.46 s, every answer 200
(a python pass over `backend-requests.jsonl` and `summary.json`); the
longest gap with no backend request in flight was 0.19 s (the ticket says
0.3 s); the fault-test error matches `summary.json` in the `03-09-14-663Z`
folder; the fork's backend imports `net/http/pprof` (`sim/web/main.go:11`).
That the runs used Playwright's headless shell is unverified.

## Code quality

| ID  | Where                          | Row                                                                                                         |
| --- | ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| S1  | `run-evidence.mjs:134,153,306` | The `?requestId=` suffix is built three times; one helper.                                                  |
| S2  | `record.mjs:375-379`           | `armRunDeadline` builds `record ${args.spec}-p${args.phase}-${args.name}` by hand; `label` (:217) holds it. |
| S3  | `run-evidence.mjs:159,353,372` | JSDoc lines that say what the function does, not why (global comment policy).                               |

## Round 1 fixes

- `8b3a7e39` "Keep run evidence on every exit (A1-A5, P3)": A1/P2, A2, A3,
  A4, A5 and P3, each with a test that the fixer reports failed with its fix
  reverted (26 tests in `scripts/tab-fixtures/`, 13 before).
- `a87d0efd` "Stub the goroutine fetch in evidence tests (A1)": the A1
  deadline tests read a local stub server, not the backend on :3333.
- `5fcfbfcb` "Apply the 703 code-quality pass (S1-S3)": the code-quality
  pass, by one fresh `general-task` agent; `pnpm verify` rc=0 after it.
- The ticket commit after these: P1 (stall (1) is reported by the sim
  rule), P4 (the stale `record.mjs:331` citation) and the first fault
  attempt folder from P2, in
  `.scratch/carry-forward/issues/703-tab-fixture-runs-sometimes-never-settle.md`.

## Focused check (round 2)

Range `5b98dc8c..b3e0081a`; no fork range (the fork pin does not move). One
fresh `general-task` (Opus) agent ran the four checks.

1. Conditions hold. Each commit names its finding IDs or only edits this
   file and the ticket; every non-test code hunk belongs to a cited finding
   (A1, A3, A4, A5, P3, S1, S2), and none belongs to no finding.
2. The fix commits change only what each finding asks for (with R1 below).
3. Spot checks with the fix reverted, in scratch copies under `$TMPDIR`:
   A2, A3, A5(a) and the A1 signal tests each fail without their fix; the
   unchanged copy passes 26/26.
4. `node --version` v22.23.2; `vitest run scripts/tab-fixtures/` 26/26,
   rc=0.

Findings other than bookkeeping, so the review stops here (skill "Round
limit"):

- **R1 (low, code quality):** the SIGINT/SIGTERM handler that A1's fix
  added (`run-evidence.mjs:368-377`) repeats `exitOnSignals()`
  (`scripts/process-group.mjs:43-49`), which `launchChrome`
  (`scripts/tab-harness/test-tab-harness.mjs:236`) installs and
  `record.mjs:255` reaches. That turns the signals into
  `process.exit(128+n)`, which runs the exit hook, and the exit hook now
  keeps the full evidence. So A1's "nothing handles the signal" was wrong
  for `record.mjs` (the round-1 check ran a bare Node process); the
  deadline half of A1 stands. The new handler's only extra effect is the
  "ended by SIGx" outcome text, and its test runs a child without
  `exitOnSignals`, a setup `record.mjs` never has.
- **R2 (low, test hygiene):** `tempRun` in `run-evidence.test.mjs:160`
  makes `run-evidence-*` folders with `fs.mkdtempSync` and never removes
  them; about 11 are left per test run
  (`ls $TMPDIR | grep -c '^run-evidence-'` counted 250).

An assessor that neither wrote nor reviewed the work judged that nothing
had gone wrong beyond A1's wrong signal premise, that both findings shrink
to deletion-sized fixes, and that one more focused round would likely
settle them. The owner answered "fix" (2026-11-10, relayed by the
coordinator), which makes round 3 a further last round.

## Focused check (round 3)

Range `b3e0081a..485b8ba1` (`69c545f5` only edits this file); no fork
range. Fix commit `485b8ba1` "Use exitOnSignals and clean test dirs (R1,
R2)": `openRunEvidence` calls `exitOnSignals()` in place of its own
handler, so a signal ends the run through the exit hook, which keeps the
full evidence; `tempRun` records its folders and an `afterAll` removes them.
Beyond the ask, the exit hook maps an exit code of 128 + SIGINT, SIGTERM or
SIGHUP back to the signal's name, so the summary still names the signal
(A1). One fresh `general-task` (Opus) agent ran the four checks:

1. Conditions hold: both commits name R1, R2 or only edit this file; every
   changed non-test line is inside `openRunEvidence`, where R1 points.
2. Only what was asked. The extra mapping cannot misname a cause today:
   `record.mjs` exits only with 0, 1 or 2 from `main` and 1 from the run
   deadline (`run-guard.mjs:108`), and on the deadline path `fail()` keeps
   the deadline's own error (`run-evidence.mjs:334`).
3. With `exitOnSignals();` removed in a scratch copy, the SIGINT/130 and
   SIGTERM/143 tests fail; the unchanged copy passes 26/26. A test run adds
   no `run-evidence-*` folder (250 before and after; the 250 are from
   earlier runs).
4. `node --version` v22.23.2; `vitest run scripts/tab-fixtures/` 26/26,
   rc=0.

No findings.

## Summary

Round 1 (full axes, domain skipped) found five adversarial findings, four
spec findings and three code-quality rows; all were fixed in `8b3a7e39`,
`a87d0efd`, `5fcfbfcb` and `b3e0081a`. Round 2 passed its four checks but
found R1 and R2 in the lines the fixes wrote. The owner chose "fix"; R1 and
R2 were fixed in `485b8ba1`, and round 3 passed its four checks with no
findings. Every finding is `fixed`. Tickets: this branch filed 0 and closed
0 (ticket 703 existed at the merge base and stays open, because the hang
has not reproduced and its cause is not found).

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                         |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `8b3a7e39`, `a87d0efd`: full evidence on the deadline; signals through `exitOnSignals()` (`485b8ba1`) |
| A2  | Adversarial | fixed       | `8b3a7e39`: the test fails with the forget code removed (round 2 check 3)                             |
| A3  | Adversarial | fixed       | `8b3a7e39`: summary and `recorder.log` say when the backend wrote nothing                             |
| A4  | Adversarial | fixed       | `8b3a7e39`: lines noted after close reach `recorder.log`                                              |
| A5  | Adversarial | fixed       | `8b3a7e39`: answered-but-unfinished message; a detached worker's requests leave the in-flight set     |
| P1  | Spec        | fixed       | `b3e0081a`: the ticket says stall (1) is reported by the sim rule                                     |
| P2  | Spec        | fixed       | same fix as A1; the first fault folder is noted in the ticket (`b3e0081a`)                            |
| P3  | Spec        | fixed       | `8b3a7e39`: `cdp-commands.jsonl` logs the recorder's own CDP commands                                 |
| P4  | Spec        | fixed       | `b3e0081a`: the stale `record.mjs:331` citation                                                       |
| S1  | Standards   | fixed       | `5fcfbfcb`: one `requestPath` helper                                                                  |
| S2  | Standards   | fixed       | `5fcfbfcb`: `armRunDeadline` gets `label`                                                             |
| S3  | Standards   | fixed       | `5fcfbfcb`: what-not-why comments deleted                                                             |
| R1  | Focused (2) | fixed       | `485b8ba1`: own signal handler removed; `exitOnSignals()` called                                      |
| R2  | Focused (2) | fixed       | `485b8ba1`: `afterAll` removes the test folders                                                       |
