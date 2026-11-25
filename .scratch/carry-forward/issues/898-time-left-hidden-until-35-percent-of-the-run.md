Status: closed
Type: bug (display)
Origin: the review of fix/894-time-left-2 (not merged; archived as .scratch/worktree-archive/tl-894/main-commits/0003-Add-the-pre-merge-review-of-fix-894-time-left-2.patch)
Blocks: none
Blocked by: none
Related: 542, 894, 896

# The time left shows only once 35% of the run is done

## What happens

The run dialog shows no time left until the tenth candidate is in and 35% of
the run's counted sims are done
(`vendor/tbc-new-fork/ui/features/upgrades/model/run_progress.ts:32`,
`RUN_PROGRESS_SHOW_FROM_FRACTION = 0.35`, checked at `:304`). On a web feral
run shaped like 893's, the first figure appears about 19 minutes into a run
of about 56 minutes (done 245 of about 700). wowsims' Bulk sim shows one from
the first step done (`upstream/master` `ui/features/bulk/model/progress.ts:34`,
`completed > 0`).

## Why

The 35% hold came from 542's stability fit
(`.scratch/handoffs/542-run-progress/decision.md:76`, `:115`), made for the
October estimator with the slowdown term. Ticket 894 removed that term, and
neither the code nor 894's commits say why the hold stays.

Found by the domain reviewer of the unmerged second 894 attempt,
`fix/894-time-left-2` (finding D1). Its replays, on four clean feral runs and
one warlock run with the hold removed: with no floor the figures at 1 to 5
candidates read up to +2.26; from the tenth candidate to 35% of the run the
worst error was 0.246, 0.266, 0.243, 0.252 and 0.221. Those replays ran that
branch's tracker, not the merged one (hypothesis, untested, that the merged
tracker reads the same: both price candidates the same way).

## What would fix it

Drop the 35% hold and keep the ten-candidate floor, with a comment saying why
the floor stays. The unmerged branch did this in fork commit `046fd4045`
"Show the time left from the tenth candidate (894 review)", with tests in the
fork and in `packages/core/test/fork-run-progress.test.ts`; saved in
`.scratch/worktree-archive/tl-894/fork-commits/0002-*.patch` and
`main-commits/0002-*.patch` in the main checkout. It was written on that
branch's tracker, so it needs porting.

Not fixed when `fix/894-time-left` landed: it changes what the player sees in
the first third of every run, ticket 894's live runs were measured with the
hold in place, and the newly shown figures read up to 25% off in the replays,
so it wants its own live check.

## Done when

The time left shows from the tenth candidate, and on a live web feral run
every figure shown from then until 35% of the run is within |error| <= 0.30.

## Done when (amended 2026-11-24)

The orchestrator's brief: "match when wowsims first shows its figure".
wowsims' Bulk sim shows one once a step is done, counting the sims under way
by their iterations (`upstream/master` `ui/features/bulk/model/progress.ts:34`,
`:60-67`). The ten-candidate floor and the 35% hold both go.

Done when, on both live runs, the first figure shows within 5 s of the
candidates' start, and every figure from 5% to 35% of the stage's wall time
is within |error| <= 0.50. The bound above (0.30 from the tenth candidate to
35% of the run) was met by the fitted estimator 896 removes; the rule alone
reaches -0.47 on the replays below, so it is not kept.

Bounds set 2026-11-24, before the live runs at the final fork commit (feral
desktop and ret web, from the previous phase's preset gear), and not to be
changed after them. They are checked by `python3 -I .scratch/agent-reports/2026-11-24-time-left-per-stage/tl_check.py
<tail.jsonl>` in the main checkout, which fails both old traces it was tried on
(.scratch/agent-reports/2026-11-24-time-left-per-stage/neg-control-*.json). The numbers come from replaying wowsims' rule over the
13 recorded feral traces that show no machine load, with the sims under way
modelled as half of the 20 workers' sims done (.scratch/agent-reports/2026-11-24-time-left-per-stage/replay-inflight-K20.txt;
the traces hold no iteration counts, so that part is a model). On those, the
rule itself reads -0.43..+0.09 at 10-50% of the candidates, -0.18..+0.43 at
75-90%, and as low as -0.47 from 5% to 35% of the stage's wall time, because on
every one of those runs feral's candidates run about 1.2-1.4 times slower in
the 3rd tenth of the list and 1.5-2 times slower in the 4th and 7th (.scratch/agent-reports/2026-11-24-time-left-per-stage/pace-by-tenth.txt). No ret trace without load
exists, so ret's figures are judged on the same bounds with no measured base.

## Close note (2026-11-24)

Both live runs at `tbc-new-fork@24e9ca02e` (branch `fix/896-stage-time-left`)
meet every bound set before them, checked by `tl_check.py`:

- feral desktop (`wowsimtbc` on :3333), Phase 3 from the Phase 2 "BiS 6%"
  preset: 662 candidates in 232.4 s;
- ret web (WASM, `dist/` on :8193), Phase 4 from the Phase 3 "P3" preset:
  1012 candidates in 2131.6 s.

The 1-minute load average peaked at 26.1 during the desktop run (its own 20
sim threads) and at 8.7 during the web run, and I started nothing else during either
(`.scratch/agent-reports/2026-11-24-time-left-per-stage/feral-desktop-final/load.log`, `.scratch/agent-reports/2026-11-24-time-left-per-stage/ret-web/load.log` in the main
checkout). Rankings match the `8c67fccf4` runs row for row: feral 646 of
646, ret 997 of 997 (`strict_same.py`).

The ten-candidate floor and the 35% hold are gone. The first figure showed
0.95 s after the candidates' start on feral desktop and 0.78 s after it on
ret web (bound 5 s). From 5% to 35% of the stage's wall time the worst
error was -0.271 on feral desktop (136 samples) and +0.175 on ret web
(1276 samples); bound 0.50.

Verified by: `python3 -I .scratch/agent-reports/2026-11-24-time-left-per-stage/tl_check.py .scratch/agent-reports/2026-11-24-time-left-per-stage/feral-desktop-final/run/tail.jsonl`
and `... .scratch/agent-reports/2026-11-24-time-left-per-stage/ret-web/run/tail.jsonl` in the main checkout (both print
`"verdict": "PASS"`; saved as `tl_check.json` beside each run), and
`python3 -I .scratch/worktree-archive/e2e-8c67/e2e/strict_same.py` against
each run's `result.json` (`same-vs-8c67.txt`, `IDENTICAL: True`);
`tbc-new-fork@24e9ca02e`; `docs/reviews/fix-896-stage-time-left.md`.
