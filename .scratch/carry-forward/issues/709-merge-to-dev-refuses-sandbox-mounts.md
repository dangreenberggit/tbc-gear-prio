Status: open
Type: task
Origin: merge attempt of feat/sandbox-safe-pair-and-rank inside the agent sandbox, 2026-10-25
Blocks: none
Blocked by: none

# `pnpm merge-to-dev` cannot run inside the agent sandbox

## What happens today

The agent sandbox (bubblewrap) mounts `/dev/null` read-only over paths
that it denies. In the main checkout it does this for 17 repo paths that
do not exist on disk:

- `.bash_profile`, `.bashrc`, `.gitconfig`, `.gitmodules`, `.mcp.json`,
  `.idea`, `.vscode`, `.profile`, `.ripgreprc`, `.zprofile`, `.zshrc`
- `.claude/commands`, `.claude/loop.md`, `.claude/output-styles`,
  `.claude/routines`, `.claude/settings.local.json`, `.claude/workflows`

Inside the sandbox, `stat -c '%F %t,%T' .bashrc` prints `character special
file 1,3`, and `findmnt -T .bashrc` prints `none[/null] devtmpfs ro`.
`git status --porcelain` lists all 17 as untracked (`??`).

Both clean-tree checks in `scripts/merge_to_dev.py` count them, so neither
mode of the merge can run in the sandbox:

- Named-branch mode, `scripts/merge_to_dev.py:270`, refuses a branch
  worktree with untracked files. Run from `dev` with the branch checked
  out nowhere else, it first printed:
  `FAIL: 'feat/sandbox-safe-pair-and-rank' is not checked out in any worktree (a worktree in the middle of a rebase counts as detached). The gates run in the branch's own checkout: check it out in a pair or worktree, or check it out here and run pnpm merge-to-dev with no branch`
- No-branch mode, `scripts/merge_to_dev.py:451-455`, run from the feature
  branch in the main checkout, stopped before any gate:
  `FAIL: working tree not clean — commit or stash first`

So the owner has to run every merge into `dev` from their own terminal.

## Fix direction

Ignore untracked entries that are character devices when the scripts
decide whether a tree is clean (hypothesis, untested). A real file the
merge would lose is never a character device, so this would not hide
work.

Other scripts read `git status --porcelain` and may refuse in the
sandbox in the same way (not checked):
`scripts/worktree_pair.py:778` (`unsaved_work`),
`scripts/tab-fixtures/record.mjs:175` and `:394-395`, and
`scripts/tab-harness/test-review.mjs:428` (the fork's status, which may
not have these mounts).

Whether a pair under `tbc-wt/` gets the same mounts is untested.
