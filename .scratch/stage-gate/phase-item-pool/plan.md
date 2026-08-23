# Plan — phase-item-pool

## Goal

When this plan is done: (1) this repo carries a committed, re-runnable listing (`data/pool-listings/ret-p3.md`, `feral-p3.md`) that states, per item, why it is in or out of the phase-3 candidate pool, cross-checked item-by-item against the wowsims fork's own item database, with every wowsims-only item carrying a mechanical reason or an explicit "unexplained — owner question" flag, gated by a new `pool-listings:check` step in `pnpm verify`; (2) the fork's bundled universe copies byte-match `data/universes/` again and a new `fork-universes:check` gate fails when they drift (ticket 211 closes); (3) the Upgrades tab names the phase in plain words — the prune checkbox, BiS view filter, and assumptions drawer say "Phase 3", not "this phase" — and carries the page's own phase selector, bound to the same `sim` state so tab and page cannot disagree; (4) a post-sim raid filter narrows a completed shopping list by zone without re-simming. Nothing about ranking math changes; no pool membership changes beyond refreshing the fork's stale copies.

## Approach

**Membership stays local; wowsims becomes the auditor and the vocabulary.** The pool the tab sims keeps coming from this repo's assembled universes (bundled in the fork, as today). The wowsims item DB — which the owner asked to use "ideally" — becomes the primary for *phase* values, *zone naming*, and *completeness auditing*: a new listing script builds the wowsims-primary candidate membership (phase ≤ N, Epic, spec-eligible per the assembler's own `SPEC_PROFILES`), diffs it against the universe, and classifies every difference by a rule it can cite (weapon/hand exclusion, `eligible_d7` stat screen, stub-only sim effect, no recognized source route). What it cannot classify it lists as an owner question, never silently adds.

The strongest rejected alternative is making the wowsims DB primary for membership (the owner's stated ideal, Q1 candidate (a)). It loses on measured data, not preference: the fork DB records **no `sources` entry at all** for badge-vendor, PvP, and tier-token items (measured on Bloodlust Brooch 29383, the Vengeful Gladiator's weapons, and every Lightbringer/Thunderheart piece — C10), so a wowsims-primary pool could not say *where an item comes from*, which is half the goal; its phase-≤3 Epic membership for ret is 914 items, 730 of them phase-1 leftovers with no curation and no EP/bisTags (C12); and its phase→zone knowledge lives in Go tooling (`InferPhase`), not in anything the TS page can read (C9). The local universe already *is* a wowsims-derived pool — `vendor/wowsims/db.json` is its primary input (C5) — so "wowsims ideally, local as backup" is honored at the data level: wowsims values win wherever wowsims has them (phase: zero disagreements measured, C11; zone names: universe zone strings are canonical db.json `zones[].name` strings, C13), and the local assembly supplies only what wowsims lacks (sources for source-less items, curation, bisTags, EP).

### Open questions Q1–Q4

**Q1 — pool source on the site: candidate (c), hybrid with explicit per-field precedence, wins.**
Precedence rule: *membership and source metadata* — local universe; *phase* — wowsims DB (audited: the listing fails loudly on any disagreement; today there are zero, C11); *zone vocabulary* — wowsims `zones[].name` (already true by construction, C13); *completeness* — wowsims DB is the reference the universe is audited against.
- Dropped (a) wowsims-primary membership: no sources on badge/PvP/token items (C10), 914-item uncurated ret membership (C12), no TS-side phase→zone table (C9).
- Dropped (b) local-only with wowsims as commentary: leaves the owner's stated risk — a missing source — with no gate; the measured reverse gap is real (S3 ret PvP armor and the BT quest necks are absent, C15/C16), and only the wowsims cross-check finds the next one.
- Win condition (pre-stated): for ret-p3 and feral-p3, the committed listing prints both memberships and their symmetric difference; every universe-only item carries its source; every wowsims-only item carries a reason category or an "unexplained" flag; zero items flagged as phase-disagreement; every phase-3 **raid drop** in the wowsims-only set carries a reason (today all do: 1H/off-hand exclusions, `eligible_d7` failures, stub-only effects — C17).
- Measurement: `pnpm pool-listings:check` (regenerates and byte-compares) plus reading the two committed listings.

**Q2 — phase naming and selection: candidate (a) plus shared-state selector, wins.**
The tab's strings name the phase from `sim.getPhase()` rendered through the existing `common.phases.N` strings ("Phase 3 (2.2 - T6)", C20), and the tab mounts the existing `makePhaseSelector` (`ui/core/components/inputs/other_inputs.ts:77-88`) bound to the *same* `sim` — so it is the page's setting, surfaced, not an override. `sim.changeEmitter` already refreshes the tab's placeholder and stale banner on phase change (C21), so no new event plumbing.
- Dropped (b) tab-local phase override: a second phase state can silently disagree with the page's — exactly what the win condition forbids; and the Gear tab's selector modal already mounts the same picker (`gear_picker/item_list.tsx:218`), so the shared-state control is the established pattern.
- Win: no rendered string says "this phase"; prune checkbox, BiS filter, and drawer name the phase; changing the phase anywhere updates the tab.
- Measurement: rendered strings on a served page at phase 2 and phase 3 (Step 8).

**Q3 — zone/content filters: candidate (a) post-sim raid filter, wins; boss filter deferred.**
The fork's ported engine already carries everything: `ViewOptions.raid` and `matchesBoss` in `engine/view.ts:34-35,164-172` and `zonesInPool` in `engine/pool.ts:161` (C22). A raid `<select>` ("All raids" + `zonesInPool(pool)`) beside the existing view toggles, read through `currentViewOptions()`, filters a completed run with zero sim calls. Zone vocabulary matches wowsims' own naming by construction (C13).
- Dropped (b) pre-sim zone pruning: it changes which candidates are simmed, so narrowing costs a re-run — the win condition says "without re-simming". (The BIS prune is different: it exists to cut a 17-minute run, per the last stage.)
- Deferred: the boss sub-filter. Reason to record for the owner: `applyView` supports it, but ticket 35 (multi-zone items bucket arbitrarily) makes boss grouping misleading today, and the raid filter alone answers "content I will actually run". One ticket notes the deferral.
- Win: on a completed run, selecting a raid narrows the list to items with a source in that zone, instantly, reversibly.
- Measurement: rendered list on a completed run under each filter value (Step 8).

**Q4 — bundled vs runtime, and honesty gates.** Bundled: the universes and EP weights in the fork (static imports, unchanged — the page must work offline from its own dist, and the tab already works this way). Runtime: nothing new is fetched. Two gates keep the bundles honest: `fork-universes:check` (new; byte-compares all eight copied files against their `data/` sources; skips cleanly with a message when the gitignored clone is absent, same pattern as `check_engine_port_drift.py:87`) and `pool-listings:check` (new; regenerates the listings from `vendor/wowsims/db.json` + universes and byte-compares; CI-safe because `sync:wowsims:restore` restores `db.json` before `pnpm verify`, C7). One-command refresh: `python scripts/sync_fork_universes.py --write`.
- Win: `pnpm verify` fails when either bundled copy drifts; measured today it *would* fail (feral-p3 fork copy has 33 stale weapon rows and both p3 copies miss item 29297, C14) and passes after Step 2.

### What was checked and what could not be established (per brief question)

**Local:** all sources enumerated in C4–C6; exclusions enumerated in C6 (heroic allowlist, weapon-type excludes, `eligible_d7`, stub-only effects, `excludedNoSource`); known-gap tickets read (253 closed; 259, 173, 58, 17, 56, 89, 172, 211, 35, 59 open). **wowsims:** per-item fields, filter machinery, phase provenance established (C8–C10); *not established*: whether `InferPhase`'s "crafted ilvl 128–141 → phase 3" is right for items that actually shipped in patch 2.3 (Swiftsteel/Swiftstrike Shoulders carry phase 3 in the DB but are 2.3 recipes — SME question, Step 5 ticket). **Join:** established as the precedence rule above; *not established from data*: whether the four d7-eligible, non-stub, source-less gap items (Blessed Medallion of Karabor 32757, Medallion of Karabor 32649, Swiftsteel Shoulders 32570 / Swiftstrike Shoulders 32581, Thunderheart off-role pieces) *should* join the pools — Step 5 puts them to the owner instead of deciding. Also noted for the owner: upstream `CURRENT_PHASE` is still Phase 2 (C19), so a fresh page pools for phase 2 until the player moves the selector; making the tab default differently would diverge from wowsims' own statement and is not done here.

## Claims register

| ID | Claim | Load-bearing | Verified by |
| --- | --- | --- | --- |
| C1 | Repo branch `feat/phase-item-pool` at base `733f6624f41` is clean; fork clone on `feat/upgrades-tab` tip `cfcdd7ea1` is clean and matches the lockfile | yes | `git -C C:/Users/dgree/Code/lulz/tbc-gear-prio status --porcelain; git -C C:/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork rev-parse HEAD; python -c "import json;print(json.load(open('data/wowsims-fork.lock.json'))['commit'])"` |
| C2 | The tab's pool comes from bundled universe JSON (`upgrades/data/data.ts:13-23`), chosen per spec and best-phase ≤ `sim.getPhase()` (`data.ts:65-77`, `upgrades_tab.tsx:360,458`), then `filterPoolByPhase` cuts per-item | yes | `grep -n 'universe.json\|getPhase\|filterPoolByPhase' vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/data/data.ts vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx` |
| C3 | Local phase/zone machinery is `filterPoolByPhase` (inclusive `phase <= maxPhase`), `filterPoolByZone`, `zonesInPool` in `packages/core/src/pool.ts:180-217`, exported at `index.ts:69-79`; `applyView` raid/boss options in `packages/core/src/view.ts:12-29,314-368` | yes | `grep -n 'filterPoolByPhase\|zonesInPool' packages/core/src/pool.ts packages/core/src/index.ts` |
| C4 | Universe artifacts: `data/universes/{ret,feral}-p2/p3.json` (+ ret p4/p5), entries carry `itemId,name,slot,phase,quality,sources[{kind,zone,boss,origin}],bisTags,curatedSets,curationHint`; `.report.json` records `phaseZones`, `excludedNoSource`, `membershipByOrigin` | yes | `python -c "import json;u=json.load(open('data/universes/ret-p3.json'));print(len(u['entries']),sorted(u['entries'][0]))"` |
| C5 | The assembler's inputs are: `vendor/wowsims/db.json` (pinned via `data/wowsims.lock.json`, restored by `pnpm sync:wowsims:restore`), `data/atlasloot_sources.json`, `data/wowhead-lists/{ret,feral}`, `data/phase_raids.json` (zones + rep factions per phase), `data/faction_ids.json`, `data/sim-implemented-effects.json`, `data/presets/*/ep-weights` | yes | `grep -n 'db.json\|ATLASLOOT\|wowhead_dir\|phase_raids\|SIM_IMPLEMENTED_EFFECTS\|faction_ids' scripts/assemble_universe.py \| head -20` |
| C6 | Deliberate local exclusions: heroics outside `PHASE_HEROIC_DUNGEONS` (assemble_universe.py:64-74), per-spec `excluded_weapon_types` (ret: dagger/fist/staff, line 289; feral: druid-unusable types, line 330), non-2H off-hand rule and `eligible_d7` stat screen (lines 596-634), stub-only sim effects (`stub_only_effect_ids`, line 474), items with no recognized source route (`excludedNoSource`: 1297 at ret-p3) | yes | `grep -n 'PHASE_HEROIC_DUNGEONS\|excluded_weapon_types\|def eligible_d7\|stub_only_effect_ids' scripts/assemble_universe.py; python -c "import json;print(json.load(open('data/universes/ret-p3.report.json'))['excludedNoSource'])"` |
| C7 | CI restores the gitignored inputs before `pnpm verify` (`sync:wowsims:restore`, `sync:atlasloot:restore`), so a verify step reading `vendor/wowsims/db.json` is CI-safe; the fork clone is NOT restored in CI, so any fork-reading check must skip cleanly when absent | yes | `grep -n 'restore\|verify' .github/workflows/verify.yml` |
| C8 | Fork item DB: `assets/database/db.json` (8257 items) with per-item `phase` int, `quality`, `classAllowlist`, `sources[]` (`UIItemSource` oneof: crafted/drop/quest/soldBy/rep — no PvP variant, `proto/ui.proto:155-183`), plus `zones[]`/`npcs[]` name tables; PvP detection upstream is the name heuristic `isPVPItem` (`ui/core/proto_utils/utils.ts:1127`) | yes | `python -c "import json;db=json.load(open('vendor/tbc-new-fork/assets/database/db.json'));print(len(db['items']),len(db['zones']))"` |
| C9 | wowsims' phase-per-item is assigned at DB generation in Go (`tools/database/item_source_utils.go:11` `InferPhase`: raid zone-id → phase, crafted-ilvl bands, overrides in `tools/database/overrides.go`); no TS-side phase→zone table exists, and `DatabaseFilters` (proto/ui.proto:268-299) has no phase field — the Gear tab gates phase separately via `item_list.tsx:352` against `sim.getPhase()` | yes | `grep -n 'func InferPhase' vendor/tbc-new-fork/tools/database/item_source_utils.go; grep -n 'phase' vendor/tbc-new-fork/proto/ui.proto` |
| C10 | The fork DB records no `sources` for badge-vendor, PvP, and tier-token items: Bloodlust Brooch 29383, Vengeful Gladiator's weapons, Lightbringer 30990 and Thunderheart 31042 all have `phase` but empty/no `sources`; 285 phase-3 items have no sources at all | yes | `python -c "import json;db=json.load(open('vendor/tbc-new-fork/assets/database/db.json'));print([(i['id'],i.get('sources')) for i in db['items'] if i['id'] in (29383,30990,31042,33762)])"` |
| C11 | `vendor/wowsims/db.json` and the fork's `assets/database/db.json` differ in bytes but agree on membership (8257 = 8257, no id in only one) and on phase for all but 3 items (35317/35319/35320, local 4 vs fork 3); universe phases disagree with the fork DB on **zero** entries for ret-p3 and feral-p3 | yes | re-run the measurement as committed in Step 4's `scripts/list_phase_pool.py` (interim: the planner's scratch `measure.py`) |
| C12 | The wowsims-primary membership (phase ≤ 3, Epic, spec-eligible) minus the universe is 914 items for ret (730 of them phase 1) and 689 for feral; restricted to phase == 3 it is 94 (ret) / 57 (feral); Rare-quality phase-3 gap is 0 for both | yes | same script as C11; Step 4's committed listing reproduces the numbers |
| C13 | Universe zone strings are canonical fork-DB zone names by design (`data/phase_raids.json` specNote) and verified for all nine raid ids in `Player.RAID_IDS` (Karazhan/Gruul's Lair/Magtheridon's Lair/Tempest Keep/Serpentshrine Cavern/Hyjal Summit/Black Temple/Zul'Aman/Sunwell Plateau); "World Bosses" alone has no zone id (outdoor, AtlasLoot-only) | yes | `python -c "import json;db=json.load(open('vendor/tbc-new-fork/assets/database/db.json'));z={x['id']:x['name'] for x in db['zones']};print([z[i] for i in (3457,3923,3836,3845,3607,3606,3959,3805,4075)])"` |
| C14 | The fork's bundled copies have drifted from `data/universes/`: both p3 copies miss item 29297 (Band of the Eternal Defender, shipped locally in `5cf0ea0`), and feral-p3.universe.json carries 33 stale weapon/shield rows removed locally by `5c42a37` ("Exclude weapon types a druid cannot equip"); ret-p3 fields otherwise byte-identical | yes | `python -c "import json;a={e['itemId'] for e in json.load(open('data/universes/feral-p3.json'))['entries']};b={e['itemId'] for e in json.load(open('vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/data/feral-p3.universe.json'))['entries']};print(len(b-a),sorted(a-b))"` |
| C15 | Ticket 89's gap is measurable and partially explained: ret's Vengeful Gladiator's Scaled armor and feral's Dragonhide gloves are in the wowsims-only set, and the pieces checked are `stubOnlyItemIds` members (excluded because their effect exists only as a TODO stub in the fork's Go tree) | no | `python -c "import json;s={x['itemId'] for x in json.load(open('data/sim-implemented-effects.json'))['stubOnlyItemIds']};print(33750 in s, 33671 in s, 32489 in s)"` |
| C16 | Four wowsims-only phase-3 items pass `eligible_d7`, are not stub-only, and are absent only for lack of a recognized source route: Blessed Medallion of Karabor 32757 (quest, no zone), Swiftsteel Shoulders 32570 / Swiftstrike Shoulders 32581 (crafted), Thunderheart pieces without two-hop coverage (e.g. 31043) — membership question for the owner, not decided here | no | Step 4's listing classifies them from `scripts/assemble_universe.py`'s own `SPEC_PROFILES`/`eligible_d7`; interim: the classification run recorded in this plan |
| C17 | Every phase-3 **raid drop** in the wowsims-only sets carries a mechanical reason today: 1H/off-hand/caster items fail `eligible_d7` or the hand rule (e.g. Hammer of Judgement 34009 d7=False, Halberd of Desolation 32248 excluded — druids cannot use polearms in TBC per `5c42a37`), the rest are stub-only | no | Step 4's listing, "raid drops" section: unexplained-count printed per spec, acceptance requires 0 |
| C18 | Concrete-item agreement checks: Cataclysm's Edge 30902 (both: phase 3, Hyjal/Archimonde), Dragonspine Trophy 28830 (both: phase 1, Gruul), Tsunami Talisman 30627 (both: phase 2, SSC), Belt of the Black Eagle 30046 (both: phase 2, crafted LW), Shard of Contempt 34472 (both: phase 5, heroic MgT) — no membership/phase disagreement found on any checked item | no | `python -c "import json;db=json.load(open('vendor/tbc-new-fork/assets/database/db.json'));print([(i['id'],i['phase']) for i in db['items'] if i['id'] in (30902,28830,30627,30046,34472)])"` and the same ids in `data/universes/*.json` |
| C19 | The page's phase default is `CURRENT_PHASE = Phase.Phase2` (`ui/core/constants/other.ts:13`); the selector strings are `common.phases.N` ("Phase 3 (2.2 - T6)"); `data/wowsims.lock.json` mirrors it (`currentPhase: 2`, `defaultMaxPhase: 2`) | yes | `grep -n 'CURRENT_PHASE' vendor/tbc-new-fork/ui/core/constants/other.ts; grep -n '"phases"' -A 7 vendor/tbc-new-fork/assets/locales/en/translation.json` |
| C20 | The three "this phase"/unnamed-phase strings are `upgrades_tab.prune.only_bis` ("Sim only BiS-list items (this phase)"), `upgrades_tab.assumptions.pool_bis_only` ("BiS-list items for this phase"), and the bare-number `assumptions.max_phase` row; the BiS-checkbox availability condition is `setPruneAvailable(poolFor(specId, maxPhase).some(e => bisTags))` at `upgrades_tab.tsx:363` | yes | `grep -n 'this phase' vendor/tbc-new-fork/assets/locales/en/translation.json; sed -n 360,376p vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx` |
| C21 | Phase changes already reach the tab: `sim.changeEmitter` fans in phase changes and the tab's `markStale` handler calls `refreshCandidatesPlaceholder()` (`upgrades_tab.tsx:332-336`), so new phase-named labels can refresh in the same handler without new subscriptions | no | `sed -n 318,340p vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx` |
| C22 | The fork's ported engine already supports the raid filter: `ViewOptions.raid`/`boss` (`upgrades/engine/view.ts:34-36`, applied at 164-172) and `zonesInPool` (`upgrades/engine/pool.ts:161`); adding a raid select touches only tab UI code, keeping the 32-file drift gate green | yes | `grep -n 'raid?\|zonesInPool' vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/view.ts vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/pool.ts; pnpm engine-port-drift:check` |
| C23 | Build rule: any rebuild uses the corrected recipe in `.scratch/stage-gate/finish-the-tab/measurements.md:1054-1075` — protoc, `GOOS=js GOARCH=wasm go build` (never optional), workers, vite, cwd the fork after fnm; verify the engine via `Worker[0] Ready, isWasm: true`, verify bundles by gear-set item id, never a source identifier | yes | `sed -n 1054,1076p .scratch/stage-gate/finish-the-tab/measurements.md` |
| C24 | After any fork commit, `data/wowsims-fork.lock.json` must be re-pinned and `data/sim-implemented-effects.json` regenerated in the same sitting (it is keyed on the fork commit; stale-artifact check fails otherwise — bit twice last stage) | yes | `python scripts/generate_sim_implemented_effects.py` then `pnpm verify`; STATUS-2026-08-23.md:32-36 |
| C25 | `check_engine_port_drift.py` skips cleanly (exit 0, message) when the fork clone is absent — the pattern the two new checks copy for CI-safety | yes | `sed -n 85,95p scripts/check_engine_port_drift.py` |
| C26 | `npm run format` in the fork is a writer over ~693 files and must not run; fork checks are `type-check` and `lint` only, plus Go tests via make | yes | STATUS-2026-08-23.md:150-154; `grep -n '"type-check"\|"lint"' vendor/tbc-new-fork/package.json` |
| C27 | The served-page measurement (Step 8) needs a foregrounded browser tab; a background tab is throttled and is not a measurement surface | yes | STATUS-2026-08-23.md:155-156 |
| C28 | The i18n runtime supports interpolation (`{{count}}`, `{{cap}}` already used by `upgrades_tab.candidates_placeholder` and `candidate_cap_note`), so "Phase {{phase}}" labels need no new mechanism | no | `grep -n '{{cap}}\|{{count}}' vendor/tbc-new-fork/assets/locales/en/translation.json` |
| C29 | Swiftsteel/Swiftstrike Shoulders are patch-2.3 recipes yet carry `phase: 3` in the fork DB via `InferPhase`'s crafted-ilvl band — a possible upstream phase error | no | hypothesis, untested (SME/owner question raised by Step 5's ticket; the crafted band is at `tools/database/item_source_utils.go:47-49`) |
| C30 | The raid-filter UI can reuse the existing view-control refresh path (`currentViewOptions()` → `applyView`) with no persistence, matching the set-potential/BiS-only toggles' pattern | no | hypothesis, untested (pattern read at `upgrades_tab.tsx:729-770`; confirmed only when Step 7's fork type-check passes and Step 8 shows the filtered list) |

## Steps

Serial, single executor, main checkout only (the fork clone exists nowhere else). "Fork" commits go to `vendor/tbc-new-fork` branch `feat/upgrades-tab`; "repo" commits to `feat/phase-item-pool`. Fork checks per fork commit: `npm --prefix <fork> run type-check && npm --prefix <fork> run lint` (never `format`, C26). `pnpm verify` per repo commit.

**Step 1 — repo: write `scripts/sync_fork_universes.py`.**
Modes: `--check` (byte-compare the eight files in the fork's `upgrades/data/PROVENANCE.md` table — six universes, two EP-weight files — against their `data/` sources; exit 1 with a per-file diff summary on drift; exit 0 with a skip message when `vendor/tbc-new-fork` is absent, per C25) and `--write` (copy verbatim). Do **not** add it to `verify` yet (the check would fail before Step 2 refreshes the copies, C14). Commit (repo).
*Acceptance:* `python scripts/sync_fork_universes.py --check` exits 1 today and names `feral-p3.universe.json` (33 extra + 1 missing) and `ret-p3.universe.json` (1 missing); `pnpm verify` green. Depends: C7, C14, C25.

**Step 2 — fork: refresh the bundled copies.**
Run `python scripts/sync_fork_universes.py --write`; update the "Refresh" section of `ui/core/components/individual_sim_ui/upgrades/data/PROVENANCE.md` (date, source repo commit, the two drift causes from C14). Fork type-check + lint green. Commit (fork).
*Acceptance:* `python scripts/sync_fork_universes.py --check` exits 0; `git -C vendor/tbc-new-fork status --porcelain` empty after commit. Depends: C14, C26.

**Step 3 — repo: wire the gate and re-pin.**
Add `"fork-universes:check": "python scripts/sync_fork_universes.py --check"` to `package.json` and append it to the `verify` chain. Re-pin `data/wowsims-fork.lock.json` to the Step 2 fork commit and regenerate `data/sim-implemented-effects.json` (C24). Close ticket 211 (`.scratch/carry-forward/issues/211-*.md` status line + closing note citing the check). Commit (repo).
*Acceptance:* `pnpm verify` green including the new step; lockfile commit equals `git -C vendor/tbc-new-fork rev-parse HEAD`; `pnpm issues:open | grep -c 211` → 0. Depends: C1, C24.

**Step 4 — repo: the pool listing and its gate. `nested-plan`.**
This is the stage's largest and riskiest piece; the executor spawns a nested planner with a sub-brief at `.scratch/stage-gate/phase-item-pool/nested/pool-listing/brief.md` containing: the Q1 precedence rule verbatim; the reason-category list (a. per-spec weapon/hand exclusion from `SPEC_PROFILES`; b. `eligible_d7` False; c. stub-only effect id; d. class allowlist; e. no recognized source route — the ticket-17 bucket; f. unexplained); the requirement to import `SPEC_PROFILES`, `eligible_d7`, and the stub-list loader **from `scripts/assemble_universe.py`** rather than re-implementing them (one model, per the brief's simple-code rule); and C11/C12's numbers as the expected baseline.
Deliverables: `scripts/list_phase_pool.py`; committed `data/pool-listings/ret-p3.md` and `feral-p3.md` (each: source inventory with pins; full membership table with per-item source and origin; wowsims cross-check — phase disagreements, ids absent from the fork DB; the wowsims-primary membership definition and the classified symmetric difference; an "unexplained" section, and a "phase-3 raid drops lacking a reason" count); `"pool-listings:check"` (regenerate + byte-compare, reading `vendor/wowsims/db.json` — CI-safe per C7; must fail loudly, not skip, when `db.json` is absent, since CI restores it) appended to `verify`. Commit (repo).
*Acceptance:* `pnpm pool-listings:check` exits 0; the ret-p3 listing's phase-disagreement count is 0 and its "raid drops lacking a reason" count is 0; the unexplained section lists exactly the C16 items (or fewer, each removal justified in the listing itself); `pnpm verify` green. Depends: C4–C13, C16, C17.

**Step 5 — repo: ADR, tickets, owner questions.**
Write `docs/adr/0028-pool-membership-precedence-local-universe-primary-wowsims-audits.md` (the Q1 rule, its measured grounds C10–C12, and the two gates). Annotate tickets 89, 17, 173 with the listing's evidence (89: the stub-only explanation for PvP armor, C15; 17/173: the listing is now the detector the tickets asked for — say what remains open). Open one ticket for the C16 membership questions (owner decision) and one recording the Q3 boss-filter deferral reason. Commit (repo).
*Acceptance:* files exist; `pnpm issues:open` shows the two new tickets; every causal claim in the ADR cites a command (durable-claims rule); `pnpm verify` green. Depends: C15, C16, C29.

**Step 6 — fork: phase naming and selector (Q2).**
In `upgrades_tab.tsx` + `assets/locales/en/translation.json`: reword `prune.only_bis` → "Sim only Phase {{phase}} BiS-list items", `view.only_bis` → "Only items on a Phase {{phase}} BIS list", `assumptions.pool_bis_only` → "BiS-list items for Phase {{phase}}"; render `assumptions.max_phase`'s value via `common.phases.N`; add an `assumptions.pool_universe` row naming the universe file and entry count the run used (explainability goal). Refresh the label texts inside the existing `markStale`/`refreshCandidatesPlaceholder` path (C21). Mount `makePhaseSelector(container, this.simUI.sim)` in the tab's controls row (shared state, C19). Update every non-English locale file only if the fork's lint requires key parity — otherwise English only, matching how tranche 1 handled new keys (check `git -C <fork> show 44c73690b --stat` for the precedent and do likewise). Fork checks green. Commit (fork).
*Acceptance:* `grep -c 'this phase' vendor/tbc-new-fork/assets/locales/en/translation.json` → 0; `grep -n 'makePhaseSelector' upgrades_tab.tsx` → 1; type-check + lint green. Depends: C19–C21, C28.

**Step 7 — fork: post-sim raid filter (Q3).**
Add a raid `<select>` beside the BiS-only toggle: options "All raids" (value `all`) + `zonesInPool(pool)` in the pool's order; value read in `currentViewOptions()` as `raid`; hidden until a run completes, reset on spec change; no persistence (same lifecycle as the other view controls). Engine files untouched (C22). Fork checks + `pnpm engine-port-drift:check` green. Commit (fork).
*Acceptance:* `grep -c 'upgrades-raid-filter' upgrades_tab.tsx` ≥ 2; `git -C <fork> diff HEAD~1 --stat` shows no `upgrades/engine/` file; drift gate still reports 32 ported files. Depends: C22, C30.

**Step 8 — fork build + served-page measurement. Stop-and-report gate.**
Build with the corrected recipe (C23), serve `dist/tbc`, front the browser tab (C27 — if the tab cannot be fronted, stop and report exactly as last stage did rather than measuring a throttled page). Record in `.scratch/stage-gate/phase-item-pool/measurements.md`: (a) rendered prune/view/drawer strings at phase 2 and at phase 3 (Q2 measurement — no "this phase" anywhere, phase named); (b) moving the Gear tab's phase selector and the Upgrades tab's selector each updates the other's display (shared state); (c) one completed feral prune-on run (the ~61 s cell) and the rendered list under raid filter = each zone and back to All (Q3 measurement — instant, reversible, counts quoted); (d) `Worker[0] Ready, isWasm: true` console line quoted. No repo or fork commit from this step except the measurements file (repo, committed in Step 9).
*Acceptance:* measurements.md carries (a)–(d) with quoted strings/counts, or a stop-report naming the blocker. Depends: C23, C27.

**Step 9 — repo: close out.**
Re-pin `data/wowsims-fork.lock.json` to the final fork tip; regenerate `data/sim-implemented-effects.json` (C24). Write the dated `docs/verification-log.md` entry with one line per brief goal line (listing + gate; phase named / Q2 built; Q3 built; refresh command + gates), each citing its command or measurement. Replace `.scratch/handoffs/wowsims-tab/STATUS-2026-08-23.md` with `STATUS-<date>.md` (delete the old one; carry forward the owner-decisions and traps sections, updated). Commit measurements.md and everything above (repo). `pnpm verify` green.
*Acceptance:* the Verify recipe below passes end to end. Depends: C1, C24.

## Paths manifest

**This repo (`feat/phase-item-pool`)**
- `scripts/sync_fork_universes.py` (Step 1)
- `scripts/list_phase_pool.py` (Step 4)
- `data/pool-listings/ret-p3.md`, `data/pool-listings/feral-p3.md` (Step 4)
- `package.json` (`fork-universes:check` Step 3; `pool-listings:check` Step 4)
- `data/wowsims-fork.lock.json`, `data/sim-implemented-effects.json` (Steps 3, 9)
- `docs/adr/0028-pool-membership-precedence-local-universe-primary-wowsims-audits.md` (Step 5)
- `.scratch/carry-forward/issues/211-*.md` (close, Step 3), `89-*.md`, `17-*.md`, `173-*.md` (annotate, Step 5), two new issue files (Step 5)
- `.scratch/stage-gate/phase-item-pool/nested/pool-listing/brief.md` and `plan.md` (Step 4)
- `.scratch/stage-gate/phase-item-pool/measurements.md` (Steps 8–9)
- `docs/verification-log.md` (Step 9)
- `.scratch/handoffs/wowsims-tab/STATUS-2026-08-23.md` (delete), `STATUS-<date>.md` (create) (Step 9)

**Fork clone (`vendor/tbc-new-fork`, `feat/upgrades-tab`)**
- `ui/core/components/individual_sim_ui/upgrades/data/*.universe.json` (Step 2, refresh only — content authored in this repo)
- `ui/core/components/individual_sim_ui/upgrades/data/PROVENANCE.md` (Step 2)
- `ui/core/components/individual_sim_ui/upgrades_tab.tsx` (Steps 6–7)
- `assets/locales/en/translation.json` (+ other locales only if key-parity lint demands, Step 6)
- `dist/` — build output, gitignored, never committed (Step 8)

No partition: single executor, serial; Steps 2–3 and 6–9 interleave the two repos in one sitting and the fork exists only here.

## Verify recipe

```bash
# this repo
cd /c/Users/dgree/Code/lulz/tbc-gear-prio
pnpm verify                                            # exit 0, now incl. the two new checks
pnpm fork-universes:check                              # exit 0
pnpm pool-listings:check                               # exit 0
grep -c 'Unexplained' data/pool-listings/ret-p3.md     # >= 1 (the section exists; its items match Step 4 acceptance)
grep -n 'phase-disagreements: 0' data/pool-listings/ret-p3.md data/pool-listings/feral-p3.md
test "$(git -C vendor/tbc-new-fork rev-parse HEAD)" = "$(python -c "import json;print(json.load(open('data/wowsims-fork.lock.json'))['commit'])")" && echo lockfile-matches
git status --porcelain                                 # empty
pnpm issues:open | grep -c ' 211 '                     # 0
ls docs/adr/0028-*.md
grep -n 'phase-item-pool' docs/verification-log.md     # the new entry
ls .scratch/handoffs/wowsims-tab/STATUS-*.md           # exactly one file

# fork clone
F=/c/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork
git -C $F status --porcelain                           # empty
npm --prefix $F run type-check && npm --prefix $F run lint    # green; do NOT run format (C26)
grep -c 'this phase' $F/assets/locales/en/translation.json    # 0
grep -c 'makePhaseSelector' $F/ui/core/components/individual_sim_ui/upgrades_tab.tsx   # 1
grep -c 'upgrades-raid-filter' $F/ui/core/components/individual_sim_ui/upgrades_tab.tsx  # >= 2
pnpm engine-port-drift:check                           # "ok: 32 ported files"
```

Plus `.scratch/stage-gate/phase-item-pool/measurements.md` carrying Step 8's (a)–(d) with quoted rendered strings at phase 2 and phase 3, or an explicit stop-report.

## Out of scope

- Any pool **membership** change beyond refreshing the fork's stale copies: the C16 items, ticket 89's stub-gated PvP armor, and the `excludedNoSource` backlog go to the owner via Step 5's tickets, not into the universes.
- Ranking math, iteration counts, the weighted set-bonus variant, new specs, the boss sub-filter (deferred with a recorded reason), pre-sim zone pruning.
- Changing the page's default phase or upstream's `CURRENT_PHASE`; regenerating `data/universes/**` (ticket 172's generator-vs-artifact gate stays open — it is a different check than the two added here).
- Pushing the fork, opening a PR, flipping `"pushed": false`, rebasing onto upstream, ticket 251.
- Editing `AGENTS.md`, `CLAUDE.md`, or any skill file.
