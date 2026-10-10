Status: open
Type: task
Origin: stage-gate cleanup-upstream-footprint, plan revision 4, step D3, 2026-10-08 (`.scratch/stage-gate/cleanup-upstream-footprint/plan.md`; gitignored, owner's checkout)
Blocks: none
Blocked by: none
Related: 545, 553, 554, 555, 556, 557

# The worker silence check is deleted; bring it back later or never

## Owner's words (2026-10-08)

> "Worker pool check: you're right. If it was in our code files,maybe. Adding
> 130 lines of totally unnecessary unrelated code to change how wowsims general
> simming is handled is no bueno. And we're not redoing and moving that now
> (feel free to throw it in a ticket for later/never)"

> "Silence check: yeah there was supposed to be just some terminate thing"

## What was deleted

The check failed a sim request when a worker sent nothing for too long, so a
stuck worker could not hang a ranking (ticket 545). It lived in wowsims' own
worker pool file, which the owner's rule keeps at upstream's text. The cleanup
deleted it (fork `9e4115c22`):

- Fork `ui/sim/workers/worker_silence.ts` (157 lines). Last version:
  `git -C vendor/tbc-new-fork show b2851da58:ui/sim/workers/worker_silence.ts`.
- The fork's change to `ui/sim/workers/worker_pool.ts` (130 added, 9 removed),
  including a method that ended all workers. Last version:
  `git -C vendor/tbc-new-fork diff 42c75dc9 b2851da58 -- ui/sim/workers/worker_pool.ts`.
- The tab's `terminate()` path and the silence limits in
  `ui/features/upgrades/model/adapters/worker_pool_sim_runner.ts`. The tab now
  keeps one worker pool for the page's life and only resizes it, as upstream's
  `Sim` does.
- This repo's `packages/core/test/fork-worker-silence.test.ts` (818 lines).
  Last version: `git show 7f053f09:packages/core/test/fork-worker-silence.test.ts`.

The measurement records stay tracked (`.gitignore` exceptions, commit
`38e1d4d5`):

- `.scratch/stage-gate/545-worker-silence-check/measurement.md`
- `.scratch/stage-gate/553-554-silence-followups/probe.md`
- `.scratch/stage-gate/555-557-silence-followups/557-desktop.md`
- `.scratch/stage-gate/555-557-silence-followups/557-page-sims.md`

Closed tickets about the check: 545, 553, 554, 555, 556, 557.

## What is lost

A sim worker that never answers now hangs the run until the page reloads, as
on every other wowsims page. Stop still ends a run (checked live on `:5173` at
fork `9e4115c22`: Stop settled 4.6 s after Cancel, and a second run completed).

## If it comes back

It must not edit `ui/sim/workers/worker_pool.ts` or any other existing wowsims
file without the owner's approval of that exact edit. A tab-side version would
need the pool's request bookkeeping, which upstream does not expose; that was
the reason it went into upstream's file (hypothesis, untested whether a public
hook exists at a later upstream commit).

## Done when

The owner asks for it again (and a plan names how it stays out of wowsims'
files), or closes this as never.
