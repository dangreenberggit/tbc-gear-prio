# 403 — Bulk screening asks the Go finalist stage to rank 25 candidates; it burns 73% of the run on work we discard

Status: open
Type: task
Origin: `.scratch/carry-forward/issues/397-desktop-bulk-screen-not-a-speed-win.md` (investigation half, completed 2026-09-15)
Blocks: —
Blocked by: none

## What

Our upgrades tab sets `topResults: req.candidates.length` — the full 25-candidate
chunk — when building a `BulkSimRequest`
(`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/adapters/bulk_request_builder.ts:115`).
That value sizes the Go engine's **finalist refinement stage**, which then tries
to statistically separate every adjacent pair of 25 gear sets at 95% confidence.
It cannot, it exhausts its whole budget trying, and we throw the result away.

Measured on the 3419 s desktop full-pool run (397, all numbers cited there by
file and field):

- finalist stage = **72.9% of wall clock** (2494 s of 3420 s) across 29 chunks
- all **29 of 29** chunks exited at exactly **4.000×** their entry iterations —
  the hard budget ceiling (`entry + 3× extra`), so every chunk ended on budget
  exhaustion, never on convergence
- every chunk logged `Survivors: 25` of `Input gear sets: 25` — nothing eliminated
- screening on vs off, same binary, same 20 candidates: **264 s vs 13 s** (20.3×)
  for **byte-identical rows**, same 8 above-cutoff items in the same order

The client consumes one scalar per candidate — `const deltaDps = candObs.dps -
candBaselineDps` (`rank.ts:1071`). Everything the finalist stage computes beyond
that mean is discarded.

## Why it happens

`topResults` carries **two unrelated meanings** in the engine, and we set it for
one of them without knowing about the other.

1. It truncates the response — leaving it at the default 5 makes 20 of 25
   candidates silently vanish from the results (`bulk_sim.go:197`,
   `topBulkSimResults(latestResults, topResults)`). This is the reason our code
   overrides it, and it is the **only** reason our comment at
   `bulk_request_builder.ts:66-69` gives.
2. It also sizes the finalist set, and therefore that stage's cost. Nothing in
   our code acknowledges this.

The Go stage is correct for what it was designed for. `BulkSimDefaultTopResults
= 5` (`bulk_sim.go:12`); the only other caller in the tree passes 5
(`ui/core/sim.ts:563`). Its doc comment (`stage.go:241-248`) states a real
requirement — stop near-tied *displayed* results reordering between seeds.
Pairwise separation over 5 items is cheap and reachable. Over 25 near-tied gear
sets it is neither.

**Owner's judgment, 2026-09-15:** 25 candidates is out of the running. The stage
might eventually be worth something at top-2 or similar if we ever want it, but
for our use it is expensive and close to pointless — and it does not work
correctly at our size class in any case. Treat "make it converge at 25" as a
non-goal.

## Provenance — read this before planning a fix

**The Go code is upstream's and we have not modified it.** The finalist stage
(`sim/core/bulk/stage.go`), the ungated call (`bulk_sim.go:186`) and the pairwise
test (`statistics.go:130-142`) all arrived in one upstream commit `b7bf678cd`
("port over MOP finalisation stage changes", 2026-09-01, an upstream
contributor). `git diff upstream/master HEAD` is **empty** for all three files.
The call was never gated: `useLegacyBulkSim` predates the finalist stage by a
month and only ever gated stage-loop stages; no guard was added and none removed.

**The `topResults` line is ours**, in our fork — commit `ed88f07b5`
("Add a bulk screening pass behind an optional runner capability", 2026-09-01).

**Repo boundary that decides where the fix lands:** the file is in
`vendor/tbc-new-fork`, the wowsims fork clone. It is **not** tbc-gear-prio code —
`git ls-files | grep -c bulk_request_builder` in the core repo returns **0**. Any
fix here is a **fork** change and goes through the fork queue (single shared
working tree, strictly serial — never two agents at once).

**Reachability:** server/HTTP only. `sim/wasm/main.go` imports `sim/core/bulk`
but calls only `BulkCombinationCount` and `BulkCandidates`; the sim-execution
entry points `bulk.BulkSim`/`BulkSimAsync` are called only from `sim/web/bulk.go`
(the desktop binary). The WASM tab never pays this cost, which is why the desktop
path measured slower than the web path — the inverse of what the plan predicted.

## Two supporting defects found alongside

- **The stage's status line is misleading.** It logs `Target error: 0.00%`
  because `BulkSimFinalistStageConfig` (`stage.go:24`) sets only a stage name and
  a concurrency flag, leaving `TargetErrorPct` at Go's zero value — and that
  field never governs the loop anyway. The stage reuses
  `formatBulkSimStageSummary`, built for the accuracy stages, so it prints a
  field it does not consult while its real stopping test is never logged.
- **No test coverage.** `sim/core/bulk/` has two `_test.go` files; neither
  mentions "finalist" at any size. Nothing in CI could have caught the mismatch.

Both are upstream's. Neither needs fixing here; they explain why this went
unnoticed and they are candidates for an upstream report.

## Levers, in rising blast radius

1. **Client-side only, our fork's TypeScript.** Stop handing the full chunk to
   the finalist stage. The constraint is meaning (1) above: `topResults` cannot
   simply drop to 5 without losing 20 candidates from the response, so the work
   is separating the two meanings — not a one-line change. **Touches no Go**,
   so it avoids the 3419 s re-verify the plan's stage-gate routing was written
   around.
2. Skip the finalist stage when the caller reads only `dps`. Likely a Go change.
3. Gate the finalist call the way the culling stages are gated. Go change,
   diverges from upstream, and would need carrying across future syncs.

Lever 1 is the one the owner's judgment points at. Levers 2 and 3 modify upstream
code we currently match byte-for-byte; weigh the sync cost before proposing them.

## Done when

The desktop screening path no longer spends its budget on finalist refinement we
discard, **and** the fix is shown not to change the ranking — the cap-20 pair is
the natural check, since screening on vs off already produces byte-identical rows
(`smoke-3333-cap20.json` vs `smoke-3333-cap20-fallback.json`).

Do **not** re-run the 3419 s full pool to validate this. A capped run is enough.

## Evidence

Everything is in 397's "Investigation, 2026-09-15" section, committed at
`1234bdd8`, with the handoff at
`.scratch/handoffs/397-finalist-stage-cost-HANDOFF.md`.

**Caveat on reproducing it:** the per-stage attribution came from
`.scratch/stage-gate/desktop-transport-gate/server-3333.log.err`, the packaged
server's stderr. That file is **untracked** (the stage `.gitignore` excludes
`*.log.err`) and there is **no command that regenerates it** — it is a one-time
capture from a 57-minute run. The committed readback JSONs corroborate the
top-line figures (`elapsedS`, `bulkSimAsync` 29, the 264 s/13 s smoke pair and
their identical rows) but not the per-stage split.
