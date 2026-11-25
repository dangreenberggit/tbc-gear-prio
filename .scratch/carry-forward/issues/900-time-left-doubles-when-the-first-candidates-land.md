Status: open
Type: bug (display)
Origin: the live ret web run of fix/896-stage-time-left at tbc-new-fork@24e9ca02e, 2026-11-24
Blocks: none
Blocked by: none
Related: 896, 897

# On web, the time left doubles for a few seconds when the first candidates land

## What happens

On the live ret web run (Phase 4 from the Phase 3 "P3" preset), the
candidates took 2131.6 s. The time left read 37m 03s, then fell to 31m 08s
over the first 7 s. At 15.17 s, as the first two candidates landed, it
jumped to 1h 01m 55s. It was back under 45 minutes 4.5 s later, and at
41m 22s 7 s later. After that it never rose between two samples by more
than the larger of 3 s and 20%, and the feral desktop run at the same commit showed no such rise
(`.scratch/agent-reports/2026-11-24-time-left-per-stage/ret-web/run/tail.jsonl`,
`.../feral-desktop-final/run/tail.jsonl` in the main checkout).

No bound set for 896-898 covers it: they start at 10 s into the stage
(`tl_check.py` B5) or at 5% of its wall time (B3), and this is 7.8 s in.

## Why (hypothesis, untested)

The figure counts each sim under way by its share of iterations done, and a
sim that ends gives up its share before the step it belongs to is counted
(`ui/features/upgrades/model/run_progress.ts`, `observeIterations`). A ring
or trinket candidate is one step of two sims run one after the other, so its
first sim's share is lost until the second sim ends (review finding F2,
`docs/reviews/fix-896-stage-time-left.md`). On web the steps land in waves
about 7 s apart (`counterChanges` in `ret-web/run/result.json`: 2 steps at
14.94-15.12 s, 4 at 22.23-22.45 s). Just before the first wave the sims
under way held about 3.7 steps of credit, and just after it about none,
with 2 steps counted. With so few steps done, that loss doubles the figure;
later in the stage a few steps are lost among hundreds done. The trace holds
no iteration counts, so which sims ended at 15 s is not recorded.

## What would fix it (not decided)

The archived fork commit `ab3d5a732` counted only the re-sims by their
iterations, for this reason: "there each sim the runner runs is one counted
sim, while a candidate can take several." fix/896-stage-time-left counts the
candidates' sims too, so a figure shows before the first step lands (898).
Going back to re-sims only would show no figure until then: 7.3 s into the
candidates on this run, past 898's bound of 5 s.

- Tell the tracker which step each sim belongs to, so a sim's end keeps its
  credit until its step lands. The runner's ids do not carry that today; it
  would need a change in the engine's candidate loop (a ported file) or the
  runner's interface.
- Count the stage in sims rather than steps, as wowsims' Bulk sim counts
  iterations (`upstream/master` `ui/features/bulk/model/progress.ts:60-65`).
  The stage's size would then need to be known in sims up front, and today
  the total counts steps.

## Done when

On a live ret web run from the previous phase's preset gear, from the
candidates' first figure on, the figure never rises between two samples by
more than the larger of 3 s and 20% of the figure before.
