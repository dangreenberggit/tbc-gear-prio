Status: open
Type: process
Origin: .scratch/round-limits-r16/2026-11-04-review-rounds-why-recurring.md (control run, U8; gitignored, main checkout)
Blocks: none
Blocked by: none

# Paired-worktrees older route runs unpair before a detached fork's commits are on a branch

## What happens

In `docs/agents/paired-worktrees.md` on `dev` at `cf8e37a1`, the older
route's steps are:

- `:177` "1. **Main folder: remove the pair.** Run `pnpm wt:unpair
  <name>`. Both branches are kept, ..."
- `:179` "2. **Main folder: merge the fork side**, as in step 2 above, if
  not done."

The command that puts a `--fork-detached` pair's fork commits on a
branch is only in Land-it step 2, `:127-129`: `git -C
<pair>/vendor/tbc-new-fork switch -c <branch>`. Older-route step 2 sends
the agent back to it with "if not done", after unpair has run. For a
`--fork-detached` pair:

- "Both branches are kept" is false: the fork side has no branch.
- `pnpm wt:unpair` refuses before removing anything:
  `scripts/worktree_pair.py:792-794` returns "is detached at a commit no
  branch contains; branch it first", and `:882-889` raise it with "To
  remove the pair anyway and lose those files, rerun with --force."
- If the agent follows that hint and adds `--force`, `:829` runs `git
  worktree remove --force` on the fork worktree, and no branch holds
  those commits. They are then reachable only as dangling objects
  until garbage collection (hypothesis, untested; no unpair was run).
- After unpair, the `<pair>/vendor/tbc-new-fork` path in the
  `switch -c` command no longer exists, so "as in step 2 above" cannot be
  done as written.

An agent that comes from Land-it step 2 (`:131-132`) or step 3 (`:162`)
has already branched the commits, so it is not hurt. An agent that knows
`dev` has a new fork pin and goes straight to the older route is
stopped by the refusal, and the only way forward that the script
offers loses the commits. Checked by reading the code on `dev`; no
command was run.

## What would fix it

Hypothesis, untested: make older-route step 1 start with "first finish
Land-it step 2, which puts a detached fork's commits on a branch", drop
"if not done" from step 2, and say "both branches" only for a pair that
has a fork branch. A doc edit under `docs/agents/` needs the owner's
approval of the exact text.

## Done when

- Following the older route alone, on a `--fork-detached` pair with fork
  commits, branches the commits before `pnpm wt:unpair` runs, and
  unpair needs no `--force`.
