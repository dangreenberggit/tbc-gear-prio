# Is the break confound arithmetically correctable from a `Ranking`?

Date: 2026-08-10. Read-only. No sims run, no production source modified.
Artifact under test: `.scratch/rank-reports/shredzepelin-p3.json` (feral, shredzepelin, maxPhase 3),
plus `data/items/index.json` for item stats. All probes are `python -c` reads of committed files.

---

## Answer

**Not exactly, but yes to a useful approximation — and the approximation is good enough to change
the verdict on the prior investigation.** There is no route in the artifact that yields `B` (the true
DPS value of the broken Malorne 2pc) *exactly*: every candidate single that would isolate it also
changes stats, and Malorne 2pc is never measured as a bonus in this run because it is already active.
However, the artifact contains **36 breaking candidates across two slots and 68 non-breaking
candidates across three control slots**, and regressing `deltaDps` on a stat proxy separately for
breaking and non-breaking slots recovers the fixed toll as a **difference of intercepts**:
`B̂ ≈ 115.8 DPS` (§Routes, R6). This is an *estimate with real uncertainty*, not a measurement — but
it is derived from the artifact alone, needs no new sims, and it simultaneously explains the
Thunderheart/Nordrassil near-coincidence that the prior report could only call a "strong signal".
Applying it gives corrected 4pc values of **~78 (Thunderheart)** and **~69 (Nordrassil)**. That
**contradicts the prior report's ~4× / 30–60 DPS estimate** — the inflation is real but is roughly
**2.5×, not 4×**, and the corrected values are roughly double the prior report's ceiling.

Separately, and more importantly for the design question: **most of what the confound removes is not
error, it is signal** (§On (b)). My recommendation is therefore **correct-and-disclose**: report the
corrected figure with the correction shown and the estimate's uncertainty stated, not suppression.

---

## The algebra

### Setup

Let the baseline equipment be `E₀`, wearing 2 Malorne pieces (chest 29096, shoulder 29100), so the
Malorne 2pc bonus is **active** in `E₀`. Write `D(·)` for simmed DPS.

Define, for any equipment `E`:

    D(E) = G(E) + B·[Malorne 2pc active in E]

where `G(E)` is "DPS from everything that is not the Malorne 2pc bonus" (stats, other set bonuses,
procs, the set being completed) and `B > 0` is the DPS the Malorne 2pc contributes **in context**.
This is a definitional decomposition, exact by construction; `B` is context-dependent (it is the
bonus's marginal value against whatever else is worn) but for a fixed neighbourhood of gear it is
approximately constant. That approximate-constancy is the load-bearing assumption and is
**tested empirically** in R6 below (residual SD 12.7 across 36 items).

### Singles

Let the package `P(S,t)` add pieces `p₁…pₜ` at slot indices `s₁…sₜ`, and let **k** = the number of
those slots that hold a Malorne piece in `E₀`. Here, for `t=4`, the package is
`[31048 shoulder, 31042 chest, 31034 hands, 31044 legs]`, and shoulder+chest both hold Malorne, so
**k = 2**. Since Malorne has exactly 2 pieces worn, displacing *any one* of them drops the set to 1,
below the threshold of 2 — so **each** of the k breaking singles loses the whole bonus.

Single `i` swaps only piece `i` into `E₀`, giving `E₀^(i)`:

    single_i = D(E₀^(i)) − D(E₀)
             = [G(E₀^(i)) + B·[active]] − [G(E₀) + B]

For a **non-breaking** single (slot holds no Malorne piece), Malorne stays at 2, so `[active] = 1`:

    single_i = G(E₀^(i)) − G(E₀)  ≡  g_i          (pure stat/proc term)

For a **breaking** single (slot holds a Malorne piece), Malorne drops to 1, so `[active] = 0`:

    single_i = G(E₀^(i)) − G(E₀) − B  ≡  g_i − B

Therefore:

    Σ singles = Σᵢ gᵢ − k·B                                            … (1)

**B enters `Σ singles` exactly k times.** (Not "twice" in general — twice here only because k=2.
The docstring's "charged twice" is the k=2 special case, which is worth stating in the source since
it currently reads as a universal claim.)

### Package

The package moves all t pieces at once. Malorne ends at `2 − k` pieces. For `k ≥ 1` that is `< 2`,
so the bonus is lost — **once**:

    packageDelta = D(P) − D(E₀)
                 = [G(P) + 0] − [G(E₀) + B]
                 = [G(P) − G(E₀)] − B                                  … (2)

**B enters `packageDelta` exactly once**, for any `k ≥ 1`. (For `k = 0` it enters zero times and
there is no confound at all — which is why the 2pc row, package `[31034 hands, 31044 legs]`, is clean.)

### Reported bonus

Write `Γ ≡ G(P) − G(E₀)` (the confound-free package effect) and note that the **true** synergy —
what we want — is the package effect minus the sum of the *confound-free* singles:

    bonus_true = Γ − Σᵢ gᵢ  (− bonus(S,2) for t=4)

Substituting (1) and (2) into `computeSynergy` (`packages/core/src/set-value.ts:332-345`):

    bonus_reported = packageDelta − Σ singles − twoPieceBonus
                   = (Γ − B) − (Σ gᵢ − k·B) − twoPieceBonus
                   = (Γ − Σ gᵢ − twoPieceBonus) + (k−1)·B

**Result:**

> ### `bonus(S,t)_reported = bonus(S,t)_true + (k − 1)·B`

where `k` = number of package pieces displacing a piece of the broken set, and `B` = the broken
bonus's true in-context DPS value.

Immediate consequences, all algebraically implied:

- **`k = 0`** → no inflation. Matches the Thunderheart 2pc row (no `breaks`, package touches
  hands+legs only).
- **`k = 1`** → **no inflation either.** The bonus is charged once in `packageDelta` and once in
  `Σ singles`; they cancel. **This is a correction to the source docstring and to V0b's caveat**,
  both of which assert a bias at k=1. V0b's package was head/shoulder/hands/legs with only the
  shoulder holding Malorne, i.e. k=1 — so by this algebra **V0b's +91.68 was NOT inflated by the
  Malorne breakage at all**, and its caveat is wrong about the mechanism. (See §Verdict.)
- **`k ≥ 2`** → inflation of `(k−1)·B`. Here k=2, so the inflation is exactly **one `B`**.

### Verification against the artifact

`bonus_reported` reproduces exactly, confirming the formula implementation (not the confound):

```
python -c "
import json; r=json.load(open('.scratch/rank-reports/shredzepelin-p3.json'))['ranking']
b={i['itemId']:i['deltaDps'] for i in r['items']}
s2=b[31034]+b[31044]; s4=sum(b[x] for x in (31048,31042,31034,31044))
print(76.50072399490682 - s2)                        # 31.459750845162944
print(64.07344025189468 - s4 - 31.459750845162944)   # 193.8894463098602
"
```

Both match the artifact's `bonusDps` to full float precision. Likewise Nordrassil:
`-21.17895344559747 − (−206.28105373496305) = 185.10210028936558` ✓ (its `twoPieceBonus` is absent —
Nordrassil 2pc is `not-implemented-in-sim`, `set-value.ts:37`).

So: **the arithmetic is right and the inputs are confounded**, exactly as expected.

---

## Routes to B, each assessed

I enumerated every field in the artifact that could plausibly carry `B`. `SetBonusValue` rows,
`deltaDps`, `se`, `setBonusNote`, `setContext`, `hitRegression`, `bisTags`, `source`, `baseline`,
`caps`, `substitutions`. There is no `statDelta` in the emitted JSON (it exists in `rank.ts:653` as
an internal, `caps.ts:273 statDeltaBetween`, but is not serialised) — so any route needing per-item
stat deltas must reconstruct them from `data/items/index.json`, which R6 does.

### R1 — Read Malorne's own `SetBonusValue` for threshold 2. ✗ Does not exist.

**Proven absent.** The artifact's `setBonuses` array contains Malorne (640) at threshold **4 only**
(`bonusDps: 18.0386`, `piecesWorn: 2`). `buildSetBonuses` (`rank.ts:961-962`) skips
`threshold <= piecesWorn`, so with 2 worn no 2pc package is ever built. Not a proxy — simply absent.

### R2 — Read a single breaking candidate's `deltaDps` as `−B`. ✗ Confounded. This is the trap.

The "obvious" route, and wrong. From the algebra, a breaking single is `gᵢ − B`, **not** `−B`. The
`gᵢ` term is large and item-dependent. Concretely, Thunderheart Chestguard (31042) is **strictly
stat-superior** to the Malorne chest it replaces on every stat:

```
python -c "
import json; db=json.load(open('data/items/index.json'))
a=db['29096']['stats']; b=db['31042']['stats']
print([(k,b[k]-a[k]) for k in range(len(a)) if b[k]!=a[k]])
"
# [(0, 20), (1, 2), (2, 15), (3, 5), (31, 80), (32, 42)]
#  +20 Str, +2 Agi, +15 Sta, +5 Int, +80 AP, +42 (index 32)
```

So `g₃₁₀₄₂ > 0` — substantially. Reading `−100.16` as `−B` would understate `B`. This is precisely
the adversarial case flagged in the brief, and it is not hypothetical: it is the largest single
candidate in the slot.

### R3 — Difference two candidates in the same slot to cancel B. ✗ B cancels; nothing left.

`(gᵢ − B) − (gⱼ − B) = gᵢ − gⱼ`. Both are breaking, so `B` cancels **exactly** — which is the
problem: this yields the relative stat value and destroys the very term we want. Useless alone
(though it is the ingredient R6 exploits, by comparing *slopes and intercepts* rather than pairs).

### R4 — Difference a breaking candidate against a non-breaking one in the same slot. ✗ None exist.

Would give `(gᵢ − B) − gⱼ = (gᵢ − gⱼ) − B`, recoverable if `gᵢ ≈ gⱼ`. **But there is no
non-breaking candidate in chest or shoulder.** Every one of the 20 chest and 18 shoulder rows other
than the worn Malorne piece itself carries `setBonusNote: "breaks 2-piece Malorne Harness (below 2)"`:

```
python -c "
import json; r=json.load(open('.scratch/rank-reports/shredzepelin-p3.json'))['ranking']
for s in ('chest','shoulder'):
    xs=[i for i in r['items'] if i['slot']==s]
    print(s, len(xs), 'breaking:', sum(1 for i in xs if i.get('setBonusNote')))
"
# chest 20 breaking: 19      shoulder 18 breaking: 17
```

(The one non-breaking row per slot is the worn Malorne piece scoring 0.00 against itself, which
carries no information.) Structurally unavoidable: **any** item in those slots displaces Malorne.

### R5 — Use Malorne's measured 4pc (18.04) as a proxy for its 2pc. ✗ Different bonus entirely.

`verification.md` V1 records Malorne 2pc = 4% proc for +20 cat energy; 4pc = `+30 Strength` on
`CatFormAura`. Unrelated effects; no reason 2pc ≈ 4pc. Also note the 4pc row is itself *clean*
(`piecesWorn: 2`, package adds hands 29097 + legs 29099, neither slot holds a set piece, no `breaks`)
— so 18.04 is trustworthy *as the 4pc value*, and is simply not the quantity wanted.

### R6 — Regress `deltaDps` on a stat proxy; take B as the breaking/non-breaking intercept gap. ✓ **Yields an estimate of B.**

This is the route that works. The algebra says breaking singles sit a **constant `B` below** the
stat-value line that non-breaking singles sit on. With enough candidates in each class, fitting a
line to each and differencing the intercepts recovers `B` without needing any single item's `gᵢ`.

Build a crude feral stat proxy (`2·Str + Agi + AP`, matching feral's approximate EP shape) as `x`,
take `deltaDps` as `y`, and fit per slot-class against the worn anchor (the `deltaDps == 0` item):

```
python -c "
import json, statistics
r=json.load(open('.scratch/rank-reports/shredzepelin-p3.json'))['ranking']
db=json.load(open('data/items/index.json'))
def ap(i):
    s=db[str(i)]['stats']; return 2*s[0]+s[1]+s[31]
worn={'chest':29096,'shoulder':29100,'legs':28741,'hands':29947,'feet':28545}
def fit(slots):
    rows=[]
    for sl in slots:
        w=worn[sl]
        rows+=[(ap(i['itemId'])-ap(w), i['deltaDps'])
               for i in r['items'] if i['slot']==sl and i['itemId']!=w]
    xs=[x for x,_ in rows]; ys=[y for _,y in rows]; n=len(xs)
    mx=sum(xs)/n; my=sum(ys)/n
    a=sum((x-mx)*(y-my) for x,y in zip(xs,ys))/sum((x-mx)**2 for x in xs)
    b=my-a*mx
    return n,a,b,statistics.pstdev([y-(a*x+b) for x,y in zip(xs,ys)])
nb=fit(['legs','hands','feet']); br=fit(['chest','shoulder'])
print('non-breaking: n=%d slope=%.4f intercept=%.2f residSD=%.2f'%nb)
print('breaking:     n=%d slope=%.4f intercept=%.2f residSD=%.2f'%br)
print('B_hat = %.2f'%(nb[2]-br[2]))
"
```

Output:

```
non-breaking: n=68 slope=0.1519 intercept= -11.70 residSD=18.00
breaking:     n=36 slope=0.1384 intercept=-127.47 residSD=12.71
B_hat = 115.77
```

**Why this is credible, and where it is weak:**

- **The slopes agree** (0.152 vs 0.138, ~9% apart). Two independent slot-classes producing the same
  DPS-per-stat-point is what the model predicts, and it is a genuine check the model could have
  failed. It means the proxy is capturing the stat term in both classes with the same calibration,
  so the intercepts are comparable.
- **The intercept gap is an order of magnitude larger than the residual scatter.** −127.5 vs −11.7 is
  a 116 DPS separation against residual SDs of 12.7 and 18.0.
- **Per-slot fits agree with the pooled fit**, so the gap is not one slot dragging the pool:
  `legs −7.15`, `hands −10.12`, `feet −15.65` (all non-breaking, all ≈ −10);
  chest+shoulder pooled `−127.47`. Reproduce by calling `fit(['legs'])` etc. in the snippet above.
- **Weakness 1 — the proxy is crude.** `2·Str + Agi + AP` ignores crit, hit, haste, armour pen and
  socket/gem re-solving. `data/presets/feral/p1.ep-weights.json` exists and would give a properly
  weighted `x`; I did not use it (see §What I did not check). A better proxy would tighten both fits
  and could move `B̂` by some tens of DPS.
- **Weakness 2 — the non-breaking intercept is not zero (−11.7).** It should be ≈0 if the proxy were
  unbiased. That −11.7 is proxy bias, and I have *differenced it out*, which is the right treatment
  only if the same bias applies in the breaking slots. Plausible, untested.
- **Weakness 3 — chest/shoulder may have slot-specific effects beyond the set bonus.** Note the head
  slot shows a ~−202 cliff with **no set involved** (worn Wolfshead Helm, `setId: null`), i.e. this
  gear has at least one large non-set slot-locked effect. If chest or shoulder had an analogous
  effect, R6 would fold it into `B̂`. I have no evidence they do, but I did not rule it out.

**Classification: `B̂ ≈ 116` is an estimate derived from the artifact, not a measurement.** I would
quote it as **B ≈ 100–130** and would not defend a tighter interval without R7.

### R7 — `se`, `hitRegression`, `bisTags`, `source`, `caps`. ✗ None carry B.

- `se` is sim noise (`combineSe`, `set-value.ts:282`); carries no bonus magnitude.
- `hitRegression` is present on some rows (e.g. 31044 `{lost: 1, gapAfter: 17.92}`) and is a genuine
  secondary confound worth noting — the player is **17 hit rating under cap**
  (`caps.hit: {rating: 125, capRating: 141.92, gap: 16.92}`), so hit swings do contribute to the
  scatter — but it is orthogonal to `B` and does not yield it.
- `setBonusNote` is a **string**, carrying the fact of the break and no magnitude. It is the flag
  that makes R6 *possible* (it partitions candidates into the two classes) but is not itself a route.
- `bisTags` / `source` / `substitutions` are provenance; `caps` is the hit/expertise model.

---

## Minimal extra measurement

R6 gives an estimate; a **measurement** of `B` needs **one additional sim** — and one is genuinely
enough, because the baseline is already simmed.

> **Untested** — I ran no sims; the following is a specification, not a result.

**The probe:** sim the baseline with the Malorne 2pc broken by a *minimal* stat change, and difference
against the existing baseline. The cleanest version:

- **Payload:** `E₀` with **exactly one** Malorne piece replaced by an item whose stat vector is as
  close as possible to it. Best available candidate: **shoulder slot, 29100 Mantle of Malorne →
  30230 Nordrassil Feral-Mantle** (stat proxy delta +41, the smallest of the shoulder options).
  Everything else — head, chest, hands, legs, weapon, gems, enchants — byte-identical to baseline.
- **Compare against:** the existing `baseline.dps = 2152.0998` (already simmed, in the artifact).
- **Arithmetic:** `D(E_probe) − D(E₀) = g₃₀₂₃₀ − B`, so `B = g₃₀₂₃₀ − (D(E_probe) − D(E₀))`. This is
  just the existing single for 30230 (`−112.55`), so **that sim is already done** — which means the
  probe as stated adds nothing. The real requirement is a measurement of `g₃₀₂₃₀` **with Malorne
  irrelevant**, which needs the *other* Malorne piece gone first.

**Corrected, actually-minimal design — 2 sims:**

1. **Sim A (new):** `E₀` with **both** Malorne pieces removed — chest 29096 → 31042 Thunderheart
   Chestguard, shoulder 29100 → 31048 Thunderheart Pauldrons. This is exactly the equipment of the
   *existing* Thunderheart 4pc package minus the hands and legs pieces. Malorne is at 0 either way,
   so no Malorne bonus is active. **Cost: 1 sim.**
2. **Sim B (new):** `E₀` with **chest only** swapped (29096 → 31042). Malorne drops 2 → 1, bonus off.
   **Cost: 1 sim.** *(This is already measured — it is the 31042 single, `−100.157`. So Sim B is free.)*

Then, with `E₀` Malorne-active and Sim B / Sim A Malorne-inactive:

    single(31042)          = g_chest − B                    [known: −100.157]
    single(31048)          = g_shoulder − B                 [known: −106.159]
    D(SimA) − D(E₀)        = g_chest + g_shoulder + ε − B   [1 new sim]

where `ε` is the genuine two-piece stat interaction (small; it is the "package beats parts on stats
alone" term). Subtracting:

    [D(SimA) − D(E₀)] − single(31042) − single(31048) = B + ε

So **one new sim** (Sim A) yields `B + ε`, and `ε` is bounded by the same reasoning that bounds any
two-item stat interaction (a few DPS). Concretely:

    B + ε = [D(SimA) − 2152.0998] − (−100.157) − (−106.159)
          = D(SimA) − 2152.0998 + 206.316

**Implementation:** one entry in the same package-sim path `buildSetBonuses` already uses
(`rank.ts:1003-1016`) — build `packageEquipment` by applying `equipmentForCandidateSwap` for slots
`chest` and `shoulder` only, compose against `deps.raidSimSkeleton`, and read through
`readCachedSim`. Same seeds (`[11,22,33,44,55]`) and iterations (3000) as the run
(`ranking.assumptions`). **Total additional sim budget: 1**, well inside §2.4's ~4-per-run target.

**Generalising:** to correct *any* breaking package, the required probe is "baseline with exactly the
breaking slots vacated". That is **one sim per distinct set of broken slots**, and both the
Thunderheart and Nordrassil 4pc packages here break the *same* two slots — so **one sim corrects
both rows**, which is a strong argument for it being cheap in practice.

---

## Verdict on "~4× inflated"

**The prior report's estimate is not supported, and I believe it is wrong in a specific, diagnosable
way.** Two independent arguments.

### 1. The required B for a 30–60 DPS true value is implausible

From `bonus_reported = bonus_true + (k−1)·B` with k=2, `B = 193.889 − bonus_true`:

| target `bonus_true` | required `B` |
|---|---|
| 30 | **163.89** |
| 60 | **133.89** |
| 20.89 (V0c's figure) | **173.00** |

For scale, in this same run: **Malorne 4pc measures 18.04**, and the 2pc is a *4% proc for +20 cat
energy* (`verification.md` V1). A 2pc worth **134–164 DPS** would be roughly **7–9× the same set's
4pc** and would be, comfortably, the largest set bonus in the game. Typical TBC 2pc melee bonuses
are single-digit to low-double-digit DPS. **The required B is implausible by an order of magnitude.**

By contrast `B̂ ≈ 116` from R6 is *also* larger than a naive "4% proc for +20 energy" intuition
would suggest — but it is what the artifact says, it is consistent across 36 items and two slots, and
energy is the binding resource for a feral cat rotation, so an energy proc is exactly the kind of
bonus whose DPS value is far above its stat-equivalent. I flag the tension rather than hide it:
**either B is genuinely ~116 (and the corrected values are ~70–78), or something other than the
Malorne 2pc contributes to the chest/shoulder intercept gap** (R6 weakness 3). Both readings reject
30–60.

### 2. The Nordrassil coincidence is *explained* by the algebra, not merely "consistent with" it

The prior report treated 193.89 ≈ 185.10 as suggestive. The algebra makes it **predictive**: both
packages have **k = 2** and break the **same** Malorne 2pc, so both carry `+1·B` of identical
inflation. Their *difference* is therefore confound-free:

    193.889 − 185.102 = 8.787 = bonus_true(Thunderheart 4pc) − bonus_true(Nordrassil 4pc)

**exactly**, with `B` cancelling identically. That is a **proven-from-the-artifact** statement (it
follows from the algebra plus the two reported figures, no estimate involved), and it is a much
stronger result than the prior report's inference. It says Thunderheart 4pc is worth **8.79 DPS more
than** Nordrassil 4pc on this gear — a small, plausible gap between two real 4pc bonuses, and
*inconsistent* with the prior report's suggested residuals of ~44 and ~35 only by coincidence (those
happen to differ by 9 too — the prior report got the difference right by accident while getting the
level wrong).

Applying `B̂ ≈ 116`: **Thunderheart 4pc ≈ 78, Nordrassil 4pc ≈ 69.** Inflation factor ≈ **2.5×**,
not 4×. Both land in a range that is plausible for a T6/T6.5 4pc on a feral cat.

### 3. A correction to V0b's caveat (and to the source docstring)

The algebra says **k = 1 produces zero inflation**. V0b's package was head(31039) / shoulder(31048) /
hands(31034) / legs(31044) over gear wearing Malorne at chest **and** shoulder — only the shoulder is
in the package, so **k = 1**. Therefore:

> **V0b's +91.68 was not biased upward by the Malorne breakage.** Its caveat block
> (`verification.md:52-60`) misdiagnoses the mechanism — it correctly observes "charged twice in
> Σ singles, once in packageDelta" for the *k=2* case but applies it to a *k=1* run, where the two
> charges cancel exactly.

This matters because the prior report leaned on V0b→V0c (91.68 → 20.89) as its evidence that the
confound is large. **That comparison is not evidence of the confound at all** — V0b and V0c measure
*different sets' different bonuses* (Thunderheart 4pc vs Malorne 4pc). Removing that pillar removes
most of the support for "30–60".

Likewise `brokenSetBonuses`' docstring (`set-value.ts:220-234`) states the double-charge as a general
property; it should say **`(k−1)·B`, zero when only one piece of the broken set is displaced.**
(Flagged, not changed — read-only task.)

---

## On (b): is "the break paid once" error or signal?

**Mostly signal, and this is the crux.** Decomposing the 193.89:

    193.889  =  bonus_true(Thunderheart 4pc)   ≈  78     [genuine 4pc bonus]
             +  1·B                            ≈ 116     [the "paid once not twice" residue]

The 116 is **not fabricated DPS**. It is a real fact about the world: if you equip T6 chest and
shoulders *together*, you pay the Malorne 2pc loss **once**, whereas the two singles each pay it in
full. `Σ singles` charges `2B`; reality charges `B`. The `+B` residue is the arithmetic shadow of a
**true saving**.

The user's framing is right, and sharper than the prior report's. Note the numbers the brief points
at: adding chest+shoulder to the 2pc package moves `packageDelta` only **76.50 → 64.07, a drop of
12.43**, while the two singles sum to **−206.32**. The gap (206.32 − 12.43 ≈ **194**) is *exactly*
the reported bonus, and it decomposes into:

- **~116** — the Malorne 2pc paid once instead of twice. **Real. A legitimate part of "what is this
  swap worth".**
- **~78** — the Thunderheart 4pc bonus itself. **Real, and the thing the field claims to measure.**
- **~ε** — genuine stat interaction between the two pieces. Small.
- **The T6 stat upgrade itself is *not* in here** — it is already inside the singles' `gᵢ`, which is
  why the strictly-better-on-paper T6 chest still shows −100. The stats are real and are correctly
  credited; they are simply swamped by `B`.

**So: (b) is part of the correct answer to "what is this swap worth", and it is error only with
respect to the label.** The field is called `bonusDps` and is presented as *the value of the
Thunderheart 4pc set bonus*. Under that label, `+116` of Malorne-savings is a **misattribution** —
it credits set S with a saving created by breaking set T. Under the label "what does moving to this
4-piece package buy me", it belongs.

**Recommendation: correct *and* disclose — do not suppress.**

1. **Split the field** rather than adjusting one number. Report `bonusDps` (corrected: `reported −
   (k−1)·B̂`) *and* a separate `breakSavingDps` (`(k−1)·B̂`), with `k` and the broken set named.
   Both are real; conflating them is the defect. This preserves the total, which is the number a
   player deciding on a swap actually wants.
2. **Suppression (prior report's R2a) is the wrong call** — it discards a genuine and large true
   effect, and it would hide the *most decision-relevant* fact in the artifact (that this gear is
   held hostage by a Malorne 2pc worth ~116 DPS across two slots).
3. **Ship the 1-sim probe** (§Minimal extra measurement) before trusting the split's magnitudes.
   R6's `B̂` is good enough to *reject 30–60* and to justify building the split; it is not good
   enough to print to two decimal places.
4. **Fix the docstring and V0b's caveat** — the `(k−1)` factor, and V0b being k=1 and therefore
   unconfounded.

---

## What I did not check

- **I ran no sims.** Every number is read from `.scratch/rank-reports/shredzepelin-p3.json` and
  `data/items/index.json` or computed arithmetically from them. `B̂ ≈ 116` is a regression estimate,
  **not a measurement**; the 1-sim probe that would measure it is specified but **untested**.
- **I did not use the real EP weights.** `data/presets/feral/p1.ep-weights.json` exists and would
  give a properly-calibrated `x` for R6 instead of my ad-hoc `2·Str + Agi + AP`. This is the single
  cheapest improvement to `B̂` and I did not do it. My residual SDs (12.7 / 18.0) would likely shrink.
- **I did not model gem re-solving.** Socket colours differ between the worn and candidate pieces
  (chest `[4,3,2] → [3,4,2]`, shoulder `[3,3] → [4,3]`) and `equipmentForCandidateSwap` re-solves
  gems. That re-solve is inside every `deltaDps` and inside my regression residuals; whether it
  biases the breaking and non-breaking classes *differently* is unchecked, and if it does, `B̂` moves.
- **I did not rule out a non-set slot-locked effect in chest or shoulder.** The head slot
  demonstrably has one (~−202 cliff, worn Wolfshead Helm, no set), so the phenomenon exists in this
  gear. If chest or shoulder had an analogous effect, R6 would attribute it to `B`. R6 weakness 3.
- **I did not verify the Malorne 2pc effect at the pin.** I relied on `verification.md` V1's "4% proc,
  +20 energy in cat". I did not read the wowsims Go source. My plausibility argument in §Verdict
  depends on this being current.
- **I did not check `ε`'s magnitude.** I asserted the two-piece stat interaction is small on general
  grounds; the 1-sim probe measures `B + ε` jointly and does not separate them. Separating them needs
  a further sim and I did not spec one.
- **I did not re-derive V0b's k from the raw gear file.** I inferred k=1 from `verification.md:53-56`
  ("29100 Mantle (shoulder) and 29096 Breastplate (chest)" worn; package at
  "head(0)/shoulder(2)/hands(6)/legs(8)"). Reading `vendor/wowsims/feral_p2_9p.gear.json` directly
  would confirm it. If V0b's package actually touched chest too, that conclusion flips.
- **I did not audit other characters, specs, or universes**, nor check whether k≥2 packages are
  common or rare across runs — which determines how much this matters in practice.
- **I did not run `pnpm verify`** — no source was modified.
