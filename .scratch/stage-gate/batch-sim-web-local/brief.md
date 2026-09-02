# Brief — upgrades-tab batch sim: adopt wowsims' bulk path, web and local

Stage opened 2026-09-01 on branch `feat/upgrades-tab-batch-sim`, base
`d5d48a07ac3dc861d2134f2a9140bcbe383e0e2d`. Parent handoff:
`.scratch/stage-gate/340-tournament-route/HANDOFF.md` — **read it first; every
claim there carries a citation and three of its predecessors' claims were
wrong, so re-run citations rather than trusting prose.**

## Goal

Decide and plan how the upgrades tab's batch simming should use wowsims'
native bulk-sim machinery instead of (or alongside) our hand-rolled
per-candidate loop — **separately for the web deployment and the local
(downloadable Go server) deployment** — then reconcile the two plans into one
coherent design. The deliverable of the planning phase is two reviewed plans
plus a reconciliation verdict; execution follows web first, then local.

## Owner's standing decisions (fixed constraints, not open)

1. Iteration default moves to **5,000**; shape = cheap screening pass, then
   accurate final pass.
2. **Do not edit wowsims' own code** (`vendor/tbc-new-fork`, read-only).
   Calling exported functions is fine; changing their files is out of scope
   and must be flagged, not done.
3. **Prefer their new batch system over the legacy path**; legacy needs
   written justification.
4. **Use their code rather than reinventing** where output matches what we
   want (cost is a wash at matched accuracy — measured, see handoff).
5. Web: **use whatever exists on web now**, and leave a code comment plus a
   note to switch to the WASM batch sim when implemented upstream.

## Open questions (each needs: candidate approach, pre-registered win
condition, and a measurement — or the reason committed fixtures cannot
measure it)

- **Q1 (local): per-slot batch simming.** Run their batch sim once per
  equipment slot (13 small runs, each under the 20-candidate cull
  threshold). Does it give correct per-slot answers, what does it cost vs
  one flat pass, and does it avoid touching wowsims' code?
  (`MinSurvivors` has no proto knob — verified.)
- **Q2 (web): architecture.** WASM worker stubs `bulkSimAsync`; the HTTP
  worker routes to the Go server. What can our tab code reach without
  modifying their files? Is "use their batch sim results, then our own logic
  in the browser" viable?
- **Q3 (web): does the live public site serve a backend?** Observe with a
  browser: run a small bulk sim on the live wowsims TBC site and watch the
  network panel. Settles whether web bulk sim works in practice today.
- **Q4 (web): worker-count contradiction.** `sim.ts:164` constructs
  `WorkerPool(1)`; an agent reported a hardcoded 4-worker pool. Settle what
  the tab actually gets, whether the user can change it, and what that means
  for parallel candidates.
- **Q5 (both): adaptive iterations.** Verify `getBulkSimTargetIterations`
  (or equivalent) is genuinely exported/importable from tab code, then
  **measure** its cost at a 0.2% target vs flat 3,000/5,000 — the claimed
  2.4x–10x saving is the most valuable unverified claim on the table.
- **Q6 (local, do not drop): concurrency.** Re-verify that native bulk
  concurrency (`runtime.NumCPU()` at `$F/sim/core/bulk/stage.go:69,71`) is
  not user-configurable, by the comparison rule: name where a flag/env/UI
  *could* live and show each is absent.

## What done means (planning phase)

- `research-web.md` and `research-local.md`: every Q above answered with
  file:line citations or harness measurements; negative claims measured
  against the alternatives, not asserted.
- `plan-web.md` and `plan-local.md` per the stage-gate template, each
  reviewed (`plan-web-review.md`, `plan-local-review.md`).
- `reconciliation.md`: one reviewer across both plans — do they contradict
  each other, double-build anything, or leave a seam mismatched?
- Tree clean throughout; all artifacts in this directory.

## What done means (execution phase)

Tab batch simming uses the native bulk path per the reconciled plans, web
first then local, `pnpm verify` green, deviations ledgered. Pre-merge review
runs after; merge waits for an explicit ask.

## Measurement notes

- Harness at `.scratch/stage-gate/340-tournament-route/harness/` builds and
  runs; needs `-tags with_db`; Go module `replace` is four levels up.
  Prefer re-measuring to re-reasoning.
- Wall-clock numbers are machine-bound (20-core box); report iterations and
  ratios, not seconds.
- Before reporting any difference, state what was held constant — the
  predecessor session's three wrong calls were all mismatched comparisons.
