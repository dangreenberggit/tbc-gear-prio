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
