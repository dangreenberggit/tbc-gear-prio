# Measurement — 411 desktop bulk-screening wall-clock, finalist stage fixed

Outcome: **DELETE** (the canonical verdict line is in § Verdict).

## Environment

Observed 2026-09-17 on the Windows 11 box (native, no WSL/CI).

- Core: `feat/406-keep-bulk-dead-note` at `59431bf5c16d4e4df563670522e9e0571fa51cfc`, clean at stage open.
- Fork: `feat/upgrades-tab`, base `79066917dc575122c700049b82ddabbfa867281d`, clean at stage open. New commit `FORK_SHA = 993320fab0d4dc57b1fb9742f0aa7b0b6095bc9c` ("Size the bulk finalist stage independently").
- Port 3333 free at open (`socket.connect_ex` = 10061).
- Toolchain: GNU Make 4.4.1, Go 1.25.4 windows/amd64, Node v22.17.1, protoc / protoc-gen-go on PATH, fork `node_modules/.bin/protoc.cmd`, `protoc-gen-ts.cmd`, `tsc.cmd` present.
- `os.cpu_count()` = 20. Machine otherwise idle across all runs; no interruptions noted.
- Binary: `vendor/tbc-new-fork/wowsimtbc.exe` rebuilt from `FORK_SHA` (`make wowsimtbc` rc 0; 131,431,936 bytes, 2026-09-17 14:48).
- Proto regen path: `make -C <fork> proto` succeeded (rc 0) — the Python-subprocess fallback was not needed.

## Method

- **Metric:** wall-clock. `firstRowS` = Run click to the first `.upgrades-results table.upgrades-results-table tbody tr` (harness MutationObserver); `clickToDoneS` = click to the `Took` status; `elapsedS` = the tab's own `Took` value, recorded alongside.
- **Transport:** desktop / HTTP / Go server (`wowsimtbc.exe --launch=false --host=:3333`), packaged binary. Bulk arm = `BulkHttpSimRunner` (opt-in `upgradesTab.runner=bulk-http` localStorage key); loop arm = default `WasmSimRunner` (per-candidate `raidSimAsync`). Both go through the same packaged Go binary over HTTP, so the accuracy compare's T3 (same-transport determinism) is asserted.
- **Cap:** 40 (Q1 Candidate A), ret P5.
- **Candidate set (deviation from plan's "2 chunks" assumption):** cap 40 screens the first 40 of the EP order **plus every equipped row regardless of rank** (`rank.ts:1192-1195`). For ret P5 that is 65 candidates → three bulk chunks of 25/25/15, so `requests.bulkSimAsync = 3`, not the 2 the plan predicted. This is designed behaviour, unchanged by the fix; both arms screen/sim the identical 65-candidate set, so B-vs-L stays apples-to-apples. The step-9/11 `bulkSimAsync == 2` predicate is corrected to `== 3` for B arms. Ledger row 3.

Arms (all cap 40, ret P5, `wowsimtbc.exe` on :3333, fresh server per run):

| Arm | Runner | Tab iterations | Repeats | Role |
| --- | --- | --- | --- | --- |
| P (probe) | bulk-http | 3000 (default) | 1 | derives `I_match` |
| B | bulk-http | `I_match` = 20000 | 3 | deciding |
| L | loop (default) | `I_match` = 20000 | 3 | deciding |
| S | loop (default) | 3000 | 3 | context only (what ships today) |

- **`I_match` derivation (346 M2/M1 method):** probe P1 realised `high` stage `Iterations:` of 19686, 19797, 15865 (three chunks). `I_match` = max (19797) rounded up to the next 500 = **20000**. Both deciding arms ran with the iterations picker set to 20000, which drives both the loop's per-candidate sims and `highStageIterations` (C10).
- **Harness command per arm:** `python run_411_arms.py --arm <ARM> [--bulk-http] --candidates 40 [--iterations 20000]`, which starts the server (stderr → `evidence/server-<ARM>.log.err`), waits for `GET /tbc/paladin/retribution/` = 200, runs `run-tab-cdp.mjs` to `evidence/<ARM>.json`, then terminates the server.

## Pre-registered decision rule (copied verbatim from plan Q3)

> **Noise bar (pre-registered):** three repeats per deciding arm; verdict on medians; "beats" on a metric means the bulk median is **≤ 0.85 ×** the loop median **and** the arms' `[min, max]` ranges do not overlap.
>
> **Verdict:** **KEEP** (406's ruling stands) if and only if bulk beats the loop on **both** `firstRowS` **and** `clickToDoneS` under the bar above, **and** the Q2 check holds, **and** the accuracy checks (a)(b) hold. Otherwise **DELETE**.

## Accuracy checks

- **(a) Realised high iterations in `[I_match, 1.25·I_match]` = [20000, 25000]:** every B run's three `high` `Finished` summaries read exactly `Iterations: 20000` (the floor binds cleanly; no adaptive inflation because the asked count already exceeds the 0.05% target count). Within range for all three runs. No retry needed. Source: `evidence/server-B{1,2,3}.log.err`.
- **(b) `check_desktop_tab.py --compare B_i L_j` rc 0 for all nine pairs:** all nine passed. Representative line set (identical across pairs):
  - T1 key sets identical: pass
  - T2 rows 9..N |d|≤12.0: pass (max=2.2 over 32 rows)
  - T3 top-8 |d|≤0.3: pass (max=0.0 over 8 rows; same-transport determinism)
  - T4 |median|≤3.4: pass (median=1.5 over all rows)

Accuracy is genuinely matched: the two transports agree to within server determinism on the top 8 and within 2.2 DPS elsewhere.

## Fixed-not-bypassed (Q2)

**The finalist-share signal carried the check** (not the alternative signal — the stage ran on every deciding B run).

- (i) Every `Finalists:` line in every B run reads `5`, never `25` or `15`. `evidence/finalist-B{1,2,3}.csv` `finalists` column = 5 on both chunks of every run.
- (ii) On every chunk where the stage ran, exit iterations > entry (chunk 1: 20000→80000, chunk 2: 20000→40000) with duration > 0 — refinement happened.
- (iii) **Finalist share = Σ finalist Duration / Σ elapsedS = 78.97 s / 473 s = 16.7 %** (per-run 16.6% / 16.8% / 16.7%), well below the pre-registered 40% bar and far below the 66–73% seen ungated. The stage runs and its statistical product reaches the response, but no longer dominates the run.
- (iv) `go -C <fork> test ./sim/core/bulk/` green, including `TestBulkSimFinalistCount` and `TestMergeBulkSimFinalists` which assert the merged response carries the refined finalists' metrics. The fork diff adds no early return and no guard around the `runBulkSimFinalistStage` call.

Note on the `bulkSimAsync 200s=` gate label (F3): that is an HTTP-200 response count, not a 200-second window.

## Results

Per-run wall-clock (seconds). Each number: `evidence/<ARM>.json` fields `firstRowS`, `clickToDoneS`, `elapsedS`.

| Arm | Run | firstRowS | clickToDoneS | elapsedS | runner | bulkSimAsync |
| --- | --- | --- | --- | --- | --- | --- |
| B | B1 | 103.833 | 157.671 | 158 | BulkHttpSimRunner | 3 |
| B | B2 | 104.445 | 158.336 | 158 | BulkHttpSimRunner | 3 |
| B | B3 | 104.227 | 157.582 | 157 | BulkHttpSimRunner | 3 |
| L | L1 | 6.017 | 98.646 | 98 | WasmSimRunner | 0 |
| L | L2 | 6.017 | 97.172 | 97 | WasmSimRunner | 0 |
| L | L3 | 5.792 | 97.321 | 97 | WasmSimRunner | 0 |
| S | S1 | 1.160 | 17.585 | 17 | WasmSimRunner | 0 |
| S | S2 | 1.165 | 17.904 | 18 | WasmSimRunner | 0 |
| S | S3 | 1.080 | 18.433 | 18 | WasmSimRunner | 0 |

Per-arm (deciding arms):

| Arm | Metric | median | min | max |
| --- | --- | --- | --- | --- |
| B | firstRowS | 104.227 | 103.833 | 104.445 |
| B | clickToDoneS | 157.671 | 157.582 | 158.336 |
| L | firstRowS | 6.017 | 5.792 | 6.017 |
| L | clickToDoneS | 97.321 | 97.172 | 98.646 |

**F1 (honored) — L-arm observed spread at I_match.** The plan's noise-bar basis (~5% loop spread) was measured at 3000 iterations, but the deciding L arm runs at I_match ≈ 20000. Iteration-count mismatch noted. The **actual L-arm spread (max−min over median) at 20000 iterations** is 1.51% (clickToDoneS) and 3.74% (firstRowS) — both below the 5% upper bound the plan cited, as expected (more iterations shrink relative variance). The 15% margin clears the observed spread by roughly 4–10×. The 5% figure is treated as an unverified upper bound; the margin is comfortably clear either way, and moot here because bulk lost by 17× (first-row) and 1.6× (end-to-end), nowhere near the noise boundary.

## Verdict

**Verdict: DELETE**

The pre-registered inequalities, evaluated:

- **firstRowS:** bulk median 104.227 s ≤ 0.85 × loop median (0.85 × 6.017 = 5.114 s)? **No** (104.227 > 5.114). Ranges [103.833, 104.445] vs [5.792, 6.017] do not overlap, but the ≤0.85× test fails. Bulk does **not** beat the loop on firstRowS.
- **clickToDoneS:** bulk median 157.671 s ≤ 0.85 × loop median (0.85 × 97.321 = 82.723 s)? **No** (157.671 > 82.723). Ranges [157.582, 158.336] vs [97.172, 98.646] do not overlap, but the ≤0.85× test fails. Bulk does **not** beat the loop on clickToDoneS.

KEEP requires bulk to beat the loop on **both** metrics. It beats it on **neither** — desktop bulk is ~17× slower on first row and ~1.6× slower end-to-end, at matched accuracy, with the finalist stage fixed (not bypassed, 16.7% share). Therefore the rule yields **DELETE**: 406's measured-clean delete (throwaway shas fork `5c2b1d7f9`, core `ca5c7040`) is the honest follow-up. This plan records the verdict; it does not perform the delete (out of scope).

## Gate (desktop-gate:check on the re-pinned tip)

`pnpm desktop-gate:check` rc 0 (rebuilds the binary, default path, no `--update-golden`):

- (a) pass: served worker wasmRefs=0 readyFalse=1 (S3)
- (b) pass: runner=WasmSimRunner (S1) — default path unchanged; the opt-in key does not leak
- (c) pass: bulkSimAsync 200s=0 raidSimAsync 200s=87 workerSessionsAttached=5 poolSize=20 (S2; `200s=` is an HTTP-200 response count, F3)
- (d) pass: done=True runTimedOut=False
- (e) pass: rowCount=40 expected=40 eligibleCount=617
- (f) pass: panicHit=False
- (g) pass: screeningFallbackWarnings=0 (S4)
- (h) pass: rows, aboveCutoffItems and baselineDps match data/desktop-gate/golden-ret-p5-cap40.json

## Caveats

- **S arm (context only):** loop at the shipping default 3000 iterations runs in ~18 s end-to-end with a ~1.1 s first row. It never enters the verdict; it shows what ships today.
- **firstRowS structural note (C20):** on the screening path `screenCandidates` is a single `await` before any row is emitted, so bulk's first row cannot arrive before every screening chunk finishes. The measured 104 s first row (≈ the 158 s end-to-end minus the per-candidate refinement tail) confirms this prediction — bulk cannot win first-row by construction.
- **Chunk-count deviation:** cap 40 screens 65 candidates (40 + equipped rows), giving 3 bulk chunks, not the 2 the plan assumed. Does not affect the comparison (both arms use the same set). See § Method and ledger row 3.
- **Paired-error fields (F2):** after the fix, only the 5 refined finalists per chunk carry `PairedError*` fields; the 20 non-finalist rows get none (length mismatch → ok=false). Harmless — the client reads only `dps`. Noted in the fork commit body.
