Status: closed
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

## Closed 2026-11-12: fixed in the code

Every use the ticket lists is one difference of two sims, and so is every
other set gate on the tab's path. The tab always ranks with
`measureBrokenSetValue` (fork `model/run.ts:128`), so its rankings take the
step path, and the gates there read: a worn-set ladder rung R(c) − R(c − 1);
a future's same-gear value (bonus on − bonus off); the crossing gate; step
eligibility in the engine and in the view; and the popover's gap between two
step gears. The four-sim prospective bonus that the doc comment's √2 was
derived for is floored only on a ranking made without the flag (core, and
the fork's E-W3 parity harness). Full triage, with the code lines:
`.scratch/agent-reports/2026-11-12-general-task-623-triage.md` (gitignored).

**The fix** (fork `adf591743`, branch `fix/623-set-floor`):

- `clearsSameGearGate` (`set-less-copies.ts`) takes the `Cutoff` and passes a
  value above `max(absDps, 2·se)`, so no caller can hand it the √2 floor.
  `rank.ts` passes the ranking's cutoff to the ladder, same-gear, crossing
  and step-gear gates.
- The view's credit functions (`rankableSetPotential`, `setPotentialCredit`,
  `setPotentialTerms`, `setPotentialSteps`, `stepEligible`) take the `Cutoff`
  in place of a floor number. `walkCredit` floors the flag-off walk at
  `setBonusNoiseFloorDps` as before; `walkSteps` floors at `absDps`. The
  popover (`set_bonus_tip.ts`) and the column sort (`results_view.ts`) pass
  the ranking's cutoff the same way.
- `setBonusNoiseFloorDps`'s doc comment (fork `cutoff.ts`) now says it
  floors only the flag-off four-sim bonus and why the step path uses the bar.
  Core's `cutoff.ts` is unchanged: core has no step path, so its comment
  stays true.
- ADR-0035 and ADR-0037 carry amendment notes, and
  `docs/set-bonus-fixture-derivations.md` names the new gate.

What a player can see change, at the tab's 3000 iterations: a value between
`max(3, 2·se)` and 4.24 now counts. In the six committed tab recordings a
two-sim value's se is 1.81 to 2.23 for feral and 3.16 to 3.28 for ret, so
2·se is about 3.6 to 4.5 DPS for feral and 6.3 to 6.6 for ret. The bar
therefore drops by at most about 0.6 DPS for feral and not at all for ret
(corrected by the pre-merge review, `docs/reviews/fix-623-set-floor.md`).
The popover's gap between two step gears adds two such se in quadrature, so
its 2·se is above 4.24 at 3000 iterations and its gate does not change
there. A player who raises the iteration count shrinks every se, and then
the bar decides more often. None of the six committed tab
recordings has a gated value in (3, 4.24]; `fork-set-fixtures.test.ts`
passes on all six at the new gate. Ticket 335's band scan at 4.24 is moot
for the tab, which never applies that floor now (ADR-0037's amendment).

**Tests changed because they assumed the √2 floor where it was the bug:**

- `fork-set-fixtures.test.ts`: its step reference walk copied the gate with
  `setBonusNoiseFloorDps`; it now uses `ranking.cutoff.absDps`. The flag-off
  reference walk keeps the √2 floor.
- `fork-set-net.test.ts` 502-G: "a worn bonus below the gate" used a 2pc
  worth 4, below only the √2 floor; it is now worth 2, with the figures
  re-derived (366 → 368, credit 266 → 268).
- Fork `set_bonus_tip.test.ts`: "a step past the stop … within the noise"
  used a 3.5 gap; it now uses a gap of exactly 3, and checks that a 3.5 gap
  gets its figure.
- The other `fork-set-net.test.ts` cases pass a `Cutoff` (`{ absDps: 5 }`)
  where they passed the number 5, because the signatures changed; no case's
  expected value moved.

Verified by: in the pair,
`pnpm exec vitest run packages/core/test/fork-set-net.test.ts -t "623"`.
Before the fix 623-A (a step future worth 3.5 on the same gear, se 1, is
credited under the 3 DPS bar) and 623-C (a worn-set ladder rung worth 3.5,
se 0.5, is counted) failed and 623-B (the flag-off bonus keeps the √2 floor)
passed; with fork `adf591743` all three pass. `tbc-new-fork@adf591743`.
