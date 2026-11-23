Status: open
Serves: the Upgrades tab's run progress
Type: bug (display)
Origin: fix/web-run-speed, 2026-11-22 (the web-speed investigation; docs/reviews/fix-web-run-speed.md)
Blocks: none
Blocked by: none
Related: 542

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
