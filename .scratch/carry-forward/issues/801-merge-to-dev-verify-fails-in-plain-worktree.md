Status: open
Type: process
Origin: merge attempt of `chore/fix-rule-review-bar` (worktree `.scratch/wt-fix-rule`, main checkout), 2026-11-05
Blocks: none
Blocked by: none
Related: 802

# merge-to-dev's verify fails in a plain worktree, and no doc says how to make one it can pass

## What an agent sees

`pnpm merge-to-dev chore/fix-rule-review-bar` runs `pnpm verify` inside
the branch's worktree, `.scratch/wt-fix-rule`. That worktree was made
with a plain `git worktree add`: no `node_modules` and no
`vendor/tbc-new-fork` (checked 2026-11-05 with `ls -d
.scratch/wt-fix-rule/node_modules .scratch/wt-fix-rule/vendor/tbc-new-fork`:
both missing). Verify failed with 378 missing-module errors from tsc,
on a branch that changes only Markdown under `docs/`.

## Why, on `dev` at `cf8e37a1`

- `scripts/merge_to_dev.py:48-52` runs the gates in the branch's
  worktree on the assumption that it "already has" the fork,
  `node_modules` and the wowsims copies. Nothing checks that before the
  verify run starts.
- The documented ways to make a worktree are `pnpm wt:pair`
  (`docs/agents/paired-worktrees.md:3-5`, `:21-22`; it copies `vendor/`
  inputs, installs and builds, `:38-40`) and a plain worktree for work
  that never reads the fork (`:11-17`). The plain route lists the two
  restores and `TBC_VERIFY_WITHOUT_FORK=1`, but not `pnpm install`, and
  it does not say how to run `pnpm merge-to-dev` from such a worktree
  (the opt-out has to be in the environment of the merge command too,
  hypothesis, untested).
- The main checkout holds twelve `.scratch/wt-*` worktrees (`git
  worktree list`), but `git grep -n '\.scratch/wt-' dev -- AGENTS.md
  docs/workflow.md docs/agents .claude/agents` finds only a history note
  (`docs/agents/home/skills/dont-be-stupid/SKILL.md:24`), and no doc
  that says how to set up a worktree there.
- There is no lighter gate for a branch that changes only docs.
  `scripts/merge_to_dev.py:8` calls `--no-verify` an "escape hatch; not
  for real merges", and `docs/workflow.md:117` says never to use it for
  real work. A lighter gate would still need `node_modules`, because
  `format:check` runs prettier over tracked files, Markdown included
  (`scripts/format_check_tracked.mjs`; `.prettierignore` does not
  exclude `docs/`) — hypothesis, untested for which `.md` files it
  reads.

## Done when

An agent that makes a worktree for a docs-only or tooling-only branch by
following the docs gets one where `pnpm merge-to-dev <branch>` either
passes verify or stops at once with a message that names the missing
setup and the command that provides it. Changes to `AGENTS.md` or skill
files need the owner's approval of the exact text first.
