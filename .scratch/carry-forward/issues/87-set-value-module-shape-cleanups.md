Status: open
Type: cleanup
Origin: pre-merge review of feat/set-bonus-value (standards axis, baseline smells)
Blocks: none
Blocked by: none

# set-value module shape cleanups from the standards review

Judgement-call smells deferred from the review, batched because they touch the
same module surface:

1. **Naming**: `set-value.ts` vs the pre-existing `set-bonus.ts` — adjacent
   names, gain case vs loss case, indistinguishable to a reader. Consider
   `set-potential.ts` or merging the two.
2. **Data clump**: `buildSetBonuses` (rank.ts) takes ~11 params;
   `deps, equipment, gems, race, input, simVersion, runOpts` travel together
   across the file and want a context type.
3. **Export surface**: `index.ts` exports ~17 new symbols (`combineSe`,
   `PackagePiece`, `SynergyInput`, …) with no external caller — trim to what
   the spec needs.
4. **Duplicated shape**: the repeated `results.push({ …, unmeasured })` blocks
   in `buildSetBonuses` want an `unmeasuredBonus(...)` helper.
5. **Digest pin**: rank-report.test.ts's pinned `{digest, length}` grew more
   brittle with the new interpolation points; the targeted `toContain` tests
   already cover the feature — consider dropping the pin or scoping it.
