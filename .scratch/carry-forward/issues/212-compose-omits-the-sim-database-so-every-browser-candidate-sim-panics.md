Status: open
Type: defect (browser-only, blocks all in-browser ranking) + design decision required
Origin: ticket 156 slice B, 2026-08-16
Blocks: ticket 156 (E-W2 throughput measurement cannot start until this is fixed)
Blocked by: none

# `compose()` never sends a SimDatabase, so every browser candidate sim panics

The diagnosis is complete and re-checkable; **the fix needs a design decision
before anyone writes it**, which is why this is a ticket and not a patch.

## Symptom

Every screening sim in the browser throws this Go panic (item id is always the
candidate's own):

```
sim error (0): No item with id: 23522
  github.com/wowsims/tbc/sim/core.NewItem      sim/core/database.go:419
  github.com/wowsims/tbc/sim/core.NewEquipmentSet   database.go:471
  github.com/wowsims/tbc/sim/core.ProtoToEquipment  database.go:479
  ... NewParty raid.go:34 -> NewRaid raid.go:178
  ... Environment.construct environment.go:77 -> NewEnvironment environment.go:58
  ... NewSim sim.go:191 -> runSim sim.go:146 -> RunSim
```

Observed 2026-08-16 on a served production build, Phase 3, Candidates empty:
**455 of 455 candidates dropped**, engine confirmed loaded (16
`GET /tbc/lib.wasm` in the access log). The panic happens during environment
construction, before any iteration runs.

## Mechanism (read from source, not inferred)

1. The WASM target is built **without** `--tags=with_db`
   (`vendor/tbc-new-fork/Makefile:123`, which also filters out
   `sim/core/items/all_items.go`). So `database_load.go`'s embedded `db.bin`
   never registers, and `ItemsByID` is empty at startup.
2. The only runtime filler is per request:
   `sim/core/character.go:95` — `if player.Database != nil { addToDatabase(player.Database) }`.
3. Upstream's own Simulate button rebuilds that proto next to the equipment it
   describes, on every sim — `ui/core/sim.ts:346-347`:
   ```ts
   player.database  = gear.toDatabase(this.db);
   player.equipment = gear.asSpec();
   ```
4. **Our `compose()` sets only the equipment** and never touches
   `slot.database` (`packages/core/src/compose.ts`, and the fork's ported copy
   `upgrades/engine/compose.ts`, same shape):
   ```ts
   slot.equipment = { items: player.equipment.map(toProtoItem) };
   ```
5. `currentPageSkeleton()` (`upgrades/adapters/skeleton.ts:30`) captures the
   skeleton **once**, from the character's *currently equipped* gear. So
   `slot.database` only ever describes worn items.

A candidate is by definition an item the character is not wearing, so the
100% failure rate is by construction — and screening sims nothing *but*
candidates. This is exactly why the (now-fixed) swallowed exception read as
"No upgrades found above the cutoff".

**`db.json` is not at fault.** 23522, 29072, 29074 and 30129 are all present
in `assets/database/db.json`, so the browser's `Database` singleton holds
them. Only the *request* is missing them.

**Why no CLI run ever caught it.** `wowsimcli` IS built `--tags=with_db`
(`Makefile:189`, `:197`, `:199`), so its `ItemsByID` is compiled in and
complete. The CLI composes requests the same incomplete way and gets away with
it. The browser is the only surface where the per-request database is the sole
source — so this is browser-only in effect, but the *bug* is in shared code.

## The decision to make

`compose()` is a pure function over a skeleton (one of the three architectural
seams' neighbours) and has no access to item stat data. Upstream's
`gear.toDatabase()` (`ui/core/proto_utils/gear.ts:145-163`) builds a
`SimDatabase` of `items`/`gems`/`enchants`/`randomSuffixes`/
`itemEffectRandPropPoints` from the browser `Database` singleton — data
`compose()` cannot reach and arguably should not.

Options, none chosen:

1. **Extend the skeleton to carry a full DB.** Have the skeleton builders
   include `SimDatabase` rows for every *pool* item up front, not just worn
   gear; `compose()` stays pure and keeps patching what it was handed. One
   build, no per-candidate lookup. **Cost:** a much larger skeleton
   (hundreds of items) `structuredClone`d per request, on the hot screening
   path — needs measuring before it is chosen.
2. **Give `compose()` an item-data lookup.** Pass a resolver
   (`itemId -> SimItem`) as a parameter and build the per-request database
   from the composed equipment, mirroring upstream. Smallest payload, closest
   to how upstream does it. **Cost:** changes `compose()`'s signature at every
   call site in both repos and adds a data dependency to a pure function.
3. **Patch the database in the adapter.** Leave `compose()` alone; have
   `WasmSimRunner` enrich the request just before handing it to the worker,
   since it has `Database` access. Confines the change to the browser.
   **Cost:** core's `compose()` stays subtly wrong and only works because
   `wowsimcli` is built `with_db` — the asymmetry survives as a trap for the
   next person.

Whichever is chosen must land in **both** `packages/core/src/compose.ts` and
the fork's ported `upgrades/engine/compose.ts`, in the §9.1a order (fork
commit -> E-W3 rerun -> `PROVENANCE.md` hash -> `check_engine_port_drift.py`).

Note `compose.ts`'s own PROVENANCE line records it as "PORTED from
packages/core/src/compose.ts, unchanged" — the gap was inherited from core,
not introduced in the port, and nothing in the repo currently documents it.

## Acceptance criteria

- [ ] An option above is chosen, with the reason recorded (including the
      clone-cost measurement if option 1).
- [ ] A test at the `rankUpgrades` interface with racing on, driving a
      candidate the character does not wear, asserting the composed request
      carries database rows for that candidate's item.
- [ ] The same fix ported to the fork, E-W3 re-run green *before* the
      `PROVENANCE.md` hash is updated.
- [ ] A served-build run screens candidates without panicking — the count of
      dropped candidates for `No item with id` reaches zero.
- [ ] Ticket 156's measurement can then start; note it must be re-baselined,
      as no previous browser run ever actually simmed a candidate.

## Comments

Option chosen 2026-08-16 (acceptance criterion 1). Plan:
`.scratch/plans/ticket-212-plan.md`.

**Chosen: option 2, in a form that keeps `compose()` pure.** The per-request
database is data handed *in*, not a lookup `compose()` performs.
`ComposePlayer` gains an optional opaque `database`; `Deps` gains
`simDatabaseFor(equipment)`; `rank.ts` consults the resolver at all four
compose sites so baseline, screening, full and package requests each describe
their own equipment — upstream's invariant at `ui/core/sim.ts:346-347`. The
browser adapter implements the resolver through upstream's own path
(`lookupEquipmentSpec` -> `gear.toDatabase(db)`). CLI callers pass no
resolver, so composed requests stay byte-identical and no fixture, sim-cache
row, or ENGINE_VERSION moves.

The ticket's stated cost for option 2 — "changes `compose()`'s signature at
every call site" — does not materialise in this form: the new field is
optional, so the CLI call sites are untouched. Evidence: the pre-existing
"matches the Stage 0 slamaltman RaidSimRequest minus simOptions" test in
`packages/core/test/compose.test.ts` passes unmodified against the change
(`npx vitest run test/compose.test.ts --root packages/core`).

**Why not option 1**: hundreds of item rows land on the `structuredClone` +
`simCacheKey` hot path per candidate, and `currentPageSkeleton()` runs in the
adapter, which never sees the pool (`pool` is a rankUpgrades dep). **Why not
option 3**: it sits below the SimRunner seam, so this ticket's own acceptance
test — assert at the `rankUpgrades` interface — cannot observe it, and core's
compose would stay wrong-by-luck on the CLI, the trap this ticket names.

**Seam classification.** `simDatabaseFor` is a data dep, not a fourth
architectural seam, so AGENTS.md's "agree a fourth port first" rule does not
apply. `PLAN.md:145-147` defines the seams as exactly `gear`/`sim`/`store`,
each a port with a live+recorded adapter pair; `PLAN.md:149-150` annotates
neighbouring `Deps` entries as "Data, not ports — see ADR-0019". The resolver
is synchronous, does no I/O, and has nothing to record.

**Preflight (plan slice 0), run 2026-08-16.** The fork's
`assets/database/db.json` covers every pool item today: 0 missing across all
six universes (2,229 entries) and 0 missing of 207 palette gems. Command in
the plan's slice 0. This retires the risk that criterion 4 fails late on data
rather than code.

**Slice 1 landed 2026-08-16; `pnpm verify` blocked by a pre-existing gate
failure, not by this change.** `pnpm run sim-implemented-effects:check` fails
on `data/sim-implemented-effects.json` being stale in one field,
`forkCommit`. Verified pre-existing: the same failure reproduces on a stashed
working tree at `f4b9b4a` with none of this ticket's edits present
(`git stash && pnpm run sim-implemented-effects:check`).

Diagnosis (not yet acted on): the committed artifact's `forkCommit`
`138fa77` matches `data/wowsims-fork.lock.json`'s pin `138fa77` — artifact and
pin agree. What has moved is the fork *working clone*, at `5e26fa0`, five
commits ahead of the pin on `feat/upgrades-tab` with a clean tree (the
ticket-156 screening-disclosure work). So the gate is comparing the artifact
against an unpinned checkout. Regenerating as the script suggests would
re-baseline the artifact onto an unpinned commit — deliberately not done as a
side effect of this ticket; it needs the `data-pipeline-work` path and a
decision about whether the pin bump belongs here or to ticket 156.

This intersects plan slices 3 and 5, which port into that clone and bump the
pin respectively.

**Slice 3 landed 2026-08-17 — the fork engine now carries the change, and
E-W3 can fail on it.** Two fork commits on `feat/upgrades-tab` (working
clone, `pushed: false`): `cd2e4106` ports the change and `eaf6acf9` re-hashes
PROVENANCE, merged by `36991167`. This repo: `2698396` extends E-W3.

The shape ported is core's **post-`ea8f916`** one, not `1d2f724`'s. `ea8f916`
exists because a review proved two of core's four compose sites accepted a
full revert of ticket 212 with every test green, so `buildSetBonuses` takes
`composeFor` as a parameter instead of resolving a second database of its
own, and the spread guard is `database !== undefined` rather than truthiness.
That commit's own acceptance check re-run against the fork:
`grep -c "compose(deps.raidSimSkeleton" vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts`
→ `1`, and `grep -n simDatabaseFor` on the same file → exactly two hits, the
`Deps` member and the closure body.

**Mutation evidence.** Command throughout:
`npx vitest run test/wowsims-fork-parity.test.ts --root packages/core`. Each
mutation was applied alone to the committed fork tree, run, then reverted
with `git -C vendor/tbc-new-fork checkout -- <the two engine files>` and
`git -C vendor/tbc-new-fork status --porcelain` confirmed empty before the
next one.

1. Unmutated → green.
2. Delete `if (player.database) slot.database = player.database;` from the
   fork's `compose.ts` → red:
   `forkRequests[0]: composed request carries no sim database (ticket 212 slice 3)`.
3. Replace `deps.simDatabaseFor?.(forEquipment)` with `undefined` inside the
   fork's `composeFor` → red: `RankError: no recording for sim key {...}`,
   the dumped key showing a player slot with `equipment` and no `database`
   while the harness keys carry one.
4. Revert **only** the package compose site to a direct database-less
   `compose(deps.raidSimSkeleton, {...})` call, leaving `composeFor` and the
   other three sites intact → red: the `setBonuses` comparison, fork
   reporting `unmeasured: "sim-failed"`, `bonusDps: undefined` where this
   repo measured `bonusDps: 20, packageDeltaDps: 75`.
5. Restored → green.

`PROVENANCE.md` was re-hashed only after run 5, never before — re-hashing
ahead of a green gate launders drift into the baseline, which is how ticket
165's blind spot survived. `python scripts/check_engine_port_drift.py` exits
0, and `pnpm verify` exits 0 on `2698396`.

**Coverage hole, disclosed rather than implied closed: E-W3 gates compose
sites 1, 3 and 4 only.** Site 2 (fork `rank.ts`, the screening path) is
wired through the same `composeFor` closure — proven statically by the
single-compose-call grep above, and behaviourally only insofar as mutation 3
reddens that shared closure body — but E-W3 never executes it, because the
suite runs `fullPool: true` (`packages/core/test/wowsims-fork-parity.test.ts`,
the `rankUpgrades` input in `buildRecordingsAndRun`), which skips screening on
both engines by design. Core covers the analogous site with
`packages/core/test/rank.test.ts:4495`; the fork has no equivalent. Filed as
ticket 217, which also records why a naive `fullPool: false` parity case may
red on legitimate divergence.

The lockfile pin is untouched here — slice 5 owns `data/wowsims-fork.lock.json`.
