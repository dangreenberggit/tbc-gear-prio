Status: closed
Serves: the Upgrades tab's run progress
Type: bug (display)
Origin: fix/web-run-speed, 2026-11-22 (the web-speed investigation; docs/reviews/fix-web-run-speed.md)
Blocks: none
Blocked by: none
Related: 542, 894

# The counter and the time left stand still while set bonuses are measured

## What happens

While the status reads "Measuring set bonuses", the counter stays at the
number it reached after the last candidate (663/699 on the feral run below)
and the time left does not count down, until "Re-simming the top rows"
starts. On the web build that is about 4 minutes; on desktop about 15 s.

Measured on the feral phase 3 run from the Phase 2 "BiS 6%" preset, 646 rows,
fork `cb92de833` (gitignored readbacks in the pair
`tbc-wt/web-speed/.scratch/wsp/runs/`): web `w2-after`, set stage 244.2 s;
desktop `d2-after`, 15.0 s. Before `cb92de833` the web set stage took
527.1 s (`w2-before`), and the owner's brief reported the counter at
"663/699 for 523 s".

## Why

- The set phase sends no progress events: `model/run_progress.ts` infers
  the stage from `done === doneAtLastCandidate`, so the counter cannot move.
- In that stage `estimateRemainingMs` returns the value it had at the
  boundary (`run_progress.ts`, the branch reading `lastCandidateEvent.t`); it
  does not subtract the time spent in the stage, so the time left is frozen
  too.

## Done when

The time left counts down during the set stage (and stays true in every
state), and the counter either moves or the screen says plainly that this
stage has no count. Match what wowsims' own bulk sim shows during a stage
with no count before inventing anything.

## Comments

**2026-11-23, closed** on `fix/893-set-stage-progress` (fork
`7ad984d47`, main side re-pinned to it).

What the player sees now: while "Measuring set bonuses" shows, the bar is
an empty track with no count under it, and there is no time left; the
elapsed time keeps ticking. The count comes back when "Re-simming the top
rows" starts. This is what wowsims' Bulk sim shows in a stage it has no
count for: `candidateGearProgress` sends no current, total or time
(`upstream/master` `ui/features/bulk/model/progress.ts:32`), its bar then
shows no fill and no count (`ui/ui-kit/ProgressTrackerDialog/ProgressTrackerBar.tsx:24-39`),
and its dialog shows no time-left line (`BulkProgressMessage.tsx:12-15`).
The estimator gives no time left in that stage either (`run_progress.ts`).

Why not a moving count: the stage's number of sims is not known when it
starts. Each step's count depends on the step before (`set-phase.ts`
`buildSetBonuses`, then `measureBonusGear`), and sims already in the store
finish at once.

The time-left clause: the run dialog has shown no time left at all since
the React port (`e364ca1d4`); the frozen figure this ticket describes was
the estimate inside `run_progress.ts`, not text on screen. Bringing the line
back was tried on this branch and measured on the live run below: it read
55-79% high while candidates were simmed, so it was taken out again and
filed as 894. So the clause is met as "no time left in that stage, as
wowsims shows", not as a countdown; nothing in wowsims counts a time down
without a count.

Live run: web (WASM) build, feral phase 3 from the Phase 2 "BiS 6%"
preset, 646 rows, `clickToDoneS=3381.2`, harness rc=0. The set stage ran
3016.6 s to 3248.5 s (231.9 s); all 463 samples in it read no counter, no
time left, bar unmeasured, while the elapsed time went 50m 17s to 54m 08s.
Screenshots at 3017.8, 3078.5, 3139.1 and 3199.8 s show the same dialog.
The count came back at 663/699 at 3249.0 s. That run had the time-left line
in it; the build at `7ad984d47` differs only by not showing that line.
Rankings: all 646 rows and the baseline (2448.7) equal the 2026-11-23 web
feral readback, row for row.

Verified by: `docs/reviews/fix-893-set-stage-progress.md`; tbc-new-fork@7ad984d47;
`python3 .scratch/893/analyze.py .scratch/893/web/feral-p3-from-p2bis/tail.jsonl`
and `python3 .scratch/893/rows-equal.py .scratch/893/web/feral-p3-from-p2bis/result.json <main checkout>/.scratch/worktree-archive/e2e-final/e2e/web/feral-p3-from-p2bis/result.json`
in the pair (the run's files are gitignored).
