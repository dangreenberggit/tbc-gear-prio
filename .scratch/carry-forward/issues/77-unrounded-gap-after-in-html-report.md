Status: open
Type: task
Origin: docs/reviews/phase-2-trust.md (domain axis)
Blocks: phase-3
Blocked by: none

# `hitRegression.gapAfter` renders unrounded in the HTML report

`rank-report.ts` (around line 165) interpolates `gapAfter` raw. Because the
cap is `9 * 15.769233 = 141.923097`, the value is essentially never integral.
Real output in `nexess-p3-all.html:658`: `widens your gap to
64.92309699999998`. `hitCapBanner` rounds correctly (`Math.round`) — this is
inconsistent with the module's own convention elsewhere. Tests use
whole-number fixtures (`caps.test.ts:340` gapAfter 87,
`rank-report.test.ts:330`), which is why it was never caught.

Cosmetic (displays false precision), but cheap to fix: round `gapAfter` the
same way `hitCapBanner` does before interpolating it into the report row.
