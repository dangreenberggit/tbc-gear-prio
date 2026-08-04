Status: open
Type: task
Origin: `docs/reviews/feat-content-hash.md` Spec finding S5
Blocks: phase-1
Blocked by: none

# The §14 ViewOptions gate is pinned at the wrong altitude

PLAN.md §14 Phase 1 gate:

> ☐ **toggling any `ViewOptions` field does not change `contentHash` or
> trigger a sim**

`feat/content-hash` pins the **first half** of that, in
`packages/core/test/content-hash.test.ts`:

```
it("does not change when a ViewOptions-shaped field is added", …)
```

That test hands `contentHashOf` a synthetic object carrying `pins`,
`raidZone`, `groupBySlot` and `hideOwned`, and asserts the digest is unchanged.
It is a real guard — mutation-checked, and it fails if `hashPayload` is turned
back into a spread of its argument — but it proves a property of the **pure
hash function**, not of the system.

## What is not covered

Two gaps, both in the clause "**or trigger a sim**":

1. **No test drives a real `ViewOptions` through `applyView` on a `Ranking`**
   and then asserts the `contentHash` on that `Ranking` is untouched. The gate
   is about view toggles on a produced ranking; the current test never
   constructs one.
2. **Nothing asserts no sim runs.** The cache tests count sim invocations with
   a `CountingSimRunner`, so the machinery exists — it is simply not pointed at
   the view path.

The current test would still pass if `applyView` were changed to recompute a
hash, or if a view toggle triggered a re-rank, because neither goes through
`contentHashOf`.

## Done when

A test at the `applyView` altitude: produce a `Ranking` through
`rankUpgrades` with a counting `SimRunner`, apply each `ViewOptions` field in
turn, and assert (a) `ranking.contentHash` is unchanged and (b) the sim run
count is unchanged. Then the §14 box can be checked against a test rather than
against the pure-function half.

Note `applyView` is listed in AGENTS.md § Testing as one of the four pure
functions that are unit-tested directly, so this is an addition to an
already-sanctioned test home, not a new seam.
