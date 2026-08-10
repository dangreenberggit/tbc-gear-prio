Status: closed
Type: task
Origin: docs/reviews/phase-2-trust.md (domain axis)
Blocks: phase-3
Blocked by: none
Resolution: `rank-report.ts` now wraps `gapAfter` in `Math.round`, matching
  `hitCapBanner`'s convention. Red/green test added. 2026-08-09.

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


## What was done (2026-08-09)

`Math.round` applied at the interpolation site in `rank-report.ts`, matching
`hitCapBanner` (`disclosure.ts:90-91`), which is the convention the ticket
cites. Rounded at render, not in `hitRegression` -- the model keeps full
precision, only the display is rounded.

Test added (`rank-report.test.ts`, "rounds a fractional hit gap like the banner
does"), using the real observed value `64.92309699999998` from
`nexess-p3-all.html:658` rather than another whole-number fixture. Confirmed
red before the fix (`widens your gap to 65` absent) and green after.

The byte-identical digest test in the same file did not need repinning: its
fixture's `gapAfter` is an integer, so no rendered byte moved.
