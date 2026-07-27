Status: closed
Type: task
Origin: docs/reviews/phase-0-close-gates.md
Blocks: phase-1
Closed: 2026-07-26

# specID is unusable on TBC Anniversary WCL

## Problem

`docs/phase0-findings.md` §4 and PLAN.md §14 treat `CombatantInfo.specID` as a
classification signal. In `test/fixtures/slamaltman.raw.json`, **every**
combatant has `specID: 0`, including Slamaltman (talent plurality `5/11/45`
→ Ret). Phase 1 that trusts `specID` (or treats `0` as Holy) mis-specs
everyone.

## Done when

- PLAN.md / phase0-findings updated: talent-tree plurality (and any future
  verified signal) is the classifier; `specID: 0` is documented as noise on
  this game version unless a re-probe shows otherwise.
- Normalize/resolve stage does not branch on `specID` alone.

## Resolution

`classifySpec` in `packages/core/src/spec.ts` classifies from
`talentPointsByTree` plurality only (Paladin-only for now; other classes
return `unsupported-class` until a fixture verifies their tree order).
`talentPointsFromWclTalents` converts WCL's raw `talents[].id` shape.
`specID` is never read. PLAN.md §5.2/§8.2/§14 and
`docs/phase0-findings.md` §4 updated to document `specID: 0` as noise on
Anniversary. Verified against slamaltman's fixture (`5/11/45` → ret,
treeIndex 2) in `packages/core/test/spec.test.ts`.
