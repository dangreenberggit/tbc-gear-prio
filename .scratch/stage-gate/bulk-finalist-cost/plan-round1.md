# Plan — bulk-finalist-cost

## Goal

When this plan is done, a desktop (HTTP-transport) screening run of the upgrades tab no longer runs the Go engine's finalist refinement stage: the packaged `wowsimtbc.exe` server log for a cap-20 screened run contains zero `Stage: finalist - Started` lines, the run returns all 20 rows, and its rows are byte-equal to the committed pre-fix run (`.scratch/stage-gate/desktop-transport-gate/smoke-3333-cap20.json`) and to its own screening-off twin. The mechanism is one new `BulkSimRequest` field, `skip_finalist_stage`, honoured by both bulk engines (Go and the TS port) with a default that leaves upstream behaviour unchanged, and set by our fork's request builder. The WASM tab path is untouched at runtime. The divergence from upstream is recorded in `docs/fork-upstream-touchpoints.md`, and a draft upstream report exists for the owner to file or not.

## Approach

### What research changed about the brief

Three things in the brief and ticket do not survive reading the code, and they decide the shape of the fix.

1. **"Lever 1, client-side only, separating the two meanings" is not possible.** In Go, `runBulkSimFinalistStage` picks its finalists with `topBulkSimResults(results, topResults)` (`stage.go:250`), and when it runs it returns the finalists *as* the result list (`stage.go:291`, doc at `:247-248`: "they ARE the displayed set"). `bulk_sim.go:197` then truncates that list with the same `topResults`. So any finalist count below the chunk size also shrinks the response to that count. The only client-controllable way to skip the stage today is fewer than two finalists (`stage.go:250-252`), which returns one row. The request proto has no other knob (`proto/api.proto:429-437`), and no response field carries all candidates past truncation. Separating the meanings therefore needs an engine-side change (C2, C3).

2. **Constraint 4 is right for the wrong reason, and that matters.** The fork's TS bulk engine (`ui/core/wasm/bulk_sim/index.ts:167`) also runs a finalist stage, unconditionally, and its lockstep precondition is met (`batch.ts:38` sets `saveAllValues`). The WASM tab avoids it only because `makeSimRunner(bulk = false)` never constructs `BulkWasmSimRunner` (`bulk_wasm_sim_runner.ts:182-199`, `upgrades_tab.tsx:462`). The fix honours the new field in the TS engine too, so the day someone flips `bulk` back on (the header names ticket 346 as the trigger) the tournament does not silently re-inherit this cost (C7, C20).

3. **What the fix buys is bounded.** Removing the finalist stage leaves the `high` stage plus overhead: 886 s + 40 s = 926 s of 3420 s, 27.1%, on the full run (C13). The `high` stage itself runs about 19,700 iterations per sim against the 5,000 the client requests (14,827,038 iterations / (29 chunks x 26 sims) = 19,664), because `adaptBulkSimStageIterations` grows the sample up to `BulkSimAdaptiveMaxIterationMultiplier = 4` (`bulk_sim.go:18`, `stage.go:293-320`; the log has 60 `Adaptive pass` lines). The loop path sims each candidate once at 3,000 iterations. So after this fix, desktop screening still does roughly 6x the loop's simulation per candidate (C14, hypothesis until measured). That is a separate ticket, filed by this plan, not fixed by it.

### Recommended: A — an explicit request field, default off, honoured in both engines

Add `bool skip_finalist_stage = 9;` to `message BulkSimRequest` (`proto/api.proto:429-437`; field numbers 1-8 are used, C18). Guard the call at `bulk_sim.go:189` and the call at `index.ts:167` with it. Set it to `true` at `bulk_request_builder.ts:115`. `topResults` keeps its response-truncation job unchanged.

Why this over the alternatives:

- It is the only mechanism that removes the stage while returning all rows (C2).
- Default `false` preserves upstream's behaviour for its own bulk tab (`ui/core/sim.ts:563` passes `topResults: 5` and wants the refinement). That makes it an upstream PR candidate, which is how this divergence eventually stops being ours to carry.
- Cost at the next upstream sync: the fork **merges** from upstream (it has merge commits, no rebase; C6). Upstream has 0 commits touching `sim/core/bulk` or `proto/api.proto` beyond our HEAD (C5). The diff is one proto line, a 3-line guard in `bulk_sim.go`, a 1-line guard in `index.ts`, one new Go test file. The fork already carries one Go divergence (`sim/hunter/item_sets.go`, C6), so the ledger and merge process for this exist (`docs/fork-upstream-touchpoints.md`). Generated files (`sim/core/proto/api.pb.go`, `ui/core/proto/api.ts`) are gitignored (C16), so they add no diff.

**Strongest rejected alternative: C — stop using the Go bulk RPC on the desktop transport** (make `upgrades_tab.tsx:1159-1166` return the loop runner for HTTP too). Touches no Go, no proto, nothing upstream. On the cap-20 pair it is already the faster answer: 13 s against 264 s for byte-identical rows (C12), and by C14 it stays faster than A until the adaptive-pass inflation is also addressed. It lost because it does not fix ticket 403, it abandons the feature the `feat/desktop-transport-gate` branch exists to ship, and nothing in A precludes doing C later as a one-line change. **This is the owner's call, not an evidence question:** A keeps desktop screening alive at a small, upstreamable divergence and is the prerequisite for it ever winning; C is fastest today and costs nothing to carry. The plan proceeds with A; if the owner does not intend to pursue the follow-up ticket on adaptive iterations, C is the better use of time and the executor should stop at Step 1 and ask.

Other candidates considered and dropped:

- **A' — gate the finalist stage behind `BulkSettings.use_legacy_bulk_sim` / the legacy predicate** (no proto change; our chunks already take the legacy path, `bulk_request_builder.ts:50`, `estimate.ts:5-13`). Dropped: it changes behaviour for upstream's own users whose small runs auto-select legacy (`candidateCount < 20`), so it is unlikely to be accepted upstream and would be carried forever.
- **Chunk size 1 (client-only; `len(finalists) < 2` skips the stage).** Dropped: every request re-sims the baseline (`bulk_sim.go:170-176` on the legacy path, the stage sims baseline plus candidates), so it is 2 sims per candidate at ~4x5,000 adaptive iterations against the loop's 1 sim at 3,000 — worse than screening off (C19, inferred).
- **A server flag or env var in `sim/web/bulk.go`.** Dropped: still Go divergence, not per-request, not upstreamable.

### Q1 — how to separate the two meanings of `topResults`

| Candidate | Touches | Result that makes it win (pre-registered) | Measurement |
| --- | --- | --- | --- |
| A: `skip_finalist_stage` request field | proto, Go (`bulk_sim.go`), TS engine (`index.ts`), our builder | cap-20 screened run: 0 finalist stage lines in server log; `rowCount` 20; `requests.bulkSimAsync` 2; `screeningFallbackWarnings` 0; rows byte-equal to `smoke-3333-cap20.json`; `elapsedS` <= 120 | Steps 8-9 |
| C: loop runner on HTTP transport | our tab only | already measured: 13 s vs 264 s, rows equal (C12) | inherited, not re-run |
| A': gate behind legacy flag | Go + TS engine, no proto | same as A | not measured; dropped on upstream-acceptance grounds |
| chunk size 1 | our partition only | would need per-candidate cost below the loop's | not measured; dropped by C19 (2 sims per candidate at 4x iterations cannot beat 1 sim at 3,000) |

### Q2 — what finalist size, if any

**Recommendation: none.** Set `skip_finalist_stage: true`; do not request top-2.

What the tab actually depends on, by reading the consumer:

- Screening supplies each candidate's observation (`rank.ts:1034-1072`), then `replicateTopItems` re-sims the top 8 above-cutoff items per candidate at seeds 11-55 and **overwrites** `deltaDps`, `se` and `belowCutoff` (`rank.ts:1453-1487`, `PAIRED_REPLICATE_TOP_N = 8` at `engine/se.ts:6`). Rows 1-8 never show a screening number (C8).
- Rows beyond 8 show the screening value, and the view handles near-ties itself: `assignTieGroups`/`tieWindow` (`view.ts:123-150`) group them, and `compareRows` breaks exact ties deterministically by `bisTags.length` then `itemId` (`view.ts:216-218`), kept in sync with `rank.ts:1341-1347` (C9). The tab does not rely on the engine for stable ordering of near-ties.
- The stage only separates adjacent pairs **within one 25-candidate chunk**. The full ranking spans 29 chunks (`readback-3333-tip.json` `requests.bulkSimAsync` = 29). Separation inside a chunk says nothing about order across chunks, which is where displayed rows 9+ are compared (C10). The committed full runs already show the cutoff set differing between transports with the stage on (`aboveCutoff` 33 desktop vs 36 WASM, C11); the stage did not buy stability where it was paid for.

What "none" loses: nothing the display reads. What it would buy at top-2: the top two of each chunk separated at 95%, which is meaningless for a cross-chunk ranking and is overwritten by paired replication for the rows that matter. Top-2 also does not work without further Go surgery: with `finalists < topResults` the stage returns only the finalists as the result list (`stage.go:291`), so a count field would truncate the response to 2 rows unless the refined finalists are merged back into the full list. Dropped for both reasons. Pre-registered check that "none" is safe: Step 9's row comparisons pass (rows 1-8 equal, above-cutoff set equal). If they fail, the stage was contributing to the display and this recommendation is wrong.

### Q3 — proving no ranking changed, inside the capped budget

Run the cap-20 pair on the fixed binary and compare three ways (Steps 8-9), no full-pool run:

1. **Fixed screened vs committed pre-fix screened** (`smoke-3333-cap20.json`): `python scripts/check_desktop_tab.py --compare <fixed> <committed>` must pass T1-T4 with `T3_max` = 0.0 and `aboveCutoffSymDiff` = 0, and a direct `rows` equality must hold. Rows 1-8 are re-priced by per-candidate sims at fixed seeds on unchanged sim code, so they should be bit-identical (C22).
2. **Fixed screened vs fixed screening-off twin** (`--force-fallback`): the same `--compare` must pass; `rows` equal.
3. **Stage evidence** from a hand-started server with stderr captured (the gate script discards it, `check_desktop_tab.py:172`, C15): `grep -c "Stage: finalist - Started"` over the run window = 0, `grep -c "Stage: high - Finished"` = 2, and `elapsedS` <= 120 (pre-fix 264; the stage was 73%, so about 71 s plus overhead).

**Result that means the fix is wrong:** any of: `rows` differ from the committed screened run; `aboveCutoffSymDiff` != 0; `rowCount` != 20 (a `BulkScreenIntegrityError` on row shortfall means the response was truncated, `bulk_wasm_sim_runner.ts:56-60`); `screeningFallbackWarnings` != 0; `requests.bulkSimAsync` != 2; a finalist line in the log; `elapsedS` > 160 (the stage still ran).

**Constraint 4 check:** cap-20 harness run against a `--usefs=true --wasm=true` server, compared cross-transport against the fixed fallback twin (T3 reported, not asserted) and `rows` equal. Cheap (13 s class), and it is the only runtime evidence the WASM path is untouched.

### Q4 — upstream report

**Recommend filing two items, separately; filing is the owner's call.** Drafts go to `.scratch/stage-gate/bulk-finalist-cost/upstream-report-draft.md` (Step 11).

Draft 1 (bug, `sim/core/bulk`): "The finalist refinement stage logs a target error it never consults. `BulkSimFinalistStageConfig` (`stage.go:24`) leaves `TargetErrorPct` at zero and the stage's stopping test is `bulkSimUnresolvedFinalistPair` (`statistics.go:130-142`), but the summary reuses `formatBulkSimStageSummary` and prints `Target error: 0.00%` while the real criterion (unresolved adjacent pairs at 95%) is never logged. There is also no test of the finalist stage in `sim/core/bulk/*_test.go` at any size. Observed consequence: with `top_results` equal to the candidate count (25), all 29 of 29 chunks in a 3,419 s run exited at exactly 4.000x their entry iterations with all 25 survivors — budget exhaustion every time, logged as if converging on a 0% target."

Draft 2 (PR, the change this plan makes): "Add `BulkSimRequest.skip_finalist_stage` (default false, no behaviour change). Callers that consume only the per-candidate mean, and set `top_results` to the candidate count so the response is not truncated, currently also make every candidate a finalist; at 25 near-tied gear sets the pairwise 95% separation never resolves and the stage costs 3x the entry iterations for output the caller discards. Honoured in Go (`bulk_sim.go`) and the TS port (`ui/core/wasm/bulk_sim/index.ts`)."

## Claims register

| ID | Claim | Load-bearing | Verified by |
| --- | --- | --- | --- |
| C1 | Finalist stage = 2494 s of 3420 s (72.9%) on the full desktop run; 29/29 chunks exited at 4.000x entry iterations; every chunk `Survivors: 25` of 25. | yes | **Inherited** from `.scratch/carry-forward/issues/397-desktop-bulk-screen-not-a-speed-win.md` § "Cost attribution" and § "The finalist loop never converges", and `.scratch/stage-gate/desktop-transport-gate/finalist-stage-per-chunk.csv` (columns `ratio`, `survivors`). Source log `server-3333.log.err` is untracked; re-derivable on this machine with `python <stage>/parse_bulk_stage_timings.py <stage>/server-3333.log.err --start 17:26:19 --end 18:23:19`. |
| C2 | Go: finalists = `topBulkSimResults(results, topResults)`; `< 2` finalists returns without simming; when the stage runs it returns the finalists as the result list, which `bulk_sim.go:197` then truncates with `topResults`. So the finalist count cannot be lowered below the chunk size without losing rows. | yes | `sed -n 249,252p; sed -n 291p` on `vendor/tbc-new-fork/sim/core/bulk/stage.go`; `sed -n 186,197p vendor/tbc-new-fork/sim/core/bulk/bulk_sim.go` |
| C3 | `TopResults` is read in the Go bulk path only at `bulk_sim.go:87-89` (default 5), `:189` (sizes finalist stage), `:197` (truncates response); the finalist call has no gate. | yes | `grep -n "topResults\|TopResults" vendor/tbc-new-fork/sim/core/bulk/bulk_sim.go` |
| C4 | Our upgrades path sets `topResults` in exactly one place, `bulk_request_builder.ts:115`; other setters are upstream's bulk tab (`ui/core/sim.ts:563`, value 5) and the spike tool (`upgrades/tools/bulk-spike.mts:123`). | yes | `grep -rn "topResults:" vendor/tbc-new-fork/ui/core --include=*.ts --include=*.mts --include=*.tsx` (scope to `ui/core`; 3 hits) |
| C5 | `sim/core/bulk`, `sim/web`, `proto/api.proto`, `ui/core/wasm`, `ui/core/proto` are byte-identical to `upstream/master` (`17a8fb28c`), and upstream has 0 newer commits on `sim/core/bulk` or `proto/api.proto`. | yes | `git -C vendor/tbc-new-fork diff --stat upstream/master -- sim/core/bulk sim/web proto/api.proto ui/core/wasm ui/core/proto` (empty); `git -C vendor/tbc-new-fork log --oneline HEAD..upstream/master -- sim/core/bulk proto/api.proto` (empty) |
| C6 | The fork takes upstream by merge, and already carries one Go divergence (`sim/hunter/item_sets.go`). | no | `git -C vendor/tbc-new-fork log --oneline --merges -5`; `git -C vendor/tbc-new-fork diff --stat upstream/master...HEAD -- sim/ proto/` (1 file) |
| C7 | The WASM tab never runs the TS tournament: `makeSimRunner(bulk = false)` returns the loop runner, and the tab calls it with no argument. The TS engine's finalist call (`index.ts:167`) is therefore unreachable by default. | yes | `sed -n 182,199p vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/adapters/bulk_wasm_sim_runner.ts`; `sed -n 462p vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`; `readback-wasm-tip.json` fields `runner` = `WasmSimRunner`, `requests.bulkSimAsync` = 0 |
| C8 | Screening supplies `candObs` (`rank.ts:1034-1072`); `replicateTopItems` overwrites `deltaDps`/`se`/`belowCutoff` for the top 8 above-cutoff items (`rank.ts:1453-1487`, `PAIRED_REPLICATE_TOP_N = 8`). | yes | `sed -n 1034,1072p; sed -n 1453,1487p` on `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts`; `sed -n 6p .../upgrades/engine/se.ts` |
| C9 | The view groups near-ties (`assignTieGroups`, `tieWindow`) and breaks exact ties by `bisTags.length` then `itemId`; it does not depend on engine-side order stability. | yes | `grep -n "assignTieGroups\|tieWindow\|itemId" vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/view.ts` (lines 123-150, 216-218) |
| C10 | The finalist stage separates adjacent pairs within one chunk only; the ranking spans 29 chunks, so the stage cannot stabilise cross-chunk order. | yes | Inferred from C2 (finalists drawn from one request's results) and `readback-3333-tip.json` `requests.bulkSimAsync` = 29. Structural, not measured. |
| C11 | With the stage on, the above-cutoff set already differs across transports on the full run: 33 (desktop) vs 36 (WASM). | no | `python -c "import json;print([json.load(open(f))['aboveCutoff'] for f in ['.scratch/stage-gate/desktop-transport-gate/readback-3333-tip.json','.scratch/stage-gate/desktop-transport-gate/readback-wasm-tip.json']])"` |
| C12 | Cap-20 screened vs screening-off: 264 s vs 13 s, `rows` exactly equal, same 8 `aboveCutoffItems`, `bulkSimAsync` 2 vs 0. | yes | **Inherited** from 397 § "The sharp pair"; re-checkable: `python -c "import json;a=json.load(open('<stage>/smoke-3333-cap20.json'));b=json.load(open('<stage>/smoke-3333-cap20-fallback.json'));print(a['rows']==b['rows'],a['elapsedS'],b['elapsedS'])"` |
| C13 | Residual after removing the finalist stage is 926 s of 3420 s (27.1%) on the full run; expected cap-20 screened `elapsedS` about 71 s plus overhead. | no | Arithmetic on C1's table (`high` 886 s + outside 40 s). Hypothesis for the cap-20 prediction until Step 8 measures it. |
| C14 | The `high` stage delivers about 19,700 iterations per sim against 5,000 requested, via adaptive passes capped at 4x; so post-fix desktop screening still runs about 6x the loop's per-candidate iterations (loop: 64 sims x 3,000). | no | Arithmetic on C1 (14,827,038 / (29 x 26)); `sed -n 18p vendor/tbc-new-fork/sim/core/bulk/bulk_sim.go`; `grep -c "Adaptive pass" <stage>/server-3333.log.err` (60). **Hypothesis, untested** as a wall-clock comparison; becomes the follow-up ticket's question. |
| C15 | `pnpm desktop-gate:check` starts the server with stderr discarded, so finalist-line counting needs a hand-started server. | no | `sed -n 168,173p scripts/check_desktop_tab.py` |
| C16 | Proto toolchain is present and generated proto files are gitignored: `go version` 1.25.4, `protoc-gen-go` v1.36.10, `vendor/tbc-new-fork/node_modules/.bin/protoc`, `node_modules/@protobuf-ts/plugin`; `api.pb.go` and `api.ts` ignored. | yes | `go version; protoc-gen-go --version; ls vendor/tbc-new-fork/node_modules/@protobuf-ts; git -C vendor/tbc-new-fork check-ignore -v ui/core/proto/api.ts sim/core/proto/api.pb.go` |
| C17 | Fork queue is free at planning time: fork tree clean, HEAD `e94d927af` equals `data/wowsims-fork.lock.json` `commit`, one worktree, `pushed` true. | yes | `git -C vendor/tbc-new-fork status --porcelain; git -C vendor/tbc-new-fork rev-parse HEAD; git -C vendor/tbc-new-fork worktree list; python -c "import json;l=json.load(open('data/wowsims-fork.lock.json'));print(l['commit'],l['pushed'])"` — the executor re-runs this at Step 0. |
| C18 | `BulkSimRequest` uses field numbers 1-8; 9 is free and not reserved. | yes | `sed -n 429,437p vendor/tbc-new-fork/proto/api.proto`; `grep -n "reserved" vendor/tbc-new-fork/proto/api.proto` (only `BulkSettings` reserves 3-7) |
| C19 | A 1-candidate chunk costs 2 sims per candidate (baseline + candidate) at adaptive iterations, so it cannot beat the loop's 1 sim at 3,000. | no | Inferred from `bulk_sim.go:170-176` and the stage loop; **hypothesis, untested** (dropped candidate, not measured). |
| C20 | The TS engine's finalist call at `index.ts:167` is unconditional and its precondition is satisfiable (`batch.ts:38` sets `saveAllValues = true`), so `BulkWasmSimRunner` would pay the same cost if enabled. | no | `sed -n 167p vendor/tbc-new-fork/ui/core/wasm/bulk_sim/index.ts`; `sed -n 38p vendor/tbc-new-fork/ui/core/wasm/bulk_sim/batch.ts` |
| C21 | A fork commit touching `sim/` moves `data/sim-implemented-effects.json`'s embedded `forkCommit`; its 221/451 counts should not change because `bulk_sim.go` declares no item or spell effect. | no | `grep -n "forkCommit" scripts/generate_sim_implemented_effects.py` (lines 184, 249); counts: **hypothesis, untested** until Step 10's regen diff. |
| C22 | Rows 1-8 come from per-candidate sims at fixed seeds on sim code this plan does not change, so they should be bit-identical between the fixed run and the committed run. | yes | C8 + C12 (ON/OFF rows already equal) + `398-engine-delta-p3.md` (same-computation determinism). Prediction for Step 9; **hypothesis** until measured. |
| C23 | `sim/core/bulk` has two test files, neither mentioning the finalist stage; `go test` for the package runs without the `with_db` tag for the pure helpers. | no | `grep -il finalist vendor/tbc-new-fork/sim/core/bulk/*_test.go` (none); tag need: **hypothesis, untested** — Step 5 tries without, then with `--tags=with_db`. |

## Steps

Environment rules for every step: no `cd X && cmd`; absolute paths; Node 22 via `fnm exec --using=22 -- pnpm.cmd <script>` from `C:\Users\dgree\Code\lulz\tbc-gear-prio`, or the PATH pin from `docs/agents/known-traps.md` § "Before running node / pnpm / test commands"; `git -C`; edits with the harness Edit tool (line-ending trap, known-traps § "Before any scripted or generated file edit"). `<core>` = `C:\Users\dgree\Code\lulz\tbc-gear-prio`, `<fork>` = `<core>\vendor\tbc-new-fork`, `<stage>` = `<core>\.scratch\stage-gate\desktop-transport-gate`, `<out>` = `<core>\.scratch\stage-gate\bulk-finalist-cost`.

**Step 0 — Preconditions and owner gate.** Run C17's commands; both trees must be clean and fork HEAD must equal the lock's `commit`. Confirm `go version`, `protoc-gen-go --version`, `node --version` = v22.x, and that port 3333 is free (`netstat -ano | findstr :3333` empty; known-traps § "Before starting the dev servers"). Read `docs/agents/known-traps.md` in full. Acceptance: all commands return the values in C16/C17; if any differ, stop and report the exact command. If the orchestrator has recorded the owner choosing option C, stop here and report. Depends on C16, C17.

**Step 1 — Pre-register predictions before any measurement.** Create `<out>\predictions.md` containing, verbatim from this plan's Q3: the winning result for A, the "fix is wrong" list, the WASM-path check, the expected `elapsedS` band (<= 120 s pass, > 160 s fail), and C22's T3_max = 0.0. Create `<out>\.gitignore` with `*.log.err` and `*.log`. Acceptance: file exists and `git -C <core> log -1 --format=%H` is recorded in it as the SHA predictions were written at. Depends on C13, C22.

**Step 2 — Proto field.** Edit `<fork>\proto\api.proto`, `message BulkSimRequest` (lines 429-437): add `bool skip_finalist_stage = 9;` with a one-line comment: skips the finalist refinement stage for callers that consume only per-candidate means; `top_results` still truncates the response. Regenerate: with Node 22 on PATH, `make -C <fork> proto`. Acceptance: `grep -c "SkipFinalistStage" <fork>/sim/core/proto/api.pb.go` >= 1; `grep -c "skipFinalistStage" <fork>/ui/core/proto/api.ts` >= 1; `git -C <fork> status --porcelain` shows only `proto/api.proto` (generated files ignored). Depends on C16, C18.

**Step 3 — Go guard.** Edit `<fork>\sim\core\bulk\bulk_sim.go`: add a pure helper `func shouldRunBulkSimFinalistStage(request *proto.BulkSimRequest) bool { return !request.GetSkipFinalistStage() }` and wrap the block at lines 186-190 (the `runBulkSimFinalistStage` call and its metrics append) in `if shouldRunBulkSimFinalistStage(request) { ... }`. The comment above the call stays; add one line saying why a caller would skip (points at the field's proto comment). Do not touch `stage.go` or `statistics.go`. Run `gofmt -l <fork>/sim/core/bulk` (empty) and `go build ./...` from `<fork>` via `go -C <fork> build ./sim/...`. Acceptance: `git -C <fork> diff --stat -- sim/core/bulk/bulk_sim.go` shows a change of about 6 lines; build succeeds. Depends on C2, C3.

**Step 4 — Go test (new file).** Add `<fork>\sim\core\bulk\finalist_skip_test.go` with a table test for `shouldRunBulkSimFinalistStage`: default request -> true; `SkipFinalistStage: true` -> false; `TopResults` set with skip false -> true. Run `go -C <fork> test ./sim/core/bulk/`; if it fails on a `with_db` symbol, rerun with `--tags=with_db`. Acceptance: `ok` for the package, and `grep -c finalist <fork>/sim/core/bulk/finalist_skip_test.go` >= 1. Depends on C23.

**Step 5 — TS engine guard.** Edit `<fork>\ui\core\wasm\bulk_sim\index.ts` at line 167: only call `runConcurrentBulkSimFinalistStage` when `!request.skipFinalistStage`; otherwise leave `latestBaseline`/`latestResults` unchanged and push no metrics. Keep the existing comment; add one line naming the field. Acceptance: `git -C <fork> diff --stat -- ui/core/wasm/bulk_sim/index.ts` about 4 lines; `fnm exec --using=22 -- pnpm.cmd fork-lint:check` from `<core>` exits 0 (if this file is outside fork-lint's scope, run `npx tsc --noEmit -p <fork>` from `<fork>` with Node 22 and require exit 0). Depends on C7, C20.

**Step 6 — Our builder.** Edit `<fork>\ui\core\components\individual_sim_ui\upgrades\adapters\bulk_request_builder.ts`: at line 115 add `skipFinalistStage: true,` next to `topResults`; rewrite doc item 2 (lines 66-69) to say `topResults` has two jobs in both engines — response truncation (why it is the candidate count) and finalist-stage sizing (why the stage is skipped: ticket 403, 25 near-tied finalists never separate and the client reads one mean per candidate). Acceptance: `grep -n "skipFinalistStage: true" <file>` = 1 hit; `fnm exec --using=22 -- pnpm.cmd fork-lint:check` exits 0. Depends on C4.

**Step 7 — Build the packaged binary.** With Node 22 on PATH: `make -C <fork> wowsimtbc` (rebuilds dist, WASM and `wowsimtbc.exe`). Acceptance: `ls -la <fork>/wowsimtbc.exe` newer than Step 2's edits; record `sha256sum <fork>/wowsimtbc.exe` in `<out>\predictions.md` under "binary". Depends on C16.

**Step 8 — Capped measurement with the server log captured.** Start the server by hand from cwd `<fork>` with stderr to a file: PowerShell `Start-Process -FilePath <fork>\wowsimtbc.exe -ArgumentList '--launch=false','--host=:3333' -WorkingDirectory <fork> -RedirectStandardError <out>\server-fixed.log.err -RedirectStandardOutput <out>\server-fixed.log`. Wait for `http://localhost:3333/tbc/paladin/retribution/` to answer 200. Then, with Node 22, run three harness invocations (`<fork>\ui\core\components\individual_sim_ui\upgrades\tools\run-tab-cdp.mjs`, flags per its README lines 90-96): (a) `--origin http://localhost:3333 --candidates 20 --out <out>\smoke-cap20-fixed.json`; (b) same with `--force-fallback --out <out>\smoke-cap20-fixed-fallback.json`; then stop the server. Record the wall-clock window of (a) from the harness output. Acceptance: both JSONs exist with `done` true, `runTimedOut` false, `rowCount` 20, `panicHit` false; (a) has `runner` `BulkHttpSimRunner`, `requests.bulkSimAsync` 2, `screeningFallbackWarnings` 0; (b) has `runner` `WasmSimRunner`, `requests.bulkSimAsync` 0. Depends on C12, C15.

**Step 9 — Judge against the pre-registration.** Run, from `<core>` with Node 22 where needed:
- `python scripts/check_desktop_tab.py --compare <out>\smoke-cap20-fixed.json <stage>\smoke-3333-cap20.json` — must exit 0 and print `T3 ... max=0.0`, `aboveCutoffSymDiff=0`.
- `python scripts/check_desktop_tab.py --compare <out>\smoke-cap20-fixed.json <out>\smoke-cap20-fixed-fallback.json` — exit 0.
- `python -c "import json;a=json.load(open(r'<out>\smoke-cap20-fixed.json'));b=json.load(open(r'<stage>\smoke-3333-cap20.json'));print(a['rows']==b['rows'], a['aboveCutoffItems']==b['aboveCutoffItems'], a['elapsedS'])"` — must print `True True <n>` with n <= 120.
- `grep -c "Stage: finalist - Started" <out>\server-fixed.log.err` = 0 and `grep -c "Stage: high - Finished" <out>\server-fixed.log.err` = 2 (the log holds only this session's runs, so no time window is needed; if the server was reused, bound by time with `<stage>\parse_bulk_stage_timings.py --start --end`).
Write the outcome table into `<out>\predictions.md` under "Measured". Acceptance: every line above passes; any failure is the "fix is wrong" result — stop, report which line, do not tune constants. Depends on C1, C13, C22.

**Step 10 — WASM path unchanged (constraint 4) and the canonical gate.** (a) Start `<fork>\wowsimtbc.exe --launch=false --host=:3333 --usefs=true --wasm=true` from `<fork>` (stderr to `<out>\server-wasm.log.err`), run the harness with `--candidates 20 --out <out>\smoke-cap20-wasm.json`, stop it; then `python scripts/check_desktop_tab.py --compare <out>\smoke-cap20-fixed.json <out>\smoke-cap20-wasm.json --cross-transport` exits 0 and `rows` are equal by the python one-liner. (b) `fnm exec --using=22 -- pnpm.cmd desktop-gate:check --candidates 20` exits 0 (its own build, server, (a)-(g) and the screen check (h)). Acceptance: both exit 0; (b)'s printed `(h) twin wall clock` and screened `elapsedS` recorded in `<out>\predictions.md`. Depends on C7, C12.

**Step 11 — Records.** In `<core>`: (1) `fnm exec --using=22 -- pnpm.cmd sim-implemented-effects:generate`; `git -C <core> diff --stat data/sim-implemented-effects.json` must be the `forkCommit` line only (counts unchanged; if counts move, stop and report). (2) Update `data/wowsims-fork.lock.json` `commit` to the new fork HEAD after Step 12's commit (do Step 12 first, then return here), set `pushed` to `false`, and append a `_comment` entry in the file's existing style naming the four fork files, the field name, and that no `upgrades/engine` file moved (no PROVENANCE row). (3) `docs/fork-upstream-touchpoints.md`: add Category B rows for `proto/api.proto`, `sim/core/bulk/bulk_sim.go`, `ui/core/wasm/bulk_sim/index.ts` (each: what changed, why, avoidable = no without losing rows, upstream candidate = yes) and a Category A line for `sim/core/bulk/finalist_skip_test.go`; add the three to the merge-conflict table with risk `Low` (upstream 0 commits on these paths since HEAD, C5). (4) Write `<out>\upstream-report-draft.md` with the two Q4 drafts, header "Owner's call — not filed". (5) Ticket `403`: add a "Fix, <date>" section: mechanism, measured numbers from `<out>\predictions.md`, and the owner's-call note on option C; leave `Status: open` until merged. (6) File a new ticket under `.scratch/carry-forward/issues/` (next number from `fnm exec --using=22 -- pnpm.cmd issues:open`; read known-traps § "Before filing a ticket" first): "High stage adaptive passes deliver ~4x the requested iterations on desktop screening" citing C14 as hypothesis, with the measurement that settles it (cap-20 screened vs loop after this fix; the per-sim iteration count from `Running N iterations` lines). Acceptance: `git -C <core> status --porcelain` lists exactly these files plus `<out>\*` (JSONs, predictions, drafts, .gitignore); `fnm exec --using=22 -- pnpm.cmd verify` exits 0. Depends on C5, C6, C21.

**Step 12 — Fork commit (no push).** From the fork: `git -C <fork> add proto/api.proto sim/core/bulk/bulk_sim.go sim/core/bulk/finalist_skip_test.go ui/core/wasm/bulk_sim/index.ts ui/core/components/individual_sim_ui/upgrades/adapters/bulk_request_builder.ts` and commit with subject `Add skip_finalist_stage to BulkSimRequest` and a body stating the measured 0-finalist-line result and the two engines honoured (commit message per the global rules; write it with `-F` from a file). Do not push: pushing the fork is an owner-authorised act. Acceptance: `git -C <fork> status --porcelain` empty; `git -C <fork> show --stat HEAD` lists exactly five files. Then complete Step 11 (2). Depends on C17.

**Step 13 — Core commit.** From `<core>`, one commit for Step 11's files (pre-commit sweeps every dirty file, so confirm `git -C <core> status --porcelain` holds only this plan's files first). Subject `Skip the bulk finalist stage on desktop screening`. Acceptance: `git -C <core> status --porcelain` empty; `fnm exec --using=22 -- pnpm.cmd verify` exit 0 on the tip. Depends on none new.

## Paths manifest

Fork (`<fork>` = `C:\Users\dgree\Code\lulz\tbc-gear-prio\vendor\tbc-new-fork`), modified:
- `proto/api.proto`
- `sim/core/bulk/bulk_sim.go`
- `ui/core/wasm/bulk_sim/index.ts`
- `ui/core/components/individual_sim_ui/upgrades/adapters/bulk_request_builder.ts`

Fork, created:
- `sim/core/bulk/finalist_skip_test.go`

Fork, regenerated and gitignored (not committed): `sim/core/proto/api.pb.go`, `ui/core/proto/api.ts`, `dist/`, `wowsimtbc.exe`.

Core (`C:\Users\dgree\Code\lulz\tbc-gear-prio`), modified:
- `data/wowsims-fork.lock.json`
- `data/sim-implemented-effects.json` (forkCommit field only)
- `docs/fork-upstream-touchpoints.md`
- `.scratch/carry-forward/issues/403-bulk-screen-finalist-stage-burns-73pct-on-discarded-work.md`

Core, created:
- `.scratch/stage-gate/bulk-finalist-cost/.gitignore`
- `.scratch/stage-gate/bulk-finalist-cost/predictions.md`
- `.scratch/stage-gate/bulk-finalist-cost/smoke-cap20-fixed.json`
- `.scratch/stage-gate/bulk-finalist-cost/smoke-cap20-fixed-fallback.json`
- `.scratch/stage-gate/bulk-finalist-cost/smoke-cap20-wasm.json`
- `.scratch/stage-gate/bulk-finalist-cost/upstream-report-draft.md`
- `.scratch/stage-gate/bulk-finalist-cost/server-fixed.log.err`, `server-fixed.log`, `server-wasm.log.err` (gitignored)
- `.scratch/carry-forward/issues/<next-number>-high-stage-adaptive-passes-inflate-desktop-screening.md`

No fan-out: the fork has one shared working tree and a serial queue; every step runs in this one executor.

## Verify recipe

From `C:\Users\dgree\Code\lulz\tbc-gear-prio`, Node 22 via `fnm exec --using=22 -- pnpm.cmd`:

1. `fnm exec --using=22 -- pnpm.cmd verify` — exit 0 (includes `fork-lint:check`, `sim-implemented-effects:check`, `fork-universes:check`).
2. `gofmt -l vendor/tbc-new-fork/sim/core/bulk` — empty; `go -C vendor/tbc-new-fork test ./sim/core/bulk/` — `ok`.
3. `grep -c "Stage: finalist - Started" .scratch/stage-gate/bulk-finalist-cost/server-fixed.log.err` — `0`; `grep -c "Stage: high - Finished" <same>` — `2`.
4. `python scripts/check_desktop_tab.py --compare .scratch/stage-gate/bulk-finalist-cost/smoke-cap20-fixed.json .scratch/stage-gate/desktop-transport-gate/smoke-3333-cap20.json` — exit 0, `T3 max=0.0`, `aboveCutoffSymDiff=0`.
5. `python scripts/check_desktop_tab.py --compare .scratch/stage-gate/bulk-finalist-cost/smoke-cap20-fixed.json .scratch/stage-gate/bulk-finalist-cost/smoke-cap20-fixed-fallback.json` — exit 0.
6. `python -c "import json;a=json.load(open('.scratch/stage-gate/bulk-finalist-cost/smoke-cap20-fixed.json'));print(a['rowCount'],a['requests']['bulkSimAsync'],a['screeningFallbackWarnings'],a['elapsedS'])"` — `20 2 0 <n>` with n <= 120.
7. `fnm exec --using=22 -- pnpm.cmd desktop-gate:check --candidates 20` — exit 0.
8. `git -C vendor/tbc-new-fork diff --stat upstream/master -- sim/core/bulk proto/api.proto ui/core/wasm` — exactly the four fork files plus the new test, nothing else; `git -C vendor/tbc-new-fork status --porcelain` and `git status --porcelain` both empty.
9. `python -c "import json;l=json.load(open('data/wowsims-fork.lock.json'));print(l['commit'])"` equals `git -C vendor/tbc-new-fork rev-parse HEAD`.

## Out of scope

- Making 25-way finalist separation converge, loosening the 95% test, or changing `BulkSimFinalistMaxExtraIterationMultiplier` (owner's constraint 3).
- A finalist count field or top-2 refinement; that needs the refined finalists merged back into the full result list (`stage.go:291`) and has no consumer (Q2).
- The `high` stage's adaptive iteration inflation (C14) — filed as a ticket in Step 11, not fixed.
- Option C (loop runner on the HTTP transport) — owner's call, recorded in Approach; not implemented unless the owner chooses it, in which case this plan does not apply.
- Re-running the 3,419 s full pool (constraint 5).
- Fixing upstream's misleading `Target error: 0.00%` log line or adding a finalist-stage test beyond the pure-helper test in Step 4; both are in the upstream draft only.
- Filing anything upstream; pushing the fork; merging to `dev`; `pnpm merge-to-dev`.
- `upgrades/tools/bulk-spike.mts:123` (a measurement spike that also sets `topResults`); it measures the RPC as upstream ships it and stays as is.
- The CRLF `fork-universes` merge blocker and tickets 397 (its remaining half), 400, 401.
