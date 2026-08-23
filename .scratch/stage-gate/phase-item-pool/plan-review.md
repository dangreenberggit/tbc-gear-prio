# Plan review — phase-item-pool (round 1)

Reviewer seat (Opus), 2026-08-23, against plan commit `5be54f1`. Saved verbatim
by the orchestrator (the seat's output file was empty; text taken from its
final message).

VERDICT: revise

The approach is right and survives the attack you asked me to press hardest. The Q1 inversion is **not** rationalisation: the fork DB carries only `drop`/`crafted`/`rep` source kinds (2821/1113/111), while `data/universes/ret-p3.json` carries `raid, crafted, rep, token, unknown, pvp, badge, world`. Bloodlust Brooch 29383 resolves to `{kind: badge, cost: 41, origin: wowhead}` locally and to `sources: None` in the fork DB; Lightbringer Breastplate 30990 resolves to a two-hop token source locally and `None` in the fork. A wowsims-primary pool provably cannot state where a badge/PvP/token item comes from, which is half the brief's goal. I hunted the sources the planner might have missed — `tools/database/` (`atlasloot.go`, `overrides.go`, `dbc/`), `assets/db_inputs/atlasloot_db.json`, the `DifficultyVendor` enum — and found no wowsims-side carrier for those origins. The fork's own atlasloot input has only `drop`+`crafted` and does not contain any of the six probe items.

But the plan's arithmetic does not hold, and three steps would mislead the executor.

## Findings

| ID | Severity | Where | What breaks | Evidence |
| --- | --- | --- | --- | --- |
| F1 | blocking | C12, Approach ¶3, Step 4 brief ("C11/C12's numbers as the expected baseline") | Four of C12's five numbers do not reproduce. Step 4 hands these to a nested planner as the expected baseline, so a correct script will look broken and an executor may "fix" it until it reproduces wrong numbers. | Two independent runs importing `SPEC_PROFILES`/`eligible_d7` from `scripts/assemble_universe.py`: ret gap **977** (plan 914), phase-1 **830** (plan 730), phase-3-only **64** (plan 94); feral **1013** (plan 689), phase-3-only **69** (plan 57). Only "Rare p3 gap 0/0" reproduces. |
| F2 | blocking | C14, Step 1 acceptance, Step 2 | Drift is in **five** files, not two. Step 1's acceptance says `--check` "names `feral-p3.universe.json` (33 extra + 1 missing) and `ret-p3.universe.json` (1 missing)" — a correct eight-file check names five and fails that criterion. | `cmp` per file: ret-p2 SAME; ret-p3, ret-p4, ret-p5, feral-p2, feral-p3 DIFFER. Per-file: ret-p3 local-only `[29297]`; **ret-p4 local-only 1; ret-p5 local-only 2; feral-p2 fork-only 18**; feral-p3 fork-only 33 + local-only `[29297]`. Content-differing shared entries: 0 everywhere (that half of C14 stands). |
| F3 | material | Step 6, C26, Paths manifest | `assets/locales/en/translation.json` already violates `schemas/translation.schema.json`, which sets `additionalProperties: false` and does not list `upgrades_tab`. `npm run test:locales` therefore fails on this branch **today**, and it runs in fork CI (`.github/workflows/run_tests.yml:54`). Step 6 edits that file and adds a new key; the fork-check recipe (C26) is `type-check` + `lint` only, so the executor never sees it. | `python`: `keys in translation.json NOT in schema: ['upgrades_tab']`; `schema additionalProperties: False`. `grep -n 'test:locales' .github/workflows/run_tests.yml` → line 54. |
| F4 | material | Step 7 / C22 | The raid filter **hides every zoneless item** — badge, crafted, PvP, quest, rep gear vanishes whenever any raid is selected, because `matchesZone` requires `"zone" in s` and `zonesInPool` only emits zones for `raid`/`token` sources. Against the win condition "narrow to content I will actually run," a player selecting Black Temple loses their badge and crafted options silently. The plan neither states nor accepts this. It also changes which slot sub-tabs appear, since `slotsPresent` derives from `unfilteredView()` which still applies the same options. | `upgrades/engine/view.ts:58-60` (`matchesZone`), `pool.ts:161-170` (`zonesInPool` emits only for `raid`/`token` kinds); `upgrades_tab.tsx:640-717` single `applyView` call site feeding both `resultsContent` and `slotPaneContent`. `view.ts:66-80` already has `ZONELESS_SOURCE_LABELS`, so a labeled bucket is the available alternative. |
| F5 | material | C16, Step 4 acceptance | C16 says the four/five items are "absent only for lack of a recognized source route," but Swiftsteel Shoulders 32570 and Swiftstrike Shoulders 32581 **do** carry `crafted` sources in the fork DB. They are absent for a local assembler reason, not a missing source. Step 4's acceptance pins the unexplained section to "exactly the C16 items," so a correct listing that classifies these two under a crafted-route rule fails the criterion. | `python`: 32570 → `[{'crafted': {'profession': 2, 'spellId': 41133}}, …]`; 32581 → `[{'crafted': {'profession': 8, …}}]`. By contrast 32757, 32649, 31043 → `sources: NONE` (those three match C16). |
| F6 | minor | Approach, Q1 win condition | The wowsims-primary membership is defined as "Epic," silently dropping `quality: 5`. 18 legendaries exist, two of them phase 3 (Warglaives 32837/32838). None is ret/feral-relevant, so the exclusion is correct — but it is an unstated membership rule in a plan whose whole purpose is explainable membership. | `python`: quality distribution `{4: 3741, 3: 2644, 2: 1853, 5: 18, 1: 1}`; all 18 legendaries listed, none in ret-p3 or feral-p3. |
| F7 | minor | Step 6 | "Update every non-English locale file only if the fork's lint requires key parity" describes a situation that cannot arise: `assets/locales/` contains only `en`, and no parity gate exists (`test-locales.mjs` validates each file against a schema independently, no cross-locale comparison). Harmless, but it points the executor at the wrong gate — the real one is F3. | Single locale dir `assets/locales/en`; `test-locales.mjs` uses ajv per-file. Precedent `44c73690b` touched only en. |
| F8 | minor | C21 | `markStale` is subscribed to three emitters (`gearChangeEmitter`, `talentsChangeEmitter`, `sim.changeEmitter`), not `sim.changeEmitter` alone. Step 6 refreshes phase-named labels in that handler, so labels will also recompute on gear and talent changes — harmless, but the claim understates the trigger set. | `upgrades_tab.tsx:322-337` (`wireStalenessListeners`). |

Nothing in the plan pushes the fork, opens a PR, merges, flips `"pushed": false`, or edits pool membership silently — Out-of-scope explicitly forbids all of these, and Step 2 is a verbatim copy of repo-authored data. Step 4's "fail loudly, not skip" for `pool-listings:check` matches established precedent: `check_rep_tables.py` already reads `vendor/wowsims/db.json` and fails with a message naming `pnpm sync:wowsims:check` when it is absent, so a fresh clone already cannot pass `pnpm verify` without restore. That is the right behaviour and is consistent, not novel.

## Register verdicts

| Claim | Verdict | Evidence |
| --- | --- | --- |
| C1 | stands | Both `git status --porcelain` empty; fork HEAD `cfcdd7ea118641d3641550287006c3c730314fcd` = lockfile `commit`; branch `feat/upgrades-tab`. (Repo HEAD is `5be54f1ec`, not the base `733f6624f` the claim names — the branch has moved on; not a defect.) |
| C2 | stands | `data.ts:13-18` static universe imports; `upgrades_tab.tsx:360,458` `sim.getPhase()`; `:405` `filterPoolByPhase(...)`. |
| C3 | stands | `pool.ts:180,201,208`; `index.ts:70,71,75`. |
| C4 | stands | `ret-p3.json` 391 entries; `.report.json` keys include `phaseZones`, `excludedNoSource`, `membershipByOrigin`. |
| C5 | stands | `assemble_universe.py:28-47` — `db.json`, `phase_raids.json`, `atlasloot_sources.json`, `faction_ids.json`, `sim-implemented-effects.json`, `ep-weights-by-phase.json`; wowhead dirs at :274,:311. |
| C6 | stands | `PHASE_HEROIC_DUNGEONS:74`, `excluded_weapon_types:289,330`, `eligible_d7:596`, `stub_only_effect_ids:474`; `excludedNoSource` = 1297. |
| C7 | stands | `verify.yml` runs `sync:wowsims:restore` and `sync:atlasloot:restore` before `pnpm run verify`; no fork restore step. |
| C8 | stands | 8257 items, 74 zones. Source-kind census in the shipped DB: `drop` 2821, `crafted` 1113, `rep` 111 — no PvP variant, as claimed. |
| C9 | stands | `InferPhase` at `item_source_utils.go:11`; `proto/ui.proto` has no phase field in `DatabaseFilters`. |
| C10 | stands | 29383, 30990, 31042, 33762 all carry `phase` and `sources: None`; **285** phase-3 items have no sources (exact match). |
| C11 | stands | Both DBs 8257 items, zero ids in only one; exactly 3 phase disagreements (35317/35319/35320, local 4 vs fork 3); universe-vs-fork phase disagreements **0** for both ret-p3 (391 entries) and feral-p3 (366). |
| C12 | **refuted** | See F1 — four of five numbers wrong, reproduced twice independently. |
| C13 | stands | All nine zone ids resolve to the named canonical strings. |
| C14 | **refuted** (partly) | The two p3 numbers are right (33 fork-only in feral-p3; 29297 missing from both p3 copies) and "shared entries content-identical" is right, but the claim's scope is wrong — five files drift. See F2. |
| C15 | stands | 33750, 33671, 32489 all in `stubOnlyItemIds` (451 total). |
| C16 | **refuted** (partly) | 32757, 32649, 31043 are source-less as claimed; 32570 and 32581 carry crafted sources. See F5. |
| C17 | untestable | Depends on Step 4's unwritten listing. The classification categories are plausible but the count "0 unexplained raid drops" cannot be checked before the script exists — and F1/F5 make its baseline unreliable. |
| C18 | stands | All five ids match: 30902 p3, 28830 p1 (zone 3923 Gruul's), 30627 p2 (3607 SSC), 30046 p2 crafted, 34472 p5 heroic. |
| C19 | stands | `other.ts:13` `export const CURRENT_PHASE: Phase = Phase.Phase2;`; `common.phases.N` present. |
| C20 | stands | `grep -c 'this phase'` = exactly 2, at `prune.only_bis` and `assumptions.pool_bis_only`; `view.only_bis` exists and does not say "this phase"; `upgrades_tab.tsx:363` matches the quoted shape. |
| C21 | stands (imprecise) | Handler present at `:322-337`; subscribed to three emitters, not one. See F8. |
| C22 | stands | `ViewOptions.raid`/`boss` at `view.ts:34-35`, applied in `applyView` (`:162-183`); `zonesInPool` at `pool.ts:161`; `pnpm engine-port-drift:check` → "ok: 32 ported files match PROVENANCE.md", exit 0. Post-sim confirmed (`state.kind === 'done'`). Behavioural gap in F4. |
| C23 | stands | Recipe present verbatim at `measurements.md:1054-1075`. |
| C24 | stands | `STATUS-2026-08-23.md:30-36` records the re-pin + regen rule and that it "bit both times this run." |
| C25 | stands | `check_engine_port_drift.py:85-91` prints a skip message and `return 0` when `FORK_ROOT` is absent. |
| C26 | stands | `package.json:15` `format` = `lint:fix && fmt:fix` (a writer); `type-check` :24, `lint` :16. |
| C27 | stands | `STATUS-2026-08-23.md:155-156` — background tab took ~6 min to first sim vs 16 s fronted. |
| C28 | stands | `{{count}}` at lines 866, 900, 913, 971; `{{cap}}` at 912. |
| C29 | hypothesis, load-bearing only for a ticket | Correctly labelled untested. The plan routes it to an owner/SME question rather than acting on it, so the plan survives it being false. No finding. |
| C30 | hypothesis, survives | Correctly labelled untested; confirmed only at Step 7/8. The `currentViewOptions()` → `applyView` path is real (single call site at `upgrades_tab.tsx:640-717`), so the pattern claim is sound; F4 is the substantive issue, not this. |

## What revision needs

1. **Re-measure C12** with the committed script's own definition and put the real numbers in the plan and the Step 4 sub-brief — or drop the numeric baseline entirely and let Step 4's listing establish it, with the acceptance criterion phrased as a property (zero phase disagreements, zero unexplained raid drops) rather than a count to match.
2. **Restate C14 as five files** and rewrite Step 1's acceptance to name all five with their real deltas. Step 2's PROVENANCE update should record all five drift causes, not two.
3. **Add `npm run test:locales` to the fork check recipe** and decide Step 6's handling of the pre-existing schema violation — either extend `schemas/translation.schema.json` with `upgrades_tab` (which fixes a gate that is red today) or record the debt explicitly. As written, Step 6 touches the file without ever running the gate that governs it.
4. **Decide the zoneless-item question in Step 7** before building: either exclude zoneless items from the filter's scope (keep them always visible), or use the existing `ZONELESS_SOURCE_LABELS` bucket, or state that hiding them is intended. Add the rendered count of hidden badge/crafted items to Step 8's measurement (c).
5. **Correct C16** to separate "no source in the fork DB" (32757, 32649, 31043) from "has a source, excluded by a local rule" (32570, 32581), and loosen Step 4's acceptance from "exactly the C16 items" to a rule the listing can satisfy.
6. State the Epic-only membership restriction and why legendaries are excluded (F6); drop or replace the non-existent locale-parity instruction (F7).

The two-repo discipline, the gate design, the CI story, and the Q1 decision itself all survive scrutiny — this is a revise on measurement accuracy and three executor traps, not on the approach.

VERDICT: revise
