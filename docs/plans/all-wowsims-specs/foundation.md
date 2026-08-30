# Foundation: adding all wowsims-supported specs (incl. non-DPS) to the Upgrades tab

**Status:** investigation complete, pre-planning. No production code changed by this document.
**Purpose:** lay the factual foundation for planning the work to rank **every**
wowsims TBC spec on the Upgrades tab — healers and tanks included, not only DPS.
**Method:** five parallel read-only investigations against `vendor/tbc-new-fork/`
(present in this worktree), `packages/core/src/`, the fork's `upgrades/` tab copy,
`data/`, and the repo's own records. Every causal claim below either names a
command a reader can re-run, or is labelled **hypothesis** / **untested** in the
same sentence. This topic has no prior record at all (see §6), so treat unlabelled
prose as a claim backed by the adjacent citation and re-check it if it matters.

---

## 1. The headline

**Adding a DPS spec is table rows. Adding a healer or tank is a seam-and-objective
refactor.**

The engine ranks single-item gear swaps by a **simmed DPS delta**. The wowsims
simulator already computes the non-DPS objectives (HPS for healers, TMI/DTPS for
tanks) and returns them _right next to_ DPS in the same result message — but the
engine's sim seam, its parser, and every downstream type are hardwired to a single
scalar literally named `dps`. Nothing in hand-written engine code ever reads `hps`
or `tmi`. So the sim can already measure what a healer or tank cares about; the
engine is simply deaf to it.

Everything else — presets, universes, EP weights, cap profiles, meta gems, spec
detection — is either a mechanical table row (the proven groove the nine-DPS-spec
pass already cut) or a bounded data-authoring task. The one genuinely new
_capability_ is teaching the engine to rank by an objective other than DPS.

---

## 2. Scope: what "all specs" means

The fork's `Spec` proto enum defines **17 specs** (`vendor/tbc-new-fork/proto/common.proto:42-70`),
corroborated by three independent registries that list the identical 17:
`sim/register_all.go`, `ui/core/player_specs/index.ts:18-46`, and one
`ui/<class>/<spec>/index.ts` directory per spec. Every one is fully registered in
both the Go backend and the UI — none stubbed.

The engine supports **11 today**, all DPS. The gap is **6 specs**:

| To add             | Role   | wowsims objective     | Proto spec                 |
| ------------------ | ------ | --------------------- | -------------------------- |
| Restoration Druid  | Healer | HPS                   | `SpecRestorationDruid=4`   |
| Holy Paladin       | Healer | HPS                   | `SpecHolyPaladin=7`        |
| Restoration Shaman | Healer | HPS                   | `SpecRestorationShaman=14` |
| Feral Bear Druid   | Tank   | TMI / DTPS / survival | `SpecFeralBearDruid=3`     |
| Protection Paladin | Tank   | TMI / DTPS / survival | `SpecProtectionPaladin=8`  |
| Protection Warrior | Tank   | TMI / DTPS / survival | `SpecProtectionWarrior=17` |

Two facts that shape the plan:

- **The tank specs are distinct proto specs, not modes of the DPS ones.** Bear is
  `SpecFeralBearDruid=3`, separate from `SpecFeralCatDruid=2`; prot warrior is
  `SpecProtectionWarrior=17`, separate from `SpecDpsWarrior=16`. The engine's
  `feral` and `warrior` entries are the _DPS_ versions. Role classification is a
  static flag per spec — `isHealingSpec` / `isTankSpec` in
  `vendor/tbc-new-fork/ui/core/player_specs/*.ts` (e.g. `druid.ts:84,120`,
  `paladin.ts:13-14`, `warrior.ts:48`).
- **There is no healer or tank priest in TBC wowsims.** The fork has a single
  `SpecPriest=10` whose `friendlyName` is `'Shadow'`
  (`ui/core/player_specs/priest.ts:10`) — Shadow DPS only. Do not plan a Holy or
  Discipline priest; it does not exist to sim. The engine's existing `shadow`
  entry already covers the only priest wowsims models.

Re-run to verify the enum: `sed -n '42,70p' vendor/tbc-new-fork/proto/common.proto`.

---

## 3. The one hard blocker: the sim seam only carries DPS

This is the load-bearing finding. Everything in this section is downstream of it.

**The sim result already contains the non-DPS objectives.** `UnitMetrics` carries
`dps`, `hps`, `tmi`, `dtps`, and `threat` as sibling `DistributionMetrics`
(`vendor/tbc-new-fork/proto/api.proto:317-328`; generated into TS at
`packages/core/src/proto/api_pb.ts:924-946`). Verify:
`grep -n "hps\|tmi\|dtps" packages/core/src/proto/api_pb.ts | head`.

**The engine throws all but DPS away at the seam.** Three choke points:

1. `packages/core/src/seams/sim-runner.ts:20-25` — `SimObservation` is
   `{ dps, stdev, iterationsDone, simVersion }`. The only throughput field the
   engine can see is named `dps`.
2. `packages/core/src/seams/cli-sim-runner.ts:73-77` — the parser reads exactly
   `raw.raidMetrics?.dps?.avg` / `.stdev` and throws `missing raidMetrics.dps.avg/stdev`
   otherwise. This is the single point where the rich result collapses to one scalar.
3. `packages/core/src/rank.ts` — `baselineDps = observation.dps`, and every ranked
   quantity is a `deltaDps`. The public types bake the name in: `deltaDps`,
   `baseline: { dps, stdev }`, `BestSwap.deltaDps`, `SetBonusValue.packageDeltaDps`,
   `DpsSample`. `set-value.ts:367` computes `packageDeltaDps`.

Confirm no hand-written engine code reads the other metrics — the grep returns
nothing outside generated proto and `dist/`:
`grep -rn "\.hps\b\|raidMetrics.hps\|\.tmi\b" packages/core/src --include=*.ts | grep -v proto | grep -v /dist/`.

**What this costs.** A healer/tank plan must make the objective a parameter of the
run, not a hardcoded field name. Concretely: `SimObservation` carries the selected
metric (or all metrics with a per-run selector), the `CliSimRunner` / `WasmSimRunner`
parser reads the objective the run asked for, and the `*Dps` vocabulary across
`rank.ts`, `set-value.ts`, `cutoff.ts`, `view.ts`, and `rank-report.ts` becomes a
neutral "objective delta." This is a genuine refactor of the deep module's
interface, not a table addition. **It is the bulk of the work.**

The engine already _knows_ off-objective ranking is nonsense and guards against it:
`rank.ts:200-207`'s `spec-mismatch` guard refuses to rank a fight whose talents
classify as another spec, with a comment that ranking "tank gear against ret's
preset and EP weights" would "return a confident, wrong list." The plan turns that
guard into genuine support rather than a refusal.

---

## 4. The cheap parts: per-spec tables and data (the proven groove)

The nine-DPS-spec pass (merged to `dev`, commit `640ad03`) cut a well-worn path.
For a spec whose objective is DPS, adding it is ~a day of mechanical work: widen the
`SpecId` union (`packages/core/src/types.ts:21`), which forces a compile error in
every **total** `Record<SpecId, …>` table until filled, then fill each:

| Artifact                | Location                                                                     | How produced                                                                                  | Non-DPS divergence                                                                                                                                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preset skeleton         | `data/presets/<spec>/pN.raid-sim-skeleton.json`                              | `decodelink` export + pinned APL, checked by `check_raid_sim_skeleton.py`                     | **None at decode** — see below. Encounter must be role-appropriate (tank takes damage; healer has heal targets) — data, not code                                                                                                                |
| Individual sim settings | `data/presets/<spec>/pN.individual-sim-settings.json`                        | `decodelink` of a share link (`share-link.ts:50`)                                             | **None** — decodelink is role-agnostic                                                                                                                                                                                                          |
| EP stat weights         | `data/presets/<spec>/pN.ep-weights.json` + row in `ep-weights-by-phase.json` | Hand-transcribed from the fork's `presets.ts` `*_EP_PRESET`, checked by `check_ep_presets.py` | Healer/tank presets exist upstream and transcribe the same way — but are only meaningful against a healing/survival sim (§5)                                                                                                                    |
| Candidate universe      | `data/universes/<spec>-pN.json`                                              | `assemble_universe.py` via a `SPEC_PROFILES` entry                                            | Generates structurally, but weapon-DPS eviction (`assemble_universe.py:1299-1310`) and DPS-item assumptions want review for a healer pool                                                                                                       |
| Cap profile             | `CAP_PROFILE_BY_SPEC` (`cap-profile.ts:111`)                                 | Hand-authored from fork `talents.go`                                                          | Healer: a mostly-inert row (no offensive hit cap). **Tank: the `CapProfile` shape has no vocabulary for defense/avoidance/uncrit caps** — a row plus a possible type extension. Affects only advisory `hitDriven` flags, not the ranking number |
| Cutoff (noise floor)    | `CUTOFF_BY_SPEC` (`cutoff.ts:67`)                                            | Five-seed spread; only ret & feral measured, other 9 inherit ret's `absDps 3.4`               | Field is `absDps`; **TMI is not a throughput unit at all**, so the floor must be re-derived in the objective's own units, not merely re-measured                                                                                                |
| Preferred metas         | `SPEC_PREFERRED_METAS` (`candidate-gems.ts:206`)                             | Read by gem colour from the spec's vendored gear                                              | Pure row. `feral-tank` already has an entry — the non-DPS pattern is proven and the in-file procedure (`candidate-gems.ts:180-189`) is documented                                                                                               |
| Equip eligibility       | `data/equip-eligibility.json`                                                | Exported by the fork's `canEquipItem`, checked by `check_equip_eligibility.py`                | **None** — class-based, role-agnostic                                                                                                                                                                                                           |

**`decodelink` generalizes to non-DPS for free.** It is a `wowsimcli` subprocess
that inflates an `IndividualSimSettings` protobuf and discriminates only on `/raid/`
in the URL, never on role (`.scratch/archive/2026-07/wowsims-cli-vs-ui-sim-path.md:119`).
A healer or tank share link decodes identically. Preset import work is tracked in
`.scratch/carry-forward/issues/72-import-a-user-supplied-wowsims-setup.md`.

**Spec detection is a real gap for the new specs.** `classifySpec`
(`packages/core/src/spec.ts:35-45`) maps only Paladin→ret and handles the Druid
feral tree's cat/tank ambiguity. Every new healer/tank tree needs a
`CLASS_TREE_SPEC` mapping, and:

- Resto druid, holy paladin, prot paladin, prot warrior, resto shaman each need a
  tree→spec entry.
- Feral bear shares feral cat's 45-point tree — `classifyFeralForm`
  (`spec.ts:180`) already resolves cat vs. bear by form uptime and already emits
  `feral-tank` as a `DetectedSpecId` that is currently detectable-but-unrankable
  (`types.ts:40`). Making bear rankable means promoting `feral-tank` from a
  detect-only sentinel to a full `SpecId`.

Note the tab reads talents off the page, so **for the tab path spec detection is
less critical** than for a Warcraft-Logs source — the tab knows its spec from
`player.getSpec()` (§5). Detection matters for the standalone/WCL path and for the
mismatch guard.

---

## 5. The tab is ready; the gate is the engine

The Upgrades tab is **fully spec-agnostic at the injection point** and already
renders on every spec's page — tanks and healers included. It is a `SimTab`
subclass added unconditionally in the shared base class every spec page
instantiates (`vendor/tbc-new-fork/ui/core/individual_sim_ui.tsx:355-356, 448-450`).
It reads gear, talents, settings, APL, and drives sims through the site's own WASM
worker pool — all off the live page, no spec branching
(`upgrades/adapters/player_gear_source.ts:62-86`).

What gates ranking is purely a data allow-list: `SPEC_ID_BY_PROTO_SPEC`
(`upgrades_tab.tsx:63-78`) maps the 11 DPS proto specs to engine `SpecId`s. A proto
spec absent from the map yields an `unsupported-spec` message
(`upgrades_tab.tsx:1123-1126`). It deliberately omits `SpecFeralBearDruid` and maps
`SpecPriest`→`'shadow'`. So for the tab, "the site sims spec X" and "the tab can
rank spec X" differ only by: a `SpecId`, a `SPEC_ID_BY_PROTO_SPEC` entry, a
universe + EP file, and the four per-spec table rows — **plus** the §3 objective
refactor before any healer/tank number means anything.

**Two-copy caveat, load-bearing for the plan.** The engine exists twice: the
canonical `packages/core/src/` and a copy inside the fork at `upgrades/engine/`
(the tab's `SpecId` is `upgrades/engine/types.ts:29-42`). The §3 refactor must land
in both, or the copy relationship must be resolved first. Whether the fork ever
consumes `packages/core` as a package instead of copying it is left open by
ADR-0027 and the tab plan (`plan.md:196-199`). A planner should decide this early —
doing the objective refactor twice by hand is avoidable rework.

**The WASM asymmetry (relevant to EP derivation).** The pinned `wowsimcli` — both
`v0.0.101` and the newer `v0.0.119` — exposes only `decodelink` + `sim`, **no
`statweights` command** (re-run:
`./vendor/wowsimcli-v0.0.119-win32-x64/wowsimcli-windows.exe --help`). So the
standalone/CLI path cannot ask wowsims to _compute_ stat weights; it can only
finite-difference them from `sim` runs (`docs/plans/ep-weights-from-sim.md` §3).
**But the tab runs on the fork's WASM build, which the EP plan reports _does_
export `statWeightCompute`** (`ep-weights-from-sim.md:188-196`, option 4). wowsims
computes healer/tank EP against a role-appropriate reference metric —
`StatWeightsResult` holds separate weight vectors for `dps`, `hps`, and `tmi`
(`vendor/tbc-new-fork/proto/api.proto:699-703`), and each spec declares its own
`epReferenceStat` / `tankRefStat` (e.g. holy paladin `ui/paladin/holy/sim.ts:18-20`;
prot warrior `ui/warrior/protection/sim.ts:44-45`). **Hypothesis, untested:** the
tab could source correct non-DPS EP weights from the WASM `statWeightCompute` path
rather than transcribing or finite-differencing them. Worth probing early — it may
collapse the EP-authoring cost for the six new specs on the tab path.

---

## 6. What the records already say (and don't)

**Non-DPS specs have never been contemplated as a rankable product anywhere in the
repo's records.** No sizing, no ticket, no ADR, no handoff. The scope has always
been DPS by construction, though never stated as an exclusion. Representative:

- `docs/plans/wowsims-tab/plan.md:583` lists "more specs" as later work — meaning
  more _DPS_ specs (the JSON-drop-in kind).
- The tab's "done" definition is against two DPS specs: "finished when a **ret or
  feral** player … can open the Upgrades tab"
  (`.scratch/handoffs/wowsims-tab/BRIEF-finish-the-tab.md:34`).
- ADR-0028's consequence: audits cover "only **ret and feral** … Extending to
  other … specs is a parameter change, not a redesign" — a DPS framing.
- `CONTEXT.md` carries no "healing/tanking out of scope" note. The DPS scope is
  simply assumed.

The nearest structural statement is the **spec seam** (PLAN.md §5.4): "adding a
spec should be dropping in a JSON file and nothing else." That is role-agnostic _in
principle_ — but every spec that has flowed through it is DPS, and the value model
behind it (ADR-0022: a DPS delta from a `RaidSimRequest`) assumes a DPS objective.
§3 is precisely where the "JSON drop-in" claim breaks for non-DPS.

**The two prior "healer"/"tank" mentions are unrelated to role support:**

- Tickets 227/234 (`wontfix`) are about the _feral cat_ pool accidentally
  including healer-statted items that score via a mana constraint — a DPS-spec pool
  hygiene question, not healer ranking.
- The "tank" work in spec classification (`classifyFeralForm`) separates feral cat
  from feral bear by form uptime so a bear log is not mistaken for cat — it makes
  bear _detectable_, deliberately not _rankable_.

**Open DPS-scoped tickets that become directly relevant infrastructure** (each
needs re-doing or extending per new spec):

- **291** — measure per-spec cutoff spreads. The non-DPS specs need floors in
  _their own_ units (HPS, TMI), not merely more DPS measurements.
- **292** — variant-aware EP weights (build variants). Healer/tank builds have
  variants too.
- **293** — source-attribution backfill.
- **300** — `assemble_universe.py` spec-profile duplication; adding six more
  profiles sharpens the case for the refactor.
- **211** (fork-universes gate) — **closed**; `pnpm fork-universes:check`
  byte-compares fork-bundled universes against `data/`. New specs must satisfy it.

Verify scope framing: `grep -rn "more specs\|ret or feral\|out of scope" docs/plans/wowsims-tab/ .scratch/handoffs/wowsims-tab/BRIEF-finish-the-tab.md`.

---

## 7. Shape of the work (for the planner, not a plan)

Ordered by dependency, not yet estimated. A real plan (stage-gate is the fit —
a wrong objective abstraction is expensive) turns this into stages with gates.

1. **Decide the objective abstraction.** How `SimObservation` and the ranking types
   carry an objective other than DPS. This is the interface decision the whole
   feature hangs on; get it reviewed before code (§3).
2. **Resolve the two-copy question** (§5). Consume `packages/core` in the fork, or
   commit to landing the refactor in both. Decide before writing the refactor
   twice.
3. **Refactor the seam and the `*Dps` vocabulary** to the chosen abstraction, with
   DPS as the first (unchanged-behaviour) objective. The existing 11 specs must
   rank byte-identically after this — that is the regression gate.
4. **Add one non-DPS objective end to end** — pick a single healer (HPS is a
   throughput unit, closer to DPS than TMI) as the proving spec, the way feral was
   the Stage 2 gate for the spec seam. Read `hps` from the sim, an HPS cutoff, HPS
   EP weights (probe the WASM `statWeightCompute` path first, §5), a healer preset
   and universe.
5. **Add the tank objective** (TMI/survival) — the harder one: not a throughput
   unit, `CapProfile` needs defense/avoidance vocabulary, cutoff re-derivation from
   first principles. Prove with one tank.
6. **Fill the remaining four** once each objective is proven — these should drop
   back toward the mechanical §4 groove.
7. **Spec detection** for the six trees (§4), and promote `feral-tank` from
   detect-only to rankable.

**The proving-spec discipline matters most.** The spec seam was only trusted once
feral (a second DPS spec) actually flowed through it (PLAN.md §14 Stage 2). Non-DPS
is a bigger claim than feral was — a new objective, not a new data file — so the
plan should prove one healer and one tank end to end before committing to all six.

---

## 8. Re-run index

Every command and citation the sections above rely on, gathered so a planner can
re-verify the foundation without re-scanning the prose.

- Spec enum: `sed -n '42,70p' vendor/tbc-new-fork/proto/common.proto`
- Role flags: `vendor/tbc-new-fork/ui/core/player_specs/*.ts` (`isHealingSpec`, `isTankSpec`)
- Objective metrics in the result: `grep -n "hps\|tmi\|dtps" packages/core/src/proto/api_pb.ts | head`
- Seam collapse to DPS: `packages/core/src/seams/sim-runner.ts:20-25`, `seams/cli-sim-runner.ts:73-77`
- No engine code reads non-DPS: `grep -rn "\.hps\b\|\.tmi\b" packages/core/src --include=*.ts | grep -v proto | grep -v /dist/`
- Per-spec total tables: `rank.ts:558` (`PRESET_ID_BY_SPEC`), `cap-profile.ts:111`, `cutoff.ts:67`, `candidate-gems.ts:206`
- Tab allow-list: `vendor/tbc-new-fork/upgrades/upgrades_tab.tsx:63-78`
- CLI has no statweights: `./vendor/wowsimcli-v0.0.119-win32-x64/wowsimcli-windows.exe --help`
- WASM statweights + EP background: `docs/plans/ep-weights-from-sim.md`
- Prior scope: `docs/plans/wowsims-tab/plan.md:583`, `.scratch/handoffs/wowsims-tab/BRIEF-finish-the-tab.md:34`, `docs/adr/0022-*.md`, `docs/adr/0027-*.md`, `docs/adr/0028-*.md`
