# D1: is the Crystalforge / Justicar credit noise?

No sim was run. All numbers come from files on disk.

## How the figure and its se are built

- `packages/core/src/set-value.ts` `computeSynergy`: `bonus(S,t) = D(package) - D(base) - sum(single deltas) - bonus(S,2)` (the last term only for t=4). `se = combineSe([base, package, ...singles])` = sqrt(sum se_i^2).
- Sims per figure: base + package + one single per added piece. A 4pc from 0 worn = 6 sims. A 4pc from 1 worn = 5 sims.
- Defect: for t=4 the subtracted `bonus(S,2)` is itself a difference of sims, but its se is not added to the 4pc se. The 4pc se is too small whenever a 2pc was subtracted (rank.ts ~1721-1729 passes `twoPieceBonus`; the result's `se` at ~1748 has no 2pc term).
- Singles in the tab use `pairedReplicateSe` (rank.ts:1444), not the per-sim se from verification.md. The per-row se was not captured in report.md, so the numbers below are estimates from verification.md, not the tab's own se.
- The view gate does NOT use se. `packages/core/src/view.ts` `rankableSetPotential` credits `bonus > noiseFloorDps`, where the floor is `Math.SQRT2 * cutoff.absDps` (`packages/core/src/cutoff.ts:67`), about 4.81 ret and 5.09 feral. That floor is the 2 x se bar for a difference of 2 sims, not 5 or 6.

## Measured se (source: `.scratch/set-bonus-value/verification.md` V0a-V0c, 3000 iterations, seed 42)

| probe | sims | per-sim se | combined se | net | net/se |
|---|---|---|---|---|---|
| V0a Justicar 4pc, ret (inert bonus) | 6 | 2.08-2.19 | 5.24 | +1.27 | 0.24 |
| V0b Thunderheart 4pc, feral | 6 | 2.08-3.80 | 7.25 | +91.7 | 12.7 |
| V0c Malorne 4pc, feral | 4 | 2.29-3.59 | 6.01 | +20.9 | 3.5 |

Estimates for the report.md figures, using ret per-sim se about 2.2 and feral about 3:

| figure (report.md) | sims | est. se | net | net/se |
|---|---|---|---|---|
| H: CF4 at 1/4, ret | 5 (+CF2 term) | 4.9 (6.6 with CF2 se) | +9.5 | 1.9 (1.4) |
| I: CF4 at 1/4, ret | 5 (+CF2 term) | 4.9 (6.6) | +21.1 | 4.3 (3.2) |
| I: J4 at 0/4, ret (J2 not implemented) | 6 | 5.4 | +15.3 | 2.8 |
| A: M4 at 2/4, feral | 4 | 6.0 | +21.3 | 3.5 |
| B: M4, feral | 4 | 6.0 | +19.5 | 3.2 |
| E: N4 at 0/4, feral | 6 | 7.3 | +19.9 | 2.7 |
| B: N4 at 2/4 | 4-5 | 6.5 | +51.1 | 7.9 |
| A/D: TH2+TH4, N4 60.5, M2 96.2 | 4-6 | 6-7.3 | >= 60 | > 8 |

Result: the hypothesis is partly right. The floor (4.81) is below one combined se (5.2-6.6), so any figure up to about 10 is plausibly noise: this covers H's +9.5. It does not explain I: +21.1 CF4 and +15.3 J4 are 3-4 se. Something else produces them. Candidates, both untested: (1) the synergy term also contains stat interaction between pieces (hit or expertise cap, AP stacking), not only the bonus; (2) CF2 is a judgement mana cost cut, which can raise ret DPS if the ret runs out of mana. Also, with one shared seed the arms are correlated, so the independent-sum se likely overstates the true se (hypothesis). That makes I's values even less likely to be noise.

## Candidates

(a) Gate at k x own se.
- Win condition (written first): every inert ret figure (CF4, J4) fails and every feral true positive (M4, N4, TH4) passes at one k.
- k=1: all pass, including CF4 +9.5. k=2: CF4 +9.5 fails; J4 +15.3, CF4 +21.1, M4, N4 19.9 pass. k=3: J4 fails (15.3 < 16.2); N4 19.9 fails (< 21.9, true positive lost); M4 19.5 is at the edge; CF4 +21.1 still passes.
- Cost: no sims; se is already computed (after the 2pc se defect is fixed).
- Hides: at k=3, real feral 4pc bonuses near 20 DPS. No k meets the win condition. Loses.

(b) More iterations.
- Win condition: combined se below 2.4 for a 6-sim package at a wall time a player accepts.
- Per-sim se must drop from about 2.2 to 0.98, so iterations x 5, about 15,000. Recorded wall time: ret runs 90-185 s, feral 93-263 s at 3000 (report.md). Package sims are only part of a run; the split is not recorded. Upper bound x5 is 8-22 min per run.
- Hides: nothing. But it does not fix I: a 3-4 se figure stays when se shrinks, if the cause is systematic. Loses on I; would fix H.

(c) Treat non-DPS bonuses as not implemented for the spec.
- Win condition: a mechanical rule in the Go code tells DPS bonuses from others.
- `vendor/tbc-new-fork/sim/paladin/item_sets.go`: CF4 registers a spell with `ProcMaskSpellHealing` and `CalcAndDealHealing`; CF2 is `SpellMod_PowerCost_Flat` (mana); J4 is `SpellMod_DamageDone_Flat` on `SpellMaskJudgementOfCommand`, a damage mod. So heal and mana are visible in the closure, but J4 is a damage bonus: whether it helps depends on the spec's APL (it never casts JoC). CF2 mana may matter. This is a hand judgment per spec, recorded in the table. No clean automatic rule.
- Cost: none at run time. Hides: a bonus that helps a non-default APL.

## Table state (set-value.ts:53-54)

- 626 Justicar: `{2: false, 4: true}`. 629 Crystalforge: `{2: true, 4: true}`.
- D4: the comment already records that J2 is implemented at `sim/paladin/seals.go:553` (JotC x1.15) but keeps it `false` because the ret APL judges Crusader only prepull. That is an untested hypothesis.

## Recommendation

(c) plus a per-spec flag: mark CF4 (heal) and J4 (JoC only) as not-DPS for ret, and keep CF2 until a sim shows its mana effect is zero. Also fix the missing 2pc se in the 4pc se. Neither (a) nor (b) removes I's +21.1 / +15.3, which are 3-4 se and so probably not noise. Before trusting (c) for everything, run one probe to find what I's figure really is (stat interaction or mana), because the same residue may affect real bonuses too.
