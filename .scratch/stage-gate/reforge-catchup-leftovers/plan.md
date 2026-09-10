# Plan — reforge-catchup-leftovers

Branch `feat/reforge-catchup-leftovers`, based on `dev` @ `66ab791f3f6dbad133d264d400a0a24328e71e56`. Repo root `C:\Users\dgree\Code\lulz\tbc-gear-prio` (below: `R`). Fork clone `R\vendor\tbc-new-fork` (below: `F`), on `feat/upgrades-tab` @ `6ef5679888430118895d59043e81e542d61c7527`, pinned by `R\data\wowsims-fork.lock.json`.

## Goal

When this plan is done: (1) there is written, evidenced answer to whether the merged fork tab builds with `vite build` and runs a sim interactively, recorded as ticket 362 (closed if it passes, open defect if not); (2) ticket 350 records what the pinned engine actually does with a two-hander plus off-hand request, measured by one composed request run through the pinned `wowsimcli`, and records which fix that result selects — code lands only in the outcomes the mapping below says it does; (3) ticket 351 records the Q2 answer (the two stones give identical melee bonuses; `sim/druid/forms.go` `weaponImbueFlatDamage` is the defect, and it lives in the upstream pin, not only the fork), records the decision not to mirror `adjustWeaponImbueID`, and the over-asserting `disclosure.ts` sentence is corrected in both engine copies with the ported-engine cycle done; (4) tickets 362, 363 (candidate-cap exposure) and 364 (`forms.go` stone id check) exist with `NEXT` advanced in the same commits; (5) `pnpm verify` is green on the branch tip.

## Approach

**Measure first, code conditionally.** Jobs 1–3 are investigations; the only unconditional code is the one-sentence `disclosure.ts` correction. The ticket 350 fix is gated on the Q1 measurement with the outcome→fix mapping written down in Step 4 before the probe runs. Ticket 351's plumbing is not done: Q2 is already answered by the research in `research-notes.md` R1 (identical melee bonuses), which by the ticket's own step-1 rule makes the engine's id-equality check the defect, and mirroring upstream now would zero the paw bonus for feral daggers.

**Q1 probe design (C9–C12).** The committed fixture `R\test\fixtures\shredzepelin-cat.raid-sim-request.json` already wears a two-hander in the main hand (item 28658, Terestian's Stranglestaff, `handType` 4) with an empty off-hand at equipment index 15, and carries `simOptions.randomSeed: "42"`, 3000 iterations. Two runs through the pinned CLI binary (`sim --infile --outfile`): A = fixture as-is; B = fixture with item 13385 (Tome of Knowledge, +8 Str/+8 Agi/+8 Sta/+8 Int) written into index 15. Seeded runs are deterministic, so the comparison is exact, not statistical. Pre-written outcomes: B exits non-zero or returns an `errorResult` → **rejects**; B's `raidMetrics.dps.avg` equals A's to the last digit → **drops** (off-hand stats ignored); B differs → **counts** (off-hand stats applied to a set the game cannot equip). This measures the stat half of the question with committed inputs and no code edits. The off-hand *swing* half cannot be measured with committed fixtures — no dual-wield skeleton or request fixture exists in `R\data\presets\` or `R\test\fixtures\` (C13) — so it is answered by reading `F\sim\core\attack.go` (`IsDualWielding: options.OffHand.SwingSpeed != 0` at :441, C14, no hand-type gate seen at that line) and recorded as reading, not measurement.

**Strongest rejected alternative for Q1:** hand-build a fury warrior request (1H+OH worn, 2H candidate) and measure the swing half too. Rejected because there is no committed warrior skeleton/APL to compose from, so the request would be hand-authored — exactly the "ticket 106 style" that `packages/core/test/direct-sim-support.ts` warns differs from what `rank.ts` sends; the result would not describe our path. If the stat half says **counts**, the swing half is moot for the decision (numbers are already wrong).

**Rejected alternative for Job 1:** `make host` as the handoff recipe. It depends on `air` and never exits; `make dist/tbc/.dirstamp` builds the same tree (C4) and terminates, and the current `dist/` is stale (C5), so the build must be re-run anyway.

**Rejected alternative for 351:** mirror `adjustWeaponImbueID` now. Rejected because with `forms.go:52` unchanged a dagger candidate rewritten to 29453 loses the +12 paw bonus that blunt candidates keep — two candidates in one slot under different damage models (ticket 351 § "What that means", C17).

## Claims register

| ID | Claim | Load-bearing | Verified by |
| --- | --- | --- | --- |
| C1 | `NEXT` reads 362 and no `362-*` file exists. | yes | `cat R/.scratch/carry-forward/issues/NEXT` → `362`; `ls R/.scratch/carry-forward/issues/ \| grep -c '^362-'` → `0` (run 2026-09-10) |
| C2 | Numbering procedure is the conjunction: read `NEXT`, confirm no file uses it, file, write the bump back in the same commit. `issue-tracker.md` says NEXT is the authority; `known-traps.md` § "Before filing a ticket" says listing is. Ticket 352 is open on the contradiction. | no | `sed -n 20,28p R/docs/agents/issue-tracker.md`; `sed -n 107,115p R/docs/agents/known-traps.md`; research-notes R3 |
| C3 | GNU Make 4.4.1 at `C:\Users\dgree\AppData\Local\Microsoft\WinGet\Packages\ezwinports.make_Microsoft.Winget.Source_8wekyb3d8bbwe\bin\make.exe`; the GnuWin32 3.81 silently resolves empty file lists. | yes | brief.md § Constraints (measured there: 506/176/89 files for `UI_SRC`/`TS_CORE_SRC`/`ASSETS_INPUT`). Re-check: `"<path>/make.exe" --version` prints 4.4.1 |
| C4 | `make dist/tbc/.dirstamp` builds `dist/tbc/` (`lib.wasm.gz`, `api.ts`, assets, `bundle/.dirstamp` → `tsc --noEmit`, `vite.build-workers`, `npx vite build`) without `air`. `make host` depends on `air`. | yes | `sed -n 18,40p F/makefile`; `sed -n 294,300p F/makefile`; research-notes R2 |
| C5 | Current `F/dist/tbc/` is stale: `lib.wasm.gz` stamped Sep 10 11:07, `index.html` 13:12. | no | `ls -la F/dist/tbc/` (run 2026-09-10) |
| C6 | The vite base is `/tbc/`; `make host` serves `dist/..` with `http-server`, so a static server rooted at `F/dist` answers `http://localhost:<port>/tbc/druid/feralcat/`. Built spec dirs exist: `dist/tbc/druid/{balance,feralbear,feralcat,restoration}`. | no | `grep -n "base:" F/vite.config.mts` → :101; `sed -n 296,300p F/makefile`; `ls F/dist/tbc/druid/`. Whether `python -m http.server` serves `lib.wasm.gz` in a form the worker accepts: **hypothesis, untested** — fall back to `make host` (air, :8081) if the page cannot load the wasm |
| C7 | Tab registration is in `F/ui/core/individual_sim_ui.tsx` (`addUpgradesTab` :439-440), so every spec page gets the tab. | no | research-notes R2; `grep -n "addUpgradesTab" F/ui/core/individual_sim_ui.tsx` |
| C8 | Pinned CLI binary exists and reports the pin: `R/vendor/wowsimcli-ec5c5f205e61049d730e460967f8488774a7fe2a-win32-x64/wowsimcli-windows.exe version` → `ec5c5f205e61049d730e460967f8488774a7fe2a`, rc 0. It is invoked as `sim --infile <req.json> --outfile <res.json>`. | yes | run 2026-09-10; `grep -n '"sim", "--infile"' R/packages/core/src/seams/cli-sim-runner.ts` → :55 |
| C9 | The fixture request's main hand (equipment index 14) is item 28658, `handType` 4 (`HandTypeTwoHand = 4`, `HandTypeOneHand = 2`), index 15 (off-hand) is empty, `simOptions` = `{iterations: 3000, randomSeed: "42"}`. | yes | `python -c "import json;d=json.load(open('R/test/fixtures/shredzepelin-cat.raid-sim-request.json'));p=d['raid']['parties'][0]['players'][0];print(d['simOptions'],[i.get('id') for i in p['equipment']['items']])"`; `grep -n "HandTypeTwoHand = \|HandTypeOneHand = " R/packages/core/src/proto/common_pb.ts` → :2489-2501; `R/data/items/index.json` key `28658` → `handType: 4, weaponType: 8` |
| C10 | Item 13385 (Tome of Knowledge) is an off-hand (`weaponType` 5) with `stats[0..3] = 8` (Str, Agi, Sta, Int; `StatAgility = 1` at `common_pb.ts:1912`). It is the highest-Agility off-hand in the index (8). | yes | `python -c "import json;d=json.load(open('R/data/items/index.json'));print(d['13385'])"` |
| C11 | The committed result for run A is `raidMetrics.dps.avg = 2152.0765440146747` at `iterationsDone 3000` (fixture `shredzepelin-cat.raid-sim-result.json`) — but that was recorded on an older engine; run A must be re-run on the pinned binary, not read from this file. | no | `python -c "import json;print(json.load(open('R/test/fixtures/shredzepelin-cat.raid-sim-result.json'))['raidMetrics']['dps']['avg'])"`; ticket 360 (nothing binds a fixture to the pin) |
| C12 | A seeded run is bit-deterministic, so "A == B" is an exact test for "off-hand ignored". | yes | **hypothesis, untested** — Step 3 includes running A twice; if the two A runs differ, the comparison degrades to `\|B−A\| > 3·stdev/√3000` and the ticket says so |
| C13 | No committed dual-wield skeleton or request fixture exists: `R/data/presets/{enh,warrior,hunter}` hold only `*.ep-weights.json`; `R/test/fixtures/*.raid-sim-request.json` are `shredzepelin-cat` (feral) and `slamaltman` (ret). So the off-hand swing half of Q1 cannot be measured from committed inputs. | yes | `ls R/data/presets/enh R/data/presets/warrior R/data/presets/hunter`; `ls R/test/fixtures/` |
| C14 | The engine enables off-hand swings on `options.OffHand.SwingSpeed != 0` (`F/sim/core/attack.go:441`) with no main-hand hand-type check at that site; `newWeaponFromItem` (:74-93) only uses `HandTypeTwoHand` for normalized speed. Reading suggests "counts" for a 2H+OH weapon pair. | no | `grep -n "IsDualWielding" F/sim/core/attack.go`; whether any caller gates the OH weapon on MH hand type: **hypothesis, untested** (Step 3b reads `WeaponFromOffHand`, `character.go:561-574`) |
| C15 | Upstream's defensive clear lives only in the bulk generator (`F/sim/core/bulk/generator.go:335`: blank off-hand when MH is `HandTypeTwoHand`) — the `raidsim` path our engine uses does not pass through it. | yes | `sed -n 333,338p F/sim/core/bulk/generator.go`; `grep -rn "HandTypeTwoHand" F/sim/core/*.go` shows no such clear in `character.go`/`database.go` `ProtoToEquipment` |
| C16 | Sharpstone 29453 and Weightstone 34340 grant identical melee bonuses in `registerStaticImbue` (`F/sim/core/consumes.go:697`, cases :708/:734, `MeleeCritRating +14`, `+12` base damage); only difference is the sharpstone's ranged-crit compensation :732. `F/sim/druid/forms.go:52` checks `MhImbueId == 34340` only. | yes | research-notes R1; `grep -n "34340\|29453" F/sim/core/consumes.go F/sim/druid/forms.go` |
| C17 | Commit `db05fed93` (adds the `forms.go` weightstone check) is an ancestor of the upstream pin `ec5c5f2`, so the defect is upstream's `feature/backend-reforge`, not fork-only. | no | `git -C F merge-base --is-ancestor db05fed93 ec5c5f205e61049d730e460967f8488774a7fe2a; echo $?` → 0 (run 2026-09-10) |
| C18 | Fork `sim/` differs from the upstream pin only in `sim/hunter/item_sets.go` (+55/−10), so the pinned CLI binary (built at `ec5c5f2`) runs the same weapon/equip Go as the tab's wasm for this question. | yes | `git -C F diff --stat ec5c5f205e61049d730e460967f8488774a7fe2a..HEAD -- sim/` |
| C19 | The `weapon-imbue-omitted` sentence is byte-identical in `R/packages/core/src/disclosure.ts:55` and `F/ui/core/components/individual_sim_ui/upgrades/engine/disclosure.ts:57`; `R/packages/core/test/disclosure.test.ts:13-15` asserts only the id. PROVENANCE row for `disclosure.ts` is at `F/.../engine/PROVENANCE.md:157`. | yes | `grep -n "deltas survive" R/packages/core/src/disclosure.ts F/ui/core/components/individual_sim_ui/upgrades/engine/disclosure.ts`; `grep -n "disclosure.ts" F/.../engine/PROVENANCE.md` |
| C20 | Any edit under `F/ui/core/components/individual_sim_ui/upgrades/engine/` (comment-only included) requires: E-W3 green (`npx vitest run packages/core/test/wowsims-fork-parity.test.ts` from `R`) → PROVENANCE sha row (Edit tool) → fork commit → move `data/wowsims-fork.lock.json` `commit` to the new fork tip and run `pnpm sim-implemented-effects:generate` → `pnpm verify`. | yes | `sed -n 45,66p R/docs/agents/known-traps.md` |
| C21 | Off-hand guard: core `R/packages/core/src/rank.ts:920` inline `continue` inside `runCandidate` (:896) inside `rankUpgrades` (:576), comment :907-919; fork `engine/rank.ts:791` `return { kind: "skip" }` inside `attemptEligibility` (:771-815), consumed by `screenCandidates` (:883) and `runCandidate` (:982). `candidateSwapWithRepairs` at core :2061 (calls `swapItemAt` :2089), one call site core :960; fork call sites :890, :994, :1619. No existing test names `mainHandIsOneHanded`/`attemptEligibility`; `slots.test.ts:59,86` test `simSlotsForPoolSlot` only. Files 2164 vs 2092 lines. | yes | Explore researcher this session (all by grep); re-run `grep -n 'mainHandIsOneHanded\|attemptEligibility\|candidateSwapWithRepairs' R/packages/core/src/rank.ts F/.../engine/rank.ts` |
| C22 | Node in Bash is v22.17.1 (≥ 22.5.0, `node:sqlite` present); Go 1.25.4 on PATH. `pnpm verify` starts with `preflight:node`. | yes | `node --version`; `go version`; `grep -n preflight:node R/package.json` → :13 |
| C23 | Candidate-cap symbols: `F/ui/core/components/individual_sim_ui/upgrades_tab.tsx:399` `private candidateCap = 0;`, `:1183` `readCandidateCap()`, call sites `:1228`/`:2366`; core `rank.ts:123` `candidateCap?: number`, `:1100` `const cap = input.candidateCap ?? ordered.length;`, fork `engine/rank.ts:147/:660/:1180`; `orderCandidatesByEp` at `candidate-order.ts:54` both copies, EP weights a parameter from the caller. Ticket 358 already owns the docs half. | no | research-notes R3; re-grep the symbols before writing ticket 363 |
| C24 | Ticket status is changed by editing `Status:` (six allowed words), never by moving the file; no `map.md` exists under issues (tickets here are not review-born). | no | `sed -n 31,40p R/docs/agents/issue-tracker.md`; `ls R/.scratch/carry-forward/issues/map.md` → missing |
| C25 | "Rejects" is observable: `CliSimRunner` throws on a non-`ErrorOutcomeNone` `errorResult` or non-zero exit (`cli-sim-runner.ts:60-67`), so in that outcome today's engine run for a dual-wielder with a 2H in the pool aborts rather than mis-prices. | no | `sed -n 58,72p R/packages/core/src/seams/cli-sim-runner.ts`; how the fork tab's `wasm_sim_runner.ts` surfaces the same error: **hypothesis, untested** |
| C26 | The verification log's newest entries use `### <question>` headings under a dated `## ` section; the entry appended here follows the last section's format. | no | `grep -n '^## \|^### ' R/docs/verification-log.md \| tail -4` |

## Steps

Shell rule for every step: `pnpm`, `node`, `npx`, `make` from **Bash**; `git` standalone with `git -C <abs path>` (fnm stderr breaks `&&` chains); no heredocs — write script files under `R\.scratch\stage-gate\reforge-catchup-leftovers\probe\`. Commit after each green slice; run `git -C R status --porcelain` before every commit and stop if it shows work you did not do.

### Step 1 — Build the merged tab (Job 1, Q3, half of C-build evidence)

Action:
1. `"<make 4.4.1 path>" --version` → must print 4.4.1 (C3).
2. `"<make 4.4.1 path>" -C "C:/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork" dist/tbc/.dirstamp > "<scratchpad>/make-dirstamp.log" 2>&1; echo "rc=$?"` — no pipe, rc from the make itself. Timeout 600000 ms; if it exceeds, run in background and poll the log, not the task state.
3. Read the artifact, not the rc: `ls -la F/dist/tbc/` — `lib.wasm.gz` and `index.html` both newer than the command start; `ls F/dist/tbc/druid/feralcat/index.html`; `tail -20 <log>` shows `vite build` output with no `error`.
Files touched: none in git (`dist/` is build output; confirm with `git -C F status --porcelain` empty after).
Acceptance: rc=0 **and** both artifacts newer than start; or a recorded failure with the log's last 40 lines. **A failure is a finding for ticket 362, not something to fix.**
Depends on: C3, C4, C5.

### Step 2 — Run the tab interactively (Job 1, Q3)

Action:
1. Serve: Bash `python -m http.server 8081 --directory "C:/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork/dist"` in background (C6). Open `http://localhost:8081/tbc/druid/feralcat/` with the Browser preview tools. If the sim worker fails to load the wasm (console error naming `lib.wasm.gz`), stop the server and use the fork's own route: `make host` (air on :8081) — it does not exit; kill it when done.
2. In the Upgrades tab: load the feral preset gear, click Run, wait for the sim to finish, read the ranked rows. Capture: number of rows, top three rows' item names and DPS deltas, console errors (`read_console_messages onlyErrors`), one screenshot to `<scratchpad>/tab-feralcat.png`.
3. Repeat once on a dual-wield spec page (enhancement: `/tbc/shaman/enhancement/` or whichever dir exists under `F/dist/tbc/shaman/`) so a Q1 "rejects" outcome shows up live as a crash. Same captures.
Files touched: none in git.
Acceptance: both runs complete with ranked rows and zero console errors, or the exact failure (page, action, console text) is recorded. Do not edit any fork file to make it pass.
Depends on: C6, C7, Step 1.

### Step 3 — Q1 probe: what the engine does with 2H + off-hand (ticket 350 step 1)

Action:
1. Write `R\.scratch\stage-gate\reforge-catchup-leftovers\probe\make-requests.py`: load the fixture request, write `req-A.json` (unchanged) and `req-B.json` with equipment index 15 set to `{ "id": 13385 }` (C9, C10). Assert in the script that index 14 is 28658 and index 15 is empty before writing.
2. Write `probe\run.sh` that runs the pinned binary (C8) three times — A, A again, B — each `sim --infile ... --outfile ...`, capturing `rc=$?` per run to `probe\results.md` along with `raidMetrics.dps.avg`, `stdev`, `iterationsDone`, and `errorResult` from each output.
3. Decide by the pre-written table: A₁ ≠ A₂ → seed not deterministic, degrade the test per C12 and say so; B rc≠0 or `errorResult.type ≠ ErrorOutcomeNone` → **rejects**; B avg == A avg exactly → **drops**; else → **counts**.
4. 3b (swing half, reading only): grep `F/sim/core/attack.go` and `character.go:561-574` for any gate that blanks the OH weapon when MH is 2H; record the finding as reading, labelled, in `results.md`.
Files touched: `probe/make-requests.py`, `probe/run.sh`, `probe/req-A.json`, `probe/req-B.json`, `probe/results.md` (all committed; outputs `res-*.json` stay in scratchpad).
Acceptance: `results.md` names one of rejects/drops/counts with the three DPS numbers and rcs; commit "Probe the engine's 2H plus off-hand handling for 350".
Depends on: C8, C9, C10, C11, C12, C13, C14, C15, C18, C25.

### Step 4 — Record the Q1 decision in ticket 350 (mapping fixed here, before Step 3 runs)

Outcome → fix, decided now:
- **drops**: today's DPS numbers are right by accident; only the `statDeltaBetween` column overstates (it still counts the OH stats). No engine code this branch — the measurement does not support it. Record in 350 that the eventual fix is **Option 2** (clear the slot in `swapItemAt`), with this rebuttal to the `rank.ts:907-919` position: a two-hander candidate has no one-item form, so the row's claim *is* the two-item swap and Option 1 would delete rows that are numerically correct today. Leave 350 `open`, add a `## Decision` section with the numbers and a pointer to `probe/results.md`.
- **counts** or **rejects**: today's rows are wrong (or abort). Implement **Option 1** now (Step 5) — the minimal guard consistent with the recorded position, removing rows that are wrong rather than fixing their numbers — and file follow-up ticket 365 "Two-hander rows for dual-wielders should exist with an honest two-item delta (Option 2)" so the design question is not lost. Record why Option 1 over 2 here: Option 2 touches `swapItemAt`, gem repair (`applyRepairedGems`/`repairAndMinimize`) and three fork call sites (C21) with no fixture to pin the new numbers.
Files touched: `R\.scratch\carry-forward\issues\350-two-hander-swap-leaves-worn-offhand.md` (append `## Decision`; tick the first two acceptance boxes); in the counts/rejects case also `365-*.md` + `NEXT` (same commit, C2).
Acceptance: 350's `## Decision` states the outcome word, the three numbers, the chosen option and the reason against `rank.ts:907-919`; `docs/verification-log.md` gets a `### Q1` entry in the last section's format (C26).
Depends on: Step 3, C21, C25.

### Step 5 — Conditional: Option 1 in core, then the fork (only if Step 3 said counts or rejects)

Action (`tdd` skill, red then green):
1. Red: new `R\packages\core\test\two-hander-offhand-guard.test.ts` at the `rankUpgrades` interface through the recorded adapters (`RecordedGearSource`/`RecordedSimRunner`/`MemoryStore`, patterns in `direct-sim-support.ts`): a `DUAL_WIELD_SPECS` spec wearing 1H + OH, one two-handed `mainhand` candidate; assert no sim request is issued for it (capture via a wrapping `SimRunner`) and no row appears. Must fail on the current code.
2. Green: in `R\packages\core\src\rank.ts` next to the `:920` guard, skip a `mainhand` candidate whose `handType === HandTypeTwoHand` when equipment index 15 holds an item; extend the `:907-919` comment with one sentence naming ticket 350. `pnpm test` green.
3. Port the same guard into `F\...\engine\rank.ts` `attemptEligibility` (:771-815) as a third `{ kind: "skip" }` — both `screenCandidates` and `runCandidate` pick it up (C21).
4. Ported-engine cycle (C20), together with Step 6's fork edit in **one** fork commit: E-W3 green → PROVENANCE rows for `rank.ts` and `disclosure.ts` (Edit tool; `sha256sum` each) → `git -C F commit` → edit `R\data\wowsims-fork.lock.json` `commit` to the new fork tip → `pnpm sim-implemented-effects:generate` → `pnpm verify`.
Files touched: `R\packages\core\src\rank.ts`, `R\packages\core\test\two-hander-offhand-guard.test.ts`, `F\...\engine\rank.ts`, `F\...\engine\PROVENANCE.md`, `R\data\wowsims-fork.lock.json`, whatever `sim-implemented-effects:generate` regenerates (predict with `git -C R status --porcelain` before/after; an unpredicted path is a finding, not a commit).
Acceptance: the new test fails before and passes after; `npx vitest run packages/core/test/wowsims-fork-parity.test.ts` green; `pnpm verify` green; ticket 350 third and fourth boxes ticked.
Depends on: Step 4 outcome, C20, C21, C22.

### Step 6 — Ticket 351: record Q2 and fix the disclosure sentence (unconditional)

Action:
1. Append `## Decision` to `R\.scratch\carry-forward\issues\351-weapon-imbue-does-not-follow-candidate-weapon.md`: Q2 answer = identical melee bonuses (C16); therefore `forms.go:52` id-equality is the defect, and it is in the upstream pin (C17) — file as ticket 364; decision = do **not** mirror `adjustWeaponImbueID` on this branch (reason: C16/C17 and ticket § "What that means" item 2); steps 3–5 of the ticket stay untaken; tick acceptance boxes 1, 2 and 4. Leave `Status: open` (box 3 is conditional on a future mirror decision; say so).
2. Edit `R\packages\core\src\disclosure.ts:55` so the sentence no longer asserts "constant across baseline and candidates, so deltas survive" unconditionally — state that a skeleton-pinned `mhImbueId` is carried unchanged into every candidate, including weapon candidates of the other stone family and off-hand items (ticket 351). Same bytes into `F\...\engine\disclosure.ts:57`. Extend `R\packages\core\test\disclosure.test.ts` to assert the detail mentions the pinned imbue (so the two copies cannot silently diverge on this sentence again).
3. If Step 5 did not run, do the C20 cycle here for `disclosure.ts` alone (E-W3 → PROVENANCE :157 → fork commit → re-pin + generate → verify). If Step 5 ran, this edit rides in that fork commit.
Files touched: 351 ticket, `disclosure.ts` both copies, `disclosure.test.ts`, PROVENANCE, fork lock, generated artifact (as Step 5).
Acceptance: `grep -c "deltas survive" R/packages/core/src/disclosure.ts F/.../engine/disclosure.ts` → 0 and 0; both copies byte-identical on that entry; `pnpm verify` green.
Depends on: C16, C17, C19, C20.

### Step 7 — File tickets 362, 363, 364 (Job 4), `NEXT` in each commit

Per ticket: read `NEXT`, `ls | grep -c '^<N>-'` → 0, write the file, write `NEXT`=N+1, commit both together (C2). Front-matter per `issue-tracker.md:31-36`; `Origin:` = `.scratch/stage-gate/reforge-catchup-leftovers/brief.md`; `Blocks: none`. House style: a bolded one-line "What is NOT claimed" then what was confirmed by reading.
- **362** — "No build or runtime evidence for the merged upgrades tab". Body = Step 1 and Step 2 evidence (commands, rcs, artifact timestamps, row counts, console state). `Status: closed` if both passed, `open` / `Type: bug` otherwise.
- **363** — "The candidate cap can silently drop a real item (exposure)". Symbols from C23 re-grepped; say plainly it is an exposure (defaults 0 / unset are safe), that a typed cap shortlists by stale Phase-1 feral EP weights against a Phase-3 universe with no warning, and that **358 owns the docs half** — this ticket covers the mechanism (a warning, a cap-aware ordering, or refusing a cap without matching-phase weights are the candidate fixes; none chosen here).
- **364** — "`sim/druid/forms.go` grants the paw imbue bonus for the weightstone id only". Cite C16/C17; upstream-side fix (add 29453); note editing `F/sim/druid/forms.go` is a fork Go change that moves feral sim numbers, so it pairs with a re-baseline and is not this branch.
- (**365** only if Step 4's counts/rejects branch fired.)
Acceptance: `pnpm issues:open` lists each new number exactly once; `cat NEXT` = last number + 1.
Depends on: C1, C2, C23, C24, Steps 1–6.

### Step 8 — Final verify

`pnpm verify` from Bash at `R` (`pnpm -C "C:/Users/dgree/Code/lulz/tbc-gear-prio" verify > <scratchpad>/verify.log 2>&1; echo "rc=$?"`), plus the plan-specific checks in Verify recipe. `git -C R status --porcelain` empty; `git -C F status --porcelain` empty; `git -C F rev-parse HEAD` equals `commit` in `data/wowsims-fork.lock.json`.
Depends on: C20, C22.

## Paths manifest

Repo (`R = C:\Users\dgree\Code\lulz\tbc-gear-prio`):
- `R\.scratch\carry-forward\issues\350-two-hander-swap-leaves-worn-offhand.md` — modify
- `R\.scratch\carry-forward\issues\351-weapon-imbue-does-not-follow-candidate-weapon.md` — modify
- `R\.scratch\carry-forward\issues\362-<slug>.md`, `363-<slug>.md`, `364-<slug>.md` — create; `365-<slug>.md` — create only on Step 4's counts/rejects branch
- `R\.scratch\carry-forward\issues\NEXT` — modify (once per ticket commit)
- `R\.scratch\stage-gate\reforge-catchup-leftovers\probe\{make-requests.py,run.sh,req-A.json,req-B.json,results.md}` — create
- `R\docs\verification-log.md` — append
- `R\packages\core\src\disclosure.ts`, `R\packages\core\test\disclosure.test.ts` — modify
- `R\data\wowsims-fork.lock.json` — modify (`commit` field only)
- Output of `pnpm sim-implemented-effects:generate` — regenerated (predict path from `git status` before running; do not absorb unpredicted paths)
- Conditional (Step 5): `R\packages\core\src\rank.ts` — modify; `R\packages\core\test\two-hander-offhand-guard.test.ts` — create

Fork (`F = R\vendor\tbc-new-fork`, its own git, commits on `feat/upgrades-tab`, never pushed — ticket 355):
- `F\ui\core\components\individual_sim_ui\upgrades\engine\disclosure.ts` — modify (ported file → C20 cycle)
- `F\ui\core\components\individual_sim_ui\upgrades\engine\PROVENANCE.md` — modify (sha rows)
- Conditional (Step 5): `F\ui\core\components\individual_sim_ui\upgrades\engine\rank.ts` — modify
- `F\dist\**` — build output, untracked, not committed

No fan-out: Steps 5–6 share `PROVENANCE.md`, the fork lock and one fork commit, and Step 7 depends on Steps 1–2's evidence. Serial execution.

## Verify recipe

From Bash, each as its own tool call (no `&&` chains):
1. `pnpm -C "C:/Users/dgree/Code/lulz/tbc-gear-prio" verify > <scratchpad>/verify.log 2>&1; echo "rc=$?"` → rc=0; `tail -5` shows the last gate.
2. `npx vitest run packages/core/test/wowsims-fork-parity.test.ts` (from `R`) → green.
3. `grep -c "deltas survive" R/packages/core/src/disclosure.ts F/ui/core/components/individual_sim_ui/upgrades/engine/disclosure.ts` → `0`, `0`.
4. `git -C F rev-parse HEAD` == `python -c "import json;print(json.load(open('R/data/wowsims-fork.lock.json'))['commit'])"`.
5. `cat R/.scratch/carry-forward/issues/NEXT` == 365 (or 366 if 365 was filed); `ls R/.scratch/carry-forward/issues | grep -E '^36[2-5]-' | wc -l` == number filed.
6. `test -f R/.scratch/stage-gate/reforge-catchup-leftovers/probe/results.md` and it contains exactly one of `OUTCOME: rejects|drops|counts`.
7. `ls -la F/dist/tbc/lib.wasm.gz F/dist/tbc/index.html` — both dated after the Step 1 start time recorded in ticket 362.
8. `git -C R status --porcelain` and `git -C F status --porcelain` both empty.

## Out of scope

- Fixing the tab if Step 1 or 2 fails — record it in 362 and stop that job.
- Ticket 351 steps 3–5 (mirroring `adjustWeaponImbueID`, the composed-request consumables patch, fixture re-recording) — deferred by the Step 6 decision.
- Editing `F/sim/druid/forms.go` or any fork Go — ticket 364 only.
- Option 2 for ticket 350 (clearing the off-hand in `swapItemAt`) — ticket 365 if the counts/rejects branch fires; otherwise recorded in 350's Decision.
- Ticket 358's docs fix (the misleading feral EP-weights note) — 363 must not restate it.
- Re-measuring the feral rotation (the −18 DPS story is superseded: `docs/verification-log.md:1654-1669`, +42.91 DPS).
- Treating the layout gate's "SKIPPED — tab layout source unchanged" as a failure.
- Moving `vendor/tbc-new-fork` into WSL; growing `known-traps.md`; adding a `pnpm doctor`.
- Ticket 355 (pushing or archiving the fork branch) — owner's call; `pushed: false` stays.
- Hand-building a dual-wield RaidSimRequest to measure the off-hand swing half — recorded as unmeasurable from committed inputs (C13), not attempted.
- `pnpm merge-to-dev`, `pre-merge-review`, any merge into `dev`.
