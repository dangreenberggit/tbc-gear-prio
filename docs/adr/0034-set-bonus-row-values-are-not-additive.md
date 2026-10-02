# ADR-0034 — Set-bonus row values are not additive

**Status:** accepted; superseded in part by [`ADR-0035`](0035-set-rows-valued-by-simmed-gear.md) on 2026-10-02: for a step ranking (the tab, with `measureBrokenSetValue` on), the walk (R1) and the rule for when a row equals the measured swap
**Date:** 2026-09-24
**Related:** tickets `.scratch/carry-forward/issues/467-set-bonus-ranking-hides-net-value.md` (the net-credit design), `478-net-set-bonus-minor-followups.md` (item D2, closed by this ADR), `502-scenario-d-tier4-outranks-new-tier-staff.md` (the other pieces' own stats); fork `view.ts` `rankableSetPotential`; fixture 476-A in `packages/core/test/fork-set-net.test.ts`

## Context

With "Set potential" on, the Upgrades tab adds a set-bonus credit to each set
piece's row. Ticket 467 made that credit a net figure: the corrected future set
bonuses the piece's set would gain, minus the worn bonuses reaching them
would break. Since ticket 502 (2026-09-27) the credit also counts the own
stats of the other set pieces the counted bonuses need; see the ticket 502
paragraph under Decision. The owner chose 'full' credit as the default and a
'split' view as the alternative. Since ticket 475 (fork `2db3e0e3c`) the tab shows only the
full view: `upgrades_tab.tsx` fixes `SET_CREDIT = 'full'` and has no control
for split. The split figure is still computed by the engine and kept as data
for later; nothing a user sees reads it.

A reader looking at a shortlist of set pieces can add up the row figures and
take the sum as the value of the set. Ticket 478 item D2 asked for the rule to
be written down.

## Decision

Neither credit view's row figures sum to the package's net value, and no view
is defined as the one to add up. No field states the package net as a total.
The row's tooltip shows `commitPackageDeltaDps`, but that is the top
package's gross DPS change against the baseline: it includes each piece's
own stats and every bonus the package breaks. In 476-A it is `420`, not the
net `90`.

What each view does, as fixture 476-A measures it (worn Malorne 4; four
Thunderheart candidates, each own delta 30; package net 90, which is the 2pc
net 50 plus the 4pc net 80 minus the broken Malorne 2pc value 40):

- **'full'** (`rankableSetPotential(row, floor, "full")`): every contributing
  row carries the whole package credit. Since ticket 502 that credit also
  counts the other three pieces' own stats (100 each), so each of the four
  rows shows `390`, and its ON figure `30 + 390 = 420` equals the package's
  measured delta. The four rows sum to `1560`. Before ticket 502 each row
  showed `90`, and the four summed to `360`.
- **'split'** (engine only, not shown in the tab): each future bonus is divided
  by its piece count, but each break is subtracted whole on every row. Each
  row gives `50/2 + 80/4 − 40 = 5`. The four rows sum to `20`.

The package net is `90` in both cases, and neither `1560` nor `20` equals it.
Fixture 476-A asserts both sums, so a change to either view's arithmetic
fails that fixture. The suite is fork-gated: CI skips it because the fork
clone under `vendor/` is gitignored, so it fails only when run locally with
the fork present:
`npx vitest run packages/core/test/fork-set-net.test.ts packages/core/test/wowsims-fork-parity.test.ts; echo rc=$?`.
The hand derivations of its literals are in
`docs/set-bonus-fixture-derivations.md`.

**Which breaks a row pays, and where it stops (ticket 490, 2026-09-24).** The
credit is the best stopping point along the set's thresholds, chosen on full
values. Each future bonus is worth its value minus the breaks its own path
needs: the candidate plus the best remaining pieces of that threshold's
package (the whole package when the candidate is in it). A break two futures
share is charged once. The top package's breaks (`commitBreaks`) are not
charged; they stay in the data as disclosure and as measurement targets. One
exception: a commit break whose value was not measured still sets the whole
credit to 0 (ticket 477, `setCreditUnmeasured`), and the tab marks the row
as not counted. The credit keeps the running total's largest value, or 0 when no total is
positive. The split figure follows the same stopping point and may be
negative there. Before ticket 502, in 476-A every row's path to the 4pc
broke the Malorne 2pc (40), and the running totals were 50 then 90, which
gave the pre-502 figure of 90 above. The figures in this paragraph are from
before ticket 502; the ticket 502 paragraph below changes what each step adds.
Fixtures 490-A and 490-B pin the rule (`view.ts` `setPotentialCredit`). The
owner confirmed this "best-stop" rule on 2026-09-24 over "full-path" (charge
every break on the path to every credited future). `setPotentialCredit` implements
both rules; the exported `RULE_490` in `view.ts` selects the one
`rankableSetPotential` uses. Fixture 490-B reads that constant from the
engine and also asserts each rule's figures by calling `setPotentialCredit`
directly. Since ticket 502 both rules stop at the 4pc in 490-B, so that
fixture no longer tells them apart; test 502-B does.

**The other set pieces' own stats count (ticket 502, 2026-09-27).** With Set
potential on, a set-piece row the player does not wear now shows
`deltaDps + credit`, where the credit follows rule R1. This replaces the
owner's 2026-09-20 rule, "item plus set bonuses only. the total should also
only be total set bonuses, perhaps minus broken set bonues, plus the item in
question net dps gain. NOT OTHER ITEMS" (as quoted in
`.scratch/stage-gate/501-502-467-lineup/owner-answers-2.md`). The owner's new
direction, verbatim from that file: "This sounds like there needs to be a
way to include measure of the other set items own stats. That's ok but it's
work that needs to be logical and consistent. It can be included (amount
gained or lost on net) in the ranking with the set bonus toggle on". The
owner approved the rule and its order in
`.scratch/stage-gate/501-502-467-lineup/owner-answers-3.md`: "Agreed on 502
rule and it's order". The owner approved the renders in
`.scratch/stage-gate/502-other-pieces-rule/owner-answers-renders.md`
(logged in that folder's `decision-log.md`): "It looks good except for the
cover issue." The cover point became its own ticket.

- **Which pieces.** The engine picks a package per set and threshold with
  `selectPackage` (the best piece per slot, then the best k by single-swap
  figure), then builds each row's path with `pathToThreshold`: the whole
  package when the row is in it, otherwise the row plus the best other
  package pieces outside the row's slot. A row outside the package is
  substituted into it. Fork `rank.ts` `applySetContext` attaches these
  path pieces to each future as `pieces`, emitted (even when empty)
  whenever it builds a path for that future.
- **Own stats of a piece p.** `own(p)` is p's single delta, read before
  paired replication, plus the measured value of each worn bonus p breaks on
  its own, minus the 2pc of its set that p completes on its own (only when
  the player wears one piece; valued by the 4pc `selfConfound`).
- **The walk (R1).** The steps are the row's future bonuses in threshold
  order. Each step adds its floored bonus, plus `own(p)` of each path piece
  no earlier step counted, minus each path break no earlier step charged.
  Path breaks are charged at their measured value, with no floor. A step can
  be the stop only if its floored bonus is above 0. The credit is the
  largest running total at such a step, or 0. Fork `view.ts`
  `setPotentialTerms` does this walk and returns the itemised terms, which
  the tab's popover lists as bonus, "{item name} stats" and "Breaks" lines.

  > **Superseded 2026-10-02 by [`ADR-0035`](0035-set-rows-valued-by-simmed-gear.md) for a step ranking.**
  > A step ranking does not walk single-swap, own-stats or bonus terms. Its
  > credit is the best running value of one sim of the row's item plus a
  > chosen partner set, minus the row's own single swap.

- **When the row equals the measured swap.** For a row inside a measured
  package, `deltaDps + credit` equals that package's measured delta when
  three conditions hold: every bonus on its path is above the floor; path
  breaks are charged at their measured values; and paired replication
  rewrote none of the deltas involved. Test 502-A and
  `packages/core/test/fork-set-fixtures.test.ts` check this.

  > **Superseded 2026-10-02 by [`ADR-0035`](0035-set-rows-valued-by-simmed-gear.md) for a step ranking.**
  > On a step ranking, a credited row that paired replication did not
  > rewrite equals the sim of its own stop gear, with none of the three
  > conditions above.

- **Estimates.** Every other set row shows an estimate built from
  single-item figures. It assumes the pieces' gains add up (hypothesis,
  untested).
- **`full-path`.** It counts every step whose floored bonus is above 0,
  with pieces and breaks each counted once, and the credit is the running
  total after the last counted step, which may be negative.
- **`split`.** It keeps its formula (bonus ÷ threshold, minus floored
  breaks, no pieces), but it is now taken at R1's full stop, so split values
  move where the stop moves. The tab does not show split
  (`SET_CREDIT = 'full'`).
- **A future without a path.** When the engine builds no path for a future,
  it has no `pieces` field and keeps its credit from before ticket 502.
- **Remaining gap, until ticket 512.** Worn bonuses the engine does not
  model (outside `IMPLEMENTED_IN_SIM`, or at 3pc) are never added back. Rows
  inside a measured package still equal the measured swap, but an
  off-package estimate or a stop choice can charge such a loss more than
  once (hypothesis, untested).
- **Paired replication.** `replicateTopItems` rewrites the top rows'
  `deltaDps` after the set figures are built, so a replicated row differs
  from the measured swap by its own refinement (0.0146 on the Thunderheart
  Chestguard in fixture `feral-p3-th-hands-legs`). Pieces' own stats are
  read before replication for this reason.

## Consequences

1. The sort key under 'full' ranks each piece by the whole set's value. That is
   the owner's choice in 467: a row answers "what does committing to this set
   with this piece bring", not "what is this piece's share".
2. Adding up rows is not a supported reading. The tab states no total across
   rows, and this ADR is the reference if one is ever proposed.
3. Making 'split' additive would mean dividing breaks by a piece count too.
   That is a change to the 467 design and needs its own decision, and it
   matters only if the split view is shown again.
