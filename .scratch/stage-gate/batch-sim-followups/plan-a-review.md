# Plan-a review — round 1 (2026-09-02)

VERDICT: revise

## Findings

| ID | Severity | Where | What breaks | Evidence |
|---|---|---|---|---|
| F1 | **blocking** | Step 3 (driver), Step 5(a) | A WASM candidate failure triggers the pass-level abort signal: `batch.ts:132-134` does `if (candidateResult.error) { signals.abort.trigger(); }` on the SAME `SimSignals` the driver registers once per pass. The classifier `if (signals.abort.isTriggered()) throw new BulkScreenAbortedError()` therefore misclassifies every chunk failure as a user Stop — no `failures` entry, remaining chunks skipped, `PartialRanking` with all candidates unsimmed. The driver needs its own source of truth (`let userAborted = false` set only by the `AbortSignal` listener / pre-entry check), and the classifier must test that flag, not `isTriggered()`. | `sed -n '125,140p' $F/ui/core/wasm/bulk_sim/batch.ts` |
| F2 | material | Step 3 | The driver control flow as specified does not compile (a `finally` with no matching outer `try`; throw/return placed after it); the obvious nesting leaks the listener on the abort path. | plan Step 3 sentence order |
| F3 | material | Step 5(a) | Masking: any non-abort throw from `runBulkScreen` — including `bulkScreenResultFrom`'s row-shortfall throw, the guard ticket 349 calls "the only thing standing between a cull and a silently truncated ranking" — becomes a silent fallback to the loop. Distinguish transport failure (degradable) from structural wrongness (must surface). | `bulk_wasm_sim_runner.ts:45-51`; ticket 349 |
| F4 | material | Step 5(d), Step 6(a) | Number contradiction: Step 5(d) says "floors at 26"; C13/C14/re-derivation say the first multi-stage n is 27 (25 and 26 single-stage at every count up to 1,000,000). | independent re-implementation reproduces C13 exactly |
| F5 | material | Approach ¶3, Step 6(a) | Mechanism misstated for n=26: `high×(n+1) ≥ high×n` holds only at n=25; at n=26 Medium DOES run (`26 > maxSurvivors 25`) and single-stage-ness comes from `1000×27 + high×26 ≥ high×26`. | `stage.ts:69-76`; `estimate.ts:18-32` |
| F6 | material | Step 3, Step 7 case 3 | On Stop the driver discards rows from completed chunks — defensible (aborted runs mark everything unsimmed anyway, `rank.ts:1195-1217`) but an unstated contract decision. | `rank.ts:1190-1217` |
| F7 | minor | Steps 3/4 | Overturns review row S3 (`wontfix` on the duplicated runner loop) without saying so; Step 12(b) must update S3. | docs/reviews row S3 |
| F8 | minor | Step 6(b) test 3 | `MAX === bulkSimStageConfigs[1].maxSurvivors` is a third encoding of the constant; tests 2 and 4 already cover the operative property. | `bulk-partition.test.ts:43-44` |
| F9 | minor | Step 12(a) | Layout-gate digest globs `engine/**/*.ts` only (adapters don't move it; rank.ts/seam/partition do); the gate SKIPS when `dist/tbc/lib.wasm` is absent — assert it ran. | `check_layout_gate.py:151-162,395-402` |
| F10 | minor | Register | Two unregistered claims: Option 2's rejection rationale; `signal?.aborted` as a sufficient co-classifier (race). | plan body |

## Register verdicts

C1–C13, C15–C24 stand (details in the reviewer transcript; notable: C6 — on HTTP the aborted result arrives as a RESOLVED result, so the throw comes from `bulkScreenResultFrom` inside the driver's try; C12 — plus `batch.ts:132-134` triggers the shared signal (F1); C20 — `bulkScreenCacheKey` reads only named fields, so `signal` cannot change a key, independently confirmed). C14 refuted in part (F5). C21 correctly labelled hypothesis.

## Scope check

Both transports covered identically by construction; chunk-failure rider present; nothing from Track B leaks in. Cross-track: at 8,000 iterations the bound is n=30, so Track B's 25-chunks pass the new guard — coupling real but benign.

## What revision needs to fix

F1 must change before execution. F2–F5 are cheap textual fixes now, expensive mid-execution.

---

# Round 2 (v2): VERDICT proceed

F1–F10 all resolved (F1: per-chunk fresh SimSignals + `userAborted` flag, classification unambiguous in every ordering traced — abort during dispatch, after clean resolve, candidate-error trigger then user abort, abort after the last chunk, sync throw; no listener or unregister leak on any exit path. F3: `BulkScreenIntegrityError` covers exactly the two structural checks, rethrown unconditionally; `result.error` stays degradable, with the `userAborted` flag separating the HTTP resolved-aborted result from a candidate panic. F4/F5: 27 everywhere; both mechanisms stated. F6/F7/F8/F9/F10 as revised). New claims C25–C28 verified. Two minor conditions, appended to plan-a.md as binding: N1 (Step 7 case 4 must resolve-with-error like upstream, not reject); N2 (state the integrity-failure discard reason in ticket 347). Residual: the error classes are values — value imports, not `import type`.
