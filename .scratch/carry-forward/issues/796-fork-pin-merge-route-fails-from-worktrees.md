Status: open
Type: task
Origin: merge of feat/620-item-level into dev, 2026-11-05 (dev ce3e49d3 → 6ac75008)
Blocks: none
Blocked by: none

# The paired-worktrees doc's route for a new fork pin fails when `dev` is checked out in another worktree

## What an agent sees

`docs/agents/paired-worktrees.md` § "When `dev` has a new fork pin" (line
162 on dev `6d212433`) sends the agent to an "older route". That route
fails in two places:

- Step 4 runs `pnpm merge-to-dev` with no branch name in the main folder.
  That form runs `git checkout dev` (`scripts/merge_to_dev.py:561`). The
  checkout fails whenever `dev` is checked out in another worktree, as it
  is now (`git worktree list` shows `.scratch/wt-global-lane-split` on
  `dev`). Claim that the checkout fails: from git's rule that one branch
  is checked out in one worktree, untested here.
- Step 1 runs `pnpm wt:unpair <name>`. `unpair` looks only under
  `../tbc-wt/<name>` (`scripts/worktree_pair.py:850`, `PAIR_DIR = "tbc-wt"`
  at line 377). A pair made by hand under `.scratch/wt-*` is not found.

The same doc, a few lines above (line 155-156), says the named form of
`pnpm merge-to-dev` "has not yet merged into the real `dev`". It has: dev
merges `2a4c064e`, `bcb7024c` and `6ac75008` were made by it (`git log -1
<sha>` on each shows "Merge branch '<name>' into dev"; that the named form
made them is from the 620 log below for `6ac75008`, and untested for the
other two).

## The route that worked on 2026-11-05

For `feat/620-item-level`, whose pair was `.scratch/wt-620-ilvl` and whose
branch had re-pinned the fork while `dev` had too:

1. In the pair: `git merge dev`. The lock conflicted
   (`.scratch/agent-reports/2026-11-05-620-merge-dev.log` in the main
   checkout).
2. Resolve the lock by hand: keep the branch's fork `commit`, keep both
   `_comment` sentences, commit the merge. `git show --cc 4c339d82 --
   data/wowsims-fork.lock.json` shows the branch's `commit` kept.
3. `pnpm sim-implemented-effects:generate` showed no diff (caller's
   report, untested here).
4. From the `dev` worktree: `pnpm merge-to-dev feat/620-item-level`. It
   merged with rc=0
   (`.scratch/agent-reports/2026-11-05-620-merge-to-dev.log`).

Step 4 passes because `dev` is now an ancestor of the branch tip
(`git merge-base --is-ancestor ce3e49d3 4c339d82` succeeds), so the lock
check in `merge_to_dev.py` (the `if not is_ancestor(dev_sha, tip)` block,
lines 354-364) does not run.

## Done when

- The doc names one route for a new fork pin that works when `dev` is
  checked out in another worktree and for pairs under `.scratch/`.
- The sentence "It has not yet merged into the real `dev`." is gone.
