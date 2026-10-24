Status: closed
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

## Closing note

Both options, in `tbc-gear-prio@d263e557`. `scripts/check_tab_fixtures.py`
(run by `pnpm tab-fixtures:check`, part of `pnpm verify`) now also checks every
file in `packages/core/test/fixtures/tab-recordings/`: readable JSON, the schema
the made-up files are checked against (`schemaVersion` 1, a 40-hex `forkSha`,
`forkDirty: false`, 17 gear slots, `ranking.items`, one of
`preset`/`gearUrl`), and no `madeUp` field. It does not check that `forkSha`
is a fork commit, because CI has no fork clone. `scripts/tab-fixtures/record.mjs`
refuses `--allow-dirty` with an `--out` inside that folder, before it touches
git or the dev server.

Verified by: `python scripts/check_tab_fixtures.py` at
`tbc-gear-prio@d263e557` prints `recording <name>: ok` for all six files and
exits 0 in under 0.1 s; a copy with `forkDirty: true` gives `forkDirty is not
false`. `node scripts/tab-fixtures/record.mjs --spec ret --phase 3 --name x --preset P2 --expect-gear-file ui/specs/paladin/retribution/gear_sets/p2.gear.json --allow-dirty --out packages/core/test/fixtures/tab-recordings`
exits 2 with "--allow-dirty cannot write to packages/core/test/fixtures/tab-recordings/".
