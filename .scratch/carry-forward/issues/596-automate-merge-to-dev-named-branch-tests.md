Status: open
Type: task
Origin: docs/reviews/feat-merge-to-dev-arg.md (round 2, A14 and P7)
Blocks: none
Blocked by: none

# Automate the live tests of `pnpm merge-to-dev <branch>`

## What is missing

`scripts/check_merge_to_dev.py` tests only the pure helpers. The git paths
of `merge_named` in `scripts/merge_to_dev.py` (the worktree checks, the
already-merged refusal, `--expect-head`, the fork-lock refusal, the
post-gate and post-merge checks) were tested only by hand, in a scratch
clone, recorded in `docs/reviews/feat-merge-to-dev-arg.md`, "Live tests"
(cases T1-T13). Nothing re-runs them when the script changes.

Also untested (P7): a real `pnpm verify` on a merge result where `dev` had
to be merged into the branch first. Every scratch case used `--no-verify`,
and the real-pair gate runs had `dev` already in the branch.

## What to do

Add a temp-repo check to `scripts/check_merge_to_dev.py`, in the style of
`check_unsaved_work_on_a_real_repo` in `scripts/check_worktree_pair.py`:
build a small repo with `dev`, a branch in a second worktree and a stub
review file, and run the script's named path with `--no-verify` for the
main cases. Keep it fast enough for `pnpm verify`.
