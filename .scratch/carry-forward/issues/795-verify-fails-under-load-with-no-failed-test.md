Status: open
Type: bug
Origin: docs/reviews/feat-620-item-level.md (merge check runs 2 and 3)
Blocks: none
Blocked by: none
Related: 683, 221

# `pnpm verify` fails under high machine load while every test passes, and hides vitest's error

## What an agent sees

`pnpm verify` exits 1 and prints:

```
vitest exited nonzero, but its JSON report lists no failed test or file.
Full JSON report: /tmp/claude-1000/tbc-verify-<id>/vitest-report.json
```

The kept JSON report says `success: true`, 1529 passed, 2 todo, 0 failed.
The log has no other error line, so nobody can see why vitest exited 1.

## Evidence

2026-11-03, Node v22.23.2:

- `.scratch/agent-reports/2026-11-03-verify-tip.txt` (pair
  `.scratch/wt-620-ilvl`, main `b5251c39`): `EXIT_STATUS=1`, the message
  above at line 52. `uptime` load average 4.41 at the start (15-minute
  value 24.24) and 45.53 at the end.
- `.scratch/agent-reports/2026-11-03-verify-tip-rerun.txt` (same pair,
  same tip): `EXIT_STATUS=1`, same message. Load average 44.31 at the
  start, 37.11 at the end.
- `docs/reviews/feat-620-item-level.md` § Summary, merge check runs 2 and
  3 (`pnpm merge-to-dev --check-only` at `59bbbbdb`, load 45 and 48 at the
  start): rc 1 at the verify step, same message, report `success: true`.
  Run 1 at `df22da24`, load 21, passed.
- Five JSON reports that verify kept on failure, read on 2026-11-03 under
  `/tmp/claude-1000/` (temporary, not kept long): `tbc-verify-EkfXpY` and
  `-7JV21s` (written at 14:54 and 14:58 local, when the two verify-tip
  runs ended), `-63MO1i` and `-5seNJ3` (15:19 and 15:23; their
  fork-meta-repair file times, 143 s and 133 s, are the ones the review
  gives for merge check runs 2 and 3), and `-70Ft8y` (14:26, run not
  identified). Each says `success: true`, 0 failed. In every one the
  slowest case is 535-O1 in `packages/core/test/fork-meta-repair.test.ts`
  (88-119 s); the whole file took 109-143 s.
- The narrow-width review (`.scratch/wt-narrow-width/docs/reviews/fix-narrow-width-607-603.md`
  at `9ebaa5b2`) was named as holding two more failures of this kind. Its
  text has no verify failure (`grep -n -i -E "nonzero|no failed|load" <file>`
  finds none), and the four verify logs in that pair's
  `.scratch/agent-reports/` (`2026-11-03-verify*.txt`) all end
  `EXIT_STATUS=0`.

## Why the error is lost

`scripts/run_verify.mjs` runs `vitest run --reporter=json
--outputFile=<tmp>` (lines 141-153). Vitest's output is streamed to the log,
but the JSON reporter is the only reporter, and it prints no line for an
error that is not a test failure. The JSON report has no field for such
errors (its keys are the `num*` counts, `snapshot`, `startTime`, `success`
and `testResults`). `reportVitestFailure` (lines 236-250) prints failures
from the report only, so it falls back to the message above.

## Likely cause (hypothesis, untested)

Closed ticket 683 traced the same message to vitest's worker RPC timeout
(`Error: [vitest-worker]: Timeout calling "onTaskUpdate"`, a fixed 60 s
timer in vitest 3.2.7): case 535-O1 held the worker in one synchronous
stretch for longer than 60 s. Its fix awaits `yieldToEventLoop()` at the
top of every 535-O1 job (`fork-meta-repair.test.ts:810` and `:872`), and
measured the longest job at 0.7 s with the machine not loaded.

That the 2026-11-03 failures are the same RPC timeout is a hypothesis,
untested, because the error line is lost. If they are, which stretch now
runs past 60 s under load (one job, the work between two yields, or the
main process being too busy to answer) is also a hypothesis, untested.

## Done when

- When vitest exits nonzero and its JSON report lists no failed test,
  `pnpm verify` prints vitest's own error text. For example, run a second
  reporter that prints errors next to the JSON one. Check: ticket 683's
  scratch test (a busy-wait that starts inside an I/O completion, after one
  `onTaskUpdate` request) makes `pnpm verify` print the `Timeout calling`
  line.
- With that output, the stretch that trips the timeout under load is
  found, and the cause is removed: the slow case does less work or yields
  where it holds the worker. A longer RPC timeout is not the fix; ticket
  683 found that vitest has no option for it, and a longer timer would
  hide the starved reply.
- Five `pnpm verify` runs in a row pass while the load average is above
  30, with `uptime` recorded before and after each run.
