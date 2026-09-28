# Upgrades tab fixtures

Each `*.json` file here is a finished Upgrades-tab result, recorded from a real
run, that the tab can render again in seconds with no backend and no sim run
(ticket 504). The layout gate (`pnpm layout-gate:check`) renders
`feral-p3-p2bis.json` after its live run, so its set-bonus assertions have set
rows to measure. `pnpm tab-review` renders any fixture a manifest entry names
with `"fixture": "<name>"`.

## Schema (`schemaVersion` 1)

| Field | Meaning |
| --- | --- |
| `schemaVersion` | `1` |
| `forkSha` | `vendor/tbc-new-fork` commit the run was made on |
| `forkDirty` | always `false` here; the recorder refuses an uncommitted fork tree unless `--allow-dirty` is given (see below) |
| `spec`, `phase` | engine spec id (`feral`, `ret`) and the page phase during the run |
| `preset` or `gearUrl` | how the gear was loaded: `"<phase tab> / <Gear Sets chip>"`, or the page link |
| `gear` | the worn gear as protojson `EquipmentSpec` |
| `recordedAt`, `iterations` | when, and the tab's iterations setting |
| `ranking` | the `Ranking` object the run produced, as JSON |

Loading a fixture sets the page phase, then the gear, then shows the ranking as
a finished, current run. The page must be on the fixture's spec. "Took" never
appears for a fixture load, because no run happened; a load is settled when the
results table has rows and there is no stale banner.

## Loading one by hand

On the dev server (`:5173`, no backend needed), open the spec page with
`?upgrades-dev`, for example `http://localhost:5173/tbc/druid/feralcat/?upgrades-dev`.
The tab's run settings then show a **Load fixture** file input. From a script,
call `await window.__upgradesFixture(<parsed JSON>)`, which returns
`{ ok: true, rows }` or `{ ok: false, reason }`.

The loader exists only in builds where the `__TBC_TAB_FIXTURES__` define is
true: the dev server, and the gate harness's own build (it sets
`TBC_TAB_FIXTURES=1`). A production build has none of it. **The local
`vendor/tbc-new-fork/dist/` that the layout gate and `pnpm tab-review` build
therefore contains the loader, and must not be served as a user build.**

## Re-recording

Recording needs the backend on `:3333`, the fork dev server on `:5173`, and a
committed fork tree. A run takes about 5 minutes. Each fixture's command:

```sh
pnpm tab-fixtures:record --spec feral --phase 3 --name p2bis --preset-tab "Phase 2" --preset "BiS 6%" --expect-gear-file ui/druid/feralcat/gear_sets/p2_6p.gear.json
pnpm tab-fixtures:record --spec feral --phase 3 --name nordrassil4 --preset-tab "Phase 2" --preset "Alt 6%" --expect-gear-file ui/druid/feralcat/gear_sets/p2_alt_6p.gear.json
pnpm tab-fixtures:record --spec feral --phase 3 --name th-hands-legs --gear-url "<this fixture's gearUrl>" --expect-item-ids 8345,30017,29994,29966,30106,28545,29997,30052,30627,29383,32014,32387,30055,30101,31034,31044
pnpm tab-fixtures:record --spec ret --phase 3 --name p2 --preset-tab "Phase 2" --preset "P2" --expect-gear-file ui/paladin/retribution/gear_sets/p2.gear.json
pnpm tab-fixtures:record --spec feral --phase 2 --name malorne4 --preset-tab "Phase 1" --preset "Alt 6%" --expect-gear-file ui/druid/feralcat/gear_sets/p1_alt_6p.gear.json
```

Test gear is the previous phase's preset at the next page phase, as for every
live run and capture in this repo.

### Recording uncommitted fork code for review

Two flags record a fork change before it is committed, for example so the owner
can judge renders of it first:

- `--out <dir>` writes the file to `<dir>` instead of this folder.
- `--allow-dirty` records from an uncommitted fork tree. It is accepted only
  with an `--out` folder other than `data/tab-fixtures`. The file gets
  `forkDirty: true` and `forkDiffSha256`, the sha256 of the fork's
  `git diff --binary HEAD` at the start of the run. The recorder refuses to
  write if that diff, the fork's `git status` listing, or its HEAD changed
  during the run.

`pnpm tab-review` renders such a file when a manifest entry names it by its
`.json` path. **Never copy one into `data/tab-fixtures/`**:
`pnpm tab-fixtures:check` fails any fixture whose `forkDirty` is not `false`,
because it names no commit that produced its figures. After the fork change is
committed, re-record with the commands above.

## Staleness: a warning, never a block

`pnpm tab-fixtures:check` (part of `pnpm verify`) prints, for each fixture:

```
fixture <name>: recorded at <sha>; inputs changed since: <paths|none>
```

The inputs are the fork paths that can change a `Ranking`:
`upgrades/engine/**` (except `view.ts`, `PROVENANCE.md` and the engine's test
`fixtures/`), `upgrades/adapters/**`, `upgrades/data/**`, and
`upgrades_tab.tsx`, whose `run()` builds the engine's input. A listed path means
the fixture may no longer match what a run would produce now. Read the diff and
re-record when it changes what a run computes; a change that only affects
rendering does not need one.

The check fails (exit 1) only when a fixture cannot be read: a schema error, or
a `forkSha` that the fork clone does not contain. It never fails on staleness.
The fixtures exist to test layout, and a figure that is a few DPS out of date
still lays out the same. A blocking rule would force a re-record of every
fixture on every engine edit.

**What the check cannot see.** A `Ranking` also depends on inputs outside those
paths: the Go sim and the WASM built from it, the item database
(`assets/database/`), and the proto sources. A change to any of these is not
reported. Re-record by hand after one of them moves.
