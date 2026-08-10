# Set-bonus prospective value — verification evidence

Spec: `.scratch/set-bonus-value/spec.md` §5. Binary: `vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe`.
All sims: `iterations=3000`, `randomSeed=42`, `debugFirstIteration=false`, one shared seed, invoked as
`wowsimcli-windows.exe sim --infile <req>.json --outfile <res>.json`.
`se` per sim = `raidMetrics.dps.stdev / sqrt(iterationsDone)`; combined `se` = `sqrt(Σ se_i²)` over all six sims.

---

## V0 — does completion-package synergy measure a real set bonus?

### V0a (as specified): Justicar Battlegear 4pc on the slamaltman fixture — **INVALID PROBE, not a mechanism failure**

Fixture: `test/fixtures/slamaltman.raid-sim-request.json` (ret paladin). Pieces swapped in by bare item id
at SIM_ORDER slots head(0)/shoulder(2)/hands(6)/legs(8): 29073, 29075, 29072, 29074. Chest was left alone
(the fixture wears 30129 Crystalforge Breastplate there; swapping it would entangle a second set).

| arm | dps | stdev | se |
|---|---|---|---|
| base | 2042.8476 | 119.0377 | 2.1733 |
| +29073 (head) | 1964.4859 | 113.7223 | 2.0763 |
| +29075 (shoulder) | 1988.6229 | 117.6355 | 2.1477 |
| +29072 (hands) | 2002.0238 | 119.9095 | 2.1892 |
| +29074 (legs) | 1994.7607 | 118.9949 | 2.1725 |
| +all four (4pc) | 1822.6167 | 113.0967 | 2.0649 |

```
packageDelta = -220.2309
sum singles  = -221.4972
synergy      =    1.2663
se(combined) =    5.2367   (3x = 15.7102)
=> synergy < 3σ : does not clear the bar
```

**The spec's own APL re-check explains this, and it is a fault in the probe choice, not in the formula.**
Per-spell damage aggregated from `raidMetrics.parties[0].players[0].actions[].targets[]` in the `all4`
result shows **spell 20467 (Judgement of Command) is never cast — zero casts, zero damage.** The damage
attributed to judgement comes from **spell 31893 (Judgement of Blood)**: this fixture's APL casts Seal of
Blood (31892) and Judgement (20271), which under Seal of Blood produces Judgement of Blood.

Justicar 4pc is implemented as
`AttachSpellMod{Kind: SpellMod_DamageDone_Flat, FloatValue: 0.10, ClassMask: SpellMaskJudgementOfCommand}`
(see V1 below). With Judgement of Command never cast, that mod has nothing to modify, so the true
synergy of this particular bonus on this particular fixture **is** ≈0. The measured 1.27 ± 5.24 is a
correct measurement of an inert bonus, not a broken measurement.

The same reasoning rules out Lightbringer 4pc as a substitute probe on this fixture: it masks
Hammer of Wrath, and no Hammer of Wrath rank (24239 / 27180) appears in the fixture's APL either.

### V0b (valid probe): Thunderheart Harness 4pc, feral cat — **PASS**

Request built from `data/presets/feral/p2.raid-sim-skeleton.json` with equipment from
`vendor/wowsims/feral_p2_9p.gear.json`. Thunderheart Harness (setId 676) T6 feral 4pc is
`AttachSpellMod{Kind: SpellMod_DamageDone_Flat, FloatValue: 0.15, ClassMask: DruidSpellRip | DruidSpellSwipe | DruidSpellFerociousBite}`
— Rip and Ferocious Bite are core to the cat rotation this skeleton runs, so the bonus actually fires.
Zero Thunderheart pieces are worn in the baseline gear, so the 4-piece package is a clean threshold cross.
Pieces at head(0)/shoulder(2)/hands(6)/legs(8): 31039, 31048, 31034, 31044.

| arm | dps | stdev | se |
|---|---|---|---|
| base | 2226.5350 | 140.2865 | 2.5613 |
| +31039 (head) | 1963.5876 | 191.9643 | 3.5048 |
| +31048 (shoulder) | 2088.9880 | 176.5456 | 3.2233 |
| +31034 (hands) | 2224.9908 | 113.8275 | 2.0782 |
| +31044 (legs) | 2219.6611 | 116.2462 | 2.1224 |
| +all four (4pc) | 1909.2992 | 208.1009 | 3.7994 |

```
packageDelta = -317.2358
sum singles  = -408.9126
synergy      =   91.6768
se(combined) =    7.2451   (3x = 21.7353)
=> synergy = 91.68 > 21.74 : PASS, positive and >3σ
```

**Conclusion: the §2.2 completion-package synergy formula recovers a real, implemented set bonus at a
magnitude far above the noise floor.** The individual pieces are all downgrades against this gear set
(negative singles), yet the package is worth ~92 DPS more than the sum of its parts — which is exactly
the prospective value the feature exists to surface. V0 is satisfied; implementation proceeds.

Note the corollary, which §2.3 already anticipates: a bonus that is implemented but whose gated spell the
character's APL never casts measures ≈0. That is a true answer about a DPS ranking for that character,
and it is reported as a number, not as `unmeasured`.

## V1 — "implemented in sim" table reconciled against the pinned Go source

Source read at pin `8aa378b3671a0923fd11fb34b4b3753e53f20c9b` via
`gh api repos/wowsims/tbc-new/contents/sim/{paladin,druid}/item_sets.go?ref=<pin>`.

| Set | setId | 2pc | 4pc |
|---|---|---|---|
| Justicar Battlegear | 626 | present, but **no effect body** — `2:` only calls `setBonusAura.ExposeToAPL(37186)`; the JotC +15% described in the comment is **not implemented** | implemented: `SpellMod_DamageDone_Flat +0.10`, `ClassMask: SpellMaskJudgementOfCommand` |
| Crystalforge Battlegear | 629 | implemented: `SpellMod_PowerCost_Flat -35` on `SpellMaskJudgement` (mana, not damage) | implemented: 6% group-heal proc on judgement cast (healing, not damage) |
| Lightbringer Battlegear | 680 | implemented: 20% mana proc on melee (mana, not damage) | implemented: `SpellMod_DamageDone_Flat +0.10`, `ClassMask: SpellMaskHammerOfWrath` |
| Malorne Harness | 640 | implemented: 4% proc, +20 energy in cat / +10 rage in bear | implemented: `+30 Strength` on `CatFormAura`, `+1400 Armor` on `BearFormAura` |
| Nordrassil Harness | 641 | **not implemented** — the `Bonuses` map has no `2:` key at all | implemented: `ShredFlatBonus += 75`, `LacerateTickBonus += 3` |
| Thunderheart Harness | 676 | implemented: `SpellMod_PowerCost_Flat -5` on MangleCat, `SpellMod_ThreatMultiplier_Pct +0.15` on MangleBear | implemented: `SpellMod_DamageDone_Flat +0.15` on `Rip \| Swipe \| FerociousBite` |

**Reconciliation against `research.md`:** the table agrees on every row except one correction —
research.md records Justicar **2pc** as "Yes (JotC dmg +15%, but only via `ExposeToAPL`)". The source at
the pin shows the `2:` closure has **no** `AttachSpellMod` / `AttachProcTrigger` / `AttachStatBuff` body
at all; it is a bare `ExposeToAPL(37186)` call. **Justicar 2pc is therefore `not-implemented-in-sim`**,
in the same class as Nordrassil 2pc. Implementations must treat both that way.

**research.md's open `ExposeToAPL` question is resolved: `ExposeToAPL` does not gate the bonus.**
Everywhere a bonus has a real effect, that effect is installed by `AttachSpellMod(...)` /
`AttachProcTrigger(...)` / `AttachStatBuff(...)` on the set bonus aura, and `ExposeToAPL(id)` is chained
onto the returned aura purely as metadata (e.g. Justicar 4pc:
`setBonusAura.AttachSpellMod(...).ExposeToAPL(37187)`). V0b confirms this empirically: Thunderheart 4pc
carries no `ExposeToAPL` call at all and still measured +91.68 DPS of synergy.

Sets with **no** DPS-relevant, implemented bonus, and the reason each is unmeasurable or ≈0:

- Justicar 626 2pc — `not-implemented-in-sim` (empty closure).
- Nordrassil 641 2pc — `not-implemented-in-sim` (absent map key).
- Crystalforge 629 2pc and 4pc — implemented, but mana-cost and healing respectively; measure ≈0 on a
  DPS ranking and are **reported as measured numbers**, not as `unmeasured` (spec §2.3).
- Lightbringer 680 2pc — implemented mana proc; same treatment, measure and report.

## V2 — determinism (post-implementation)

_Filled in by Slice B: same input, same seeds, two runs, identical `setBonuses`._
