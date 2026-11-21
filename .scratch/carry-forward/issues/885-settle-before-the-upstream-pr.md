Status: closed
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

## Rulings (owner, 2026-11-20)

The coordinator proposed, per item:

- Error and disclosure text that cites `PLAN.md` and ticket numbers (`se.ts`, `disclosure.ts`): rewrite it in plain words.
- 28 test names with ticket numbers or ADR-0037: rename them.
- JSON `_comment`s naming this repo: remove them.
- The test that reads a recording from this repo and always skips in wowsims: bring the fixture into the fork, or leave the test out of the PR.
- `tools/` and the fixture dev path: leave out of the PR.
- 22 `model/data/*.json` failing upstream's `oxfmt --check`: have the sync script (`scripts/sync_fork_universes.py`) write oxfmt's layout on both sides, not edit the fork's `.oxfmtrc.json`.
- Partner rules, set-screen `record` mode and the audit, reached only by our tests: remove them from the fork. Fold in 886/887's question: the `'split'` credit view and the `'full-path'` rule, which the tab never uses, get removed too.
- Two unused engine fixtures, one with a real character's name: delete them.
- No cap on the iterations field: match upstream, the same warning the Bulk tab shows above `WEB_ITERATIONS_LIMIT`.

Owner's reply: "Sure, yes (don't bring a fixture into the fork, we can leave it in the parent repo)".

## What was done (branch `chore/885-pre-pr-cleanup`, fork branch of the same name)

- **Text.** The two `DegenerateSeedsError` messages and the imbue assumption
  no longer cite `PLAN.md` or tickets (fork `3215ba095`). The `PLAN.md §14`
  disclosure text at `disclosure.ts:113` was already gone (ticket 887).
- **Test names.** 27 names under `ui/features/upgrades/` and the tab body
  lose their ticket or ADR numbers (fork `1200948d9`); the 28th was the
  recording test below.
- **JSON `_comment`s.** Removed from both pool fixtures (fork `1200948d9`);
  their text, the record of every re-pin, moved to
  `docs/fork-provenance/data.md` § Pool fixture notes moved here, and the
  fork's `testing/db_pool.ts` and `model/pool_source.test.ts` now say how to
  re-pin without naming this repo. Not done, because the ruling named
  `_comment`s: the ep-weights copies' `notes` (some cite ticket 803 and "this
  repo's CLI") and `tier-exchange.json`'s `generatedBy`. They are left for
  the owner.
- **Recording test.** Moved out of the fork to
  `packages/core/test/fork-results-view-recording.test.ts`, which runs it
  against the fork's `results_view.ts` with the fixture where it is; the fork
  copy, which always skipped there, is deleted (fork `1200948d9`).
- **`tools/` and the fixture dev path.** Kept on the fork branch and left
  out when the PR is cut, because removing them now breaks
  `pnpm equip-eligibility:check` (a `verify` step), the layout gate,
  `pnpm tab-review` and `pnpm tab-fixtures:smoke`. Ticket 889 holds the step
  and the file list.
- **oxfmt layout.** `scripts/sync_fork_universes.py --write` rewrites each
  source in oxfmt's JSON layout before copying it, `--check` fails on a source
  out of layout, and `scripts/generate_fork_exchange.py` writes the same
  layout; the 22 copies and their sources moved (fork `a46cb03fd`), content
  unchanged. `pnpm fork-lint:check` now runs the fork's `oxfmt --check` over
  every file the fork changed since `branchedFrom` (closes ticket 544).
- **Options only tests reach.** Removed: the partner rules other than
  close-calls, `Deps.partnerRule`, the partner audit, set-screen record mode,
  the `'split'` view and the `'full-path'` rule (fork `ac2353f6f`). This
  repo's tests that only exercised them are gone (511-SZ, 511-SF); the rest
  check the tab's options. What the tab runs and its cache keys are
  unchanged.
- **Engine fixtures.** Already deleted by ticket 887 (fork `57035ec23`).
- **Review fixes.** The last ticket number in shipping code, a `set-screen.ts`
  comment, is gone, and a pool test comment names its two policies (fork
  `dadfad891`). Review: `docs/reviews/chore-885-pre-pr-cleanup.md`.
- **Iterations.** No cap. When the run's iterations in all (the baseline
  plus each eligible candidate, under the candidate cap, times the
  iterations per sim) pass the Bulk tab's limit for the host (1,000,000 on
  the web sim, 10,000,000 in the downloaded sim), the field shows the
  Bulk tab's own warning, as the Bulk tab weighs a batch's combinations
  times its iterations; built from wowsims' pieces
  (`bulkIterationsLimit`, the
  `bulk_tab.warning.iterations_limit` text and `CombinationsCount.tsx:28-54`'s
  icon and tooltip); it never blocks the run (fork `300e10e4b`, weighed in all after
  review in `294c57a84`). The downloaded sim's limit was added after the
  owner's standing ruling "match wowsims, don't invent"; at first the tab
  showed nothing there.
- **Data notes.** The `notes` of seven ep-weights sources (feral p1,
  hunter fallback and SV p1, warrior fallback, p2 and Arms p3) no longer
  name this repo's code, CLI, data file names or ticket 803 (they name wowsims presets instead), and `tier-exchange.json`'s
  `generatedBy` says in words what it is built from. The fork copies follow
  through `scripts/sync_fork_universes.py --write` (fork `94fc69429`).
  Then, with the owner's approval, 17 notes that named the fork branch
  `feat/upgrades-tab`, and feral's old `ui/<class>/` paths, now cite only
  the current `ui/specs/...` files (fork `568d9f8fb`).

Verified by: `pnpm run fork-lint:check` ("oxfmt clean over the 247 files changed since 24606be6bae2"), `pnpm run fork-tests:check`, `python scripts/check_sync_fork_universes.py` (9 checks) and `pnpm exec vitest run packages/core/test/fork-results-view-recording.test.ts packages/core/test/fork-set-net.test.ts packages/core/test/fork-set-fixtures.test.ts packages/core/test/wowsims-fork-parity.test.ts` on tbc-new-fork@568d9f8fb12742f18679a01557a8cb2e34da0575, plus `python scripts/sync_fork_universes.py --check` and `python scripts/generate_fork_exchange.py --check` after the data notes; review in docs/reviews/chore-885-pre-pr-cleanup.md
