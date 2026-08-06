Status: open
Type: task
Origin: `phase-2/resolution-and-fallback` pre-merge review (standards axis, closing note)
Blocks: none

# `belowCutoff` and `belowCutoffInView` derive the same fact by two paths, and nothing asserts they agree

Two places answer "does the cutoff hide this row":

- `packages/core/src/rank.ts` sets `RankedItem.belowCutoff` in the ranking loop,
  and paired replication **recomputes it** from the replicated mean.
- `packages/core/src/view.ts` sets `ViewRow.belowCutoffInView` independently,
  by re-running `meetsCutoff` over the filtered rows.

```bash
grep -n "belowCutoff" packages/core/src/rank.ts packages/core/src/view.ts
```

`applyView`'s own comment says the recomputation "is currently a no-op, and
honestly so" — `CUTOFF` is a pair of constants, so the two paths agree today.
The `shortlist` docblock says measuring on `belowCutoffInView` "keeps tracking"
if the view's cutoff ever becomes relative. Neither claim has a test.

## Why it is worth a ticket

Ticket 04 added a third writer: replication now rewrites `deltaDps` for the top
8 and re-derives `belowCutoff` from the mean. A row that crossed the cutoff
under replication is a row where the two paths *could* disagree, and the only
thing keeping them in step is that both call `meetsCutoff` with the same
constants.

This is the same shape as carry-forward ticket 36, which asks whether §12 wants
a relative cutoff at all. If 36 is resolved toward "relative", the two paths
stop agreeing by construction and this becomes a live bug rather than a latent
one. Related: [[36-relative-cutoff-within-a-filtered-view]].

## Shape of the fix

Cheapest useful version is a test, not a refactor: assert that for a `Ranking`
produced through `rankUpgrades` — including one where replication moved a row
across the cutoff — every `row.belowCutoffInView` equals its source
`item.belowCutoff`. That turns "currently a no-op" from a comment into a
checked property, and it fails loudly the day ticket 36 changes the answer.

## Done when

- A test drives a `Ranking` through `rankUpgrades` and `applyView` and asserts
  the two flags agree row for row.
- The case where paired replication changes a row's `belowCutoff` is covered,
  not just the steady state.
- `pnpm verify` green.
