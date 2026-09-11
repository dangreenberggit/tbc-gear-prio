# Plan — reforge-catchup-leftovers (revision 2)

Branch `feat/reforge-catchup-leftovers`, based on `dev` @ `66ab791f3f6dbad133d264d400a0a24328e71e56`. Repo root `C:\Users\dgree\Code\lulz\tbc-gear-prio` (below: `R`). Fork clone `R\vendor\tbc-new-fork` (below: `F`), on `feat/upgrades-tab` @ `6ef5679888430118895d59043e81e542d61c7527`, pinned by `R\data\wowsims-fork.lock.json`.

Revision notes (findings from `plan-review.md`, each addressed in the body and in the register): F1 → Q1 recorded as unmeasurable from committed inputs (C13, C27); the feral probe is withdrawn, not repaired. F2 → C12 restated with the repo's own numbers (~1e-12 DPS across core counts; noise floor 7.01 DPS at 3000 iterations) and no exact-equality test remains. F3 → C17's conclusion dropped; Step 6 fetches `upstream` and re-measures, with a pre-written "provenance unestablished" outcome. F4 → Step 4 records the delta-column finding only; no option is selected. F5 → Step 2 restores the 467-item and header checks. F6 → ticket 362 says "run but never recorded". F7 → C5 restated. F8 → ticket 363 carries exposure and candidate fixes only. F9 → serial-execution claim unchanged.

## Goal

When this plan is done: (1) there is a written, evidenced answer to whether the merged fork tab builds with `vite build` and runs a sim interactively on the ret page and on the enhancement page, recorded as ticket 362 (closed if it passes, open defect if not), which also records what ran during the catch-up but was never written to a repo file; (2) ticket 350 records that Q1 cannot be measured from committed inputs (no dual-wield skeleton or request fixture), records the reading-only findings with that label, records that the `statDeltaBetween` column overstates for a two-hander row regardless of what the engine does, selects no option, and is `Blocked by: 365`; (3) ticket 351 records the Q2 answer (the two stones give identical melee bonuses, so `sim/druid/forms.go` `weaponImbueFlatDamage` is the defect) and the decision not to mirror `adjustWeaponImbueID`, and the over-asserting `disclosure.ts` sentence is corrected in both engine copies with the ported-engine cycle done; (4) tickets 362, 363 (candidate-cap exposure), 364 (`forms.go` stone id check, provenance stated as measured or as unestablished) and 365 (no committed dual-wield request fixture) exist with `NEXT` advanced in the same commits; (5) `pnpm verify` is green on the branch tip.

## Approach

**Measure first, code conditionally — and where nothing can be measured, write that down instead of engineering around it.** Jobs 1–3 are investigations; the only code on this branch is the one-sentence `disclosure.ts` correction and its test. No ticket 350 code lands: its step 1 (one composed dual-wield request) cannot be run from committed inputs, and the brief forbids a patch before a measurement.

**Q1 — why it is unmeasurable here (C13, C27, C28).** Ticket 350 is reachable only for `DUAL_WIELD_SPECS` = rogue, enh, warrior, hunter (`R\packages\core\src\pool.ts`, grep `DUAL_WIELD_SPECS`; the comment above it says ret and feral are excluded deliberately). The only committed request fixtures are `feralCatDruid` and `retributionPaladin` (C13), and the only skeleton `cli-wiring.ts` can load is `data/presets/feral/p2.raid-sim-skeleton.json` (C27). A request for an enh/warrior/hunter player would have to be hand-authored — from the fork's UI presets (`F\ui\shaman\enhancement\gear_sets\p1.gear.json` wears 28308 in both hands, C28) or from scratch — which is the "ticket 106 style" request that `packages/core/test/direct-sim-support.ts` warns does not describe what `rank.ts` sends. So the stat half and the swing half of Q1 are both recorded as **unmeasurable from committed inputs**, and ticket 365 files the missing fixture. What *can* be observed without hand-authoring is the live enhancement page in Step 2: the tab composes two-hander candidates for enh itself, so a **rejects** outcome shows up there as a run error or missing rows. That observation is recorded as partial (it separates rejects from not-rejects; it cannot separate drops from counts).

**Rejected alternative for Q1 (the first plan's probe):** write an off-hand item into the feral fixture's index 15 and compare seeded runs. Rejected because the spec is wrong — feral never composes an off hand, so the result describes the Go equip layer's handling of an arbitrary proto, not our path (review F1). It also relied on exact equality, which this repo has already measured as false across core counts (C12).

**Rejected alternative for Q1 (measure on the fork's enh preset):** compose a request from `p1.gear.json` with a 2H written into index 14. Rejected for the same hand-authoring reason; it is the right *shape* for the future fixture and is named in ticket 365 as the source to build from.

**What a future measurement must look like (recorded in 365 so it is not lost):** at the fixture's 3000 iterations the 3σ noise floor is `3·127.966/√3000 = 7.01 DPS` (C12), so a stat-only off-hand delta cannot be resolved; the effect must be the off-hand *swing* (a 1H+OH set vs the same set with a 2H in the main hand and the OH left in place), compared with a tolerance, and iterations raised until the floor is well under the expected effect.

**Rejected alternative for Job 1:** `make host` as the handoff recipe. It depends on `air` when `WATCH=1` and never exits; `make dist/tbc/.dirstamp` builds the same tree (C4) and terminates, and the current `dist/` predates the merge commit (C5), so the build must be re-run anyway.

**Rejected alternative for 351:** mirror `adjustWeaponImbueID` now. Rejected because with `forms.go:52` unchanged a dagger candidate rewritten to 29453 loses the +12 paw bonus that blunt candidates keep — two candidates in one slot under different damage models (ticket 351 § "What that means", C16).

## Claims register

| ID | Claim | Load-bearing | Verified by |
| --- | --- | --- | --- |
| C1 | `NEXT` reads 362 and no `362-*` file exists. | yes | `cat R/.scratch/carry-forward/issues/NEXT` → `362`; `ls R/.scratch/carry-forward/issues/ \| grep -c '^362-'` → `0` (run 2026-09-10) |
| C2 | Numbering procedure is the conjunction: read `NEXT`, confirm no file uses it, file, write the bump back in the same commit. `issue-tracker.md` says NEXT is the authority; `known-traps.md` § "Before filing a ticket" says listing is. Ticket 352 is open on the contradiction. | no | `sed -n 20,28p R/docs/agents/issue-tracker.md`; `sed -n 107,115p R/docs/agents/known-traps.md`; research-notes R3 |
| C3 | GNU Make 4.4.1 at `C:\Users\dgree\AppData\Local\Microsoft\WinGet\Packages\ezwinports.make_Microsoft.Winget.Source_8wekyb3d8bbwe\bin\make.exe`; the GnuWin32 3.81 silently resolves empty file lists. | yes | brief.md § Constraints (measured there: 506/176/89 files for `UI_SRC`/`TS_CORE_SRC`/`ASSETS_INPUT`). Re-check: `"<path>/make.exe" --version` prints 4.4.1 |
| C4 | `make dist/tbc/.dirstamp` builds `dist/tbc/` (`lib.wasm.gz`, `api.ts`, assets, `bundle/.dirstamp` → `tsc --noEmit`, `vite.build-workers`, `npx vite build`) without `air`; `host` (`makefile:296`) lists `air` directly, and the `air` recipe is inside `ifeq ($(WATCH),1)` (`:152-159`). | yes | `sed -n 18,40p F/makefile`; `sed -n 150,160p F/makefile`; `sed -n 294,300p F/makefile`; research-notes R2; review § "On the `air` question" |
| C5 | Current `F/dist/tbc/` predates the merge: `lib.wasm.gz` stamped Sep 10 11:07, `index.html` 13:12, merge commit `16f8fba` 13:25. The prior browser load therefore ran against a bundle whose wasm was two hours older than its html. | no | `ls -la --time-style=+%H:%M F/dist/tbc/lib.wasm.gz F/dist/tbc/index.html`; `git -C R log -1 --format=%ad --date=format:%H:%M 16f8fba` (run 2026-09-10) |
| C6 | The vite base is `/tbc/`; `make host` serves `dist/..` with `http-server`, so a static server rooted at `F/dist` answers `http://localhost:<port>/tbc/paladin/retribution/`. Built spec dirs exist: `dist/tbc/paladin/retribution`, `dist/tbc/shaman/enhancement`, `dist/tbc/warrior/dps`, `dist/tbc/hunter/dps`. | no | `grep -n "base:" F/vite.config.mts` → :101; `sed -n 296,300p F/makefile`; `ls F/dist/tbc/paladin F/dist/tbc/shaman F/dist/tbc/warrior F/dist/tbc/hunter`. Whether `python -m http.server` serves `lib.wasm.gz` in a form the worker accepts: **hypothesis, untested** — the catch-up's browser load used "a static server on the built dist" (HANDOFF-leftovers.md:83-86) and loaded; fall back to `make host` (air, :8081) if the page cannot load the wasm |
| C7 | Tab registration is in `F/ui/core/individual_sim_ui.tsx` (`addUpgradesTab` :439-440), so every spec page gets the tab. | no | research-notes R2; `grep -n "addUpgradesTab" F/ui/core/individual_sim_ui.tsx` |
| C8 | Pinned CLI binary exists and reports the pin: `R/vendor/wowsimcli-ec5c5f205e61049d730e460967f8488774a7fe2a-win32-x64/wowsimcli-windows.exe version` → `ec5c5f205e61049d730e460967f8488774a7fe2a`, rc 0. Not used by any step in this revision; kept because ticket 365 names it as the runner for the future fixture. | no | run 2026-09-10; `grep -n '"sim", "--infile"' R/packages/core/src/seams/cli-sim-runner.ts` → :55 |
| C9 | The feral fixture's main hand (index 14) is 28658, `handType` 4; index 15 is empty; `simOptions` = `{iterations: 3000, randomSeed: "42"}`. The fixture player key is `feralCatDruid`. | no | `python -c "import json;d=json.load(open('R/test/fixtures/shredzepelin-cat.raid-sim-request.json'));p=d['raid']['parties'][0]['players'][0];print(d['simOptions'],[i.get('id') for i in p['equipment']['items']],[k for k in p if k.endswith('Druid')])"`. Withdrawn as a Q1 input (review F1); retained only as the numbers behind C12 |
| C10 | Item 13385 (Tome of Knowledge) is an off-hand (`weaponType` 5) with +8 Str/Agi/Sta/Int; highest-Agility off-hand in the index. | no | `python -c "import json;d=json.load(open('R/data/items/index.json'));print(d['13385'])"`. Withdrawn as a probe input; its +8 Agi is the effect size C12 shows to be unresolvable |
| C11 | The committed feral result has `raidMetrics.dps.avg = 2152.0765440146747`, `stdev = 127.9659250680645`, `iterationsDone 3000`. | yes (for C12's arithmetic) | `python -c "import json;m=json.load(open('R/test/fixtures/shredzepelin-cat.raid-sim-result.json'))['raidMetrics']['dps'];print(m['avg'],m['stdev'])"` |
| C12 | **Restated (review F2).** Same seed + same `simVersion` + same core count → bit-identical; across core counts the sim splits iterations over `runtime.NumCPU()` shards and results agree only to ~1e-12 DPS (`docs/plans/compute-topology.md:177`: "No, bit-identical — but equal to ~1e-12 DPS"; standing rule :207-209: live-binary float assertions use `toBeCloseTo`). Separately, at 3000 iterations the 3σ floor on the mean is `3·127.966/√3000 = 7.01 DPS`, so a +8 Agility off-hand on a ~2152 DPS character cannot be resolved by any A-vs-B comparison at that iteration count. No exact-equality test remains in this plan. | yes | `sed -n 174,178p R/docs/plans/compute-topology.md`; `sed -n 205,210p` same file; `python -c "print(3*127.9659250680645/3000**0.5)"` → `7.009…`; C11 |
| C13 | No committed dual-wield skeleton or request fixture exists: `R/data/presets/{enh,warrior,hunter}` hold only `*.ep-weights.json`; `R/test/fixtures/*.raid-sim-request.json` are `feralCatDruid` and `retributionPaladin`. | yes | `ls R/data/presets/enh R/data/presets/warrior R/data/presets/hunter`; `ls R/test/fixtures/`; Explore researcher this session (player keys by `python -c`) |
| C14 | The engine enables off-hand swings on `options.OffHand.SwingSpeed != 0` (`F/sim/core/attack.go:441`) with no main-hand hand-type check at that site; `newWeaponFromItem` (:74-93) only uses `HandTypeTwoHand` for normalized speed. Reading suggests "counts" for a 2H+OH weapon pair. Recorded as reading, not measurement. | no | `grep -n "IsDualWielding" F/sim/core/attack.go`; whether any caller gates the OH weapon on MH hand type: **hypothesis, untested** (Step 3 reads `WeaponFromOffHand`, `character.go:561-574`) |
| C15 | Upstream-style defensive clear lives only in the bulk generator (`F/sim/core/bulk/generator.go:335`: blank off-hand when MH is `HandTypeTwoHand`) — the `raidsim` path our engine uses does not pass through it. | no | `sed -n 333,338p F/sim/core/bulk/generator.go`; `grep -rn "HandTypeTwoHand" F/sim/core/*.go` shows no such clear in `character.go`/`database.go` `ProtoToEquipment` |
| C16 | Sharpstone 29453 and Weightstone 34340 grant identical melee bonuses in `registerStaticImbue` (`F/sim/core/consumes.go:697`, cases :708/:734, `MeleeCritRating +14`, `+12` base damage); only difference is the sharpstone's ranged-crit compensation :732. `F/sim/druid/forms.go:52` checks `MhImbueId == 34340` only. | yes | research-notes R1; `grep -n "34340\|29453" F/sim/core/consumes.go F/sim/druid/forms.go` |
| C17 | **Conclusion withdrawn (review F3).** `db05fed93` (adds the `forms.go` weightstone check, author Bisonpasfuté, 2026-05-23) is an ancestor of the pin `ec5c5f2` — but `F` has only `refs/remotes/origin/*` (the fork); the `upstream` remote (`wowsims/tbc-new`) has never been fetched, so ancestry in the pin's own history says nothing about where the commit came from. Provenance is **unestablished** until `upstream/feature/backend-reforge` is fetched and measured (Step 6.1). | no | `git -C F remote -v`; `git -C F for-each-ref refs/remotes/ --format='%(refname)' \| grep -c upstream` → `0`; `git -C F log -1 --format='%an %ad' db05fed93` (run 2026-09-10). Rebuttal: none — the finding stands |
| C18 | Fork `sim/` differs from the upstream pin only in `sim/hunter/item_sets.go` (+55/−10). | no | `git -C F diff --stat ec5c5f205e61049d730e460967f8488774a7fe2a..HEAD -- sim/`. Note "upstream pin" here means the commit the lock names, not a fetched `upstream/*` ref (C17) |
| C19 | The `weapon-imbue-omitted` sentence is byte-identical in `R/packages/core/src/disclosure.ts:55` and `F/ui/core/components/individual_sim_ui/upgrades/engine/disclosure.ts:57`; `R/packages/core/test/disclosure.test.ts:13-15` asserts only the id. PROVENANCE row for `disclosure.ts` is at `F/.../engine/PROVENANCE.md:157`. | yes | `grep -n "deltas survive" R/packages/core/src/disclosure.ts F/ui/core/components/individual_sim_ui/upgrades/engine/disclosure.ts`; `grep -n "disclosure.ts" F/.../engine/PROVENANCE.md` |
| C20 | Any edit under `F/ui/core/components/individual_sim_ui/upgrades/engine/` (comment-only included) requires: E-W3 green (`npx vitest run packages/core/test/wowsims-fork-parity.test.ts` from `R`) → PROVENANCE sha row (Edit tool) → fork commit → move `data/wowsims-fork.lock.json` `commit` to the new fork tip and run `pnpm sim-implemented-effects:generate` → `pnpm verify`. | yes | `sed -n 45,66p R/docs/agents/known-traps.md` |
| C21 | Off-hand guard: core `R/packages/core/src/rank.ts:920` inline `continue` inside `runCandidate` (:896), comment :907-919; fork `engine/rank.ts:791` `return { kind: "skip" }` inside `attemptEligibility` (:771-815). `candidateSwapWithRepairs` at core :2061 (calls `swapItemAt` :2089). No existing test names `mainHandIsOneHanded`/`attemptEligibility`. Files 2164 vs 2092 lines. Nothing in this revision edits these. | no | `grep -n 'mainHandIsOneHanded\|attemptEligibility\|candidateSwapWithRepairs' R/packages/core/src/rank.ts F/.../engine/rank.ts` |
| C22 | Node in Bash is v22.17.1 (≥ 22.5.0, `node:sqlite` present); Go 1.25.4 on PATH. `pnpm verify` starts with `preflight:node`. | yes | `node --version`; `go version`; `grep -n preflight:node R/package.json` → :13 |
| C23 | Candidate-cap symbols: `F/.../upgrades_tab.tsx:399` `private candidateCap = 0;`, `:1183` `readCandidateCap()`, call sites `:1228`/`:2366`; core `rank.ts:123` `candidateCap?: number`, `:1100` `const cap = input.candidateCap ?? ordered.length;`, fork `engine/rank.ts:147/:660/:1180`; `orderCandidatesByEp` at `candidate-order.ts:54` both copies. Ticket 358 §2 (`358-…md:41-53`) already states the mechanism and owns the docs half. | no | research-notes R3; `sed -n 41,53p R/.scratch/carry-forward/issues/358-*.md`; re-grep before writing 363 |
| C24 | Ticket status is changed by editing `Status:` (six allowed words), never by moving the file; `Blocked by:` takes a ticket number; no `map.md` exists under issues. | no | `sed -n 31,40p R/docs/agents/issue-tracker.md`; `ls R/.scratch/carry-forward/issues/map.md` → missing |
| C25 | "Rejects" is observable in the CLI path: `CliSimRunner` throws on a non-`ErrorOutcomeNone` `errorResult` or non-zero exit (`cli-sim-runner.ts:60-67`). How the fork tab's `wasm_sim_runner.ts` surfaces the same error on the enhancement page: **hypothesis, untested** — Step 2.3 records whatever the tab shows (error banner, console error, or missing two-hander rows) without interpreting beyond rejects/not-rejects | no | `sed -n 58,72p R/packages/core/src/seams/cli-sim-runner.ts` |
| C26 | The verification log's newest entries use `### <question>` headings under a dated `## ` section; entries appended here follow the last section's format. | no | `grep -n '^## \|^### ' R/docs/verification-log.md \| tail -4` |
| C27 | The only skeleton the CLI wiring can load is feral: `R/packages/core/src/cli-wiring.ts:126-128` reads `data/presets/${spec}/p2.raid-sim-skeleton.json`, and only `R/data/presets/feral/` has that file. `compose.ts:29` `compose(skeleton, player)` patches gear into an existing skeleton and reads no files. | yes | `grep -n "raid-sim-skeleton" R/packages/core/src/cli-wiring.ts`; `ls R/data/presets/*/p2.raid-sim-skeleton.json` → feral only |
| C28 | The fork ships enhancement UI presets: `F/ui/shaman/enhancement/gear_sets/p1.gear.json` wears item 28308 in both index 14 and 15 (a 1H+OH set, the right shape for a future dual-wield fixture), plus `apls/default.apl.json`; warrior `F/ui/warrior/dps/gear_sets/p*_fury.gear.json` and `apls/fury.apl.json` also exist. These are fork UI files, not committed `R` inputs, so a request built from them is hand-authored. | no | `ls F/ui/shaman/enhancement/gear_sets F/ui/warrior/dps/gear_sets`; `python -c "import json;g=json.load(open('F/ui/shaman/enhancement/gear_sets/p1.gear.json'));print(g['items'][14],g['items'][15])"` (Explore researcher this session) |
| C29 | During the catch-up the fork Go suite (`go test --tags=with_db ./sim/...`, 22 packages `ok`) and a browser load of the built tab (header "Phase 3 (2.2 - T6) - Alpha", zero error elements, only a `/version` 404) **did run** but were recorded only in a session transcript, not a repo file; `tsc --noEmit` is recorded in fork commit `ab59127d`; the layout gate in `4dcafcd`. What never ran is `vite build` as a verification step and an interactive Run. The handoff's pre-registered numbers for the ret page are **467 eligible items** (matching the CLI's `universe=467`, not independent of it) and the header text above. | yes | `sed -n 60,135p R/.scratch/handoffs/wowsims-reforge-catchup/HANDOFF-leftovers.md` (read 2026-09-10) |
| C30 | Ticket 350's `## What is NOT claimed` already states the engine behaviour is unmeasured and that today's numbers may be right by accident; its acceptance boxes 1–4 require a measurement first. Recording "unmeasurable from committed inputs" ticks none of them and leaves `Status: open`. | no | `cat R/.scratch/carry-forward/issues/350-two-hander-swap-leaves-worn-offhand.md` (read 2026-09-10) |
| C31 | The `upstream` remote URL is `https://github.com/wowsims/tbc-new.git`; a `git fetch upstream feature/backend-reforge` writes only `refs/remotes/upstream/*` and touches no working-tree file, so it does not disturb the ported-engine cycle or `git status --porcelain`. Whether the branch is fetchable from this machine: **hypothesis, untested** (network) | no | `git -C F remote -v`; Step 6.1 pre-writes the failure outcome |

## Steps

Shell rule for every step: `pnpm`, `node`, `npx`, `make`, `python` from **Bash**; `git` standalone with `git -C <abs path>` (fnm stderr breaks `&&` chains); no heredocs — write script files under `R\.scratch\stage-gate\reforge-catchup-leftovers\probe\` if any are needed. Commit after each green slice; run `git -C R status --porcelain` before every commit and stop if it shows work you did not do.

### Step 1 — Build the merged tab (Job 1, Q3)

Action:
1. Record the baseline first: `ls -la --time-style=+%H:%M F/dist/tbc/lib.wasm.gz F/dist/tbc/index.html` and `date +%H:%M` (C5).
2. `"<make 4.4.1 path>" --version` → must print 4.4.1 (C3).
3. `"<make 4.4.1 path>" -C "C:/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork" dist/tbc/.dirstamp > "<scratchpad>/make-dirstamp.log" 2>&1; echo "rc=$?"` — no pipe, rc from the make itself. Timeout 600000 ms; if it exceeds, run in background and poll the log, not the task state.
4. Read the artifact, not the rc: `ls -la --time-style=+%H:%M F/dist/tbc/lib.wasm.gz F/dist/tbc/index.html` — both newer than the recorded start; `ls F/dist/tbc/paladin/retribution/index.html F/dist/tbc/shaman/enhancement/index.html`; `tail -20 <log>` shows `vite build` output with no `error`. If `UI_SRC`/`TS_CORE_SRC`/`ASSETS_INPUT` resolve to zero files, you are on the wrong make (C3) — stop and re-check the path.
Files touched: none in git (`dist/` is build output; confirm `git -C F status --porcelain` empty after).
Acceptance: rc=0 **and** both artifacts newer than start; or a recorded failure with the log's last 40 lines. **A failure is a finding for ticket 362, not something to fix.**
Depends on: C3, C4, C5.

### Step 2 — Run the tab interactively on ret and on enhancement (Job 1, Q3; partial Q1)

Action:
1. Serve: Bash `python -m http.server 8081 --directory "C:/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork/dist"` in background (C6). Open `http://localhost:8081/tbc/paladin/retribution/` with the Browser preview tools. If the sim worker fails to load the wasm (console error naming `lib.wasm.gz`), stop the server and use the fork's own route: `make host` (air on :8081) — it does not exit; kill it when done.
2. Ret page, pre-registered checks (C29): (a) the page header reads exactly `Phase 3 (2.2 - T6) - Alpha`; (b) the Upgrades tab reports **467 eligible items** — any other number is itself a finding and goes into 362 verbatim with the number seen; (c) click Run, wait for the sim to finish, a ranked table with a nonzero row count appears and no error banner; (d) `read_console_messages onlyErrors` shows nothing except a `/version` 404 (air's endpoint, harmless under a static server). Capture row count, top three rows' item names and DPS deltas, one screenshot to `<scratchpad>/tab-ret.png`.
3. Enhancement page `http://localhost:8081/tbc/shaman/enhancement/`: load the tab's default gear (the fork preset P1 wears 28308 in both hands, C28), click Run, wait, read rows. Record: whether any two-handed item appears as a `mainhand` row (name it), whether an error banner or console error appeared during the run, row count, screenshot `<scratchpad>/tab-enh.png`. This is the only Q1 observation available without hand-authoring a request: a run error or the complete absence of two-hander rows for a spec whose universe holds them (ticket 350 table: enh-p5 59 two-handers) is evidence toward **rejects**; rows present without error means **not rejects**, and says nothing about drops vs counts (C25). Record it with exactly that label.
Files touched: none in git.
Acceptance: all four ret checks pass and the enh run completes, or the exact failure (page, action, header/number seen, console text) is recorded. Do not edit any fork file to make it pass.
Depends on: C6, C7, C28, C29, Step 1.

### Step 3 — Q1: record why it is unmeasurable, and the reading (ticket 350 step 1)

Action:
1. Write `R\.scratch\stage-gate\reforge-catchup-leftovers\probe\results.md` with these sections, in this order: `## Inputs available` (C13, C27 — the two committed request fixtures and their player keys, the one skeleton, run the commands and paste output); `## Why no probe ran` (the spec point: `DUAL_WIELD_SPECS` excludes feral and ret — paste `grep -n -B6 'DUAL_WIELD_SPECS' R/packages/core/src/pool.ts` output; the hand-authoring point: `direct-sim-support.ts` warning, cite by grep); `## Reading` (C14: `grep -n "IsDualWielding" F/sim/core/attack.go`; `sed -n 561,574p F/sim/core/character.go` and grep for `WeaponFromOffHand` — state whether any caller blanks the OH weapon when the MH is `HandTypeTwoHand`; C15 bulk-only clear); `## Live observation` (Step 2.3's enh result, labelled rejects / not-rejects); `## What a measurement needs` (C12 numbers: 7.01 DPS floor at 3000 iterations; effect must be the off-hand swing, tolerance compare, iterations raised); end with the literal line `OUTCOME: unmeasurable-from-committed-inputs`.
2. Append a `### Q1` entry to `R\docs\verification-log.md` in the last section's format (C26) pointing at `results.md`.
Files touched: `probe/results.md` (create), `docs/verification-log.md` (append).
Acceptance: `grep -c '^OUTCOME: unmeasurable-from-committed-inputs$' probe/results.md` → 1; every command in the file was run and its output pasted (no line numbers taken from the handoff); commit "Record why ticket 350's probe cannot run from committed inputs".
Depends on: C12, C13, C14, C15, C25, C27, C28, Step 2.

### Step 4 — Record the Q1 decision in ticket 350 (no option selected)

Action: append `## Decision (2026-09-10)` to `R\.scratch\carry-forward\issues\350-two-hander-swap-leaves-worn-offhand.md` stating, in this order:
- Step 1 of the ticket could not be run: no committed dual-wield skeleton or request fixture (C13, C27); pointer to `probe/results.md`; ticket 365 files the missing fixture.
- The reading-only findings (C14, C15), labelled as reading, and the Step 2.3 live observation, labelled rejects / not-rejects.
- One finding that holds regardless of the engine's behaviour: `statDeltaBetween(equipment, swapped)` (grep it in `rank.ts`, both copies) diffs a set that still contains the worn off-hand, so the two-hander row's **stat delta column** never debits the off-hand stats. This is an argument about the delta column, not a selection between Option 1 and Option 2 (review F4).
- **No option is chosen** and no code lands on this branch; the choice waits on the measurement. Do not tick any acceptance box (C30). Set `Blocked by: 365`.
Files touched: the 350 ticket only.
Acceptance: `grep -c 'Blocked by: 365' 350-*.md` → 1; `grep -c '^- \[x\]' 350-*.md` → 0; the section names no option as chosen; commit.
Depends on: Step 3, C21, C24, C30.

### Step 5 — Withdrawn

The first plan's conditional Option 1 implementation is removed: no measurement supports code (brief: "if you find yourself writing a patch before a measurement, re-read the ticket"). Nothing to do; numbering kept so review cross-references stay valid.

### Step 6 — Ticket 351: Q2, provenance re-measure, and fix the disclosure sentence (unconditional)

Action:
1. Provenance (C17, C31): `git -C F fetch upstream feature/backend-reforge > <scratchpad>/fetch.log 2>&1; echo "rc=$?"`. Pre-written outcomes: rc=0 → `git -C F merge-base --is-ancestor db05fed93 upstream/feature/backend-reforge; echo "rc=$?"` — rc 0 means the commit is on upstream's branch (**provenance: upstream**); rc 1 means it is fork-only (**provenance: fork**). Fetch rc≠0 (offline, auth, branch renamed) → **provenance: unestablished**; paste `fetch.log`'s last 5 lines. Record the word and the commands in 351 and in 364. `git -C F status --porcelain` must be unchanged by the fetch (refs only).
2. Append `## Decision (2026-09-10)` to `R\.scratch\carry-forward\issues\351-weapon-imbue-does-not-follow-candidate-weapon.md`: Q2 answer = identical melee bonuses (C16, commands pasted); therefore `forms.go:52` id-equality is the defect, in the pinned engine, with the provenance word from 6.1; filed as ticket 364; decision = do **not** mirror `adjustWeaponImbueID` on this branch (reason: C16 and ticket § "What that means" item 2); steps 3–5 of the ticket stay untaken; tick acceptance boxes 1, 2 and 4. Leave `Status: open` (box 3 is conditional on a future mirror decision; say so).
3. Edit `R\packages\core\src\disclosure.ts:55` so the sentence no longer asserts "constant across baseline and candidates, so deltas survive" unconditionally — state that a skeleton-pinned `mhImbueId` is carried unchanged into every candidate, including weapon candidates of the other stone family and off-hand items (ticket 351). Same bytes into `F\...\engine\disclosure.ts:57` (Edit tool). Extend `R\packages\core\test\disclosure.test.ts` to assert the detail mentions the pinned imbue, so the two copies cannot silently diverge on this sentence again. `pnpm test` green.
4. Ported-engine cycle (C20) for `disclosure.ts`: E-W3 green → PROVENANCE :157 sha row (Edit tool; `sha256sum` the fork file) → `git -C F commit` → edit `R\data\wowsims-fork.lock.json` `commit` to the new fork tip → `pnpm sim-implemented-effects:generate` (predict its output path with `git -C R status --porcelain` before/after; an unpredicted path is a finding, not a commit) → `pnpm verify`. Append a `### Q2` entry to `docs/verification-log.md` (C26).
Files touched: 351 ticket, `disclosure.ts` both copies, `disclosure.test.ts`, `PROVENANCE.md`, fork lock, generated artifact, `docs/verification-log.md`.
Acceptance: `grep -c "deltas survive" R/packages/core/src/disclosure.ts F/.../engine/disclosure.ts` → 0 and 0; both copies byte-identical on that entry; `npx vitest run packages/core/test/wowsims-fork-parity.test.ts` green; `pnpm verify` green; 351's Decision contains exactly one of `provenance: upstream|fork|unestablished`.
Depends on: C16, C17, C19, C20, C22, C31.

### Step 7 — File tickets 362, 363, 364, 365 (Job 4), `NEXT` in each commit

Per ticket: read `NEXT`, `ls | grep -c '^<N>-'` → 0, write the file, write `NEXT`=N+1, commit both together (C2). Front-matter per `issue-tracker.md:31-36`; `Origin:` = `.scratch/stage-gate/reforge-catchup-leftovers/brief.md`; `Blocks: none`. House style: a bolded one-line "What is NOT claimed" then what was confirmed by reading.
- **362** — "Build and runtime evidence for the merged upgrades tab was run but never recorded". Framing per C29 (review F6): list what ran during the catch-up and where its only record was (transcript vs commit body), then Step 1 and Step 2 evidence (commands, rcs, artifact timestamps before/after, header text, eligible-item count seen vs 467, row counts, console state, enh observation). Note C5: the pre-existing bundle's wasm predated its html by two hours, so the earlier browser load is weak evidence. `Status: closed` if every Step 1–2 check passed; `open` / `Type: bug` otherwise.
- **363** — "The candidate cap can silently drop a real item (exposure)". Symbols from C23 re-grepped. Say plainly it is an exposure (defaults 0 / unset are safe). Per review F8 do **not** restate the mechanism narrative — one sentence pointing at 358 §2 for it — and carry the exposure and the candidate fixes: (a) a warning in the tab when a cap is set and the ordering weights' phase differs from the universe phase; (b) cap-aware ordering that refuses to truncate below the worn item's EP; (c) refusing a cap unless matching-phase weights exist. None chosen here. 358 owns the docs half.
- **364** — "`sim/druid/forms.go` grants the paw imbue bonus for the weightstone id only". Cite C16; the fix is adding 29453 to `weaponImbueFlatDamage`; state the provenance word from Step 6.1 with its commands (never "upstream's defect" without a fetched `upstream/*` ref, review F3); note editing `F/sim/druid/forms.go` moves feral sim numbers, so it pairs with a re-baseline and is not this branch.
- **365** — "No committed dual-wield RaidSimRequest fixture; ticket 350 step 1 cannot run". Body: C13, C27, C28 (source to build from: the fork's enh P1 preset, 28308 in both hands, plus `apls/default.apl.json`, recorded through the real `rank.ts` composition path rather than hand-authored); what the measurement must be (C12: off-hand swing effect, tolerance compare, iterations sized against the 7.01 DPS floor at 3000; runner = pinned CLI, C8); `Blocks: none`; 350 is `Blocked by: 365`.
Acceptance: `pnpm issues:open` lists 363, 364, 365 (and 362 if open) each exactly once; `cat NEXT` → `366`.
Depends on: C1, C2, C23, C24, Steps 1–6.

### Step 8 — Final verify

`pnpm -C "C:/Users/dgree/Code/lulz/tbc-gear-prio" verify > <scratchpad>/verify.log 2>&1; echo "rc=$?"` from Bash, plus the Verify recipe. `git -C R status --porcelain` empty; `git -C F status --porcelain` empty; `git -C F rev-parse HEAD` equals `commit` in `data/wowsims-fork.lock.json`.
Depends on: C20, C22.

## Paths manifest

Repo (`R = C:\Users\dgree\Code\lulz\tbc-gear-prio`):
- `R\.scratch\carry-forward\issues\350-two-hander-swap-leaves-worn-offhand.md` — modify (Decision section, `Blocked by: 365`)
- `R\.scratch\carry-forward\issues\351-weapon-imbue-does-not-follow-candidate-weapon.md` — modify
- `R\.scratch\carry-forward\issues\362-<slug>.md`, `363-<slug>.md`, `364-<slug>.md`, `365-<slug>.md` — create
- `R\.scratch\carry-forward\issues\NEXT` — modify (once per ticket commit; ends at `366`)
- `R\.scratch\stage-gate\reforge-catchup-leftovers\probe\results.md` — create
- `R\docs\verification-log.md` — append (`### Q1`, `### Q2`)
- `R\packages\core\src\disclosure.ts`, `R\packages\core\test\disclosure.test.ts` — modify
- `R\data\wowsims-fork.lock.json` — modify (`commit` field only)
- Output of `pnpm sim-implemented-effects:generate` — regenerated (predict path from `git status` before running; do not absorb unpredicted paths)

Fork (`F = R\vendor\tbc-new-fork`, its own git, commits on `feat/upgrades-tab`, never pushed — ticket 355):
- `F\ui\core\components\individual_sim_ui\upgrades\engine\disclosure.ts` — modify (ported file → C20 cycle)
- `F\ui\core\components\individual_sim_ui\upgrades\engine\PROVENANCE.md` — modify (sha row)
- `F\.git\refs\remotes\upstream\*` — created by Step 6.1's fetch (refs only, no working-tree change)
- `F\dist\**` — build output, untracked, not committed

Not touched in this revision: `R\packages\core\src\rank.ts`, `F\...\engine\rank.ts`, `F\sim\**`.

No fan-out: Step 6 owns the single fork commit and the lock bump, Step 4 and Step 7 depend on Steps 2–3's evidence and on `NEXT` serially. Serial execution (review F9 confirmed).

## Verify recipe

From Bash, each as its own tool call (no `&&` chains):
1. `pnpm -C "C:/Users/dgree/Code/lulz/tbc-gear-prio" verify > <scratchpad>/verify.log 2>&1; echo "rc=$?"` → rc=0; `tail -5` shows the last gate.
2. `npx vitest run packages/core/test/wowsims-fork-parity.test.ts` (from `R`) → green.
3. `grep -c "deltas survive" R/packages/core/src/disclosure.ts F/ui/core/components/individual_sim_ui/upgrades/engine/disclosure.ts` → `0`, `0`.
4. `git -C F rev-parse HEAD` == `python -c "import json;print(json.load(open('R/data/wowsims-fork.lock.json'))['commit'])"`.
5. `cat R/.scratch/carry-forward/issues/NEXT` → `366`; `ls R/.scratch/carry-forward/issues | grep -E '^36[2-5]-' | wc -l` → `4`.
6. `grep -c '^OUTCOME: unmeasurable-from-committed-inputs$' R/.scratch/stage-gate/reforge-catchup-leftovers/probe/results.md` → `1`.
7. `grep -c 'Blocked by: 365' R/.scratch/carry-forward/issues/350-*.md` → `1`; `grep -Ec 'provenance: (upstream|fork|unestablished)' R/.scratch/carry-forward/issues/351-*.md R/.scratch/carry-forward/issues/364-*.md` → `1` each.
8. `ls -la --time-style=+%H:%M F/dist/tbc/lib.wasm.gz F/dist/tbc/index.html` — both dated after the Step 1 start time recorded in ticket 362.
9. `git -C R status --porcelain` and `git -C F status --porcelain` both empty.

## Out of scope

- Fixing the tab if Step 1 or 2 fails — record it in 362 and stop that job.
- Any code for ticket 350 (Option 1 or Option 2) — no measurement supports it; ticket 365 files the missing fixture.
- Hand-authoring a dual-wield RaidSimRequest (from the fork's enh/warrior presets or from scratch) to measure Q1 — recorded as unmeasurable from committed inputs; named in 365 as the source for a future recorded fixture, not attempted here.
- Ticket 351 steps 3–5 (mirroring `adjustWeaponImbueID`, the composed-request consumables patch, fixture re-recording) — deferred by the Step 6 decision.
- Editing `F/sim/druid/forms.go` or any fork Go — ticket 364 only.
- Ticket 358's docs fix (the misleading feral EP-weights note) — 363 must not restate it.
- Re-measuring the feral rotation (the −18 DPS story is superseded: `docs/verification-log.md:1654-1669`, +42.91 DPS).
- Treating the layout gate's "SKIPPED — tab layout source unchanged" as a failure.
- Moving `vendor/tbc-new-fork` into WSL; growing `known-traps.md`; adding a `pnpm doctor`.
- Ticket 355 (pushing or archiving the fork branch) — owner's call; `pushed: false` stays. Step 6.1's fetch adds `upstream/*` refs only and pushes nothing.
- `pnpm merge-to-dev`, `pre-merge-review`, any merge into `dev`.
