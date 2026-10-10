Status: closed
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
after the paragraph that ends "can hit on any one of them.":

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
> `pnpm wt:unpair ${SLICE}`, and after the merge delete its fork branch with
> `git -C vendor/tbc-new-fork branch -d "${FEATURE}-${SLICE}"`.

## Related defect in the same file (X1)

`agnostic.md` names slice branches `${FEATURE}/${SLICE}` at lines 14, 21, 31
and 46. git refuses that name while the branch `${FEATURE}` exists, which it
always does there: a temp-repo test on 2026-10-10 (`git branch feat`, then
`git branch feat/slice`) gave "fatal: cannot lock ref
'refs/heads/feat/slice': 'refs/heads/feat' exists". `git branch feat-slice`
succeeded. Proposed: use `${FEATURE}-${SLICE}` at all four lines, which is
also the name the pointer above uses. The four replacement lines:

- line 14: `git worktree add "../$(basename "$(pwd)")-${SLICE}" -b "${FEATURE}-${SLICE}" "${BASE}"`
- line 21: `` - Commit on `${FEATURE}-${SLICE}` only.``
- line 31: `git merge --no-ff "${FEATURE}-${SLICE}" -m "Merge ${FEATURE}-${SLICE} into ${FEATURE}"`
- line 46: `git branch -d "${FEATURE}-${SLICE}"   # after merge`

This edits a skill file, so it needs the owner's approval too.

## Done when

- The owner has approved or rewritten both paragraphs and the X1 rename, and
  they are committed.
- `grep -rn paired-worktrees AGENTS.md .claude/skills` finds both paragraphs.
- `grep -n 'FEATURE}/\${SLICE}' .claude/skills/parallel-phase/adapters/agnostic.md`
  finds nothing.

## Closing note (2026-10-10, feat/worktree-pair)

The owner approved the three edits as written, including pointer 2's
fork-branch-delete clause. The owner's words, replying to the request to
approve: "sounds good". Commit `e1de0f5c` applies them verbatim: the pointer
1 paragraph at the end of AGENTS.md "The forked tab repo", the pointer 2
paragraph after the `git worktree add` block in `agnostic.md`, and
`${FEATURE}-${SLICE}` on the four slice-branch lines (now lines 14, 23, 33
and 48, because pointer 2 shifted them). `check_skill_mirrors.py` compares
`.claude/skills` with `.agents/skills`, so the same edit went to
`.agents/skills/parallel-phase/adapters/agnostic.md`.

Verified by:
`grep -rn paired-worktrees AGENTS.md .claude/skills` (AGENTS.md:91 and
agnostic.md:17);
`grep -n 'FEATURE}/\${SLICE}' .claude/skills/parallel-phase/adapters/agnostic.md`
(no match, rc 1); `python scripts/check_skill_mirrors.py` ("skill mirrors
match"); `pnpm verify` and `pnpm merge-ready` on the closing commit.
