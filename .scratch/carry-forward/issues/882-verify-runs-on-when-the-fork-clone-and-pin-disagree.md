Status: open
Type: task
Origin: .scratch/plans/tickets-672-811-623-635-2026-11-12.md
Blocks: none
Blocked by: none

# `pnpm verify` runs on when the fork clone and its pin disagree

**Problem.** When `vendor/tbc-new-fork` is checked out at a different
commit from `data/wowsims-fork.lock.json`'s `commit`, `pnpm verify` runs
every step and the fork tests fail one by one. On 2026-11-13 the main
checkout's tree pinned the fork at `68b2afac` while the clone was at
`1410a775` (a stale branch tree with a newer clone): 95 fork test
failures, none saying why. Source: the 2026-11-13 chore/729 investigation,
`.scratch/plans/tickets-672-811-623-635-2026-11-12.md` § Decision log,
the "trial result: inconclusive" entry. The 95 count is from the
orchestrator's summary of that run (unverified here).

`scripts/run_verify.mjs` `main()` already stops early when the fork is
absent (`forkGuard`). Nothing compares the clone's `HEAD` with the pin.

**Fix.** Before any step, when the fork is present, compare
`git -C vendor/tbc-new-fork rev-parse HEAD` with the lock's `commit` and
stop with one line naming both shas and the fix (check out the pin, or
re-pin per `docs/agents/paired-worktrees.md` § Re-pin after a fork
change). Decide what a pair mid-slice does, where the clone is ahead of
the pin on purpose until the re-pin (ticket 213 hit the same case for one
check). Test-first against `forkGuard`'s tests.
