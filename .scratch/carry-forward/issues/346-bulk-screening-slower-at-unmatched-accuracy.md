Status: open
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
