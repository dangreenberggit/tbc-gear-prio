Status: open
Type: task
Origin: docs/reviews/docs-unpair-after-merge.md
Blocks: none
Blocked by: none
Related: 861

# No agent has yet removed a pair through the unpair sandbox fallback

## What happens

`docs/agents/paired-worktrees.md` § Remove it tells the merging agent what
to do when `pnpm wt:unpair <name>` stops with `failed to delete
'.../.git/worktrees/<name>': Device or resource busy`: run
`git worktree remove <pair path>` as a plain call, then `pnpm wt:unpair
<name>` again. Those calls worked by hand on `gate-pipe` on 2026-11-08, but
no agent has run them from the text. The review's IR1 records that the
trial of the new text was partial.

The owner's words on 2026-11-08: "i shouldnt have to do this remove the
pair thing", "manually doing this every time theres a merged ticket fix
branch is dumb", and on this trial: "a sounds fine, send out a new session
to do it".

## Done when

An agent removes a pair after its merge by following § Remove it,
including the fallback if the error shows, with no owner step.
