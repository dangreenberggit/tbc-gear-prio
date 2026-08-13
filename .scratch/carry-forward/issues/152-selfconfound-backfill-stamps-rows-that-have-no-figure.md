Status: open
Type: bug
Origin: docs/reviews/feat-set-bonus-value.md round 6 (adversarial 6-A3)
Blocks: none
Blocked by: none

# `withSelfConfoundDisclosed` stamps the confound on rows with no figure

`packages/core/src/rank-report-rules.ts:238-249`. The backfill guards only on
`b.threshold !== 4 || b.selfConfound` and never inspects `b.unmeasured`. So a
4pc row that is itself unmeasured (`insufficient-pieces`,
`not-implemented-in-sim`, `sim-failed`, `repair-failed`) still gets
`selfConfound` stamped whenever the sibling 2pc is
`unmeasurable-at-this-worn-count`.

The rendered CLI line then contradicts itself — it says a figure "includes" a
term when there is no figure at all:

    Crystalforge 4pc (1 worn) — [includes the unmeasured 2pc effect, can't be
    separated from it] not enough pieces in the pool to build the package

The live path in `rank.ts` is **correct**: it sets `selfConfound` only on the
measured `results.push`, after the `unmeasured` branches have `continue`d. So
the two paths disagree, which defeats this function's own docstring claim that
it "derives the exact condition `rank.ts` checks live".

The HTML renderer happens not to show it (`setBonusEntry` returns early for
unmeasured rows), so only the CLI leaks it — an incidental escape, not a guard.

## Fix

Add `b.unmeasured === undefined` to the backfill guard, matching what `rank.ts`
does live. Then assert the two paths agree on an unmeasured 4pc row, so the
docstring's claim is pinned by a test rather than by prose.
