Status: open
Type: bug (display)
Origin: the review of fix/894-time-left-2 (not merged; archived as .scratch/worktree-archive/tl-894/main-commits/0003-Add-the-pre-merge-review-of-fix-894-time-left-2.patch)
Blocks: none
Blocked by: none
Related: 893, 894, 897, 898

# Late in the candidates, the time left reads high on other specs and on desktop

## What happens

While candidates are simmed, the run dialog's time left adds two stages that
have not started yet: the set-bonus stage, priced at 45.34 candidates' time,
and the re-sims of the top rows, each priced at 0.75 of a candidate's time
(`vendor/tbc-new-fork/ui/features/upgrades/model/run_progress.ts:31`,
`RUN_PROGRESS_ESTIMATOR`, used in `estimateRemainingMs`). Both numbers were
fitted on one feral web run (2026-11-22). Other runs spend different amounts
there, so near the end of the candidates, where those two stages are most of
what is left, the figure is off by the difference.

- The same feral run on desktop measured 20.1 and 0.505 (the comment above
  `RUN_PROGRESS_ESTIMATOR` says so), so desktop reads high there by about 25
  candidates' time for the set stage alone.
- A ret web run (`.scratch/worktree-archive/e2e-final/e2e/web/ret-p4-from-p3/tail.jsonl`
  in the main checkout, 2026-11-23) spent 17.6 candidates' time on the set
  stage and 0.99 per re-sim. Replayed through a tracker with the same
  formula and constants, the last candidate showed 263 s against 80 s really
  left. Part of that is load: the run shared the machine with a feral web
  run for its first third, so its pace so far read high. At the run's own
  late pace the figure would still have been 124 s against 77 s (+0.61).

Found by the adversarial reviewer of the second 894 attempt,
`fix/894-time-left-2` (finding A1; that branch was not merged; its review and
replays are in `.scratch/worktree-archive/tl-894/` in the main checkout). The
replay ran that branch's tracker, which prices the stages exactly as
`fix/894-time-left` does (same constants, same
`msPerCandidate * (c - n + setBonusStageCandidates + k * left)`); that the
replay gives the same figures on the merged tracker is a reading of the code,
not rerun. Ticket 894's bound checks feral runs only, so it cannot catch this.

## Why

The set stage sends no count (893), and the tab learns how long it takes only
once it is over. Its cost differs by spec (how many set pieces the pool and the
rows hold; unverified which drives it) and by transport (web and desktop run
the same sims at different speeds relative to a candidate).

## What would fix it (not decided)

The owner's rulings for the tab: match wowsims and don't invent; a fix that
tweaks a guess instead of using the direct signal is not a solution. So
refitting the two numbers per spec or per transport is not the fix. Ways that
use a direct signal, for the owner to choose between:

- The engine reports, before the set stage starts, how many sims it will run
  there, so the tab prices them at the measured pace. This changes the ported
  engine files' progress events (`model/engine/set-phase.ts`, `rank.ts`), and
  893's review notes a step's sim count depends on what it finds
  (`docs/reviews/fix-893-set-stage-progress.md`, row D2).
- Show the time left of the current stage only, as wowsims' Bulk sim does
  (`upstream/master` `ui/features/bulk/model/progress.ts:34`, `:67`). The tab's
  line has meant the whole run's time left since 542, and at the last
  candidate this would read about 0 s with minutes to go.

## Done when

The owner has chosen how the stages that have not started are priced, and on
a live ret web run and a live feral desktop run the figure at 90% of the
candidates is within |error| <= 0.30.

## Done when (amended 2026-11-24)

The owner chose the stage-only figure. Owner, 2026-11-24, on Q1: "a sounds
fine. if the progress isnt done and doesn't show its actually done ("close
to" 0?) then it's not wrong at least". The orchestrator's brief: the time left
of the current stage only, as wowsims' Bulk sim does, with
`RUN_PROGRESS_ESTIMATOR` removed rather than refitted.

Done when `RUN_PROGRESS_ESTIMATOR` is gone, the figure prices only the stage
under way by wowsims' rule, it never reads "0s remaining" while the dialog is
open, and on both live runs:

- at 10%, 25% and 50% of the stage's candidates landed, |error| <= 0.45;
- at 75%, |error| <= 0.50, and at 90%, |error| <= 0.30 (the bound above, kept);
- every figure from 10 s into a counted stage lies within wowsims' rule on
  the run's own counts (`tl_check.py` B5);
- no time left shows while preparing, measuring set bonuses, ranking or
  cancelling, nor after the dialog closes.

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
