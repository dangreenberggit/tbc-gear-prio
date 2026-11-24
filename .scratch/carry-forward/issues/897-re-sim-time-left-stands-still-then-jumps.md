Status: open
Type: bug (display)
Origin: the review of fix/894-time-left-2 (not merged; archived as .scratch/worktree-archive/tl-894/main-commits/0003-Add-the-pre-merge-review-of-fix-894-time-left-2.patch)
Blocks: none
Blocked by: none
Related: 894, 896

# While the top rows are re-simmed, the time left stands still, then jumps up

## What happens

On web, the re-sims finish in waves: about four at a time, about 16 s apart.
The tab recomputes the time left only when a whole sim finishes
(`vendor/tbc-new-fork/ui/features/upgrades/model/run_progress.ts:153`, the
`m >= 2` branch of `estimateRemainingMs`: time since ranking / sims done
× sims left). So between waves the figure stands still while the time really
left falls, and when the first sim of a new wave finishes, one more sim is
counted against a whole wave's time, so the figure jumps up for a moment.

Replayed through a tracker with the same re-sim formula on the 2026-11-22
web feral run `w2-after`
(`.scratch/worktree-archive/web-speed/wsp/runs/w2-after/run/tail.jsonl` in
the main checkout):

| Time | Done | Shown | Really left |
| --- | --- | --- | --- |
| 3854.18 s | 667 | 128 s | 115 s |
| 3856.19 s | 668 | 199 s | 113 s |
| 3858.19 s | 671 | 114 s | 111 s |
| 3950.32 s | 691 | 32 s, held since 3938 s | 19 s |

On that run 29 of 271 re-sim samples more than 10 s from the end were more
than 0.30 off; on 893's web run, 31 of 245. Found by the adversarial reviewer
of the unmerged second 894 attempt, `fix/894-time-left-2` (finding A2; its
review is `.scratch/worktree-archive/tl-894/main-commits/0003-*.patch` plus
`uncommitted-main.patch` in the main checkout). That replay ran that branch's
tracker before its A2 fix; its `m >= 2` branch is the same line as the merged
one, so the figures hold for the merged tracker by reading the code, not by a
rerun. Ticket 894's bound checks one re-sim sample, so it passes or fails by
where that sample falls in a wave.

## Why

The tab counts whole sims. wowsims' Bulk sim counts iterations inside each
sim, so its figure moves while sims are in flight (`upstream/master`
`ui/features/bulk/model/progress.ts:54-67`, `completedIterations`). The tab's
runner gets the same per-sim progress from the worker pool and drops it:
`model/adapters/worker_pool_sim_runner.ts:144` passes `() => {}` as
`raidSimAsync`'s `onProgress`. Whether the desktop transport delivers that
progress the same way is unverified.

## What would fix it

Use the direct signal wowsims uses: carry each re-sim's iteration progress
from the runner to the tracker and count each re-sim in flight by its share of
iterations done. The unmerged branch did this without touching a ported
engine file: fork commit `ab3d5a732` "Count the re-sims under way by their
iterations" (`worker_pool_sim_runner.ts`, `run.ts`, `run_progress.ts` plus
tests), saved as
`.scratch/worktree-archive/tl-894/fork-commits/0003-Count-the-re-sims-under-way-by-their-iterations.patch`
and in `fork.bundle` beside it. It was reviewed and checked by a fresh agent
there, but never run live, and it was written on that branch's tracker, so it
needs porting, not a plain apply.

## Done when

While the top rows are re-simmed, the time left moves with the sims in flight,
and on a live web feral run no re-sim sample more than 10 s from the end is
more than 0.30 off.
