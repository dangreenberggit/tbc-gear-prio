# Plan-b review — round 1 (2026-09-02)

VERDICT: revise

## Findings

| ID | Severity | Where | What breaks | Evidence |
| --- | --- | --- | --- | --- |
| F1 | blocking | Approach M2; Step 5; 346 precondition | M2's matched-ness rests on an unstated dependency on `MAX_CANDIDATES_PER_BULK_REQUEST = 25`. The adaptive target is `ceil((stdev·m(n)/(avg·0.0005))²)`, `m(n)=sqrt(log10(max(n,10)))` — it depends on the chunk's candidate count. Backing cv out of the six committed observations gives ~0.0339, which reproduces all five Go targets exactly (6081/6429/6507/6793/6922 vs observed 6075/6432/6504/6816/6932). The target crosses 8,000 at n=55. The pin holds only because chunks are capped at 25 (target 6,429). | `stage.ts:85-94,139-148`; `statistics.ts` (`getBulkSimTargetIterations`); `constants.ts` `BULK_SIM_COMBINATION_LOG_MIN = 10`; fit vs `equiv-dump-local.json chunkArms[].stageIterations` |
| F2 | blocking | Approach "Sequencing hazard"; Step 0; C21 | Track A's 349 fix adds a guard that throws when the chunk is not provably single-stage for the iteration count; Track B then calls that path at 8,000 iterations on every bulk arm. C21 checks only committed-file disjointness, never whether A changes the behaviour B measures. | ticket 349 lines 55-77; `partition.ts:48,58`; plan C21 |
| F3 | material | Approach M2; Step 5; 346 precondition | The 8,000 pin moves the no-cull bound down: re-implementing `shouldUseLegacyBulkSim` reproduces 349's measured bounds (39 @3,000; 32/33 @5,000) and gives **29 at 8,000** — margin 4, not 7; M1 shrinks it further (28 @12,000, 27 @16,000). Not registered. | `estimate.ts`; executed model vs 349's table |
| F4 | material | 346 "total iterations" formula; C9 | Paired replication omitted: `replicateTopItems` loops ALL five seeds → (seeds−1)·(1+min(8,n)) = 36 extra sims per arm at 8,000 (~288k iterations), on both arms — dilutes `R_iter` toward 1.0. | `rank.ts:1376-1400`, `:1124-1127`; `se.ts:6` |
| F5 | material | Step 3; C12 | Budget (3.8 h) assumes N=220 — the config that yielded only 9–10 ranked rows, which Step 3 exists to replace; N=300→5.1 h, 400→6.8 h, 500→8.5 h. No abort threshold. | `equiv-dump.json` (ranked 9/10 of 220) |
| F6 | material | Step 3 | Deepening via gear/phase targets the pool; ranked-vs-below is set by the cutoff against each delta. The cutoff is the knob. | plan Step 3; ticket 345 item 1 |
| F7 | material | Harness; C6 | The re-implemented `runBulkScreen` body can silently drop `baseline ??=` and the row-completeness assertion; no acceptance compares harness output to the real runner. | `bulk_wasm_sim_runner.ts:113-147`; Step 2 acceptance |
| F8 | minor | C3 | `se` argument holds only if F1/F3 hold — consequence of the pin, not independent support. | `rank.ts:1071,1087,1246` |
| F9 | minor | Step 5; C19 | Leads with `npx vite build`; the fork's build script is `make host`. | `package.json:14` |
| F10 | minor | Step 8 | CRLF check is an eyeball judgment; use `git diff --numstat` / `grep -c $'\r'`. | plan Step 8 |

## Register verdicts (abridged)

C1 stands (adaptive pass CAN push above 8,000 — up to 4× the floor when observed error > 0.05%; not at n≤25). C2 stands as observations, not as the inference drawn. C3, C4, C5, C7, C10, C11, C14, C16, C17 (slope 1.015998 ± 0.002162, t=7.40 re-run exact), C18, C20, C24 stand. C6 stands as read, incomplete as used (F7). C8 source half stands, runtime deferred. C9 stands on substance, refuted on mechanism (iterations reach bulk via `bulk_request_builder.ts:76`, not rank.ts; replication uses all seeds — F4). C12 untestable as written (F5). C13, C22, C23 untested as labelled. C15 stands strongly (seed is the dominant nuisance: same route at different seeds differs 65.3 DPS). C19 stands; plan text inconsistent (F9). C21 stands on files, insufficient as a hazard model (F2).

## Answers to the attack questions

(1) M2 matches achieved iterations at the chunk sizes used, for a reason the plan misstates; total work omits replication (F4). M1 is decidable but leaves A's chunks heterogeneous. (2) Win conditions falsifiable; (c') margin rule sound; (c) at k=20 depends on Step 3 (F6); R_wall wash needs a variance caveat. (3) 3.8 h is the optimistic corner (F5); wedge recovery costs a whole arm. (4) Decorator is the right shape; re-implemented body is the exposure (F7). (5) Owner surfacing is well grounded (C18); force the "cheaper in total, still fails the gate" phrasing when applicable. (6) PROVENANCE/re-pin handled; layout gate present; behavioural coupling with Track A missed (F2).

Bottom line: the design is genuinely good (C15 null, (c') replacement, real pre-registration). Revise for F1, F2, F4; settle F5/F6 with an abort threshold and a cutoff-based depth knob before WASM arms start.

---

# Round 2 (v2): VERDICT revise

F2, F3, F4, F5, F8, F9, F10, owner-wording and wash-caveat resolved. F1 partially (guards right, cv numbers were Go's; WASM cv 0.0356 → target 7,092 at n=25, headroom 908, critical cv 0.0378). F6 REGRESSED → N1 blocking: the campaign cutoff cannot reach k=20 (16 positive deltas on feral-p2, 13 above 2×median(se)). N3 precedence budget-vs-depth unstated; N4 V measured on the loop phase, does not bound R_wall_s; N5 differential at cap=5 ran the legacy path with one chunk; N6 prior dump lacks deltaPct; N7 campaign cutoff collapses the engine's OR.

# Round 3 (v3): VERDICT escalate-to-owner → dissolved by evidence

N2–N7, F1 resolved. N1 deferred (pilots unevidenced) → N8 blocking owner fork (A: run, (c') likely; B: cut 345; C: fund depth search). New N9 (material): "legacy" gates only pre-High stages; 25-chunks are single-stage at every iteration count, so C6's bound table never binds at 25 and the M1 cap was not a real constraint — matching method stands. N10 (material): `deltaDps > 0` depth gate admits noise rows (bulk 30 vs loop 16 positives; 14 rows at 0.059/0.148 DPS = baseline-offset artifact); use `deltaDps ≥ 2·se`. N11 (minor): pilots at low iterations.

Orchestrator disposition: a committed-artifact search refuted N8's premise — feral at max phase 3 has 46 positive rows (38 clearing the cutoff), ret p3 has 54–55 (44 clear). Pilot (ii) is known-good. N8–N11 routed as binding conditions appended to plan-b.md; Gate B PROCEED; executes after Track A.
