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

So there are two categories, and they are not equally serious:

- **New files in our own tree are cheap.** Not enumerated here, except the few
  that sit outside the tab's own folder (Category A).
- **Modifications to files that already exist upstream are the serious thing.**
  There is **1**: `ui/app/SimTabsSection.tsx`, 6 added lines, approved by the
  owner (Category B). Every other upstream file the branch once changed is back
  to upstream's exact text.

This file is the durable record that requirement asks for. Read it before the
next upstream merge and before opening any PR.

## How to reproduce every number here

All commands run from the main repo root against the fork clone at
`vendor/tbc-new-fork` (gitignored; its own `.git`, branch
`feat/upgrades-tab-react`). The fork commit is `316326a95`, the commit
`data/wowsims-fork.lock.json` pins. Its upstream base is `5262ff38`, the
upstream commit `data/wowsims.lock.json` pins.

```
# 5262ff38 is an ancestor of the fork commit, and the only merge between them
# is fedf78807 itself, whose second parent is 5262ff38, so this diff holds only
# our changes (119 commits plus that merge, measured 2026-10-09 at 316326a95)
git -C vendor/tbc-new-fork rev-list --no-merges --count 5262ff38..316326a95   # -> 119
git -C vendor/tbc-new-fork merge-base 5262ff38 316326a95   # -> 5262ff386bd1...
git -C vendor/tbc-new-fork log --merges --oneline 5262ff38..316326a95   # prints only fedf78807

# the modified upstream files (1) and their line counts
git -C vendor/tbc-new-fork diff --name-only --diff-filter=M 5262ff38 316326a95 | wc -l
git -C vendor/tbc-new-fork diff --numstat --diff-filter=M 5262ff38 316326a95

# the whole changed-file set by status: 259 A, 1 M, nothing else
git -C vendor/tbc-new-fork diff --name-status 5262ff38 316326a95 | cut -f1 | sort | uniq -c
```

### How the count moved

| Fork commit (base)                | Modified upstream files | Note                                                                                                                                                                      |
| --------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bbad1b8a4` (base `ec5c5f2`)      | 13                      | An older version of this ledger, under the old `ui/core/...` paths.                                                                                                       |
| `cb561067` (base `17a8fb28`)      | 34                      | The old tab's last pin; this ledger was not refreshed for it.                                                                                                             |
| `43e3963d6` (base `42c75dc9`)     | 19                      | The React port before the pre-merge review's fix round.                                                                                                                   |
| `d52c8e91e` (base `42c75dc9`)     | 18                      | `sim/core/gem_test.go` back to upstream's text (fork `8937108b0`). The previous version of this ledger.                                                                   |
| `b2851da58` (base `42c75dc9`)     | 18                      | The pin before the cleanup.                                                                                                                                               |
| `205975607` (base `42c75dc9`)     | 7                       | The 11 Go engine files back to upstream's text; the fixes parked (see "Parked").                                                                                          |
| `9e4115c22` (base `42c75dc9`)     | 6                       | `ui/sim/workers/worker_pool.ts` back to upstream's text; the silence check deleted (see "Deleted").                                                                       |
| `2c88a1192` (base `42c75dc9`)     | 4                       | The tab's strings moved to their own file; `translation.json` and `translation.schema.json` back to upstream's text.                                                      |
| `9bc7c3ac8` (base `42c75dc9`)     | 4                       | The fixture switch read from `import.meta.env` instead of a `vite.config.mts` define (the define goes with the next commit).                                              |
| `a59711d17` (base `42c75dc9`)     | 1                       | `vite.config.mts`, `package.json` and `package-lock.json` back to upstream's text; our test tooling moved to this repo.                                                   |
| `9c367c242` (base `42c75dc9`)     | 1                       | One comment in a tab file corrected; no upstream file touched.                                                                                                            |
| `c122cf73b` (base `42c75dc9`)     | 1                       | Other classes' Tier 3 pieces dropped from the bundled universes; no upstream file touched.                                                                                |
| `d983e0fbe` (base `42c75dc9`)     | 1                       | The tab's code loads the first time the tab is opened; no upstream file touched.                                                                                          |
| `5d048a089` (base `42c75dc9`)     | 1                       | Review round 2 fixes: an error boundary for a failed load, unused strings dropped, a shared test helper, a lazy-load test; no upstream file touched.                      |
| `1b28ad005` (base `42c75dc9`)     | 1                       | Other classes' Dungeon Set 2 pieces dropped from the bundled universes; no upstream file touched.                                                                         |
| `fedf78807` (base `5262ff38`)     | 1                       | 2026-10-09: merge of upstream master v0.0.148 (`5262ff38`). The `--numstat` output is unchanged: `ui/app/SimTabsSection.tsx`, 6/0.                                        |
| `28ea7a36a` (base `5262ff38`)     | 1                       | 2026-10-09: ticket 565's TanStack Table sort and virtual rows and their review fixes (`707456ecb`..`28ea7a36a`), all in tab files; `ui/app/SimTabsSection.tsx` still 6/0. |
| `59c43ddb7` (base `5262ff38`)     | 1                       | 2026-10-09: ticket 583, one tab test file; no upstream file touched.                                                                                                      |
| `e417a504e` (base `5262ff38`)     | 1                       | 2026-10-09: owner ruling on ticket 582 (the sort stays across runs) and ticket 584, three tab files; no upstream file touched.                                            |
| `56c87e6ed` (base `5262ff38`)     | 1                       | 2026-10-09: the tab's settings and sort saved across page reloads, in tab files; no upstream file touched.                                                                |
| `c7f739d06` (base `5262ff38`)     | 1                       | 2026-10-09: the tab's view toggles saved with its settings, in tab files; no upstream file touched.                                                                       |
| `b2f9293a2` (base `5262ff38`)     | 1                       | 2026-10-09: review fixes for tickets 586, 587 and 588, in tab files; no upstream file touched.                                                                            |
| `0ba3765ec` (base `5262ff38`)     | 1                       | 2026-10-09: ticket 589, a phase change saved without the tab's data, in tab files; no upstream file touched.                                                              |
| `bfde23961` (base `5262ff38`)     | 1                       | 2026-10-09: the tab's actions moved into its zustand store, and ticket 590's test fixes, in tab files; no upstream file touched.                                          |
| `218234677` (base `5262ff38`)     | 1                       | 2026-10-09: ticket 591, the store-actions review leftovers, in tab files; no upstream file touched.                                                                       |
| `d1de72abc` (base `5262ff38`)     | 1                       | 2026-10-09: ticket 592, two tests and three comment edits, in tab files; no upstream file touched.                                                                        |
| **`316326a95` (base `5262ff38`)** | **1**                   | 2026-10-09: ticket 585, one tab test file; no upstream file touched.                                                                                                      |

Each row is the `--name-only --diff-filter=M` command above over that range.

## Category B — the one modified upstream file

Counts are added/removed from `--numstat` over `5262ff38..316326a95`. Ticket
numbers are this repo's (tbc-gear-prio) tickets.

| #   | File                        | +/− | What the lines are                                                                                                                                                                                                                                                                                                                          | Why the tab needs it                                                             | Ticket |
| --- | --------------------------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------ |
| 1   | `ui/app/SimTabsSection.tsx` | 6/0 | One import (`import { UpgradesTabBody } from './tabs/UpgradesTabBody';`) and the tab's entry after the Bulk tab: `<SimTabDef id="upgrades-tab" title={i18n.t('tab_title', { ns: 'upgrades' })} badge={i18n.t('tab_badge', { ns: 'upgrades' })}>` with its `<SimTabPane>` and `<UpgradesTabBody />`, written the same way as the other tabs. | Upstream has no tab-registration hook: the tabs are listed by hand in this file. | 558    |

**The owner's approval of these 6 lines (2026-10-08).** The session described
these lines to the owner: the import, plus the tab's entry with its title and
badge text after the Bulk tab, written the same way as the other tabs. The
owner answered that description:

> "If this is normal for tabs on wowsims then this is the way to do it"

Before the title calls took their present form (fork `2c88a1192`), a check
confirmed that the other tabs at `42c75dc9` are written as inline `<SimTabDef …><SimTabPane …>…</SimTabPane></SimTabDef>`
entries (`git -C vendor/tbc-new-fork show 42c75dc9:ui/app/SimTabsSection.tsx`).
The owner then added:

> "Don't overgeneralize that last statement"

So the approval covers these 6 lines in this file and nothing else. It is not a
rule for any other edit: any other change to an existing wowsims file needs the
owner's approval of that exact change first.

The two title strings use short top-level keys (`tab_title`, `tab_badge` in
`assets/locales/en/upgrades.json`) so that wowsims' formatter (oxfmt,
`printWidth: 160` in `.oxfmtrc.json`) leaves the entry at 6 lines. To check the
file is formatted, from the fork root:
`node node_modules/oxfmt/bin/oxfmt --check ui/app/SimTabsSection.tsx`.

## Back to upstream's text

The branch changed 19 upstream files at one time or another
(`git -C vendor/tbc-new-fork log --format= --name-only 5262ff38..316326a95`,
keeping the paths that exist at `5262ff38`). At the pin before the cleanup,
`b2851da58`, 18 of them were modified, #1 among them
(`git -C vendor/tbc-new-fork diff --name-only --diff-filter=M 42c75dc9 b2851da58`);
the 19th, `sim/core/gem_test.go`, was already back to upstream's text there.
Apart from #1 above, each of them is now byte-identical to `5262ff38`:

| File                                                                                                                                                                                                                                                                                                                   | What the branch had in it                                                                                                  | Where that went                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assets/locales/en/translation.json`                                                                                                                                                                                                                                                                                   | The tab's strings, one `upgrades_tab` block.                                                                               | `assets/locales/en/upgrades.json`, namespace `upgrades` (fork `2c88a1192`). The loader names namespaces by file basename (`vite.config.mts:147`), so no loader change was needed.                        |
| `schemas/translation.schema.json`                                                                                                                                                                                                                                                                                      | The schema entries for that block.                                                                                         | `schemas/upgrades.schema.json` (fork `2c88a1192`).                                                                                                                                                       |
| `vite.config.mts`                                                                                                                                                                                                                                                                                                      | The `__TBC_TAB_FIXTURES__` define and the registration of our fixture plugin.                                              | The tab reads `import.meta.env.DEV \|\| import.meta.env.VITE_TBC_TAB_FIXTURES === '1'` (fork `9bc7c3ac8`). The plugin and a config file that wraps upstream's are in this repo (`scripts/tab-harness/`). |
| `package.json`, `package-lock.json`                                                                                                                                                                                                                                                                                    | Three test script lines and `axe-core` as a devDependency.                                                                 | The scripts run by path from `scripts/tab-harness/`; `axe-core` is this repo's devDependency (fork `a59711d17`).                                                                                         |
| `ui/sim/workers/worker_pool.ts`                                                                                                                                                                                                                                                                                        | The worker silence check (130/9) and a method that ended all workers.                                                      | Deleted (see "Deleted"). The tab keeps one worker pool for the page's life and only resizes it, as upstream's `Sim` does (fork `9e4115c22`).                                                             |
| `sim/core/procs.go`, `sim/common/classic/items_trinkets.go`, `sim/common/tbc/items_weapons.go`, `sim/rogue/talents_combat.go`, `sim/warrior/talents_arms.go`, `sim/paladin/seals.go`, `sim/warrior/talents_fury.go`, `sim/druid/item_sets.go`, `sim/rogue/items.go`, `sim/warrior/items.go`, `sim/hunter/item_sets.go` | Engine fixes: weapon procs that follow an item swap (tickets 540, 546) and class guards on set bonuses (tickets 311, 532). | Parked on a fork branch that is never merged (see "Parked"; fork `205975607` restored the files).                                                                                                        |
| `sim/core/gem_test.go`                                                                                                                                                                                                                                                                                                 | A test for ticket 541.                                                                                                     | Moved to the new file `sim/core/meta_socket_bonus_test.go` (fork `8937108b0`), which is now parked too.                                                                                                  |

### Parked

Fork branch `fix/engine-item-swap-and-off-class-guards` at `fa57ef5b7`, parent
`42c75dc9`, 14 files: the 11 modified Go files in the table above, and 3
test files that upstream does not have, added by the branch
(`sim/item_swap_weapon_proc_test.go`, `sim/off_class_set_bonus_test.go` and
`sim/core/meta_socket_bonus_test.go`;
`git -C vendor/tbc-new-fork diff --name-only --diff-filter=A 42c75dc9 fa57ef5b7`).
It is never merged into the tab branch;
the tab does not need these fixes. Ticket 573 records it. Re-run:
`git -C vendor/tbc-new-fork show --stat fa57ef5b7`.

### Deleted

The worker silence check: `ui/sim/workers/worker_silence.ts` and its
`worker_pool.ts` hooks (fork, last at `b2851da58`), and this repo's
`packages/core/test/fork-worker-silence.test.ts` (last at `7f053f09`). Ticket
574 records it, with what is lost: a sim worker that never answers now hangs the
run until the page reloads, as on every other wowsims page.

## Category A — new files outside the tab's folder

259 files are new; 253 of them are under `ui/features/upgrades/`. The other 6:

```
git -C vendor/tbc-new-fork diff --name-only --diff-filter=A 5262ff38 316326a95 -- . ':!ui/features/upgrades'
```

- **`ui/app/tabs/UpgradesTabBody.tsx`** and its three tests
  (`UpgradesTabBody.test.tsx`, `UpgradesTabBody.load.test.tsx`,
  `UpgradesTabBody.unopened.test.tsx`) sit beside upstream's
  other tab bodies (`GearTabBody`, `SettingsTabBody` and the rest), which is
  that folder's convention; upstream keeps `RotationTabBody.test.tsx` there too.
- **`assets/locales/en/upgrades.json`** cannot move: upstream's loader reads
  `assets/locales` (`vite.config.mts:147`).
- **`schemas/upgrades.schema.json`** sits beside upstream's schemas so that
  upstream's `test-locales.mjs` pairs it with `upgrades.json` by name.

### Dev pieces that stay inside the tab's folder

- `ui/features/upgrades/tools/export_equip_eligibility.mts`, `headless.mts`,
  `hooks.mjs`, `register.mjs` and `README.md`: the exporter imports fork
  modules through the fork's `tsconfig.json` path aliases, which `tsx` resolves
  from the fork's working directory.
- `ui/features/upgrades/model/data/.gitattributes`: git reads it only inside
  the fork.
- The dev code compiled into the tab (`utils/dev_flags.ts`, `utils/fixture.ts`,
  `hooks/useFixtureAutoload.ts`, `utils/select_run_fn.ts`, `model/replay_run.ts`,
  `components/DevTools/`, `components/CandidateCapPicker/`,
  `model/engine/fixtures/*.ts`): the gates load recorded rankings into the page
  through these hooks. The replay link, the file-upload box and the two
  `model/engine/fixtures/*.ts` files have no caller; the owner ruled "Unused dev
  features: ignore them", so they stay as they are.

### Moved to this repo

The browser test scripts `test-tab-harness.mjs`, `test-layout.mjs`,
`test-review.mjs`, `test-stop.mjs`, the desktop driver `run-tab-cdp.mjs`, the
fixture plugin (`tools/vite/tab_fixtures.mts`, now `tab_fixtures.mjs`) and a
Vite config that wraps upstream's (`vite.config.mjs`) are in
`scripts/tab-harness/`. The two records of ported files are
`docs/fork-provenance/engine.md` and `docs/fork-provenance/data.md`. The dev
server that serves the fixture index runs from the fork root with
`--config ../../scripts/tab-harness/vite.config.mjs`.

## The locale check on Windows

Upstream's `test-locales.mjs` (unmodified in the fork) builds its glob pattern
with `path.join`, which gives backslashes on Windows, and `glob` reads a
backslash as an escape. Measured on this repo's Windows machine only, at fork
`d52c8e91e`: the pattern matched 0 files by default and 1 file with
`windowsPathsNoEscape: true`. So a green `test-locales` run on Windows proves
nothing about the locale files. Re-run the measurement from the main repo root:

```
node --input-type=module -e "import path from 'node:path';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';const f=path.resolve('vendor/tbc-new-fork');const {glob}=await import(pathToFileURL(createRequire(f+'/package.json').resolve('glob')).href);const p=path.join(f,'assets/locales','**/translation.json');console.log((await glob(p)).length,(await glob(p,{windowsPathsNoEscape:true})).length)"
```

Validate both locale files against their schemas with Ajv directly instead. On
fork `fedf78807` this prints `upgrades valid` and `translation valid`:

```
node --input-type=module -e "import path from 'node:path';import fs from 'node:fs';import {createRequire} from 'node:module';const f=path.resolve('vendor/tbc-new-fork');const A=createRequire(f+'/package.json')('ajv');const ajv=new (A.default??A)();for(const n of ['upgrades','translation']){const v=ajv.compile(JSON.parse(fs.readFileSync(path.join(f,'schemas',n+'.schema.json'),'utf8')));console.log(n,v(JSON.parse(fs.readFileSync(path.join(f,'assets/locales/en',n+'.json'),'utf8')))?'valid':ajv.errorsText(v.errors))}"
```

Whether `test-locales.mjs` matches files on other platforms is a hypothesis,
untested here.

## Tracker references inside upstream files

`ui/app/SimTabsSection.tsx` carries none. A wowsims maintainer cannot read our
ticket numbers, so keep it that way. Re-run (prints nothing):

```
git -C vendor/tbc-new-fork grep -n -iE "ticket [0-9]+" 316326a95 -- $(git -C vendor/tbc-new-fork diff --name-only --diff-filter=M 5262ff38 316326a95)
```

## Formatting

Many of the tab's own files do not yet pass wowsims' formatting check
(`oxfmt --check`), mostly the ported engine files and the bundled data copies.
Ticket 578 records the gap and the owner's requirement that they eventually
pass. Wowsims' formatter settings (`.oxfmtrc.json`) are not edited unless the
owner approves that exact edit.

## History

Earlier versions of this ledger described fork `bbad1b8a4` on upstream
`ec5c5f2` (when the tab lived under `ui/core/...`), fork `d52c8e91e` on
`42c75dc9` (18 modified upstream files, each with its reason and ticket) and
fork `1b28ad005` on `42c75dc9` (the same 1 file as now). Read
them with `git log -p -- docs/fork-upstream-touchpoints.md`.

### `ui/core/sim.ts` — resolved: the `iterations` parameter, reverted

At fork `bbad1b8a4` the dead `iterations` parameter on `makeRaidSimRequest` was
reverted, so `ui/core/sim.ts` had zero diff against upstream. That file does
not exist at upstream `42c75dc9`.
