# Execution report — 411-desktop-bulk-wallclock

**Base verified:** core HEAD `59431bf5…` matched the prompt's base SHA on `feat/406-keep-bulk-dead-note`, tree clean; fork HEAD `79066917d` matched, tree clean. Model self-check: Opus 4.8 — proceeded.

## Step-by-step status

| # | Step | Status |
| --- | --- | --- |
| 1 | Preconditions | done — port 3333 free (connect_ex 10061), tools present, Make 4.4.1, Go 1.25.4, Node v22.17.1, 20 CPUs |
| 2 | Proto field `finalist_results = 9` | done |
| 3 | Regenerate bindings | done — `make -C <fork> proto` succeeded (rc 0), no Python fallback needed; both bindings carry the field, bindings gitignored |
| 4 | Go fix (decouple + merge-back + tests) | done — vet rc 0; both new tests PASS; full bulk suite `ok` |
| 5 | Builder (`finalistResults: BULK_FINALIST_RESULTS`) | done — tsc rc 0 |
| 6 | Opt-in runner switch | done — default path unchanged, confirmed by gate (b)/(c) |
| 7 | Harness flags + timings | done — oxlint rc 0; smoke via probe P1 |
| 8 | Fork commit | done — `FORK_SHA = 993320fab0d4dc57b1fb9742f0aa7b0b6095bc9c`, exactly 9 files, tree clean, not pushed |
| 9 | Build + smoke | done — `wowsimtbc.exe` built (131MB); P1 clean; `I_match` derived |
| 10 | Stage dir tracked | done — evidence not gitignored (check-ignore rc 1) |
| 11 | Deciding runs (S/B/L ×3) | done — all clean; accuracy (a)(b) and Q2 pass |
| 12 | `measurement.md` | done — verdict grep = 1 |
| 13 | Re-pin fork | done — `pnpm verify` rc 0; regen only the predicted paths, counts 221/451 |
| 14 | Desktop gate | done — (a)–(h) pass, no `--update-golden` |
| 15 | Tickets | done — 411 `Status: closed` (line 3); 406 carries "411 measured" (count 1) |
| 16 | Core commits | done — three commits, both trees clean |

No step was flagged-and-skipped or stopped. Every step completed.

## Deviation ledger

| Step | Plan said | Found | Action | Why |
| --- | --- | --- | --- | --- |
| 4 | `latestBaseline, latestResults, finalistMetrics = runBulkSimFinalistStage(...)`; then `if finalistMetrics != nil { latestResults = mergeBulkSimFinalists(preFinalist, latestResults) }` | Assigning the stage output straight into `latestResults` would momentarily hold only the refined subset. | adapt | Used a separate `finalistResultsList` var; `latestResults` is overwritten only on the merge path. Functionally identical (on skip, the stage returns the full list = `preFinalist`), cleaner. Merge-before-truncate ordering and intent preserved. |
| 4 (stage.go) | "amend the doc comment"; manifest marks stage.go "comment only" | The stage's sizing parameter is still named `topResults` but now receives `finalistResults`, so the name is misleading. | flag (kept comment-only) | Renaming the param exceeds "comment only" and the manifest is explicit; the reviewer signed off on comment-only. I made the doc comment carry the clarity instead. |
| 9 / 11 | Step-9 acceptance predicts `requests.bulkSimAsync: 2` (cap 40 = chunks 25+15) | Cap 40 screens **65** candidates — the first 40 of EP order **plus every equipped row regardless of rank** (`rank.ts:1192-1195`) — giving **3** chunks (25/25/15), so `bulkSimAsync = 3`. | flag (continue; corrected the sanity predicate to `== 3`) | Designed behaviour, unchanged by the fix. Both arms screen/sim the identical 65-candidate set, so B-vs-L stays apples-to-apples; the measurement's validity does not depend on the chunk count. This is a measured fact, not a loosened threshold. Recorded in `measurement.md` § Method. |

No SME step in this plan, so no `contested` verdict.

## Measurement outcome

- **`I_match` = 20000.** Probe P1 realised high-stage `Iterations:` of 19686 / 19797 / 15865 across its three chunks → max (19797) rounded up to the next 500.
- **Per-arm medians / min / max (seconds):**
  - **B (bulk@20k):** firstRowS median 104.227 [103.833, 104.445]; clickToDoneS median 157.671 [157.582, 158.336]
  - **L (loop@20k):** firstRowS median 6.017 [5.792, 6.017]; clickToDoneS median 97.321 [97.172, 98.646]
  - **S (loop@3000, context):** firstRowS 1.16 / 1.165 / 1.08; clickToDoneS 17.585 / 17.904 / 18.433
- **Finalist-share (Q2) = 16.7%** (Σ finalist duration 78.97 s / Σ elapsedS 473 s; per-run 16.6/16.8/16.7%). Signal that carried it: **the finalist-share signal itself** — the stage ran on every B run (`Finalists: 5` twice per run, never 25/15; exit iters > entry with duration > 0), refining 5 of 25 per chunk. Fixed, not bypassed. Backed by signal (iv), the two new Go unit tests.
- **Accuracy (a):** every B run's three high-stage `Iterations:` = exactly 20000, within [20000, 25000]. No retry needed.
- **Accuracy (b):** all nine B×L `check_desktop_tab.py --compare` pairs rc 0 — T1 identical key sets, T2 max 2.2 ≤ 12, T3 max 0.0 ≤ 0.3, T4 median 1.5 ≤ 3.4.
- **F1 honored:** iteration-count mismatch noted; observed L-arm spread **at I_match=20000** is 1.51% (clickToDoneS) and 3.74% (firstRowS) — below the plan's 5% figure and far below the 15% margin. 5% treated as an unverified upper bound; margin clears the observed spread ~4–10×.

**VERDICT: DELETE.** The pre-registered rule (KEEP iff bulk median ≤ 0.85 × loop median AND non-overlapping ranges, on **both** metrics, with Q2 and accuracy holding):
- firstRowS: 104.227 ≤ 0.85 × 6.017 (= 5.114)? **No.** Bulk does not beat the loop.
- clickToDoneS: 157.671 ≤ 0.85 × 97.321 (= 82.723)? **No.** Bulk does not beat the loop.

Bulk beats the loop on neither number → DELETE. 406's measured-clean delete (fork `5c2b1d7f9`, core `ca5c7040`) is the follow-up — **not performed here** (out of scope).

## Gate confirmations

`pnpm verify` on the tip: **rc=0** (1342 gates ran, 1 skipped — E-W3 fork-parity, expected because vendor protos are gitignored; upstream-drift is warning-only).

Desktop gate `pnpm desktop-gate:check`: **rc=0**, no `--update-golden`:
- (a) served worker wasmRefs=0 readyFalse=1
- (b) runner=WasmSimRunner
- (c) bulkSimAsync 200s=0 raidSimAsync 200s=87 workerSessionsAttached=5 poolSize=20 (`200s=` is an HTTP-200 count — F3)
- (d) done=True runTimedOut=False
- (e) rowCount=40 expected=40 eligibleCount=617
- (f) panicHit=False
- (g) screeningFallbackWarnings=0
- (h) rows, aboveCutoffItems and baselineDps match `golden-ret-p5-cap40.json`

## Final tree state

- `git -C <core> status --porcelain`: **empty**
- `git -C <fork> status --porcelain`: **empty**
- `git -C <core> log --oneline -4`:
  ```
  f04e8a47 Close 411 with DELETE verdict, point 406 at it
  f1800615 Re-pin the fork to the finalist-stage fix
  e2c4f97e Add ticket 411 desktop bulk wall-clock measurement
  59431bf5 Correct 411's stale Windows-build premise
  ```
- `git diff --stat 59431bf5…HEAD`: 35 files, +7867/−4 — `.gitignore`, the two tickets, the whole `411-desktop-bulk-wallclock/` stage dir, `data/wowsims-fork.lock.json`, `data/sim-implemented-effects.json`. All inside the Paths manifest.

Fork not pushed, no merge to dev, no `pre-merge-review` run — the orchestrator owns Gate C.
