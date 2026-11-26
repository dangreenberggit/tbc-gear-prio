Status: closed
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

## Cause (confirmed 2026-11-26)

The hypothesis above is the cause. The web build runs 4 sims at once: the
tab's worker count is 4 when the site's setting is absent
(`worker_pool_sim_runner.ts:24`, `:64`). The figure the trace shows gives
the work done it was priced on, d = el × 1012 / (figure + el). Before the
first landing, d grows at 0.546 per second, which is 4 sims of 7.3 s, the
gap between landing waves. At each wave, d drops by exactly one sim for
each sim that ended without its step landing: the first sim of a ring or
trinket candidate. In the first seven waves that is 4 minus the steps
landed. The losses are whole sims, which no other mechanism gives.

| Wave | At (s) | Steps landed | 4 − steps | Credit lost | Figure before → after |
| ---- | ------ | ------------ | --------- | ----------- | --------------------- |
| 1    | 14.94  | 2            | 2         | 2.02        | 1868 s → 3715 s (+98.9%) |
| 2    | 22.23  | 4            | 0         | 0.03        | 2482 s → 2465 s       |
| 3    | 29.48  | 3            | 1         | 1.01        | 2216 s → 2436 s (+9.9%) |
| 4    | 36.65  | 4            | 0         | 0.03        | 2265 s → 2240 s       |
| 5    | 43.94  | 3            | 1         | 1.02        | 2149 s → 2274 s (+5.8%) |
| 6    | 50.97  | 4            | 0         | 0.05        | 2184 s → 2172 s       |
| 7    | 58.40  | 4            | 0         | 0.03        | 2115 s → 2105 s       |

From wave 8 on, the waves drift apart and a wave mixes first and second
sims, so 4 − steps no longer predicts the loss, but each loss is still a
whole sim (1.01, 0.99, 1.00). Script and output:
`.scratch/agent-reports/2026-11-26-900-time-left-jump/wave_credit.py` in
the main checkout. The first wave lost half the credit, so the figure
doubled; later the same loss is one sim among dozens.

## Fix (2026-11-26)

Count the candidates in sims, as wowsims' Bulk sim counts its sim stage
(`upstream/master` `ui/features/bulk/model/progress.ts:60-66`, with
`useSimCountProgress` set in `ui/features/bulk/model/core_sim.ts:59`): the
stage's size is its sims, and the sims done count by their iterations, a
finished sim as one. A sim that ends then keeps its credit. The engine
sends the candidates' sim count with their progress events, one per legal
slot of each candidate. New, with why: a slot the store answers, or whose
hit read or repair fails, runs no sim, so it leaves the count when the
candidate loop reaches it, and the tab hears of it with the next
candidates' event; Bulk's sim stage has neither. The re-sims stay as
they are: each re-sim step is one sim, so its end and its step come
together.

The progress bar still counts candidates (`utils/format.ts:208-209`),
where Bulk's bar counts sims, as its time left does (`upstream/master`
`ui/features/bulk/model/progress.ts:72-77`). New, with why: the bar counts
whole candidates, which only grow, so it has no jump to fix, and this
ticket leaves it as it was (review finding P1,
`docs/reviews/fix-900-time-left-jump.md`).

## Done when (amended 2026-11-26, before the live run)

Checked by `tl_check_900.py` (in the evidence folder above), on a live ret
web run, Phase 4 from the Phase 3 "P3" preset, at the final fork commit,
with the machine idle:

- **B9 (this ticket):** in the candidates, from the first figure on, the
  figure never rises between two samples by more than the larger of 3 s
  and 20% of the figure before. The 896 trace fails it (+98.9% at
  15.17 s).
- **896's bounds B1, B2, B3, B4, B6, B7 and B8 hold unchanged**
  (`tl_check.py`, 2026-11-24).
- **B5 holds for the re-sims, unchanged.** For the candidates B5 no longer
  applies: its band is wowsims' rule on the steps the dialog shows, and the
  rule now counts sims, which the trace does not show. The engine-order
  test checks the candidates' figure against the rule on the runner's own
  sims instead, exactly.
- The ranking matches the 896 ret web run row for row.

## Close note (2026-11-26)

The live ret web run at `tbc-new-fork@ed4f42caa` (branch
`fix/900-time-left-jump`; WASM, `dist/` on :8193), Phase 4 from the Phase 3
"P3" preset, meets every bound in the amended Done when, checked by
`tl_check_900.py`: 1012 candidates in 2340.7 s, then 20 re-sims in 38.1 s.
The 1-minute load average peaked at 6.7 and I started nothing else during
the run (`load.log`).

When the first candidates landed, at 15.12 s, the figure went from 36m 03s
to 36m 22s (+0.9%), where the 896 run jumped from 31m 08s to 1h 01m 55s
(+98.9%). The largest rise anywhere in the candidates was +1.3%
(2212 s to 2241 s at 9.11 s).

| Bound | Measured | Limit | Result |
| --- | --- | --- | --- |
| B9, candidates' largest rise between samples | +1.3% (29 s); 0 of 4672 pairs over the limit | max(3 s, 20%) | pass |
| B1, error at 10% / 25% / 50% landed | -0.031 / -0.094 / -0.038 | 0.45 | pass |
| B2, error at 75% / 90% landed | -0.016 / -0.020 | 0.50 / 0.30 | pass |
| B3, worst error, 5%-35% of the stage's time | -0.120 (1402 samples) | 0.50 | pass |
| B4, re-sims' worst error more than 10 s before the end | +0.137 | 0.30 | pass |
| B5, re-sims outside wowsims' rule | 0 of 56 | 0 | pass |
| B5, candidates | not applicable (counts sims) | | |
| B6, "0s remaining" or a figure where none belongs | 0 of 4839 samples | 0 | pass |
| B7, first figure after the candidates start | 0.25 s | 5 s | pass |
| B8, re-sims' holds over 5 s / rises over the limit | 0 / 0 | 0 | pass |

The ranking matches the 896 ret web run row for row: 997 of 997 rows, with
the same baseline (2230.4), four rows above the cutoff, 1012 eligible and
the same 16 worn items (`same-vs-896.txt`, `IDENTICAL: True`).

The candidates ran 9.8% longer than on the 896 run (2340.7 s against
2131.6 s), though the median 1-minute load was lower (4.4 against 5.6).
Why is not known; no bound depends on the stage's length.

Verified by: `python3 -I .scratch/agent-reports/2026-11-26-900-time-left-jump/tl_check_900.py .scratch/agent-reports/2026-11-26-900-live-ret-web/ret-web/run/tail.jsonl`
(checker in the main checkout, trace in the `tl-jump-900` pair; prints
`"verdict": "PASS"`, saved as `tl_check_900.json` beside the run), and
`python3 -I .scratch/worktree-archive/e2e-8c67/e2e/strict_same.py .scratch/agent-reports/2026-11-24-time-left-per-stage/ret-web/run/result.json .scratch/agent-reports/2026-11-26-900-live-ret-web/ret-web/run/result.json ret-web`
(the script and the 896 result in the main checkout, the new result in the
pair; prints `IDENTICAL: True`); `tbc-new-fork@ed4f42caa`;
`docs/reviews/fix-900-time-left-jump.md`.
