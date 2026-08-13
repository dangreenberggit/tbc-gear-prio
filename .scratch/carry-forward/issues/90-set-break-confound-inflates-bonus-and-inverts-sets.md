Status: closed
Type: bug
Origin: set-bonus 4pc-invisible investigation, 2026-08-10 (`.scratch/set-bonus-value/investigation-2026-08-10-t6-4pc-invisible.md`, `.scratch/set-bonus-value/break-confound-correctability.md`)
Blocks: none
Blocked by: none

# set-break confound inflates bonus and inverts sets

`computeSynergy` (`packages/core/src/set-value.ts:332-345`) computes
`bonus = packageDelta - Σ singles`. When the completion package displaces
pieces of another set the player is already wearing, that other set's bonus
is lost — but it is charged **once** inside `packageDelta` and **k times**
across `Σ singles` (k = number of package slots that hold a piece of the
broken set). The derivation
(`.scratch/set-bonus-value/break-confound-correctability.md`, "The algebra"):

```
bonus(S,t)_reported = bonus(S,t)_true + (k-1)·B
```

where `B` is the broken bonus's true in-context DPS value. `k=0` → no
inflation (bonus untouched). `k=1` → no inflation either — the single charge
in `Σ singles` cancels the single charge in `packageDelta` exactly. `k≥2` →
inflation of `(k-1)·B`.

Both feral P3 4pc figures in `.scratch/rank-reports/shredzepelin-p3.json`
are affected: Thunderheart 4pc reports 193.89, Nordrassil 4pc reports
185.10. Both have `k=2` (their packages displace both worn Malorne Harness
pieces, chest and shoulder — `breaks: [{setId: 640, threshold: 2,
piecesBefore: 2, piecesAfter: 0}]` on both rows), so both are inflated by
exactly one `B`.

Reproduce the reported figures from the artifact:

```
node -e "const r=require('./.scratch/rank-reports/shredzepelin-p3.json').ranking;
const b=new Map(r.items.map(i=>[i.itemId,i]));
const s2=b.get(31034).deltaDps+b.get(31044).deltaDps;
const s4=[31048,31042,31034,31044].reduce((a,id)=>a+b.get(id).deltaDps,0);
console.log('2pc bonus', 76.50072399490682 - s2);
console.log('4pc bonus', 64.07344025189468 - s4 - (76.50072399490682 - s2));"
```

## Consequence: cross-set inversion under `full` credit

Because `k=2` for both, their **difference is confound-free** (`B` cancels
identically): `193.889 - 185.102 = 8.787` — Thunderheart 4pc genuinely beats
Nordrassil 4pc by 8.79 DPS on this gear. But the *reported* magnitudes are
individually inflated, and under `full` credit (weight 1.0) the report shows
Nordrassil Chestplate at −110.90 + 185.10 = **+74.20**, above the strictly
better Thunderheart Chestguard at −100.16 + 31.46 = **−68.70** (Thunderheart's
4pc is not even reachable on its row — see ticket 91 — so it only gets its
2pc figure). The ordering is driven by which set's bonus happens to be more
confounded plus a separate threshold-selection defect, not by DPS.

## Recommended fix

Keep any figure with a non-empty `breaks` out of the sort key (suppress or
qualify it), independent of whether the confound is ever corrected
numerically. Do not simply delete the number: the design review
(`.scratch/set-bonus-value/design-review-2026-08-10.md`, §3 "On (b)") argues
most of what the confound adds is real signal, not error — equipping the
package pays the broken bonus's cost once, while `Σ singles` pays it k
times, so `(k-1)·B` is the arithmetic shadow of a true saving from moving
several pieces at once. The recommendation from both source reports is
correct-and-disclose: keep the figure out of *ranking* (suppress from the
sort key and cutoff comparison wherever `breaks` is non-empty) while still
*disclosing* it in the Set potential panel, ideally split into a corrected
`bonusDps` and a separate `breakSavingDps` once ticket 92's measurement
lands.

## Confirmed by independent audit (2026-08-10)

`.scratch/set-bonus-value/audit-2026-08-10-numbers.md` re-derived this
ticket's arithmetic from the raw artifact, independently of this ticket's
own reasoning, and confirmed it **bit-exactly** (residual 0.0) across four
separate packages (Thunderheart 4pc, Nordrassil 4pc, and two more). k=2 for
both the Thunderheart and Nordrassil 4pc packages was verified three
independent ways: `piecesAfterSwap` arithmetic, `setBonusNote` census
(exhaustive over all rows), and delta-structure shape. This ticket's
recommendation stands unchanged.

The audit also surfaced a gap worth recording: **worn equipment is not
present anywhere in the rank artifact.** `ranking`'s top-level keys are
`contentHash, cutoff, fight, baseline, assumptions, caps, substitutions,
items, setBonuses` — no equipment/gear/worn/slotIndex key. So k had to be
*reconstructed* from indirect signals (the three routes above), not read
directly. It was unambiguous here because all three routes agreed, but nothing
guarantees that on a different character or set configuration. Emitting the
baseline equipment into the artifact would make k directly readable instead
of inferred — worth its own small ticket if anyone wants it; none filed here.


---

## Disposition (2026-08-10) - FIXED, commit `283dd0b`

"Keep break-confounded set bonuses out of ranking, but keep disclosing them."
Implemented as **suppression, not numeric correction** - no estimated `B` is
subtracted anywhere, exactly as this ticket recommended.

- `SetContext` gains `prospectiveBonusBreaks`, copied from the matching
  `SetBonusValue.breaks` when non-empty.
- New predicate `setPotentialIsConfounded` in `rank-report-rules.ts`.
- `weightedSetPotentialDps` returns bare `deltaDps` for a confounded row under
  **both** `weighted` and `full`.
- `view.ts` routes the sort key and `belowCutoffUnderView` through a new
  `rankableSetPotential`, which zeroes a confounded bonus, so it can neither
  reorder a row nor push it across the cutoff.
- Disclosure preserved: `formatSetPotentialLine` still emits the figure, suffixed
  `- inflated by breaking <set> <n>pc, not counted in ranking`.

Tests (all confirmed red first) in `packages/core/test/view.test.ts` and
`rank-report.test.ts`: a confounded bonus does not flip sort order, does not
promote a below-cutoff row, and credits nothing under either display mode, while
an empty `breaks` still credits normally and the figure stays in the rendered
line.

### The confound's magnitude is now measured

`(k-1)*B` is no longer hypothetical. Direct sims (tickets 92, 99) give `B` =
Malorne 2pc = **131.1 +/- 6.6 DPS**, and the isolated Thunderheart 4pc =
**73.5 +/- 6.3** against the engine's reported **193.89** - a gap of ~120 DPS at
k=2, consistent with one `B` of inflation. The 2pc corroborates the model from
the other side: measured at k=0 where no inflation is predicted, isolated
30.5 +/- 5.5 versus the engine's 31.46.

This does **not** license subtracting 131.1 from reported figures. `B` is
gear-dependent (an energy-throughput bonus scales with how energy-starved the
rotation is), and the shipped fix is deliberately a suppression.
