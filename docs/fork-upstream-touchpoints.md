# Fork touchpoints on upstream wowsims files

## Why this document exists

We intend to open an upstream PR to wowsims, and the owner's requirement is to
minimize impact on the wowsims codebase. The owner defined "impact" precisely:

> "It's not just about likes or code it's also about where the code is — in new
> file[s] we own specific to our feature or, much much more serious and to be
> avoided unless necessary and expressly noted to me in a very durable and
> viewable way so I don't miss it or skip it, if it touches existing files the
> wowsims repo has."

The owner restated the rule for the React port of the Upgrades tab:

> "keep a clean footprint in wowsims shared files if you use them"

and said when an edit to an upstream file can be an exception (ticket 564):

> "We just don't want to run roughshod over existing code, but if we can nestle
> in a little stuff that very much fits, that's a possibile exception as long as
> it's thoughtful and I really ok it"

So there are two categories, and they are not equally serious:

- **New files in our own tree are cheap.** Not enumerated here, except the few
  that sit in upstream directories (Category A).
- **Modifications to files that already exist upstream are the serious thing.**
  There are **18**. Every one is named in Category B, with its size, why the
  tab needs it, its ticket, and whether a tab-owned alternative exists.

This file is the durable record that requirement asks for. Read it before the
next upstream merge and before opening any PR.

## Owner decisions still open

- **Q-568-keep-edits.** The owner has not yet OK'd keeping the edits in
  Category B. Nothing in this document records an approval.
- **Q-568-option.** Ticket 568
  (`.scratch/carry-forward/issues/568-shrink-and-record-the-fork-footprint-in-upstream-files.md`)
  would remove three items: the tab's strings from the shared locale and schema
  files, the `vite.config.mts` define, and the root gate scripts' `package.json`
  lines (by moving the scripts under the feature folder). The owner has not yet
  chosen when that work runs. The rows it would change are marked "568" in the
  table below.

## How to reproduce every number here

All commands run from the main repo root against the fork clone at
`vendor/tbc-new-fork` (gitignored; its own `.git`, branch
`feat/upgrades-tab-react`). The fork commit is `d52c8e91e`, the commit
`data/wowsims-fork.lock.json` pins. Its upstream base is `42c75dc9`, the
upstream commit `data/wowsims.lock.json` pins.

```
# 42c75dc9 is an ancestor of the fork commit, and no merge sits between them,
# so this diff holds only our changes (83 commits, measured 2026-10-07)
git -C vendor/tbc-new-fork merge-base 42c75dc9 d52c8e91e   # -> 42c75dc9b6ef...
git -C vendor/tbc-new-fork log --merges --oneline 42c75dc9..d52c8e91e   # prints nothing

# the modified upstream files (18) and their line counts
git -C vendor/tbc-new-fork diff --name-only --diff-filter=M 42c75dc9 d52c8e91e | wc -l
git -C vendor/tbc-new-fork diff --numstat --diff-filter=M 42c75dc9 d52c8e91e

# the whole changed-file set by status: 253 A, 18 M, nothing else
git -C vendor/tbc-new-fork diff --name-status 42c75dc9 d52c8e91e | cut -f1 | sort | uniq -c
```

### How the count moved

| Fork commit (base)                | Modified upstream files | Note                                                                                                                                       |
| --------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `bbad1b8a4` (base `ec5c5f2`)      | 13                      | The previous version of this ledger, under the old `ui/core/...` paths.                                                                    |
| `cb561067` (base `17a8fb28`)      | 34                      | The old tab's last pin; this ledger was not refreshed for it.                                                                              |
| `43e3963d6` (base `42c75dc9`)     | 19                      | The React port before the pre-merge review's fix round.                                                                                    |
| **`d52c8e91e` (base `42c75dc9`)** | **18**                  | `sim/core/gem_test.go` is back to upstream's text: its test moved to the new file `sim/core/meta_socket_bonus_test.go` (fork `8937108b0`). |

Each row is the `--name-only --diff-filter=M` command above over that range.
Between `43e3963d6` and `d52c8e91e` four more files shrank:
`ui/app/SimTabsSection.tsx` (7/1 to 6/0) and `ui/sim/workers/worker_pool.ts`
(133/10 to 130/9) in fork `8937108b0`; `assets/locales/en/translation.json`
(158/0 to 157/0) in fork `90f06c690`; and `schemas/translation.schema.json`
(491/1 to 486/0) in forks `90f06c690` and `d52c8e91e`.

## Category B — the 18 modified upstream files

Counts are added/removed from `--numstat` over `42c75dc9..d52c8e91e`.
**"Tab-owned alternative" is our judgement, not a measurement**, unless the
row says it was measured. Ticket numbers are this repo's (tbc-gear-prio)
tickets.

| #   | File                                   | +/−   | Why the tab needs it                                                                                                                                                                                                              | Ticket        | Tab-owned alternative                                                                                                                                                                                       | 568     |
| --- | -------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | `assets/locales/en/translation.json`   | 157/0 | The tab's UI strings, one `upgrades_tab` block. Upstream routes all UI text through i18n.                                                                                                                                         | 558, 559, 560 | Yes, probably: a feature-owned `assets/locales/en/upgrades.json`. The loader namespaces files by basename (`vite.config.mts:154`), so it needs no upstream edit (hypothesis, untested; prerequisite below). | removes |
| 2   | `schemas/translation.schema.json`      | 486/0 | The schema sets `additionalProperties: false`, so #1's strings need schema entries. The top-level `required` array no longer lists `upgrades_tab` (fork `d52c8e91e`), so upstream's own file validates without #1.                | 558, 568      | Yes, with #1: a `schemas/upgrades.schema.json`, which `test-locales.mjs` pairs with `upgrades.json` by name (hypothesis, untested).                                                                         | removes |
| 3   | `package.json`                         | 5/1   | `axe-core` 4.13.0 as a devDependency for the layout and review gates' a11y checks (`test-tab-harness.mjs`), and three script lines: `test:layout`, `test:review`, `test:stop`. The −1 is a trailing comma.                        | 560           | The three script lines go if the root gate scripts move under `ui/features/upgrades/` and run by path. No alternative found for the `axe-core` line.                                                        | lines   |
| 4   | `package-lock.json`                    | 11/0  | The lock entries for #3's `axe-core`. No other dependency moved.                                                                                                                                                                  | 560           | None while `axe-core` is a devDependency.                                                                                                                                                                   | no      |
| 5   | `vite.config.mts`                      | 9/0   | The `__TBC_TAB_FIXTURES__` define, which compiles the recorded-fixture loader into dev and gate builds only, and the import and registration of the fork-only `tools/vite/tab_fixtures.mts` plugin.                               | 504, 560      | The define and the fixture path could move into the plugin's `config()` hook (hypothesis, untested). The plugin's import and `plugins` entry stay.                                                          | define  |
| 6   | `ui/app/SimTabsSection.tsx`            | 6/0   | Registers the tab: one import and one `SimTabDef` block.                                                                                                                                                                          | 558           | None. Upstream has no tab-registration hook; tabs are listed inline in this file.                                                                                                                           | no      |
| 7   | `ui/sim/workers/worker_pool.ts`        | 130/9 | The worker silence check: the tab recovers from a sim worker that never answers instead of hanging. The helper logic is already in the fork-only `ui/sim/workers/worker_silence.ts`.                                              | 545, 553      | None found. The check needs the pool's request bookkeeping.                                                                                                                                                 | no      |
| 8   | `sim/core/procs.go`                    | 10/0  | Adds `NewDynamicLegacyProcForTypes`, a weapon-type proc manager rebuilt in place on item swap, used by #9-#12 (#10 in part). Without it a proc keeps its old chance after a weapon swap, and the tab sims weapons with item swap. | 540           | None: the defect is in shared sim code. An upstream-fix candidate.                                                                                                                                          | no      |
| 9   | `sim/common/classic/items_trinkets.go` | 1/12  | Hand of Justice uses #8.                                                                                                                                                                                                          | 540           | None, as #8.                                                                                                                                                                                                | no      |
| 10  | `sim/common/tbc/items_weapons.go`      | 5/24  | Blinkstrike (31332) moves to upstream's existing `NewDynamicLegacyProcForWeapon`, the Twin Blades of Azzinoth haste proc uses #8, and the Twin Blades set gets weapon slots so its aura re-checks on a weapon swap.               | 540           | None, as #8.                                                                                                                                                                                                | no      |
| 11  | `sim/rogue/talents_combat.go`          | 1/9   | Rogue Sword Specialization uses #8.                                                                                                                                                                                               | 540           | None, as #8.                                                                                                                                                                                                | no      |
| 12  | `sim/warrior/talents_arms.go`          | 6/24  | Warrior Mace and Sword Specialization use #8.                                                                                                                                                                                     | 540           | None, as #8.                                                                                                                                                                                                | no      |
| 13  | `sim/paladin/seals.go`                 | 1/1   | Seal of Vengeance builds its manager with `NewLegacyPPMManager`, so its chance follows a weapon swap.                                                                                                                             | 546           | None, as #8.                                                                                                                                                                                                | no      |
| 14  | `sim/warrior/talents_fury.go`          | 1/1   | Unbridled Wrath, the same change as #13.                                                                                                                                                                                          | 546           | None, as #8.                                                                                                                                                                                                | no      |
| 15  | `sim/druid/item_sets.go`               | 6/0   | Class guard on the Moonglade Raiment 4-piece. The tab sims other classes' armor; on them the druid class-mask bits cut the cost of unrelated spells.                                                                              | 532           | None: shared sim code. An upstream-fix candidate.                                                                                                                                                           | no      |
| 16  | `sim/rogue/items.go`                   | 6/0   | Class guard on a rogue leather set's 4-piece, as #15.                                                                                                                                                                             | 532           | None, as #15.                                                                                                                                                                                               | no      |
| 17  | `sim/warrior/items.go`                 | 11/1  | Class guards on the Bold Armor 2- and 4-piece, as #15; the 4-piece's unchecked type assertion becomes a checked one.                                                                                                              | 532           | None, as #15.                                                                                                                                                                                               | no      |
| 18  | `sim/hunter/item_sets.go`              | 40/7  | Class guards on hunter set bonuses and a `hunterFromAgent` helper. On another class an unchecked hunter type assertion panics, and a hunter class-mask bit can name a spell that makes the sim panic.                             | 311, 532      | None, as #15.                                                                                                                                                                                               | no      |

The "Why" column for #8-#18 restates each change's own code comment or its
ticket's title; the sim output was not re-run for this ledger.

### Before moving the strings (#1, #2): the locale gate validates nothing on Windows

Upstream's `test-locales.mjs` (unmodified in the fork) builds its glob pattern
with `path.join`, which gives backslashes on Windows, and `glob` reads a
backslash as an escape. Measured on this repo's Windows machine only, at fork
`d52c8e91e`: the pattern matched 0 files by default and 1 file with
`windowsPathsNoEscape: true`. So a green `test-locales` run on Windows proves
nothing about the locale files. The fix round validated `translation.json`
against the schema with Ajv directly instead. Re-run from the main repo root:

```
node --input-type=module -e "import path from 'node:path';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';const f=path.resolve('vendor/tbc-new-fork');const {glob}=await import(pathToFileURL(createRequire(f+'/package.json').resolve('glob')).href);const p=path.join(f,'assets/locales','**/translation.json');console.log((await glob(p)).length,(await glob(p,{windowsPathsNoEscape:true})).length)"
```

On Windows it prints `0 1`. Whether the gate matches files on other platforms
is a hypothesis, untested here. Any move of #1 and #2 under
ticket 568 needs a locale check that matches files on this machine first.

## Category A — new files that sit in upstream directories

253 files are new. These are the ones whose location, not size, is the
question:

- **`test-layout.mjs`, `test-review.mjs`, `test-stop.mjs`,
  `test-tab-harness.mjs` at the fork root**, beside upstream's own
  `test-locales.mjs`. They are the Upgrades tab's layout, review and Stop gates
  and their shared CDP harness, so they read as project test infrastructure
  rather than feature code. Ticket 568 moves them under
  `ui/features/upgrades/`, which also removes #3's script lines. The main
  repo's `scripts/check_layout_gate.py`, `scripts/check_desktop_tab.py` and
  `scripts/tab-fixtures/*.mjs` name these paths and move with them.
- **`ui/app/tabs/UpgradesTabBody.tsx`** (and its test) sits beside upstream's
  other tab bodies (`GearTabBody`, `SettingsTabBody` and the rest), which is
  that folder's convention.
- **`ui/sim/workers/worker_silence.ts`** sits beside `worker_pool.ts` (#7),
  which imports it.
- **`tools/vite/tab_fixtures.mts`** sits beside upstream's
  `tools/vite/spec_pages.mjs`; #5 registers it.
- **Go tests** `sim/item_swap_weapon_proc_test.go`,
  `sim/off_class_set_bonus_test.go` and `sim/core/meta_socket_bonus_test.go`
  test #8-#18 and ticket 541 in new files, so no upstream test file changes.

## Tracker references inside upstream files

Eight of the 18 files carry one reference to our tracker each:

```
git -C vendor/tbc-new-fork grep -c -iE "ticket [0-9]+" d52c8e91e -- $(git -C vendor/tbc-new-fork diff --name-only --diff-filter=M 42c75dc9 d52c8e91e)
```

The six Go files name "tbc-gear-prio ticket N". `ui/sim/workers/worker_pool.ts`
("ticket 553") and `vite.config.mts` ("ticket 504") do not name the repo. A
wowsims maintainer cannot read any of them; before a PR, replace each with a
description of the bug.

## History

The previous version of this ledger described fork `bbad1b8a4` on upstream
`ec5c5f2`, when the tab lived under `ui/core/...`. Upstream's React rewrite
removed those files, so its per-file sections, its merge-conflict view and its
recommended PR sequence no longer apply. Read it with
`git log -p -- docs/fork-upstream-touchpoints.md`.

### `ui/core/sim.ts` — resolved: the `iterations` parameter, reverted

At fork `bbad1b8a4` the dead `iterations` parameter on `makeRaidSimRequest` was
reverted, so `ui/core/sim.ts` had zero diff against upstream. That file does
not exist at upstream `42c75dc9`.
