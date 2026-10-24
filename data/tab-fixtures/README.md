# Upgrades tab fixtures (made up)

Each `*.json` file here is a made-up Upgrades-tab result. The tab renders it
in seconds with no backend and no sim run (ticket 504). The figures are made
up and mean nothing; the rows are real items from the spec's own preset gear
files, so icons and quality colours resolve. Each file covers one UI
difference we expect between specs, and loads on one spec page that has it.

The tab's automatic page checks render these files and no sim recording:

- the layout gate (`pnpm layout-gate:check`) runs its before-run checks on the
  ret page at four widths, then renders every file here on its own spec's
  page;
- `pnpm tab-review` renders the file a manifest entry names with
  `"fixture": "<name>"`;
- `pnpm tab-fixtures:smoke` opens every file once.

| File                     | Page                        | UI difference it covers                                                       |
| ------------------------ | --------------------------- | ----------------------------------------------------------------------------- |
| `mock-offhand.json`      | `/tbc/rogue/dps/`           | off-hand rows beside main-hand rows                                           |
| `mock-ranged.json`       | `/tbc/hunter/dps/`          | the ranged slot (bows)                                                        |
| `mock-long-names.json`   | `/tbc/mage/dps/`            | item names of 60–80 characters that must wrap only between words              |
| `mock-set-bonus.json`    | `/tbc/warrior/dps/`         | rows whose swap breaks a worn set bonus, and one that completes a bonus       |
| `mock-many-rows.json`    | `/tbc/druid/feralcat/`      | a table long enough that only part of it is rendered at once                  |
| `mock-dropped-list.json` | `/tbc/paladin/retribution/` | a long "Items left out and other notes" list: two headings and ten item lines |

Every file also holds at least one set-bonus row with a popover, one BiS row
below the cutoff, one owned row and one row with three sources. Each file's
`covers` field says the same thing as the table.

The set-bonus rows are swaps the game allows on the file's gear: a row breaks
only a bonus that is active, from a slot that holds a piece of that set; its
piece counts are the gear's; and it crosses or reaches only a count at which
its set has a bonus. The generator reads those counts from the fork's Go set
definitions (`sim/**/*.go`). Every set row is marked as a step ranking, as on
a real run, and a row that more pieces of its set would take to a bonus lists
that bonus, so the popover shows the bonuses a row can reach.
`mock-set-bonus` is on the warrior page because no feral preset wears a set
one piece short of a bonus, and a crossing row needs that.

## The generator

`packages/core/test/tab-fixtures/make-mock-fixtures.ts` writes all six files.
It is deterministic and needs the fork clone (`vendor/tbc-new-fork`), because
it reads the preset gear files and the item database there.

```sh
pnpm tab-fixtures:mock            # write the six files
pnpm tab-fixtures:mock --check    # exit 1 when a file differs, is missing, or is not one it writes
```

Do not edit a file here by hand: change the generator and run
`pnpm tab-fixtures:mock`. `pnpm tab-fixtures:check` (part of `pnpm verify`)
runs `--check`, then `scripts/check_tab_fixtures.py`, which fails any file
here that is not made up.

## Schema (`schemaVersion` 1)

| Field                  | Meaning                                                                         |
| ---------------------- | ------------------------------------------------------------------------------- |
| `schemaVersion`        | `1`                                                                             |
| `madeUp`               | always `true` here                                                              |
| `generator`, `covers`  | the generator's path, and one sentence naming the UI difference                 |
| `forkSha`, `forkDirty` | 40 zeros and `false`: no fork commit produced these figures                     |
| `spec`, `phase`        | engine spec id (the page the file loads on) and the page phase                  |
| `preset`               | the preset gear file `gear` is copied from, under the fork's `ui/specs/`        |
| `gear`                 | the worn gear as protojson `EquipmentSpec`                                      |
| `recordedAt`           | `1970-01-01T00:00:00.000Z` (the files are not recorded)                         |
| `iterations`           | `0` (no sim ran)                                                                |
| `ranking`              | a `Ranking` object holding the fields the tab reads                             |

Loading a fixture sets the page phase, then the gear, then shows the ranking as
a finished, current run. The page must be on the fixture's spec. "Took" never
appears for a fixture load, because no run happened; a load is settled when the
results table has rows and there is no stale banner.

## Looking at one (the storybook)

- **By hand.** Start `:5173` (the `wowsims-fork` entry in `.claude/launch.json`, or `npx vite serve --config ../../scripts/tab-harness/vite.config.mjs --port 5173` in `vendor/tbc-new-fork`; no backend) and open `http://localhost:5173/tbc/tab-fixtures/`. Each link opens the Upgrades tab on that fixture; `<html data-upgrades-fixture>` becomes `loaded` or `failed`.
- **Smoke.** `pnpm tab-fixtures:smoke` opens every link. It starts `:5173` only when the port is free, prints one line per fixture, writes PNGs to `.scratch/tab-fixtures-smoke/`, and exits 0 or 1. To use another port, set `TBC_FORK_PORT` (for example `TBC_FORK_PORT=5174 pnpm tab-fixtures:smoke`); `record.mjs` reads it too. A second checkout with its own fork, such as a port worktree, needs this, because two fork dev servers cannot share `:5173`.
- **Timing.** 1.4–5.6 s per fixture on a warm server; the first load after a server start took up to about 30 s (`pnpm tab-fixtures:smoke`, ticket 520, measured on the recordings this folder held before).
- **What it proves:** the fork's working tree, uncommitted edits included, renders the made-up result.
- **What it does not prove:** that a run would give any figures like these, fixed-width layout, or accessibility. Use `pnpm layout-gate:check` and `pnpm tab-review` for those.
- **Without a backend** the `:3333` calls are refused and the left Stats panel shows zeros. The results table is not affected.
- **Other ways.** `?upgrades-dev` still shows a **Load fixture** file input, for a fixture kept outside this folder. A script can call `await window.__upgradesFixture(<parsed JSON>)`, which returns `{ ok: true, rows }` or `{ ok: false, reason }`.

The loader exists only on the dev server (`import.meta.env.DEV`) and in the
gate harness's own build, which sets `VITE_TBC_TAB_FIXTURES=1`
(`scripts/tab-harness/test-tab-harness.mjs`). A production build has none
of it. The fixture index at `/tbc/tab-fixtures/` needs the dev server to
run with `--config ../../scripts/tab-harness/vite.config.mjs`. **The local
`vendor/tbc-new-fork/dist/` that the layout gate and `pnpm tab-review` build
therefore contains the loader, and must not be served as a user build.**

## Real results, by hand

To look at a real render, for example for an owner review, record a real run
with `pnpm tab-fixtures:record`. No gate, check or `pnpm verify` step runs the
recorder. It writes to `.scratch/tab-recordings/<spec>-p<phase>-<name>.json`
(gitignored), or under `--out <dir>`, and refuses an `--out` inside this
folder. A recording needs a fork dev server that can run the sim (the backend
on `:3333`, or `WASM_WORKER=1`) and a committed fork tree unless
`--allow-dirty` is given; `node scripts/tab-fixtures/record.mjs --help` lists
the flags. A run takes several minutes; ticket 703 tracks runs that never
settle.

Render a recording with `pnpm tab-review` by naming its `.json` path in the
manifest entry (`"fixture": ".scratch/tab-recordings/<file>.json"`), or open
it through the **Load fixture** input above. Never copy one into this folder:
`pnpm tab-fixtures:check` fails it.

The six real recordings that two engine tests read are frozen test data in
`packages/core/test/fixtures/tab-recordings/`; its README says how they were
recorded and how to update them.
