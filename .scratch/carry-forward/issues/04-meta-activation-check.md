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
- `packages/core/src/meta.ts` — colour counting (`gemMatchesSocket` rules) +
  `metaStatus` / `isMetaConditionMet`.
- Slamaltman fixture: Relentless (32409) is **active** (9R/2Y/3B). So this
  character is not the inactive-meta repair fixture PLAN.md §16 still wants.

## Still open

- Min-EP-loss repair solver (PLAN §9) when inactive — including R4 socket-bonus
  pricing via `Stat` / `statAt` (now exported).
- Wire into normalize / baseline path; set `baseline.metaAdjusted`.
- Find or build an inactive-meta fixture for the repair tests.

## Done when

- Baseline path records meta active/inactive.
- Inactive meta is repaired at minimum EP loss (PLAN §9), disclosed as a
  substitution — not silently simmed as-is for rankings users act on.
- A repair that would break a socket bonus picks the other move (§9 R4).
