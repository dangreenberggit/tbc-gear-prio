Status: closed
Type: bug
Origin: docs/reviews/fix-prepush-git-env.md (round 2, R2-1)
Blocks: none
Blocked by: none
Related: 742

# The pre-push hook clears nothing and still runs verify when `git rev-parse --local-env-vars` fails

## What happens

`.githooks/pre-push` (branch `fix/prepush-git-env`, 4e51d757) unsets the
names that `$(git rev-parse --local-env-vars)` prints. The hook has no
`set -e` and does not check that command. When it fails, the loop gets
no names and the hook still runs `pnpm run verify` with `GIT_DIR` set,
which is the ticket 742 bug.

The round 2 reviewer showed one way: with `GIT_INTERNAL_SUPER_PREFIX=x/`
and `GIT_DIR` set, git 2.34.1 prints
`fatal: rev-parse doesn't support --super-prefix` (rc=128), the hook
exits 0, and a stub `pnpm` records `GIT_DIR`. Hypothesis, untested: git
sets `GIT_INTERNAL_SUPER_PREFIX` only during submodule recursion, never
for a pre-push hook, so a real push does not hit this today.

The comment at `scripts/check_gate_git_env.py:38-39` says the hook
"cannot run at all" while that variable is set. That is wrong: the hook
runs and clears nothing.

## Done when

- The hook stops with a non-zero exit when `git rev-parse --local-env-vars`
  fails, before it runs verify.
- `scripts/check_gate_git_env.py` either sets `GIT_INTERNAL_SUPER_PREFIX`
  and checks the hook fails closed, or its comment states the real reason
  for leaving the name out.
- `python scripts/check_gate_git_env.py` passes.

## Closing note

`.githooks/pre-push` now exits 1 with a message when
`git rev-parse --local-env-vars` fails, before it calls pnpm. The gate's
new check runs the hook with a stub `git` that fails and a stub `pnpm`,
and expects a non-zero exit with pnpm not run. Before the hook change it
failed (`rc=0, pnpm ran=True`); after, all 4 checks pass. The comment on
`NOT_SET_IN_TEST` now gives the real reason for leaving the name out.

Verified by:
`python scripts/check_gate_git_env.py`
