Status: open
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
