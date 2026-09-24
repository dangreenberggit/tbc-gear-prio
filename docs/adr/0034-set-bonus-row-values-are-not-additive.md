# ADR-0034 — Set-bonus row values are not additive

**Status:** accepted
**Date:** 2026-09-24
**Related:** tickets `.scratch/carry-forward/issues/467-set-bonus-ranking-hides-net-value.md` (the net-credit design), `478-net-set-bonus-minor-followups.md` (item D2, closed by this ADR); fork `view.ts` `rankableSetPotential`; fixture 476-A in `packages/core/test/fork-set-net.test.ts`

## Context

With "Set potential" on, the Upgrades tab adds a set-bonus credit to each set
piece's row. Ticket 467 made that credit a net figure: the corrected future set
bonuses the piece's set would gain, minus the worn bonuses completing the set
would break (`commitBreaks`). The owner chose 'full' credit as the default and
a 'split' view as the alternative.

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
- **'split'**: each future bonus is divided by its piece count, but each commit
  break is subtracted whole on every row. Each row shows `50/2 + 80/4 − 40 = 5`.
  The four rows sum to `20`.

The package net is `90` in both cases, and neither `360` nor `20` equals it.
Fixture 476-A asserts both sums, so a change to either view's arithmetic shows
up as a test failure.

## Consequences

1. The sort key under 'full' ranks each piece by the whole set's value. That is
   the owner's choice in 467: a row answers "what does committing to this set
   with this piece bring", not "what is this piece's share".
2. Adding up rows is not a supported reading. The tab states no total across
   rows, and this ADR is the reference if one is ever proposed.
3. Making 'split' additive would mean dividing commit breaks by a piece count
   too. That is a change to the 467 design and needs its own decision.
