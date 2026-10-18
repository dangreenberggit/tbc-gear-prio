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

## Focused check (round 2)

Reviewed range: `b0f4429a095025a73acdea0004f4d2ebdd3f6b28..780b7a1f38468f932b7f3dda885fcf5688d96146`

Fork range (round 2): `f0677292955c2420e091dcc3bb3236d17d02a3ef..527c0d798752f7382fafa41ef48573233fbcf739`.

Fixes in the range:

- A1: fork `a394de6dd` raises `SAVED_VERSION` from 1 to 2 in
  `model/saved_entry.ts`, as its comment prescribes, with a test that failed
  with the version at 1 ("expected [] to include 'Heroic dungeon'"); main
  `85165236` re-pins. Effect: every saved Upgrades setting from the old tab
  (iterations, set picks, excluded sources, sort, view toggles, export
  choice) reads back as nothing saved, once per spec page.
- A2: main `339f11ba` adds `scripts/check_fork_tests.py` and
  `fork-tests:check` to `verify:steps`; `9933fad8` adds two fork-added
  tab-body tests to it; `67ef0119` lists the gate in
  `docs/agents/known-traps.md` and `docs/agents/upstream-catch-up.md`. A
  deliberate break in `pool_source.test.ts` made the step exit 1, and a lock
  naming another commit made it exit 2 (fixer's report).
- A3: main `6c19bf85` adds the run-time pool's upstream inputs to
  `INPUT_PATHS` (`assets/database`, `ui/sim/proto/database.ts`, each spec's
  `spec.ts`, `presets.ts` and `gear_sets/*`, `ui/app/preset_utils.ts`,
  `ui/sim/constants/other.ts`, `missing_effects_auto_gen.ts`,
  `ui/sim/proto/items.ts`, `ui/sim/proto/names.ts`, `utils/item_source.ts`,
  and the player class and spec files `canEquipItem` reads).
- D2: main `5d118ba7` corrects the Hourglass sentence in ADR-0038.
- Code-quality pass: fork `19ede7bdf` (CQ2 part), `ed7b40cac` (CQ3 part),
  `45ff67c91` (CQ8), `2d7ae0f89` (CQ9 part), `527c0d798` (CQ10); main
  `4fa7194d` (CQ7 part), `beeda961` (CQ9 part); main `780b7a1f` re-pins the
  fork to `527c0d798`. The pass edited no fork file in `INPUT_PATHS` and no
  ported engine file, so the six fixtures stay current; the parts that need
  such edits (CQ1, CQ4, CQ5, CQ6 and parts of CQ2, CQ3, CQ7) are in ticket 691.

One fresh `general-task` agent on Opus ran the check and wrote nothing.

1. **Conditions 1 to 3 hold: pass.** Every main commit names a finding ID,
   is a re-pin (`85165236`, `780b7a1f`: the lock and
   `data/sim-implemented-effects.json` only) or changes only this file
   (`2fff3b4e`); every fork commit names A1 or a CQ row. Every changed line
   outside tests, comments and docs is at a place a fixed finding cites. The
   upstream-file audit at `527c0d798` matches round 1: 1 modified file,
   `6 0 ui/app/SimTabsSection.tsx`, 232 A and 1 M.
2. **Each diff changes only what its finding asks: pass**, except the gap in
   R2-1.
3. **Each new test asserts its finding: pass.** The A1 test stores a version-1
   entry with "Heroic dungeon" and asserts the run still excludes it; the A1
   commit message records the failing run. `check_fork_tests.py` returns 1 on
   a failing test, 2 when the fork HEAD differs from the lock, and skips only
   when the fork or its `node_modules` is absent. Every new `INPUT_PATHS`
   pathspec matches tracked files, and they cover the imports of
   `pool_source.ts`, `item_sources.ts` and `data.ts` that decide the pool.
4. **Touched tests pass: pass.** `python scripts/check_fork_tests.py`: rc 0,
   61 files and 689 tests passed. `python scripts/check_tab_fixtures.py`: rc 0,
   all six fixtures "inputs changed since: none".

Findings:

- **R2-1. `fork-tests:check` skips one of the fork's three tab-body tests.**
  Gate correctness. `scripts/check_fork_tests.py` `TEST_PATHS` (lines 46-50)
  and its docstring (line 13) name two tab-body tests; the fork also adds
  `ui/app/tabs/UpgradesTabBody.load.test.tsx`, which passes when run alone. A
  break in the tab's load-failure handling passes `pnpm verify`. Nothing ran
  that test before this branch either; `9933fad8` widened the gate but missed
  it, because the follow-up's prompt named two files (the reviewer's
  omission, not the fixer's).
- **R2-2. The CQ3 fix left the `alt_badge` text with no reader**
  (`assets/locales/en/upgrades.json:142` in the fork). Code quality; the tab
  shows nothing different.

## Summary

**The review stops after round 2.** The focused check passed all four checks
but reported two findings that are not bookkeeping (R2-1, R2-2). Under the
skill's round limit the review stops there: no third round, no
`## Disposition` table yet. The owner decides what happens next.

Where each finding stands:

- **Fixed and checked in round 2:** A1 (same as P1), A2, A3, D2; CQ8 and CQ10
  in full; CQ2, CQ3, CQ7 and CQ9 in part.
- **Open, introduced by this branch, blocking the merge until the owner
  allows a deferral or has them fixed:**
  - A5 (same as P2), BiS sets chosen by preset name: ticket 686, an owner
    ruling.
  - A6 (same as D3), both factions' reputation rewards in the pool: ticket
    687, an owner ruling.
  - D1, off-spec tier pieces show "Source not recorded": ticket 688.
  - P3, the "no other item fact" gate checks only JSON in one folder: ticket 689.
- **Open, deferrable without the owner:** A9 (before this branch; ticket
  690); the deferred code-quality parts and R2-2 (ticket 691); R2-1 (a gap
  that predates the branch; ticket 692).
- **Bookkeeping:** A8, the untracked review file during round 1; it is now
  committed.

Tickets: this branch files 7 (686 to 692) and closes 5 (505, 293, 676, 643
and 660), counted with the two commands in the skill's step 3. It files more
than it closes.
