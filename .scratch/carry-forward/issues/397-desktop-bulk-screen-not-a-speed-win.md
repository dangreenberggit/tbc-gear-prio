# 397 — Desktop bulk screening engages but is 2.05× slower than WASM

Status: closed
Closed: 2026-09-17
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

---

## Investigation, 2026-09-15 — the cost driver is measured: the finalist stage

**Answer to the question this ticket owns** ("is the multi-stage convergence per
chunk doing redundant work, or is per-chunk convergence simply the cost of the
bulk API?"): it is **redundant work**, and the redundancy is measured rather than
argued. The finalist refinement stage consumes **72.9% of the desktop run's wall
clock**, always exhausts its full iteration budget without converging, and its
entire statistical product is discarded by the client, which reads one scalar
mean per candidate.

No new simulation run was needed. The Go server's own per-stage logging was
already on disk.

### Where the numbers come from

`.scratch/stage-gate/desktop-transport-gate/server-3333.log.err` — the packaged
`wowsimtbc` server's stderr, 14,643 lines, captured across the whole session.
**It is untracked** (the stage `.gitignore` excludes `*.log.err`), so it will not
survive a fresh clone. Every number below comes from it plus the committed
readback JSONs.

The log holds the two cap-20 smokes, an earlier partial run, and the full run.
Segmented by `[Bulk Sim]` stage markers and their timestamps; the full-run window
17:26:19 to 18:23:19 local is 3420 s, matching `readback-3333-tip.json` `elapsedS`
3419 and `wallClockS` 3423.3, and its `recordedAt` 2026-09-15T01:23:19Z (local +7h).

### Cost attribution for the full 3419 s desktop run

Bulk stages are strictly serial — maximum concurrently-open stages is 1, verified
by walking the Started/Finished markers — so the stage walls sum cleanly.

| Stage | Count | Wall | Share of 3420 s | Iterations |
| --- | --- | --- | --- | --- |
| `high` | 29 | 886 s | 25.9% | 14,827,038 |
| `finalist` | 29 | 2494 s | **72.9%** | 43,776,698 |
| outside bulk stages | — | 40 s | 1.2% | 150,000 |
| **total** | | | | **58,753,736** |

The 29 `high` stages and 29 `finalist` stages match `readback-3333-tip.json`
`requests.bulkSimAsync` = 29 exactly — one of each per chunk.

### The finalist loop never converges; it always hits its cap

Parsed from the 29 `Stage: finalist - Started` / `- Finished` pairs:

- `Iterations so far` at entry: 15,027 to 19,853, mostly about 19,700.
- `Iterations` at exit: **exactly 4.000x the entry value in all 29 of 29 chunks**
  (minimum ratio 4.000, maximum ratio 4.000).

That 4x is the budget ceiling, not a convergence point. `stage.go:277` sets
`extraBudget := iterations * BulkSimFinalistMaxExtraIterationMultiplier` with the
multiplier at 3 (`bulk_sim.go:19`), and the loop at `stage.go:279` runs while
`extraUsed < extraBudget && bulkSimUnresolvedFinalistPair(finalists)`. Entry plus
3x extra is 4x total. Reaching 4.000x in every chunk means the loop exited on
**budget exhaustion**, never on the pairs resolving.

It cannot resolve, and the code says why. `bulkSimUnresolvedFinalistPair`
(`statistics.go:130-142`) returns true if **any** adjacent pair in the sorted list
overlaps at 95% confidence. The client sets `topResults: req.candidates.length`
(`bulk_request_builder.ts:115`), so all 25 candidates are finalists. Separating 25
gear sets pairwise at 95% confidence — many of them genuinely near-tied in DPS —
is not achievable at any practical iteration count. Each round doubles the sample
(`stage.go:288`) and the paired error falls as the square root of n, so three
rounds buy about a 1.7x error reduction. The loop is structurally guaranteed to
spend its whole budget.

Consistent with that, every chunk logs `Survivors: 25` against `Input gear sets: 25`
— the stage eliminates nothing. Mean finalist duration is 86.0 s (minimum 36.1,
maximum 91.7). Observed error at exit was already 0.02% to 0.03%, against a logged
`Target error: 0.00%` that no finite sample can reach.

### None of that work reaches the ranking

`rank.ts:955` returns `byKey` as a map of `SimObservation`, and the only consumer,
at `rank.ts:1071`, is `const deltaDps = candObs.dps - candBaselineDps`. One scalar
mean per candidate. The confidence intervals and paired-error arrays that the
finalist stage spent 2494 s computing are never read. The client asked for
`iterations: 5000` (`rank.ts:410` `DEFAULT_ITERATIONS`, passed at `rank.ts:912`);
the server delivered about 79,000.

### The sharp pair, reproduced from disk and confirmed like-for-like

Same binary, same 20 candidates, screening on against screening off:

| | screening ON (`smoke-3333-cap20.json`) | screening OFF (`smoke-3333-cap20-fallback.json`) |
| --- | --- | --- |
| `elapsedS` | 264 | 13 |
| iterations simulated (from the log) | 4,682,382 | 192,000 |
| `rowCount` / `aboveCutoff` | 20 / 8 | 20 / 8 |
| `baselineDps` | 2231.5 | 2231.5 |
| `requests.bulkSimAsync` | 2 | 0 |

**Time ratio 20.3x; iteration ratio 24.4x.** The two agree, and that agreement is
the finding: the desktop path is not running slowly, it is running about 24x more
simulation.

Like-for-like confirmed as the plan required. The 20 row objects in the two JSONs
are **exactly equal** — `a['rows'] == b['rows']`, every field including `dps`,
`rank`, `slot`, `item` and `belowCutoff` — and `aboveCutoffItems` is the identical
8-item list in the identical order. Screening produces a byte-identical answer for
20.3x the time.

The fallback's 192,000 iterations is 64 sims at 3,000 each, the per-candidate
route at its own settings.

### Both leads the plan named are ruled out, each with its measurement

1. **`asyncProgress` poll volume — ruled out.** The raw counts (46,503 on the full
   run against 6,786) look alarming but track elapsed time. Normalised, screening
   ON polls **11.9/s** (3,148 over 264 s) and screening OFF polls **28.5/s** (371
   over 13 s). The screening path polls *less* often per second. Poll count is a
   consequence of duration, not a cause of it.

2. **`WorkerPool(1)` serialisation — ruled out.** `Concurrency: 1` is logged for
   all 29 chunks, but it is deliberate and is not a bottleneck.
   `GetBulkSimStageConcurrency` (`stage.go:63-66`) returns 1 whenever
   `config.UseConcurrentSim` is set, which means candidates run one at a time
   while each candidate parallelises internally across every core. The log
   confirms the machine stays saturated: 3,085 of 3,137 sim batches ran `on 20
   concurrent sims`. Throughput settles it — screening ON achieves **17,184
   iterations/s** on the full run and **17,736 iterations/s** on the smoke, against
   the fallback's **14,769 iterations/s**. The screening path is slightly *faster*
   per iteration. It simply runs about 24x as many of them.

### What this means for the fix, which stays out of scope for this pass

The cost is one ungated call — `runBulkSimFinalistStage` at `bulk_sim.go:186`,
outside the stage loop with no `useLegacyBulkSim` guard — combined with the client
passing the whole chunk as `topResults`. The levers, in rising order of blast
radius:

- Client-side only, no Go change: stop asking all 25 candidates to be finalists
  (`bulk_request_builder.ts:115`). Screening exists to rank a pool coarsely, and
  the accurate paired pass happens later in `rank.ts` regardless.
- Skip the finalist stage altogether when the caller reads only `dps`.
- Gate the finalist call the way the culling stages are already gated.

Per the workstream plan, a fix that touches the Go bulk path goes through
stage-gate because of the 3419 s re-verify cost. The first lever is client-side
only and may not need that; scoping it is the fix owner's call.

### Caveats

- `server-3333.log.err` is untracked and will not survive a fresh clone. The
  committed readback JSONs corroborate the top-line numbers (`elapsedS`,
  `bulkSimAsync` = 29, the smoke pair's 264 s against 13 s, and their identical
  rows) but **not** the per-stage attribution, which exists only in that log.
- The 4.000x ratio and the stage walls are parsed from log text, not from
  `result.StageMetrics`. The readbacks captured no `StageMetrics` or `Timings`
  field at all — searched, zero matches across all three JSONs. The first step
  this ticket predicted found the data in the server log instead.
- Iteration totals are the sum of the logged `Running N iterations on M concurrent
  sims` lines falling inside each stage's time window.

## Note, 2026-09-16 (ticket 403 fixed, Track C)

**Moot for the tab; the code question moves to 406.** The upgrades tab no longer
takes the desktop screening path at all: since 403 it runs the per-candidate loop
on both transports, so this ticket's "desktop bulk screening is slower than WASM"
is no longer a property any user-facing run exercises. Measured at cap 40 on the
fix: 263 s screened against 19 s loop, with byte-identical rows.

This ticket's remaining scope was the *investigation* half, and that is complete —
403 carries the answer (the finalist stage burns the time because `topResults`
must equal the chunk size, so it refines every candidate). The follow-on question
of whether the now-dead screening code should be deleted is **406**, not this
ticket. Do not close this on the strength of the fix alone if the wall-clock
attribution caveat at the end of 403 still matters to anyone.

## Resolution — closed 2026-09-17 as moot

Closed as moot. The tab no longer takes the desktop screening path on either
transport — `makeSimRunner()` is called with no argument at
`upgrades_tab.tsx:451`, whose default is `bulk = false`, so the WASM-factory
per-candidate runner is what ships (verified: `grep makeSimRunner(` returns four
lines, the tab's being the no-argument call). The "desktop bulk screening is
2.05x slower than WASM" property this ticket owns is therefore no longer
exercised by any user-facing run.

The investigation half is complete and 403 (closed 2026-09-17) carries the
answer: the finalist stage burns the time because `topResults` equals the chunk
size, so every candidate is refined. The wall-clock attribution caveat this
ticket flagged — the per-stage split lives only in the untracked, one-time
`server-3333.log.err` and is **not re-derivable** by any committed command —
is itself carried by 403's Evidence and Caveats sections, so nothing is lost by
closing here. The screening-code-deletion question stays with 406.
