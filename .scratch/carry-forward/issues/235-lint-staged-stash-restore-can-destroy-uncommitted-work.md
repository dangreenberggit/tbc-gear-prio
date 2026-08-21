Status: resolved
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

- [x] Reproduce or bound the failure: either reproduce the lock race (a
      script that holds `.git/index.lock` while committing) or cite the
      upstream lint-staged issue that matches the observed output.

      Reproduced. `.scratch/repro-235/repro.sh` builds a throwaway repo, runs
      a task that fails (which drives lint-staged into its recovery path), and
      holds `.git/index.lock` from a second process across the recovery
      window. Re-run:

      ```sh
      bash .scratch/repro-235/repro.sh stash "$PWD/node_modules/.bin/lint-staged" \
        "$PWD/.scratch/repro-235/lab-stash"
      ```

      It prints the ticket's exact error (`fatal: Unable to create
      '.../.git/index.lock': File exists`) and reports the unstaged edit as
      removed from the working tree.

      Root cause read from the installed source (`lint-staged 16.4.0`,
      `node_modules/lint-staged/lib/gitWorkflow.js`, `restoreOriginalState`):
      recovery runs `git reset --hard HEAD` and *then*
      `git stash apply --index`. A lock held between those two calls means the
      reset has already wiped the tree and the apply cannot put it back.

      Upstream has no retry for this: lint-staged issue
      [#842](https://github.com/lint-staged/lint-staged/issues/842) requests a
      lock check and was closed without one shipping. Nearest report of the
      resulting loss is
      [#793](https://github.com/lint-staged/lint-staged/issues/793). Neither is
      an exact match for the original 2026-08-19 event (there the backup stash
      was also absent, which the v15 source suggests should not happen), so
      that specific detail stays **unexplained**.

- [x] Pick and implement a mitigation such that the worst case on a lock
      race is a failed commit, never lost working-tree content; document
      the choice in `docs/workflow.md`.

      `.githooks/pre-commit` now runs
      `npx lint-staged --no-stash --no-hide-partially-staged`, and
      `package.json` pins `lint-staged` to `~16.4.0`. Documented in
      `docs/workflow.md` § "Why lint-staged runs with
      `--no-stash --no-hide-partially-staged`".

      Measured, worst case on a lock race (each row a run of
      `repro.sh`, editing the flags in its `nostash` branch):

      | Config                                  | Unstaged WIP after the race            |
      | --------------------------------------- | -------------------------------------- |
      | default (stash on)                      | removed from tree, left in a stash     |
      | `--no-stash` alone                      | removed from tree, **no stash**        |
      | `--no-stash --no-hide-partially-staged` | **intact**, commit fails               |

      `--no-stash` alone was **not** sufficient — hiding partially staged
      changes writes a patch that the same lock blocks from being restored,
      with no backup stash left to recover from.

      The lock-guard candidate was tested and rejected:

      ```sh
      bash .scratch/repro-235/repro.sh guard "$PWD/node_modules/.bin/lint-staged" \
        "$PWD/.scratch/repro-235/lab-guard-v16"
      ```

      The guard never fired (no "index.lock held" line in the lab's
      `commit.out`) yet `index.lock` still appears in that output: the lock is
      taken *after* the guard's check passes, so lint-staged runs and races
      anyway. A guard only narrows the window, it does not close it. WIP did
      survive that particular run, but only because the stash restore happened
      to succeed — that is timing, not a guarantee.

      The v15 → 16 upgrade is required, not incidental: in 15.5.2 `--no-stash`
      implies `--no-hide-partially-staged` with no way to separate them
      (confirmed via `lint-staged --help` on 15.5.2); upstream corrected the
      implication in 16.1.1. v17 was not taken because it requires Node
      `>=22.22.1` and this toolchain runs v22.16.0 (`node --version`).

- [x] If `--no-stash` or a config narrowing is chosen, update the
      AGENTS.md "lint-staged runs against *" caveat to match reality.

      Not edited here — AGENTS.md changes need owner approval, so replacement
      wording was proposed in the resolving session's report instead. The
      caveat's substance still holds (`.lintstagedrc` is unchanged at `"*"`,
      so a dirty tree still rides along); what changed is that the unstaged
      half of a *partially staged* file is now committed too.

## Resolution

Verified with `pnpm verify` (passing) on commit `bea685a`, branch
`fix/235-lint-staged-stash`.

Note `vendor/` is gitignored and absent in a fresh worktree; four test files
fail without it. Restore the pinned inputs with `pnpm sync:wowsims:restore`
before running `pnpm verify` (`pnpm sync:wowsims` **updates** the pin instead
— it moved the lockfile v0.0.101 → v0.0.119 here and had to be reverted).
