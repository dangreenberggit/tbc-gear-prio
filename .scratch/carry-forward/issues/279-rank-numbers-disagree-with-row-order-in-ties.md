Status: closed (2026-08-24, fork commit 711c55ac2 on feat/upgrades-tab —
bySimmedThenDelta given compareRows' bisTags-then-itemId tiebreak; re-measured
under this ticket's protocol: 5 shortlist tie groups incl. a three-way, 0 rank
inversions across 65 + 175 rows. Follow-up defect split to ticket 284.)
Type: engine defect
Origin: stage-gate `upgrades-ui-pass`, Q1 measurement, 2026-08-23
Blocks: none
Blocked by: none

# Rank numbers disagree with rendered row order inside exact delta ties

Found by the ticket-278 Q1 measurement, on the unmodified fork tip `d49096e`,
before any UI change. The done-state shortlist renders in correct delta order,
but the numbers in the Rank column are not strictly ascending: they go
`... 19, 21, 20, 22, 23, 25, 24, 26 ...`.

## What was measured

Served-page run on `/tbc/paladin/retribution/`, iterations 1, candidates at
default, prune off, set-potential off, BiS-only off, raid filter default.
52 shortlist rows and 188 below-cutoff rows, read as two separate tables.

Deltas are perfectly non-increasing in both tables — zero inversions across
51 and 187 adjacent pairs. Rank has exactly two inversions, and both sit
strictly inside an exact delta tie:

| Prev row | Next row | Deltas |
| --- | --- | --- |
| Rank 21 — Mithril Band of the Unscarred | Rank 20 — Ring of Reciprocity | +18.1 / +18.1 |
| Rank 25 — Liar's Tongue Gloves | Rank 24 — Ring of Lethality | +14.2 / +14.2 |

The +14.2 tie has three members, rendered 25, 24, 26.

## Mechanism

Two different comparators order the same rows, and they disagree on ties.

- `rank.ts:883-891` assigns `item.rank` after sorting with `bySimmedThenDelta`,
  whose only tiebreak is `b.deltaDps - a.deltaDps`. Equal deltas keep whatever
  order the sort happens to leave them in.
- `view.ts:205` re-sorts for rendering with `compareRows`, which breaks ties on
  bisTags richness first, then `itemId` (`view.ts:176-178`).

So the number stamped on a row and the position it renders at are produced by
different rules, and inside a tie they need not agree.

This is cosmetic in effect — the delta ordering, which is what the ranking
means, is correct in both tables — but a Rank column that counts 23, 25, 24
reads as a bug to anyone looking at it.

## Why it was not fixed in flight

The `upgrades-ui-pass` plan scoped engine changes (`upgrades/engine/**`) out
explicitly, with a stop-and-report on exactly this outcome. The UI fix that
plan did land is correct under either answer, because the mid-run table sorts
by delta at render time and derives its own provisional positions.

## Done when

- `rank.ts` and `view.ts` agree on tie order, whichever way is chosen — most
  likely by giving `bySimmedThenDelta` the same bisTags-then-itemId tiebreak
  `compareRows` already uses, so rank assignment walks the rendered order.
- Re-measured on a served page under the protocol above: shortlist Rank
  strictly ascending over at least 10 rows, deltas still non-increasing.
