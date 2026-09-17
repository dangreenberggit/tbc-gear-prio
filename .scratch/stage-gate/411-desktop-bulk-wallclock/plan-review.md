VERDICT: sound

## Findings

| ID | Severity | Where | What breaks | Evidence |
| --- | --- | --- | --- | --- |
| F1 | material | Q3 noise bar (C18 basis) | The "loop ~5% spread" basis (18/19/19 s) was measured at **3000** iterations, but the deciding L arm runs at **I_match (~20k)**. The 15%-margin justification ("three times the loop's spread") rests on a spread measured at a different iteration count than the arm it governs. More iterations usually shrink relative variance, so 5% is likely a safe upper bound and the non-overlapping-range guard is a second gate — but the plan states the basis without noting the mismatch. Fix: note the iteration-count mismatch in `measurement.md` and treat 5% as an unverified upper bound, or record the actual L-arm spread across the 3 repeats and confirm the margin still clears it. | `grep '"elapsedS"'` on the three prior fixtures → 19/19/18, all at default 3000 (C18 fixtures are pre-I_match); loop `simFor` runs exactly `iterations` with no adaptive inflation (rank.ts:1503) while High stage raises I_match to target (stage.go:214-215) |
| F2 | minor | Step 4 merge-back / C26 | After the fix, only the 5 refined finalists carry matching `AllValues` length against the refined baseline, so the 20 non-finalist rows get **no** `PairedErrorToNextResult`/`PairedErrorToBaseline` (ok=false on length mismatch) — a behavior change vs today's all-25-refined path. Harmless for this measurement (client reads only `dps`, C26) and for the golden (compares `dps`/rows), but the plan does not call it out. Fix: one line in the fork commit body noting paired-error fields now populate only for the finalist subset. | `bulkSimPairedDpsError` returns ok=false when `len(values) != len(bestValues)` (statistics.go:148-150); C26 confirms client reads `dps` only |
| F3 | minor | Plan Approach / step 6 (C7) & gate label | The plan's shorthand "(c) `bulkSimAsync 200s=0`" reads the gate's `bulkSimAsync 200s=` label as a 200-second window; it is an HTTP-200-response count. The underlying assertion (`bulkSimAsync == 0`) is correct, so no substantive error — advisory only. | check_desktop_tab.py assert_gate (c) asserts `bulkSimAsync==0`; `200s` is the HTTP-200 count label, not a time window |

## Register verdicts

| Claim | Verdict | Evidence |
| --- | --- | --- |
| C1 | stands | `grep -n topResults bulk_sim.go` → 87,88,89,186,197; read confirms 186 sizes finalist set, 197 truncates |
| C2 | stands | `grep topResults bulk_request_builder.ts` → 116 (`topResults: req.candidates.length`), 117 (`highStageIterations`) |
| C3 | stands | stage.go read: early returns 252/261/265 give `results`; 293 gives `finalists`; doc comment 247-248 says callers use finalists directly |
| C4 | stands | bulk_wasm_sim_runner.ts:57 rejects unless `topResults.length === expectedCount` AND `rows.length === expectedCount` (more precise than the plan states) |
| C5 | stands | inherited/contaminated by design; used only as the ungated reference for the <40% bar; 264/263/3419 present in 403 ticket |
| C6 | stands | prior gate work + C7 evidence; `simRunner()` returns the default runner |
| C7 | stands | Explore: BulkHttpSimRunner extends WasmSimRunner (l.43), runBulkScreen via bulkSimAsync (l.73); `readonly concurrency` (l.99); `git show cfbd7fced` shows the removed `new BulkHttpSimRunner(this.sim.concurrency)` |
| C8 | stands | not re-run (non-load-bearing readback field); consistent with C7 |
| C9 | stands | harness has only elapsedS/wallClockS today (accepted as the gap this plan fills) |
| C10 | stands | rank.ts:566 single `iterations` → 918 (runBulkScreen→highStageIterations) and 577/1503 (loop per-candidate) |
| C11 | stands | stage.go:210-216 — highStageIterations is a floor, raised to target-error count; realised-count-on-fixed-binary correctly labeled hypothesis until the probe |
| C12 | stands | Explore: stage.go:275 Finalists/Iterations lines, progress.go:151 Duration; check_desktop_tab.py:204-205 DEVNULLs stderr; parse script matches FINALIST_START/END; log.Printf → stderr, no SetOutput |
| C13 | stands | Explore: BulkSimRequest fields 1-8, field 9 free; both generated files gitignored |
| C14 | stands | not re-run (tool presence); make 4.4.1 confirmed on PATH |
| C15 | stands | plan-measured rc 0 `ok` 2026-09-17; not re-run (build cost), consistent with clean fork tip |
| C16 | stands | Explore: only two PROVENANCE.md under upgrades/; zero rows for any of the four edited files |
| C17 | stands | fork HEAD `79066917d` = lock commit, clean, branch feat/upgrades-tab, branchedFrom 17a8fb28c |
| C18 | stands | fixtures show elapsedS 19/19/18 (loop) — but see F1: measured at 3000, not I_match |
| C19 | stands | 403 ticket: 264/13 (cap20), 263 (cap40 screened), 3419 (full pool), same direction; post-fix cap-independence correctly labeled hypothesis |
| C20 | stands | rank.ts:1227 `await screenCandidates` is one await before `promisePool(tasks)` that emits rows (1187); first row structurally waits for all screening |
| C21 | stands | driver test asserts `topResults===count` (146), chunk counts `[25,25,10]` (143); does not assert field absence; adding `finalistResults` leaves `built.topResults` unchanged |
| C22 | stands | Explore: `.gitignore` 58-59 ignores stage-gate/*, no 411 negation yet; check-ignore confirms currently ignored (step 10 adds it) |
| C23 | stands | correctly labeled hypothesis, verified by the regen step |
| C24 | stands | Explore: gate (b) runner==WasmSimRunner, (c) bulkSimAsync==0, (h) golden compare against golden-ret-p5-cap40.json; hypothesis until step 12 gate run, as labeled |
| C25 | stands | stage.go:264 early return with no log when `!bulkSimUnresolvedFinalistPair`; the Q2 alternative signal (iv + diff review) correctly covers this without letting a bypass pass — see the Q2 judgment below |
| C26 | stands | statistics.go:148-150 ok=false on length mismatch; client reads dps (see F2) |
| C27 | stands | Explore: wasm/main.go calls only `bulk.BulkCombinationCount`/`bulk.BulkCandidates`, never `BulkSim`/`BulkSimAsync`; the loop's web/WASM path uses `raidSimAsync`, so the finalist-stage change cannot touch the web transport |
| C28 | stands | `make --version` → GNU Make 4.4.1; `make proto` fallback correctly labeled hypothesis |

**Judgments held (not delegated):**

- **Does the fix fix, not bypass?** Yes. `finalistResults: 5` keeps `len(finalists) ≥ 2` so the stage runs (not the `1`-value bypass); step 4's `mergeBulkSimFinalists(preFinalist, latestResults)` correctly reconciles C3 (stage returns only the 5 refined) with C4 (client needs all 25 rows) — capture-before-call, merge-after ordering is right, and the stage's product (refined means) reaches the response via the merge before line 197 truncates. No guard/early-return is added around the stage call (step 4 explicit). This is a genuine fix.
- **Q2 escape hatch (C25).** The stage's own convergence skip (stage.go:264) is designed behavior, not a bypass: when the top-5 are already separated, refinement is correctly unnecessary and the ranking stays trustworthy. Signal (iv) — unit tests that the merged response carries the refined metrics, plus a diff review showing no early return was added — proves fixed-not-bypassed even when the finalist share is 0. The `<40%` bar is meaningful only when the stage runs and the plan says so. This is not a loophole that lets a bypass pass.
- **Matched accuracy soundness.** One `iterations` value drives both arms (C10). `check_desktop_tab.py --compare` (T1-T4) validates real per-row DPS agreement (T2 ≤12, T3 ≤0.3 same-transport, T4 median ≤3.4), not mere structure — so accuracy is genuinely matched, and B/L are on the same Go binary over HTTP (the desktop `sim_worker` is HTTP-backed; settled empirically by the 403 gate that asserts same-transport T3). The `[I_match, 1.25·I_match]` tolerance is the 346 M2/M1 method (probe the realised target, then ask for it so the floor binds) and is justified, not arbitrary; the one-retry-then-stop rule prevents loosening tolerances to fit.
- **Decision rule pre-registration.** The verdict is mechanical: KEEP iff bulk median ≤ 0.85× loop median on both metrics AND non-overlapping ranges AND Q2 holds AND accuracy (a)(b) hold. The executor records numbers; the inequalities decide. The stated C20 prior (predicts DELETE) is explicitly not a rule. Not gameable by the run outcome.
- **Blast radius.** Default path untouched (opt-in localStorage key, try/catch fallback to `this.sim`), so gate (b)(c)(h) stay green; the Go change reaches only `BulkSimAsync` (HTTP/desktop), never the WASM web transport (C27); proto field 9 is free and both bindings are gitignored (C13); no PROVENANCE row moves (C16). No repo rule violated — no type derived from a JSON import, no `cd && chains (steps use `go -C`/`make -C`/`git -C`), output is bounded, and the stage dir is tracked via the C22 negation (step 10). The re-pin discipline (step 13) predicts the regen list and stops on any deviation.

The plan can proceed. F1 and F2 should ride along to the executor as record-keeping refinements; neither blocks the measurement or voids the verdict.
