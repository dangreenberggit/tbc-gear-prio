Status: open
Type: task
Origin: docs/reviews/feat-worktree-pair.md (round 1, S4)
Blocks: none
Blocked by: none
Related: 572

# Point AGENTS.md and parallel-phase at paired worktrees

## What is missing

`docs/agents/paired-worktrees.md` explains how to run two fork branches at
once (`pnpm wt:pair`), but nothing an agent always loads points at it:
`grep -rn paired-worktrees AGENTS.md .claude/skills` finds nothing. An agent
that needs a second fork branch reaches the doc only if someone names it.

## What to add

Owner-approved wording only (AGENTS.md "Writing for agents": propose edits to
AGENTS.md and skill files in chat and wait for approval). The proposed lines
are in the feat/worktree-pair implementer's report:

- AGENTS.md, "The forked tab repo": one paragraph naming `pnpm wt:pair` and
  the doc.
- `.claude/skills/parallel-phase/adapters/agnostic.md`, after "Point the
  worker session at that worktree directory": one paragraph saying a slice
  that reads or edits the fork is made with `pnpm wt:pair`.

## Done when

- The owner has approved or rewritten both lines, and they are committed.
- `grep -rn paired-worktrees AGENTS.md .claude/skills` finds both.
