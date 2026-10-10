Status: open
Type: task
Origin: feat/pair-rule, `git merge dev` at 2d7211b3 (found while checking the 597 change; no review round)
Blocks: none
Blocked by: none
Related: 597

# The agnostic adapter points at "Land it on dev" steps that moved

## What is wrong

`.claude/skills/parallel-phase/adapters/agnostic.md:17` (and its
`.agents/skills` mirror) tells a Delegator merging a pair slice into a
feature branch: "follow `docs/agents/paired-worktrees.md` "Land it on dev"
steps 2-4 with `${FEATURE}` in place of `dev`". `dev` at 206db3eb rewrote
that section: steps 1-3 are now commit, merge the fork side, and
`pnpm merge-to-dev <main-branch>`, which merges only into `dev`. The steps
the sentence meant (unpair, merge the fork side, check out and re-pin) are
now steps 1-3 of the section's "older route".

## What to change

A skill edit, so it needs the owner's approval first (AGENTS.md "Writing
for agents"). Point the sentence at the older route's steps 1-3, or at the
step names, so that renumbering cannot break it again.

## Done when

`grep -n "steps 2-4" .claude/skills/parallel-phase/adapters/agnostic.md`
finds nothing, the new pointer names steps that exist, and
`python scripts/check_skill_mirrors.py` passes.
