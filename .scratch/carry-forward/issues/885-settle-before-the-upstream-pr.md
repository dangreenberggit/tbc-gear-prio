Status: blocked
Type: task
Origin: docs/reviews/chore-344-pr-prep.md (ticket 344's pass, 2026-11-17)
Blocks: pre-pr
Blocked by: none
Related: 344, 544

# What to settle before the Upgrades tab goes upstream

Ticket 344's pass (fork `9a54b4e31` and `5d688dd2a`, then the review fixes
`c922f7efc` to `e8de08ded`, the naming pass `1b18e5fae` to `b23f50100`, and
`99c27adc8`) changed comments, formatting and names only, with no change in
behaviour. These items need a code, text or test change, or an edit
to an upstream file, so each waits on an owner ruling. `blocked` because
only the owner can move them.

## Text that still cites this repo

- **String literals in shipping code** (text the tab or its errors can show):
  `ui/features/upgrades/model/engine/se.ts:49` (`PLAN.md §10`) and `:74`
  (`ticket 236; upstream vendor/tbc-new-fork/sim/core/sim.go:248-251`), two
  `DegenerateSeedsError` messages; `model/engine/disclosure.ts:57`
  (`ticket 351`) and `:113` (`see PLAN.md §14's 2026-08-09 amendment`),
  disclosure texts. `tools/export_equip_eligibility.mts` writes a `_comment`
  naming `scripts/check_equip_eligibility.py` and `pnpm verify`.
- **Test names:** 28 `describe`/`it`/`test` names in the tab's tests carry a
  ticket number or `ADR-0037`: 27 under `ui/features/upgrades/` (one of them
  `ADR-0037`, `model/assumptions.test.ts:13`) and
  `ui/app/tabs/UpgradesTabBody.unopened.test.tsx:83` (`ticket 589`). Renaming
  them changes no behaviour. The earlier count of 29 included two data
  numbers, `pool_source.test.ts:34` and `:66`, and missed the tab-body test.
- **JSON:** the `_comment` fields of `model/pool_source.presets.fixture.json`
  and `model/pool_source.cells.fixture.json` cite this repo's tickets and
  "the outer repo's" stage folder, and some ep-weights copies under
  `model/data/` (for example `warrior-p2.ep-weights.json`, `ticket 803`)
  carry notes from this repo's `data/presets/`, which they copy byte for
  byte.

## Tests that lean on this repo

- `model/results_view.test.ts:39` reads
  `../../../../../../packages/core/test/fixtures/tab-recordings/ret-p3-p2.json`,
  a file in this repo, so in wowsims its test at line 283 always skips.
- `lastCandidateDoneFor` (`model/run_progress.ts:33`) solves the engine's
  sim total (`model/engine/rank.ts:1221-1222`) by hand. The test that checks
  it against the engine and recorded runs (`fork-run-progress.test.ts`) is in
  this repo, so nothing checks it in wowsims. The seed count and the
  replication filter are no longer copies: since fork `1b18e5fae` both files
  read them from `model/engine/se.ts`.

## What should ship

- `tools/` (the equip-eligibility exporter) exists for this repo's data
  pipeline. The fixture dev path (`utils/fixture.ts`, `utils/dev_flags.ts`
  `?upgrades-fixture`) needs a dev-server plugin that is not in the fork.
- **Formatting of `model/data/*.json`.** Upstream CI runs `oxfmt . --check`,
  and the 22 JSON copies under `ui/features/upgrades/model/data/` fail it.
  They are byte copies of this repo's `data/presets/` and `data/universes/`,
  which `pnpm fork-universes:check` compares as bytes, so formatting them in
  the fork alone breaks that gate. Two ways out: add
  `"ui/features/upgrades/model/data/*.json"` to `ignorePatterns` in the fork's
  `.oxfmtrc.json` (an edit to an upstream file; upstream already ignores
  generated JSON such as `ui/**/apls/*.apl.json`), or have
  `scripts/sync_fork_universes.py` write oxfmt's JSON layout on both sides.
  Ticket 544 does the work once this is ruled.
- **Options only tests reach.** The partner rules `sum-of-singles-plain`,
  `single-swap` and `every-combination` (`model/engine/partner-choice.ts:18`;
  its header says the first two "are kept only for that scoring"),
  `Deps.partnerRule` (`model/engine/rank.ts:159`), `Ranking.partnerAudit`
  (`rank.ts:529`, `PartnerAudit` at `partner-choice.ts:135`) and set-screen
  `record` mode (`model/engine/set-screen.ts:24`, `Deps.setScreen` at
  `rank.ts:167`). The tab sets none of them: it passes `setScreen: 'on'`
  (`model/run.ts:129`) and
  no `partnerRule`. Since fork `02cca7b70` deleted the tab's check hook, only
  this repo's `packages/core/test/fork-set-net.test.ts` sets them (for
  example lines 691, 3172 and 3903). In wowsims nothing would reach them.
- **Engine fixtures with no importer in the fork.**
  `model/engine/fixtures/slamaltman-offline.ts` and `report-events-offline.ts`
  (183 lines) are imported only by each other; this repo's tests use core's
  own copies under `packages/core/src/fixtures/`. `slamaltman-offline.ts:11-12`
  names a real character (`realm: 'dreamscythe'`, `name: 'slamaltman'`).

## Behaviour change left out of 344

- **Iteration caps.** The finish-line plan's Chunk 5 step 4 says to hold the
  tab to upstream's web limits. Upstream's Bulk tab warns when iterations
  exceed `WEB_ITERATIONS_LIMIT` (1,000,000; `ui/sim/bulk/types.ts`) on the
  web build (`ui/features/bulk/model/limits.ts`,
  `ui/features/bulk/components/BulkSettings/CombinationsCount.tsx:28-30`),
  and blocks a run only on combinations. The tab's iterations field has no
  cap (`ui/features/upgrades/components/RunControls/RunControls.tsx`).

## Done when

Each item above has the owner's ruling, recorded here, and the ones ruled
"change" are done on a branch with their tests.
