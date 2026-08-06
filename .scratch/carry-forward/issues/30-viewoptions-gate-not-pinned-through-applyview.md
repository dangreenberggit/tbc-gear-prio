Status: closed
Type: task
Origin: `docs/reviews/feat-content-hash.md` Spec finding S4
Blocks: phase-2
Blocked by: none

# The ViewOptions gate box needs `applyView`, which does not exist yet

**Re-filed 2026-08-04.** This ticket was originally opened `Blocks: phase-1`.
That was wrong twice over, and the correction is the useful part:

- The box lives on the **Phase 2** gate (PLAN.md §14), not Phase 1. The Phase 1
  gate is fully closed: `docs/verification-log.md` heads its 2026-07-29 entry
  **"Phase 1 gate: 10 of 10"**, "All boxes are now checked."

  A bookkeeping discrepancy worth knowing, since an earlier draft of this
  ticket asserted the wrong number: PLAN.md §14's Phase 1 line renders **9**
  `☑` boxes, not 10. The 2026-07-29 amendment rewrote the `maxPhase` box
  (PLAN.md records the rewording inline), which is the likely merge point.
  Both sources agree the gate is **closed**; only the count drifted. Cite the
  log's wording rather than a box count until §14 is reconciled.
- It reads as a missing *test*. It is not — `applyView` has **no
  implementation**. `grep -rn "applyView" packages/ --include=*.ts` (excluding
  `dist/`) returns nothing.

PLAN.md schedules it deliberately, and says why:

> `applyView` lands here rather than in Phase 3 on purpose: it is pure and the
> CLI can exercise every option, so the web shell inherits a tested view layer
> instead of being where filtering logic is written for the first time.

So this is not cleanup left behind by `feat/content-hash`. It is a Phase 2
deliverable that has not started.

## The gate box

> ☐ **toggling any `ViewOptions` field does not change `contentHash` or
> trigger a sim**

## What `feat/content-hash` did close

Half of it, at the pure-function altitude
(`packages/core/test/content-hash.test.ts`):

```
it("does not change when a ViewOptions-shaped field is added", …)
```

That hands `contentHashOf` an object carrying `pins`, `raidZone`,
`groupBySlot` and `hideOwned` and asserts the digest is unchanged. It is a real
guard — `hashPayload` builds its object field by field rather than spreading
its argument, and the test fails if that is turned back into a spread
(mutation-checked). But it proves a property of the **hash function**, not of
the system, because there is no view layer to drive.

## What is still open

1. **Build `applyView`** per PLAN.md §4.1 — pins, raid/boss filter, slot
   grouping, hide-owned — with the properties §6 names: absolute `rank`
   survives filtering, filter composes before cutoff, pinned groups stay
   `deltaDps`-ordered.
2. **Then close the gate box at the right altitude**: produce a `Ranking`
   through `rankUpgrades` with a counting `SimRunner`, apply each `ViewOptions`
   field in turn, and assert (a) `ranking.contentHash` is unchanged and (b) the
   sim run count is unchanged. The second half — "or trigger a sim" — is what
   the current test cannot reach at all.

`applyView` is listed in AGENTS.md § Testing as one of the four pure functions
unit-tested directly, so its own tests need no new seam agreement.

## Comments

**2026-08-04 — superseded by a Phase 2 subplan.** The implementation half of
this ticket is now `.scratch/phase-2/issues/03-apply-view.md`, on branch
`phase-2/apply-view`. Close this ticket when that branch lands; the analysis
above (especially "what `feat/content-hash` closed" and the altitude the gate
box actually needs) is carried into that subplan rather than restated here.

**2026-08-05 — closed on `phase-2/apply-view`.** `applyView` is built
(`packages/core/src/view.ts`) and the gate box is closed at the altitude this
ticket named, not at the pure-function altitude it warned about:
`packages/core/test/view-gate.test.ts` produces a `Ranking` through
`rankUpgrades` with a counting `SimRunner`, applies all fourteen `ViewOptions`
combinations, and asserts `contentHash` and the run count are both unchanged.
The counter is not vacuous — it is asserted `> 0` first, and adding one extra
`sim.run` inside the loop fails the test with `expected 5 to be 4`.

Review: `docs/reviews/phase-2-apply-view.md`.
