Status: blocked
Type: task
Origin: docs/reviews/feat-merge-to-dev-arg.md (round 2, X1)
Blocks: none
Blocked by: owner approval of the AGENTS.md wording
Related: 593, 594

# AGENTS.md still says pair merges need `pnpm wt:unpair`

## What is wrong

After this branch, `pnpm merge-to-dev <branch>` merges a pair's branch from
the main folder with the pair in place (`docs/agents/paired-worktrees.md`,
"Land it on dev"). AGENTS.md "The forked tab repo" on `dev` still says
"Merges into `dev` run from the main folder, after `pnpm wt:unpair`."
The unmerged `feat/pair-rule` (tip 1e451a79) has the same claim in its
bullet "**Merges into `dev`** run from the main folder after
`pnpm wt:unpair <name>`."

## What to change

AGENTS.md edits need the owner's approval first (AGENTS.md "Writing for
agents"). Proposed wording, not yet approved, for whichever of the two
lines is on `dev` when this is done:

> Merges into `dev` run from the main folder while it is on `dev`:
> `pnpm merge-to-dev <main-branch>`, with the pair in place. Steps and
> the cases that still need `pnpm wt:unpair`:
> [`docs/agents/paired-worktrees.md`](docs/agents/paired-worktrees.md).
