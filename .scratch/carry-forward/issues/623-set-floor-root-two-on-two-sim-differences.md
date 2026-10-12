Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 (Tab-adjacent)
Type: task
Origin: docs/reviews/feat-flat-cutoff.md (finding D2)
Blocks: none
Blocked by: none
Related: 335, 615

# The √2 set-bonus floor is also applied to single two-sim differences

`setBonusNoiseFloorDps(cutoff)` returns `√2 × absDps`, now √2 × 3 ≈ 4.24 DPS
(ADR-0037). Its doc comment (fork
`ui/features/upgrades/model/engine/cutoff.ts:36-41`, same text in
`packages/core/src/cutoff.ts`) justifies the √2 with a 2pc prospective bonus
that folds four sims, so its noise is about √2 × one item delta's.

The fork applies the same floor in two more places. The domain axis of the
`feat/flat-cutoff` review read each as one difference of two sims:

- the worn-set ladder rungs, R(c) − R(c − 1) (`rank.ts:3279`);
- the same-gear gates (`rank.ts:1934`, `:1971`, `:2268`, `:2509`, `:2729`),
  through `clearsSameGearGate`, which is `dps > Math.max(floorDps, 2 * se)`
  (`set-less-copies.ts:231`).

If that reading is right, those values have the noise of one item delta, so a
floor at √2 × the item bar holds them about 1.4 times stricter than the doc
comment's reasoning gives. Whether each use is really a two-sim difference is
the domain reviewer's reading of the code, not a measurement (hypothesis,
untested). The behaviour predates `feat/flat-cutoff`; that branch only moved
the bar from 3.4/3.6 to 3.

To do: confirm, for each use above, how many sims its value folds; then either
give those uses a floor that matches their noise or write in the doc comment
why the stricter floor is wanted there. Either choice changes or documents
fork code, so it needs a re-pin. The ticket 335 band scan has not been re-run
at 4.24 either (ADR-0037).
