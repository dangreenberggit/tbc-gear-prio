# Thunderheart (T6) set bonuses measured in isolation — 2026-08-10

Ticket: `.scratch/carry-forward/issues/99-measure-set-bonuses-in-isolation-on-a-reference-set.md`
Script: `.scratch/set-bonus-value/measure_set_bonus.py`
Raw output: `.scratch/set-bonus-value/measurements-2026-08-10.json`
Per-sim results: `.scratch/set-bonus-value/sims/<label>-<seed>.json`

**Headline:** T6 4pc = **73.5 ± 6.3 DPS**, 2pc = **30.5 ± 5.5 DPS**, total = **104.0 ± 7.9 DPS**,
measured on the P3 feral reference set. The 4pc falls **inside** ticket 97's
independently-derived 60–120 band (centre ~95), and is **~2.6× smaller** than the
engine's reported 193.89.

## Re-run

```
pnpm fetch:wowsimcli    # already present at vendor/wowsimcli-v0.0.101-win32-x64/
python .scratch/set-bonus-value/measure_set_bonus.py
python .scratch/set-bonus-value/measure_set_bonus.py --guard-only   # guard sim alone
```

wowsimcli `v0.0.101`. Seeds `[11,22,33,44,55]`, 3000 iterations, 11 arms = 55 sims.

## Setup

- **A-side / reference:** `vendor/wowsims/feral_p3_9p.gear.json`, as committed. All
  four Thunderheart pieces equipped (shoulder 31048, chest 31042, hands 31034, legs 31044).
- **Skeleton:** `data/presets/feral/p2.raid-sim-skeleton.json`. This is the **p2**
  skeleton — no `p3.raid-sim-skeleton.json` exists for feral, and `cli.ts:282`
  loads the `p2` path for every phase (`data/presets/${args.spec}/p2.raid-sim-skeleton.json`).
  So the P3 gear is simmed against the p2 buff/encounter settings, which is what
  the production pipeline also does.
- **B-side:** 32377 Mantle of Darkness, 32252 Nether Shadow Tunic, 32347 Grips of
  Damnation, 32271 Kilt of Immortal Nature. All re-verified `setName=None`,
  `setId=None`, `armorType=2` (leather) against `vendor/wowsims/db.json` at run
  time by the script itself, which aborts if any is a set piece.
- **Gems:** the reference set gems every tier socket with 32194 (+8 agi). Each
  B-side item is gemmed with 32194 up to **its own** socket count.

### Guard sim (mandatory pre-check)

A4 unmodified = **2441.74 DPS** (per-seed 2441.92 / 2441.82 / 2441.73 / 2441.57 /
2441.67), inside the required 2000–2600 P3 feral band. Gear injection shape is
therefore sound: the gear.json `{id, enchant, gems}` entries drop into
`raid.parties[0].players[0].equipment.items` after the same `toProtoItem`
normalisation `compose.ts:45-51` applies. The ticket flagged this compatibility
as untested; it is now tested and holds.

For scale: the shredzepelin-p3 artifact baseline is 2152.1 on a *different* gear
set, so 2441.7 on the upstream 9p BiS set is the right order.

## Per-arm DPS

| arm | slots replaced with B-side | seed 11 | 22 | 33 | 44 | 55 | mean | spread | SE |
|---|---|---|---|---|---|---|---|---|---|
| A4 | none (as committed) | 2441.92 | 2441.82 | 2441.73 | 2441.57 | 2441.67 | **2441.74** | 0.35 | 2.76 |
| A2 | hands, legs | 2337.15 | 2337.16 | 2337.16 | 2337.01 | 2337.09 | **2337.12** | 0.15 | 1.90 |
| A0 | all four | 2216.96 | 2217.17 | 2216.83 | 2216.92 | 2216.89 | **2216.95** | 0.34 | 2.52 |
| S_shoulder | shoulder | 2319.41 | 2319.52 | 2319.53 | 2319.12 | 2319.34 | 2319.38 | 0.41 | 2.82 |
| S_chest | chest | 2332.96 | 2332.71 | 2332.45 | 2332.40 | 2332.26 | 2332.56 | 0.70 | 3.08 |
| S_hands | hands | 2342.54 | 2342.46 | 2342.60 | 2342.34 | 2342.50 | 2342.49 | 0.26 | 3.12 |
| S_legs | legs | 2351.63 | 2351.73 | 2351.57 | 2351.72 | 2351.60 | 2351.65 | 0.16 | 1.72 |
| R_shoulder | chest, hands, legs | 2271.41 | 2271.27 | 2271.12 | 2270.86 | 2270.86 | 2271.10 | 0.55 | 2.03 |
| R_chest | shoulder, hands, legs | 2252.33 | 2252.42 | 2252.65 | 2252.54 | 2252.44 | 2252.48 | 0.32 | 1.92 |
| R_hands | shoulder, chest, legs | 2243.83 | 2243.88 | 2243.87 | 2243.79 | 2243.92 | 2243.86 | 0.14 | 2.00 |
| R_legs | shoulder, chest, hands | 2221.54 | 2221.42 | 2220.98 | 2220.85 | 2220.93 | 2221.14 | 0.69 | 3.42 |

Seed-to-seed spread is **0.14–0.70 DPS** on every arm — two orders of magnitude
below the effects being measured. The binding noise term is the reported
per-arm SE (`stdev/√iterations`, ~1.7–3.4 DPS), not seed choice.

## The ticket's `Σ singles` is confounded — finding, and a correction

Ticket 99 §"The exact comparisons" specifies `single_i` as **one slot swapped off
the A4 reference**. Run that way, the ladder returns:

```
4pc_increment    =  -84.72 DPS
2pc_increment    = -111.39 DPS
total_set_value  = -196.10 DPS
```

Negative by ~13 SE — far outside noise, and exactly the "suspect, investigate
rather than accept" outcome the ticket warns about. **Cause:** each `S_*` arm
drops the set from 4 pieces to 3, which destroys the 4pc bonus. So every
`single_i` already contains the entire 4pc loss on top of the stat difference.
Summing four of them subtracts the 4pc bonus roughly four times. This is
ticket 90's break confound reintroduced by the *subtraction shape* itself — the
very thing ticket 99 exists to eliminate. **The `Σ singles` term does not
escape it just because neither side wears Malorne.**

**Correction used here:** measure each swap's stat cost where **no set-count
boundary is crossed**. The `R_*` arms restore one tier piece onto the all-B-side
set (count 0 → 1, below the 2pc threshold), so the delta is raw stats only.

| slot | clean stat cost (off A0) | confounded single (off A4) | difference |
|---|---|---|---|
| shoulder | 54.15 | 122.36 | 68.2 |
| chest | 35.52 | 109.19 | 73.7 |
| hands | 26.90 | 99.25 | 72.4 |
| legs | 4.19 | 90.09 | 85.9 |

The clean costs (4–54 DPS) are the plausible size for a 5-ilvl leather
downgrade. The confounded ones (90–122) are not. The gap in every row is ~68–86
DPS — i.e. the 4pc bonus itself, appearing once inside each single, which
independently corroborates the ~73.5 figure below.

## Derived bonuses

```
4pc_increment   = (D(A4) - D(A2)) - (stat_hands + stat_legs)
2pc_increment   = (D(A2) - D(A0)) - (stat_shoulder + stat_chest)
total_set_value = (D(A4) - D(A0)) - Σ all four stat costs
```

| quantity | value | 1 SE band | signal/noise |
|---|---|---|---|
| **T6 4pc** | **73.54 DPS** | ± 6.30 | 11.7 σ |
| **T6 2pc** | **30.49 DPS** | ± 5.53 | 5.5 σ |
| **total (4pc + 2pc)** | **104.03 DPS** | ± 7.93 | 13.1 σ |

Bands propagate the per-arm reported SE in quadrature across the arms entering
each expression. All three are comfortably above noise; none needs the "smaller
than noise" caveat. `73.54 + 30.49 = 104.03` closes exactly, as it must.

## Sanity verdict

**The measured 4pc falls inside ticket 97's mechanics band and well below the
engine's reported figure.**

| source | T6 4pc | verdict |
|---|---|---|
| engine `computeSynergy` | 193.89 (~9% of 2152) | **~2.6× too high** |
| ticket 97 mechanics band | 60–120, centre ~95 | measurement lands inside, low side |
| **this measurement** | **73.5 ± 6.3** | — |

Directional conclusions:

1. **The 4pc is real and clearly positive.** Not worthless, not negative. That is
   consistent with upstream's P3 BiS equipping all four Thunderheart pieces, and
   the negative first-pass result was a measurement artefact, not a finding.
2. **193.89 is inflated, by roughly 120 DPS.** This corroborates ticket 90's
   thesis that the reported figure is entangled with a break toll — and the
   inflation is the right order for the Malorne 2pc break the package causes.
   Whether 90's specific single-scalar `(k−1)·B` model reproduces the gap is
   *not* settled here (**hypothesis, untested**: it would need 92's `B`).
3. **Ticket 97's band survives**, though the truth sits nearer its lower bound
   than its ~95 centre. No need to go looking at 97's unverified
   hand-transcription (`verification.md` V1) on this evidence.
4. **The 2pc at 30.5 is close to the artifact's reported 31.46.** The 2pc figure
   was apparently much less contaminated than the 4pc — consistent with the
   break confound loading onto the 4pc term, which is where `computeSynergy`
   subtracts twice.

## Caveats

- **5-ilvl deficit on the B-side (146 → 141), as the ticket specifies.** No
  ilvl-146 non-set leather exists in these slots; the only ilvl-146 alternatives
  are Vengeful Gladiator pieces (setId 584), which would activate *that* set. The
  `stat_cost` terms are meant to absorb the deficit, and do so cleanly here.
- **Socket-count mismatch is absorbed but not eliminated.** shoulder −2 sockets,
  hands −1, legs +2, chest ±0 versus their tier counterparts. Each B-side item is
  gemmed to its own socket count, so the socket delta lands inside the measured
  `stat_cost` rather than leaking into the bonus. The first run of this script
  left B-side sockets empty and mis-priced the singles as a result; that bug is
  fixed. The net socket delta across all four is −1, so residual leakage is small
  and would if anything *understate* the bonus slightly.
- **p2 skeleton on p3 gear** (see Setup). Matches production behaviour but is not
  a phase-matched encounter.
- **Reference-gear scope limit (ticket 99's own §"Scope limit").** 73.5 DPS is the
  4pc's value **on the `feral_p3_9p` reference set**, not for any particular
  character. A bonus that scales with AP/haste/crit is worth more on better gear.
  Use this figure for cross-set comparison, plausibility gating (ticket 98), and
  falsifying model-derived corrections — **not** as a constant in `set-value.ts`
  and not as a per-character prediction.
- **Malorne not measured.** Ticket 99 §"What this settles" item 1 asks for the
  same recipe applied to Malorne on a phase-appropriate (ilvl-120-era) reference
  set. Out of scope for this run; the factor-of-4 dispute about `B` (~116–133 vs
  15–40) remains open.
- The `R_*` arms are an addition to the ticket's specified ladder, not a
  substitution — the ticket's `S_*` arms were all run and are reported above so
  the confound is auditable rather than merely asserted.

---

## Adversarial review of this run (2026-08-10, orchestrator + sharp reviewer)

An adversarial pass re-derived every figure above from the raw JSON and tried to
break them. Outcome: **the method and the two headline numbers survive; one
downstream inference by the orchestrator was refuted and is retracted here.**

### Survives

- **The `Σ singles` double-count finding** (ticket 99's own formula is wrong).
  Confirmed: each `S_*` arm drops the set 4→3 and so carries the whole 4pc.
- **4pc = 73.5 ± 6.3 DPS, 2pc = 30.5 ± 5.5 DPS.** Arithmetic reproduced exactly.
- **Cross-slot consistency test** — the sharpest available check. If the model
  holds, `(A4 − S_x) − (R_x − A0)` estimates the 4pc independently for each slot:

  | slot | implied 4pc |
  |---|---|
  | shoulder | 68.21 |
  | chest | 73.67 |
  | hands | 72.35 |
  | legs | 85.90 |

  Mean 75.03, sd 7.61, against ~5.2 DPS per-estimate SE. Consistent.
- **Request parity.** All 55 `.req.json` files hash identically once equipment and
  `simOptions` are stripped — buffs, consumes, talents, APL, encounter provably
  identical across arms. `iterationsDone == 3000` on all 55.

### Retracted

- **`B = 193.89 − 73.54 = 120.35` is INVALID.** It subtracts a Thunderheart 4pc
  measured on the `feral_p3_9p` reference (~2442 DPS, no Malorne worn) from one
  measured on the shredzepelin character (~2152 DPS, 2 Malorne worn). The 4pc is a
  **multiplicative** modifier (`SpellMod_DamageDone_Flat +0.15` on
  `Rip|Swipe|FerociousBite`, `sim/druid/item_sets.go:241-247`), so its DPS value
  genuinely differs between two characters with a ~290 DPS gap. The residual is
  contaminated by that baseline mismatch and is **not** a Malorne 2pc.
  **`B` remains unmeasured by this run**; see the Malorne section for the direct
  measurement.
- The 2pc's agreement with the engine's 31.46 is **"consistent within ±5 DPS"**,
  not "agrees within 1 DPS". Both carry ~4–5 DPS error bars; the last-digit match
  is luck. It is real corroboration of the method, at that precision.

### Known defect in this run's B-side selection

**32271 Kilt of Immortal Nature (legs B-side) is a healer item** — Int +42,
HealingPower +118, SpellDamage +37, MP5 +10, losing Str 53 / Agi 21 / hit 27
against the tier legs. That is why `R_legs − A0 = 4.19`, the smallest stat price
by ~6x, and why legs is the outlier slot above. The selection step
(`measure_set_bonus.py:75-92`) only checked `setName is None`, never "is this a
melee item". Excluding legs, the other three slots agree at 71.4.

Re-run command unchanged; a corrected run should pick a melee/feral legs
replacement and re-check the per-slot spread.

### Damage share — closes ticket 97's biggest sourcing gap

Ticket 97's ~60–120 band rests on a recalled "~30% Rip+Bite damage share", which
its own source flagged as "the single number most worth replacing with a real
breakdown". Measured from this run's own output:

```
python -c "
import json
d=json.load(open('.scratch/set-bonus-value/sims/A4-11.json'))
p=d['raidMetrics']['parties'][0]['players'][0]
tot=0; buffed=0
for a in p['actions']:
    sid=a['id'].get('spellId',0)
    dmg=sum(t.get('damage',0)+t.get('tickDamage',0) for t in a.get('targets',[]))
    tot+=dmg
    if sid in (27008,24248,27006): buffed+=dmg
print(f'{buffed/tot*100:.2f}%')"
```

| ability | share of total damage |
|---|---|
| Shred | 35.30% |
| white melee | 28.96% |
| **Rip** | **21.18%** (buffed) |
| **Ferocious Bite** | **8.99%** (buffed) |
| Mangle (Cat) | 5.49% |
| Swipe | 0.00% (absent from APL) |

**Rip + Ferocious Bite + Swipe = 30.16%** — the recalled ~30% is confirmed by
measurement. Swipe is absent from the APL entirely, verified independently:
`python -c "import json,re; s=open('vendor/wowsims/feral_default.apl.json').read(); print(sorted(set(int(x) for x in re.findall(r'\"spellId\"\s*:\s*(\d+)',s))))"`
returns no 27006.

Naive prediction from that share, `0.15 × 30.16% × 2441.74 ≈ 110 DPS`, sits above
the measured 73.5. The gap is expected rather than contradictory — the +15% applies
to Rip's and Bite's *base* damage while a large share of their observed damage is
crit-inflated and buffed by other multipliers, so a flat share-times-modifier
estimate overshoots. **Labelled reasoning, not measurement.** The measured 73.5
still lands inside ticket 97's 60–120 band.

### Set-bonus mechanics verified against the pin (closes ticket 97's other gap)

`verification.md` V1's hand-transcription was diffed against the pinned Go source
at the recorded commit. `.scratch/wowsims-tbc-new-src` is at
`8aa378b3671a0923fd11fb34b4b3753e53f20c9b`, matching `data/wowsims.lock.json`.

```
cd .scratch/wowsims-tbc-new-src && git rev-parse HEAD
sed -n '77,116p;222,250p' sim/druid/item_sets.go
```

- **Thunderheart (676) 4pc** — `SpellMod_DamageDone_Flat +0.15` on
  `DruidSpellRip | DruidSpellSwipe | DruidSpellFerociousBite`. Transcription
  **accurate**.
- **Thunderheart 2pc** — Mangle (Cat) `PowerCost_Flat −5`, Mangle (Bear) threat
  `+15%`. Accurate.
- **Malorne (640) 2pc** — 4% chance on `ProcMaskMelee`, `OutcomeLanded`, +20
  energy in Cat / +10 rage in Bear. **`ProcMaskMelee` is
  `ProcMaskMeleeWhiteHit | ProcMaskMeleeSpecial` (`sim/core/flags.go:78`), and the
  trigger carries NO internal cooldown** — so melee specials (Shred, Mangle, Rip,
  Ferocious Bite) roll it too, not just white swings. The SME's ~2.5 procs/min
  figure assumed white-only and is therefore **too low**.
- **Malorne 4pc** — +30 Strength in Cat Form. Accurate.

**Update after the direct Malorne measurement:** `B` was subsequently measured at
**131.1 ± 6.6 DPS** (see the Malorne section below), so the SME's 15–40 band is
refuted. However the proc-mask mechanism above turned out **not** to explain the
magnitude: the measured proc rate is only **3.66/min**, barely above the SME's
assumed ~2.5/min. The mask correction moves the estimate up but nowhere near 131.
The gap between 131 and the same set's 4pc (18.04) is an **unresolved anomaly**,
not an explained one.

---

# Malorne Harness (T4) 2pc measured in isolation — 2026-08-10

Ticket: `.scratch/carry-forward/issues/92-measure-malorne-2pc-to-de-confound-break-savings.md`
Script: `.scratch/set-bonus-value/measure_malorne.py`
Raw output: `.scratch/set-bonus-value/measurements-malorne-2026-08-10.json`
Per-sim results: `.scratch/set-bonus-value/sims-malorne/<label>-<seed>.json`

**Headline: `B` = Malorne 2pc = 131.10 ± 6.60 DPS (1 SE), 19.9 σ.**
This **supports the regression camp (100–133)** and **refutes the SME domain
estimate (15–40)** by roughly a factor of 4. The measurement is structurally
clean, but it carries a genuine unresolved tension against tier-tuning
intuition, stated in full below rather than smoothed over.

## Re-run

```
python .scratch/set-bonus-value/measure_malorne.py --guard-only   # guard sim alone
python .scratch/set-bonus-value/measure_malorne.py                # full ladder
```

wowsimcli `v0.0.101` (`vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe`).
Seeds `[11,22,33,44,55]`, 3000 iterations, 4 arms = 20 sims.

## Setup

- **Reference set:** `vendor/wowsims/feral_p2_9p.gear.json`, as committed. Phase-matched
  (T4 era), unlike the Thunderheart run above which simmed P3 gear.
- **Skeleton:** `data/presets/feral/p2.raid-sim-skeleton.json` — phase-matched here.
- **Exactly two Malorne pieces**, asserted by the script at run time (it aborts
  otherwise): index 2 = 29100 Mantle of Malorne, index 4 = 29096 Breastplate of
  Malorne, both setId 640. 29097 (hands) and 29099 (legs) are not equipped, so
  only the 2pc is live and the 4pc never enters the ladder.

### B-side items (chosen, verified, and reported per the ticket)

Both re-verified at run time against `vendor/wowsims/db.json` as `setName=None`,
`setId=None`, `armorType=2` (leather); the script raises and aborts if either is
a set piece. Stat ids decoded against `data/proto/common.proto` `enum Stat`
(17=AttackPower, 18=RangedAttackPower, 20=MeleeHitRating, 21=MeleeCritRating,
31=**Armor**, 32=**BonusArmor** — note 31 is armor, *not* attack power).

| slot | A-side (Malorne) | ilvl | B-side | ilvl | sockets |
|---|---|---|---|---|---|
| shoulder | 29100 Mantle of Malorne | 120 | **28755 Bladed Shoulderpads of the Merciless** | 115 | 2 → 2 |
| chest | 29096 Breastplate of Malorne | 120 | **30730 Terrorweave Tunic** | 120 | 3 → 3 |

DPS-relevant stat lines:

| slot | Malorne | B-side |
|---|---|---|
| shoulder | Str 33, Agi 27, Sta 25, Int 9 | AP 58, RAP 58, hit 13, crit 21, Sta 30 |
| chest | Str 33, Agi 34, Sta 36, Int 13 | AP 96, RAP 96, hit 21, crit 25 |

Neither B-side item has Intellect, HealingPower, or SpellDamage as a main stat —
both are melee/feral-appropriate AP/hit/crit leather. This avoids the healer-item
defect that skewed the legs slot (32271) in the Thunderheart run above.

**Socket and socket-bonus parity is exact in this run**, which was uncontrolled
previously: shoulder 2 → 2 sockets, chest 3 → 3 sockets (delta +0 on both), and
the nonzero socket bonuses match in magnitude too (shoulder 3 vs 3, chest 4 vs 4).
Each B-side item is gemmed to its own socket count with 24028 (+8 agi), the same
gem the reference set uses in the Malorne sockets, so no gem value is charged to
the bonus.

### Guard sim

M2 unmodified = **2226.75 DPS**, inside the 1700–2400 P2 feral band. Gear
injection shape is sound.

## The ladder (designed to cross no bonus threshold)

Per the ticket's methodology warning: a swap that takes the set 2 → 1 destroys
the 2pc and so cannot price stats. The `R_*` arms instead restore ONE Malorne
piece onto the all-B-side configuration (0 → 1 piece), which crosses no
threshold, so their delta is raw stats only.

| arm | Malorne pieces | slots replaced | seed 11 | 22 | 33 | 44 | 55 | mean | spread | SE |
|---|---|---|---|---|---|---|---|---|---|---|
| M2 | 2 (2pc ACTIVE) | none | 2227.08 | 2226.97 | 2226.81 | 2226.49 | 2226.40 | **2226.75** | 0.67 | 2.56 |
| M0 | 0 | shoulder, chest | 2048.53 | 2048.54 | 2048.69 | 2048.50 | 2048.67 | **2048.59** | 0.19 | 3.53 |
| R_shoulder | 1 | chest | 2071.67 | 2071.73 | 2071.84 | 2071.65 | 2071.47 | **2071.67** | 0.37 | 3.56 |
| R_chest | 1 | shoulder | 2072.32 | 2072.71 | 2072.91 | 2072.49 | 2072.40 | **2072.56** | 0.59 | 3.45 |

Seed-to-seed spread is 0.19–0.67 DPS. **Spread is not the error bar** — the
binding noise term is the per-arm reported SE (`stdev/√iterations`, 2.6–3.6 DPS).

### Threshold-crossing verified empirically, not just asserted

Each result JSON carries a per-player `resources` array. **M2 has 19 resource
streams; M0, R_shoulder and R_chest each have 18.** The extra stream in M2 is the
2pc energy proc. This directly confirms the bonus is live in exactly one arm and
absent from the other three — the `R_*` arms really are bonus-free, so their
deltas are stat-only.

Re-check:
```
python -c "import json;[print(l,len(json.load(open(f'.scratch/set-bonus-value/sims-malorne/{l}-11.json',encoding='utf-8'))['raidMetrics']['parties'][0]['players'][0]['resources'])) for l in ('M2','M0','R_shoulder','R_chest')]"
```

## Derived

```
stat_shoulder = D(R_shoulder) - D(M0) =  23.09
stat_chest    = D(R_chest)    - D(M0) =  23.98
gross         = D(M2)         - D(M0) = 178.16
B = gross - (stat_shoulder + stat_chest) = 131.10
```

Since `B = M2 + M0 - R_shoulder - R_chest`, the 1 SE band propagates those four
arm SEs in quadrature: **± 6.60 DPS**.

| quantity | value | 1 SE | signal/noise |
|---|---|---|---|
| shoulder stat cost | 23.09 | — | — |
| chest stat cost | 23.98 | — | — |
| gross (M2 − M0) | 178.16 | — | — |
| **Malorne 2pc `B`** | **131.10** | **± 6.60** | **19.9 σ** |

## Verdict on the factor-of-4 dispute

**The sim supports the regression camp.** 131.10 ± 6.60 sits at the top of the
regression's 100–133 range and is within 0.2 DPS of the slot-intercept estimates
(chest −133.4, shoulder −131.0 from `worn-set-double-count-trace.md`) — an
agreement close enough to be striking given those were fitted by a completely
independent method. The SME's 15–40 band is excluded at more than 13 σ.

Per the orchestrator's correction, this is compared **only** to the two original
camps. The `193.89 − 73.54 = 120.35` subtraction was retracted as invalid
(cross-character baseline mismatch) and is deliberately not used here as
corroboration.

## Tension that this measurement does NOT resolve — flagged, not smoothed

The ticket asks explicitly whether a `B` near 120–130 is credible. Honest answer:
**the number is solid but two of the SME's ratio arguments survive it intact.**

1. **Against its own 4pc.** Malorne 4pc = +30 Str in Cat Form, engine-measured at
   18.04 DPS. B = 131.10 makes the **2pc worth 7.3× its own set's 4pc**. TBC tier
   sets are not tuned that way — the 4-piece is normally the marquee bonus. This
   is a real anomaly and it is not explained away by the proc mask.
2. **Against Thunderheart's 2pc** (30.49 DPS measured in the run above, on
   different gear so not directly comparable): the T4 2pc would beat the T6 2pc
   by ~4.3×, backwards for tier progression.
3. **Against total damage:** 131.10 is 5.9% of this arm's 2226.75 baseline, from
   a single T4 two-piece bonus.

### Energy accounting — a partial, and only partial, mechanical defence

From `M2-11.json`, the 2pc proc stream delivers **219.7 energy per 180s iteration
= 73.2 energy/min = 3.66 procs/min**. Verified from the source at
`.scratch/wowsims-tbc-new-src/sim/druid/item_sets.go` (ItemSetMalorneHarness):
4% on `ProcMaskMelee` (white **and** specials), `OutcomeLanded`, **no ICD**,
+20 energy in Cat Form.

So the measured proc rate (3.66/min) is close to the SME's assumed ~2.5/min —
the specials-included proc mask raises it, but only modestly, **not** by the 4×
the DPS gap would need. Against a cat's ~600 energy/min budget this is a ~12%
energy increase, which the sim converts into a 5.9% DPS increase (roughly
half-efficiency, consistent with an energy-limited rotation).

**That is the crux and it is genuinely unresolved:** a ~12% energy income
increase producing 131 DPS is arithmetically coherent *within this sim*, and the
threshold check proves the arms are clean, so the measurement stands as what the
engine does. But it does not by itself explain why this engine values a T4 2pc at
7.3× that same set's 4pc. **Hypothesis, untested:** either the engine's cat APL
is unusually energy-starved on this P2 gear (making marginal energy
disproportionately valuable), or the +30 Str 4pc figure of 18.04 is itself
understated. Distinguishing those needs a further measurement and is not settled
here.

## Caveats

- **Reference-gear scope limit.** 131.10 is `B` **on the `feral_p2_9p` reference
  set**, not a universal constant and not a per-character prediction. An
  energy-throughput bonus is worth more the more the rotation is energy-limited,
  so this figure should not be pasted into `set-value.ts` as a constant.
- **Shoulder B-side is 5 ilvl light (115 vs 120).** No socketed ilvl-120 non-set
  leather shoulder exists in `db.json` (checked: the only ilvl-120 leather
  shoulder, 24804 Dragonhawk Shoulderguards, has 0 sockets and no melee stats).
  Socket parity was preferred over ilvl parity because the `stat_cost` arms
  absorb an ilvl deficit cleanly but an uncontrolled socket delta leaks gem value
  into the bonus. The chest B-side is exactly ilvl 120.
- **Stat-kind mismatch is absorbed, not eliminated.** Malorne pays in Str/Agi
  (which feral multipliers amplify) and the B-side pays in flat AP/hit/crit. The
  `R_*` arms price exactly this difference, so it lands in `stat_cost` rather than
  in `B` — but the two sides are not stat-identical, which is what the ticket's
  ideal "stat-identical swap" would have required and no real item provides.
- The 2pc value here is measured with the 4pc **never active** in any arm, so no
  4pc contamination is possible in either direction.

---

# Malorne Harness (T4) **4pc**, measured directly — 2026-08-10

Follow-up to the 2pc measurement above (`B = 131.10 +/- 6.60 DPS`). That result
left an anomaly: 131 DPS makes the 2pc worth ~7.3x the same set's own 4pc, which
the engine reports at 18.04 DPS — backwards for TBC tier tuning. Two hypotheses
were recorded: **(i)** the 18.04 figure is understated/confounded, or **(ii)**
this P2 gear runs an energy-starved cat rotation that inflates any energy bonus.

**Verdict: (ii), decisively. The 18.04 figure is very close to correct.**

## Re-run commands

```
python .scratch/set-bonus-value/measure_malorne_4pc.py           # the ladder
python .scratch/set-bonus-value/measure_malorne_4pc.py --guard-only
python .scratch/set-bonus-value/price_strength.py                # the cross-check
```

Binary `vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe` (`wowsimcli
v0.0.101`), gear `vendor/wowsims/feral_p2_9p.gear.json`, skeleton
`data/presets/feral/p2.raid-sim-skeleton.json`, seeds `[11,22,33,44,55]`,
3000 iterations. Raw JSON under `.scratch/set-bonus-value/sims-malorne-4pc/`;
summaries in `measurements-malorne-4pc-2026-08-10.json` and
`measurements-strength-price-2026-08-10.json`.

## Ladder design — why these arms

The rule is: **never price a stat swap across a configuration where the number
of ACTIVE set bonuses changes.** The reference file equips exactly two Malorne
pieces as committed (index 2 = 29100 shoulder, index 4 = 29096 chest). The
remaining two Malorne pieces are 29097 hands (index 6, currently 29947 Gloves of
the Searing Grip) and 29099 legs (index 8, currently 28741 Skulker's Greaves).
Both Malorne pieces have **zero sockets**, so no gem-parity adjustment applies
to them; the B-side shoulder/chest replacements are gem-filled with 24028 to
socket-count parity as in the 2pc run.

| arm | configuration | Malorne pieces | bonuses live |
|-----|---------------|----------------|--------------|
| `M2` | as committed | 2 | 2pc |
| `M4` | `M2` + hands 29097 + legs 29099 | 4 | 2pc **and** 4pc |
| `M0` | shoulder -> 28755, chest -> 30730 | 0 | none |
| `H1` | `M0` + hands 29097 | 1 | none |
| `L1` | `M0` + legs 29099 | 1 | none |

- `M4 - M2` crosses **only** the 4-piece threshold. The 2pc is live on both
  sides, so it cancels exactly. This is the gross value of the 4pc plus the raw
  stats of the two swapped-in items.
- `H1 - M0` and `L1 - M0` each go **0 -> 1 piece**, crossing *no* threshold, so
  each is the pure raw-stat value of putting that one Malorne item into that
  slot. This is the arm design the brief flagged as defensible, and it is the
  reason a "0 -> 2 pieces" shortcut was rejected: that would cross the 2pc
  threshold and re-contaminate the answer.

Therefore `B4 = (M4 - M2) - (H1 - M0) - (L1 - M0)`.

`B4` expands to `M4 - M2 - H1 - L1 + 2*M0`, so `M0` enters with weight 2 and its
variance with weight 4 in the error combination.

## Threshold-state verification (empirical, not assumed)

Same method as the 2pc run: the T4 2pc energy proc opens an **extra Energy
resource stream, spellId 37311**. Counting the player's `resources` array
(seed 11) proves which bonuses are live rather than assuming it.

| arm | pieces | `resources` len | 37311 stream | 37311 energy gain |
|-----|--------|-----------------|--------------|-------------------|
| `M0` | 0 | 18 | absent | — |
| `H1` | 1 | 18 | absent | — |
| `L1` | 1 | 18 | absent | — |
| `M2` | 2 | **19** | **present** | 666,920 |
| `M4` | 4 | **19** | **present** | 663,300 |

This is exactly the intended state: the 2pc is off in the three stat-pricing
arms and on in both arms of the gross difference, so it cancels.

**The 4pc adds no aura and no resource stream.** Diffing each arm's aura key set
against `M0` yields the empty set for all four other arms, and `M4` has the same
19 streams as `M2`. The Malorne 4pc is **+30 Strength** — a flat stat bonus, not
a proc. That is the mechanical reason it is small, and it is what makes the
cross-check below possible.

## Results

Per-arm SE is the sim's own reported per-iteration stdev / sqrt(3000), i.e. ~2.5
to 3.5 DPS. The seed **spread** is ~0.03 to 0.77 DPS and is **not** quoted as the
error bar — the seeds are shared across arms and heavily correlated, so spread
understates true uncertainty by an order of magnitude.

| arm | seed 11 | seed 22 | seed 33 | seed 44 | seed 55 | mean | spread | SE |
|-----|---------|---------|---------|---------|---------|------|--------|-----|
| `M2` | 2227.08 | 2226.97 | 2226.81 | 2226.49 | 2226.40 | **2226.75** | 0.67 | 2.56 |
| `M4` | 2249.60 | 2249.61 | 2249.61 | 2249.62 | 2249.63 | **2249.61** | 0.03 | 1.82 |
| `M0` | 2048.53 | 2048.54 | 2048.69 | 2048.50 | 2048.67 | **2048.59** | 0.19 | 3.53 |
| `H1` | 2041.60 | 2041.93 | 2042.37 | 2042.25 | 2041.95 | **2042.02** | 0.77 | 3.46 |
| `L1` | 2065.03 | 2065.15 | 2064.97 | 2065.03 | 2064.88 | **2065.01** | 0.27 | 3.24 |

`M2` reproduces the 2pc run's 2226.750 mean to the digit — the request is
byte-identical, so that arm is a genuine re-run and not a re-use.

Derived:

| quantity | value |
|----------|-------|
| hands 29097 raw stat value (`H1 - M0`) | **-6.57** DPS |
| legs 29099 raw stat value (`L1 - M0`) | **+16.42** DPS |
| gross (`M4 - M2`) | **+22.87** DPS |
| **`B4` = Malorne 4pc** | **+13.01 DPS +/- ~9.06 (1 SE)** |

Signal/noise 1.44 sigma. The ladder alone is consistent with the engine's 18.04
but does not on its own distinguish 13 from 18 from 25. (The hands going
*negative* is not an error: Gauntlets of Malorne are itemised with Intellect and
Bonus Armor, and they replace 29947 Gloves of the Searing Grip which carry 66
AP + 66 RAP + hit — a straight downgrade for a cat outside the set bonus.)

## Cross-check: pricing Strength directly

Because the threshold probe established the 4pc is a flat +30 Strength with no
proc, its entire value is whatever 30 Strength is worth on this gear. That can be
measured far more precisely than the ladder, via the request's
`bonusStats.stats[0]` (index 0 = Strength, per `data/proto/common.proto`), on
the **unmodified** `M2` reference set — no item swapped, Malorne count never
changes, no threshold moves at all. Command: `python
.scratch/set-bonus-value/price_strength.py`.

| bonus Strength | mean DPS | delta | DPS/Str | implied 30 Str |
|----------------|----------|-------|---------|----------------|
| +0 | 2226.75 | — | — | — |
| +30 | 2248.43 | +21.68 | 0.7227 | **21.68** |
| +150 | 2335.15 | +108.40 | 0.7227 | **21.68** |
| +300 | 2443.55 | +216.80 | 0.7227 | **21.68** |

Strength is **exactly linear** across a 10x range — 0.7227 DPS/Str at all three
deltas, agreeing to four decimal places. This is a clean, high-confidence
number, and it lands within 1 sigma of the ladder's 13.01 +/- 9.06.

**The Malorne 4pc is worth ~21.7 DPS on this gear.** The engine's reported 18.04
is understated by roughly 3.6 DPS (~17%) — a real but minor discrepancy, plausibly
a difference in which reference configuration the engine prices it against. It
is emphatically **not** the ~131 DPS that would be needed to make the 2pc:4pc
ratio look conventional.

## Rotation diagnostics — why the 2pc is so large

Energy income is fixed (`OtherActionEnergyRegen` gain = 5,699,380 in every arm),
but the sim reports both `gain` and `actualGain`, and the difference is energy
**wasted to the 100-energy cap**. Totalled across all Energy-gain streams
(regen + Tiger's Fury 768 + refunds + the 37311 proc), seed 11:

| arm | pieces | energy wasted to cap | waste % | 37311 gain | 37311 absorbed | Shred casts |
|-----|--------|----------------------|---------|------------|----------------|-------------|
| `M0` | 0 | 555,857 | 5.31% | — | — | 162,870 |
| `H1` | 1 | 542,228 | 5.11% | — | — | 165,249 |
| `L1` | 1 | 510,538 | 4.79% | — | — | 166,998 |
| `M2` | 2 | 422,329 | 3.69% | 666,920 | 658,984 (98.8%) | 181,342 |
| `M4` | 4 | 376,079 | 3.21% | 663,300 | 655,193 (98.8%) | 187,171 |

Two things fall out:

1. The 2pc's 666,920 extra energy is **98.8% absorbed** — only 1.2% overflows the
   cap. The rotation has ample headroom to spend a large energy infusion, which
   is precisely the condition under which an energy proc converts near-fully into
   damage. Shred casts rise 162,870 -> 181,342 (**+11.3%**), matching the 2pc
   run's figure exactly.
2. Waste % falls monotonically as gear improves (5.31% -> 3.21%), i.e. better gear
   makes the cat *less* energy-constrained. Untested hypothesis: the 2pc's value
   would shrink on stronger (P4/P5) gear where waste is lower still and the extra
   energy overflows more often. Nothing here measures that; it would need the
   same ladder re-run on a later reference set.

`M4` adds +5,829 Shred casts over `M2` (+3.2%) with no new energy stream, which
is the ordinary attack-power effect of +30 Strength, not a rotation change.

## Verdict on the hypotheses

- **(i) "18.04 is understated/confounded" — mostly rejected.** Two independent
  measurements (ladder 13.01 +/- 9.06; direct Strength pricing 21.68 at
  0.7227 DPS/Str, linear to four decimals) both put the 4pc in the teens-to-low-
  twenties. 18.04 is understated by ~3.6 DPS, worth a look, but the figure is
  the right order of magnitude and nothing like a 7x error.
- **(ii) "the 2pc is genuinely huge on energy-starved gear" — supported.** The
  0-piece arm wastes 5.31% of its energy to the cap and absorbs 98.8% of the
  2pc's proc, converting it into +11.3% Shred casts. The bonus really is that
  strong on this gear.

**The 7.3x ratio is real, and it is not a bug.** The asymmetry is structural, not
a measurement artefact: the Malorne 2pc is an *energy* proc landing on a rotation
with spare energy headroom, while the Malorne 4pc is a flat *+30 Strength* stat
stick. Those are not comparable currencies, and in this sim the energy is worth
roughly six times the stats. The TBC design intuition that "the 4-piece is the
marquee bonus" does not hold for T4 feral in wowsims — the SME reasoning that
predicted 15-40 for the *2pc* was wrong, but that same reasoning is a good
predictor of the *4pc*, which is a plain stat bonus and prices like one.

**Implication for the engine:** any gate or plausibility band built on "the 4pc
must exceed the 2pc" would reject a correct measurement here. Set-bonus
magnitudes need to be judged by *mechanism* (proc vs flat stats) rather than by
piece count. See ticket 97 (no independent plausibility band for set-bonus
magnitudes) and ticket 98 (add plausibility gates).

**Durable-claims note.** Every number above is reproducible with the three
commands at the top of this section on `wowsimcli v0.0.101` with the committed
`vendor/wowsims/feral_p2_9p.gear.json` and
`data/presets/feral/p2.raid-sim-skeleton.json`. The one forward-looking claim
(2pc shrinks on later-phase gear) is explicitly labelled **untested**. The
engine's 18.04 figure was **not** re-derived here — it is quoted from the brief;
the ~3.6 DPS gap is a comparison against that quoted value, not a measurement of
the engine's code path.
