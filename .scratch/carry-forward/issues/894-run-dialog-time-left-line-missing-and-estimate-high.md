Status: closed
Type: bug (display)
Origin: fix/893-set-stage-progress, 2026-11-23 (live web feral run; docs/reviews/fix-893-set-stage-progress.md)
Blocks: none
Blocked by: none
Related: 542, 893

# The run dialog shows no time left, and its estimate reads far too high

## What happens

The owner asked for a time-left figure in 542 ("we should have this"), and
542 shipped one. The React port (`e364ca1d4`, "Add the Upgrades tab as a
React feature after Bulk") dropped the line: `RunProgressDialog.tsx` shows the
stage, the bar and the elapsed time, and nothing reads `remainingMs`. The
estimate is still computed in `run_progress.ts`.

On `fix/893-set-stage-progress` the line was put back in the Bulk dialog's
words and place (`upstream/master` `BulkProgressMessage.tsx:12-13`,
`bulk_tab.progress.time_remaining`) and measured on a live web feral run
(phase 3 from the Phase 2 "BiS 6%" preset, done at 3381.2 s). While
candidates were simmed it read 55-79% high:

| At | Shown | Really left |
| --- | --- | --- |
| 1183 s | 1h 05m 13s | 2198 s |
| 1353 s | 59m 31s | 2029 s |
| 1691 s | 45m 05s | 1690 s |
| 2536 s | 22m 39s | 846 s |
| 3016 s (last candidate) | 5m 35s | 365 s |

So the line was taken out again before merge.

## Why (hypothesis, untested live)

The `slowdown` term (0.003064, fitted on 2026-10-03 when each new row slowed
the next candidate) roughly doubles the candidates still to come. Replaying
the estimator on recent traces with `slowdown` 0 instead gives errors of
-0.13 to +0.15 between 20% and 90% of the run on this run, -0.02 at 50% on
the 2026-11-22 web run (`w2-after`) and -0.02 at 50% on the 2026-11-23
desktop feral run, against +0.54 to +0.82 with the shipped value. The set
stage's cost also differs by transport (45.34 candidates' time on web, 20.1
on desktop, `run_progress.ts`).

Readbacks: the pair `tbc-wt/set-stage-893`, `.scratch/893/web/` (gitignored;
`analyze.py` there prints the table).

## Done when

The run dialog shows the time left again in the Bulk dialog's words, and on
one live web and one live desktop feral run the figure shown at 50% done is
within a bound stated before the runs, with the error written in the close
note.

## Bound for the live runs (stated 2026-11-24, before either run)

At 50% of the run's wall time (Run click to the dialog closing), the time
left the dialog shows is within 25% of the time the run really has left:
`|shown - left| / left <= 0.25`. The 0.25 is ticket 542's limit (`BOUND` in
`.scratch/handoffs/542-run-progress/replay.mjs:32`). The runs: one web and
one desktop feral run, phase 3 from the Phase 2 "BiS 6%" preset, each with
nothing else simming on the machine.

Added after the desktop run, at review (finding F1); the measuring point
above is unchanged:

- "50% done" in § Done when means 50% of wall time, as above. 542 measured
  at the first sample with done/T >= 0.5 (`replay.mjs:546`); this ticket
  does not.
- The sample judged is the one `analyze.py` picks (`.scratch/894/` in the
  pair, copied from the 893 pair): of the 500 ms samples that show a figure,
  the one nearest half the wall time. If that sample is more than 5% of the
  wall time away from the half, the run fails the bound.
- "Nothing else simming" could not be enforced: other agents share the
  machine. `.scratch/894/loadavg.log` records the load every 30 s.

## Fix (fork 77a6fe461 and a29f3cd28, branch fix/894-time-left)

- The dialog shows the time left again, in the Bulk dialog's words and place
  (`upstream/master` `ui/features/bulk/components/BulkProgress/BulkProgressMessage.tsx`).
- `run_progress.ts` drops the `slowdown` term: the candidates left cost the
  time per candidate so far.
- The line shows only while candidates or the top rows are simmed
  (a29f3cd28, from the review): once the results are ranked it read "0s
  remaining" while the dialog was still open.

Replay of the fork's real `RunProgressTracker` over five recorded feral runs
(error at 50% of wall time, shipped slowdown → none):

| Run | Shipped | No slowdown |
| --- | --- | --- |
| web 2026-11-23, 893 pair | +0.600 | +0.011 |
| web 2026-11-22, `w2-after` | +0.538 | -0.024 |
| desktop 2026-11-23, e2e-final | +0.548 | -0.018 |
| desktop 2026-11-23, `d2-after` | +1.747 | +0.649 |
| web 2026-11-23, e2e-final | no figure yet | no figure yet |

The last two ran while other sims shared the machine: the e2e-final web run
overlapped the desktop gate and a web ret run (both started at 14:18 UTC), so
its first half ran at about half the second half's pace; `d2-after`'s pace
also doubled late in the run, cause not found.

## Close note (2026-11-24)

Both live runs at fork `tbc-new-fork@77a6fe461` meet the bound. Feral, phase
3 from the Phase 2 "BiS 6%" preset, error at the sample nearest half the wall
time (`analyze.py`):

| Run | Wall time | At | Shown | Really left | Error |
| --- | --- | --- | --- | --- | --- |
| desktop (`wowsimtbc` on :3333) | 296.8 s | 148.2 s | 113 s | 148.6 s | -0.240 |
| web (WASM, `dist/` on :8196) | 3817.9 s | 1909.1 s | 2144 s | 1908.8 s | +0.123 |

Away from half the run the figure is looser, which the bound does not
judge: desktop read -0.19 at 40%, +0.48 at 75% and +0.28 at 90%; web read
+0.22, +0.27 and -0.04. Both runs showed no time left in all of the set
stage's samples (desktop 27, web 514), and a figure in every re-sim sample.
The machine was shared: the 1-minute load average ran from 4.4 to 49.9 on
20 cores, median 9.4 (`.scratch/894/loadavg.log`). The web run took 3818 s
against 3381 s on 2026-11-23.

Verified by: `python3 .scratch/894/analyze.py .scratch/894/web/run/tail.jsonl`
and `python3 .scratch/894/analyze.py .scratch/894/desktop/run/tail.jsonl` in
the pair `tbc-wt/time-left-894` (gitignored readbacks), and
`docs/reviews/fix-894-time-left.md`.
