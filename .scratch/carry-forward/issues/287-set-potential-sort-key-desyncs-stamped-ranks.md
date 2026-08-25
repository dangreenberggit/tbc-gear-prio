Status: closed (2026-08-24, superseded by fork commit 62e77f625 — the
engine rank is no longer rendered anywhere; every table numbers its rows
by display position, so the set-potential desync cannot surface and the
comparator-agreement test would guard an invariant nothing displays. The
Owner ruling below pre-authorized exactly this outcome.)
Type: engine defect
Origin: ticket-279 review, 2026-08-24
Blocks: none
Blocked by: none

# Set-potential sort key can desync stamped ranks from rendered order

Found by the ticket-279 review while verifying the tie fix (fork commit
711c55ac2). The tie fix aligned the tiebreaks of `rank.ts`'s
`bySimmedThenDelta` and `view.ts`'s `compareRows`, but the two comparators
still differ on their primary key when the set-potential view option is on:

- `rank.ts` stamps `item.rank` from an order keyed on raw `deltaDps`.
- `compareRows` with `withSetPotential` sorts on
  `deltaDps + rankableSetPotential(r)` — a different key.

The set-potential toggle is wired to a live checkbox (`upgrades_tab.tsx`,
view-options group), so when set bonuses reorder rows the Rank column can
read non-ascending again — the same symptom ticket 279 fixed for exact ties,
via a different mechanism. Reproduced analytically in the 279 review
(standalone comparator repro: set-potential ON renders ranks `[2, 1]`,
identical before and after the 279 fix, so this is pre-existing and
untouched by it).

A second divergence, `pinBis`, exists in `compareRows` but is unreachable
from this UI today (`upgrades_tab.tsx` never passes it; defaults false).
Note it if the fix restructures the comparators.

## Owner ruling (2026-08-24)

Show the engine's original rank for now — the current behaviour (rank
pinned to the row, so numbers can read out of order under set-potential)
is accepted. The likely future direction is removing the engine rank from
the UI entirely and numbering only the displayed rows; if that lands, this
ticket's desync becomes moot and the agreement test below is only needed
if the engine rank stays user-visible.

## Done when

- With set-potential ON and a ranking where set bonuses reorder rows, the
  rendered Rank column is strictly ascending over the shortlist (measured on
  a served page, same protocol as ticket 279).
- The chosen rule is written down: either stamp ranks from the view's
  effective sort key, or re-stamp at render time — whichever, `rank.ts` and
  `view.ts` must agree by construction, not coincidence.
- A comparator-agreement test exists in `packages/core` (both surfaces are
  named unit-testable in AGENTS.md) so the next divergence fails
  mechanically instead of by review — the pre-merge adversarial axis noted
  this class of bug is exactly what such a test would have caught.
