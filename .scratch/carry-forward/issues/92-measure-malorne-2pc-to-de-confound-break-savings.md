Status: closed
Type: investigation
Origin: set-bonus 4pc-invisible investigation, 2026-08-10 (`.scratch/set-bonus-value/break-confound-correctability.md`); reframed 2026-08-10 from the adversarial audit, SME review, and double-count trace (`.scratch/set-bonus-value/audit-2026-08-10-numbers.md`, `sme-review-2026-08-10.md`, `worn-set-double-count-trace.md`)
Blocks: none
Blocked by: none

# measure Malorne 2pc to de-confound break savings

> **See ticket 99 first
> (`99-measure-set-bonuses-in-isolation-on-a-reference-set.md`).** It proposes
> measuring a set bonus *directly* — equip N set pieces vs N matched non-set
> items on a common reference gear set and difference the sims — rather than
> estimating `B` and subtracting `k·B` from 193.89. That removes `B`, `k`, and
> the regression from the chain, so it does not inherit ticket 90's
> single-scalar-toll model the way this ticket's correction does. **Run 99
> before this ticket's sim**, and re-read this ticket's disposition afterward.
>
> This ticket is not superseded: `B` is what the ranking pipeline actually
> charges, whether or not it equals the isolated figure, and a disagreement
> between the two would itself falsify the single-scalar-toll model. But it is
> demoted from primary evidence to cross-check.

Ticket 90 establishes that any completion package with `k≥2` (displaces two
or more pieces of a broken set) reports its bonus inflated by `(k-1)·B`,
where `B` is the broken bonus's true in-context DPS value. On this
character, `B` is Malorne Harness's 2pc value.

## There is an unresolved factor-of-4 disagreement about B. One sim settles it.

Two independent lines of evidence disagree by roughly 4x, and neither side
has run the sim that would decide between them. **Do not treat either side
as the answer.**

### Regression evidence — B ≈ 100–133, from three independent estimators, all from committed artifacts

- **B̂ ≈ 115.8** (`break-confound-correctability.md`, route R6): fitting
  `deltaDps` against a stat proxy (`2·Str + Agi + AP`) separately for the 36
  candidates that break Malorne 2pc (chest + shoulder) and the 68 that do
  not (legs + hands + feet), the gap between fitted intercepts is 115.77.
  The adversarial audit reran this unmodified and reproduced it exactly,
  and ran a 4000-draw bootstrap: median 115.9, 95% CI [108.0, 124.3].
- **Slot-intercept regressions** (`worn-set-double-count-trace.md`):
  regressing `deltaDps` on a stat proxy per slot and reading the intercept —
  chest **−133.4** (n=19), shoulder **−131.0** (n=17), agreeing within 2.4
  DPS across two independent item fields. Four non-set control slots (hands,
  legs, wrist, feet) give intercepts of **−0.3 to −10.2** by contrast — the
  set-holding slots are the outlier group by roughly an order of magnitude.
- These two estimators (R6's breaking/non-breaking split and the trace's
  per-slot fit) are independent methods and agree within a few DPS of each
  other, both landing in the 108–133 range.

**But the audit also found the estimate is far more sensitive to proxy
choice than to sampling.** Re-running R6's regression with different stat
proxies:

| proxy | B̂ |
|---|---|
| `2·Str + Agi + AP` (as run) | 115.8 |
| `Str + Agi + AP` | 120.7 |
| `AP` only | 125.1 |
| `Agi` only | 130.9 |
| `2·Str + Agi + AP + crit` | 99.8 |

Spread 100–131 — wider than the bootstrap CI. Proxy specification, not
sampling noise, is the dominant source of uncertainty. **B must be quoted as
a range at 2 significant figures (100–130ish), never as a point estimate
like "116".**

### Domain evidence — B ≈ 15–40, from SME mechanical reasoning

`sme-review-2026-08-10.md` (G4): Malorne 2pc is mechanically a 4% chance on
landed melee for +20 energy in cat form. Working the proc rate (~2.5
procs/min at roughly one swing/sec) against a cat's ~600 energy/min budget
gives roughly an 8% increase in energy income at the ceiling, realistically
1–2% of DPS once cap-wastage is accounted for — **SME plausible range
15–40 DPS, centre 25–35**.

Three ratio arguments back this, all independent of the regression:

1. Against the **same set's 4pc** (Malorne 4pc = +30 Str, measured 18.04 DPS
   in this artifact = 0.60 DPS/Str, a sane conversion): B ≈ 116 implies the
   2pc is **6.4x** its own set's 4pc. Tier sets are not built that way — the
   4-piece is the marquee bonus.
2. Against **Thunderheart's 2pc** (measured 31.46 DPS, mechanically a
   flat −5 energy cost on every Mangle cast — a larger, more reliable energy
   effect than a 4% proc): B ≈ 116 implies the T4 2pc beats the T6 2pc by
   **3.7x**, backwards for tier progression.
3. Against **total damage**: 116 DPS is 5.4% of this character's baseline
   from one T4 2-piece bonus. No T4 set bonus did that.

## The reconciliation test that distinguishes them

With B≈131 and k=2, Thunderheart 4pc (193.889, k=2 per ticket 90's algebra)
corrects to `193.889 − 131 ≈ 63`, a sane 4pc value that closes cleanly. With
B=25–35, the same correction gives `193.889 − (2×25..35) ≈ 125–145`, which
does **not** close — it stays implausibly large by the SME's own mechanics.
This is the crux: the regression's own correction only makes sense if its
own B estimate is right, which is exactly what is in dispute.

## A proposed resolution exists — explicitly flagged as untested

`worn-set-double-count-trace.md` proposes: feral cat DPS is energy-limited,
so a 4%-chance-at-+20-energy proc is not a discrete proc to price
individually — it is a sustained increase to the whole rotation's energy
throughput, and the SME's estimate prices it as a discrete proc rather than
as resource throughput, which is named as "the standard way this bonus is
misjudged." **This is mechanism reasoning, not a measurement, and the trace
explicitly labels it `[inferred]`/untested.** Do not treat it as resolving
the disagreement — it is a hypothesis for why the regression might be
right, not evidence that it is.

## The deciding measurement

**Swap ONE Malorne piece for a stat-identical non-set item and measure
directly.** This isolates the bonus from stats and from whatever the
regressions are absorbing (proxy mis-specification, slot budget
differences, or anything else common to chest/shoulder that isn't the
bonus). Both the adversarial audit and the SME review named this
independently as the fix — it is not this ticket's own invention, it is
where both reviews converged.

**Secondary/alternative sim** (previously the primary proposal, kept as a
fallback): sim the baseline with **both** Malorne pieces vacated to the T6
pieces the existing 4pc packages already use (chest 29096→31042, shoulder
29100→31048), and difference against the existing baseline and the two
already-measured singles:

```
B + ε = D(SimA) - 2152.0998 + 206.316
```

where `D(SimA)` is the new sim's DPS, `2152.0998` is the existing baseline
DPS, and `206.316` is `-(single(31042) + single(31048))` = `-(-100.157 +
-106.159)`, both already measured and present in the artifact. `ε` is bounded
by ordinary two-item stat-interaction magnitude (a few DPS) and is not
separated out by this one sim. This variant conflates the bonus with two
items' worth of stat swap at once, which is why the single stat-identical
swap above is preferred as the primary measurement.

Both Thunderheart and Nordrassil 4pc packages break the same two Malorne
slots, so **one sim (of either kind) corrects both rows**. This has not
been run; no sims have been run in any part of this investigation.
Implementation would reuse the existing package-sim path `buildSetBonuses`
(`rank.ts:1003-1016`), at the run's existing seeds `[11,22,33,44,55]` and
3000 iterations — within spec §2.4's ~4-per-run budget.

## What is proven without any new sim

Because both Thunderheart 4pc and Nordrassil 4pc share `k=2` and break the
same bonus, `B` cancels identically in their difference — proven from the
artifact's own reported figures alone:

```
193.889 - 185.102 = 8.787346020494624
```

This is **exact and confound-free**: both packages are k=2, `breaks` is
byte-identical between them (confirmed by sorted-key serialisation), and k
was independently verified three ways in the adversarial audit
(`piecesAfterSwap` arithmetic, `setBonusNote` census, delta-structure
shape). **Thunderheart 4pc beats Nordrassil 4pc by 8.79 DPS on this gear.**
This statement does not depend on B̂ and does not need the new sim.

But this subtraction is **scale-free** — it proves only the *difference*
between the two 4pc bonuses (`T_thunderheart − T_nordrassil`), never either
bonus's absolute value. It cannot be used to argue for either the 100–133 or
the 15–40 side of the disagreement above.


---

## Disposition (2026-08-10) — RESOLVED BY DIRECT MEASUREMENT

**B = 131.1 ± 5.5 DPS.** The factor-of-4 disagreement is settled **in favour of
the regression evidence (100–133)**. The SME's domain estimate (15–40) is
refuted by measurement.

```
pnpm fetch:wowsimcli
python .scratch/set-bonus-value/measure_malorne.py
```

Script `.scratch/set-bonus-value/measure_malorne.py`, raw output
`.scratch/set-bonus-value/sims-malorne/`. wowsimcli v0.0.101, seeds
`[11,22,33,44,55]`, 3000 iterations, reference
`vendor/wowsims/feral_p2_9p.gear.json` — a **phase-appropriate T4-era set that
already wears exactly the two Malorne pieces** (index 2 = 29100 shoulder, index
4 = 29096 chest), mirroring the live shredzepelin configuration.

| arm | Malorne pieces | mean DPS | seed spread |
|---|---|---|---|
| M2 (as committed) | 2 — 2pc live | 2226.750 | 0.675 |
| M0 (both replaced) | 0 | 2048.586 | 0.185 |
| R_shoulder | 1 — no threshold crossed | 2071.672 | 0.367 |
| R_chest | 1 — no threshold crossed | 2072.565 | 0.588 |

```
stat price   shoulder 23.09   chest 23.98      (0->1 piece, crosses no threshold)
B = (M2 - M0) - (stat_shoulder + stat_chest)
  = 178.16 - 47.07 = 131.10 DPS
```

The `R_*` arms avoid the threshold-straddling trap that broke ticket 99's first
pass: going 0→1 pieces crosses no threshold, so those deltas price stats alone.

**B-side items were verified melee-appropriate this time** (the defect ticket 99
hit): 28755 Bladed Shoulderpads of the Merciless (ilvl 115) and 30730 Terrorweave
Tunic (ilvl 120), both `setName: None`, both AP/RAP/crit/hit leather with no
Intellect or healing power.

### The magnitude is surprising but mechanically corroborated

131 DPS is ~5.9% of that reference baseline, and **7.3x the same set's own 4pc**
(+30 Str in cat, engine-measured 18.04) — the ratio argument this ticket used
against the regression. That argument is now **falsified by measurement**, and
the mechanism explains why:

- Malorne 2pc procs on `ProcMaskMelee`, which is
  `ProcMaskMeleeWhiteHit | ProcMaskMeleeSpecial` (`sim/core/flags.go:78`), with
  **no internal cooldown** (`sim/druid/item_sets.go:83-102`, pin
  `8aa378b3671a0923fd11fb34b4b3753e53f20c9b`). Melee **specials** roll it too.
  **But this does NOT explain the magnitude, and an earlier orchestrator claim
  that it did is retracted:** the measured proc rate is **3.66/min (73.2
  energy/min)**, only modestly above the SME's assumed ~2.5/min — nowhere near
  the ~4x the DPS gap would require. The proc mask raises the SME's estimate; it
  does not carry it to 131.
- Direct evidence from the sim output: M2 lands **181,342 Shred casts vs M0's
  162,870 — 18,472 extra Shreds (+11.3%)**. A cat rotation is energy-limited, so
  the bonus converts almost entirely into additional casts. Verify:

```
python -c "
import json
for arm in ('M2','M0'):
    d=json.load(open(f'.scratch/set-bonus-value/sims-malorne/{arm}-11.json'))
    p=d['raidMetrics']['parties'][0]['players'][0]
    n=sum(t.get('casts',0) for a in p['actions'] if a['id'].get('spellId')==27002 for t in a.get('targets',[]))
    print(arm,'shred casts',n)"
```

This is the "resource throughput, not a discrete proc" hypothesis from
`worn-set-double-count-trace.md`. The **direction** is confirmed by measurement
(the bonus does convert into casts), but the **magnitude is not accounted for**:
73.2 energy/min does not straightforwardly buy 18,472 extra Shreds, and the
energy arithmetic does not close the gap. See the unresolved anomaly below.

### Retracted along the way

An intermediate orchestrator inference, `B = 193.89 − 73.54 = 120.35`, was
**wrong and must not be cited**: it differences a Thunderheart 4pc measured on
the P3 reference (~2442 DPS, no Malorne) against one measured on shredzepelin
(~2152 DPS, 2 Malorne), and the 4pc is a *multiplicative* modifier whose value
differs between those characters. It landed near the right answer by luck. The
131.1 above is a direct measurement and does not depend on it.

### What this does NOT settle

`B` measured on the `feral_p2_9p` reference is not the `B` charged for every
character — an energy-throughput bonus scales with how close the rotation runs
to energy-capped, so it is gear-dependent. Ticket 90's suppression (landed,
283dd0b) is deliberately a *suppression*, not a numeric correction, and nothing
here changes that: do not start subtracting 131.1 from reported figures.


### Unresolved anomaly — recorded, not smoothed over

B = 131.1 makes the Malorne 2pc worth **7.3x its own set's 4pc** (+30 Str in cat,
engine-reported 18.04), which is backwards for TBC tier tuning, and the energy
accounting above does **not** explain it. The measurement itself is structurally
clean — the `R_*` arms provably cross no threshold (M2's `resources` array has 19
streams to M0/R_*'s 18, the extra stream being the 2pc energy proc), request
parity holds, and B-side items are melee-appropriate with exact socket parity.

Two hypotheses, both **untested** at the time of writing:

1. The Malorne **4pc** figure of 18.04 is itself understated or confounded.
2. This P2 gear runs an unusually energy-starved cat rotation, inflating the
   value of any energy bonus relative to a stat bonus.

### Anomaly RESOLVED (same day) - hypothesis (i) refuted, the ratio is real

The Malorne 4pc was measured directly on the same reference set, using the same
threshold-safe ladder:

```
python .scratch/set-bonus-value/measure_malorne_4pc.py
```

| arm | Malorne pieces | mean DPS | resource streams |
|---|---|---|---|
| M4 (all four) | 4 - 2pc + 4pc | 2249.615 | 19 |
| M2 (as committed) | 2 - 2pc only | 2226.750 | 19 |
| M0 | 0 | 2048.586 | 18 |
| H1 (hands only) | 1 - no threshold crossed | 2042.020 | 18 |
| L1 (legs only) | 1 - no threshold crossed | 2065.011 | 18 |

The `resources` array length is the empirical proof of which bonuses are live:
18 streams without the 2pc energy proc, 19 with it. H1/L1 sit at 18, confirming
they cross no threshold and so price stats alone.

```
stat price   hands -6.57   legs +16.43
Malorne 4pc = (M4 - M2) - (stat_hands + stat_legs)
            = 22.86 - 9.86 = 13.01 DPS  (~ +/- 5.5)
```

The ladder gives `B4 = 13.0 +/- 9.1 DPS` (1.4 sigma - consistent but imprecise).
A **second, far more precise method** was then available because the probe found
the Malorne 4pc is a **flat +30 Strength with no aura and no resource stream**,
so its value can be priced directly via `bonusStats` on the untouched reference
set, where no threshold moves at all:

```
python .scratch/set-bonus-value/price_strength.py
```

**0.7227 DPS per Strength, linear to four decimal places across +30/+150/+300**,
giving **Malorne 4pc = 21.7 DPS** - within 1 sigma of the ladder and close to the
engine's reported 18.04.

**Hypothesis (i) - "18.04 is understated" - is refuted.** The engine's figure is
low by only ~3.6 DPS (~17%), not by the ~7x the anomaly would require.

So the ratio is not an artifact: the Malorne 2pc really is worth roughly **6x**
its own set's 4pc (131.1 vs 21.7) in this simulation. **Hypothesis (ii) is
confirmed, with a measured mechanism**: the 0-piece arm wastes **5.31%** of its
energy income to the cap, and the 2pc's 666,920 extra energy is **98.8%
absorbed** (only 1.2% overflows), converting into **+11.3% Shred casts**
(162,870 -> 181,342). An energy proc on a rotation with spare headroom and a flat
+30 Strength stat stick are simply not comparable currencies. Note also that the
Malorne **hands** are a *negative* stat swap (-6.57) against their non-set
replacement.

**Untested:** energy waste falls with gear quality (5.31% -> 3.21% across the
arms measured), so the 2pc's value plausibly shrinks on later-phase gear. Not
measured.

**Durable finding:** the TBC design intuition that "the 4-piece is the marquee
bonus" is simply false for Malorne Harness as this sim implements it. A gate
asserting `4pc > 2pc` would **reject a correct measurement**. Set-bonus
plausibility bands must key on **mechanism** (proc/resource vs flat stats), not
on piece count - relevant to tickets 97 and 98. Notably the SME's domain
reasoning, which was badly wrong about the 2pc, is a good predictor of the 4pc.
