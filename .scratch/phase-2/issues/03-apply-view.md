Status: open
Type: task
Origin: PLAN.md §14 Phase 2, §4.1, §12; carry-forward ticket 30
Blocks: none
Blocked by: 02

# `applyView` — the pure view layer, BiS tags, tiebreaks, `pinBis`, below-cutoff expand

Branch: `phase-2/apply-view` off `phase-2/trust`, after 02.

**Supersedes the implementation half of
`.scratch/carry-forward/issues/30-viewoptions-gate-not-pinned-through-applyview.md`.**
Close ticket 30 when this lands, with a pointer to this branch's review.

Third, because `applyView` is pure and needs `bisTags` and `caps` to already be
real on `RankedItem` — otherwise the filter and sort logic gets written twice.

## Why it lands in Phase 2 at all

PLAN.md §14 states the reason and it is load-bearing: *"it is pure and the CLI
can exercise every option, so the web shell inherits a tested view layer
instead of being where filtering logic is written for the first time."*

## What exists today

Nothing. Ticket 30 verified this: `grep -rn "applyView" packages/ --include=*.ts`
(excluding `dist/`) returns no implementation. `bisTags` exists on `PoolEntry`
and `RankedItem`; `belowCutoff` and absolute `rank` are already computed in
`rank.ts:412–421`.

`packages/core/test/content-hash.test.ts` already proves the **hash function**
ignores ViewOptions-shaped fields (mutation-checked — `hashPayload` builds its
object field by field, and the test fails if that becomes a spread). That is
half the gate box, at the wrong altitude. It cannot reach "or trigger a sim"
because there is no view layer to drive.

## Scope

Build `export function applyView(r: Ranking, v: ViewOptions): RankedItem[]` per
§4.1, with `ViewOptions = { pinBis?, raid?, boss?, groupBy?, hideOwned? }`.

Three properties that are easy to get backwards, all settled in §4.1/§12:

1. **`rank` stays absolute, never renumbered per filter** (§12). Renumbering
   shows "rank 1" for an item that is 12th overall, misleading on exactly the
   question the tool answers.
2. **Filter composes before the cutoff** (§12) — *"a 2 DPS gain may be the best
   thing available in one specific raid, and hiding it there would answer the
   user's actual question with 'nothing'."*
3. **The pinned group is still ordered by `deltaDps`** (§4.1).
   `sortKey = [pinBis && bisTags.includes('BiS') ? 0 : 1, -deltaDps]`. wowsims'
   curated sets are 17 entries in fixed **slot** order carrying no ranking
   information — slot order is membership data, not priority data, and must
   never leak into display order.
   **Pinned rows will sometimes show negative deltas, and that is correct.**
   Keep the signed delta visible; `setBonusNote` explains the common case.

Also in scope: BiS tags and tiebreaks (§10 — tie groups broken by BiS-tag
richness then item id, **displayed as a tie** rather than a false ordering),
and the below-cutoff expand (hidden, never deleted).

**The toggle degrades to disabled, not silently inert** (§4.1). Ret's curated
sets stop at P2, so above `maxPhase: 2` there is nothing to pin. Expose enough
from the ranking for a caller to know the control has no data — the Phase 3
gate box *"the pin control is hidden, not inert, where no curated set exists"*
depends on this being answerable here.

## Gate boxes owned

> ☐ **toggling any `ViewOptions` field does not change `contentHash` or trigger a sim**
> ☐ **a raid filter on a tier-token slot returns the tier piece** (§8.3.2 — the two-hop case, and the one that quietly fails)

Ticket 30 names the right altitude for the first box, and it is not the
pure-function level: produce a `Ranking` through `rankUpgrades` with a
**counting** `SimRunner`, apply each `ViewOptions` field in turn, and assert
(a) `ranking.contentHash` is unchanged and (b) the sim run count is unchanged.

The second box is the quiet failure mode from §15's risk table: a "Karazhan"
filter that omits every T4 piece. The tier piece reaches its zone through
`ItemSource` `kind: 'token'` (§8.3.2), which is a two-hop resolution — filter on
zone must follow it.

## Testing

`applyView` is named in AGENTS.md § Testing as one of the four pure functions
unit-tested directly, so its own tests need no new seam agreement. The gate box
above additionally needs the `rankUpgrades` altitude.

## Done when

- `applyView` implements all five `ViewOptions` fields with the three
  properties above asserted.
- Both gate boxes closed at the altitudes named.
- Ticket 30 closed with a pointer here.
- `pnpm verify` green; review at `docs/reviews/phase-2-apply-view.md`.
