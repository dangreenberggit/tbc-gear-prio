Status: closed
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

## Closed 2026-11-08

After `docs/unpair-after-merge` merged (`tbc-gear-prio@bfec3c1f`), an agent
removed its pair `unpair-doc` from the main checkout by following
§ Remove it as merged. The busy error showed, and the fallback worked with
no owner step.

Verified by:

```
pnpm -C /home/daniel/Code/lulz/tbc-gear-prio wt:unpair unpair-doc
# rc=1: removed the fork half, then
# failed to delete '.../.git/worktrees/unpair-doc': Device or resource busy
git worktree remove /home/daniel/Code/lulz/tbc-wt/unpair-doc
# rc=0, no output (plain call, runs outside the sandbox)
pnpm -C /home/daniel/Code/lulz/tbc-gear-prio wt:unpair unpair-doc
# rc=0: nothing to remove
```

Afterwards `git worktree list` in the main repo and in
`vendor/tbc-new-fork` list no `unpair-doc`, the folder
`tbc-wt/unpair-doc` is gone, and `.git/tbc-wt-unpair/` is empty. Inside
the sandbox an empty `.git/worktrees/unpair-doc` still shows as a mount
point; `git worktree prune --dry-run -v` lists it for removal. Whether it
exists outside the sandbox is untested.
