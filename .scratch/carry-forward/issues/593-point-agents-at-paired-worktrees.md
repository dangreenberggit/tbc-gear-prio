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
AGENTS.md and skill files in chat and wait for approval). Proposed wording,
not yet approved:

AGENTS.md, "The forked tab repo", a new paragraph after the sentence that
starts "Full sequence, including the PROVENANCE cycle":

> **Two fork branches at once need a pair.** The clone in the main checkout
> has one fork branch checked out. A session that needs another fork branch,
> or works on the fork while another session does, runs
> `pnpm wt:pair <name> <main-branch> <fork-branch>`: a main worktree with its
> own fork worktree, where every gate reads that pair's fork and lock. Merges
> into `dev` still run from the main folder. See
> [`docs/agents/paired-worktrees.md`](docs/agents/paired-worktrees.md).

`.claude/skills/parallel-phase/adapters/agnostic.md`, a new paragraph after
the one that starts "Point the worker session at that worktree directory":

> A slice that reads or edits the fork (`vendor/tbc-new-fork`) needs a pair
> instead: `pnpm wt:pair <slice> ${FEATURE}/${SLICE} <fork-branch> -b --base ${BASE} --new-fork-branch`.
> A plain `git worktree add` has no `vendor/`, so the fork gates skip or fail
> there. Remove it with `pnpm wt:unpair <slice>`
> (`docs/agents/paired-worktrees.md`).

## Done when

- The owner has approved or rewritten both lines, and they are committed.
- `grep -rn paired-worktrees AGENTS.md .claude/skills` finds both.
