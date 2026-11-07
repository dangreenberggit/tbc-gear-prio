Status: closed
Type: bug
Origin: merge of `chore/808-one-routing-source` into `dev` on 2026-11-07; owner 2026-11-07: "i agree with those. have a session take care of them"
Blocks: none
Blocked by: none

Verified by: `python scripts/check_merge_to_dev.py` (the four
`check_fork_pin_refusal_*` checks), on branch `chore/merge-hurdles`.

# The fork-pin refusal blocks branches that have no fork

## What a reader sees

`pnpm merge-to-dev chore/808-one-routing-source` refused with "dev's
data/wowsims-fork.lock.json changed since chore/808-one-routing-source
forked, so the fork in ... no longer matches dev's pin". The 808
worktree has no `vendor/tbc-new-fork`, its diff touches no fork file,
and the change on `dev` (211e2755) only set `pushed` and edited
`_comment`.

## Why

`scripts/merge_to_dev.py` refused when any line of the lock file changed
on `dev` since the branch forked. The two reasons in
`docs/agents/paired-worktrees.md`, "When `dev` has a new fork pin", need
more than that: the branch changed the lock too (a conflict), or the
branch's worktree has a fork that would go stale. Both need a new pinned
`commit` on `dev`.

## Done when

The refusal fires only when the lock's `commit` differs between the merge
base and `dev`, and the branch's worktree has a fork or the branch
changed the lock. The doc section says the same.

## Closed

`fork_pin_problem` in `scripts/merge_to_dev.py` reads the `commit` field
at the merge base and at `dev`, then checks the two reasons. Four scratch
checks in `scripts/check_merge_to_dev.py` cover: no fork and no lock edit
(merges), a fork (refused), a branch that changed the lock (refused),
and a `pushed`/`_comment`-only change on dev (not refused).
