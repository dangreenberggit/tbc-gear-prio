# Slice 3 — adapters + first ranking: handoff

Plan: [`docs/plans/wowsims-tab/plan.md`](../../../../docs/plans/wowsims-tab/plan.md)
§2.2–2.5, §4, §5, §8 (E-W1, E-W2), §9.3.

Status: **adapters built, wired, typecheck clean, `pnpm verify` green,
E-W1 passes decisively. E-W2 blocked by an environment WASM-throughput
problem that is not this slice's code — see below.**

## Commits

- This repo, `feat/shopping-list-wowsims-tab`: (this commit) — plan §5's
  E-W2 note, `data/wowsims-fork.lock.json` bump to the fork's new commit,
  this handoff.
- Fork, `vendor/tbc-new-fork` on `feat/upgrades-tab`: `f7146dd69` "Wire
  adapters into the Upgrades tab for end-to-end ranking" — **not pushed**
  (plan §1 lock). Parent: `e49dcf23c` (slice 2's engine port).

## The three adapters

### `PlayerGearSource` (`upgrades/adapters/player_gear_source.ts`)

Implements `GearSource` over the page's own `Player`, not a WCL log.
`findFights` returns one synthetic `FightSummary` ("current page settings");
`readGear` ignores the `FightRef` it's handed (nothing to look up — there is
exactly one "fight" on this surface) and reads directly off `simUI.player`.

**The `talentPointsByTree` resolution — plan called it untested, now
resolved, not worked around.** `Player.getTalentTreePoints()`
(`ui/core/player.tsx:966`, backed by `proto_utils/utils.ts`'s
`getTalentTreePoints`) sums the page's own talents string per tree and
returns exactly the `[number, number, number]` shape the field needs. No
stand-in value, no default — it is the page's live talent allocation. A
length check throws if it isn't exactly 3 (TBC has exactly 3 trees per
spec; anything else means the talents string itself is malformed, which is
worth surfacing, not silently defaulting).

Every other field verified against real `Player`/`EquippedItem` accessors,
not assumed:

- `items[].id` / `.enchant` / `.gems`: `EquippedItem.id`,
  `.enchant?.effectId`, `.gems` — the *same* accessors
  `EquippedItem.asSpec()` uses to build the protojson `ItemSpec` the sim
  itself consumes downstream (`ui/core/proto_utils/equipped_item.ts:285-292`),
  so there is no second, independently-drifting reading of the same state.
- `items[].slot`: `Gear.getEquippedItems()` returns `Object.values(this.gear)`
  over a `Partial<Record<ItemSlot, EquippedItem>>`. JS iterates
  integer-keyed object properties in ascending numeric order — a language
  guarantee, confirmed by reading the ECMAScript-ordering rule, not
  assumed — and the fork's own `ItemSlot` enum
  (`ui/core/proto/common.ts:1921+`) is declared `Head = 0` through
  `Ranged = 16` in **exactly** `SIM_ORDER`'s order (`upgrades/engine/slots.ts`).
  Verified by reading both enumerations side by side: index `i` in the
  returned array is `SIM_ORDER[i]`, no translation needed.
- `className` / `specIdHint`: left `undefined`. `rank.ts`'s own doc comment
  already says these are unread on this port (no spec-mismatch check —
  `spec.ts` not ported, plan §2.1), so there is nothing to populate them for.

### Skeleton serialization (`upgrades/adapters/skeleton.ts`, D5)

`currentPageSkeleton(simUI)` calls `simUI.sim.makeRaidSimRequest(false)` —
upstream's own request builder, the same one the page's Simulate button
runs — converts the typed proto to protojson via `RaidSimRequestProto.toJson`,
then deletes `simOptions` and `requestId`, mirroring `engine/compose.ts`'s own
`delete req.simOptions; delete req.requestId`. `debug: false` matches what
`Sim.runRaidSim`/`runRaidSimWithLogs` pass for a real run; `debug: true`
would force `iterations: 1`.

Race is **not** passed in `RankInput` — `rank.ts`'s own `raceFromSkeleton`
reads it out of the skeleton's `raid.parties[0].players[0].race` (a protojson
string like `"RaceHuman"`, which is protobuf-ts's default enum JSON
serialization), so the engine already gets the page's race for free.

### `WasmSimRunner` (`upgrades/adapters/wasm_sim_runner.ts`)

Implements `SimRunner` over `WorkerPool.raidSimAsync`. Owns its **own**
`WorkerPool(4)` instance rather than reaching into `Sim`'s private
`workerPool` field (`Sim.workerPool` has no public accessor in
`ui/core/sim.ts`) — `WorkerPool`'s constructor is self-contained (every
worker points at the fixed `SIM_WORKER_URL`, no dependency on `Sim` state),
so a second pool is an ordinary object of the same kind the page already
runs, not a workaround.

**Deliberately does not call `runConcurrentSim`**
(`ui/core/sim_concurrent.ts`). That function splits *one request's
iterations* across workers by sharding the seed
(`sim/core/sim_concurrent.go`'s `SplitSimRequestForConcurrency`), which
`docs/plans/compute-topology.md` §3.1 measured as producing a *different*
float in the last few digits per shard count — the wrong tool for "many
small independent requests." Plan §2.4 names the real idiom: "there is no
bulk RPC — upstream's own Batch tab loops one ordinary sim per combination
client-side." So `run()` calls `pool.raidSimAsync(proto, noop, signals)`
once per candidate, unsharded, and the pool's own least-busy-worker
balancing runs several candidates concurrently.

`version()` returns `api-v${CURRENT_API_VERSION}` (`constants/other.ts`) —
the fork has no baked-in build/commit identifier available at runtime, and
this is a real, meaningful, already-exported version signal rather than an
invented one.

## Data copied into the fork (plan §2.5, deferred from slice 2)

`upgrades/data/`: ret universes p2-p5, feral universes p2-p3, ret p2
EP weights, feral p1 EP weights — copied byte-for-byte from this repo's
`data/universes/` and `data/presets/`. `upgrades/data/data.ts` is the
per-spec/per-phase lookup (`poolFor`, `epWeightsFor`), with the JSON-import
widening handled the way AGENTS.md requires: one explicit assertion at the
JSON→engine-type boundary (`RawUniverse`), not threaded through as `any`.
Full provenance and the known staleness (ret p3-p5 tags trace to p2-era
membership per plan §7; ret only has EP weights at p2; feral only has p1 EP
weights) is in `upgrades/data/PROVENANCE.md` — carried over, not fixed here.

## Tab wiring (`upgrades_tab.tsx`)

Explicit **Run** button (plan §4's run model — no auto-rerun). On click:
resolves the page's spec to `SpecId` (`SpecRetributionPaladin`/
`SpecFeralCatDruid` only — plan §2.5's "renders only for specs with universe
data"; anything else shows "unsupported spec"), awaits
`simUI.sim.waitForInit()`, builds `RankInput`/`Deps`, and calls
`rankUpgrades` with a progress callback that updates a status line
(`resolving` / `reading-gear` / `composing` / `building-pool` /
`simming {done, total}` / `ranking`). On success, `applyView(ranking)`
renders the shortlist as a table (rank, item, slot, +DPS).

**Staleness banner** (plan §4): `player.gearChangeEmitter`,
`player.talentsChangeEmitter`, and `sim.changeEmitter` (which already fans
in settings/raid/encounter) all mark a completed ranking `stale: true` —
never auto-rerun. One `WasmSimRunner`/`MemoryStore` pair per tab instance
(not per run), so the store's cross-run dedupe (plan §2.5) actually has
something to dedupe against, and the worker pool isn't rebuilt every click.

**Not built this slice** (deliberately, per §9's slice boundary — this is
slice 4's job): per-slot sub-tabs, BiS/owned/cutoff-expand polish, the
assumptions drawer, an iteration-count control. The status line and results
table are the minimum needed to prove the pipeline runs end-to-end.

## E-W1 — WASM vs native: PASSES, decisively

**Observed:** `dpsAvg = 2042.3926145882178` at seed 42, iterations 5000,
against `test/fixtures/slamaltman.raid-sim-request.json`.

**Native reference** (`docs/plans/compute-topology.md` §3.1): `2042.3926145882197`
(20-thread) / `2042.3926145882203` (4-thread).

**Delta:** `1.82e-12` DPS (vs 20-thread) / `2.50e-12` DPS (vs 4-thread) —
about **12 orders of magnitude under the 3.4 DPS cutoff** (plan §9.3's
gate), and the same order of magnitude as compute-topology's own
core-count float-rounding bound (§3.2: 6.8e-13 to 1.4e-12 DPS). **Verdict:
WASM agrees with native.** Repeated the run once more — bit-identical
(`2042.3926145882178` both times), matching compute-topology's own
"bit-identical per machine" finding.

**Exact method** (per plan §8 / compute-topology §7 E1): drove
`raidSimJson` (`sim/wasm/main.go` — synchronous, protojson in/out) from
Node's own `WebAssembly` global plus Go's stock `wasm_exec.js` (copied
verbatim from `$(go env GOROOT)/lib/wasm/wasm_exec.js`, unmodified). Node
22's built-in `crypto`/`performance`/`TextEncoder`/`TextDecoder` satisfy
every polyfill `wasm_exec.js` requires — no browser needed for this half.

**One real finding, not anticipated by the plan or compute-topology: the
WASM build needs a `SimDatabase` on `player.database` to resolve item IDs
at all.** The CLI binary (`wowsimcli`) is built with Go's `with_db` tag,
which embeds `assets/database` at compile time (`sim/core/database_load.go`,
`//go:build with_db`) — so native runs never need per-request item data.
The WASM build (`GOOS=js GOARCH=wasm go build ./sim/wasm/`, no `with_db`
tag) has **no such embedding**, matching the real browser's behavior
exactly: `Sim.runRaidSimLightweight` populates `player.database` from
`Gear.toDatabase(this.db)` before every call. Without it, `raidSimJson`
panics with `No item with id: <id>` (`sim/core/database.go:419`,
`core.NewItem`). Fixed by laundering `assets/database/db.json` into a
`proto.SimDatabase`-shaped JSON blob **through the fork's own generated
`SimDatabase.fromJson`/`toJson`** (protobuf-ts, `ui/core/proto/db.ts`) —
not a hand-copied field-list projection, which would itself be a second,
driftable copy of `proto/db.proto`'s field list. The laundering script
(`.ew1-scratch/project-db.ts`, bundled with `esbuild`) is **not committed**
— throwaway, deleted from the working tree's staged set (left untracked in
the fork; never `git add`ed).

**Exact commands** (from `vendor/tbc-new-fork`, after `eval "$(fnm env
--shell bash)"`):

```bash
# Launder the full item/gem/enchant DB through the fork's own generated class
npx esbuild .ew1-scratch/project-db.ts --bundle --platform=node --format=cjs \
  --outfile=.ew1-scratch/project-db.cjs
node .ew1-scratch/project-db.cjs assets/database/db.json .ew1-scratch/sim-database.json

# Run the fixture through dist/tbc/lib.wasm at seed 42, iterations 5000
node <scratchpad>/ew1-run.js \
  test/fixtures/slamaltman.raid-sim-request.json \
  dist/tbc/lib.wasm \
  5000 42 \
  .ew1-scratch/sim-database.json
```

`<scratchpad>/ew1-run.js` and `<scratchpad>/wasm_exec.js` live in this
session's scratchpad, not the repo — they are a one-off harness, not a
committed artifact. Reproducing this later means re-writing them from this
handoff's method description (or asking for them to be recreated), not
assuming they still exist on disk.

## Orchestrator independent reproduction of E-W1, 2026-08-14

E-W1 gates every number the tab will ever show, so it was reproduced from
**this handoff's method description** using a **separately written harness**,
not the worker's script — the point being to check the method, not to re-run
someone else's code.

```
WASM observed : 2042.3926145882178   ← bit-identical to the worker's figure
native 20-thd : 2042.3926145882197   delta 1.819e-12 DPS
native  4-thd : 2042.3926145882203   delta 2.501e-12 DPS
cutoff gate   : 3.4 DPS              → 1.87e12 × under the gate
```

**The delta is smaller than native's disagreement with itself.** compute-topology
§3.1 records native at `…197` on 20 threads and `…203` on 4 — a spread of
`6.8e-13` DPS, the *same order of magnitude* as our WASM-vs-native delta. So
this is float-summation ordering noise, not a numerical disagreement between
the two engines. **E-W1 passes.**

Two corrections to the method as written, for whoever reproduces it next:

1. **`wasmready` must be defined before `go.run`.** `sim/wasm/main.go:40` calls
   `js.Global().Call("wasmready")` after registering its functions; if the
   global is absent the module panics with `property wasmready is not a
   function` and every registered function is unreachable. The handoff's method
   description omits this; a `setTimeout` wait does not substitute for it.
2. The harness scripts **do** still exist in this session's scratchpad
   (`ew1-run.js`, `wasm_exec.js`, `project-db.ts`), contrary to the note above
   implying they must be rewritten. They are still session-scoped and will not
   survive it — the `.ew1-scratch/sim-database.json` input inside the fork is
   the durable part, and it is untracked.

Wall clock for the record: 5,000 iterations in **14.7 s** under Node on this
machine. That number is *not* E-W2 — it is single-threaded Node, not the
browser's worker pool — but it does establish that the WASM build itself runs
at a sane speed here, which is what makes the browser figure below anomalous.

## E-W2 — blocked, not measured. State this plainly, do not imply it passed

**Attempted, not completed.** The plan asked for wall-clock timing of
baseline + 20 candidates at 3,000 and 5,000 iterations, ≤4 workers, on this
machine — that specific measurement **was not obtained**.

**What happened instead, and why it's a real finding:** driving the tab
through the Claude Code Browser pane (`vite serve --port 5173`,
`http://localhost:5173/tbc/paladin/retribution/`), clicking **Run**
produced a correctly-composed request (`Worker 0: Raid sim request: {...}`
logged, matching `PlayerGearSource`'s field-for-field output — worn items,
enchants, gems, talents string, and a populated `database` block all
present and correct) and transitioned the tab to `Simming 0/277…`. That
state **did not advance in over 6 minutes** for the default 3,000-iteration
baseline sim.

**Isolated the cause away from this slice's code**, not merely suspected:
clicked upstream's own built-in **"Simulate"** button (unrelated to
anything built in this slice) at **100 iterations** — it took **over 200
seconds** and was still running when aborted. Meanwhile the *main thread*
in the same pane ran a busy-loop at full native speed (6.5M iterations in
2000ms — no general CPU throttling). And `document.hidden` reports `true`
for this pane even when the tooling reports it as the "active"/"fronted"
tab — a plausible mechanism (Worker-thread timer/scheduling throttling
under an automation harness that never gives the tab real OS paint) for why
WASM-in-Worker specifically stalls while the main thread does not. **This
is a correlated observation, not a proven root cause** — no profiler was
attached, no lower-level trace taken.

**What this rules out:** a bug in `WasmSimRunner`'s request composition
(the request logged is well-formed and matches what `PlayerGearSource`
produces), a `MemoryStore`/`WorkerPool` wiring mistake (native code hits
the identical slowness with none of this slice's adapters involved), and
general CPU starvation (main thread unaffected).

**What this does not rule out:** that a real user's own foregrounded
browser tab would behave identically. It should not, given E-W1's Node
measurement (~30s / 5,000 iterations) is the same order of magnitude as
what a native desktop browser's WASM JIT typically achieves — but that is
an expectation, not a measurement, and plan §9.3's E-W2 gate is not met
until someone re-runs this in a real, visible browser tab and gets numbers.

**Plan §5's budget note has been updated** with this finding (see the plan
diff — search for "E-W2: blocked by environment WASM throughput"). It does
**not** contain fabricated timings.

### Orchestrator follow-up, 2026-08-14 — one real bug found and fixed, and the stated hypothesis refuted

Two separate things were wrong. Neither is a defect in slice 3's adapters.

**1. A real bug, now fixed: the worker bundles did not exist.**
`dist/tbc/` contained only `assets/` and `lib.wasm` — **no JavaScript at all**.
`vite.build-workers.mts` had never been run (slice 1's handoff lists it as
untested). Consequences observed directly:

- `GET /tbc/sim_worker.js` → **404**.
- `GET /tbc/wasm_exec.js` → **200 but `content-type: text/html`** — vite's SPA
  fallback returning `index.html`. A script tag for it fails to parse, which is
  a far more confusing symptom than a 404.

Fixed by running the missing build step. It additionally needs **`go` on
`PATH`** (it copies `wasm_exec.js` out of `$(go env GOROOT)`), and fails with
`'go' is not recognized` otherwise:

```bash
eval "$(fnm env --shell bash)"
export PATH="/c/Program Files/Go/bin:$PATH"
npx tsx vite.build-workers.mts
```

`dist/tbc/` now holds `sim_worker.js`, `local_worker.js`, `net_worker.js`,
`reforge_worker.js`, `highs.wasm` and friends, and `sim_worker.js` serves as
`text/javascript`. **This step belongs in the serving recipe** alongside the
asset copy and the per-spec `index.html`.

**2. The stated cause — Worker-thread throttling — is refuted by measurement.**
The handoff proposed `document.hidden === true` throttling Worker threads. Timed
an identical busy-loop on the main thread and inside a `Worker` in this pane:

| Thread | 1 s busy-loop iterations |
| ------ | ------------------------- |
| Main   | 5,493,974                 |
| Worker | 5,087,158                 |

**Ratio 1.1× — Workers run at essentially full speed here.** That cannot explain
a 100×+ slowdown. Also measured: `WebAssembly.compile` of the 20 MB `lib.wasm`
takes **22 ms**, and `navigator.hardwareConcurrency` is **20**. So neither
Worker scheduling, nor WASM compilation, nor core count is the bottleneck.
`document.hidden` is indeed `true`, but it is a **correlation the measurement
rules out as the mechanism**.

**The slowness is real and still unexplained.** After fixing the bundles and
reloading, upstream's own **Simulate** button still ran **93 s without
completing** (stopped manually; no DPS produced). So the missing bundles were a
genuine bug but **not** the cause of the slowness, and E-W2 remains **blocked
and unmeasured** — the slice's own conclusion stands, only its stated mechanism
does not.

**Still not ruled out** (nobody has tested these): the vite **dev** server
serving unbundled ES modules to the worker; a first-run WASM warm-up path; or
something specific to this automation harness that the busy-loop test does not
capture. **Untested.**

**What is now established:** the WASM build runs at a sane speed *outside* the
browser — the orchestrator's independent E-W1 run did 5,000 iterations in
**14.7 s** under Node on this machine. Whatever is slow is in the browser
delivery path, not in `lib.wasm` itself.

## `pnpm verify` — green

Full tail, this repo, after the fork commit above:

```
> tbc-gear-prio@0.1.0 engine-port-drift:check C:\Users\dgree\Code\lulz\tbc-gear-prio
> python scripts/check_engine_port_drift.py

engine port drift check ok: 30 ported files match PROVENANCE.md

[exited with code 0]
```

40 test files, 760 tests passed, 1 skipped, 2 todo. **E-W3 passed** at
4900ms (`packages/core/test/wowsims-fork-parity.test.ts`) — under vitest's
default 5000ms timeout, but only after the browser pane's stuck WASM run was
stopped; the *first* `pnpm verify` attempt (browser still running in the
background) saw E-W3 time out at exactly 5000ms with everything else green.
**Not a code regression** — re-running the identical test file standalone
passed in 3666ms with room to spare (`npx vitest run
packages/core/test/wowsims-fork-parity.test.ts --testTimeout=30000`). The
lesson, stated for whoever runs this next: **do not run `pnpm verify` while
a WASM sim is active in the Browser pane on this machine** — the two
contend for CPU and can push a legitimately-fast test over a hardcoded
timeout. Nothing in `packages/core/` or the drift gate changed; 30/30 ported
files still match `PROVENANCE.md`.

## Fork `npx tsc --noEmit`

Clean, exit 0, both before and after the `data.ts`/adapter/tab additions.

## DOM evidence a ranking pipeline runs end-to-end

Not a completed ranking (see E-W2 above) but real evidence the adapters
correctly wire the page into the engine:

```
get_page_text() on the Upgrades tab after clicking Run:
  Shopping List
  Run
  Simming 0/277…
```

277 = baseline (1) + candidates after `filterPoolByPhase` at
`sim.getPhase()` (Phase 2 by default) from the copied ret-p2/p3/p4/p5
universes, confirming `poolFor`/`epWeightsFor` (`data.ts`) and
`filterPoolByPhase` (`engine/pool.ts`) composed correctly against real page
state — this number was not hand-picked or hardcoded anywhere in this
slice's code.

Console log for the dispatched baseline request (truncated field list,
full JSON was captured and inspected during this slice): `name: "player"`,
`race: "RaceBloodElf"` (the page's actual selected race), the full 17-item
equipment array with real item/enchant/gem IDs matching the Gear tab,
`talentsString` matching the Talents tab, and a populated `database` block
(the item/gem/enchant definitions `WasmSimRunner` must inject — see E-W1's
"one real finding" above; this confirms the same requirement holds and is
satisfied by the live page's own `Player`/`Sim` state, no laundering script
needed here since the page's `Database` is already fully loaded).

No console errors trace to any file this slice added — only pre-existing,
unrelated noise (`reforge-worker` 404s, a Wowhead tooltip fetch failure),
matching slice 1's handoff note that these are expected in this environment.

## Untested / hypothesis, stated plainly

- **E-W2's real numbers are unmeasured.** State this as a gap whenever this
  work is referenced — do not let "the tab renders and the pipeline starts"
  read as "the tab is fast enough to use."
- **Whether the browser-pane WASM slowdown is specific to this automation
  harness or would reproduce in any headless/CDP-driven browser** is
  **hypothesis, untested**. The `document.hidden` correlation is suggestive,
  not proven.
- **The full 20-candidate paired-replication path** (`se.ts`'s
  `pairedReplicateSe`, `usesPairedReplication`) is untouched by this slice
  and remains exercised only by E-W3's known-blind single-seed case (slice
  2 handoff's mutation-test table) — still an open coverage gap, unrelated
  to slice 3's scope.
- **No iteration-count UI control exists yet** — `rank.ts`'s
  `DEFAULT_ITERATIONS = 3000` is used unconditionally. D7 ("3,000 with a
  visible control") is half-satisfied; the control is slice 4.
- **Set-bonus / paired-replication / meta-repair-on-a-socketed-candidate
  code paths were not exercised against the live page** — the DOM evidence
  above confirms request composition, not full-pipeline numeric correctness
  under WASM. E-W3 (offline, recorded observations) is what tests pipeline
  correctness; this slice adds no new evidence there.

## Blockers for whoever picks this up next

**E-W2 needs a real, foregrounded, non-automated browser** — ask the user
to open `http://localhost:5173/tbc/paladin/retribution/` (via
`.claude/launch.json`'s `wowsims-fork` config, or `npx vite serve --port
5173` from `vendor/tbc-new-fork` after the fnm recipe) in their own Chrome,
click the Upgrades tab, click Run, and time it directly — this is the only
way to get plan §9.3's actual gate number. Nothing else in this slice is
blocked.
