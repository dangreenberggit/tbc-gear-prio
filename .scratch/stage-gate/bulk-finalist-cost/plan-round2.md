# Plan — bulk-finalist-cost (revision 2, Track C chosen)

## Goal

The upgrades tab stops using the Go bulk RPC on the desktop (HTTP) transport and
runs the same per-candidate loop it already runs on the web tab, against the
native server. No Go change, no proto change, no upstream divergence.

When this plan is done: a cap-40 desktop run reports `runner` `WasmSimRunner`
with `bulkSimAsync` 0, its rows are byte-equal to today's screening-off twin, the
desktop gate asserts the new runtime shape, and the decision is recorded in four
plain lines of comment plus ticket 403.

**The owner chose this track on 2026-09-15 and the choice is settled** — see
`decision-log.md`. Track A (a `skip_finalist_stage` proto field) is **dropped**;
its full specification is preserved in `plan-round1.md` and in revision 1's
history if it is ever revived.

### Why the owner chose it, in one paragraph

An independent advisor established that bulk screening is a **culling** tool for
combinatorial searches whose culling we skip at 25 flat candidates, so we pay its
overhead and get none of its purpose (C35). The precision it offers is already
beaten about 30x by the existing paired replication: measured SE **0.018-0.088
DPS** on replicated rows against **1.76-2.31** on unreplicated ones
(`.scratch/rank-reports/shredzepelin-p3.json`, field `ranking.items[].se`, C36).
Track A would have bought a 6x speedup while *reducing* precision and adding
upstream divergence; Track C is about 25x faster than today and matches the web
tab exactly (C37).

### Measured expectations

| Run | Today (bulk) | Track C (loop) | Source |
| --- | --- | --- | --- |
| cap 40 | 257 s | 17 s / 21.7 s | `gate-tip.log`, measured |
| cap 150 (134 rows) | not run | 37 s | measured 2026-09-15, C37 |
| full pool (601 rows) | 3419 s | **130-160 s, point ~136 s** | fitted, C37 |

The full-pool figure is a **fitted prediction, not a measurement**, and this plan
does not run the full pool (constraint 5). See C37 for the model and its two
stated uncertainties.

## Approach

### What changed since round 1

The reviewer's three blocking findings all hold, and I re-read the code and the logs to see what follows from them.

1. **The finalist stage's output is consumed, not discarded (F2, C26).** `rerunBulkSimStageAdditionalIterations` merges the extra iterations into the baseline and every finalist by carry-over (`stage.go:329-352`), the stage loop reassigns `baseline, finalists` from it (`stage.go:281-285`), and `bulk_sim.go:196-197` builds the response from those merged results. Because our builder sets `topResults` to the chunk size, every returned row in a chunk where the stage ran carries a mean over up to 4x the iterations (19,686 to 78,744 on the cap-20 first chunk, `server-release.log.err:133,253`). The honest statement of any fix that removes the stage is: **screening means for rows 9..N get about twice the standard error they have today.** The bound: with per-iteration DPS stdev 128 (C25, from ticket 398), the independent-sample upper bound on the delta's SE is 1.29 DPS at 19,686 iterations and 0.65 at 78,744; the expected shift from dropping the refinement has SD at most 1.12 DPS, so 5 sigma is 5.6 DPS. The plan asserts 6.0 DPS per row 9..N. For comparison, the loop path the web tab ships runs 3,000 iterations per candidate (`upgrades_tab.tsx:101`), whose same upper bound is 3.3 DPS (C32). So post-fix desktop screening on Track A is still about 2.5x tighter than the default tab, and Track C is exactly the default tab's precision.

2. **The tab does depend on engine-side values for displayed order of rows 9+ (F3, C8, C9).** `replicateTopItems` re-prices only above-cutoff items, at most 8 (`rank.ts:1455-1457`), and the tab always runs with 5 seeds (`rank.ts:411`; `raidSimAsync` = 46 = 1 + 5 x 9 in `smoke-release-cap20.json`), so rows 1..8 are always re-priced when at least 8 are above cutoff. Rows 9..N that are above cutoff (33 and 36 on the full runs, C11; about 14 above cutoff at cap 40, C28) display screening values, and `compareRows` orders them by float magnitude, reaching the deterministic tie-break only on exact equality (`view.ts:213-218`); `assignTieGroups` runs after the sort and never reorders (`view.ts:245-247`). So the stage's noise reduction did stabilise near-tie order among rows 9..N inside one chunk. My round-1 argument that "the tab does not rely on engine order stability" was wrong. The corrected Q2 argument is below.

3. **Client-only mechanisms are ruled out on correct facts (F4, C2, C24).** All three early returns in `runBulkSimFinalistStage` return the full, untruncated `results` (`stage.go:251-252`, `:259-262`, `:264-266`); only the stage-ran path returns `finalists` (`:291`). The truncation to one row for `topResults <= 1` comes from `bulk_sim.go:197`, not the stage. The question is then whether any request field reaches an early return without also truncating: none does. `SaveAllValues` is hard-coded on (`batch.go:106`), so the lockstep precondition always holds, and neither `BulkSimRequest` (`api.proto:429-437`) nor `BulkSettings` (`api.proto:740-753`) carries anything that stops the stage. The second cap-20 chunk (17 gear sets) did skip the stage (no finalist lines, `server-release.log.err:260-320`), and the only remaining early return that fits is "no adjacent pair unresolved at 95%" (`stage.go:264`; C27, inferred) — which the client cannot cause.

4. **The cap-20 timing profile is not 13.7% (F5, disagreement with evidence).** The `Finalists: 13 / Duration 36.11s` the reviewer cited is at `server-3333.log.err:14474-14476`, timestamped 18:22:05 — the last chunk of the 3,419 s full-pool run, not the cap-20 run. The cap-20 first chunk ran 25 finalists for 165.70 s of 264 s (3333 run, 16:33-16:36 window) and 104.70 s of 173 s (release run, `server-release.log.err:140-259`), i.e. 60-63%. I still accept the finding's conclusion: the same run type varied 173 s to 264 s on the same machine, so wall clock is reported, not asserted; the finalist-line count is the assertion (C13, C34).

5. **The fixture question is answered from disk, no new run needed.** `smoke-release-cap20.json` was recorded after the harness parser fix (`run-tab-cdp.mjs:274-279`, decision-log D6) and has 20 populated rows: 8 above cutoff, 12 below, rounded to 0.1 DPS; its top 8 are byte-equal to the 3333 pair's (C29, C12). So cap 20 already clears the 8-item band, but every row 9+ at cap 20 is below cutoff and hidden in the collapsed `<details>`. The row class F3 cares about — above cutoff, rank 9+, not replicated — first appears at cap 40 (about 14 above cutoff, `decision-log.md:275`; gate run 257 s screened, 17-22 s loop, T2 over 32 rows, `gate-tip.log`). The plan measures at cap 40. Cost: about 5 minutes of sim time per pair, well inside constraint 5.

### Why Track A was dropped

Round 1 recommended A because "nothing is lost". With F2 in hand, A was a trade: it removes 60-73% of the wall clock but leaves the `high` stage delivering 16,599-19,686 iterations against 3,000 requested (C14), so a cap-40 desktop screen would still take about 100 s (hypothesis) against 17 s for the native loop (C28), and it halves the screening precision it was paying for. The only thing A kept that C does not is a 2.5x tighter SE on rows 9..N than the default tab — a property nobody asked for and the web tab does not have. To make A faster than C, the `high` stage's adaptive inflation would need a second Go divergence. Ticket 397's title already records that desktop bulk screening is not a speed win; C makes it unnecessary rather than cheaper.

What C costs, stated plainly:

- The desktop gate loses its screening assertions. `check_desktop_tab.py` (b) `runner == BulkHttpSimRunner` (`:412`), (c) `bulkSimAsync >= 1` (`:414-421`) and the screened-vs-twin check (h) (`:514-537`) all assume the bulk path (C31). Under C, (b) and (c) invert (runner `WasmSimRunner`, `bulkSimAsync == 0`, `raidSimAsync >= 1`), and (h) plus the N2 negative are removed; the cross-transport comparison in Step C4 takes over the "desktop ranks like the web tab" invariant. That is a real reduction in automated coverage and the owner should weigh it.
- `BulkHttpSimRunner`, `bulk_request_builder.ts`, `partition.ts` and the TS bulk adapters become dead at runtime but stay in the tree (deleting them is a larger fork diff and the owner may revisit; ticketed in C5).
- Tickets 397 (remaining half), 400, 401 concern the screening path; C5 re-scopes them rather than closing them silently.
- Precision on rows 9..N drops from today's 0.65 DPS SE upper bound to 3.3 (the default tab's). Note what this does **not** touch: the global top 8 keep their paired-replicated 0.018-0.088 DPS (C36), because `replicateTopItems` runs on both transports regardless of screening.

What C buys: 13-17 s instead of 173-264 s at cap 20-40 (C12, C28, C30); a fitted full-pool run of 130-160 s against today's measured 3419 s (C37); desktop and web tab run the same code path with the same seeds, so "no ranking change" becomes byte-equality against the existing screening-off twin instead of a noise bound; zero upstream divergence; and the bulk RPC is one line away if the `high` stage's inflation is ever fixed.

### The precision question the owner reframed, and where it actually lives

The owner's point, recorded in `decision-log.md` and filed as **ticket 404**:
recommendations are mostly **per slot**, so the load-bearing output is the top-1
*within* a slot, not the global ordering this plan's two rounds argued about.
`PAIRED_REPLICATE_TOP_N` is a **global** top 8 (`se.ts:6`), not per slot, so a
slot whose contenders all rank below 8 gets no replication at all — which is a
precision gap that exists **today, on both transports, and is unchanged by this
plan**. It is not a Track C regression and is out of scope here; 404 owns it.

This matters for honesty about what C changes: C moves rows 9..N from one
unreplicated precision (bulk's ~1.3 DPS) to another (the loop's ~3.3), while the
decision-relevant per-slot gap is untouched either way.

### Q1 — how to separate the two meanings of `topResults`

| Candidate | Touches | Result that makes it win (pre-registered) | Measurement |
| --- | --- | --- | --- |
| C: loop runner on the HTTP transport | our tab (`upgrades_tab.tsx:1159-1168`), our gate script | cap-40 desktop run: `runner` `WasmSimRunner`, `bulkSimAsync` 0, rows byte-equal to the pre-fix loop twin, T1/T2/T4 pass vs the pre-fix screened run, cross-transport vs WASM exit 0, `elapsedS` reported (predicted 15-25 s) | Steps S2, C3-C4 |
| A: `skip_finalist_stage` request field | proto, Go (`bulk_sim.go`), TS engine (`index.ts`), our builder | (as specified in round 1) | **dropped by the owner** — 6x slower than C, reduces precision, adds upstream divergence |
| A': gate the stage behind `use_legacy_bulk_sim` | Go + TS engine, no proto | same as A | not measured; dropped — changes behaviour for upstream's own small runs (`estimate.ts:5-13`), unlikely to be accepted upstream |
| Any client-only request setting | our builder only | would need an early return that keeps the full list | ruled out by C24: no field reaches `stage.go:251/259/264` without `bulk_sim.go:197` truncating |
| Chunk size 1 | our partition only | per-candidate cost below the loop's | not measured; dropped by C19 (2 sims per candidate at 16,599+ iterations vs 1 at 3,000) |

### Q2 — what finalist size, if any

**Recommendation: none, on both tracks.** Corrected argument:

- The stage's purpose is order stability of near-tied displayed results. In the tab, rows 1..8 above cutoff are re-priced by 5-seed paired replication regardless of screening (C8), so the stage can only stabilise displayed rows 9..N that are above cutoff, and only pairs inside one 25-candidate chunk; chunks are cut in input order (`partition.ts:87-89`), not by DPS, so most adjacent displayed pairs are cross-chunk (C10, structural).
- The web tab — the default path (constraint 4) — orders those same rows on 3,000-iteration values with an SE upper bound of 3.3 DPS (C32). Track A leaves desktop at 1.29 (C25); Track C matches the web tab exactly. Neither is worse than what the product ships by default.
- What "none" loses: the within-chunk near-tie stability among rows 9..N on desktop, worth at most the difference between 0.65 and 1.29 DPS SE. What top-2 would buy: nothing, because rows 1..2 are always replicated; and top-2 does not work without Go surgery (the stage-ran path returns only the finalists, `stage.go:291`).
- Pre-registered check that "none" is safe (Track C): Step C3 line 1 — rows byte-equal to the pre-fix loop twin — plus Step C3 line 2's T1/T2/T4 against the pre-fix screened run. A failure outside those bounds means the stage was contributing more than sampling noise and this recommendation is wrong.

### Q3 — proving the ranking is within the stated bound, inside the capped budget

Measurement design shared by both tracks, cap 40, harness `run-tab-cdp.mjs` (parser-fixed, C29), server started by hand with stderr captured (the gate script discards it, `check_desktop_tab.py:168-173`, C15):

1. **Pre-fix baseline pair on the current fork tip** (Step S2): `prefix-cap40-screened.json` (expect `runner` `BulkHttpSimRunner`, `bulkSimAsync` 3, about 14 above cutoff) and `prefix-cap40-loop.json` (`--force-fallback`). Log `server-prefix.log.err` must contain 3 `Stage: finalist - Started` lines or fewer (C27 says a chunk may skip it) and at least 1.
2. **Post-fix runs** per track (Steps A8 / C3), plus a `--wasm=true` server run for constraint 4.
3. **Comparisons** — Step C3. The "fix is wrong" results: any row shortfall (`rowCount` != 40); any `bulkSimAsync` request on the post-fix desktop run; rows differing from the pre-fix loop twin; or T1/T2/T4 failing against the pre-fix screened run.

Note the 6.0 DPS bound in C25 was derived for Track A, where screening values shift by sampling noise. **Track C does not need it**: the loop path is deterministic run-to-run at fixed seeds, so the acceptance is exact byte-equality against the pre-fix loop twin, not a noise bound. C25 is retained in the register as the evidence for the precision comparison in the Approach, not as a Track C acceptance criterion.

Why 6.0 DPS: C25. The per-row false-fail probability at 5 sigma over about 32 rows is negligible, and the independent-sample SD is an upper bound because the sims share seed sequences. The hypothesis inside it is that P5 gear's per-iteration stdev is close to P3's 128 (398 measured P3; the tab runs P5). Step S2 records `baselineDps` and the executor reports the observed max shift next to the bound; if the observed max is under 6.0 but over 3.4 (3 sigma), that is recorded as a note for the owner, not a failure.

### Q4 — upstream report

**Recommend filing two items, separately; filing is the owner's call.** Drafts go to `<out>\upstream-report-draft.md` (Steps C5 / A10). Draft 1 (bug) is unchanged from round 1: the finalist stage logs `Target error: 0.00%` from an unset field (`stage.go:24`) while its real stopping test (`statistics.go:130-142`) is never logged, and no `_test.go` in `sim/core/bulk/` covers the stage; observed consequence, 29 of 29 full-pool chunks at 4.000x with all survivors. Draft 2 depends on the track: under A it is the `skip_finalist_stage` PR text from round 1, corrected to say the field trades refinement of the returned means for time; under C it is a note only — callers that set `top_results` to the candidate count get a finalist stage over every candidate, and a per-request way to decline it would be useful — with no code attached.

## Claims register

Status column: **unchanged** (round 1, stands), **revised** (fact corrected this round), **new**, **refuted** (kept for the record, superseded by the claim named).

| ID | Claim | Load-bearing | Status | Verified by |
| --- | --- | --- | --- | --- |
| C1 | Finalist stage = 2494 s of 3420 s (72.9%) on the full desktop run; 29/29 chunks at 4.000x; all `Survivors: 25`. | yes | unchanged | **Inherited** from `.scratch/carry-forward/issues/397-desktop-bulk-screen-not-a-speed-win.md` § "Cost attribution" and `.scratch/stage-gate/desktop-transport-gate/finalist-stage-per-chunk.csv`. Source log untracked; re-derivable with `python <stage>/parse_bulk_stage_timings.py <stage>/server-3333.log.err --start 17:26:19 --end 18:23:19`. |
| C2 | Go: finalists = `topBulkSimResults(results, topResults)` (`stage.go:250`); the three early returns at `:251-252`, `:259-262`, `:264-266` return the full `results`; only the stage-ran path returns `finalists` (`:291`); `bulk_sim.go:197` truncates whatever comes back with `topResults`. | yes | revised (F4) | `sed -n 249,266p; sed -n 291p` on `<fork>/sim/core/bulk/stage.go`; `sed -n 186,197p <fork>/sim/core/bulk/bulk_sim.go` |
| C3 | `TopResults` is read at `bulk_sim.go:87-89` (default 5), `:189` (stage size), `:197` (truncation); the stage call is ungated. | yes | unchanged | `grep -n "topResults\|TopResults" <fork>/sim/core/bulk/bulk_sim.go` |
| C4 | Our upgrades path sets `topResults` only at `bulk_request_builder.ts:115`; other setters are upstream's tab (`ui/core/sim.ts:563`) and the spike tool (`upgrades/tools/bulk-spike.mts:123`). | yes (A) | unchanged | `grep -rn "topResults:" <fork>/ui/core --include=*.ts --include=*.mts --include=*.tsx` (3 hits) |
| C5 | `sim/core/bulk`, `sim/web`, `proto/api.proto`, `ui/core/wasm`, `ui/core/proto` are byte-identical to `upstream/master` (`17a8fb28c`); 0 newer upstream commits on `sim/core/bulk` or `proto/api.proto`. | yes (A) | unchanged | `git -C <fork> diff --stat upstream/master -- sim/core/bulk sim/web proto/api.proto ui/core/wasm ui/core/proto` (empty); `git -C <fork> log --oneline HEAD..upstream/master -- sim/core/bulk proto/api.proto` (empty) |
| C6 | The fork takes upstream by merge and carries one Go divergence (`sim/hunter/item_sets.go`). | no | unchanged | `git -C <fork> log --oneline --merges -5`; `git -C <fork> diff --stat upstream/master...HEAD -- sim/ proto/` |
| C7 | The WASM tab never constructs `BulkWasmSimRunner` (`makeSimRunner(bulk = false)`, `bulk_wasm_sim_runner.ts:182-199`; `upgrades_tab.tsx:462`), so the TS engine's finalist call (`index.ts:167`) is unreachable by default. | yes | unchanged | `sed -n 182,199p <fork>/ui/core/components/individual_sim_ui/upgrades/adapters/bulk_wasm_sim_runner.ts`; `readback-wasm-tip.json` `runner` = `WasmSimRunner`, `requests.bulkSimAsync` = 0 |
| C8 | `replicateTopItems` returns early only when `seeds.length <= 1` (`rank.ts:1453`, `se.ts:16-18`); it re-prices above-cutoff simmed items up to 8 (`rank.ts:1455-1457`, `se.ts:6`), overwriting `deltaDps`/`se`/`belowCutoff` (`:1480-1485`). The tab always passes 5 seeds (`DEFAULT_SEEDS`, `rank.ts:411`). Above-cutoff rows at rank 9+ keep screening values. | yes | revised (F3) | `sed -n 411p; sed -n 1448,1487p` on `<fork>/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts`; `sed -n 6,18p .../engine/se.ts`; `python -c "import json;print(json.load(open('<stage>/smoke-release-cap20.json'))['requests']['raidSimAsync'])"` = 46 = 1 + 5 x 9 |
| C9 | `compareRows` orders by `sortKey` float first (`view.ts:213-215`); the `bisTags.length`/`itemId` tie-break applies only on exact equality (`:216-218`); `assignTieGroups` runs after the sort and only stamps `tieGroupId` (`:129-155`, called at `:247`). Engine-side value noise therefore affects display order of near-tied rows 9+. | yes | revised (F3) | `sed -n 123,155p; sed -n 202,247p` on `<fork>/ui/core/components/individual_sim_ui/upgrades/engine/view.ts` |
| C10 | Chunks are cut in input order, 25 per request (`partition.ts:69`, `:87-89`); the stage separates adjacent pairs within one chunk only. | no | unchanged (reworded) | `sed -n 69p; sed -n 77,92p` on `<fork>/ui/core/components/individual_sim_ui/upgrades/engine/bulk/partition.ts`; structural, not measured |
| C11 | With the stage on, above-cutoff sets differ across transports on the full run: 33 desktop vs 36 WASM. | no | unchanged | `python -c "import json;print([json.load(open(f))['aboveCutoff'] for f in ['<stage>/readback-3333-tip.json','<stage>/readback-wasm-tip.json']])"` |
| C12 | Cap-20 screened vs loop: 264 s vs 13 s, `bulkSimAsync` 2 vs 0; the row equality in those two files is over 8 populated + 12 empty rows (pre-parser-fix). The post-fix `smoke-release-cap20.json` (173 s) has 20 populated rows and its top 8 are byte-equal to both. | yes | revised (F1) | `python -c "import json;d='<stage>/';a=json.load(open(d+'smoke-3333-cap20.json'));b=json.load(open(d+'smoke-release-cap20.json'));c=json.load(open(d+'smoke-3333-cap20-fallback.json'));print(sum(r['dps'] is not None for r in a['rows']),sum(r['dps'] is not None for r in b['rows']),a['rows'][:8]==b['rows'][:8]==c['rows'][:8],a['elapsedS'],b['elapsedS'],c['elapsedS'])"` -> `8 20 True 264 173 13` |
| C13 | Cap-20 finalist share: 165.70 s of 264 s (3333 run) and 104.70 s of 173 s (release run), first chunk, 25 finalists, 19,686 -> 78,744 iterations. Wall clock varies 1.5x between identical runs, so timing is reported, not asserted. | no | revised (F5) | `grep -n "Finalists:\|Iterations so far\|Iterations:\|Duration:" <stage>/server-release.log.err` (lines 133-259); `awk '/16:3[3-9]/{p=1} /16:4/{p=0} p' <stage>/server-3333.log.err \| grep -n "Duration:\|Finalists:"` |
| C14 | The `high` stage is asked for 3,000 iterations (`Min iterations: 3000`; `DEFAULT_ITERATIONS = 3000`, `upgrades_tab.tsx:101`) and delivers 19,686 (25-set chunk) or 16,599 (17-set chunk) per sim; a chunk runs 26/18 sims. Post-fix desktop screening on Track A is therefore predicted to stay several times slower than the loop per candidate. | no | revised (F8) | `grep -n "Min iterations\|Running .* iterations\|Iterations:" <stage>/server-release.log.err`; `sed -n 101p <fork>/ui/core/components/individual_sim_ui/upgrades_tab.tsx`. Wall-clock consequence: **hypothesis, untested** — the follow-up ticket's question. |
| C15 | `desktop-gate:check` starts the server with stdout and stderr to `DEVNULL`. | no | unchanged | `sed -n 168,173p <core>/scripts/check_desktop_tab.py` |
| C16 | Proto toolchain present; `api.pb.go` and `api.ts` gitignored. | yes (A) | unchanged | `go version; protoc-gen-go --version; ls <fork>/node_modules/@protobuf-ts; git -C <fork> check-ignore -v ui/core/proto/api.ts sim/core/proto/api.pb.go` |
| C17 | Fork queue free at planning time: fork clean, HEAD `e94d927af` = lock `commit`, `pushed` true. | yes | unchanged | `git -C <fork> status --porcelain; git -C <fork> rev-parse HEAD; git -C <fork> worktree list; python -c "import json;l=json.load(open('<core>/data/wowsims-fork.lock.json'));print(l['commit'],l['pushed'])"` — re-run at S0 |
| C18 | `BulkSimRequest` uses field numbers 1-8; 9 is free. | yes (A) | unchanged | `sed -n 429,437p <fork>/proto/api.proto`; `grep -n reserved <fork>/proto/api.proto` |
| C19 | A 1-candidate chunk costs 2 sims per candidate at 16,599+ iterations, so it cannot beat the loop's 1 sim at 3,000. | no | unchanged | Inferred from `bulk_sim.go:170-176` and C14; **hypothesis, untested** (dropped candidate) |
| C20 | The TS engine's finalist call at `index.ts:167` is unconditional and its precondition is satisfiable (`batch.ts:38`). | no | unchanged | `sed -n 163,171p <fork>/ui/core/wasm/bulk_sim/index.ts`; `sed -n 38p <fork>/ui/core/wasm/bulk_sim/batch.ts` |
| C21 | `forkCommit` in `data/sim-implemented-effects.json` is the fork clone's `HEAD` (`generate_sim_implemented_effects.py:184`, `:249`); the generator refuses to run when HEAD differs from the lock pin (`:37-38`, `:218-219`); the check compares `forkCommit` to the pin (`check_sim_implemented_effects.py:147`). So the order is: fork commit, then lock bump, then regen, then `verify`. Counts (221/451) should not move on either track. | yes | revised (F6) | `grep -n "rev-parse\|forkCommit" <core>/scripts/generate_sim_implemented_effects.py <core>/scripts/check_sim_implemented_effects.py`; counts: **hypothesis, untested** until the regen diff |
| C22 | Rows 1-8 are byte-identical between fixed and pre-fix runs. | — | refuted (F1/F2); superseded by C25 | Only true if top-8 membership is unchanged; membership depends on screening values at ranks 8/9. Kept as the prediction inside C25, not as a standalone claim. |
| C23 | `sim/core/bulk` has two test files, neither mentioning the finalist stage. | no | unchanged | `grep -il finalist <fork>/sim/core/bulk/*_test.go` (none); `with_db` tag need: **hypothesis, untested** |
| C24 | No `BulkSimRequest` or `BulkSettings` field can make the finalist stage early-return without truncating the response: `SaveAllValues` is hard-coded (`batch.go:106`), `high_stage_iterations` only sets the floor (`stage.go:203-207`), `BulkSettings` fields are item/slot/legacy flags (`api.proto:740-753`). | yes | new (F4) | `grep -n SaveAllValues <fork>/sim/core/bulk/*.go` (one hit, `batch.go:106`); `sed -n 429,437p; sed -n 740,753p` on `<fork>/proto/api.proto` |
| C25 | Precision bound. Per-iteration DPS stdev 128.06 on P3 ret gear at 25,000 iterations (398). Independent-sample SE of a screening delta: sqrt(2) x 128 / sqrt(n) = 1.29 DPS at n = 19,686, 0.65 at 78,744. Dropping the refinement shifts the mean by (59,058/78,744) x (m1 - m2), SD <= 0.75 x sqrt(1.29^2 + 0.745^2) = 1.12 DPS; 5 sigma = 5.6. Assert <= 6.0 DPS per row 9..N. Shared seeds make the true SD smaller, so the bound is conservative. | yes | new (F1/F2) | `cat <stage>/398-engine-delta-p3.md` (stdev row); iteration counts from C13; arithmetic shown. **Hypothesis** inside it: P5 stdev is close to P3's; S2 records `baselineDps` and the observed max shift is reported beside the bound. |
| C26 | The finalist stage merges its extra iterations into the returned means: `rerunBulkSimStageAdditionalIterations` carries over existing results (`stage.go:329-352`), the loop reassigns `baseline, finalists` (`:281-285`), and `bulk_sim.go:196-197` builds the response from them. | yes | new (F2) | `sed -n 278,292p; sed -n 329,352p` on `<fork>/sim/core/bulk/stage.go`; `sed -n 186,197p <fork>/sim/core/bulk/bulk_sim.go` |
| C27 | The 17-set second chunk of the cap-20 runs skipped the finalist stage (no finalist lines between its `high - Starting` and the run's end). The only early return consistent with C24 and the log is "no unresolved adjacent pair" (`stage.go:264`). | no | new | `sed -n 260,330p <stage>/server-release.log.err \| grep -c finalist` = 0; which return: **inferred, untested** |
| C28 | Cap-40 desktop gate on the current tip: screened 257 s (`bulkSimAsync` 3, 40 rows), loop twin 17 s / 21.7 s, T2 max 8.1 over 32 rows, T3 max 0 over 8, `aboveCutoffSymDiff` 1, `baselineDpsDiff` 0.0. About 14 above cutoff at cap 40. | yes | new | `cat <stage>/gate-tip.log`; `sed -n 270,280p <stage>/decision-log.md` (the ~14-15 unique keys note); exact above-cutoff count: **hypothesis** until S2 prints it |
| C29 | The harness parser fix (`run-tab-cdp.mjs:274-279`, opens every `<details>` before reading) post-dates `readback-3333-tip.json` and `readback-wasm-tip.json` (33/601 and 36/601 rows populated) and pre-dates `smoke-release-cap20.json` (20/20) and `readback-3333-old.json` (601/601). Only post-fix files are usable for rows 9..N. | yes | new (F1) | `sed -n 274,279p <fork>/ui/core/components/individual_sim_ui/upgrades/tools/run-tab-cdp.mjs`; `sed -n 279,300p <stage>/decision-log.md`; the C12 python line extended to the two readbacks |
| C30 | Track C's runtime path is exactly the `--force-fallback` twin's: `simRunner()` returns `this.sim` when the probe throws (`upgrades_tab.tsx:1159-1168`); that path is native `raidSimAsync` over HTTP and is deterministic run to run (`baselineDpsDiff` 0.0, C28; same-computation determinism, 398). | yes (C) | new | `sed -n 1130,1168p <fork>/ui/core/components/individual_sim_ui/upgrades_tab.tsx`; `cat <stage>/gate-tip.log` |
| C31 | Desktop gate assertions that assume the bulk path: (b) `:412`, (c) `:414-421`, (h) `:514-537` and the N2 negative (`--force-fallback`, `:203-204`, `:469`). Docs naming the gate: `docs/agents/upstream-catch-up.md:233-234`; reviews at `docs/reviews/feat-desktop-transport-gate.md:23,29`, `docs/reviews/feat-tab-scope-truth.md:131`. | yes (C) | new | `grep -n "BulkHttpSimRunner\|bulkSimAsync\|force-fallback" <core>/scripts/check_desktop_tab.py`; `grep -rn desktop-gate <core>/docs` |
| C32 | The loop path (web tab default and Track C) sims each candidate once at the tab's iterations (3,000 default), SE upper bound sqrt(2) x 128 / sqrt(3000) = 3.3 DPS. | no | new | `sed -n 101p <fork>/ui/core/components/individual_sim_ui/upgrades_tab.tsx`; arithmetic on C25's stdev |
| C33 | `fork-lint:check` runs oxlint only over `upgrades/` and `upgrades_tab.tsx` (`check_fork_lint.py:80-82`, `:164`) but `tsc --noEmit` over the whole fork project (`:181`); the fork's own `npm run lint:js` is `npx oxlint ./ui` (fork `package.json:18`), which covers `ui/core/wasm`. | no | new (F7) | `sed -n 80,82p; sed -n 160,183p` on `<core>/scripts/check_fork_lint.py`; `sed -n 18p <fork>/package.json` |
| C34 | `Finalists: 13 / Iterations so far: 15027` is the last chunk of the full-pool run (18:22:05), not a cap-20 chunk; all 53 other finalist starts in that log are `Finalists: 25`. | no | new (F5) | `grep -n -A1 "Finalists: 13" <stage>/server-3333.log.err` (line 14474-14476); `grep "Finalists:" <stage>/server-3333.log.err \| sort \| uniq -c` |
| C35 | Bulk screening is a **culling** tool: Low/Medium stages cull, High sims survivors, the finalist stage separates the top `topResults` (default 5, `bulk_sim.go:12`). At 25 flat candidates the culling stages are skipped (`bulk_sim.go:131-133`), so we run only the two expensive parts and get none of the culling. | yes | new (rev 2) | `sed -n 12p; sed -n 131,133p` on `<fork>/sim/core/bulk/bulk_sim.go`; `stage.go:241-248` doc comment; 397's note |
| C36 | Paired replication already delivers what the finalist stage cannot. Measured in a committed report: replicated rows **SE 0.018-0.088 DPS**, unreplicated **1.76-2.31 DPS** — about 30x. `replicateTopItems` runs on both transports regardless of screening, so Track C does not touch it. | yes | new (rev 2) | `python -c "import json;d=json.load(open(r'<core>\.scratch\rank-reports\shredzepelin-p3.json'));[print(x['name'],x['se']) for x in d['ranking']['items'][:14]]"` — orchestrator-verified 2026-09-15 |
| C37 | Native loop cost is `fixed + per_row * N`, **not** a flat rate. Three independent pairwise fits over measured points (20 rows / 13 s, 40 / 17 s, 134 / 37 s) agree: fixed **8.5-9.0 s**, slope **0.200-0.213 s/row**. Corroborated independently by request counts (~40 fixed + ~1.2/row, consistent with the top-8 x 5-seed replication being pool-size-independent). Full-pool prediction at 601 rows: **~136 s, range 130-160**. | yes | new (rev 2) | cap-150 run measured 2026-09-15 (`--force-fallback`, 134 rows, 37 s, 201 raidSimAsync, `runner` `WasmSimRunner`, `bulkSimAsync` 0); cap-20 from `smoke-3333-cap20-fallback.json`; cap-40 from `gate-tip.log`. **Prediction, not measurement.** Two stated uncertainties: (i) loop-path run-to-run variance is **unmeasured** — the bulk cap-20 type varied 264 s vs 173 s (42% of mean) and no loop repeat exists; (ii) 601 rows is ~4.5x beyond the largest calibration point, so worker-pool saturation at fixed `poolSize` 20 could bend the slope. A cap-300 run (~70-100 s) would halve the extrapolation. |

## Steps

Environment rules for every step: no `cd X && cmd`; absolute paths; Node 22 via `fnm exec --using=22 -- pnpm.cmd <script>` from `<core>`, or the PATH pin in `docs/agents/known-traps.md` § "Before running node / pnpm / test commands"; `git -C`; edits with the harness Edit tool (known-traps § "Before any scripted or generated file edit"); read known-traps § "Before starting the dev servers" before any server start. `<core>` = `C:\Users\dgree\Code\lulz\tbc-gear-prio`, `<fork>` = `<core>\vendor\tbc-new-fork`, `<stage>` = `<core>\.scratch\stage-gate\desktop-transport-gate`, `<out>` = `<core>\.scratch\stage-gate\bulk-finalist-cost`, `<harness>` = `<fork>\ui\core\components\individual_sim_ui\upgrades\tools\run-tab-cdp.mjs` (flags per its README lines 90-96). Server start pattern (PowerShell): `Start-Process -FilePath <fork>\wowsimtbc.exe -ArgumentList '--launch=false','--host=:3333' -WorkingDirectory <fork> -RedirectStandardError <log>.err -RedirectStandardOutput <log>`, then wait for `http://localhost:3333/tbc/paladin/retribution/` to answer 200; stop it with `Stop-Process` on the recorded PID before the next start. Every harness invocation: `node <harness> --origin http://localhost:3333 --candidates 40 --out <file>` with Node 22, plus `--force-fallback` where named.

### Shared steps

**S0 — Preconditions and owner gate.** Run C17's commands; both trees clean, fork HEAD = lock `commit`. Confirm `node --version` = v22.x, `go version`, port 3333 free (`netstat -ano | findstr :3333` empty). Read `docs/agents/known-traps.md` in full. **The track is settled: Track C.** The owner chose it on 2026-09-15 (`decision-log.md`); do not re-open the question or ask. Acceptance: all commands return C16/C17 values. Depends on C16, C17.

**S1 — Pre-register before any measurement.** Create `<out>\.gitignore` containing `*.log` and `*.log.err`. Create `<out>\predictions.md` with: the core and fork SHAs (`git -C <core> log -1 --format=%H`, `git -C <fork> rev-parse HEAD`); verbatim from this plan's Q3 the "fix is wrong" list; the predicted post-fix cap-40 `elapsedS` (15-25 s, **reported not asserted**); and the expected cap-40 counts (`rowCount` 40, `bulkSimAsync` 3 pre-fix and 0 post-fix, about 14 above cutoff). Acceptance: file exists with those sections and the two SHAs. Depends on C28, C37.

**S2 — Pre-fix baseline pair on the current tip.** Build: `make -C <fork> wowsimtbc` with Node 22 on PATH; record `sha256sum <fork>/wowsimtbc.exe` in `predictions.md` under "binary, pre-fix". Start the server with stderr to `<out>\server-prefix.log.err`. Run the harness twice: `--out <out>\prefix-cap40-screened.json`, then `--force-fallback --out <out>\prefix-cap40-loop.json`. Stop the server. Acceptance (python one-liners, all must hold): screened has `done` true, `runTimedOut` false, `panicHit` false, `rowCount` 40, `runner` `BulkHttpSimRunner`, `requests.bulkSimAsync` 3, `screeningFallbackWarnings` 0, all 40 rows with `dps` not None, `aboveCutoff` >= 9; loop has `runner` `WasmSimRunner`, `bulkSimAsync` 0, `rowCount` 40, 40 populated rows; `grep -c "Stage: finalist - Started" <out>\server-prefix.log.err` between 1 and 3; `python scripts/check_desktop_tab.py --compare <out>\prefix-cap40-screened.json <out>\prefix-cap40-loop.json` exits 0. Record `aboveCutoff`, `elapsedS` of both, the finalist line count and each finalist `Duration:` in `predictions.md` under "Measured, pre-fix". If `aboveCutoff` < 9, stop and report: cap 40 did not produce the un-replicated above-cutoff row class and the cap must be raised (re-run at 60 is allowed; the full pool is not). Depends on C15, C28, C29.

### Track C — loop runner on the HTTP transport

**C1 — Tab change.** Edit `<fork>\ui\core\components\individual_sim_ui\upgrades_tab.tsx`: make `simRunner()` (lines 1159-1168) resolve to `this.sim` unconditionally; delete the `WorkerPool(1).isWasm()` probe; remove any import that becomes unused. Keep the `data-runner` attribute line (1234) as is.

**The comment is a deletion, not a rewrite — this is an owner instruction.** The existing ~30-line doc comment (lines ~1130-1158) argues for the bulk runner and would otherwise be replaced by an equally long essay arguing the opposite. Replace the whole block with **about four plain lines**, in the house style (why, not what), along these lines:

> The desktop transport uses the per-candidate loop, not the Go bulk RPC.
> Bulk screening measured 257 s against 17 s at cap 40 (ticket 403); its
> finalist stage refines every candidate because `topResults` must equal the
> chunk size. `BulkHttpSimRunner` stays in the tree — see 403 before re-enabling.

Do not restate the measurements beyond that one figure; they live in ticket 403. The general problem of over-long fork comments is **ticket 405**, not this step — do not start that pass here.

Also add **one line** to `bulk_request_builder.ts` doc item 2 (lines 66-69) noting that `topResults` also sizes the finalist stage (ticket 403), so a future re-enable is informed. One line, not a paragraph.

Acceptance: `fnm exec --using=22 -- pnpm.cmd fork-lint:check` exits 0; `git -C <fork> diff --stat` lists exactly those two files; the `simRunner` comment block is **shorter than it was** (`git -C <fork> diff -- <file>` shows net-negative comment lines). Depends on C30.

**C2 — Build and run post-fix.** `make -C <fork> wowsimtbc`; record the new sha256 under "binary, post-fix". Start the server with stderr to `<out>\server-c.log.err`; run the harness `--out <out>\c-cap40-desktop.json` (no `--force-fallback`); stop it. Start `<fork>\wowsimtbc.exe --launch=false --host=:3333 --usefs=true --wasm=true` with stderr to `<out>\server-c-wasm.log.err`; run the harness `--out <out>\c-cap40-wasm.json`; stop it. Acceptance: both JSONs `done` true, `rowCount` 40, `panicHit` false, 40 populated rows; desktop has `runner` `WasmSimRunner`, `requests.bulkSimAsync` 0, `requests.raidSimAsync` >= 1, `screeningFallbackWarnings` 0, `screeningFallbackTexts` empty. Depends on C30.

**C3 — Judge against the pre-registration.** From `<core>`:
1. `python -c "import json;a=json.load(open(r'<out>\c-cap40-desktop.json'));b=json.load(open(r'<out>\prefix-cap40-loop.json'));print(a['rows']==b['rows'], a['aboveCutoffItems']==b['aboveCutoffItems'], a['elapsedS'], b['elapsedS'])"` must print `True True <n> <m>`.
2. `python scripts/check_desktop_tab.py --compare <out>\c-cap40-desktop.json <out>\prefix-cap40-screened.json` exits 0 (T1, T2 <= 12, T3 = 0.0 over the common top 8, T4); record `aboveCutoffSymDiff` (1 is the pre-existing screened-vs-loop difference, C28; 0 or 1 pass; more fails).
3. `python scripts/check_desktop_tab.py --compare <out>\c-cap40-desktop.json <out>\c-cap40-wasm.json --cross-transport` exits 0.
4. `grep -c "Bulk Sim" <out>\server-c.log.err` = 0.
Write the outcome table under "Measured, post-fix" in `predictions.md`. Acceptance: every line passes; any failure is the "fix is wrong" result — stop and report which line. Depends on C25, C28, C30.

**C4 — Desktop gate rewrite.** Edit `<core>\scripts\check_desktop_tab.py`: (b) asserts `runner == "WasmSimRunner"` (S1 now means "the tab chose the loop runner on the desktop transport"); (c) asserts `requests.bulkSimAsync == 0` and `requests.raidSimAsync >= 1` (S2 inverted: the desktop binary must send no bulk request); remove the (h) twin run and the `--force-fallback` N2 negative and their docstring lines (`:29-31`, `:203-204`, `:469`, `:514-541`), keeping `--compare` intact (Step C3 uses it); update the module docstring's S1/S2 text. Update `<stage>\desktop-gate.md` and `docs/agents/upstream-catch-up.md:233-234` to describe the new (b)/(c) and the removed (h). Then `fnm exec --using=22 -- pnpm.cmd desktop-gate:check --candidates 40` must exit 0 (its own build, server, (a)-(g)). Acceptance: exit 0; `grep -c "force-fallback" <core>/scripts/check_desktop_tab.py` = 0; `grep -c '"--compare"' <core>/scripts/check_desktop_tab.py` >= 1. Depends on C31.

**C5 — Records (before the fork commit).** (1) `docs/fork-upstream-touchpoints.md`: no new row (no Go, proto or engine file changed); add one line under the tab's existing entry if the file has one, else nothing. (2) Write `<out>\upstream-report-draft.md` with Q4 Draft 1 and the Track C note, header "Owner's call — not filed". (3) Ticket 403: add a "Fix, <date>" section: Track C chosen, mechanism, measured numbers from `predictions.md`, and what precision changed (C25/C32); `Status: open` until merged. (4) Tickets 397, 400, 401: append a one-paragraph note that the desktop screening path is no longer taken by the tab and that each ticket's remaining scope is either moot or re-scoped — do not close them; say which. (5) File **one** ticket under `.scratch/carry-forward/issues/` (next number from `NEXT`, currently **406**; known-traps § "Before filing a ticket"): "Bulk screening code is dead at runtime on both transports" — what it is, why it stays in the tree, and what re-enabling requires (the `high` stage delivers 16,599-19,686 iterations against 3,000 requested, C14, hypothesis; the measurement that settles it is the per-sim `Running N iterations` lines). Fold the adaptive-pass question into that ticket as one line rather than filing it separately — it only matters if bulk comes back.

**Tickets 404 and 405 are already filed** (2026-09-15, by the orchestrating session): 404 is the per-slot paired-replication gap the owner identified, 405 is the fork comment cleanup pass. Do **not** re-file them and do **not** start their work here. Reference them where relevant. Acceptance: `git -C <core> status --porcelain` lists exactly the files in the Paths manifest (Track C, core) plus `<out>\*`. Depends on C31.

**C6 — Fork commit (no push), lock, regen, core commit.** (a) `git -C <fork> add ui/core/components/individual_sim_ui/upgrades_tab.tsx ui/core/components/individual_sim_ui/upgrades/adapters/bulk_request_builder.ts`; commit with subject `Use the per-candidate loop on the desktop transport` and a body (written to a file, `-F`) stating the 17 s vs 257 s cap-40 measurement, byte-equal rows to the loop twin, and that the bulk RPC stays in the tree. Do not push. (b) Update `data/wowsims-fork.lock.json` `commit` to the new fork HEAD, `pushed` false, and append to `_comment` in the file's existing style. (c) `fnm exec --using=22 -- pnpm.cmd sim-implemented-effects:generate`; `git -C <core> diff --stat data/sim-implemented-effects.json` must show the `forkCommit` line only (if counts move, stop and report). (d) `fnm exec --using=22 -- pnpm.cmd verify` exits 0. (e) One core commit, subject `Route desktop upgrades runs through the loop`, after confirming `git -C <core> status --porcelain` holds only this plan's files. Acceptance: `git -C <fork> show --stat HEAD` lists exactly two files; `git -C <fork> status --porcelain` and `git -C <core> status --porcelain` empty; lock `commit` = `git -C <fork> rev-parse HEAD`. Depends on C17, C21.

### Track A — dropped

The `skip_finalist_stage` proto field and its eleven steps (A1-A11) are **not**
part of this plan. The owner chose Track C on 2026-09-15. The full Track A
specification, reviewed in round 1 and revised for the gate-B findings, is
preserved verbatim in `plan-round1.md` and in revision 1 of this file if it is
ever revived. Claims C16, C18, C23, C24 and C26 are kept in the register above
because they are the evidence for *why* A was dropped, not dead weight.

## Paths manifest

Shared, core (`C:\Users\dgree\Code\lulz\tbc-gear-prio`), created:
- `.scratch/stage-gate/bulk-finalist-cost/.gitignore`
- `.scratch/stage-gate/bulk-finalist-cost/predictions.md`
- `.scratch/stage-gate/bulk-finalist-cost/prefix-cap40-screened.json`
- `.scratch/stage-gate/bulk-finalist-cost/prefix-cap40-loop.json`
- `.scratch/stage-gate/bulk-finalist-cost/upstream-report-draft.md`
- `.scratch/stage-gate/bulk-finalist-cost/server-prefix.log.err` and other `*.log`, `*.log.err` (gitignored)
- `.scratch/carry-forward/issues/<next>-high-stage-adaptive-passes-inflate-desktop-screening.md`

Shared, core, modified:
- `data/wowsims-fork.lock.json`
- `data/sim-implemented-effects.json` (`forkCommit` only)
- `.scratch/carry-forward/issues/403-bulk-screen-finalist-stage-burns-73pct-on-discarded-work.md`

Track C, fork (`<core>\vendor\tbc-new-fork`), modified:
- `ui/core/components/individual_sim_ui/upgrades_tab.tsx`
- `ui/core/components/individual_sim_ui/upgrades/adapters/bulk_request_builder.ts` (doc comment only)

Track C, core, modified: `scripts/check_desktop_tab.py`; `.scratch/stage-gate/desktop-transport-gate/desktop-gate.md`; `docs/agents/upstream-catch-up.md`; `.scratch/carry-forward/issues/397-desktop-bulk-screen-not-a-speed-win.md`, `400-*.md`, `401-*.md` (notes only); `docs/fork-upstream-touchpoints.md` (only if it already has a tab entry). Created: `.scratch/stage-gate/bulk-finalist-cost/c-cap40-desktop.json`, `c-cap40-wasm.json`; `.scratch/carry-forward/issues/<next>-bulk-screening-code-dead-at-runtime.md`.

Track A: dropped — no paths.

Regenerated and gitignored by the Track C build: `dist/`, `wowsimtbc.exe`.

**Already filed by the orchestrator, not by the executor:** `.scratch/carry-forward/issues/404-paired-replication-is-global-top-8-not-per-slot.md`, `.scratch/carry-forward/issues/405-fork-comments-argue-superseded-positions-at-length.md`, and the `NEXT` bump to 406.

Track A, core, modified: `docs/fork-upstream-touchpoints.md`. Created: `.scratch/stage-gate/bulk-finalist-cost/fixed-cap40-screened.json`, `fixed-cap40-loop.json`, `fixed-cap40-wasm.json`.

No fan-out: the fork has one shared working tree and a serial queue; every step runs in this one executor.

## Verify recipe

From `C:\Users\dgree\Code\lulz\tbc-gear-prio`, Node 22 via `fnm exec --using=22 -- pnpm.cmd`:

1. `fnm exec --using=22 -- pnpm.cmd verify` — exit 0.
2. `python -c "import json;l=json.load(open('data/wowsims-fork.lock.json'));print(l['commit'])"` equals `git -C vendor/tbc-new-fork rev-parse HEAD`; `git -C vendor/tbc-new-fork status --porcelain` and `git status --porcelain` both empty.
3. `python scripts/check_desktop_tab.py --compare .scratch/stage-gate/bulk-finalist-cost/prefix-cap40-screened.json .scratch/stage-gate/bulk-finalist-cost/prefix-cap40-loop.json` — exit 0 (the baseline pair is sound).
4. Track C: `python -c "import json;d='.scratch/stage-gate/bulk-finalist-cost/';a=json.load(open(d+'c-cap40-desktop.json'));b=json.load(open(d+'prefix-cap40-loop.json'));print(a['rows']==b['rows'],a['requests']['bulkSimAsync'],a['runner'],a['elapsedS'])"` — `True 0 WasmSimRunner <n>`; `grep -c "Bulk Sim" .scratch/stage-gate/bulk-finalist-cost/server-c.log.err` — 0 (log is gitignored; present only on the executing machine); `fnm exec --using=22 -- pnpm.cmd desktop-gate:check --candidates 40` — exit 0; `git -C vendor/tbc-new-fork diff --stat upstream/master -- sim/ proto/` — one file (`sim/hunter/item_sets.go`), unchanged from before.
5. Track A is dropped — no Track A verification applies. The Go tree must be **untouched**: `git -C vendor/tbc-new-fork diff --stat upstream/master -- sim/ proto/` — exactly one file (`sim/hunter/item_sets.go`, the pre-existing divergence), same as before this plan.
6. `.scratch/stage-gate/bulk-finalist-cost/predictions.md` has "Measured, pre-fix" and "Measured, post-fix" tables, and the post-fix `elapsedS` is reported beside the pre-fix value.
7. The `simRunner` comment shrank: `git -C vendor/tbc-new-fork diff -- ui/core/components/individual_sim_ui/upgrades_tab.tsx` shows net-negative comment lines (C1 is a deletion, not a rewrite).

## Out of scope

- Making 25-way finalist separation converge, loosening the 95% test, or changing `BulkSimFinalistMaxExtraIterationMultiplier` (constraint 3).
- A finalist count field or top-2 refinement (Q2; needs the refined finalists merged back into the full list, `stage.go:291`).
- The `high` stage's adaptive iteration inflation (C14) — ticketed, not fixed, on both tracks.
- Deleting the bulk screening code under Track C — ticketed; the runtime path is removed, the code stays.
- Under Track C, the precision difference between 3,000-iteration loop values and bulk screening values on rows 9..N (C32) — accepted as the web tab's own behaviour, recorded in ticket 403.
- Re-running the 3,419 s full pool (constraint 5). The bound in C25 is measured at cap 40; the full-pool rows 9..33 are the same row class and chunk size, so the bound transfers by argument, not by measurement.
- Fixing upstream's `Target error: 0.00%` line or adding a finalist-stage test beyond A3 — upstream draft only.
- Filing anything upstream; pushing the fork; merging to `dev`; `pnpm merge-to-dev`.
- `upgrades/tools/bulk-spike.mts:123` — measures the RPC as upstream ships it; unchanged.
- The CRLF `fork-universes` blocker (ticket 283) and the remaining scope of tickets 397, 400, 401 beyond the notes in C5.
