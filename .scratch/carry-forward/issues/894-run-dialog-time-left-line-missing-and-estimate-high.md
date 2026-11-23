Status: open
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
