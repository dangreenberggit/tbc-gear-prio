Status: open
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
