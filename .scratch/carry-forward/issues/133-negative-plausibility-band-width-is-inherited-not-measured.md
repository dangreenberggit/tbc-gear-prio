Status: open
Type: gap
Origin: pre-merge review of `feat/set-bonus-value`, round 3, 2026-08-12 (domain axis, 3-D1)
Blocks: none
Blocked by: none

# The negative plausibility band reuses a width calibrated from two positive figures

Ticket 120 added the negative side of the set-bonus magnitude gate, and it works
— but its width was inherited, not measured, and the ticket's closing note says
otherwise.

`IMPLAUSIBLE_BONUS_FRACTION`'s own docstring (`packages/core/src/plausibility.ts:28-41`)
calibrates 7.5% from two **positive** measurements: Thunderheart 4pc at 9.0% must
fire, Malorne 2pc at 5.9% must not, and 7.5% "sits roughly midway between
those two… the most separation the two anchors allow."

`plausibility.ts:100-110` then applies that same width to negatives. Ticket 120's
closing note describes this as "calibrated the same way ticket 98's positive band
was", which is not what happened — no negative bonus has been measured on either
side of the band, so there is no anchor telling us where the boundary belongs in
that direction.

Consequence: an unknown false-negative rate in exactly the direction the gate was
added for. On a 2150 DPS baseline, a distortion between roughly −7.5% and −160
DPS passes silently, and the figure is then presented as a measured bonus. The
acceptance test pins only the extremes (−262 fires, −9.92 does not), which the
positive band's width would already have separated — so the test does not
constrain the choice of 7.5% for negatives at all.

Risk of a wrong ranking is low, because the gate warns rather than scores. This
is filed as an honest-uncertainty gap, not a defect.

## Fix, in increasing cost

1. Cheapest and sufficient for now: change the docstring and ticket 120's note to
   say the negative width is inherited from the positive anchors and is untested,
   per the repo's durable-claims rule.
2. Better: measure one negative case deliberately and anchor the negative side,
   the way ticket 99 anchored the positive one.

Note this interacts with ticket 127 — the confound that produces large negative
figures at threshold−1 worn is the same mechanism ticket 120's wording blames,
so anchoring the band and fixing the disclosure want doing together.

## Acceptance

- [ ] The docstring and ticket 120 no longer claim the negative width was
      calibrated the same way as the positive one.
- [ ] Either a measured negative anchor exists, or the inherited width is
      explicitly labelled untested.
