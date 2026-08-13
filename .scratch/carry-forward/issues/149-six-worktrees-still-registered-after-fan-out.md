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

## Partial resolution (2026-08-13) — stays open

**Correction to this ticket.** "No work is lost — every branch involved is
already merged into HEAD" is true of the *branches* but not of the *worktrees*.
Three of the six held uncommitted edits, checked with
`git -C <path> status --porcelain` on each:

- `tbc-gear-prio-wt-salvage-docs` (`phase-1/w-salvage-docs`) — 3 modified,
  including `AGENTS.md`.
- `.claude/worktrees/wowhead-collection-integrity-task2-83d6ca` — 29 modified,
  including several `.agents/skills/` and `.claude/skills/` files.
- `.scratch/wt-fan-out-retro` (`feat/fan-out-retro`) — 14 modified, including
  `parallel-phase` skill files and their mirrors.

A `git worktree remove` sweep would have destroyed all of it. **Left in place**
— they hold edits to `AGENTS.md` and skill files, which are owner-approval
territory and must not be discarded or committed by an agent.

`.claude/worktrees/terminology-cleanup-plan-82f471` is clean except for an
untracked `.scratch/`, so it is removable, but it was left too: removing it
alone gains little while the three above must stay.

**Removed:** the two genuinely clean worktrees, both verified merged first with
`git merge-base --is-ancestor <ref> HEAD`:

- `.claude/worktrees/objective-lederberg-e0164a` (detached at `55b5a51`)
- `.claude/worktrees/wowsims-gem-choosing-issue-3be1fa`

Both are deregistered — `git worktree list` shows four entries beyond the main
checkout, down from six.

**Remaining manual step.** `git worktree remove` deregistered both but could not
delete their directories: `objective-lederberg-e0164a` still holds ~95M of
ignored `node_modules` ("Directory not empty"), and the other returned
"Permission denied" leaving an empty shell. They are now ordinary directories,
not worktrees, and nothing tracked is at risk. Recursive deletion was blocked by
this environment's command policy, so the owner should run:

    rm -rf .claude/worktrees/objective-lederberg-e0164a
    rm -rf .claude/worktrees/wowsims-gem-choosing-issue-3be1fa

**Not done: branch pruning.** ~70 unpruned branches remain. Nothing was
deleted; `git branch --merged HEAD` was not used as a delete filter because a
merged-into-HEAD branch can still be the only ref for a worktree above.

**`.scratch/wt-fan-out-retro` remains the live hazard** this ticket flags: a
full checkout inside `.scratch/`, where the test runner scans, and it is one of
the three carrying uncommitted work.
