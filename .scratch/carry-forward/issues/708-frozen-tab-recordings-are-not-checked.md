Status: open
Type: task
Origin: docs/reviews/feat-tab-checks-without-sims.md (A4, P1)
Serves: .scratch/plans/upgrades-tab-finish-line.md
Blocks: none
Blocked by: none

# Nothing checks the frozen tab recordings, and the recorder can write a dirty one there

## What happens today

The six feral and ret recordings moved to
`packages/core/test/fixtures/tab-recordings/` as engine test data, read by
`packages/core/test/fork-set-fixtures.test.ts` and
`fork-meta-repair.test.ts`. Before the move, `tab-fixtures:check` refused a
recording with `forkDirty: true` or a `forkSha` that is not a fork commit. No
check covers the new folder.

`scripts/tab-fixtures/record.mjs` now refuses `--out data/tab-fixtures`, but
accepts `--allow-dirty --out packages/core/test/fixtures/tab-recordings`. A
recording made from uncommitted fork code can then become frozen test data
with no error.

## Done means

One of these, chosen by whoever takes the ticket:

- the recorder refuses `--allow-dirty` when `--out` is the tab-recordings
  folder; or
- a cheap test or check (no sim, no browser) fails when a file in that folder
  has `forkDirty: true`.

`pnpm verify` passes.
