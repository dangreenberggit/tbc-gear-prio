# 397 — Desktop bulk screening engages but is 2.05× slower than WASM

Status: open
Origin: pre-merge review of feat/desktop-transport-gate (2026-09-14), Q2 finding
Blocks: —

## What

The desktop-transport gate (Chunk 2) measured a full ret P5 run on the packaged
`wowsimtbc` binary at **3419 s** against the WASM tab's **1668 s** for the same
601-row pool — the desktop path is **2.05× slower**, not faster.

The plan's step 5 Q2 hypothesis was the opposite: bulk HTTP screening was
expected to make the desktop path *faster*, because the fork's bulk-screening
branch engages only on the HTTP transport. Screening does engage (29 bulk chunks
observed over `/bulkSimAsync`), so this is not "screening never ran". It is
"screening ran and is not a speed win". The plan's own text (step 5 Q2 outcome
(b)) says this case "is a finding against parent C8, not a shrug" — hence this
ticket rather than a note.

## Why it is a finding, not just a number

The Go bulk path runs multi-stage convergence sims per 25-candidate chunk
(`MAX_CANDIDATES_PER_BULK_REQUEST=25`), plus the 8×5 paired replication and the
baselines. That this is slower than a per-candidate WASM loop is a real
throughput result about the bulk implementation, and it bears on what any future
tab regression on the desktop path can afford (~57 min for a full ret run).

## How to settle / next step

- Measured verbatim in `.scratch/stage-gate/desktop-transport-gate/desktop-gate.md`
  § Q2 and `readback-3333-tip.json` (3419 s, bulkSimAsync 29) vs
  `readback-wasm-tip.json` (1668 s).
- The question this ticket owns: is the multi-stage convergence per chunk doing
  redundant work, or is per-chunk convergence simply the cost of the bulk API?
  Parent plan claim C8 held that `bulkSimAsync` is HTTP-only by design; this
  ticket is the follow-up C8's own outcome (b) names.
- Not a blocker for the desktop gate itself, which asserts correctness, not speed.

---

## Note, 2026-09-15 — the "multi-stage convergence per chunk" mechanism is misnamed (verified in the Go source)

This ticket, and the decision log (D2), attribute the per-chunk cost to
"multi-stage convergence sims per 25-candidate chunk." That phrase points at the
Low→Medium→High **culling** pipeline, and that pipeline is **skipped** for a
25-candidate chunk. Do not start the investigation from the culling story. But
the ticket's underlying intuition — that a chunk does more than one flat
simulation pass — is **correct**, for a mechanism the ticket never named. All
line references below were read directly from the fork source, not inherited.

### What is skipped (so the ticket's stated mechanism is wrong)

- `assertSingleStageChunk` (`ui/core/components/individual_sim_ui/upgrades/adapters/bulk_request_builder.ts:49-55`)
  throws unless the request would take the "legacy" (no-culling) path. It never
  warns or proceeds silently.
- `shouldUseLegacyBulkSim` is computed on **both** sides — client
  (`ui/core/wasm/bulk_sim/estimate.ts:5-33`) and, independently, the Go server
  (`sim/core/bulk/estimate.go:7-18`). It compares the estimated cost of the
  Low/Medium culling stages against running every candidate straight through
  High; at 25 candidates it returns true (skip culling) at every iteration count.
- The Go stage loop honours it: `sim/core/bulk/bulk_sim.go:131-133` —
  `if useLegacyBulkSim && stageConfig.Stage != BulkSimStageHigh { continue }`.
  So Low and Medium never run. `screeningFallbackWarnings: 0` is consistent with
  this: culling never engaged.

### What actually runs per chunk (so the ticket's observation is right)

A "single-stage" chunk is **not** one flat pass. Two convergence mechanisms run
regardless of `useLegacyBulkSim`:

1. **Finalist refinement — the load-bearing one, and it is ungated.**
   `runBulkSimFinalistStage` is called at `sim/core/bulk/bulk_sim.go:186`,
   **outside** the stage loop, with no `useLegacyBulkSim` guard. It adds lockstep
   iterations to the top `topResults` candidates until their ranking is
   statistically separated, up to a `BulkSimFinalistMaxExtraIterationMultiplier`
   (3×) budget (`sim/core/bulk/stage.go:277`, loop at `stage.go:279-289`).
   Critically, the client sets `topResults: req.candidates.length`
   (`bulk_request_builder.ts:115`) — the **full chunk** — so **all 25 candidates
   are finalists** and every one is refined across multiple rounds.
2. **Adaptive-error passes** inside the High stage: up to
   `BulkSimMaxAdaptivePasses = 2` extra passes if observed error exceeds the
   stage target `TargetErrorPct: 0.05` (`sim/core/bulk/stage.go:300-324`, called
   from `stage.go:158`).

So the real per-chunk cost driver readable from the code is the finalist loop
(over all 25 candidates) plus adaptive passes — **not** the culling pipeline the
ticket names.

### The measurement that settles it, and it needs no new full run

The Go server already emits **per-stage timings**: `result.StageMetrics`
(including a Finalist entry) and `result.Timings`, set at
`bulk_sim.go:187-190` via `setBulkSimStageTiming(..., BulkSimStageFinalist, ...)`.
Neither prior handoff checked whether the 29 recorded `bulkSimAsync` calls
captured these fields. **First step for C:** look for `StageMetrics` /
`Timings.SimmingSeconds` in the recorded readbacks/logs before running anything.
If present, they show directly how much of the ~2 min/chunk is the finalist stage
vs the High pass vs transport overhead — which is exactly the cost attribution
this ticket owes.

Verified 2026-09-15 by a Sonnet agent and re-checked against the source
(the ungated finalist call at `bulk_sim.go:186` and `topResults` at
`bulk_request_builder.ts:115`) by the session that recorded this note.
