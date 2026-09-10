# Plan — ticket-365-dual-wield-fixture

> **Status: awaiting owner decision on scale.** Written by `gate-planner`
> (Fable) 2026-09-10 against `brief.md` and ticket 365. Not yet reviewed, not
> yet executed. The question put to the owner is whether the skeleton-building
> machinery in Steps 1–4 is worth buying to unblock ticket 350, or whether a
> narrower route is wanted. Steps 5–9 are the measurement itself and are not in
> question.

## Goal

When this plan is done, the repo holds a committed enhancement-shaman `RaidSimRequest` fixture that `rankUpgrades` itself composed (captured through `CapturingSimRunner`, not typed), plus the companion request the ranker composes when a two-handed candidate (Gorehowl, 28773) is swapped into the main hand while the worn one-hander (28308) stays in the off hand. Ticket 350 step 1 has been run against those two requests with the pinned `wowsimcli` at an iteration count whose 3σ floor is written down, and the observed outcome (drops / counts / rejects, with the pre-registered selector that chose it) is recorded in `.scratch/stage-gate/ticket-365-dual-wield-fixture/results.md`, in ticket 365's Decision section, in ticket 350's record, and in `docs/verification-log.md`. No fix for 350 is chosen and no engine file is edited. `pnpm verify` is green.

## Approach

**Chosen: build the missing enh skeleton by script from pinned upstream sources, then capture the request through the ranker.**

The capture mechanism already exists and is generic over spec (C2, C3, C4). The only missing input is a skeleton for `enh`, because `compose()` takes everything except name/race/equipment from `deps.raidSimSkeleton` (C2). Both existing skeletons were themselves produced by script from pinned sources — ret via `wowsimcli decodelink`, feral via `scripts/build_feral_skeleton.py` (C5) — so a scripted `scripts/build_enh_skeleton.py` reading the fork's own enhancement presets (talents, race, consumables, spec options, APL) and an extracted buff-defaults file is the same provenance class as what the repo already trusts. That is not hand-authoring the request: the request is still what `rank.ts` sends; only the spec-constant block the ranker never touches is assembled, and it is assembled from the pinned commit, not from memory.

The measurement then needs three requests: **A** = captured baseline (1H+OH, both 28308), **B** = captured candidate request with Gorehowl at index 14 and 28308 still at index 15 (exactly the ticket-350 composition), **C** = B with index 15 emptied via the existing `withSlotEmptied` helper (one-slot edit of a captured request, the ticket-226 precedent). A/B are what the ranker built; C is the control that isolates the off hand.

**Strongest rejected alternative: point the capture at the fork's Upgrades tab or at `pnpm rank` with a real character.** Both fail on inputs: the tab aborts on the item-swap item before pricing anything (ticket 362, brief), and `pnpm rank` needs a recorded character for the spec (`RECORDED_CHARACTERS` is ret/feral only, `cli-wiring.ts:158-165`). The synthetic preset-gear route (`syntheticOfflineRecordings`) is what tickets 226/227 already used to get real ranker requests without a character and is spec-generic (C4), so it wins on cost and provenance.

**Second rejected alternative: hand-author the enh request JSON from the p1 gear file.** Ruled out by the brief and by `direct-sim-support.ts:15-17`; gems in particular are re-solved by `repairAndMinimize` (C2), so a typed request would not be the document the ranker sends.

**If capture proves impossible** — the extractor cannot resolve enh's buff blocks, the APL fails the proto-schema gate, or the pinned CLI rejects the captured baseline A — the executor stops at that step and reports it as the finding (Step 4 and Step 6 name the stop conditions). Hand-authoring is not a fallback.

## Claims register

| ID | Claim | Load-bearing | Verified by |
| --- | --- | --- | --- |
| C1 | Ticket 350 is reachable only for `DUAL_WIELD_SPECS` = rogue, enh, warrior, hunter; feral/ret get no off-hand placement. | yes | `grep -n -A5 'const DUAL_WIELD_SPECS' packages/core/src/pool.ts` (line 373) |
| C2 | `compose()` clones the skeleton and overwrites only `name`, `race`, `equipment` on `raid.parties[0].players[0]`; it deletes `simOptions`/`requestId`. Gems come from the worn item then `repairAndMinimize`, not from the skeleton. | yes | `sed -n 29,60p packages/core/src/compose.ts`; `grep -n 'applyRepairedGems\|repairAndMinimize' packages/core/src/rank.ts` (653-677) |
| C3 | `CapturingSimRunner` records every `RaidSimRequest` the ranker issues; with one seed and `concurrency` default 1, `calls[0]` is the baseline and `calls[1]` the candidate; no lower-iteration screening pass exists in `rank.ts`. | yes | `sed -n 76,95p packages/core/test/direct-sim-support.ts`; `grep -c 'fullPool\|screenIterations' packages/core/src/rank.ts` → 0; `grep -n 'concurrency' packages/core/src/rank.ts` (1130) |
| C4 | `syntheticOfflineRecordings` is generic over `SpecId` (SPEC_CLASS_NAME/SPEC_TREE_INDEX both include `enh`) and `PresetGearFile` is `{items: 17 × {id?, enchant?, gems?}}`; `vendor/wowsims/enh_p1.gear.json` has that shape. | yes | `sed -n 29,68p packages/core/src/fixtures/synthetic-offline.ts`; `node -e 'console.log(require("./vendor/wowsims/enh_p1.gear.json").items.length)'` → 17 |
| C5 | Both existing skeletons are script/tool-produced from pinned sources: ret via `wowsimcli decodelink` (PLAN.md §8.2), feral via `scripts/build_feral_skeleton.py` (encounter from ret skeleton, buffs from `buff-defaults.json`, talents/race/consumables from upstream presets, APL merged after an `apl_schema` gate). | yes | `sed -n 1,40p scripts/build_feral_skeleton.py`; `grep -n 'decodelink' PLAN.md \| head -3` |
| C6 | `rank.ts` already names `enh/p2.raid-sim-skeleton` in `PRESET_ID_BY_SPEC`, and no test asserts that `data/presets/enh/` lacks a skeleton. | no | `sed -n 558,570p packages/core/src/rank.ts`; `grep -rn 'presets/enh' packages/core/test` → only `archetype-specs.test.ts:135` (fallback EP weights) |
| C7 | The enh universe carries two-handers: enh-p2 has 151 weapon entries, 42 with `handType === 4`, including Gorehowl 28773 (phase 1). 28308 (worn in p1 gear) is `handType 2`, `weaponType 1`, present in `data/items/index.json` though not in the universe. | yes | `node -e 'const u=require("./data/universes/enh-p2.json");const w=u.entries.filter(e=>e.slot==="weapon");console.log(w.length,w.filter(e=>e.handType===4).length,w.find(e=>e.itemId===28773))'`; `node -e 'console.log(require("./data/items/index.json")["28308"].handType)'` → 2 |
| C8 | For spec `enh`, a two-hander passes `itemFitsSimSlot` for `mainhand` and is filtered from `offhand`; `swapItemAt` rewrites only index 14; nothing in `rank.ts`/`pool.ts` clears index 15. So the captured candidate request B will hold 28773 at 14 and 28308 at 15. | yes | `sed -n 397,443p packages/core/src/pool.ts`; `sed -n 2089,2116p packages/core/src/rank.ts`; confirmed by Step 6's assertion on the capture |
| C9 | Only `candidateCap` (default = all) can drop an eligible candidate before its sim; cutoff/`meetsCutoff` runs after the sim. A one-entry pool is simmed. | yes | `grep -n 'candidateCap' packages/core/src/rank.ts` (1100-1103); `grep -n 'meetsCutoff' packages/core/src/rank.ts` (1059, 1435) |
| C10 | `SimRunner.version()` is only folded into the content hash and cache keys; `rank.ts` compares it to nothing, so a stub inner runner returning a fixed observation is sufficient for capture. | yes | `grep -n 'sim.version()' packages/core/src/rank.ts` (749) and `grep -n 'simVersion' packages/core/src/rank.ts` |
| C11 | The pinned CLI at `vendor/wowsimcli-ec5c5f205e61049d730e460967f8488774a7fe2a-win32-x64/wowsimcli-windows.exe` reports `ec5c5f205e61049d730e460967f8488774a7fe2a`, matching `data/wowsims.lock.json` `tag`. | yes | `./vendor/wowsimcli-ec5c5f205e61049d730e460967f8488774a7fe2a-win32-x64/wowsimcli-windows.exe version; echo "rc=$?"` (measured: prints the SHA, rc=0); `grep -n '"tag"' data/wowsims.lock.json` |
| C12 | The fork's enh APL (`ui/shaman/enhancement/apls/default.apl.json`) uses no field unknown to the pinned proto schema; it has 6 prepull actions and 8 priority entries. | yes | `python <scratchpad>/apl_probe.py` (measured: `unknown: []`); re-run as Step 4's gate |
| C13 | At the pin `ec5c5f…`, the fork files `ui/shaman/enhancement/presets.ts`, `apls/default.apl.json`, `gear_sets/p1.gear.json`, `ui/core/proto_utils/utils.ts`, `ui/core/constants/other.ts` are byte-identical to the `vendor/tbc-new-fork` checkout at `3829c66…`. | yes | `git -C vendor/tbc-new-fork diff --stat ec5c5f205e61049d730e460967f8488774a7fe2a 3829c66f672cdaeaba347920f59db0795a01e2c9 -- ui/shaman/enhancement/presets.ts ui/shaman/enhancement/apls/default.apl.json ui/shaman/enhancement/gear_sets/p1.gear.json ui/core/proto_utils/utils.ts ui/core/constants/other.ts` → empty, rc=0 |
| C14 | `scripts/sync_wowsims.py` already tracks `enh_p1.gear.json`, `proto_utils.ts`, `constants_other.ts`; adding a file is "a hand edit to TRACKED followed by `--update --tag <the tag already in data/wowsims.lock.json>`" (script's own runbook, lines 66-76). | no | `grep -n '"enh_p1.gear.json"\|"proto_utils.ts"' scripts/sync_wowsims.py`; `sed -n 66,76p scripts/sync_wowsims.py` |
| C15 | `extract_sim_defaults.mjs` reads `raidBuffs/partyBuffs/individualBuffs/debuffs` as property assignments inside a spec's `sim.ts` defaults block; enh's `sim.ts` assigns `Presets.DefaultRaidBuffs` etc., and the four objects are `export const Default*` declarations in `presets.ts`. The extractor therefore needs an extension to follow that indirection. | yes | `sed -n 188,205p scripts/extract_sim_defaults.mjs`; `sed -n 98,104p vendor/tbc-new-fork/ui/shaman/enhancement/sim.ts`; `sed -n 125,175p vendor/tbc-new-fork/ui/shaman/enhancement/presets.ts` |
| C16 | `defaultRaidBuffMajorDamageCooldowns` in the fork's `utils.ts` ignores its argument (`(_?: Class)`), and the extractor's non-EW helper path evaluates the body without inspecting args, so `defaultRaidBuffMajorDamageCooldowns(Class.ClassShaman)` resolves as-is. | no | `grep -n 'defaultRaidBuffMajorDamageCooldowns' vendor/tbc-new-fork/ui/core/proto_utils/utils.ts` (1273); `sed -n 177,187p scripts/extract_sim_defaults.mjs`. Hypothesis until Step 3 runs it. |
| C17 | 3σ floor on the mean at N iterations, using the committed feral proxy `stdev = 127.966`: N=3000 → 7.01 DPS; N=30 000 → 2.22; N=100 000 → 1.21. | yes | `node -e 'for(const n of [3000,30000,100000])console.log(n,(3*127.9659250680645/Math.sqrt(n)).toFixed(2))'` |
| C18 | Enh's own stdev at 100 000 iterations, and therefore the real floor, is unknown until run; the script must print the floor from the measured stdev, not from C17. | no | `hypothesis, untested` — resolved by Step 7's output |
| C19 | A 30 000-iteration sim takes about 2.5 s on this machine (ticket 226 script header), so three 100 000-iteration runs fit in under a minute. | no | `sed -n 34,35p packages/core/test/measure-ticket-226-direct.ts`; `hypothesis, untested` for enh |
| C20 | Across core counts the sim agrees only to ~1e-12 DPS, so live float comparisons use tolerances, never `toBe`. | no | `sed -n 175,179p docs/plans/compute-topology.md; sed -n 205,210p docs/plans/compute-topology.md` |
| C21 | "Player key" in ticket 365 means the spec-options oneof key on the player (`feralCatDruid`, `retributionPaladin` in the probe's table); for enh it is the proto's `enhancementShaman` field. | no | `sed -n 15,25p .scratch/stage-gate/reforge-catchup-leftovers/probe/results.md`; `grep -n 'enhancementShaman\|EnhancementShaman ' data/proto/api.proto` — the exact JSON field name must be read from the proto in Step 4 |
| C22 | `CliSimRunner` throws on a non-`ErrorOutcomeNone` `error.type`, a nonzero exit, or `iterationsDone` mismatch — so the "rejects" outcome shows up as a thrown error on arm B, not as a number. | yes | `sed -n 58,72p packages/core/src/seams/cli-sim-runner.ts` |
| C23 | EP weights for enh at maxPhase 2 resolve to `data/presets/enh/fallback.ep-weights.json` (byPhase has only 3). | no | `node -e 'console.log(JSON.stringify(require("./data/presets/ep-weights-by-phase.json").enh))'` |
| C24 | `vendor/` is gitignored; a fresh worktree needs `pnpm sync:wowsims:restore` and `pnpm fetch:wowsimcli` before Steps 1, 3 and 7 can run. | no | `git check-ignore -v vendor/wowsims/enh_p1.gear.json` |
| C25 | The expected off-hand swing contribution for a Windfury dual-wield enhancement shaman is large relative to the off-hand's stat contribution (order 100 DPS vs order 10 DPS on ~1000+ DPS). The 0.25·(A−C) split in Step 7's selector rests on this. | no | `hypothesis, untested` — Step 7 prints A−C so the reader can judge the split against the measured scale |

## Steps

**Environment rule for every step:** run `node`/`pnpm`/`npx`/`python` from Bash; never chain with `&&` (fnm stderr breaks it); use `git -C <abs repo>` and `pnpm -C <abs repo>`; write scripts as files, not heredocs; bound output and check the artifact, not the exit code. Repo root `R = C:\Users\dgree\Code\lulz\tbc-gear-prio`. Commit after each green step with a message per the seven rules.

### Step 1 — Pin the two missing enh upstream files

Action: in `R/scripts/sync_wowsims.py` add to `TRACKED`, next to the enh gear sets (line ~146):
`"enh_presets.ts": "ui/shaman/enhancement/presets.ts"` and `"enh_default.apl.json": "ui/shaman/enhancement/apls/default.apl.json"`. Then run `python R/scripts/sync_wowsims.py --update --tag ec5c5f205e61049d730e460967f8488774a7fe2a` (the runbook route, C14). If that command needs network/`gh` auth that is unavailable, fall back to `git -C R/vendor/tbc-new-fork show ec5c5f205e61049d730e460967f8488774a7fe2a:ui/shaman/enhancement/presets.ts > R/vendor/wowsims/enh_presets.ts` (same for the APL) and record in results.md that the lock entry was written by the fallback — and then run `python R/scripts/sync_wowsims.py --check` to confirm the lock and the files agree. Read `docs/agents/known-traps.md` and the `data-pipeline-work` skill first (pinning a vendored input).
Files: `scripts/sync_wowsims.py`, `data/wowsims.lock.json`, `vendor/wowsims/enh_presets.ts`, `vendor/wowsims/enh_default.apl.json` (gitignored).
Acceptance: `python R/scripts/sync_wowsims.py --check; echo "rc=$?"` prints no drift and rc=0; `grep -c '"enh_presets.ts"\|"enh_default.apl.json"' R/data/wowsims.lock.json` → 2; `sha256sum R/vendor/wowsims/enh_presets.ts` equals the lock's sha256; `pnpm -C R run sync-wowsims:unit:check` passes.
Depends on: C13, C14, C24.

### Step 2 — Extend the buff-defaults extractor to enh

Action: in `R/scripts/extract_sim_defaults.mjs` add `enh: { sim: "vendor/wowsims/enh_presets.ts", out: "data/presets/enh/buff-defaults.json" }` to `SPECS`, and extend `extract()` so that when a WANTED key is absent as a property assignment it falls back to the `export const Default<Key with first letter upper-cased>` variable declaration in the same source (`DefaultRaidBuffs`, `DefaultPartyBuffs`, `DefaultIndividualBuffs`, `DefaultDebuffs`) (C15). Do not special-case the class argument to `defaultRaidBuffMajorDamageCooldowns` unless Step 3 shows it fails (C16). Keep the feral path byte-stable: `node R/scripts/extract_sim_defaults.mjs --spec feral --check` must still pass. Update the file's header comment to say the enh source is `presets.ts` and why.
Files: `scripts/extract_sim_defaults.mjs`.
Acceptance: `node R/scripts/extract_sim_defaults.mjs --spec feral --check; echo "rc=$?"` → rc=0.
Depends on: C15, C16.

### Step 3 — Generate `data/presets/enh/buff-defaults.json`

Action: `node R/scripts/extract_sim_defaults.mjs --spec enh > R/.scratch/stage-gate/ticket-365-dual-wield-fixture/step3.log; echo "rc=$?"`. Read the output file and confirm it carries the values visible in `presets.ts` lines 125-175: `individualBuffs.blessingOfKings: true`, `blessingOfMight: "TristateEffectImproved"`, `partyBuffs.ferociousInspiration: 2`, `raidBuffs.arcaneBrilliance: true`, `debuffs.judgementOfWisdom: true`, and the expose-weakness block resolved for `CURRENT_PHASE` from `constants_other.ts`. Add `--spec enh` build/check invocations to `sim-defaults:build` and `sim-defaults:check` in `R/package.json`.
**Stop condition:** if the extractor throws `Unresolved` for an expression that would need a hand-typed value to proceed, stop and report; do not inline constants (ADR-0022, `build_feral_skeleton.py:111-115`).
Files: `data/presets/enh/buff-defaults.json` (new, generated), `package.json`.
Acceptance: `node R/scripts/extract_sim_defaults.mjs --spec enh --check; echo "rc=$?"` → rc=0; `node -e 'const b=require("./data/presets/enh/buff-defaults.json");console.log(b.individualBuffs.blessingOfKings,b.partyBuffs.ferociousInspiration,b.debuffs.judgementOfWisdom)'` → `true 2 true`.
Depends on: C15, C16, Step 2.

### Step 4 — Write `scripts/build_enh_skeleton.py` and generate the skeleton

Action: new `R/scripts/build_enh_skeleton.py`, modelled line-for-line on `build_feral_skeleton.py` (C5) with these enh inputs, every constant annotated with its source line in `vendor/wowsims/enh_presets.ts`:
- encounter block: copied from `data/presets/ret/p2.raid-sim-skeleton.json` (same reasoning as feral: it describes the fight, and enh's `sim.ts` `encounterPicker` carries no override — executor confirms with `sed -n 120,128p R/vendor/tbc-new-fork/ui/shaman/enhancement/sim.ts`).
- `raid.buffs`, `raid.debuffs`, `party.buffs`, `player.buffs`: assigned (not merged) from `data/presets/enh/buff-defaults.json`.
- `player.name = "enh"`, `class = "ClassShaman"`, `race = "RaceOrc"`, `profession1 = "Engineering"`, `profession2 = "Leatherworking"`, `distanceFromTarget = 5`, `reactionTimeMs`: use the ret skeleton's value if `OtherDefaults` has none (say which in the script comment).
- `talentsString = "03-500502210501133531151-50005301"` (SubRestoIWT — the `sim.ts` default at line 95, not the first-listed preset; state that).
- `consumables` from `DefaultConsumables` (`potId 22838, flaskId 22854, foodId 27658, drumsId "LesserDrumsOfBattle", conjuredId 22788, explosiveId 30217, superSapper, goblinSapper, scrollAgi, scrollStr`), parsed from the vendored `enh_presets.ts` text rather than retyped if a cheap regex does it; otherwise typed with a source-line comment.
- spec-options oneof: pop `retributionPaladin`, set the enh field with `DefaultOptions` (`classOptions.shieldProcrate 0`, `classOptions.imbueMh "WindfuryWeapon"`, `imbueOh "WindfuryWeapon"`, `syncType "DelayOffhandSwings"`). The JSON field name for the oneof and the nesting come from `data/proto/api.proto` / `shaman.proto` (C21) — read them, do not guess.
- rotation: `type: "TypeAPL"` plus the four `APL_KEYS` from `vendor/wowsims/enh_default.apl.json`, after the same `apl_schema` unknown-field gate (C12).
- `equipment.items`: 17 × `{}`.
- Support `--check`: rebuild to a temp file and byte-compare with the committed output, exit 1 on drift.
Run it; then add `"enh-skeleton:check": "python scripts/build_enh_skeleton.py --check"` to `package.json` and append `&& pnpm run enh-skeleton:check` to `verify`.
**Stop condition:** the APL gate reporting unknown fields, or a proto field name that cannot be found — report, do not write the skeleton.
Files: `scripts/build_enh_skeleton.py` (new), `data/presets/enh/p2.raid-sim-skeleton.json` (new, generated), `package.json`.
Acceptance: `python R/scripts/build_enh_skeleton.py; echo "rc=$?"` → rc=0 and prints `rotation.type=TypeAPL, prepullActions=6, priorityList=8`; `python R/scripts/build_enh_skeleton.py --check; echo "rc=$?"` → rc=0; `node -e 'const s=require("./data/presets/enh/p2.raid-sim-skeleton.json");const p=s.raid.parties[0].players[0];console.log(p.class,p.race,p.talentsString,Object.keys(p).filter(k=>/Shaman|Paladin|Druid/.test(k)))'` → `ClassShaman RaceOrc 03-500502210501133531151-50005301 [ '<enh oneof key>' ]` with no paladin key.
Depends on: C5, C6, C12, C13, C21, Step 3.

### Step 5 — Write the capture-and-measure script

Action: new `R/packages/core/test/measure-ticket-365-dual-wield.ts`, following `measure-ticket-226-direct.ts`'s shape (header explaining what it answers, `--part capture` and `--part measure`, run with `npx tsx`). Contents:
- A local `ENH_SYNTHETIC_REF = { region: "US", realm: "synthetic", name: "synthetic-enh" }` and fight `{ reportCode: "synthetic-enh-p1", fightId: 1, encounterName: "Synthetic fixture (enh p1 preset)" }` — local to the script, not added to `src/fixtures/synthetic-offline.ts`.
- A `StubSimRunner` (`version()` → `"stub"`, `run()` → `{ dps: 1000, stdev: 100, iterationsDone: opts.iterations, simVersion: "stub" }`) wrapped in `CapturingSimRunner` (C3, C10).
- `rankUpgrades({ character: ENH_SYNTHETIC_REF, spec: "enh", maxPhase: 2, iterations: 3000, seeds: [42], race: "RaceOrc" }, { gear: new RecordedGearSource(syntheticOfflineRecordings({ ref, spec: "enh", presetGear: loadJson("vendor/wowsims/enh_p1.gear.json"), fight })), sim, store: new MemoryStore(), clock: fixed, raidSimSkeleton: loadJson("data/presets/enh/p2.raid-sim-skeleton.json"), epWeights: loadJson(resolved enh EP path).weights, pool: filterPoolByPhase(poolFromUniverse(loadJson("data/universes/enh-p2.json")), 2).filter(e => e.itemId === 28773) })` (C4, C7, C9, C23).
- `--part capture`: asserts `calls.length === 2`; asserts `equippedIds(calls[0].req)[14] === 28308 && [15] === 28308`; asserts `equippedIds(calls[1].req)[14] === 28773 && [15] === 28308` (C8); writes `calls[0].req` to `R/test/fixtures/enh-p1-synthetic.raid-sim-request.json` and `calls[1].req` to `R/test/fixtures/enh-p1-synthetic.gorehowl-2h.raid-sim-request.json` (2-space JSON, trailing newline, no `simOptions` — they are injected by the runner); prints both `simCacheKey`s and the player oneof key.
- `--part measure`: loads the two fixtures, builds C = `withSlotEmptied(B, 15)`, runs `simDirect` on A, B, C at `{ iterations: 100_000, seed: 42 }`, each in its own try/catch so a thrown B is reported rather than aborting. Prints for each arm dps, stdev, se = stdev/√N, and the 3σ floor 3·se; prints A−C, B−C, and `tol = 3·sqrt(seB²+seC²)`; then applies the pre-registered selector in Step 7 and prints the outcome word. Never compares with `===`.
Files: `packages/core/test/measure-ticket-365-dual-wield.ts` (new).
Acceptance: `pnpm -C R run typecheck; echo "rc=$?"` → rc=0 and `pnpm -C R run lint` clean for the new file.
Depends on: C3, C4, C7, C8, C9, C10, C22, C23.

### Step 6 — Capture the fixtures and smoke-check them against the pinned CLI

Action: `npx tsx R/packages/core/test/measure-ticket-365-dual-wield.ts --part capture > R/.scratch/stage-gate/ticket-365-dual-wield-fixture/capture.log; echo "rc=$?"`. Then a smoke run of A alone at 3000 iterations (add `--part smoke` or a flag) to prove the pinned binary accepts the skeleton-composed request (C11, C22). Run `pnpm -C R exec prettier --write test/fixtures/enh-p1-synthetic*.json`.
**Stop condition:** if the CLI rejects arm A (the legal 1H+OH set), the skeleton is wrong, not the engine — fix the skeleton via Steps 3-4, and if it cannot be fixed from pinned sources, stop and report "capture impossible" with the CLI's error text. Do not edit the fixture by hand.
Files: `test/fixtures/enh-p1-synthetic.raid-sim-request.json`, `test/fixtures/enh-p1-synthetic.gorehowl-2h.raid-sim-request.json` (both new).
Acceptance: both files exist; `node -e 'const r=require("./test/fixtures/enh-p1-synthetic.gorehowl-2h.raid-sim-request.json");const it=r.raid.parties[0].players[0].equipment.items;console.log(it[14].id,it[15].id)'` → `28773 28308`; the same for the baseline prints `28308 28308`; smoke run prints a finite dps for A with rc=0; capture.log records the two `simCacheKey`s and the player oneof key.
Depends on: C3, C8, C11, C22, Steps 4-5.

### Step 7 — Run ticket 350 step 1 (pre-registered selector)

Iteration count: **100 000 per arm, seed 42** — floor 1.21 DPS by the feral proxy (C17), an order of magnitude under even a stats-only off-hand delta (~10 DPS, brief) and two orders under a swing-sized one; the script prints the real floor from enh's own stdev (C18). If the measured floor exceeds 3 DPS, rerun at 300 000 and say so.

Selector, fixed before running (`tol = 3·sqrt(seB² + seC²)`):
- **rejects** — `simDirect(B)` throws (C22) while A and C return numbers. Record the error text verbatim.
- **drops (entirely)** — `|B − C| ≤ tol`.
- **counts** — `B − C > tol` and `B − C ≥ 0.25 · (A − C)` (the off hand contributes a swing-sized share of what it contributes in the legal set; C25).
- **drops the swing, keeps the stats** — `B − C > tol` and `B − C < 0.25 · (A − C)`. This is the reading ticket 350 recorded from `sim/core/attack.go:441` / `character.go:560-568`; it is listed so the result cannot be forced into one of the three words when the data says otherwise. If it lands here, report it under "drops" for ticket 350's purposes with the qualifier.
- Anything else (e.g. B − C < −tol) — report as "unclassified" with the numbers; do not pick.

Action: `npx tsx R/packages/core/test/measure-ticket-365-dual-wield.ts --part measure > R/.scratch/stage-gate/ticket-365-dual-wield-fixture/measure.log; echo "rc=$?"`; then write `R/.scratch/stage-gate/ticket-365-dual-wield-fixture/results.md` with: binary version output, core count (`node -e 'console.log(require("os").cpus().length)'`, C20), the three arms' dps/stdev/se/floor, A−C, B−C, tol, the selector line that fired, the commands run, and the two fixtures' `simCacheKey`s.
Files: `.scratch/stage-gate/ticket-365-dual-wield-fixture/results.md` (new), `measure.log`.
Acceptance: results.md exists with one and only one selector marked as fired, every number traceable to `measure.log`, and the stated floor computed from the measured stdev.
Depends on: C11, C17, C18, C20, C22, C25, Step 6.

### Step 8 — Record, without deciding

Action:
- Ticket `R/.scratch/carry-forward/issues/365-no-committed-dual-wield-raid-sim-request-fixture.md`: tick the three acceptance boxes with one line each pointing at the fixture paths, results.md, and the iteration justification; set `Status: closed`; add a `## Decision (2026-09-10)` section naming the outcome word and the fixture provenance (script-built skeleton → ranker-captured request).
- Ticket `R/.scratch/carry-forward/issues/350-two-hander-swap-leaves-worn-offhand.md`: change `Blocked by: 365` to `Blocked by: none`; add a `## Measurement (ticket 365, 2026-09-10)` section with the outcome, the three numbers, the tolerance, and a pointer to results.md. Tick only the first acceptance box ("engine's behaviour … established and written down"). Do **not** tick or argue option 1 vs 2. Leave Status open.
- `R/docs/verification-log.md`: append an entry in the file's existing format (read the last two entries first) with the measurement and the re-run commands.
- Make sure every causal sentence written in these three files either cites a command or says "hypothesis".
Files: the two tickets, `docs/verification-log.md`.
Acceptance: `pnpm -C R run issues:open` no longer lists 365 and lists 350 with no blocker; `grep -n 'Option 1\|Option 2' <350 ticket>` shows no new line choosing one.
Depends on: Step 7.

### Step 9 — Verify and commit

Action: `pnpm -C R run verify > R/.scratch/stage-gate/ticket-365-dual-wield-fixture/verify.log; echo "rc=$?"`; read the tail. `git -C R status --porcelain` must show only files in the Paths manifest before each commit (the two untracked `.scratch/handoffs/wowsims-reforge-catchup/*` files predate this work — leave them alone and do not sweep them into a commit). Commit per green slice: (1) pin + extractor + buff-defaults, (2) skeleton builder + skeleton + verify wiring, (3) measure script + fixtures, (4) results + tickets + log.
Acceptance: verify rc=0 from the redirect file; `git -C R log --oneline -4` shows the four commits on `feat/reforge-catchup-leftovers`.
Depends on: all prior.

## Paths manifest

Created:
- `scripts/build_enh_skeleton.py`
- `data/presets/enh/buff-defaults.json` (generated by Step 3)
- `data/presets/enh/p2.raid-sim-skeleton.json` (generated by Step 4)
- `packages/core/test/measure-ticket-365-dual-wield.ts`
- `test/fixtures/enh-p1-synthetic.raid-sim-request.json` (captured, Step 6)
- `test/fixtures/enh-p1-synthetic.gorehowl-2h.raid-sim-request.json` (captured, Step 6)
- `.scratch/stage-gate/ticket-365-dual-wield-fixture/results.md`, `capture.log`, `measure.log`, `verify.log`, `step3.log`
- `vendor/wowsims/enh_presets.ts`, `vendor/wowsims/enh_default.apl.json` (gitignored; restored by `pnpm sync:wowsims:restore`)

Modified:
- `scripts/sync_wowsims.py` (two `TRACKED` entries)
- `data/wowsims.lock.json` (two `files` entries, written by the sync script)
- `scripts/extract_sim_defaults.mjs` (`SPECS.enh`, `Default*` const fallback, header comment)
- `package.json` (`sim-defaults:build`/`sim-defaults:check` gain `--spec enh`; new `enh-skeleton:check`; `verify` chain gains it)
- `.scratch/carry-forward/issues/365-no-committed-dual-wield-raid-sim-request-fixture.md`
- `.scratch/carry-forward/issues/350-two-hander-swap-leaves-worn-offhand.md`
- `docs/verification-log.md`

No fan-out; single executor, serial steps. No file under `packages/core/src/`, `vendor/tbc-new-fork/`, or any fork `upgrades/engine/**` is touched — if a step seems to need one, that is a finding to flag, not an edit to make.

## Verify recipe

```
pnpm -C C:/Users/dgree/Code/lulz/tbc-gear-prio run verify > .scratch/stage-gate/ticket-365-dual-wield-fixture/verify.log; echo "rc=$?"
python scripts/sync_wowsims.py --check; echo "rc=$?"
node scripts/extract_sim_defaults.mjs --spec enh --check; echo "rc=$?"
node scripts/extract_sim_defaults.mjs --spec feral --check; echo "rc=$?"
python scripts/build_enh_skeleton.py --check; echo "rc=$?"
node -e 'const r=require("./test/fixtures/enh-p1-synthetic.gorehowl-2h.raid-sim-request.json");const it=r.raid.parties[0].players[0].equipment.items;console.log(it[14].id,it[15].id)'   # 28773 28308
npx tsx packages/core/test/measure-ticket-365-dual-wield.ts --part measure   # reproduces results.md numbers within tolerance (same core count → bit-identical)
grep -n 'Blocked by' .scratch/carry-forward/issues/350-two-hander-swap-leaves-worn-offhand.md   # none
```

All run from Bash at the repo root, one command per tool call, exit code read from the same command, artifacts inspected after.

## Out of scope

- Choosing ticket 350's fix (option 1 skip vs option 2 clear), editing `rank.ts`/`pool.ts`, or porting anything to the fork engine copy.
- Fixing ticket 362 (item-swap abort on the enhancement page) or using the tab for this measurement.
- Moving the wowsims pin, editing fork Go, or touching `vendor/tbc-new-fork`.
- Warrior or hunter fixtures — enh alone answers 350 step 1; the same script pattern can be reused later if 350 wants a second spec.
- A dedicated-`HandTypeOffHand` variant of arm B (the "stats apply, no swing" reading for shield/held items). Worth a follow-up ticket if Step 7 lands in the "drops the swing, keeps the stats" row; not measured here.
- Making `pnpm rank --spec enh` usable end to end (it would still need a recorded enh character), and any `wowsims-fork-parity` or shortlist test additions for enh.
- Re-measuring feral, ticket 355, `pre-merge-review`, `pnpm merge-to-dev`, or any merge into `dev`.
