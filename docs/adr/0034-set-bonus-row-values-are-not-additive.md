# ADR-0034 — Set-bonus row values are not additive

**Status:** accepted
**Date:** 2026-09-24
**Related:** tickets `.scratch/carry-forward/issues/467-set-bonus-ranking-hides-net-value.md` (the net-credit design), `478-net-set-bonus-minor-followups.md` (item D2, closed by this ADR); fork `view.ts` `rankableSetPotential`; fixture 476-A in `packages/core/test/fork-set-net.test.ts`

## Context

With "Set potential" on, the Upgrades tab adds a set-bonus credit to each set
piece's row. Ticket 467 made that credit a net figure: the corrected future set
bonuses the piece's set would gain, minus the worn bonuses reaching them
would break. The owner chose 'full' credit as the default and a 'split' view
as the alternative. Since ticket 475 (fork `2db3e0e3c`) the tab shows only the
full view: `upgrades_tab.tsx` fixes `SET_CREDIT = 'full'` and has no control
for split. The split figure is still computed by the engine and kept as data
for later; nothing a user sees reads it.

A reader looking at a shortlist of set pieces can add up the row figures and
take the sum as the value of the set. Ticket 478 item D2 asked for the rule to
be written down.

## Decision

Neither credit view's row figures sum to the package's net value, and no view
is defined as the one to add up. A reader who wants a package total reads
`commitPackageDeltaDps` in the row's tooltip.

What each view does, as fixture 476-A measures it (worn Malorne 4; four
Thunderheart candidates, each own delta 30; package net 90, which is the 2pc
net 50 plus the 4pc net 80 minus the broken Malorne 2pc value 40):

- **'full'** (`rankableSetPotential(row, floor, "full")`): every contributing
  row carries the whole package net. Each of the four rows shows `90`. The four
  rows sum to `360`.
- **'split'** (engine only, not shown in the tab): each future bonus is divided
  by its piece count, but each break is subtracted whole on every row. Each
  row gives `50/2 + 80/4 − 40 = 5`. The four rows sum to `20`.

The package net is `90` in both cases, and neither `360` nor `20` equals it.
Fixture 476-A asserts both sums, so a change to either view's arithmetic shows
up as a test failure.

**Which breaks a row pays, and where it stops (ticket 490, 2026-09-24).** The
credit is the best stopping point along the set's thresholds, chosen on full
values. Each future bonus is worth its value minus the breaks its own path
needs: the candidate plus the best remaining pieces of that threshold's
package (the whole package when the candidate is in it). A break two futures
share is charged once. The top package's breaks (`commitBreaks`) are not
charged; they stay in the data as disclosure and as measurement targets. The
credit keeps the running total's largest value, or 0 when no total is
positive. The split figure follows the same stopping point and may be
negative there. In 476-A every row's path to the 4pc breaks the Malorne 2pc
(40), and the running totals are 50 then 90, so the figures above stand.
Fixtures 490-A and 490-B pin the rule (`view.ts` `setPotentialCredit`). This
"best-stop" rule is provisional until the owner chooses between it and
"full-path" (charge every break on the path to every credited future); the
choice is one constant, `RULE_490`.

## Consequences

1. The sort key under 'full' ranks each piece by the whole set's value. That is
   the owner's choice in 467: a row answers "what does committing to this set
   with this piece bring", not "what is this piece's share".
2. Adding up rows is not a supported reading. The tab states no total across
   rows, and this ADR is the reference if one is ever proposed.
3. Making 'split' additive would mean dividing breaks by a piece count too.
   That is a change to the 467 design and needs its own decision, and it
   matters only if the split view is shown again.
