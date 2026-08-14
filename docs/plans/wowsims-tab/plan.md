# Shopping-list tab inside the wowsims site — architectural plan

Status: **proposal, for review**. Nothing here is implemented. No PLAN.md stage
gate is touched; this is a detour that reuses the engine, not a change to it.

Date: 2026-08-14.

Upstream pin throughout: `wowsims/tbc-new` @
`8aa378b3671a0923fd11fb34b4b3753e53f20c9b` (tag `v0.0.101`,
`data/wowsims.lock.json`). Upstream's default branch is `master`; its tip on
2026-08-14 was `d7d89da2` — **112 commits ahead of the pin** (~3 weeks). Any
upstream file cited below was read at the pin unless it says otherwise.

Evidence base: four research reports under [`research/`](research/), captured
2026-08-14 against the pinned commit —
[`research-ui-architecture.md`](research/research-ui-architecture.md),
[`research-sim-execution.md`](research/research-sim-execution.md),
[`research-import-wcl.md`](research/research-import-wcl.md),
[`research-core-portability.md`](research/research-core-portability.md) —
plus the earlier local audits
[`../compute-topology.md`](../compute-topology.md) and
[`../wowsims-reuse/take-list.md`](../wowsims-reuse/take-list.md).

---

## 0. What is being built, in one paragraph

A new top-level tab in the wowsims TBC individual sim UI — working name
**"Upgrades"**, product name to be decided — sitting between "Batch" and the
header's Import/Export controls. It takes the gear currently on the site's Gear
tab and the user's current sim settings, runs our `rankUpgrades` engine with
sims executed by the site's own in-browser WASM simulator, and renders the
result as a **shopping list** (the ranked shortlist) plus **per-slot sub-tabs**
(upgrade options for each gear slot). Ret and feral first. Everything stays
local until the user says otherwise; if it is ever pushed, it goes to a
**personal fork** of `wowsims/tbc-new` under the user's GitHub account — never
to the upstream org without an explicit, separate decision.

Why this is cheap rather than a rewrite: the engine was built as one deep
module behind three seams precisely so callers stay thin (PLAN.md §3). The
wowsims site becomes the third caller after the CLI and the planned web shell —
it supplies different adapters, not different logic.

---

## 1. Decisions

### 1.1 Recommended (need your sign-off before implementation)

| # | Question | Recommendation | Why |
|---|---|---|---|
| D1 | Where does the host code live? | A personal fork of `wowsims/tbc-new` (e.g. `dangreenberggit/tbc-new`), branch `feat/upgrades-tab`. Local-only until you say push | The tab is upstream-shaped code (tsx-vanilla, their `SimTab` contract). It cannot live in this repo without vendoring their entire UI |
| D2 | Which commit does the fork branch from? | **The pin, `8aa378b3` (v0.0.101)** — not `master` | Every verified fact — file:line references, `db.json` content our universes were generated from, the 2042.85 parity fixture — is at the pin. Master is 112 commits ahead and moving ~5/day; chasing it buys nothing while the work is local. Rebase is a named step in the PR checklist (§9), not a standing chore |
| D3 | How does the fork get our engine? | `packages/core` as a local pnpm `file:` dependency from the fork's `ui/` package | One source of truth. Copying files into the fork guarantees drift; a git submodule adds ceremony without solving the build problem. Cost: core's entry path must become browser-clean first (§3) |
| D4 | `sha256` replacement (core imports `node:crypto` in two files) | Bundle a small pure-TS sync sha256; do **not** switch to `SubtleCrypto` | `SubtleCrypto.digest` is async, and `docs/plans/compute-topology.md` §2 already flagged that ripple as "the single most annoying item" — every `simCacheKey`/`contentHash` caller changes signature. A ~1 KB sync implementation keeps both call sites untouched |
| D5 | Where does the sim request skeleton come from? | **The user's own current settings**, serialized from the page — not our committed per-spec skeleton | This is carry-forward ticket 72's mechanism (`Deps.raidSimSkeleton` is already an injected value, `rank.ts` never reads disk). It also dissolves ticket 72's motivating problem for this surface: baseline and candidates are simmed with the settings the user is looking at, so our baseline should match their own Simulate button (parity experiment E-W1 still required before claiming it) |
| D6 | WCL import scope for v1 | A **separate slice**, gear-only, report-URL input, using the category-filtered import API. Shelve without redesign if gear-only proves impossible | Gear-only is achievable with existing upstream API — `Player.fromProto(eventID, proto, [SimSettingCategories.Gear])` or `player.setGear(...)` ([research-import-wcl.md](research/research-import-wcl.md) §2). Report-URL first because that is upstream's proven input shape; character-first discovery is our WCL vocabulary and can come later |
| D7 | In-browser iteration default | 3,000 with a visible control, not 5,000 | Browser wall-clock per candidate is unmeasured (E-W2). 3,000 is the CLI floor the Stage 0 fixture used; raise the default only after E-W2 says the budget allows it |

### 1.2 Locked by circumstance (not up for debate)

- **No PR to `wowsims/tbc-new` in this detour.** A PR is a separate future
  decision with its own checklist (§9). Nothing is pushed anywhere without an
  explicit ask.
- **The WCL credentials in `.env` are personal dev credentials.** They never
  enter the fork's source, its build output, or any commit. (Upstream itself
  ships a hardcoded client id+secret in the public browser bundle for its raid
  WCL importer — that is their credential and their call; we do not copy the
  pattern with ours. See §6.)
- **Engine logic does not fork.** Anything the tab needs from the engine is
  either already exported or becomes a change in *this* repo, on its own
  branch, gated by `pnpm verify` like any other change.

---

## 2. The shape: one engine, a fourth caller, four adapters

Everything below hangs off the facts that the engine's public surface is
`rankUpgrades(input, deps, onProgress)` + `applyView`, and that
[`research-core-portability.md`](research/research-core-portability.md) found
exactly four Node-bound files in `packages/core/src` — two of them only for
`createHash` — with the entire 8-stage pipeline pure.

```
wowsims site (fork)                              tbc-gear-prio (this repo)
┌──────────────────────────────┐                 ┌──────────────────────────┐
│ UpgradesTab (SimTab subclass)│   pnpm file:    │ packages/core            │
│  ├─ run button, progress     │ ──dependency──▶ │  rankUpgrades, applyView │
│  ├─ shopping-list sub-tab    │                 │  (unchanged logic)       │
│  └─ per-slot sub-tabs        │                 └──────────────────────────┘
│                              │
│ Deps assembled page-side:    │
│  gear:  PlayerGearSource ────┼── reads simUI.player.getGear()
│  sim:   WasmSimRunner ───────┼── drives WorkerPool.raidSimAsync (lib.wasm)
│  store: MemoryStore          │   (already pure, already in core)
│  raidSimSkeleton ────────────┼── serialized from the page's current settings
│  epWeights / universe data ──┼── bundled JSON from this repo's data/
└──────────────────────────────┘
```

What this deliberately is **not**: a port of the eight stages into the wowsims
codebase, a fourth seam, or a second ranking implementation. The tab is a
caller, like `cli.ts` is a caller.

### 2.1 `PlayerGearSource`

Implements the existing two-method `GearSource` port
(`packages/core/src/seams/gear-source.ts`). `findFights` returns one synthetic
entry ("current gear on this page"); `readGear` maps `player.getGear()` to our
`LoggedGear` shape.

Most of what makes WCL gear-reading hard disappears here, because the source is
the sim's own data model:

- **No spec classification.** Each wowsims page *is* a spec. The
  talent-plurality classifier (`spec.ts`) is WCL-compensation and is not
  invoked.
- **No 19→17 slot mapping.** The site's `Gear` object is already in sim slot
  vocabulary. `slots.ts` is WCL-compensation and is not invoked.
- **Kept:** item-metadata gating for enchant/socket eligibility and the
  plausibility checks — those guard the engine's own synthesis logic, not the
  transport ([research-core-portability.md](research/research-core-portability.md) §4).

Open verification item: confirm `LoggedGear`'s required fields (gems, enchants,
`talentPointsByTree`) can all be populated from `Player` state, and decide what
`talentPointsByTree` carries when the source is a page rather than a log
(likely the page's own talent string totals; **untested**).

### 2.2 Skeleton from the page (D5)

The engine takes `Deps.raidSimSkeleton` as a value — carry-forward ticket 72
already establishes that an externally supplied skeleton "flows through
untouched" and is hashed by value, so cache behaviour is correct for free
(ticket 72, "Architectural constraint: no fourth seam").

The adapter builds that value from the site: serialize the current sim state to
a `RaidSimRequest` protojson **without `simOptions`** (matching the engine's
rule that the runner injects those after the cache key is computed — PLAN.md
§7 [R6]). Upstream's `Sim.makeRaidSimRequest` (`ui/core/sim.ts:246`) is the
reference for what "current sim state" means; whether we can call it directly
or need a trimmed variant is an implementation detail to settle in the spike.

Consequence worth stating: **the APL problem from ticket 72 does not exist on
this surface.** The page's own request is what the user's Simulate button runs,
so there is no `TypeSimple`-without-APL lift to repair.

### 2.3 `WasmSimRunner`

Implements the `SimRunner` port (`version()`, `run(req, {seed, iterations})`).
Internally: convert the protojson record to upstream's `RaidSimRequest` proto
(`fromJson`), inject `simOptions` (fixed seed — supported, `SimOptions.
random_seed` nonzero is honored, [research-sim-execution.md](research/research-sim-execution.md) §4),
submit via `WorkerPool.raidSimAsync(request, onProgress)`, and map the result's
`raidMetrics.dps.avg/stdev` to `SimObservation` the same way `CliSimRunner`
parses the CLI output.

Key facts this leans on (all from
[research-sim-execution.md](research/research-sim-execution.md)):

- There is **no bulk RPC**. Upstream's own Batch tab loops one ordinary sim per
  combination client-side. Our per-candidate loop is therefore exactly the
  native idiom of this codebase, not an abuse of it.
- `WorkerPool` load-balances across up to
  `min(4, floor(hardwareConcurrency / 2))` WASM workers; progress streams per
  request. Our `Progress.simming {done, total}` maps onto that directly.
- `version()` is a build constant in WASM — no per-run cost (the CLI adapter's
  per-run `version()` spawn, flagged in compute-topology §2, is simply not
  reproduced).

Boundary rule: **their protos stay on their side of the adapter.** Core's
`RaidSimRequest` is deliberately an opaque `Readonly<Record<string, unknown>>`;
the adapter converts at the edge. Do not try to unify our protobuf-es
generated types with theirs — structural compatibility at the JSON boundary is
the contract, same as with the CLI.

### 2.4 Store, EP weights, universe data

- **Store:** `MemoryStore` (already pure, already used by every test). Cache
  lives for the page session; per-sim dedupe within a run still works, which is
  where the real savings are. IndexedDB is a later nicety, not scoped here.
- **EP weights:** our committed per-spec weights ship with the tab (they feed
  the prefilter and gem fill only — sims produce the numbers). Wiring
  `player.getEpWeights()` in as an option is future work; note ret has EP
  weights **only at p2** today, which §7 picks up.
- **Universe/pool data:** the committed `data/universes/<spec>-p<N>.json`
  files (99–534 KB each) bundle into the tab as static JSON. They carry
  `bisTags` and `source` per row, so the shopping list's tags and raid filter
  come for free.
- **Item metadata:** core currently static-imports `data/items/index.json`
  (**6.8 MB**) in `items.ts`. Do not ship that to a page that already loaded
  upstream's `db.json`. §3 makes the metadata injectable; the browser adapter
  derives it from the site's own `Database` at runtime. (Alignment caveat: our
  universes were generated from the pinned `db.json`; while the fork sits on
  the same pin this is exact. After any future rebase, re-check.)

### 2.5 maxPhase and spec gating

`maxPhase` is a control inside the tab, defaulting to upstream's
`CURRENT_PHASE` — which, uniquely on this surface, is available directly from
the host bundle rather than via our lockfile sync. The tab renders only for
specs with universe data (ret, feral); other specs get the standard "not yet
implemented" affordance the site already uses for unfinished specs.

---

## 3. Changes required in this repo (`packages/core`)

All on a normal feature branch here, gated by `pnpm verify`. Three items, in
dependency order:

1. **Runtime-agnostic sha256 (D4).** Replace the two `node:crypto` imports
   (`content-hash.ts`, `seams/sim-runner.ts`) with a bundled sync
   implementation. No signature changes.
2. **Injectable item metadata.** `items.ts`'s module-level 6.8 MB JSON import
   becomes a constructor/parameter-supplied provider; the CLI keeps loading the
   committed index, the browser adapter supplies a `Database`-backed one.
   This is the largest refactor in the plan and its blast radius (who reads
   `items.ts` state, and when) is **unmeasured** — first task of the slice is
   to measure it.
3. **Browser-clean entry path.** `index.ts` must not transitively pull
   `cli-sim-runner.ts`, `store.ts`'s `SqliteStore`, or `cli.ts`. Likely a
   subpath-export split (`.` pure, `./node` for Node adapters). Enforced by a
   lint rule or a build check, not by convention — same spirit as the existing
   purity lint (PLAN.md §4).

Explicitly **not** changed: the eight stages, the seams' shapes, `applyView`,
the statistics, the hash field list. If the tab appears to need a change
there, stop and bring it back for design review.

Nice-to-have alongside (small, independent): add `AbortSignal` to the
`SimRunner` port while we are near it — browser tabs close mid-run, upstream
exports `abortById` for exactly this, and compute-topology §2 already
recommended adding it before any browser adapter exists. Breaking port change,
so it rides with item 3's branch, not after.

---

## 4. The tab UI

Placement and mechanics, per
[research-ui-architecture.md](research/research-ui-architecture.md):

- **Registration:** a `SimTab` subclass; instantiate it in
  `IndividualSimUI`'s constructor immediately after
  `this.bt = this.addBulkTab();`. Tab order is call order; there is no
  registry. Import/Export are header dropdowns, so "between Batch and Import"
  in practice means "last content tab".
- **Sub-tabs:** the Bootstrap `nav-tabs`/`tab-pane` strip, hand-rolled the way
  `DetailedResults` does it (no reusable sub-tab component exists upstream —
  copy the idiom, not abstract it). Sub-tab 1: **Shopping List** — the ranked
  shortlist via `applyView` (BiS tags, `source` labels, owned greyed, cutoff
  behind an expand). Sub-tabs 2+: one per gear slot with that slot's
  candidates and deltas.
- **Idiom:** tsx-vanilla (`element`/`fragment` JSX factories to real DOM),
  class components, `TypedEvent` subscriptions. No React habits.
- **Run model:** an explicit **Run** button; results render skeleton-first and
  fill as sims finish (same legibility rules as PLAN.md §12: no mid-run
  re-sorting, one re-sort at completion). On any gear/settings change, mark
  existing results **stale** with a visible banner — never auto-rerun a
  multi-second job on a checkbox. `gearChangeEmitter` is confirmed
  ([research-ui-architecture.md](research/research-ui-architecture.md) §3);
  which emitter covers the rest of the settings is an implementation lookup.
- **Numbers honesty:** the baseline row is labelled as the user's own current
  setup simmed with their own settings. The assumptions drawer carries seed,
  iterations, `maxPhase`, engine version, and sim version, same as the CLI
  report.

---

## 5. What runs when the user clicks Run

1. Adapter serializes current settings → skeleton; reads gear → `LoggedGear`.
2. `rankUpgrades` runs exactly as on the CLI: pool filtered by `maxPhase`,
   player-aware EP prefilter, gem/meta repair, baseline + candidates simmed
   through `WasmSimRunner` with a fixed seed, ranking + cutoff.
3. Per-sim cache (`MemoryStore`) dedupes identical requests within and across
   runs in the session.
4. `applyView` renders the shopping list; slot sub-tabs are views over the same
   `Ranking` — no re-sim on any view toggle (PLAN.md §2's "no view changes a
   number" applies verbatim).

Budget note (unmeasured, drives E-W2): a default run is baseline + ~80
candidates after the prefilter. At 3,000 iterations on ≤4 WASM workers the
wall-clock is unknown — could be fine, could force a tighter prefilter or a
lower default candidate count. **Measure before tuning anything.**

---

## 6. WCL gear-only import (separate slice, D6)

Goal: a new entry in the site's Import menu — "Warcraft Logs (gear only)" —
that takes a report URL + fight, fetches the player's logged gear, and applies
**only** gear, leaving talents/rotation/buffs/consumes untouched.

- **Apply path (proven upstream):** the category-filtered import API —
  `player.fromProto(eventID, proto, [SimSettingCategories.Gear])` — or
  `player.setGear(...)` directly
  ([research-import-wcl.md](research/research-import-wcl.md) §2). No engine
  code involved at all; this slice is pure fork-side UI + WCL fetch.
- **Fetch path:** upstream's raid-sim WCL importer is the working reference —
  browser-direct GraphQL to `classic.warcraftlogs.com/api/v2/client` — but its
  spec classifier throws on Anniversary data
  (`take-list.md` §1), so the gear-extraction query shapes are reusable and the
  classification is not needed (gear-only import doesn't classify anything).
- **Credentials:** local dev uses the personal WCL client id/secret via a
  gitignored local config; they never enter source or bundle. This works
  because WCL's classic API demonstrably accepts browser-origin
  client-credential calls (upstream ships exactly that). What a *published*
  build would use is a PR-time question (§9) — most likely upstream's own
  existing credential, which is their decision to make.
- **Shelve condition, stated up front:** if applying gear-only through the
  category filter turns out to disturb other settings in practice (E-W4), this
  slice is shelved per the original ask — not redesigned into a full importer.

---

## 7. Data work (this repo, independent of the fork)

- **Ret phase-3 refresh.** Universes exist p2–p5 (441 entries at p3) with 15
  `bisTags` rows each — but wowsims has no ret p3 curated set (PLAN.md Stage 1
  notes), so those tags trace to p2-era membership and need a refresh against
  a current Wowhead/community **P3 ret BiS list** before the tab shows them at
  `maxPhase: 3`. This is the "ret bis list for phase 3" item from the ask.
  Deliverable: refreshed `bisTags` in `data/universes/ret-p3.json` +
  provenance note, run through `sme-rank-review`.
- **Ret p3 EP weights.** Only p2 exists (`data/presets/ret/p2.ep-weights.json`,
  and it is missing `PseudoStatMainHandDps` — PLAN.md §16 item 3, fix while
  here). EP gates the prefilter and gem fill, so p3 rankings with p2 weights
  are *usable but degraded*; a p3 set (from upstream presets or a stat-weights
  run) is wanted before calling ret-at-p3 done.
- **Feral:** p2–p3 universes exist; nothing new needed for v1.
- **Adding a spec later** = universe file + EP weights + `bisTags`. The site
  supplies everything else (settings, APL, spec identity), which is a strictly
  smaller per-spec cost than the standalone app's (no preset skeleton needed).

---

## 8. Experiments — run before trusting anything on screen

| # | Question | Method | Gate on |
|---|---|---|---|
| E-W1 | Does WASM agree with native? | Build `lib.wasm` at the pin (`make wasm`), run `test/fixtures/slamaltman.raid-sim-request.json` seed 42 through it, diff against native `2042.3926…` (compute-topology §7 E1 — unchanged, still unrun) | Slice 3 results shown to anyone |
| E-W2 | Wall-clock per candidate in-browser | Time baseline + 20 candidates at 3,000 and 5,000 iterations on this machine, ≤4 workers | D7's default; candidate-count budget |
| E-W3 | Is the core entry path actually browser-clean? | Build check in this repo: bundle `packages/core`'s pure entry with a browser target and fail on any `node:` resolution | §3 slice merge |
| E-W4 | Does gear-only import disturb settings? | Apply a category-filtered import on a configured page; diff full `IndividualSimSettings` proto before/after (gear fields excepted) | §6 slice ships vs shelves |

---

## 9. Delivery slices, in order

Slices, not PLAN.md Stages — this detour does not renumber the main plan.
Each slice is a normal feature branch (here) or fork branch (there); engine
slices gate on `pnpm verify` as always.

1. **Core browser-clean** (this repo): sha256 swap, injectable item metadata,
   entry-path split, `AbortSignal` on the `SimRunner` port, E-W3 build check.
   *Done when:* `pnpm verify` green, E-W3 build check green in CI, and the CLI
   produces the same ranking as before the refactor on the slamaltman fixture.
2. **Fork scaffold**: personal fork at the pin, `feat/upgrades-tab`, empty
   Upgrades tab registered with sub-tab strip, `file:` dependency wired,
   local build runs (`WATCH=1 make devmode`; full build needs Go ≥1.25 +
   protoc + Node ≥22).
   *Done when:* the site builds and serves locally with the new tab visible
   after Batch, and a module from `packages/core` is imported and executes in
   the page.
3. **Adapters + first ranking**: `PlayerGearSource`, skeleton serialization,
   `WasmSimRunner`, `Deps` assembly; ret ranking renders end-to-end. E-W1 and
   E-W2 run here.
   *Done when:* a ret ranking completes in the tab from the page's own gear
   and settings, E-W1 is recorded with the deltas inside the 3.4 DPS cutoff,
   and E-W2's timings are written into this document's §5 budget note.
4. **UI completion**: shopping-list polish (tags, sources, owned, cutoff),
   per-slot sub-tabs, staleness, progress, assumptions drawer.
   *Done when:* every `ViewOptions` behaviour listed in §4 works without
   triggering a sim, and a gear change marks results stale.
5. **WCL gear-only importer** (independent of 3–4 once 2 exists; E-W4 decides
   ship-or-shelve).
   *Done when:* E-W4's proto diff is empty outside gear fields, or the slice
   is shelved with the diff recorded.
6. **Data**: ret p3 `bisTags` refresh + p3 EP weights (+ the
   `PseudoStatMainHandDps` fix); `sme-rank-review` on the refreshed ranking.
   *Done when:* refreshed p3 tags carry a provenance note, EP files exist for
   p3, and the `sme-rank-review` verdict is filed.
7. **Later, explicitly out of scope now**: more specs; IndexedDB cache;
   character-first WCL discovery; porting the tab into the downloadable local
   sim (their HTTP-worker distribution shares the `WorkerInterface`, so the
   tab *should* carry over unchanged — **hypothesis, untested**); and the
   **PR checklist** — rebase onto `master`, re-verify every pin-scoped fact,
   iteration caps to upstream's web limits, credential story, upstream code
   style + review.

---

## 10. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| WASM ≠ native numerically | Every number on the tab inherits it | E-W1 before anything ships; it was already the gate on compute-topology's plan and has still never been run |
| Browser run too slow at default settings | Tab feels broken; users bail mid-run | E-W2 sizes the budget; prefilter and iteration control are the knobs; skeleton-first rendering keeps waits legible |
| Upstream drift (112 commits and counting) | Fork bit-rots; rebase cost grows | Deliberate: stay at the pin while local (D2); rebase is a single named PR-checklist item, not continuous |
| `items.ts` refactor ripples wider than expected | Slice 1 balloons | Measure the import graph first; the fallback is bundling a *subset* index (pool + wearable items) instead of injecting, at a bundle-size cost |
| Two `db.json` vintages after a future rebase | Universe metadata subtly disagrees with the page's Database | Non-issue at the pin; named re-check on the PR checklist |
| Ret p3 tags/EP stale or missing | Shopping list at p3 shows 2022-era BiS pins and mis-gemmed candidates | Slice 6 before advertising p3; tags degrade to empty rather than block (PLAN.md §4.1 behaviour) |
| Gear-only import quietly touches settings | Violates the ask's core constraint | E-W4 is the ship/shelve gate, decided by proto diff, not by eyeballing the UI |
| tsx-vanilla unfamiliarity | React idioms leak in; upstream would reject | Copy `DetailedResults`/`BulkTab` patterns; keep tab code boring |

---

## 11. Relationship to the standing plan

- PLAN.md Stages are untouched. Stage 3 (our own web shell) remains a separate
  deliverable; this tab neither replaces it nor depends on it.
- Carry-forward ticket 72 (user-supplied wowsims setup): D5 implements its
  central mechanism (externally supplied skeleton) on a surface where the APL
  lift problem doesn't arise. The ticket itself stays open — its CLI/paste-box
  scope is not delivered by this detour — but slice 3's serialization work is
  direct prior art for it and should be noted on the ticket when it exists.
- `docs/plans/compute-topology.md`: this plan executes its migration rows 2–4
  (AbortSignal, runtime-agnostic hashing, a browser SimRunner) in the fork
  context instead of the standalone-app context. Its E1 experiment is E-W1
  here, unchanged.
