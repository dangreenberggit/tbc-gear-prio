# Plan — batch-sim-followups Track B (measurement: tickets 345, 346, 348) — v3

`$F` = `C:\Users\dgree\Code\lulz\tbc-gear-prio\vendor\tbc-new-fork`. `$S` = `C:\Users\dgree\Code\lulz\tbc-gear-prio\.scratch\stage-gate\batch-sim-followups`. `$I` = `C:\Users\dgree\Code\lulz\tbc-gear-prio\.scratch\carry-forward\issues`. `$U` = `$F/ui/core/components/individual_sim_ui/upgrades`.

(v1 and v2 superseded; see plan-b-review.md rounds 1–2 and the Revision notes at the end.)

## Goal

One measurement campaign, pre-registered before any sim runs, produces committed evidence dumps and a scorer under `$S/evidence/` that answer three tickets from the same arms: 345 (does bulk-vs-loop top-N overlap hold on a ranked set of at least 20 genuine upgrades, judged against a loop-vs-loop seed control), 346 (is the WASM bulk tournament faster, slower, or a wash than the per-candidate loop when both run the same iteration count — sim counts, total iterations, baseline-probe counts and first-row latency quoted, and what the one available same-route repeat does and does not say about variance), and 348 (does the ~1.6% multiplicative slope reproduce at matched iterations, or is it an accuracy-mismatch artifact). Each ticket ends closed with its measured answer written in, or re-scoped to a precise follow-up with numbers. The WASM bulk default (`makeSimRunner(bulk = false)`) is NOT changed; if the numbers make a flip arguable, the plan surfaces an owner decision that states total cost and first-row latency separately. No measurement hook ships: the tab dispatch is a temporary uncommitted edit removed before the final commit and ledgered; the reusable harness module lives under `$U/tools/` like `bulk-spike.mts`.

## Approach

**Matching method M2: pin every arm to `input.iterations = 8000`, and verify after the run that every bulk chunk achieved exactly 8,000.** The bulk High stage runs `max(highStageIterations, targetIterations)` (`stage.ts:92-93`) plus an adaptive top-up bounded by `maxAdaptiveIterations` (`stage.ts:146-160`, up to 4x the floor) when observed error misses the 0.05% target — a request sets a floor, never a cap (C1). The target is `ceil((stdev · m(n) / (avg · 0.0005))²)`, `m(n) = sqrt(max(1, log10(max(n, 10))))` (C2). **8,000 clears the target only because chunks are capped at 25 candidates, and the margin on WASM is thin**: at the WASM feral-p2 coefficient of variation cv = 0.0356 (baseline stdev 75.91 / dps 2131.71 in the prior dump, C3) the n = 25 target is 7,092, leaving 908 iterations of headroom; the critical cv at which the n = 25 target reaches 8,000 is 0.0378, a 6.2% margin (C4). On Go the cv was 0.0339 and targets were lower. So the floor is expected to hold but is not guaranteed — a run whose baseline stdev is 6% higher than last time overshoots. The dependency is guarded twice: the dump asserts every chunk has n ≤ 25 and one stage, and the scorer refuses to emit a 346 verdict unless every chunk's achieved `stageIterations` equals 8,000 (C5).

Fallback M1, pre-registered: if any chunk achieved > 8,000, arms B and C are re-run at the maximum achieved count `I_max`, but only if 25-candidate chunks stay single-stage at `I_max`. The no-cull bound (`shouldUseLegacyBulkSim`, `estimate.ts:5-32`) is 29 at 8,000, 28 at 12,000, 27 at 16,000 (C6); M1 is capped at `I_max ≤ 16,000`; above that the plan stops and re-scopes 346. Track A lands first with `assertSingleStageChunk` and `MAX_CANDIDATES_PER_BULK_REQUEST` still 25 (C7); Step 0 reads the landed guard, and the HTTP arms at 8,000 with full 25-chunks are the runtime check.

Alternatives rejected: *M1 first* — achieved counts vary per chunk with n, so there is no single number to match; fallback only. *Equal achieved error* — not one knob (per-candidate stdev); iterations is the shared work unit; achieved per-row `se` is reported alongside. Side benefit of M2: `rank.ts` computes `se` from the nominal count (C8); on the prior bulk arm the reported se was 1.19x the true se, so (d)'s bands were loose on one route; with achieved == nominal they mean the same thing on both.

**Ranked-set depth for 345: the PRIMARY route is a page configuration with ≥ 20 genuine upgrades, found by bounded HTTP pilots.** A cutoff relabels rows; it cannot create upgrades — the prior N = 220 feral-p2 dump has only 16 rows with `deltaDps > 0` (C9), so no cutoff on that configuration reaches 20. Step 3 therefore runs cheap HTTP arm-B pilots, at most 3, changing the character's gear/phase in this order: (i) the spec's weakest preset gear at the current max phase; (ii) that gear with max phase raised one step; (iii) a different spec whose universe has more upgrades available (the executor picks it from the phase-gear pools, `poolFor` in `$U/data/data.ts`, choosing the spec with the most unworn pool items above the preset's gear at the chosen phase). The first configuration with ≥ 20 rows `deltaDps > 0` on arm B is frozen; the cutoff at which (c) is evaluated is the engine's own cutoff for that spec. If N (candidate count) changes the budget, Step 3's precedence rule applies.

**Pre-registered fallback, stated now:** if none of the three pilots reaches 20 positive-delta rows, the best pilot is frozen anyway, (c) is declared inexpressible for this engine cutoff, and 345 is judged on (c') alone plus the control — the campaign-cutoff machinery below is then the instrument. The campaign cutoff is otherwise only the tie-robustness instrument for (c').

**Campaign cutoff and (c') mechanics.** Ranked-vs-below is `meetsCutoff(deltaDps, deltaPct, cutoff)` — an OR of an absolute arm and a percentage arm (C10) — on a per-spec constant not settable from `RankInput`, so the engine is not edited; the scorer re-derives ranked sets from the dumped `deltaDps`, `deltaPct` and the frozen engine cutoff. When a *campaign* cutoff is used (fallback only), it is a single absolute arm; the scorer discloses that this collapses the engine's OR and also evaluates the pct arm from the dumped `deltaPct` so the reader sees which rows the pct arm would have admitted (C10). (c') margin test: `|deltaDps − cutoffAbs| ≥ 2·se`.

**Transports: WASM (4180) is the primary campaign; HTTP (vite 5173 + Go 3333) runs the identical arms first, cheaply** (~35x cheaper per chunk, C11): it de-risks the harness, supplies the pilots, and shows whether the 348 slope is a TS-tournament property or a bulk-screening property.

**Arms (same three per transport):**

| arm | runner | seeds | iterations | answers |
| --- | --- | --- | --- | --- |
| A bulk | WASM: harness bulk runner (re-implements `BulkWasmSimRunner.runBulkScreen`, C12); HTTP: `new BulkHttpSimRunner(c)` wrapped | `[11,22,33,44,55]` | 8,000 | 345, 346, 348 |
| B loop | `makeSimRunner(false)` wrapped | `[11,22,33,44,55]` | 8,000 | 345, 346, 348 |
| C control | same as B | `[777,22,33,44,55]` | 8,000 | 345 jitter null, 348 slope null, loop-phase repeat |

Held constant: frozen page configuration (spec, preset gear, max phase, all tab fields), candidate set (`candidateCap` unset unless the precedence rule sets it, then identical on every arm), engine cutoff, iterations 8,000, WASM pool size 4, the same idle machine, a fresh `MemoryStore` per arm (C13), one page session per arm, back to back. Intended differences only: A vs B = route; C vs B = first seed.

**Harness shape.** `$U/tools/equiv-campaign.mts` exports `runCampaignArm(...)`: fresh `MemoryStore`; counting decorator at the `SimRunner` seam (every `run` call: `iterationsDone`, elapsed, phase tag; WASM bulk: re-implemented `runBulkScreen` body keeping each chunk's raw `stageMetrics` and baseline-probe progress events; HTTP bulk: wrapper reading `iterationsDone` off the seam result); calls `rankUpgrades` as `run()` does; records first-row time; dumps to `window.__bulkEquiv` and a `BULK_EQUIV_RUN` console line; judges nothing. Its correctness is Step 2's differential check, run at ≥ 26 candidates so the tournament (not the legacy path taken below `BULK_SIM_MIN_COMBINATIONS = 20`, C14) and the multi-chunk baseline carry (`baseline ??=` across chunks) are both exercised. A temporary dispatch block in `upgrades_tab.tsx`'s `run()` gated on `?bulkEquiv=<A|B|C>` is the only tab edit; the prior hook has no residue (C15).

**Rejected alternative: the Go harness `harness340.exe`** — cannot reach the WASM tournament or `rankUpgrades`' cutoff/replication path (C16).

**Sequencing (orchestrator).** Track A executes first; Track B starts at Step 0 on a clean fork tree at Track A's landed SHA; Track B's temporary edit to `upgrades_tab.tsx` must never coexist with an uncommitted Track A edit to that file (C7).

## Claims register

| ID | Claim | Load-bearing | Verified by |
| --- | --- | --- | --- |
| C1 | High-stage iterations = `max(highStageIterations, target)`; adaptive top-up up to `maxAdaptiveIterations` (4x floor) when observed error > 0.05% | yes | `sed -n 85,95p $F/ui/core/wasm/bulk_sim/stage.ts; sed -n 140,162p $F/ui/core/wasm/bulk_sim/stage.ts` |
| C2 | target = `ceil((stdev·m(n)/(avg·targetErrorPct/100))²)`, `m(n)=sqrt(max(1,log10(max(n,10))))` | yes | `sed -n 1,40p $F/ui/core/wasm/bulk_sim/statistics.ts`; `grep -n BULK_SIM_COMBINATION_LOG_MIN $F/ui/core/wasm/bulk_sim/constants.ts` |
| C3 | WASM feral-p2 cv = 0.0356 (prior dump baseline stdev/dps); Go cv ≈ 0.0339 reproduces the five Go chunk targets | yes | `node -e "const d=require('$S/../batch-sim-web-local/equiv-dump.json');console.log(d.loop.baseline.stdev/d.loop.baseline.dps)"` → 0.0356; `node -e "const cv=0.0339;for(const n of [21,25,26,30,32])console.log(n,Math.ceil((cv*Math.sqrt(Math.max(1,Math.log10(n)))/0.0005)**2))"` vs `equiv-dump-local.json` `chunkArms[].stageIterations` |
| C4 | At cv 0.0356 the n=25 target is 7,092 (headroom 908); the critical cv for 8,000 at n=25 is 0.0378 (6.2% margin) | yes | `node -e "const m=Math.sqrt(Math.log10(25));console.log(Math.ceil((0.0356*m/0.0005)**2), 0.0005*Math.sqrt(8000)/m, 0.0005*Math.sqrt(8000)/m/0.0356-1)"` |
| C5 | Every chunk has n ≤ 25 (`MAX_CANDIDATES_PER_BULK_REQUEST`); the scorer gates 346 on achieved == 8,000 | yes | `grep -n 'MAX_CANDIDATES_PER_BULK_REQUEST = 25' $U/engine/bulk/partition.ts`; runtime dump `cost.chunks[]` |
| C6 | Single-chunk no-cull bound: 29 at 8,000, 28 at 12,000, 27 at 16,000 | yes | reviewer-derived; Step 0 re-runs `shouldUseLegacyBulkSim(BulkSimRequest.create({highStageIterations:I}), n)` through the `$U/tools/register.mjs` loader for I∈{8000,12000,16000}, n∈{25..30} |
| C7 | Track A lands first: `assertSingleStageChunk` present at Track B's base; constant still 25; 347 edits `upgrades_tab.tsx`/`bulk_http_sim_runner.ts`; 349 edits `partition.ts` | yes | Step 0: `grep -rn assertSingleStageChunk $U/` ≥ 1; `grep -n 'upgrades_tab\|partition.ts\|bulk_http' $I/347-*.md $I/349-*.md` |
| C8 | `rank.ts` derives `se` from nominal `iterations`; at 5,000/7,091 reported se = 1.19x true | no | `grep -n 'stdev / Math.sqrt(iterations)' $U/engine/rank.ts`; `node -e "console.log(Math.sqrt(7091/5000))"` |
| C9 | The prior N=220 feral-p2 configuration has only 16 rows with `deltaDps > 0` (13 above 2.10 DPS), so it cannot yield 20 ranked upgrades at any cutoff | yes | `node -e "const d=require('$S/../batch-sim-web-local/equiv-dump.json');console.log(d.loop.items.filter(i=>i.deltaDps>0).length, d.loop.items.filter(i=>i.deltaDps>2.1).length)"` |
| C10 | Cutoff is `cutoffForSpec(input.spec)`, not a `RankInput` field; `meetsCutoff` is an OR of `absDps` and `pct` arms; rows carry `deltaPct`, and the dump records it | yes | `sed -n 128,145p $U/engine/rank.ts; sed -n 415p $U/engine/rank.ts; sed -n 122,150p $U/engine/cutoff.ts` |
| C11 | 25-candidate chunk: 9.35 s Go vs 332 s WASM | yes | `equiv-dump-local.json` `chunkArms[1].secs`; `grep -n '332 s' $U/adapters/bulk_wasm_sim_runner.ts` |
| C12 | `BulkWasmSimRunner.runBulkScreen` is ~30 lines of exported calls with a progress callback; the baseline carry is `baseline ??= mapped.baseline` across chunks | yes | `sed -n 113,145p $U/adapters/bulk_wasm_sim_runner.ts` |
| C13 | `MemoryStore` dedupes identical requests | yes | `grep -n 'fresh .MemoryStore. per run' $S/../batch-sim-web-local/execution-ledger-web.md` |
| C14 | `shouldUseLegacyBulkSim` returns true (legacy path, no tournament) below `BULK_SIM_MIN_COMBINATIONS = 20` | yes | `sed -n 5,13p $F/ui/core/wasm/bulk_sim/estimate.ts`; `grep -n BULK_SIM_MIN_COMBINATIONS $F/ui/core/wasm/bulk_sim/constants.ts` |
| C15 | No harness residue in `upgrades_tab.tsx` | no | `grep -c 'bulkEquiv\|bulkArm\|__bulkEquiv\|bulkSpike' $F/ui/core/components/individual_sim_ui/upgrades_tab.tsx` → 0 |
| C16 | `runConcurrentBulkSim` runs only in a browser; WASM only from built `dist/` on 4180; vite 5173 serves the HTTP worker | yes | `sed -n 10,27p $U/tools/bulk-spike.mts`; `sed -n 20,25p $F/vite.config.mts`; runtime `isWasm()` per port |
| C17 | Prior WASM pool-4 costs: loop 5,000 = 2,699.5 s; bulk 7,091 = 4,333.1 s; N=220 | yes | `node -e "const d=require('$S/../batch-sim-web-local/equiv-dump.json');console.log(d.loop.elapsedSeconds,d.bulk.elapsedSeconds,d.loop.items.length)"` |
| C18 | Per-candidate WASM cost at 8,000 ≈ 19.6 s (loop) and 22.2 s (bulk), end to end, pool 4 | no | hypothesis, untested (arithmetic on C17); superseded by Step 3's budget from the frozen N |
| C19 | HTTP arm ≤ 10 min at N≈220 | no | hypothesis, untested (arithmetic on C11); measured in Step 3 |
| C20 | Overlap granularity 1/k; at k ≥ 20 one flip = 5 points | yes | `18/20 = 0.90` |
| C21 | Bulk picks its own seeds; loop-vs-loop at different first seeds is the correct null | yes | `sed -n 790,806p $U/engine/rank.ts`; `equiv-dump-local.json` `baselines` |
| C22 | Prior scorer formulas reused; the prior dump lacks `deltaPct`, so the regression fixture uses stored `rank`/`belowCutoff` | no | `sed -n 40,95p $S/../batch-sim-web-local/equiv-scorer.mjs`; `node -e "const d=require('$S/../batch-sim-web-local/equiv-dump.json');console.log('deltaPct' in d.loop.items[0])"` → false |
| C23 | 348 prior slope 1.016 ± 0.0022 (t 7.4) | yes | `sed -n 12,20p $I/348-*.md` |
| C24 | The WASM default was flipped for first-row latency vs the 120 s layout gate, not total cost | yes | `sed -n 150,186p $U/adapters/bulk_wasm_sim_runner.ts`; `grep -n layout-gate:check package.json` |
| C25 | Paired replication = 36 sims per arm at five seeds, both routes, independent of ranked-set size | yes | `sed -n 1123,1128p $U/engine/rank.ts` |
| C26 | Fork build script `make host`; prior ledger used `vite build`; `dist/` gitignored | no | `grep -n '"build"' $F/package.json`; `git -C $F check-ignore dist` |
| C27 | Outer pin file `data/wowsims-fork.lock.json`; `ecaa3f3` is the re-pin precedent | yes | `git show --stat ecaa3f3`; `grep -c 20dbb6f5d data/wowsims-fork.lock.json` |
| C28 | Navigating away kills workers; Stop may or may not reach bulk signals depending on 347's landed fix | no | Step 0 reads 347's resolution |
| C29 | Worker console lines give an independent per-arm sim count | no | hypothesis, untested; re-observed in Step 2 |
| C30 | Next free ticket number is 350 | no | `cat $I/NEXT` |
| C31 | B vs C is a repeat of the per-candidate loop only; no same-route repeat of the tournament exists in this arm set, so V bounds loop variance, not `R_wall_s` | yes | by construction of the arm set |
| C32 | Phase-gear pools per spec are enumerable from `$U/data/data.ts` (`poolFor`), so pilot (iii)'s spec choice is derivable offline | no | `grep -n 'export function poolFor' $U/data/data.ts` |

## Pre-registered win conditions (copied verbatim into the ledger in Step 1, before any run)

**Common preconditions (346 verdict gated on all):** every chunk n ≤ 25, `stages == 1`, achieved iterations == 8,000; every loop `iterationsDone` == 8,000. Else M1 at `I_max ≤ 16,000` (re-run B and C, files `-m1`); if `I_max > 16,000`, stop and re-scope 346 "not measurable at chunk bound 25", numbers quoted.

**Ticket 345** (A vs B, judged against C vs B, WASM primary, HTTP alongside):
- `k_min = 20` positive-delta rows on arm B of the frozen configuration (C20). Primary route: Step 3 pilots. Fallback (declared now): if no pilot reaches 20, (c) is inexpressible and 345 is judged on (c') + control alone.
- (c): overlap over first `k = min(kA, kB)` rows ranked by the engine cutoff ≥ 90%.
- Control: same metric and boundary-flip count on C vs B.
- (c'): every item confidently on one side of the cutoff's absolute arm on one route (`|deltaDps − absDps| ≥ 2·se`) is on the same side on the other route: 100%. The pct arm's admissions are listed from `deltaPct` and disclosed (C10).
- Decision: (c) ≥ 90% and (c') = 100% → close 345, confirmed. (c) < 90% but flips(A,B) ≤ flips(C,B) and (c') = 100% → close 345 with (c) replaced by (c'), reasoning written in. Fallback route: (c') = 100% and flips(A,B) ≤ flips(C,B) → close on (c'); otherwise re-scope. (c') < 100% on any route → re-scope to a defect ticket naming items, gaps, bands.

**Ticket 346** (A vs B, WASM; HTTP for context):
- Quoted per arm: wall clock end to end and screening-only; `run` sim count by phase (baseline, screening, replication, set-bonus); chunk count; per-chunk baseline probes (measured); total iterations = Σ `run` `iterationsDone` + Σ chunks `(rows + probes) × achieved`; screening-only iterations; first-row latency; max/mean per-row `se`.
- "Screening-only" means: for A, the `runBulkScreen` span (tournament, all chunks); for B and C, the per-candidate sim phase of the loop. The verdict is taken on screening-only ratios `R_wall_s`, `R_iter_s` because the replication (36 sims, C25), baseline and set-bonus tail is identical work on both routes and dilutes end-to-end ratios toward 1.0; end-to-end `R_wall`, `R_iter` are quoted beside them.
- Variance: `V = |screening_B − screening_C| / screening_B` is quoted as the loop phase's one measured same-route repeat. **V does not bound `R_wall_s`** — there is no tournament repeat in this arm set (C31), so any verdict carries the caveat "one tournament run; tournament run-to-run variance unmeasured". Verdict thresholds: faster if `R_wall_s < min(0.9, 1 − V)`; slower if `R_wall_s > max(1.1, 1 + V)`; otherwise "wash within the measured loop variance, tournament variance unmeasured". If V > 0.1, the verdict is "indistinguishable at one run per arm (V = …)". The standing wash finding holds if `R_iter_s` is within 0.9–1.1.
- Decision: close 346 with verdict and all numbers. Owner surfacing, mandatory wording: if `R_wall_s < 1` and `firstRowSeconds_A > 120`: "Bulk is cheaper in total on WASM (R = …) and still fails the 120 s first-row gate (first row at … s)"; if `R_wall_s < 1` and first row ≤ 120 s: ask whether to flip the default; if slower: no owner question. The plan never flips the default (C24).

**Ticket 348** (OLS of A on B over shared items; null OLS of C on B):
- Reproduces if `|slope_AB − 1| > 3·SE_AB` and `|slope_AB − 1| > |slope_CB − 1| + 3·SE_CB` (C21).
- Not reproduced → close into 346 as an accuracy-mismatch artifact. Reproduced (state which transports) → close with the bound "immaterial near the cutoff, up to N% at deep downgrades" and the cross-route consumer list; the `partition.ts` doc-comment edit is a one-line follow-up ticket (C30).

**Precedence rule (budget vs depth):** `k_min` beats the 6 h WASM budget. If the frozen configuration's three WASM arms budget over 6 h, first drop WASM arm C (the 345 null and the 348 null slope then come from HTTP C; V comes from HTTP B vs C and is labelled "HTTP loop variance"), and only if A + B alone still exceed 6 h set `candidateCap` (identical on every arm, HTTP arms re-run at the cap) — never below the count that keeps ≥ 20 positive-delta rows on B.

## Steps

Ledger: `$S/execution-ledger-b.md`, timestamps on every arm start/finish.

**Step 0 — Preconditions.** Depends on C6, C7, C15, C27, C28.
`git -C $F status --porcelain` empty; `git -C $F rev-parse HEAD` equals the pin; `grep -rn assertSingleStageChunk $U/` finds Track A's guard (record file:line, what it throws); constant is 25; read 347's resolution; re-run the C6 bound check for 8k/12k/16k. Record base SHAs.
Acceptance: ledger "Step 0" lists SHAs, guard location, bound table, Stop behaviour; `porcelain | wc -l` → 0, else stop and report.

**Step 1 — Pre-register and build the scorer.** Depends on C10, C20, C22, C23.
Files: `$S/execution-ledger-b.md` (win conditions, fallback, precedence rule verbatim; pin 8,000; M1 cap); `$S/evidence/campaign-scorer.mjs` (prior scorer plus: ranked-set derivation from `deltaDps`/`deltaPct` and the dumped engine cutoff, `--cutoff <dps>` campaign override that prints a disclosure line and the pct-arm admissions, (c') with margin, flip counts, OLS slope ± SE and t, cost table with screening-only and end-to-end ratios and V with the C31 caveat printed, precondition gate printing `346: NO VERDICT` on any chunk ≠ 8,000 / n > 25 / stages ≠ 1, `--null C.json`; when a dump row lacks `deltaPct` it falls back to stored `rank`/`belowCutoff`); fixtures `clean.json`, `inverted.json`, `slope102.json`, `overshoot.json`.
Acceptance: clean → all PASS, slope 1.000; inverted → (a)(b)(d) FAIL, rho −1; slope102 → 1.020; overshoot → `NO VERDICT`; prior `equiv-dump.json` (no `deltaPct`) → rho 0.999229, overlap 88.89%, slope 1.016 via the fallback. Ledger pre-registration committed before Step 3's first pilot.

**Step 2 — Harness, temporary dispatch, smoke, differential at ≥ 26 candidates.** Depends on C8, C12, C13, C14, C15, C29.
Files: new `$U/tools/equiv-campaign.mts`; temporary block in `upgrades_tab.tsx` `run()` after `const sim = await this.simRunner();`, gated on `?bulkEquiv=`, marked `// TEMPORARY — Track B harness, removed in Step 8`. Params: `bulkEquiv=A|B|C`, `iters`, `cap`, `mode=real|harness` (A only). Dump shape as v2 plus `deltaPct` per item and `engineCutoff:{absDps, pct}`.
Smoke on 5173+3333: `A&cap=5&iters=200`, `B&cap=5&iters=200` (harness plumbing only). Differential on 5173+3333: `A&cap=30&iters=500&mode=real` vs `mode=harness` — 30 candidates > 20 so the tournament path runs (C14), and 30 > 25 so two chunks exercise the baseline carry (C12). Repeat the differential once on 4180 at the same params after the `dist` build (Step 5's first bullet pulled forward) so the WASM re-implementation is checked on the transport it will measure.
Acceptance: fork type-check exit 0; smoke dumps carry `isWasm false`, A `hasBulkCapability true`, B false; A's sim total reconciles with the Go log (C29); both differentials: `cost.bulkChunks == 2`, per-item `deltaDps` bit-identical between `real` and `harness`, else stop and fix before any 8,000 run; `MemoryStore` constructed inside `runCampaignArm` (grep).

**Step 3 — HTTP pilots for depth (≤ 3), freeze, budget.** Depends on C9, C18, C19, C20, C32.
Pilot 0 = the page's current feral-p2 setup, arm B at 8,000, HTTP; count `deltaDps > 0`. If < 20, pilots (i), (ii), (iii) in the Approach order, each arm B at 8,000 on HTTP, stopping at the first with ≥ 20. Freeze that configuration as exact page settings (spec, preset, phase, every tab field, concurrency setting) and its N; that pilot's dump becomes `http-B.json`. If none reaches 20, freeze the best and record the fallback declaration. Budget WASM arms from N (`bulk ≈ 22.2·N s`, `loop ≈ 19.6·N s`, C18), apply the precedence rule, record per-arm budgets, the 6 h total, per-arm abort at 2× budget or 20 min without a console sim line (kill by navigating away, re-run once, then report lost).
Acceptance: ledger names every pilot's configuration and positive-delta count, the frozen configuration, N, `k_B`, the budgets and which precedence branch (none / drop WASM C / cap) applies; pilot dumps under `$S/evidence/pilot-*.json`; `http-B.json` committed.

**Step 4 — HTTP arms A and C.** Depends on C11, C19, C21.
Frozen configuration; one page load per arm; dumps → `http-A.json`, `http-C.json`, each committed before the next. Score with `--null http-C.json`.
Acceptance: dumps committed; scorer output in the ledger; every chunk `[8000]`, `n ≤ 25`, `stages 1` (else M1 recorded and applied on HTTP too).

**Step 5 — WASM arms A, B (, C).** Depends on C1, C3, C4, C5, C13, C16, C26, C28.
`dist` rebuilt with `make host` from `$F` (`npx vite build` as ledgered fallback); `wowsims-fork-prod` on 4180; assert `isWasm() === true`. Machine idle; browser owned solely by the executor. `?bulkEquiv=A&iters=8000&mode=harness` (+cap if set) at the frozen configuration; poll no more than every 15 min via a `Monitor` until-loop on `window.__bulkEquiv`; dump → `wasm-A.json`, commit; then B; then C unless the precedence rule dropped it. Record the baseline cv from each dump next to the 0.0378 critical value.
Acceptance: dumps committed; `isWasm true`; A `hasBulkCapability true`, B/C false; C `seeds[0] === 777`; `cost.chunks[]` all `n ≤ 25`, `stages 1`, `[8000]` — else M1 per the common precondition; each arm within 2× budget or explained.

**Step 6 — Score and apply the rules mechanically.** Depends on C20, C21, C22, C24, C31.
Scorer on WASM A/B (`--null wasm-C.json` or `--null http-C.json` if WASM C was dropped, labelled) and on HTTP; outputs into the ledger; one disposition row per ticket quoting values, the clause that fired, the outcome.
Acceptance: "Dispositions" section complete; V quoted with the C31 caveat; 346 row states screening-only and end-to-end ratios separately and names which null was used.

**Step 7 — Write the answers into the tickets.** Depends on C7, C30.
Files: `$I/345-*.md`, `$I/346-*.md`, `$I/348-*.md`; new `$I/350-*.md` + `NEXT` only if filed. 348 item 3: `grep -rn 'individualDeltasByItemId\|addedPieceDeltas' $U/engine/`, list consumers. 346: "Owner decision requested" paragraph in the mandatory wording, copied into `$S/decision-log.md` as an open item.
Acceptance: `pnpm issues:open` reflects the dispositions; every number traces to `$S/evidence/`.

**Step 8 — Remove the dispatch, commit the module, re-pin, verify.** Depends on C15, C26, C27.
Delete the temporary block; `git -C $F diff --numstat` lists only `upgrades/tools/equiv-campaign.mts` and `upgrades/tools/README.md`; `grep -c $'\r' …/upgrades_tab.tsx` → 0; fork type-check exit 0; commit in the fork; re-pin mirroring `git show --stat ecaa3f3` with the SHA read by `git -C $F rev-parse HEAD`; `pnpm verify`; `pnpm layout-gate:check`; commit evidence, ledger, tickets, decision-log.
Acceptance: `grep -c 'bulkEquiv\|TEMPORARY' …/upgrades_tab.tsx` → 0; `git -C $F status --porcelain` empty; both gates exit 0; outer `git status --porcelain` empty; ledger lists both commit SHAs.

## Paths manifest

Committed, fork (`$U/tools/`): `equiv-campaign.mts` (new), `README.md` (append).
Temporary, never committed: `$F/ui/core/components/individual_sim_ui/upgrades_tab.tsx` (dispatch block), `$F/dist/` (gitignored).
Committed, outer: `$S/execution-ledger-b.md`; `$S/decision-log.md` (append); `$S/evidence/campaign-scorer.mjs`; `$S/evidence/fixtures/{clean,inverted,slope102,overshoot}.json`; `$S/evidence/{pilot-*,smoke-*,diff-*,http-A,http-B,http-C,wasm-A,wasm-B,wasm-C}.json` (+ `-m1` variants; `wasm-C` absent if dropped); `$I/345-*.md`, `$I/346-*.md`, `$I/348-*.md`; `$I/NEXT` and `$I/350-*.md` only if filed; `data/wowsims-fork.lock.json` plus whatever `git show --stat ecaa3f3` names.
**Partition:** none — single executor, single browser owner; not fan-out-able.

## Verify recipe

```
node $S/evidence/campaign-scorer.mjs $S/evidence/wasm-A.json $S/evidence/wasm-B.json --null $S/evidence/wasm-C.json    # or --null http-C.json, labelled
node $S/evidence/campaign-scorer.mjs $S/evidence/http-A.json $S/evidence/http-B.json --null $S/evidence/http-C.json
node $S/evidence/campaign-scorer.mjs $S/evidence/fixtures/overshoot.json $S/evidence/fixtures/clean.json      # "346: NO VERDICT"
node $S/evidence/campaign-scorer.mjs $S/../batch-sim-web-local/equiv-dump.json                                 # 0.999229 / 88.89% / 1.016 via rank fallback
node -e "for (const a of ['wasm-A','wasm-B']) { const d=require('$S/evidence/'+a+'.json'); console.log(a, d.transport.isWasm, d.transport.hasBulkCapability, d.seeds[0], d.baseline.stdev/d.baseline.dps, d.cost.chunks.map(c=>[c.n,c.stages,c.stageIterations])) }"
node -e "const d=require('$S/evidence/http-B.json');console.log(d.items.filter(i=>i.deltaDps>0).length)"      # ≥ 20, or the fallback is declared in the ledger
grep -c 'bulkEquiv\|TEMPORARY' $F/ui/core/components/individual_sim_ui/upgrades_tab.tsx    # 0
grep -c $'\r' $F/ui/core/components/individual_sim_ui/upgrades_tab.tsx                     # 0
git -C $F status --porcelain                                                               # empty
node $F/node_modules/typescript/bin/tsc --noEmit -p $F                                    # exit 0
pnpm verify
pnpm layout-gate:check
pnpm issues:open
```

## Out of scope

- Changing `makeSimRunner`'s default, `MAX_CANDIDATES_PER_BULK_REQUEST`, `partition.ts`, `cutoff.ts`, `rank.ts`, `data.ts`, either runner, or any engine file. Pilots change page settings only; the campaign cutoff is scorer-side.
- Fixing the nominal-vs-achieved `se` derivation (C8); ticket it only if M1 fires.
- A tournament run-to-run repeat (a second WASM A) — not budgeted; the verdict carries the C31 caveat instead. If the owner wants the caveat removed, that is one more ~A-sized arm and a separate ask.
- The "smaller chunks on WASM" arm; a raised chunk bound; any measurement above `I_max = 16,000`.
- Go-harness runs; ticket 347/349 work; the merge ask.

## Revision notes (N1–N7, F1)

- **N1 (F6 regressed)** — Primary route to `k_min = 20` is now bounded HTTP arm-B pilots (≤ 3: weakest preset gear, higher max phase, different spec), freezing the first configuration with ≥ 20 positive-delta rows; the cutoff cannot create upgrades (C9). The campaign-cutoff/(c') machinery is retained only as the tie-robustness instrument and as the fallback declared up front in the win conditions. Precedence rule (N3) stated: `k_min` beats the 6 h budget — drop WASM C first (HTTP C becomes the null; V from HTTP, labelled), cap candidate depth last and never below 20 positive rows.
- **N2** — C3/C4 now carry the WASM cv 0.0356, the n = 25 target 7,092, the 908-iteration headroom and the critical cv 0.0378 (6.2% margin), with Go's 0.0339 kept as the Go figure; guards unchanged; Step 5 records each dump's cv beside the critical value.
- **N4** — "Screening-only" is defined per route (tournament span vs per-candidate sim phase); V is quoted as the loop phase's repeat only, the scorer prints the caveat, and the verdict carries "tournament run-to-run variance unmeasured" (C31); a tournament repeat is listed in Out of scope as a separate ask.
- **N5** — Differential moved to 30 candidates at 500 iterations (tournament path above `BULK_SIM_MIN_COMBINATIONS = 20`, two chunks exercising the baseline carry, C12/C14), run on HTTP and repeated on 4180; acceptance requires `bulkChunks == 2` and bit-identical deltas.
- **N6** — Scorer falls back to stored `rank`/`belowCutoff` when `deltaPct` is absent (C22); the prior-dump regression fixture relies on it.
- **N7** — The engine's OR cutoff is evaluated from dumped `deltaDps`/`deltaPct` (C10); any campaign cutoff prints a disclosure that it collapses the OR and lists the pct-arm admissions.
- **F1 (carried)** — Floor-not-cap, 25-chunk dependency and top-up stated; dump guard (n ≤ 25, stages 1) and scorer `NO VERDICT` gate retained; M1 capped at 16,000 by the bound table (C6).

---

## Round-3 conditions and the depth evidence (binding — routed by the orchestrator, 2026-09-02)

Round-3 review verdict was "escalate to owner" on N8 ("no committed evidence any config reaches 20 upgrades"). That premise was then REFUTED by a search of committed artifacts (`git ls-files` confirmed):

| artifact | spec / maxPhase | rows | deltaDps > 0 | clear cutoff |
| --- | --- | --- | --- | --- |
| `.scratch/set-bonus-value/ret-catchup/artifacts/shredzepelin-p3.json` | feral / 3 | 407 | 46 | 38 |
| `.scratch/rank-reports/stage2-close-slamaltman.json` | ret / 3 | 390 | 55 | 44 |
| `.scratch/set-bonus-value/ret-catchup/artifacts/slamaltman-p3.json` | ret / 3 | 393 | 54 | 44 |
| `.scratch/rank-reports/stage2-close-nexess.json` | feral / 2 | 228 | 23 | 12 |

So the owner fork dissolves: pilot (ii) — the current feral character with max phase raised to 3 — is a KNOWN-GOOD depth configuration (46 positives, 38 clearing the engine cutoff, ≥ 2·se comfortably). Binding amendments:

- **N8 → resolved by evidence.** Step 3 pilot order becomes: pilot 0 = feral, max phase 3 (the `shredzepelin-p3` configuration, or the page's current character at phase 3 if the preset differs — record which); expected ≥ 38 rows clearing the cutoff. Only if that pilot fails the N10 gate do pilots (i)/(iii) run. Budget note: N rises to ~400 candidates at phase 3 — re-budget per Step 3 (C18: bulk ≈ 22.2·N s ≈ 2.5 h, loop ≈ 19.6·N s ≈ 2.2 h per arm on WASM) and apply the precedence rule (drop WASM C first) to stay ≤ 6 h.
- **N9 (material, claims C6/C14 corrected):** "legacy" gates only the pre-High stages (`index.ts:116`); at n ≤ 25 the Medium stage never runs (`maxSurvivors = 25`), so EVERY 25-chunk is single-stage at every iteration count, and the adaptive top-up lives inside the High stage regardless (`stage.ts:349`). The matching method stands; C6's bound table does not bind at n = 25 and the M1 ≤ 16,000 cap is therefore not a real constraint — keep M1 (re-run B/C at I_max) without the cap. The Step 2 differential at 30 candidates (chunks 25 + 5) exercises exactly the campaign's own stage path plus the two-chunk baseline carry — the justification text is corrected, the parameters stand.
- **N10 (material):** the depth gate is `count(deltaDps ≥ 2·se) ≥ 20` measured on arm B — never bare `deltaDps > 0` (the bulk arm showed 14 extra rows at 0.059/0.148 DPS, a baseline-offset artifact against se ≈ 1.08). (c) is scored over `k = min(kA, kB)` at the engine cutoff as before.
- **N11 (minor):** pilots run at 1,000 iterations (depth depends on gear, not precision); only the frozen configuration is re-run at 8,000 to become `http-B.json`.

Sequencing unchanged: Track B starts only after Track A lands and the fork tree is clean at A's SHA.
