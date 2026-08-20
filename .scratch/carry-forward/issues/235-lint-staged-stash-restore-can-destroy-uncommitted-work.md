Status: open
Type: bug (tooling/workflow hazard; data loss)
Origin: executor of stage-gate tickets-226-230, 2026-08-19 — uncommitted
  step-2/step-3 work destroyed during the commit that became 2114ac5's
  predecessor attempt; execution report at
  `.scratch/stage-gate/tickets-226-230/execution-report.md`
Blocks: none
Blocked by: none

# lint-staged's stash/restore can destroy uncommitted work on a lock race

## What happened (observed once, 2026-08-19 ~16:06)

During a commit on `feat/candidate-pool`, lint-staged (v15, invoked by
`.githooks/pre-commit:23` as `npx lint-staged`, config `.lintstagedrc` =
`{"*": "prettier --ignore-unknown --write"}`) printed
`Backed up original state in git stash`, then failed during
*Applying modifications from tasks* with:

```
fatal: Unable to create '.git/index.lock': File exists
```

The commit itself landed, but the stash restore never completed and the
unstaged working-tree changes (several hundred lines across ~8 files) were
gone. `git fsck --lost-found` found no recoverable blobs — the content had
never been staged, so nothing was ever written as an object reachable by
fsck. The work was recovered only because the session happened to hold the
full diffs in context and could reconstruct and re-verify them. Without
that, the loss is unrecoverable.

Suspected trigger (hypothesis, untested): a concurrent git process holding
`.git/index.lock` while lint-staged tried to apply its modifications — this
repo routinely runs parallel agents and background tasks in the same
checkout, so lock races are not rare events here.

## Why this is nasty here specifically

- The repo's own workflow (`AGENTS.md` § The loop) warns that lint-staged
  runs against `*`, so any dirty file rides along — meaning commits are
  routinely made with a deliberately dirty tree (WIP for the next slice).
  That is exactly the state this failure destroys.
- Parallel agents in a shared checkout make the lock race likely, not
  exotic.

## Possible mitigations (evaluate, pick one or more)

- Upgrade lint-staged and check its changelog for index.lock retry fixes
  (v15.x → current; the stash/restore path has had multiple fixes upstream).
- Run lint-staged with `--no-stash` (it then leaves the working tree alone
  and fails the commit instead of attempting a backup/restore cycle — the
  failure mode becomes "commit blocked", not "work destroyed"). Trade-off:
  partially-staged files are formatted in place.
- Narrow `.lintstagedrc` from `"*"` to staged-relevant globs so there is
  less to stash and the AGENTS.md dirty-tree caveat can be relaxed.
- A pre-commit guard that refuses to run lint-staged while
  `.git/index.lock` exists, with a short retry.

## Acceptance criteria

- [ ] Reproduce or bound the failure: either reproduce the lock race (a
      script that holds `.git/index.lock` while committing) or cite the
      upstream lint-staged issue that matches the observed output.
- [ ] Pick and implement a mitigation such that the worst case on a lock
      race is a failed commit, never lost working-tree content; document
      the choice in `docs/workflow.md`.
- [ ] If `--no-stash` or a config narrowing is chosen, update the
      AGENTS.md "lint-staged runs against *" caveat to match reality.
