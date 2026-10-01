Status: closed
Type: bug
Origin: stage-gate 511-512-set-credit diagnosis, 2026-09-28 (`.scratch/stage-gate/511-512-set-credit/diag/report.md` H3, and the 2026-09-28 entries of `decision-log.md` in the same directory; both gitignored)
Blocks: none
Blocked by: none
Related: 511, 512, 521

# The Upgrades tab drops the player's consumables from its sim requests

## Priority

The owner, 2026-09-28, on hearing of this bug (relayed verbatim by the
orchestrating session): "well that sounds dumb as rocks and like a problem
i should go get solved asap."

## What is wrong

The tab's sim requests name the player's consumables but do not carry the
database rows that describe them. A sim backend that has not already seen
those rows from another request sims the character without consumables.

Line numbers below are at fork commit
`5f3080dbd31d5fb038f7edf697a15879c8d5fe86` (`data/wowsims-fork.lock.json`
`commit`). Paths are inside `vendor/tbc-new-fork`. An independent check
verified this evidence during the diagnosis, and the filing agent re-read
each cited line on 2026-09-28.

1. The tab's skeleton request comes from upstream
   `sim.makeRaidSimRequest(false)`
   (`ui/core/components/individual_sim_ui/upgrades/adapters/skeleton.ts:28`).
   That call adds `database.consumables` and `database.spellEffects` to the
   player (`ui/core/sim.ts:290` calls `extendPlayerProtoWithMissingEffects`,
   `ui/core/proto_utils/utils.ts:1298`).
2. The tab's engine then replaces the whole field:
   `if (player.database) slot.database = player.database;`
   (`upgrades/engine/compose.ts:48`). The new value comes from
   `simDatabaseResolverFor` (`upgrades/adapters/sim_database.ts`), which
   returns `gear.toDatabase` merged with the item-swap database. Neither
   part has consumables or spell effects (`ui/core/proto_utils/gear.ts:145`).
   The resolver is wired in at
   `ui/core/components/individual_sim_ui/upgrades_tab.tsx:1820`.
3. The sim's database starts empty unless the Go build uses
   `-tags=with_db` (`sim/core/database_load.go:1`). The first write of an id
   wins (`addToDatabase`, `sim/core/database.go:49`). The wasm build
   (`makefile:107`) and the `sim/web` builds (`makefile:152,179,186`) do not
   use that tag.

## Measured effect

On the local :3333 backend, ret "Phase 2 / P2" preset, page phase 3, seed
11: the same tab request gives **1936.600 DPS** on a freshly started
backend and **2086.781 DPS** after one request that carries consumables has
warmed the backend (`diag/results.jsonl`, `diag/jobs-warm.json`). This is
one character at one seed.

## The public web build

The tab creates its own `WorkerPool` of wasm workers
(`upgrades/adapters/worker_pool_sim_runner.ts:5-10,102`). The page's own
requests go to a different pool, so those workers only see tab requests.
The tab's workers therefore probably always sim without consumables. This
is a **hypothesis, untested**.

## A trap for the fix

A request that carries consumables but no spell effects crashes
`/computeStats` with a nil dereference at `sim/core/consumes.go:259`:
`GetSpellEffectByID` (line 257) returns nil for an unknown effect id, and
line 259 reads `e.AuraPeriodMs` from it. Any fix must carry both.

## What would close this

- Tab requests carry the player's consumables and spell effects in every
  runner: the wasm workers and :3333.
- A test pins that composed requests keep them.
- On a cold worker, the tab's baseline DPS equals the page's own DPS for
  the same settings, checked with a command a reader can re-run.

## Comments

### 2026-09-28 — live confirmation deferred

The owner wants the confirmation on the public-site path done through the
stage-gate pipeline, not as a side job, so it has not been run. Notes for
that run, from setup work only (no sim ran):

- `vite serve` with `WASM_WORKER=1` set serves the real wasm worker at
  `/tbc/sim_worker.js` (`vite.config.mts:23`). Checked with
  `curl -s http://localhost:5173/tbc/sim_worker.js | wc -c`, which gave
  113023, the size of `dist/tbc/sim_worker.js`, not `local_worker.js`.
  Without that variable, `:5173` sends sims to :3333 instead.
- `dist/tbc/lib.wasm.gz` was built 2026-09-17. `git -C vendor/tbc-new-fork
  log --since=2026-09-17T19:45 -- sim proto` lists no commits, so no Go
  rebuild should be needed at fork `5f3080db`.

### 2026-10-01 — closed (stage-gate 522-tab-consumables)

Every item of "What would close this" is met. The stage files are in
`.scratch/stage-gate/522-tab-consumables/` (gitignored). The live
readbacks named below are in its `live/` folder.

**1. Commits.**

- Fork `vendor/tbc-new-fork`, branch `feat/upgrades-tab`:
  - F1 `6c2ee7cbd92c8e62547f1822880daf225185eda5`, "Add page sim and
    request capture to tab harness". It adds opt-in flags to
    `upgrades/tools/run-tab-cdp.mjs`: `--preset-tab` and `--preset`,
    `--wasm-concurrency`, `--capture-requests` and `--page-sim`. The
    harness's default behaviour is unchanged. There is no F1b.
  - F2 `bb9e925e0d404f4caf82f7a202bd5296e6f7cdb0`, "Include the page's
    consumables in tab requests". `simDatabaseResolverFor`
    (`upgrades/adapters/sim_database.ts`) now takes the skeleton request
    that the run captured. It reads that skeleton player's
    `database.consumables` and `database.spellEffects` once, and merges
    them into every per-request database after the gear and item-swap
    rows. `upgrades_tab.tsx:1820` passes the skeleton in. No file under
    `upgrades/engine/` changed.
- Main repo, branch `feat/tab-signoff-followups`: M1
  `c6d974153e295ee26e2a49e55717879f6c49c6e0`, "Pin fork with tab
  consumables fix". It sets the lock's `commit` to F2, regenerates
  `data/sim-implemented-effects.json` (only `forkCommit` changed), and
  adds the test file below.
- The fork is not pushed. `node -e
  "const j=require('./data/wowsims-fork.lock.json');console.log(j.commit,j.pushed)"`
  prints `bb9e925e0d404f4caf82f7a202bd5296e6f7cdb0 false`.

**2. Tests.** New file `packages/core/test/fork-sim-database.test.ts`.
Each case stands for a kind of consumable mix, not for one spec. The
resolver has no class or spec branch.

- 522-A: agility melee mix (the feral P2 skeleton's consumables on the
  ret P2 skeleton's gear). Stands for feral, rogue, enhancement and
  hunter.
- 522-B: strength melee with a flask and explosives (ret P2 skeleton).
  Stands for ret and warrior.
- 522-C: caster mix with mana potions, Demonic Rune and Healthstone, whose
  rows have effect ids (ret P2 gear). Stands for mage, warlock, shadow,
  balance and elemental.
- 522-D: nothing selected (ret P2 gear). No consumable rows are sent.
- 522-E: the rows follow the skeleton, not the equipment (ret P2
  skeleton, then the head swapped to 30131).
- 522-F: item-swap rows are still merged (ticket 362 regression, ret P2
  skeleton, swap main hand 28773).
- 522-G: a whole ranking with worn Malorne head, shoulder and hands
  (feral P2 skeleton), so set-less and set-kept copy requests are built.
  Every request carries the rows.

Cases A, B, C and G also check that every `effectIds` entry of every
consumable row has a `spellEffects` row. A missing one is the nil
dereference at `sim/core/consumes.go:259`. Before F2, A, B, C, E and G
failed, and D and F passed. After F2, this command gave "Tests 61 passed
| 1 skipped (62)", rc=0; it includes the 511/512 set-copy tests:

    pnpm exec vitest run packages/core/test/fork-sim-database.test.ts packages/core/test/fork-set-net.test.ts packages/core/test/fork-set-fixtures.test.ts packages/core/test/wowsims-fork-parity.test.ts packages/core/test/compose.test.ts --reporter=verbose

`pnpm verify` at M1: rc=0.

**3. Cold-worker check.** To re-run it, start vite with the real wasm
worker (PowerShell, Node 22 on PATH, working directory
`vendor/tbc-new-fork`):

    $env:WASM_WORKER = '1'
    node node_modules/vite/bin/vite.js serve --port 5173 --strictPort

`curl -s http://localhost:5173/tbc/sim_worker.js | wc -c` must print
113023 (the wasm worker). 21519 means the `:3333` worker is served. Then
run L1 from Git Bash. `MSYS_NO_PATHCONV=1` stops Git Bash from rewriting
`/tbc/...` into a Windows path:

    export MSYS_NO_PATHCONV=1
    node C:/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/tools/run-tab-cdp.mjs --origin http://localhost:5173 --page /tbc/paladin/retribution/ --phase 3 --preset-tab "Phase 2" --preset "P2" --candidates 1 --iterations 3000 --wasm-concurrency 1 --page-sim --capture-requests C:/Users/dgree/Code/lulz/tbc-gear-prio/.scratch/stage-gate/522-tab-consumables/live/l1 --timeout-ms 900000 --out C:/Users/dgree/Code/lulz/tbc-gear-prio/.scratch/stage-gate/522-tab-consumables/live/l1-ret-wasm.json

The command loads the page's "Phase 2 / P2" gear preset and runs the
Upgrades tab. It records every `WorkerPool.raidSimAsync` request with the
exact `raidMetrics.dps.avg` that the sim returned. The tab's baseline is
its first sim after Run; the harness checks it against the displayed
"Your current gear" number (`tabBaselineMatchesDisplay`). Then the
command runs the page's own Simulate at seed 11 and the same iterations,
unsplit (`--wasm-concurrency 1`), and compares the two exact values. It
also replays the page's request once on the tab's worker pool. The tab
builds its own wasm pool (`upgrades/adapters/worker_pool_sim_runner.ts:102`),
so those workers see only tab requests.

L1's stderr summary lines:

    origin=http://localhost:5173 runner=WorkerPoolSimRunner rows=1 bulk=0 raid=0 workerSessions=2 poolSize=20 fallbackWarnings=0 done=true elapsedS=16 firstRowS=16.057 clickToDoneS=16.264
    tabBaselineDps=2084.1635769294344 pageDps=2084.1635769294344 dpsDiff=0 replayDps=2084.1635769294344 replayEqual=true otherDiffCount=0 tabCallsWithPageRows=2/2

The four runs:

- L0: fork F1 (before the fix), ret, phase 3, preset "Phase 2 / P2",
  sims on the wasm workers. Readback `live/l0-ret-wasm-prefix.json`.
- L1: fork F2, otherwise the same as L0. Readback `live/l1-ret-wasm.json`.
- L2: fork F2, mage (`/tbc/mage/dps/`), phase 3, preset "Phase 2 /
  Arcane - BIS", wasm. Readback `live/l2-caster-wasm.json`.
- L3: fork F2, the same as L1, but vite runs without `WASM_WORKER`, so
  every sim goes to a freshly built and started `:3333` backend.
  Readback `live/l3-ret-3333.json`.

| Field | L0 | L1 | L2 | L3 |
| --- | --- | --- | --- | --- |
| `runner` | WorkerPoolSimRunner | WorkerPoolSimRunner | WorkerPoolSimRunner | WorkerPoolSimRunner |
| `tabBaseline.dps` | 1937.087832749025 | 2084.1635769294344 | 2562.6752052685392 | 2084.163576929428 |
| `pageDps` | 2084.1635769294344 | 2084.1635769294344 | 2562.6752052685392 | 2084.163576929428 |
| `dpsDiff` | -147.0757441804094 | 0 | 0 | 0 |
| `dpsEqual` | false | true | true | true |
| `replayEqual` | true | true | true | true |
| `tabBaselineMatchesDisplay` | true | true | true | true |
| `consumableIdsEqual` | false (tab 0, page 22) | true (22) | true (19) | true (22) |
| `spellEffectIdsEqual` | false (tab 0, page 18) | true (18) | true (17) | true (18) |
| `tabCallsWithPageRows` / `tabCallsChecked` | 0/2 | 2/2 | 6/6 | 2/2 |
| `consumablesWithEffects` | 0 | 13 | 12 | 13 |
| `effectIdsCovered` | true (no rows) | true | true | true |
| `otherDiffCount` | 0 | 0 | 0 | 0 |
| `panicHit` | false | false | false | false |
| `tabSimCalls` / `pageSimCalls` | 2 / 1 | 2 / 1 | 6 / 1 | 2 / 1 |
| `clickToDoneS` | 15.808 | 16.264 | 25.674 | 1.102 |
| wall time (`time`, real) | 44.9 s | 47.2 s | 47.6 s | 15.3 s |

Each run also made one replay sim, so the sims per run were 4, 4, 8
and 4. Every run used seed 11 and 3000 iterations on both sides, and
`pageError` was null. L3's backend build (`go build -o wowsimtbc.exe
./sim/web`) took 93 s and is not in the wall times.

L3 is not a cold check: the page's own requests may reach the backend
before the tab's. Hypothesis, untested. The harness's HTTP counter saw
8 `raidSimAsync` responses, which is twice the 4 sims the wrapper
captured. Its `firstUrls` list shows each `requestId` twice. The cause
(possibly a CORS preflight answered with 200) is a hypothesis, untested.

**4. The public web build.** L0 confirmed the hypothesis in "The public
web build" above. On the tab's own wasm pool, before the fix, the tab's
requests had no consumable or spell-effect rows, and its baseline was
7.06% below the page's figure on the same gear, seed and iterations.
`otherDiffCount` was 0, so the database was the only request difference
apart from `requestId`, `debugFirstIteration` and the player name. The
page's request, replayed on the tab's pool, gave the page's DPS exactly
(`replayEqual` true), so those three differences and the pool do not
change DPS.

**5. Fixture re-records: none.**

- `data/tab-fixtures/ret-p3-p2.json` holds a finished ranking, not
  requests, and nothing compares its DPS with a live run. Its baseline,
  2084.163576929428, was recorded on the native `:3333` backend. L3
  (native, after the fix) gave exactly 2084.163576929428, so the fixture
  was recorded with the consumables in effect. L1 (wasm) gave
  2084.1635769294344, 6.4e-12 above it: wasm and native are close but
  not bit-identical. The 511/512 work re-records this fixture later, on
  a fork that already has this fix.
- The four feral fixtures (`feral-p3-p2bis`, `feral-p3-nordrassil4`,
  `feral-p3-th-hands-legs`, `feral-p2-malorne4`) have the same consumers
  and the same reason. Whether their baselines were recorded with
  consumables in effect is a hypothesis, untested. They are layout
  fixtures, and their purpose does not depend on absolute DPS.

**6. Open items.** No ticket is filed for these.

- A tab instance that survives a vite HMR reload keeps its in-memory
  store, so it could return a ranking computed before the fix. A page
  reload clears it. Hypothesis, untested.
- F2 changed `upgrades_tab.tsx`, so the layout gate will run at the next
  `pnpm merge-to-dev`. `pnpm verify` at M1 printed "layout: would run".
- The page's ret "P2" preset loads different gear from
  `data/presets/ret/p2.raid-sim-skeleton.json`: L0's captured request has
  head 32461, the committed skeleton has 29073. This check compares the
  page with the tab on the same gear, so it is not affected.
