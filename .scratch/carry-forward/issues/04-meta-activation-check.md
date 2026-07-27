Status: open
Type: task
Origin: docs/reviews/phase-0-close-gates.md
Blocks: phase-1

# Check meta activation before trusting baseline DPS

## Problem

`verify_fixture.py` R4 asks whether the meta is active but only resolves gem
IDs / colours. The Go sim does not enforce meta activation (PLAN.md §9).
Phase 0's 2042.85 DPS proves "logged gear sims," not "legal gemming."

## Progress (2026-07-27)

- `data/gems/meta-conditions.json` — all 18 conditions from wowsims
  `ui/core/proto_utils/gems.ts` @ pin `8aa378b3`.
- `packages/core/src/meta.ts` — colour counting + `metaStatus` / `metaDeficit`.
- `packages/core/src/meta-repair.ts` — min-EP-loss `repairMeta` with R4
  socket-bonus pricing in the cost function.
- `data/presets/ret/p2.ep-weights.json` — pinned P2 EP from wowsims presets.ts.
- Slamaltman Relentless is **active**; repair tests use a stripped-yellow
  variant and a constructed R4 bonus-forfeit case.

## Still open

- Wire recorded slamaltman fixture pack into the offline CLI (rankUpgrades
  baseline path works in tests; CLI still has empty recordings).
- Find or build a real inactive-meta character fixture (PLAN §16).
- Candidate pool / ranking loop beyond baseline.

## Done when

- Baseline path records meta active/inactive. ✅ (`baseline.metaAdjusted`)
- Inactive meta is repaired at minimum EP loss (PLAN §9), disclosed as a
  substitution — not silently simmed as-is for rankings users act on.
  _(repair ✅; disclosure drawer / Substitution[] still open)_
- A repair that would break a socket bonus picks the other move (§9 R4). ✅
