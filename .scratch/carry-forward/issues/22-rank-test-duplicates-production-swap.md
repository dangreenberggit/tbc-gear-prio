Status: open
Type: task
Progress: duplication removed 2026-07-29; the coverage half is the real work
Origin: `docs/reviews/phase-1-five-seed-spread.md` Adversarial findings A2, A4
Blocks: phase-2
Blocked by: none

# `rank.test.ts` asserts a copy of production against itself

## Problem

`candidateEquipmentForTest` (`packages/core/test/rank.test.ts:118`) is a
hand-copied duplicate of `swapItemAt` + `equipmentForCandidateSwap`
(`packages/core/src/rank.ts`). Tests compose a request from **the copy**, derive
`simCacheKey` from it, register that key as the only recording, and then assert
the candidate request matches. That is true by construction.

The copy has drifted from production in a way that matters. Production calls:

```ts
fillEmptyCandidateGems(itemId, migrateGemsToItem(...), palette, epWeights,
                       fillOptsForSwap(equipment, slotIndex))
```

The test helper calls the same function with **four** arguments — no opts. So
the `usedUnique` / `meta` feature added in `fb1488b`, the headline change of the
gem-optimizer work, is **never exercised through `rankUpgrades` by any test**.
If `fillOptsForSwap` returned garbage the suite would stay green.

This is why the meta-gem defect (ticket 20) was invisible to the test suite: the
tests structurally cannot see that path.

## Related: hard-coded universe counts

`pool-hardening.test.ts` (`toBe(362)`) and `pool.test.ts` (`toBe(238)`) assert on
committed generated artifacts, and each was edited to match new output as it
changed (347 → 349 → 362; 224 → 238). They detect *change*, not *correctness*: a
regression admitting 10 junk items while dropping 10 real ones keeps the count
and passes. The load-bearing assertion in that block is the `sources.length > 0`
loop; the count adds little beyond a tripwire.

Keeping a tripwire is defensible — it did catch both membership changes during
the polearm/world-boss work — but it should be paired with an assertion about
*what* is in the universe, not just how many.

## Done when

- ~~The test helper is deleted and the tests drive the real production path, or
  it is reduced to a thin wrapper that calls the same exported function
  production calls (so drift is impossible).~~ **Done 2026-07-29.**
  `equipmentForCandidateSwap` is now exported from `rank.ts` and
  `candidateEquipmentForTest` delegates to it, so the expected sim key is derived
  from the same code the engine runs. All 10 `rank.test.ts` tests pass unchanged,
  which incidentally proves the old copy produced identical output *for these
  fixtures* — the drift was latent, not yet biting.
- At least one test exercises `fillOptsForSwap` through `rankUpgrades` — a
  candidate whose fill result differs with and without the opts.
- The count assertions are paired with membership assertions (e.g. a sampled set
  of ids that must be present and a set that must be absent).

## The coverage gap is deeper than drift — measured 2026-07-29

After de-duplicating, `fillOptsForSwap` was neutered to `return {}` and **all 10
tests still passed**. So the feature remains untested, and not because the tests
are lazy: on the slamaltman fixture the opts are *inert*.

Two measurements:

1. Swept all 362 `ret-p3` entries, comparing `fillEmptyCandidateGems` with and
   without `fillOptsForSwap(...)` on each candidate against the fixture's worn
   gear. **Zero candidates differ.**
2. The fixture wears 10 gems, of which exactly one (31118) is `unique` — and it
   is a **meta**, so it can never collide with a candidate's non-meta fill.

Compounding it: under real ret EP weights the highest-EP gem of each colour is
never a unique gem (filling belt 30106 unconstrained yields `[32193, 32193]`,
neither unique), so `usedUnique` cannot bind in normal operation at all. That is
why `candidate-gems.test.ts` has to restrict the palette to two gems to force
the behaviour.

**Implication for the ticket:** a test at the `rankUpgrades` level needs a
purpose-built fixture — a character wearing a non-meta unique gem, plus a
candidate whose best fill would reuse it — not a tweak to the existing one.
Worth asking first whether the unique-tracking feature earns its keep, given it
appears unreachable under production weights; if it does not, deleting it is a
better outcome than testing it.
