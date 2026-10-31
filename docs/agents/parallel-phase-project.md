# Parallel-phase project values

The values that the `parallel-phase` skill and its adapters read for this
repo, one section per kind.

## Branches

**Feature branch:** `feat/<slug>` or `phase-N/<slug>`

**Integration branches:** `dev` and `main`

## Commands

**Gate command:** `pnpm verify`

**Review step:** `pre-merge-review`

**Merge command:** `pnpm merge-to-dev`. `scripts/check_merge_ready.py`
already enforces the review's `## Disposition` table when
`pnpm merge-to-dev` runs.

## Isolation

**A slice that reads or edits the fork (`vendor/tbc-new-fork`):** make
a pair instead of the plain worktree:
`pnpm wt:pair ${SLICE} "${FEATURE}-${SLICE}" "${FEATURE}-${SLICE}" -b --base "${BASE}" --new-fork-branch`
(`${SLICE}` at most 23 characters). A plain worktree has no `vendor/`,
so `pnpm verify` refuses it unless `TBC_VERIFY_WITHOUT_FORK=1` (steps:
`docs/agents/paired-worktrees.md`). The pair is installed when the
command prints `pair ready`; its folder is on the `main` line of that
output. Before the merge, follow `docs/agents/paired-worktrees.md` "Land
it on dev" steps 2-4 with `${FEATURE}` in place of `dev`, so the slice's
fork commits reach the clone's branch and the lock names them. Remove
the pair only with `pnpm wt:unpair ${SLICE}`, and after the merge delete
its fork branch with
`git -C vendor/tbc-new-fork branch -d "${FEATURE}-${SLICE}"`.

## History

**Claude Code worktree basing:** all 33 `worktree-agent-*` branches in
this repo sit at `origin/main` (55b5a51d, checked 2026-10-10 with
`git for-each-ref --format='%(objectname:short)' 'refs/heads/worktree-agent-*' | sort | uniq -c`),
but `origin/HEAD` now names `origin/dev`, so a new one may sit there
instead (untested).
