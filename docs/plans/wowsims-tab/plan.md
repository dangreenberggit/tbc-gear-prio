# Shopping-list tab inside the wowsims site — architectural plan

Status: **approved direction, pre-implementation** (decisions resolved
2026-08-14; see §1). Nothing here is implemented. No PLAN.md stage gate is
touched; this is a detour that reuses the engine's design and code, not a
change to the standing plan.

Date: 2026-08-14 (rev 2 — decisions D1–D7 resolved with the user; D3 flipped
the code-ownership direction and this revision reworks §2, §3, §6 and §9 to
match).

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
**"Upgrades"**, product name to be decided — sitting after "Batch". It takes
the gear currently on the site's Gear tab and the user's current sim settings,
runs our ranking engine with sims executed by the site's own in-browser WASM
simulator, and renders the result as a **shopping list** (the ranked
shortlist) plus **per-slot sub-tabs** (upgrade options for each gear slot).
Ret and feral first. Everything stays local until the user says otherwise; if
it is ever pushed, it goes to a **personal fork** of `wowsims/tbc-new` under
the user's GitHub account — never to the upstream org without an explicit,
separate decision.

The engine's design carries over intact — one deep module, thin callers,
sims produce every number (PLAN.md §3). What changes under D3 is *where the
code lives*: the tab and the engine modules it needs are **fork code**,
ported once from `packages/core`, so that the fork is self-contained and a
future upstream PR carries no external dependency.

---

## 1. Decisions — resolved 2026-08-14

| # | Question | Decision |
|---|---|---|
| D1 | Where does the fork's working copy sit on disk? | **Nested gitignored clone inside this project**, at `vendor/tbc-new-fork/` (the repo already gitignores `vendor/` for upstream inputs; the inner repo has its own `.git` and pushes to the personal fork). A small committed lockfile, `data/wowsims-fork.lock.json` (branch + commit, same pattern as `wowsims.lock.json`), records which fork commit pairs with which state here |
| D2 | Which commit does the fork branch from? | **The pin, `8aa378b3` (v0.0.101).** Every verified fact and our committed data trace to it. Rebase onto `master` is a single named PR-checklist item (§9 slice 7), not a standing chore |
| D3 | Where does the engine code the tab uses live? | **In the fork, as ordinary wowsims UI code**, ported once from `packages/core` — not consumed as an external package. Reason: fork code must be self-contained for other wowsims developers; a dependency on a package of ours that isn't publicly consumable would be a PR blocker. The relationship inverts later: **this repo can consume the fork** (the nested clone makes that natural) when the standalone app wants the browser runner. Drift between the two copies is real and accepted — §3 names the mitigations |
| D4 | Hashing (core's two `node:crypto` imports) | **Moot in the fork, unchanged here.** The ported engine needs cache keys, not digests: in-memory `Map` keys use the canonical-JSON string itself (uniqueness is the requirement; compression was only ever a storage nicety). Where a short digest is *displayed* (assumptions drawer), the browser-native `SubtleCrypto` runs once per completed run, where async costs nothing. Upstream brings no hashing library to conflict with, and `packages/core` in this repo keeps `node:crypto` untouched |
| D5 | Where does the sim request skeleton come from? | **The user's own current settings, serialized from the page.** Our sim must match theirs by construction. Any *intentional* divergence (something we believe makes ours better) is a named, written-down decision to be discussed first — never a silent difference |
| D6 | WCL import scope for v1 | **Report-URL, gear-only, as a separate slice.** Plain meaning in §6. Shelve (not redesign) if gear-only application proves impossible in practice (E-W4) |
| D7 | In-browser iteration default | **3,000 with a visible control.** Raise only after E-W2 measures the budget |

Locked by circumstance (not up for debate):

- **No PR to `wowsims/tbc-new` in this detour.** A PR is a separate future
  decision with its own checklist (§9 slice 7). Nothing is pushed anywhere
  without an explicit ask.
- **The WCL credentials in `.env` are personal dev credentials.** They never
  enter the fork's source, its build output, or any commit. (Upstream itself
  ships a hardcoded client id+secret in its public bundle for the raid WCL
  importer — their credential, their call; we do not copy the pattern with
  ours. See §6.)
- **Engine *design* does not fork.** The port copies module boundaries,
  interfaces and rules as they are. If the fork copy needs a structural change
  (a new seam, a changed `Ranking` shape), that is a design discussion here
  first, then applied to both copies.

---

## 2. The shape: the engine ported into a fourth host

[`research-core-portability.md`](research/research-core-portability.md) found
the entire 8-stage pipeline pure — only four files touch Node built-ins, all
of them adapters or entry points that the fork does not port. So the port is
a copy-and-adapt of pure TypeScript, not a rewrite.

```
vendor/tbc-new-fork/  (nested clone, own git, pushes to personal fork)
┌────────────────────────────────────────────────────────────┐
│ ui/core/components/individual_sim_ui/upgrades/             │
│  ├─ upgrades_tab.tsx        SimTab subclass, sub-tab strip │
│  ├─ engine/                 PORTED from packages/core:     │
│  │    rank, compose, pool, gems, meta-repair, set-bonus,   │
│  │    stats/se/cutoff, view, caps, enchants eligibility    │
│  ├─ adapters/                                              │
│  │    player_gear_source    reads simUI.player.getGear()   │
│  │    wasm_sim_runner       drives WorkerPool.raidSimAsync │
│  │    (Store: ported MemoryStore, string keys)             │
│  └─ data/                   universes + EP weights, copied │
│                             from this repo's data/          │
└────────────────────────────────────────────────────────────┘
       provenance: engine/PROVENANCE.md maps every ported file
       to its packages/core source file @ commit
```

### 2.1 What is ported, what is not

**Ported** (pure, intricate, independently tested here): `rank.ts`'s
orchestration and its stages, `compose`, `pool`, the gem solver
(`gems`/`candidate-gems`/`meta`/`meta-repair`), `set-bonus`/`set-value`,
`stats`/`se`/`cutoff`, `view` (`applyView`), `caps`, enchant/socket
eligibility, the seam *interfaces* (`GearSource`, `SimRunner`, `Store`) and
the pure `MemoryStore`/`RecordedSimRunner` adapters (the recorded runner is
what makes E-W3's fixture-parity gate possible fork-side).

**Not ported** (WCL-compensation or Node-bound, per the portability audit):
`spec.ts` (talent-plurality classification — the page *is* a spec),
`slots.ts` (19→17 mapping — the page's `Gear` is already sim-native),
`cli.ts`, `CliSimRunner`, `SqliteStore`, `content-hash`'s digest (D4), and
`items.ts`'s 6.8 MB static index — item metadata comes from the site's own
`Database` (`sim.db`), which the page has already loaded.

### 2.2 `PlayerGearSource`

Implements the two-method `GearSource` port. `findFights` returns one
synthetic entry ("current gear on this page"); `readGear` maps
`player.getGear()` to the engine's gear shape. Kept from normalize:
enchant/socket eligibility gating and plausibility checks — those guard the
engine's own synthesis logic, not the transport. Open verification item:
confirm every field the engine reads (gems, enchants, talent totals) is
populatable from `Player` state; what stands in for `talentPointsByTree` on a
page (likely the page's own talent totals) is **untested**.

### 2.3 Skeleton from the page (D5)

The adapter serializes current sim state to a `RaidSimRequest` protojson
**without `simOptions`** (preserving the engine's rule that the runner injects
seed/iterations after the cache key is formed — PLAN.md §7 [R6]). Upstream's
`Sim.makeRaidSimRequest` (`ui/core/sim.ts:246`) is the reference; inside the
fork we may be able to call it directly. Consequence: ticket 72's APL problem
does not exist on this surface — the page's own request is what the user's
Simulate button runs, so there is nothing to lift or repair.

### 2.4 `WasmSimRunner`

Implements the `SimRunner` port over `WorkerPool.raidSimAsync`
([research-sim-execution.md](research/research-sim-execution.md)): inject
`simOptions` (fixed seed — `SimOptions.random_seed` nonzero is honored),
submit, map `raidMetrics.dps.avg/stdev` to the engine's observation shape.
Facts this leans on: there is **no bulk RPC** — upstream's own Batch tab loops
one ordinary sim per combination client-side, so the per-candidate loop is
the native idiom; `WorkerPool` runs ≤4 WASM workers and streams progress per
request, mapping directly onto the engine's `simming {done, total}` progress
events. Inside the fork the request can be upstream's own proto object
end-to-end; the protojson boundary our CLI needed disappears with the
dependency.

### 2.5 Store, EP weights, universe data, maxPhase

- **Store:** ported `MemoryStore`, canonical-JSON string keys (D4). Cache
  lives for the page session; per-sim dedupe within and across runs is where
  the savings are. IndexedDB is a later nicety, not scoped.
- **EP weights:** our committed per-spec weights, copied into the fork's
  `data/` (they feed the prefilter and gem fill only — sims produce the
  numbers). Ret has weights **only at p2** today; §7 picks that up.
- **Universe/pool data:** the committed `data/universes/<spec>-p<N>.json`
  files (99–534 KB) copy into the fork and bundle as static JSON. They carry
  `bisTags` and `source` per row — tags and raid filter come for free.
  Copies are provenance-stamped (source repo commit) like the ported code.
- **maxPhase:** a control inside the tab, defaulting to upstream's
  `CURRENT_PHASE` — read directly from the host bundle here, no lockfile sync
  needed. The tab renders only for specs with universe data (ret, feral).

---

## 3. The drift problem D3 accepts, and its mitigations

After the port, ranking logic exists twice: `packages/core` (reference
implementation, full test suite, drives the CLI and the standalone-app plan)
and the fork's `engine/` (the shipping copy for the tab). Divergence is the
cost of a self-contained fork, accepted deliberately. Mitigations, in order
of force:

1. **E-W3, fixture parity, run fork-side:** the ported engine + ported
   `RecordedSimRunner` must reproduce the committed slamaltman fixture
   ranking — same deltas — from the same recorded observations. This is a
   test in the fork's own test setup, so it travels with the fork and fails
   loudly if a port edit changes behaviour.
2. **`engine/PROVENANCE.md`:** every ported file maps to its
   `packages/core` source file @ commit. A change to either side that matters
   updates the map or is a conscious fork.
3. **Design changes route through here first** (§1 "locked"): structure is
   decided once, then applied to both copies.
4. **The inversion is the end state:** once the fork's engine is proven, this
   repo consumes the fork (nested clone + lockfile) for the browser runner,
   and the duplicated modules here become candidates for retirement. That
   reconciliation is future work (§9 slice 7), not part of the detour.

Changes required in `packages/core` for this detour: **none.** The
browser-clean refactor from rev 1 of this plan (sha256 swap, injectable item
metadata, entry-path split) is dissolved by D3/D4 — adaptation happens in the
fork copy, where we are free to edit. The `AbortSignal` recommendation from
compute-topology §2 applies to the *fork's* `SimRunner` port (browser tabs
close mid-run; upstream exports `abortById`); adding it to this repo's port
stays a good idea but is no longer on this detour's path.

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
  copy the idiom, don't abstract it). Sub-tab 1: **Shopping List** — the
  ranked shortlist via `applyView` (BiS tags, `source` labels, owned greyed,
  cutoff behind an expand). Sub-tabs 2+: one per gear slot with that slot's
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
  iterations, `maxPhase`, engine provenance (fork commit), and sim version.

---

## 5. What runs when the user clicks Run

1. Adapter serializes current settings → skeleton; reads gear from the page.
2. The ported engine runs exactly as on the CLI: pool filtered by `maxPhase`,
   player-aware EP prefilter, gem/meta repair, baseline + candidates simmed
   through `WasmSimRunner` with a fixed seed, ranking + cutoff.
3. Per-sim cache (`MemoryStore`, string keys) dedupes identical requests
   within and across runs in the session.
4. `applyView` renders the shopping list; slot sub-tabs are views over the
   same `Ranking` — no re-sim on any view toggle (PLAN.md §2's "no view
   changes a number" applies verbatim).

Budget note (unmeasured, drives E-W2): a default run is baseline + ~80
candidates after the prefilter. At 3,000 iterations on ≤4 WASM workers the
wall-clock is unknown — could be fine, could force a tighter prefilter or a
lower default candidate count. **Measure before tuning anything.**

<!-- E-W2 results land here: wall-clock per candidate at 3,000 and 5,000
     iterations, worker count, machine. -->

---

## 6. WCL gear-only import (separate slice, D6)

**What this is for, plainly.** The tab ranks upgrades against whatever gear
is on the Gear tab. Today the user sets that gear by hand-picking items in
the gear picker. The import slice adds a shortcut: *load the gear you
actually wore in last night's raid, straight from your Warcraft Logs log* —
so the ranking starts from your real character, not from a hand-built
approximation. Everything else on the page (talents, rotation, buffs,
consumes) stays exactly as the user set it; only the 17 equipment slots
change.

**The two possible input shapes, plainly:**

- **Report URL** (chosen for v1): the user pastes a link to a specific log —
  the thing your guild posts in Discord after raid, e.g.
  `classic.warcraftlogs.com/reports/AbCd1234#fight=5` — picks their character
  from that report's roster, and their gear *as worn in that fight* is
  applied. Requires having a log link at hand. This is the input shape
  upstream's own raid-sim WCL importer already uses, so the fetch code
  (queries, auth flow) has a working in-repo reference.
- **Character-first** (deferred): the user types region/realm/name and we
  search WCL for their recent kills, pick the latest, and read gear from it.
  No link needed — but it needs more WCL API vocabulary (character lookup,
  recent-reports/rankings queries, "which fight counts" rules), which exists
  as spec in PLAN.md §5.2 but is unbuilt anywhere. Deferring it costs the
  user only "go find your log link".

**How gear-only application works:** upstream's import machinery can apply a
settings proto *filtered by category* —
`player.fromProto(eventID, proto, [SimSettingCategories.Gear])` — which sets
equipment and touches nothing else; `player.setGear(...)` is the even more
direct single-purpose call
([research-import-wcl.md](research/research-import-wcl.md) §2). No shipped
importer exposes this today, but the mechanism is real, exercised code (the
share-link importer uses the same category filter via its `?i=` parameter).
Follow-up flagged by research: read `bulk_gear_json_importer.tsx` — its name
suggests an existing gear-only application path worth copying.

**Credentials:** local dev uses the personal WCL client id/secret via a
gitignored local config; they never enter source or bundle. Browser-direct
WCL calls demonstrably work (upstream ships exactly that, with their own
embedded credential). What a *published* build would use is a PR-time
question — most likely upstream's existing credential, which is their
decision.

**Shelve condition, stated up front:** if gear-only application in practice
disturbs other settings (E-W4's proto diff says so), this slice is shelved
per the original ask — not redesigned into a full importer.

---

## 7. Data work (this repo, independent of the fork)

- **Ret phase-3 refresh.** Universes exist p2–p5 (441 entries at p3) with 15
  `bisTags` rows each — but wowsims has no ret p3 curated set (PLAN.md Stage 1
  notes), so those tags trace to p2-era membership and need a refresh against
  a current Wowhead/community **P3 ret BiS list** before the tab shows them at
  `maxPhase: 3`. Deliverable: refreshed `bisTags` in
  `data/universes/ret-p3.json` + provenance note, run through
  `sme-rank-review`.
- **Ret p3 EP weights.** Only p2 exists (`data/presets/ret/p2.ep-weights.json`,
  and it is missing `PseudoStatMainHandDps` — PLAN.md §16 item 3, fix while
  here). EP gates the prefilter and gem fill, so p3 rankings with p2 weights
  are *usable but degraded*; produce a p3 set before calling ret-at-p3 done.
- **Feral:** p2–p3 universes exist; nothing new needed for v1.
- **Adding a spec later** = universe file + EP weights + `bisTags`. The site
  supplies everything else (settings, APL, spec identity) — a strictly
  smaller per-spec cost than the standalone app's.

---

## 8. Experiments — run before trusting anything on screen

| # | Question | Method | Gate on |
|---|---|---|---|
| E-W1 | Does WASM agree with native? | Build `lib.wasm` at the pin (`make wasm`), run `test/fixtures/slamaltman.raid-sim-request.json` seed 42 through it, diff against native `2042.3926…` (compute-topology §7 E1 — unchanged, still unrun) | Slice 3 results shown to anyone |
| E-W2 | Wall-clock per candidate in-browser | Time baseline + 20 candidates at 3,000 and 5,000 iterations on this machine, ≤4 workers | D7's default; candidate-count budget |
| E-W3 | Did the port preserve behaviour? | **This-repo** test (see note below): ported engine + ported `RecordedSimRunner` reproduces the committed slamaltman fixture ranking (same deltas) from the same recorded observations | Slice 2 merge; re-run on every fork engine edit |
| E-W4 | Does gear-only import disturb settings? | Apply a category-filtered import on a configured page; diff the full settings proto before/after (gear fields excepted) | §6 slice ships vs shelves |

### E-W3 runs here, not in the fork — decided 2026-08-14

Rev 1 and 2 of this plan said E-W3 was "a test in the fork's own test setup, so
it travels with the fork". **The fork has no such setup.** Checked at the pin:
no vitest/jest/mocha in `package.json`, **zero** `.test.ts`/`.spec.ts` files
anywhere under `ui/`, and the only `test`-ish script is `test:locales`, an Ajv
schema check. Go has tests; the TypeScript UI does not.

Decision (user, 2026-08-14): **the parity test lives in this repo**, which
already runs vitest. The fork stays dependency-free — we do not change its test
approach even though we use our own tests for development. That keeps the
eventual upstream PR free of a test-infrastructure change upstream never asked
for.

**The cost, stated plainly:** the check no longer travels with the fork, so a
future fork-only edit to `engine/` could break parity with nothing failing
inside the fork. §3's mitigation ladder leaned on E-W3 travelling; it no longer
does.

**The compensating gate.** Because silent breakage was the whole point of E-W3,
slice 2 also adds a `check_*` script wired into `pnpm verify`, in the same idiom
as `check_curated_set_phase.py` and friends: it records a content hash per
ported file in `engine/PROVENANCE.md` and fails when a ported file's content
changes without its recorded hash changing. That does not prove behaviour — only
the parity test does — but it converts "someone edited the fork's engine and we
never noticed" from silent into a red `pnpm verify` the next time this repo is
built. **Untested** until slice 2 implements it.

---

## 9. Delivery slices, in order

Slices, not PLAN.md Stages — this detour does not renumber the main plan.
Fork slices are branches in the nested clone; anything touching this repo is
a normal feature branch gated by `pnpm verify`.

1. **Fork scaffold**: personal fork created (user action: fork on GitHub),
   nested clone at `vendor/tbc-new-fork/` checked out to the pin on branch
   `feat/upgrades-tab`; `data/wowsims-fork.lock.json` committed here; empty
   Upgrades tab registered with sub-tab strip; local build runs
   (`WATCH=1 make devmode`; full build needs Go ≥1.25 + protoc + Node ≥22).
   *Done when:* the site builds and serves locally with the new tab visible
   after Batch, and the lockfile records the fork branch + commit.
2. **Engine port**: copy the §2.1 port surface into
   `upgrades/engine/`, adapt (Database-backed item metadata, string cache
   keys, drop WCL-compensation), write `PROVENANCE.md`, port the recorded
   runner + fixture, stand up E-W3 in the fork's test setup.
   *Done when:* E-W3 passes fork-side — the ported engine reproduces the
   slamaltman fixture ranking from recorded observations.
3. **Adapters + first ranking**: `PlayerGearSource`, skeleton serialization,
   `WasmSimRunner`; ret ranking renders end-to-end in the tab. E-W1 and E-W2
   run here.
   *Done when:* a ret ranking completes in the tab from the page's own gear
   and settings, E-W1 is recorded with deltas inside the 3.4 DPS cutoff, and
   E-W2's timings are written into §5's budget note.
4. **UI completion**: shopping-list polish (tags, sources, owned, cutoff),
   per-slot sub-tabs, staleness, progress, assumptions drawer.
   *Done when:* every view behaviour listed in §4 works without triggering a
   sim, and a gear change marks results stale.
5. **WCL gear-only importer** (independent of 3–4 once 1 exists; E-W4
   decides ship-or-shelve).
   *Done when:* E-W4's proto diff is empty outside gear fields, or the slice
   is shelved with the diff recorded.
6. **Data** (this repo): ret p3 `bisTags` refresh + p3 EP weights (+ the
   `PseudoStatMainHandDps` fix); `sme-rank-review` on the refreshed ranking.
   *Done when:* refreshed p3 tags carry a provenance note, EP files exist for
   p3, and the `sme-rank-review` verdict is filed.
7. **Later, explicitly out of scope now**: more specs; IndexedDB cache;
   character-first WCL discovery (§6); the **reconciliation** — this repo
   consuming the fork's engine for the standalone app's browser runner, and
   retiring duplicated modules here; porting the tab into the downloadable
   local sim (their HTTP-worker distribution shares the `WorkerInterface`, so
   the tab *should* carry over unchanged — **hypothesis, untested**); and the
   **PR checklist** — rebase onto `master`, re-verify every pin-scoped fact,
   iteration caps to upstream's web limits, credential story, upstream code
   style + review.

---

## 10. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| WASM ≠ native numerically | Every number on the tab inherits it | E-W1 before anything ships; it was already the gate on compute-topology's plan and has still never been run |
| **Port drift** — fork engine and `packages/core` diverge silently | Two tools, two answers, no explanation | §3's ladder: E-W3 fixture parity fork-side, `PROVENANCE.md`, design changes routed here first, reconciliation as the end state |
| Browser run too slow at default settings | Tab feels broken; users bail mid-run | E-W2 sizes the budget; prefilter and iteration control are the knobs; skeleton-first rendering keeps waits legible |
| Upstream drift (112 commits and counting) | Fork bit-rots; rebase cost grows | Deliberate: stay at the pin while local (D2); rebase is a single named PR-checklist item |
| Two `db.json` vintages after a future rebase | Universe metadata subtly disagrees with the page's `Database` | Non-issue at the pin; named re-check on the PR checklist |
| Ret p3 tags/EP stale or missing | Shopping list at p3 shows 2022-era BiS pins and mis-gemmed candidates | Slice 6 before advertising p3; tags degrade to empty rather than block (PLAN.md §4.1 behaviour) |
| Gear-only import quietly touches settings | Violates the ask's core constraint | E-W4 is the ship/shelve gate, decided by proto diff, not by eyeballing the UI |
| tsx-vanilla unfamiliarity | React idioms leak in; upstream would reject | Copy `DetailedResults`/`BulkTab` patterns; keep tab code boring |
| Nested-repo footguns (outer git seeing the inner tree) | Accidental adds, confusing status | `vendor/` is already gitignored; verify the ignore covers the clone before first commit inside it |

---

## 11. Relationship to the standing plan

- PLAN.md Stages are untouched. Stage 3 (our own web shell) remains a
  separate deliverable; this tab neither replaces it nor depends on it.
- Carry-forward ticket 72 (user-supplied wowsims setup): D5 implements its
  central idea — the user's real settings as the skeleton — on a surface
  where the APL lift problem doesn't arise. The ticket stays open for the
  CLI/paste-box scope; slice 3's serialization work is direct prior art and
  should be noted on the ticket when it exists.
- `docs/plans/compute-topology.md`: this plan realizes its "browser
  SimRunner" row inside the fork instead of the standalone app. Its E1
  experiment is E-W1 here, unchanged. Its `simCacheKey`/`AbortSignal` items
  stay open for `packages/core` but are off this detour's path (§3).
