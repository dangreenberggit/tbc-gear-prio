Status: open
Type: bug
Origin: docs/reviews/phase-1-five-seed-spread.md
Blocks: phase-1
Blocked by: none

# RankedItem.se is sim stdev, labeled as independent SE

## Problem

`packages/core/src/rank.ts` assigns `se: best.stdev` while
`seMethod: "independent"`. Distribution stdev (~90–120 DPS) is not
independent SE of the mean (~stdev/sqrt(iterations)). Consumers treating
`se` as ΔDPS uncertainty get massively inflated intervals relative to the
five-seed spread cutoff basis.

## Done when

- `se` is either true independent SE, or the field/method labels match what
  is stored (no `"independent"` on raw stdev).
- Report/CLI consumers updated if the numeric scale changes.
