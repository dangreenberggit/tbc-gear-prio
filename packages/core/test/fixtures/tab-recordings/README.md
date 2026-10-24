# Frozen Upgrades-tab recordings

These six files are real Upgrades-tab results: each is what the tab ranked
after a full sim run on one spec page, saved by the recorder
(`scripts/tab-fixtures/record.mjs`). Two engine tests read them as frozen test
data:

- `packages/core/test/fork-set-fixtures.test.ts` checks the fork's `view.ts`
  set-bonus figures against every row of all six files.
- `packages/core/test/fork-meta-repair.test.ts` reads `ret-p3-p2` and the four
  feral files it names.

| File                          | Spec  | Recorded at fork |
| ----------------------------- | ----- | ---------------- |
| `feral-p2-malorne4.json`      | feral | `b908771dd`      |
| `feral-p3-nordrassil4.json`   | feral | `b908771dd`      |
| `feral-p3-p2bis.json`         | feral | `b908771dd`      |
| `feral-p3-th-hands-legs.json` | feral | `b908771dd`      |
| `feral-p5-th4pc.json`         | feral | `b908771dd`      |
| `ret-p3-p2.json`              | ret   | `b908771dd`      |

Each file's `forkSha` field holds the full SHA. The files moved here from
`data/tab-fixtures/` in stage `tab-checks-without-sims`. The tab's page checks
(layout gate, `pnpm tab-review`, `pnpm tab-fixtures:smoke`) no longer read
them; they render the made-up fixtures in `data/tab-fixtures/` instead.

Nothing automatic re-records these files, and `pnpm verify` needs no sim.

## When a rule changes on purpose

Test 536-X compares the fork's `singleSwapBreaks` and `setBonusNote` with
each row's saved `setContext.singleBreaks` and `setBonusNote`. When either
rule changes on purpose, update the frozen values without a sim: run
`pnpm exec vitest run packages/core/test/fork-set-fixtures.test.ts`, take the
`received` value vitest prints for each failing row, write it into that row's
field, re-run until green, and say so in the commit.

Re-record by hand
(`pnpm tab-fixtures:record --out packages/core/test/fixtures/tab-recordings`)
only when the engine's figures are meant to change.
