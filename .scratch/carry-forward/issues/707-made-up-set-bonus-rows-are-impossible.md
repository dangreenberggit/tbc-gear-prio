Status: closed
Type: task
Origin: docs/reviews/feat-tab-checks-without-sims.md (D1, D2, D3)
Serves: .scratch/plans/upgrades-tab-finish-line.md
Blocks: none
Blocked by: none

# The made-up tab fixtures show set-bonus rows that cannot happen

## What a reader of the fixtures sees

The layout harness renders the made-up fixtures in `data/tab-fixtures/mock-*.json`.
Their set-bonus lines describe swaps that cannot happen in the game, and they
leave out the set-bonus popover that real runs always show:

1. **Breaks from the wrong slot (D1).** A row "breaks" a worn set bonus even
   when its slot holds no piece of that set. For example, in
   `mock-set-bonus` the Wastewalker Gloves (hands) and Wastewalker Leggings
   (legs) rows break Malorne 2pc, but the gear wears Malorne on shoulder and
   chest only. In `mock-dropped-list` a chest row breaks Crystalforge 2pc while
   one Crystalforge piece is worn. The domain reviewer counted 6 of 8 break
   rows across the mocks like this, and 0 of 292 in the six real recordings
   under `packages/core/test/fixtures/tab-recordings/` (hypothesis, untested
   by the review's author: the reviewer's script was not committed).
2. **Wrong piece count on the crossing row (D2).** The `mock-set-bonus`
   crossing row (Wastewalker Tunic, chest) has `piecesWornBefore: 1`, but the
   gear wears no Wastewalker piece. The popover shows that number as "have".
3. **Missing popover variant (D3).** Every set row in the real recordings has
   `stepRanking: true`, and 8 to 13 rows per file carry `futureBonuses`. No
   mock row has either, so layout check 17 (hover the first set-bonus figure)
   never opens that popover variant. Whether that variant can be wider or
   placed differently is hypothesis, untested.

## Where

`packages/core/test/tab-fixtures/make-mock-fixtures.ts`, the set-row roles
(about lines 580-620 at eb9547d3): candidates are picked without checking that
their slot holds a worn piece of the broken set, the threshold is
`worn.count >= 4 ? 4 : 2` whatever is active, and the crossing row hard-codes
`piecesWornBefore: 1`.

## Done means

- A break row's slot holds a worn piece of the set it breaks, and the broken
  threshold is one that is active on the worn gear.
- The crossing row's `piecesWornBefore` matches the worn gear.
- At least one mock set row has `stepRanking: true` and `futureBonuses`, and
  check 17 hovers it at least once.
- `pnpm tab-fixtures:mock` regenerates the fixtures, `pnpm verify` passes, and
  the layout gate is re-run because the fixtures change its digest.

## Closing note

Fixed in `tbc-gear-prio@7572a254`. The generator reads each set's bonus
counts from the fork's Go set definitions (`sim/**/*.go`, `NewItemSet`) and
builds every set row from the copied gear: a break row's slot holds a worn
piece of the set it breaks, the broken count is that set's worn count and one
at which the set has a bonus, and the piece counts are the gear's. Every set
row has `stepRanking: true`, and rows that more pieces of their set would take
to a bonus list it in `futureBonuses`. `mock-set-bonus` moved to the warrior
page (`warrior/dps` `p1_arms`), because no feral preset wears a set one piece
short of a bonus, which a crossing row needs; `mock-many-rows` moved to feral.
Its crossing row is Ragesteel Breastplate (Burning Rage 1 to 2 pieces, which
also breaks Warbringer 2pc). The generator now fails when a set row breaks a
bonus from the wrong slot, breaks an inactive bonus, or has piece counts that
differ from the gear, and when the first set row of `mock-set-bonus` has no
`futureBonuses`.

Verified by: `pnpm tab-fixtures:check` (rc 0, six files match the generator)
at `tbc-gear-prio@7572a254`, and the layout gate run that advanced
`data/wowsims-fork-layout.lock.json` to `a2caeb33c72f…`: check 17 passed on
all six fixtures at all four widths (`pnpm layout-gate:check`, "layout gate:
PASSED"). On every fixture the first set row, which check 17 hovers, has
`futureBonuses`.
