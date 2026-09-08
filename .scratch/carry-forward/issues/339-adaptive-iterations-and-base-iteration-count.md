Status: closed
Type: task
Origin: docs/fork-tab-native-bulk-sim-finding.md (investigation 2026-08-31)
Blocks: none
Blocked by: none

# Adaptive iterations + raise the base iteration count

Group: `.scratch/upgrades-tab-sim-followups/README.md`

## What

Our upgrades-tab sim fan-out runs a **flat, fixed** iteration count (default
3000) for every candidate, regardless of how noisy each result turns out
(`upgrades/engine/rank.ts`, `wasm_sim_runner.ts`). wowsims' bulk sim does better:
it **raises iterations only where the number is still too noisy to trust**,
auto-targeting an error percentage per candidate
(`vendor/tbc-new-fork/sim/core/bulk/stage.go:208-214,243-267`;
`ui/core/wasm/bulk_sim/stage.ts`, `statistics.ts`). This is NOT tied to their
culling tournament — it applies directly to our flat pass.

Do two things together (owner grouped them): (1) adopt an adaptive-iteration
approach so effort is spent where results are noisy, and (2) raise our base
iteration count for accuracy. Together because the adaptive mechanism is what
makes a higher base count affordable — you spend the extra iterations only where
they change the answer.

## Why together / why separate ticket

The owner's standing question is "more iterations for more accuracy — is it too
expensive?" Adaptive iterations is the mechanism that answers it: it buys
accuracy without paying the cost on already-clear rows. This needs real focus and
measurement (accuracy gained vs wall-clock cost), which is why it is its own
task, not folded into anything else.

## Approach (investigate first, then implement)

- Read wowsims' target-error logic (`statistics.ts` / `stage.go`) and decide
  whether to port the mechanism or borrow the idea.
- Measure: on our committed fixtures, current flat-3000 accuracy + time vs an
  adaptive scheme at a target error, and a raised base count. State the
  accuracy-vs-cost trade with numbers before committing.
- Constraint: fork code only — our `upgrades/` subtree + adapters; no shared
  wowsims edits (calling their exported helpers is fine).

## Acceptance

- [x] A measured accuracy-vs-cost comparison (flat vs adaptive vs raised-base).
- [x] A decision recorded, with numbers, on target error + base count.
- [x] Implemented in our fan-out if the trade is favorable; if not, the "why not"
      is written down.

## Resolution

(a) Adaptive iterations — **measured no gain, not adopted.** At matched
accuracy, wowsims' adaptive pass costs 0.98x/1.00x/0.99x a flat pass across
three universes (`.scratch/stage-gate/340-tournament-route/HANDOFF.md`
§Cost, corrected finding). On slot-9 (19 candidates, feral-p2) the adaptive
arm spent 5,633 iterations/candidate to reach 0.0439% error, and a flat pass
needs ~5,597 iterations/candidate for the same accuracy — a 1.01x wash
(`.scratch/stage-gate/batch-sim-web-local/research-local.md` §Q5). The
originally reported 2.4x-10x saving was an artifact of comparing the
adaptive rule against an unmatched flat-3000 baseline. `getBulkSimTargetIterations`
is wowsims' function (`statistics.go` / `statistics.ts`) and is not called by
our code.

(b) Raise the base iteration count — **done.** `DEFAULT_ITERATIONS` raised
3000→5000 as an owner decision, independent of (a)'s wash finding; fork
commit `164fce593` carries the why-comment
(`.scratch/stage-gate/batch-sim-web-local/decision-log.md`, fix-round entry).
