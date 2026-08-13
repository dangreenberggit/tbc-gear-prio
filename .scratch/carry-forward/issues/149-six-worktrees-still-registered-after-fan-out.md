Status: open
Type: cleanup
Origin: docs/reviews/feat-set-bonus-value.md round 5 (process P6)
Blocks: none
Blocked by: none

# Six worktrees still registered after the fan-outs

`git worktree list` shows six beyond the primary checkout:

    tbc-gear-prio-wt-salvage-docs                     [phase-1/w-salvage-docs]
    .claude/worktrees/objective-lederberg-e0164a      (detached HEAD)
    .claude/worktrees/terminology-cleanup-plan-82f471 [claude/terminology-...]
    .claude/worktrees/wowhead-collection-integrity-...[claude/vigilant-chaum-...]
    .claude/worktrees/wowsims-gem-choosing-issue-...  [claude/wowsims-gem-...]
    .scratch/wt-fan-out-retro                         [feat/fan-out-retro]

`parallel-phase` requires teardown after fan-in. Content is safe — the round-4
`wt/issue1-*` worktrees were torn down properly, and every branch listed above
is merged into HEAD, so this is debris rather than lost work.

Two are worth attention beyond tidiness:

- `.scratch/wt-fan-out-retro` is a stale full checkout **inside `.scratch/`** —
  the vitest collection hazard `parallel-phase/SKILL.md` warns about
  explicitly.
- `terminology-cleanup-plan-82f471`'s branch is already merged into HEAD
  (at `4f8081a`), so the worktree has no remaining purpose.

Also ~70 unpruned branches.

## Fix

`git worktree remove` each (or `git worktree prune` for any whose directory is
already gone), then sweep merged branches. Confirm nothing is dirty first —
check `git -C <path> status` per worktree before removing, since these were
never formally torn down and may hold uncommitted work.
