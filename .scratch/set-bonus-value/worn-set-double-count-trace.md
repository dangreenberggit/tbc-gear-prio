# Worn T4 2pc — double-count trace

Date: 2026-08-10. Read-only investigation: no production source modified, no sims run, nothing committed.

Artifacts under test:
- `.scratch/rank-reports/shredzepelin-p3.json` (feral, shredzepelin, maxPhase 3, baseline 2152.099805582717 DPS)
- `data/items/index.json` (item stats/sockets)
- `.scratch/wowsims-tbc-new-src/` — verified at commit `8aa378b3671a0923fd11fb34b4b3753e53f20c9b`, byte-identical to the pin in `data/wowsims.lock.json` (`git -C .scratch/wowsims-tbc-new-src rev-parse HEAD`)

Evidence labels used throughout: **[read]** = read from source, **[computed]** = recomputed from a committed artifact by a re-runnable command, **[inferred]** = reasoning not directly measured.

---

## Verdict

**Partly — but not where the hypothesis expected, and not in a way that explains the ~100 DPS penalty.**

1. **The sim/delta path is clean.** The worn Malorne 2pc is charged exactly once, by the sim, in the swap payload. No correction, note, or display path subtracts it a second time. Stages 1–4 are correct. See §Trace.

2. **There IS a real display double-count, at stage 5/6, and it is a different bug than the one suspected.** `applySetContext` attaches `prospectiveBonusDps` to rows for pieces the player **already wears**, whose swap adds nothing. `crossesThreshold` does not catch this. Magnitude: 18.04 DPS full / 4.51 weighted on two rows. It is cosmetic-scale and **cannot** account for ~100 DPS. See §The partial-wear display bug.

3. **The ~100 DPS uniform penalty is not a double-count at all. It is a single, correct charge for a real thing the sim measures — and the SME's ~25–35 DPS estimate for the Malorne 2pc is what is wrong, not the pipeline.** See §What actually explains ~100 DPS.

---

## Trace, stage by stage

### Stage 1 — Baseline sim: 2pc active. CONFIRMED

`rankUpgrades` builds `equipment` from logged gear at `rank.ts:425-428`, passes it to `compose` at `rank.ts:429-433`. Both Malorne pieces (29096 chest, 29100 shoulder) are present, so wowsims applies the 2pc. **[read]**

The 2pc effect body, `sim/druid/item_sets.go:83-101` **[read]**:

```go
ProcChance: 0.04,
Handler: ... if druid.InForm(Cat) { druid.AddEnergy(sim, 20, energyMetrics) }
```

4% chance on landed melee to gain 20 energy in Cat Form. This matches the SME's mechanical description exactly. The disagreement with the SME is about magnitude, not mechanism.

### Stage 2 — Candidate swaps: charged once, correctly. CONFIRMED

`equipmentForCandidateSwap` (`rank.ts:1335-1360`) calls `swapItemAt` (`rank.ts:1362-1389`), whose body is `equipment.map((spec, i) => { if (i !== slotIndex) return spec; ... })` **[read]**. Exactly one index is replaced; every other slot is returned by identity. **A payload cannot lose both Malorne pieces** — that specific worry in the brief is ruled out by construction.

So a chest candidate yields a payload with 1 Malorne piece, the sim drops the 2pc, and `deltaDps` legitimately includes that loss — once.

### Stage 3 — `setBreakNote` / `set-bonus.ts`: purely cosmetic. CONFIRMED

`set-bonus.ts` is 57 lines and contains no arithmetic on `deltaDps` **[read]**. `brokenSetBonuses` (`set-value.ts:235-277`) returns a descriptive `BrokenSetBonus[]` (setId/name/threshold/piecesBefore/piecesAfter) and adjusts no number. Its own docstring (`set-value.ts:228-233`) states the design intent: "No sim can separate the two after the fact, so this reports the breakage rather than trying to correct for it." **No second subtraction exists.**

### Stage 4 — `computeSynergy`: internally consistent; confound is disclosed, not double-applied. CONFIRMED

`computeSynergy` (`set-value.ts:332-345`) is `bonusDps = packageDeltaDps − Σ singles − (twoPieceBonus ?? 0)` **[read]**.

For Malorne 4pc, the artifact reports `piecesWorn: 2`, `packageItemIds: [29097, 29099]`, `packageDeltaDps: 14.783198191883912`, `bonusDps: 18.03855975622855` **[computed]**. The package **adds** only hands+legs on top of the 2 already-worn pieces; `selectPackage` (`set-value.ts:146-155, 173`) skips slots already holding a piece of the completing set. So the 18.04 figure measures the **4pc increment only** — the already-active 2pc sits in *both* the baseline and the package payload and cancels in `packageDeltaDps`. **The 2pc is neither inside nor double-counted in 18.04. This is correct.**

The known inflation of the *Thunderheart/Nordrassil* 4pc figures (193.89 / 185.10) is the previously-documented **break confound** (`.scratch/set-bonus-value/break-confound-correctability.md`), where `k=2` breaking singles each pay the Malorne toll while `packageDelta` pays it once, leaving `(k−1)·B` misattributed. That is a real bug, already recorded, and it is a *consequence* of the toll's size — not an independent source of it.

### Stage 5 — `applySetContext`: the guard is incomplete. **BUG FOUND**

`rank.ts:1119-1133` **[read]**:

```ts
const piecesAfterSwap = item.owned ? piecesWornBefore : piecesWornBefore + 1;
const thresholdBeforeSwap = nextMeasurableThreshold(setId, piecesWornBefore);
const crossesThreshold = thresholdBeforeSwap !== null && piecesAfterSwap >= thresholdBeforeSwap;
```

`crossesThreshold` correctly prevents the case it was designed for: a swap that *newly delivers* a bonus already inside its own `deltaDps`. It does **not** cover the already-worn case. For Malorne, `piecesWornBefore = 2`, `thresholdBeforeSwap = 4`, and for a worn piece `piecesAfterSwap = 2`, so `crossesThreshold = false` and line 1152 attaches `prospectiveBonusDps = 18.04`.

### Stage 6 — Display: propagates the stage-5 bug. **BUG CONFIRMED**

`weightedSetPotentialDps` (`rank-report-rules.ts:259-276`) returns `item.deltaDps + ctx.prospectiveBonusDps * factor`, with `SET_POTENTIAL_WEIGHTS[4] = 0.25` (`rank-report-rules.ts:230-233`) **[read]**.

### The partial-wear display bug, stated precisely

Rows 29096 (chest) and 29100 (shoulder) are the items the player **is already wearing**. Their `deltaDps` is exactly `0` — swapping an item for itself is a no-op. Yet **[computed]**:

| itemId | slot | deltaDps | piecesAfterSwap | weighted (×0.25) | full (×1) |
|---|---|---|---|---|---|
| 29096 | chest | 0.00 | 2 | **+4.51** | **+18.04** |
| 29100 | shoulder | 0.00 | 2 | **+4.51** | **+18.04** |

Both rows advertise Malorne 4pc potential that **this swap does not advance** — `piecesAfterSwap` equals `piecesWornBefore`. The 4pc requires the *other two* pieces (29097 hands, 29099 legs); re-equipping a piece you already wear contributes nothing toward it.

`formatSetPotentialLine` (`rank-report-rules.ts:283-300`) renders "needs 2 more pieces" on these rows, which is true but misleading next to a credited `+4.51` the row does not earn.

**Suggested fix (untested):** gate on whether the swap advances the count, e.g. add `ctx.piecesAfterSwap > ctx.piecesWornBefore` to the guard at `rank.ts:1149`, or equivalently skip `item.owned` rows. Note this is a genuine double-count in the ledger sense (value credited to a row that does not deliver it), just a small one.

**Scope check:** only these 2 rows are affected in this artifact. All 5 Thunderheart rows carry `piecesWornBefore: 0`, so they advance the count legitimately **[computed]**.

---

## What actually explains the uniform ~100 DPS penalty

**It is the Malorne 2pc, correctly charged once, and it is genuinely worth ~130 DPS in this configuration — roughly 4× the SME's estimate.** The pipeline arithmetic is not what is wrong.

### The natural experiment

Chest and shoulder are **the only two slots in the entire run whose worn item belongs to any set**, and they are **the only two slots with no positive candidate** **[computed]**:

| slot | worn item | worn setId | best candidate delta |
|---|---|---|---|
| **chest** | 29096 | **640** | **0.00** (worn itself; best real +alternative −90.16) |
| **shoulder** | 29100 | **640** | **0.00** (best real alternative −102.16) |
| hands | 29947 | none | +21.75 |
| legs | 28741 | none | +32.97 |
| wrist | 29966 | none | +10.87 |
| feet | 28545 | none | +24.17 |
| waist | — | none | +45.50 |
| weapon | 28658 | none | +86.95 |

The correlation is perfect and the mechanism is the one the code says it is.

### The penalty is not a stat effect

Thunderheart Chestguard (31042) is a **strict stat upgrade** over Breastplate of Malorne (29096) on every line **[computed from `data/items/index.json`]** — AP 459 vs 379, and higher agi/str/stam — yet measures **−100.16 DPS**. Stats cannot produce a negative here. Something worth well over 100 DPS is being removed.

### Regression: the offset is a slot-level constant

Regressing `deltaDps` on a stat proxy (AP + 2·agi), per slot, and reading the intercept at equal stats **[computed]**:

| slot | n | slope | intercept |
|---|---|---|---|
| **chest** | 19 | 0.128 | **−133.40** |
| **shoulder** | 17 | 0.144 | **−130.98** |
| hands | 19 | 0.163 | −2.85 |
| legs | 19 | 0.167 | −0.30 |
| wrist | 25 | 0.197 | −6.92 |
| feet | 30 | 0.161 | −10.23 |

Two set-wearing slots: **−133.4 and −131.0**, agreeing to within 2.4 DPS across two independent 17–19 item fields. Four non-set slots: **−0.3 to −10.2**. The offset is a **constant charged per slot, not per item** — exactly the signature of losing one binary set bonus, and it is charged **once** (if it were charged twice the two intercepts would differ from the single-swap floor, and they do not).

This −131 to −133 estimate is *independent of and consistent with* the `B̂ ≈ 115.8` recovered by the difference-of-intercepts method in `break-confound-correctability.md`. Two different estimators, same order of magnitude, both ~4× the SME's 25–35.

### Why 20 energy at 4% is plausibly worth ~130 DPS

**[inferred — this is mechanism reasoning, not a measurement]** Feral cat DPS is *energy-limited*, not rage- or GCD-limited. Under an energy cap, every point of energy converts to damage at a near-fixed rate. Shreds land frequently and each landed melee rolls the 4% proc. The bonus is not "4% more damage on a proc" — it is a **sustained increase in the energy budget**, i.e. a throughput multiplier on the whole rotation. The SME appears to have priced it as a discrete proc (~15–40 DPS) rather than as added resource throughput, which is the standard way this bonus is misjudged. **Untested here** — confirming it needs a sim.

### Ranked candidate explanations

1. **The Malorne 2pc really is worth ~130 DPS; charged once, correctly.** Strongest. Backed by: perfect slot/set correlation, two agreeing intercepts (−133.4/−131.0) across independent fields, a strict stat upgrade still measuring −100, and a plausible energy-throughput mechanism. This simultaneously resolves the "stubborn arithmetic" in the brief — the reconciliation failed because it assumed B=25–35; with B≈131 and k=2, Thunderheart 4pc corrects to 193.89 − 131 ≈ **63**, a sane 4pc value.
2. **Gem/enchant loss on swap.** Ruled out as the *primary* driver. `swapItemAt` migrates gems (`rank.ts:1375`) and carries the enchant when applicable (`rank.ts:1384-1386`). Chest 29096 has 3 sockets vs 31042's 3, shoulder 29100 has 2 vs 31048's 2 — socket counts are equal, so no socket loss. A gem-solver defect would also vary item-to-item with socket colours, not produce a 2.4-DPS-tight constant.
3. **Meta gem deactivation.** Ruled out — see below.
4. **Double-counting in the sim/delta path.** Ruled out at stages 1–4 above.

---

## Meta-gem check — explicit finding: NOT the cause

**Ruled out, three independent ways:**

1. `baseline.metaAdjusted` is `false` in the artifact **[computed]** — the baseline meta needed no repair.
2. `repairMeta` (`meta-repair.ts:48-103`) reads `const head = items[0]` and returns early unless the **head** item has a meta socket (`meta-repair.ts:58-65`) **[read]**. The player's head is **Wolfshead Helm (8345), `sockets: []`** **[computed]** — no meta socket at all. `repairMeta` is a **guaranteed no-op for this character**, on baseline and on every candidate swap alike.
3. There is therefore no meta gem equipped whose activation condition could depend on chest or shoulder gems.

The head slot's separate −273 median is the Wolfshead Helm effect (a feral-specific proc), independently confirmed as non-set in the prior audit's C7, and unrelated to this question.

---

## What could not be determined without a sim

- **The exact value of B.** Both estimates (−131/−133 here; 115.8 in `break-confound-correctability.md`) are regression intercepts resting on the approximate-constancy of B across the neighbourhood. The direct measurement — sim the baseline equipment with one Malorne piece swapped for a **stat-identical** non-set item — was not run. That single sim would settle the SME disagreement outright.
- **Whether the energy-throughput mechanism is the right explanation for the magnitude.** §Why 20 energy is plausible is mechanism reasoning, not measurement.
- **Whether `packageDeltaDps` values are themselves correct.** As the prior audit's C2 notes, these are stored fields; this trace verifies internal consistency of the arithmetic over them, not the sim runs that produced them.
- **Whether the stage-5/6 fix has side effects.** The suggested guard change is **untested** — no test was written or run.

---

## Reproduce

All figures above come from committed files via read-only Python:

```bash
cd C:/Users/dgree/Code/lulz/tbc-gear-prio
git -C .scratch/wowsims-tbc-new-src rev-parse HEAD   # 8aa378b… must equal data/wowsims.lock.json commit
python -c "
import json
m=json.load(open('data/items/index.json'))
d=json.load(open('.scratch/rank-reports/shredzepelin-p3.json'))
items=d['ranking']['items']
for s in sorted({i['slot'] for i in items}):
    rows=[i for i in items if i['slot']==s]
    z=[i for i in rows if i['deltaDps']==0.0]
    zid=z[0]['itemId'] if z else None
    zset=m.get(str(zid),{}).get('setId') if zid else None
    print(f'{s:10s} worn={str(zid):7s} wornSet={str(zset):6s} best={max(r[\"deltaDps\"] for r in rows):8.2f}')
"
```
