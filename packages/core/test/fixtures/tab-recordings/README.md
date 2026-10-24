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
`pnpm tab-fixtures:check` (part of `pnpm verify`) fails a file here that is
unreadable, fails the schema, is marked `madeUp`, or names an uncommitted fork
tree (`forkDirty: true`). The recorder refuses `--allow-dirty` with an `--out`
in this folder.

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

## Re-recording by hand

A recording is a real run. It needs the fork dev server on `:5173` (or
`TBC_FORK_PORT`) with the backend on `:3333`, and a committed fork tree. Run
one recorder at a time: two on one backend slowed each other enough that page
loads timed out. At fork `b908771dd` a run took 304–327 s for each feral-p3
file, 398 s for feral-p5, 196 s for ret-p3 and 226 s for feral-p2; ticket 703
tracks runs that never settle. Each file's command:

```sh
OUT=packages/core/test/fixtures/tab-recordings
pnpm tab-fixtures:record --out $OUT --spec feral --phase 3 --name p2bis --preset-tab "Phase 2" --preset "BiS 6%" --expect-gear-file ui/specs/druid/feralcat/gear_sets/p2_6p.gear.json
pnpm tab-fixtures:record --out $OUT --spec feral --phase 3 --name nordrassil4 --preset-tab "Phase 2" --preset "Alt 6%" --expect-gear-file ui/specs/druid/feralcat/gear_sets/p2_alt_6p.gear.json
pnpm tab-fixtures:record --out $OUT --spec feral --phase 3 --name th-hands-legs --gear-url "<this file's gearUrl>" --expect-item-ids 8345,30017,29994,29966,30106,28545,29997,30052,30627,29383,32014,32387,30055,30101,31034,31044
pnpm tab-fixtures:record --out $OUT --spec ret --phase 3 --name p2 --preset-tab "Phase 2" --preset "P2" --expect-gear-file ui/specs/paladin/retribution/gear_sets/p2.gear.json
pnpm tab-fixtures:record --out $OUT --spec feral --phase 2 --name malorne4 --preset-tab "Phase 1" --preset "Alt 6%" --expect-gear-file ui/specs/druid/feralcat/gear_sets/p1_alt_6p.gear.json
pnpm tab-fixtures:record --out $OUT --spec feral --phase 5 --name th4pc --preset-tab "Phase 4" --preset "BiS 6%" --expect-gear-file ui/specs/druid/feralcat/gear_sets/p4_6p.gear.json
```

Test gear is the previous phase's preset at the next page phase, with one
exception: `th-hands-legs` wears Thunderheart Gauntlets and Leggings (31034,
31044), phase 3 items, at page phase 3. Its gear comes from the `gearUrl`
stored in the file, a link made on the old (pre-React) page that names
`localhost:5173`; with `TBC_FORK_PORT` set, the recorder opens the same link
on that port. `--expect-item-ids` makes the recorder refuse to run when the
worn gear lacks any of those 16 items. `feral-p5-th4pc` wears Thunderheart
4pc at page phase 5, so its ranking holds the phase-5 Thunderheart
Wristguards, Waistguard and Treads (34444, 34556, 34573) as candidates
(ticket 500).
