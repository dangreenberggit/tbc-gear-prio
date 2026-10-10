Status: open
Type: task
Origin: docs/reviews/feat-worktree-pair.md (round 1, S4; independent writing-for-agents review, T1, T2, T4, X1)
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

AGENTS.md, "The forked tab repo": a new paragraph at the end of the section,
after the paragraph that starts "Every fork commit is a separate":

> **Two fork branches at once need a pair.** A session that needs a fork
> branch other than the one the main checkout's clone has checked out, or
> works on the fork while another session does, runs
> `pnpm wt:pair <name> <main-branch> <fork-branch>`: a main worktree with its
> own fork worktree, where every gate reads that pair's fork and lock. Merges
> into `dev` run from the main folder, after `pnpm wt:unpair`. See
> [`docs/agents/paired-worktrees.md`](docs/agents/paired-worktrees.md).

`.claude/skills/parallel-phase/adapters/agnostic.md`: a new paragraph
directly after the `git worktree add` code block, before the paragraph that
starts "Point the worker session at that worktree directory":

> If the slice reads or edits the fork (`vendor/tbc-new-fork`), make a pair
> instead of the plain worktree above:
> `pnpm wt:pair ${SLICE} "${FEATURE}-${SLICE}" "${FEATURE}-${SLICE}" -b --base "${BASE}" --new-fork-branch`
> (`${SLICE}` at most 23 characters). A plain worktree has no `vendor/`, so
> the fork gates skip and `pnpm verify` passes without checking the fork. The
> pair is installed when the command prints `pair ready`; its folder is on
> the `main` line of that output. Before the merge below, follow
> `docs/agents/paired-worktrees.md` "Land it on dev" steps 2-4 with
> `${FEATURE}` in place of `dev`, so the slice's fork commits reach the
> clone's branch and the lock names them. Remove the pair only with
> `pnpm wt:unpair ${SLICE}`.

## Related defect in the same file (X1)

`agnostic.md` names slice branches `${FEATURE}/${SLICE}` at lines 14, 21, 31
and 46. git refuses that name while the branch `${FEATURE}` exists, which it
always does there: a temp-repo test on 2026-10-10 (`git branch feat`, then
`git branch feat/slice`) gave "fatal: cannot lock ref
'refs/heads/feat/slice': 'refs/heads/feat' exists". `git branch feat-slice`
succeeded. Proposed: use `${FEATURE}-${SLICE}` at all four lines, which is
also the name the pointer above uses. This edits a skill file, so it needs
the owner's approval too.

## Done when

- The owner has approved or rewritten both paragraphs and the X1 rename, and
  they are committed.
- `grep -rn paired-worktrees AGENTS.md .claude/skills` finds both paragraphs.
- `grep -n 'FEATURE}/\${SLICE}' .claude/skills/parallel-phase/adapters/agnostic.md`
  finds nothing.
