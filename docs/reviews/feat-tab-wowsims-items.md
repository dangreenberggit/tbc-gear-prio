# Pre-merge review — feat/tab-wowsims-items

Reviewed range: `6b7e11c1a4d2e0271b93c2466bdf5a1b2e476f8e..b0f4429a095025a73acdea0004f4d2ebdd3f6b28`

Fork range (round 1): `160ae36c2..f0677292955c2420e091dcc3bb3236d17d02a3ef` in
`vendor/tbc-new-fork` (branch `feat/tab-wowsims-items`).

Ticket 505: the fork Upgrades tab builds its candidate pool at run time from
wowsims' db.json and presets, in place of 44 bundled universe files. The one
non-wowsims item file the fork keeps is the tier-token and Sunmote exchange
file (`data/two-hop/tier-exchange.json`). Heroic five-man epics enter the
pool under an unticked "Heroic dungeon" box; Magisters' Terrace heroics stay
ticked. ADR-0038 records the decisions.

**Dispatch.** Round 1 ran the full axes, because the branch changes `data/`
and `vendor/` paths (`git diff --shortstat dev...HEAD`: 43 files, 31155
insertions, 24365 deletions). `codex` is not on `PATH`, so the three axes ran
as fresh `general-task` agents on Opus (review lane), in parallel, in the
foreground. Each was told it writes nothing. The domain axis ran because the
diff decides which TBC items enter the pool and how their sources are named.
Each axis read the stage-gate decision log
(`.scratch/stage-gate/tab-wowsims-items/decision-log.md` in the main folder)
and was told that a finding repeating an accepted row needs a new reason.

**Upstream-file audit** (`docs/fork-upstream-touchpoints.md`, at the fork
tip `f06772929`):

```
git -C vendor/tbc-new-fork diff --name-only --diff-filter=M e804c29e8 f06772929 | wc -l   # 1
git -C vendor/tbc-new-fork diff --numstat --diff-filter=M e804c29e8 f06772929             # 6 0 ui/app/SimTabsSection.tsx
git -C vendor/tbc-new-fork diff --name-status e804c29e8 f06772929 | cut -f1 | sort | uniq -c   # 232 A, 1 M
```

The only modified upstream file is `ui/app/SimTabsSection.tsx`, with the 6
approved lines. The two fork files this branch changes outside
`ui/features/upgrades/` (`ui/app/tabs/UpgradesTabBody.test.tsx` and
`UpgradesTabBody.unopened.test.tsx`) are fork-added, so they are in the `A`
set.

## Adversarial

- **A1. A "Heroic dungeon" untick saved by the old tab now reads as a tick.**
  Silent wrong result. Before this branch, a stored source key meant
  "excluded", and the old p5 pools offered the "Heroic dungeon" key
  (`git -C vendor/tbc-new-fork show 160ae36c2:ui/features/upgrades/model/data/ret-p5.universe.json`
  holds 15 Magisters' Terrace heroic rows with no zone). Now a stored
  default-off key means "ticked" (fork `model/settings_pool.ts`
  `effectiveExcludedSources`), but `SAVED_VERSION` is still 1
  (`model/saved_entry.ts:20`), although its own comment says it is bumped
  when a field changes meaning. A ret p5 player who had unticked the box gets
  1444 candidates in place of 1387. Row K2-6-defaultoff accepted the
  default-off rule, not saved entries whose meaning flips. Same finding as P1.
- **A2. No automatic gate runs the fork's pool tests.** Gate correctness. The
  root `vitest.config.ts:56` excludes `**/vendor/**`, and no verify step runs
  the fork's tests; `fork-lint:check` only lints and type-checks. Before this
  branch, `universe-rebuild:check` and `fork-universes:check` checked pool
  content inside `pnpm verify`; now `verify` passes when `pool_source.ts`
  breaks. Row K5-14-fork-test is about the fork having no `test` script, not
  this gap.
- **A3. `tab-fixtures:check` misses inputs that now decide the pool.** Gate
  correctness. `scripts/check_tab_fixtures.py` `INPUT_PATHS` does not list
  the upstream files the run-time pool reads: each spec's `presets.ts`,
  `ui/sim/constants/missing_effects_auto_gen.ts`, `ui/sim/proto/items.ts`
  (`canEquipItem`) and the upstream item-source helper. An upstream catch-up
  that changes them prints "inputs changed since: none".
  `data/tab-fixtures/README.md` does not name them in its "cannot see" list.
- **A4. Fork comments and test fixtures cite scripts in a gitignored
  folder.** Fork `pool_source.ts:5-8`, the `_comment` of
  `pool_source.cells.fixture.json` and `pool_source.presets.fixture.json`,
  and comments in `settings_pool.test.ts` and `assumptions.test.ts` name
  `.scratch/stage-gate/tab-wowsims-items/poolrule/*.py`, which
  `.gitignore:59` ignores and no checkout has. The pinned sizes cannot be
  re-measured independently from a checkout. Same finding as S2; recorded as
  code quality (CQ2), because the test still fails when the TypeScript pool
  changes.
- **A5. The BiS rule reads preset names.** Fork `pool_source.ts:51`,
  `NOT_BIS_NAME = /pre[- ]?raid|prebis|realistic|\balt\b|bulwark/i`. The
  pre-branch code chose default sets by ids and phase and had no name pattern
  (`git -C vendor/tbc-new-fork show 160ae36c2:ui/features/upgrades/model/settings_pool.ts`).
  The owner ruled on 2026-10-17 against name-reading rules; the decision log
  accepted this rule at session level (01:21Z note, row N3), with no owner
  approval recorded. Same finding as P2.
- **A6. The pool holds both factions' copies of faction-locked reputation
  rewards.** The pool never reads `factionRestriction`. The re-recorded
  `data/tab-fixtures/ret-p3-p2.json` (Blood Elf) ranks Alliance-only 29153 and
  29156 (Honor Hold) beside Horde-only 29155 and 29165 (Thrallmar), at about
  -1,390 DPS. wowsims also marks 29119 (Consortium) and 29171 (Cenarion
  Expedition) as Alliance-only, so filtering on the field as it stands would
  drop items a Horde player can get (hypothesis, untested). Same finding as
  D3.
- **A7. `follow_phase.test.ts` mocks the tab's own `poolFor`**
  (`vi.mock('./data/data')`). Code quality (CQ10).
- **A8. The pair had one untracked file, this review file.** Bookkeeping.
- **Outside the diff:** hunter and warrior presets share a phase and name, so
  their set-option keys `preset:${phase}:${name}` collide. The presets
  fixture shows it: hunter has 14 duplicate (phase, name) pairs and warrior 6
  (a Python count over `pool_source.presets.fixture.json`). The key format is
  the same at `160ae36c2`, so this predates the branch. Listed as A9.

Checked and clean (adversarial axis, Python over the fork's db.json): the
leftover db adds no candidate; every db item has a phase and every drop a
known zone; heroic difficulty appears only in five-man zones; all 198 token
pieces and 23 Sunmote upgrades are in the fork db; no preset item is later
than its preset's phase.

## Domain

- **D1. Off-spec tier pieces show "Source not recorded".**
  `scripts/generate_fork_exchange.py` builds token rows only from the 11 DPS
  specs' `<spec>-tokens.json`. The pool now admits every tier set a class can
  wear, so 108 pieces have no token row: healer and tank sets such as
  Justicar Armor (29066-29070), Justicar Raiment (29061-29065), Crystalforge,
  Lightbringer, Warbringer, Destroyer, Onslaught, and their T6 wrist, waist
  and feet pieces. `ret-p3-p2.json` holds 30 such rows and `feral-p5-th4pc.json`
  18, all labelled unknown and below the cutoff (best -55.7). Unticking a raid
  zone does not hide them, and the TMB export gives the piece id where it
  should give the token id.
- **D2. ADR-0038 gives the wrong reason Hourglass of the Unraveller leaves
  feral's list.** `docs/adr/0038-...md:200-202` calls 28034 "a heroic Black
  Morass drop". db.json at the fork tip lists a normal Temporus drop as well,
  and `feral-p5-th4pc.json` still holds the row. Bookkeeping.
- **D3.** Same finding as A6.

Checked and clean (domain axis): all 198 token rows have the right class
group, slot, zone and boss for T4, T5 and T6; db.json phase matches the raid
tier for every epic raid drop; the 23 Sunmote pairs are Sunwell items at
phase 5; 65 epics are heroic-only outside Magisters' Terrace; Magisters'
Terrace heroic epics 34470-34473 and 34601-34616 stay ticked and show "(H)";
arena seasons follow wowsims' item phases; fixture sizes are plausible (ret
794 to 990; feral 479 to 558, 686 to 762, 962 to 1041).

## Standards + Spec

The `code-review` skill ran both sub-axes on `general-task` / Opus in the
foreground.

**Standards: no documented rule broken.** Every JSON import is cast to a
hand-written type; tests call pure functions and assert on no stage
internals; no fourth port. Findings are judgement calls:

- **S1.** Comments at fork `pool_source.ts:30` and `settings_pool.ts:77` call
  the option text "Add it, but leave it switched off" the owner's answer; the
  owner answered "1" (decision log 01:45Z). CQ1.
- **S2.** Same as A4. CQ2.
- **S3.** Comments this diff made false: `item_sources.test.ts:49`
  ("recorded from the bundled universes"), `ItemNameCell.tsx:22` (the
  universe's BiS or Alt tag; nothing produces `'Alt'` now),
  `engine/types.ts:20`, `ResultRow.test.tsx:140`. CQ3.
- **S4.** The rule "heroic, and not Magisters' Terrace" is written twice
  (`pool_source.ts:94-97`, `item_sources.ts:61-63`); a test guards drift.
  CQ4.
- **S5.** `phaseOf` (`pool_source.ts:73`) treats a missing phase as Infinity;
  `:149-152` and `:203` return the raw phase. No preset item lacks a phase
  today. CQ5.
- **S6.** Presets travel as a data clump: `poolFor` reads them from the host
  while its siblings take them as arguments (`data.ts:104-139`);
  `assumptions.ts:36` and `useUpgradesSettings.ts:69-71` repeat the walk.
  Row K2-5-poolFor accepted `poolFor` reading from the host, not the
  inconsistency. CQ6.
- **S7.** `{ file: 'wowsims db' }` (`data.ts:115`) names no file;
  `UpgradesResults.tsx:69` builds the whole pool to test emptiness; main
  `sync_fork_universes.py`, `fork-universes:check` and
  `check_sync_fork_universes.py` still say "universes" and keep a
  membership-diff branch only universe files used. CQ7.
- **S8.** `tokenSource` (`testing/ranking_fixture.ts:6`) returns its
  argument. CQ8.
- **S9.** `package.json:15` has `fork-universes:check &&pnpm run` (runs
  correctly); `testing/db_pool.ts:50-62` `PROTO_SPEC` is the inverse of
  `run.ts:43-55` `SPEC_ID_BY_PROTO_SPEC`. CQ9.

**Spec: delivers ticket 505, the plan and ADR-0038, with these gaps:**

- **P1.** Same as A1 (the reviewer verified it).
- **P2.** Same as A5.
- **P3. The "no other item fact" gate checks only JSON files in one
  folder.** `scripts/sync_fork_universes.py` `unlisted_json` globs
  `model/data/*.json`; the brief (brief.md:62) says "a gate fails if any other
  non-wowsims item fact reaches the fork". plan.md:9 narrowed it to this.
- **P4.** Same line as S3. **P5.** Same line as S9.

## Code quality

| ID   | Finding                                                                       | Where                                                                                                                       |
| ---- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| CQ1  | Comments present option text as the owner's words (S1)                        | fork `pool_source.ts:30`, `settings_pool.ts:77`                                                                             |
| CQ2  | Comments and fixture `_comment`s cite scripts in a gitignored folder (A4, S2) | fork `pool_source.ts:5-8,40,82`, `pool_source.*.fixture.json`, `settings_pool.test.ts:144`, `assumptions.test.ts:37`        |
| CQ3  | Comments made false by this diff; dead `'Alt'` branch (S3, P4)                | fork `item_sources.test.ts:49`, `ItemNameCell.tsx:22`, `engine/types.ts:20`, `ResultRow.test.tsx:140`                       |
| CQ4  | Magisters' Terrace heroic rule written twice (S4)                             | fork `pool_source.ts:94-97`, `item_sources.ts:61-63`                                                                        |
| CQ5  | Two phase lookups treat a missing phase differently (S5)                      | fork `pool_source.ts:73,149-152,203`                                                                                        |
| CQ6  | Presets passed inconsistently; repeated walks (S6)                            | fork `data.ts:104-139`, `assumptions.ts:36`, `useUpgradesSettings.ts:69-71`                                                 |
| CQ7  | Misleading names and leftover code (S7)                                       | fork `data.ts:115`, `UpgradesResults.tsx:69`; main `sync_fork_universes.py`, `check_sync_fork_universes.py`, `package.json` |
| CQ8  | `tokenSource` does nothing (S8)                                               | fork `testing/ranking_fixture.ts:6`                                                                                         |
| CQ9  | `&&pnpm` spacing; duplicated spec map (S9, P5)                                | main `package.json:15`; fork `testing/db_pool.ts:50-62`                                                                     |
| CQ10 | Test mocks the tab's own `poolFor` (A7)                                       | fork `follow_phase.test.ts`                                                                                                 |
