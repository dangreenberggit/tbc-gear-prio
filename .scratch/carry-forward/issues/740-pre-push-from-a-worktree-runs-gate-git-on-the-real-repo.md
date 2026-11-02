Status: open
Type: bug
Origin: .scratch/agent-reports/2026-11-01-general-task-prepush-worktree-pair-check.md (main checkout)
Blocks: none
Blocked by: none

# A push from a linked worktree makes two gates run git on the real repo

## What the owner saw

On 2026-11-01 the owner ran
`TBC_VERIFY_WITHOUT_FORK=1 git -C .../.scratch/wt-global-lane-split push origin dev`.
The pre-push hook failed with:

```
subprocess.CalledProcessError: Command '['git', '-C', '/tmp/tmpv5grfvp4/pair', '-c', 'user.name=t', '-c', 'user.email=t@t', 'init', '-q']' returned non-zero exit status 128.
```

## Cause

A push from a linked worktree runs `.githooks/pre-push` with `GIT_DIR`
set to the worktree's gitdir (`<main>/.git/worktrees/<name>`).
`pnpm run verify` passes it on to every gate. Two gates build throwaway
repos in a temp dir and run git there without clearing it, so their git
calls act on the real repo instead:

- `scripts/check_worktree_pair.py`, `check_unsaved_work_on_a_real_repo`:
  its `git init` sets `core.bare=true` in the real repo's config, and its
  `git commit` adds a commit to the worktree's branch.
- `scripts/check_merge_ready.py`, `check_closing_rule_reads_git`: adds
  commits and a `feat` branch, and switches the worktree's HEAD.

In the owner's run, the config write failed because the real repo has an
empty read-only `.git/config.lock`, which gave the exit 128 above. With
no lock file both gates pass and leave the damage. A push from the main
checkout is not affected: the hook gets no `GIT_DIR`.

`scripts/check_merge_to_dev.py` already clears `GIT_*` around its own
temp-repo check (commit c61d478b).

## Reproduce

From a checkout of `dev` at acbc1033, in bash:

```sh
T=$(mktemp -d -p "$TMPDIR"); git -C $T init -q main && git -C $T/main -c user.name=t -c user.email=t@t commit -q --allow-empty -m base && git -C $T/main worktree add -q $T/wt; GIT_DIR=$T/main/.git/worktrees/wt python scripts/check_worktree_pair.py; git -C $T/main rev-list --all --count; git --git-dir=$T/main/.git config --get core.bare
```

On 2026-11-01 this printed `worktree_pair.py checks ok (27 checks)`,
then `2` commits (was 1) and `core.bare` `true` (was `false`).

## Done when

- `.githooks/pre-push` clears the variables that bind git to one repo
  (`git rev-parse --local-env-vars`, keeping `GIT_CONFIG*`) before
  `pnpm run verify`.
- Both scripts clear `GIT_*` themselves, so they are safe however they
  are called.
- A gate in `pnpm verify` runs both scripts with `GIT_DIR` set to a
  throwaway worktree gitdir and fails if the throwaway gains commits or
  branches or `core.bare` becomes true.
