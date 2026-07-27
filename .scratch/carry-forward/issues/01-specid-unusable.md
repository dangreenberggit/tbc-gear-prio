Status: open
Type: task
Origin: docs/reviews/phase-0-close-gates.md
Blocks: phase-1

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
