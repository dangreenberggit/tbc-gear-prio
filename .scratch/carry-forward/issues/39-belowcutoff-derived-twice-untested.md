Status: closed
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

## Closed 2026-08-07

Ticket 36 was resolved (commit `fcf9c4b`, ADR-0020) before this ticket was
picked up, and that resolution already changed the shape of the problem this
ticket describes. `applyView` no longer re-runs `meetsCutoff` — it now copies
`item.belowCutoff` straight onto `belowCutoffInView`
(`packages/core/src/view.ts:200`, `.map((item) => ({ ...item, belowCutoffInView: item.belowCutoff }))`).
So "two paths that answer the same question" is no longer literally true of
the code as of `fcf9c4b`; there is one write (`rank.ts`, including paired
replication's re-derivation) and one copy. `fcf9c4b` also added a test
(`packages/core/test/view.test.ts`, "agrees with the ranking's own
belowCutoff under every filter") that walks seven `ViewOptions` combinations
and asserts the two flags agree — but it builds `Ranking` fixtures by hand
(`belowCutoff` set directly by the test's `item()` helper), so it never drives
a `Ranking` through `rankUpgrades` and never touches paired replication's
re-derivation of `belowCutoff`. That gap is what this ticket's two "Done when"
bullets ask for and what was missing.

Added `packages/core/test/rank.test.ts`, describe block
`"rankUpgrades paired-replicate SE"`, test `"keeps belowCutoffInView equal to
the ranking's own belowCutoff through paired replication"`. It builds on the
existing `SeedAwareSimRunner`/`neckPool`/`rankWithSeeds` harness in that file,
overrides the sim response for item 29381 so seed 11 (`seeds[0]`, which drives
the pre-replication `belowCutoff` and the top-8 selection) reports a +26 DPS
gain — above `CUTOFF.absDps` (3.4) and above the rest of the pool's floor, so
the item both starts above cutoff and lands in the replicated top 8 — while
the other four seeds report -5 DPS, pulling the 5-seed paired-replicate mean
to +1.2 DPS, below cutoff. The test asserts `seMethod === "paired-replicate"`
and `deltaDps < CUTOFF.absDps` to prove the crossing actually happened (not
just "some row somewhere is below cutoff"), then runs the resulting `Ranking`
through `applyView` and asserts `row.belowCutoffInView === item.belowCutoff`
for every row.

Proved the test can fail: ran it once against `packages/core/src/view.ts`
with line 200 temporarily changed from
`belowCutoffInView: item.belowCutoff` to `belowCutoffInView: !item.belowCutoff`.
The new test failed (`expected true to be false`); nothing else in the suite
was touched for that check. Reverted the perturbation before committing.

  npx vitest run packages/core/test/rank.test.ts -t "keeps belowCutoffInView equal"

The two paths agree today, including through the replication-crossing case —
not just by re-reading the same test that was already there, but by
independently constructing a fixture where replication moves a row across the
cutoff and confirming `rankUpgrades` + `applyView` agree on the result.

Verified with (Node v22.16.0, `pnpm run sync:wowsims:restore` already run):

  pnpm verify

Full result: `codegen:json-types:check`, `typecheck`, `lint`, `format:check`,
`test` (381 passed, 2 skipped, 2 todo across 32 files), `skeleton:check`,
`mirrors:check` — all green.

No refactor of `rank.ts`/`view.ts` was needed or done: the two paths do not
disagree, so per the ticket's own "Shape of the fix" this stayed a test-only
change.
