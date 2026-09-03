Status: closed
Type: task
Origin: Step 10 of the batch-sim web track (stage-gate, 2026-09-01)
Blocks: none
Blocked by: none

# Bulk screening measured 1.6x SLOWER than the loop — re-measure at matched accuracy

Group: `.scratch/upgrades-tab-sim-followups/README.md`

## What

Step 10's equivalence run measured the two routes end-to-end on the same
feral-p2 ranking, and the bulk route was **slower**, not faster:

| route | wall clock | rows |
| --- | --- | --- |
| per-candidate loop (`hasBulkCapability=false`) | **2,699.5 s** (45.0 min) | 220 |
| bulk screening (`hasBulkCapability=true`) | **4,333.1 s** (72.2 min) | 220 |

Same machine (20 cores), pool 4, same 220-row ranking, back-to-back in one page
session with no competing work. That is **1.6x slower** for the route whose whole
premise is that batching is cheaper.

## Why this is NOT yet a finding about batching

**Hypothesis, untested: the two arms did not run at matched accuracy**, so this
compares more work against less work rather than comparing routes.

Two mechanisms are known to be in play, both observed in this session's console
output rather than inferred from source:

1. **Iteration count differed.** The loop arm ran a flat **5,000** iterations per
   sim. The bulk arm ran adaptive **7,091** — the bulk tournament raises
   iterations to hit a target stage error (`stage.ts`, `getBulkSimStageIterations`;
   the ledger records a nominal 200 becoming 5,239 in an earlier probe). That is
   **1.42x more work per sim before anything else is counted**, and it accounts
   for most of the 1.6x on its own.
2. **Per-chunk baseline probes.** Each bulk chunk runs up to two baseline sims
   (`stage.ts:279`, `maxBaselineSims = 2`), so the cost per chunk is roughly
   `n + 2` sims. With `MAX_CANDIDATES_PER_BULK_REQUEST = 25`, a 220-attempt
   screening pass is ~9 chunks and therefore carries ~18 baseline sims the loop
   never pays.

The flat-vs-adaptive iteration count is visible on sight in the worker log and is
what distinguishes the two routes there.

## Explicitly not contradicted

The owner's standing finding that **"cost is a wash at matched accuracy"** is
**not** contradicted by this measurement, because this measurement was not taken
at matched accuracy. Nothing here should be cited as evidence against it. That is
precisely why this ticket exists: to take the comparison the standing finding is
actually about.

## What to do

1. Re-measure with the two arms pinned to the **same effective accuracy** — either
   force the bulk stage to a fixed iteration count matching the loop's, or raise
   the loop to the bulk arm's realised count, and say which was done.
2. Report **sim-count** and **total iterations** per arm, not just wall clock, so
   the comparison does not hinge on scheduler noise. Wall clock alone is only
   trustworthy on an idle machine (this ledger records a ~30x stall from
   competing local work).
3. Count the baseline probes actually run per chunk and quote the total, so the
   chunking overhead is a measured number rather than the `n + 2` estimate.
4. Then state whether batching is faster, slower, or a wash at matched accuracy —
   and if it is not faster, whether the feature's justification rests on
   something other than speed (e.g. fewer round trips for the local/HTTP track).

## Acceptance

- [ ] Both arms measured at matched accuracy, with the matching method stated.
- [ ] Sim counts and total iterations quoted per arm alongside wall clock.
- [ ] Actual baseline-probe count per chunk quoted (C15's cost, measured).
- [ ] A stated verdict on bulk-vs-loop cost at matched accuracy, and whether the
      standing "wash" finding holds.

## Notes

Raw evidence: `.scratch/stage-gate/batch-sim-web-local/equiv-dump.json` carries
`elapsedSeconds` and `hasBulkCapability` per arm. The run was 124.9 min of page
uptime with no reload and no competing work, so the wall-clock figures are clean
for what they measure — they simply do not measure equal work.

## This ticket is now the revisit trigger for the WASM bulk default

`makeSimRunner(bulk = false)` (`bulk_wasm_sim_runner.ts`) defaults the **WASM**
transport to the per-candidate loop; `BulkHttpSimRunner` keeps bulk screening on
the HTTP transport. Reason, measured: one 25-candidate chunk costs **332 s** on
the in-browser TS tournament (`execution-ledger-web.md`, Step 2/3 arm table,
pool 4) versus **9.35 s** on the Go server (ticket 347's chunk table), and
because `screenCandidates` is a single `await` that prices every candidate
before `rank.ts` emits its first row, that cost is *first-row latency* — the
table sits empty for minutes. This reproduced as a layout-gate failure
(`test-layout.mjs` run phase: 0 rows after 120 s, "Simming 1/325" throughout,
no console error).

`BulkWasmSimRunner` is **not deleted** — it stays constructible via
`makeSimRunner(true)`, so if this ticket's matched-accuracy measurement finds the
WASM tournament competitive, restoring the default is a one-argument change.

**Alternative considered and rejected: smaller chunks on WASM.** Shrinking
`MAX_CANDIDATES_PER_BULK_REQUEST` is always safe for culling (the bound only
needs to stay *under* the 32/33 flip), so only the constant's justification would
change. But each chunk pays up to 2 baseline probes regardless of size
(`stage.ts:279`, `maxBaselineSims = 2`). **Estimate, untested** (arithmetic from
the 332 s / 25-candidate arm, ~13 s per sim): a 5-candidate chunk still costs
about `5+2` sims ≈ 90 s to its first row — inside the 120 s gate only
marginally, while *raising* total screening cost by multiplying the per-chunk
baseline overhead across more chunks. Nobody has run this arm; it was rejected
on the arithmetic rather than measured. That trades this ticket's 1.6x slowdown
for a worse one to buy a partial latency fix, so it was not shipped. Worth
re-testing here once matched-accuracy numbers exist.

---

## Resolution (2026-09-03, batch-sim-followups Track B)

**Measured at matched accuracy on both transports. The 1.6x slower finding does
not survive: bulk screening is ~3.8x FASTER on WASM and ~3.4x faster on HTTP.**
Evidence under `.scratch/stage-gate/batch-sim-followups/evidence/`; method,
every deviation and the pre-registrations in `execution-ledger-b.md`.

### Matching method (M2)

Every arm pinned to `input.iterations = 8000` with the achieved count **verified
per sim**, against the original's 5,000-flat loop vs 7,091-adaptive bulk. The
pin is a floor, not a cap (`wasm/bulk_sim/stage.ts` — a request sets
`highStageIterations`, and an adaptive pass tops up when observed error misses
the 0.05% target), so achieved counts are recorded per chunk rather than
assumed.

**M1 fired on WASM.** Arm A's baseline cv was 0.0357 against the 0.0378 critical
value for n = 25 at 8,000, so two of ten chunks topped up to 8,490 and 8,617.
Per the pre-registered fallback the loop arm was re-run at `I_max = 8,617`
(`wasm-B-m1.json`), and the verdict is taken there.

### Cost at matched accuracy

**WASM** (arm A bulk vs arm B-m1 loop, 213 candidates, feral phase 3):

| | bulk | loop |
| --- | --- | --- |
| screening, worker-seconds | **3,351.8** | **12,813.7** |
| screening iterations | 2,100,782 | 2,059,463 |
| sims by phase | baseline 1, screening 4, replication+set-bonus 43 | baseline 1, screening 239, tail 35 |
| chunks / baseline probes | 10 / **1 per chunk, measured** | — |
| **first row** | **3,399.2 s** | **112.0 s** |
| end-to-end wall | 6,055 s | 5,551 s |

**HTTP** (same configuration): screening 115.1 s vs 394.3 s; first row 117.1 s
vs 2.7 s; `R_wall_s` = 0.297.

### Verdict

**`R_wall_s` = 0.262** on WASM (raw) — **BULK FASTER** against the fixed 0.9
bound. A pre-registered robustness check re-computed the ratio with arm A priced
as if *every* chunk had run the full 8,617 (the worst case against bulk):
**0.282**, same side of the bound, so the verdict does not depend on the
residual per-chunk mismatch.

**The standing "wash" finding on iterations HOLDS.** `R_iter_s` = 1.020 raw /
1.099 corrected, both inside 0.9–1.1. Bulk does not win by doing less work — it
does the same work, better parallelised. The original 1.6x slower figure was the
accuracy mismatch: the bulk arm was running 42% more iterations per candidate
than the loop it was compared against.

**Caveats carried:** one tournament run, tournament run-to-run variance
unmeasured (no same-route bulk repeat exists in this arm set). "Tournament" here
means the **single-stage High pass over 25-candidate chunks** — at n ≤ 25 no
pre-High stage runs at any iteration count, so no arm of this campaign exercised
a multi-stage tournament. The loop-variance figure `V` could not be measured on
WASM: the WASM null arm was dropped for budget, and substituting the HTTP null
yields a cross-transport figure that measures the ~35x transport gap, not
variance.

### The WASM default is NOT changed — owner decision

This ticket is the revisit trigger for `makeSimRunner(bulk = false)`. The
measurement does not settle it, because the two costs point opposite ways:

> Bulk is cheaper in total on WASM (R = 0.262) and still fails the 120 s
> first-row gate (first row at 3399.2 s)

Bulk is ~3.8x cheaper in total screening work, but its first row arrives at
**28.3x the 120 s layout-gate deadline**, because `screenCandidates` is a single
`await` that prices every candidate before `rank.ts` emits a row. The loop
streams its first row in 112 s. End-to-end the two are within **9%**, so the
total-cost win does not reach the user as a shorter wait — it buys machine time,
not responsiveness.

`BulkWasmSimRunner` remains constructible, so flipping the default stays a
one-argument change if the owner decides the trade is worth it.

### Acceptance

- [x] Both arms measured at matched accuracy, matching method stated (M2, with
      the M1 fallback exercised and documented).
- [x] Sim counts and total iterations quoted per arm alongside wall clock.
- [x] Baseline-probe count per chunk quoted and **measured** (1 per chunk,
      counted from rising edges of `presimRunning` on the progress stream) —
      10 probes across 10 chunks.
- [x] Verdict stated (**bulk faster at matched accuracy, on both transports**),
      and the standing wash finding on iterations **holds**.

**Status: open** — the cost question is answered, but the default-flip decision
this ticket triggers is the owner's and is recorded in
`.scratch/stage-gate/batch-sim-followups/decision-log.md`.

## Decision (owner, 2026-09-03)

Keep the per-candidate loop as the web/WASM default. `makeSimRunner(bulk =
false)` is unchanged.

At matched accuracy (8,000 iterations, 4 WASM workers, feral phase 3, 213
candidates), batch screening uses about 4x less CPU work than the loop
(3,352 vs 12,814 worker-seconds), but that saving never reaches the user as
time: the loop shows its first ranking row after 112 s, batch screening
after 3,399 s, and end-to-end the loop finishes the whole ranking sooner
(5,551 s vs 6,055 s). A route that is cheaper on the machine but slower to
the first row, and no faster overall, is not a win for this UI.

**Precondition for revisiting:** the batch path must render rows as each
chunk completes, instead of the current single `await` that prices every
candidate before `rank.ts` emits anything. Once that streaming exists, the
first-row number changes and this decision should be re-measured.

The local Go-server default (batch on) is unchanged — this decision is
about the WASM/web transport only, where the first-row cost is paid in the
browser.

Evidence: `.scratch/stage-gate/batch-sim-followups/evidence/wasm-A.json`,
`wasm-B.json`, `wasm-B-m1.json` (matched-accuracy WASM arms and the M1
fallback re-run); `execution-ledger-b.md` (method, deviations,
pre-registrations) in the same directory.
