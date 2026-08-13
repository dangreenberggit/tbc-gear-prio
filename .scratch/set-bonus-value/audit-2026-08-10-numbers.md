# Adversarial numerical audit — set-bonus figures (2026-08-10)

Independent recomputation of claims C1–C9 against
`.scratch/rank-reports/shredzepelin-p3.json` (407 items, 13 setBonuses entries,
baseline 2152.099805582717 DPS). Arithmetic was derived from the raw artifact
*before* reading the prior reports' reasoning; the only prior text read ahead of
computing was C9's snippet, which is by construction a reproduction target.

Read-only audit: no production source modified, no sims run, nothing committed.

## Verdicts

| # | Claim | Verdict |
|---|---|---|
| C1 | Thunderheart 676; 2pc 31.4597…, 4pc 193.8894…, breaks Malorne 640 2pc 2→0 | **CONFIRMED** (exact) |
| C2 | `computeSynergy` reproduces both figures from the artifact's own singles | **CONFIRMED** (bit-exact, 0.0 residual) |
| C3 | Every Thunderheart row carries `nextThreshold=2` / 31.4597…; 4pc reaches no row | **CONFIRMED** (all 5 rows) |
| C4 | Displayed off/weighted/full for Chestguard and Pauldrons | **CONFIRMED** (exact to 2dp) |
| C5 | 193.8894… − 185.1021… = 8.787346…, and the confound cancels | **CONFIRMED** (k=2 for both) |
| C6 | `reported = true + (k−1)·B`; k=1 gives zero inflation | **CONFIRMED**; docstring **REFUTED** |
| C7 | Slot dead zones; head zero is Wolfshead, not a set effect | **CONFIRMED** |
| C8 | "5 of 28 JSON files carry setContext, all shredzepelin" | **PARTIALLY REFUTED** — numerator right, denominator wrong (16, not 28) |
| C9 | B̂ ≈ 116, range 100–130 | **CONFIRMED as reproducible**; range defensible but for an unstated reason |

**Most consequential error found:** none in the load-bearing arithmetic — C1–C7
all hold exactly. The one substantive correction is **C6: the
`brokenSetBonuses` docstring in `packages/core/src/set-value.ts` is wrong** as a
general statement of the mechanism. The published numbers it explains are
nevertheless correct.

---

## C1 — CONFIRMED (recomputed-from-artifact)

Read directly from `ranking.setBonuses`:

- `{setId: 676, threshold: 2, packageItemIds: [31034, 31044], packageDeltaDps: 76.50072399490682, bonusDps: 31.459750845162944, se: 4.023523747819654}`
- `{setId: 676, threshold: 4, packageItemIds: [31048, 31042, 31034, 31044], packageDeltaDps: 64.07344025189468, bonusDps: 193.8894463098602, se: 6.318125312608742, breaks: [{setId: 640, setName: "Malorne Harness", threshold: 2, piecesBefore: 2, piecesAfter: 0}]}`

Every field matches the claim character-for-character.

## C2 — CONFIRMED (recomputed-from-artifact, bit-exact)

`computeSynergy` (set-value.ts:332–345) is
`bonusDps = packageDeltaDps − Σ singles − (twoPieceBonus ?? 0)`. Singles taken
from the artifact's own item rows by `itemId`:

**2pc:** 76.50072399490682 − (21.750410060580634 + 23.290563089163243)
= 76.50072399490682 − 45.04097314974388 = **31.459750845162944** — residual `0.0`.

**4pc:** singles −106.15923272950226 (31048) + −100.15749732337008 (31042)
+ 21.750410060580634 (31034) + 23.290563089163243 (31044) = −161.27575690312847.

64.07344025189468 − (−161.27575690312847) − 31.459750845162944
= **193.8894463098602** — residual `0.0`.

Two further cases reproduce exactly on the same formula, which rules out
coincidence: Nordrassil 4pc → 185.10210028936558 (residual 0.0) and Malorne 4pc
→ 18.03855975622855 (residual 0.0). Four independent exact hits.

*Adversarial note — does this reproduce "for the wrong reason"?* Partly, and it
is worth being precise. `packageDeltaDps` is itself a stored artifact field, not
something I re-derived from a sim. So C2 verifies **internal consistency**: the
published `bonusDps` is the correct arithmetic function of the other published
fields. It does **not** independently verify `packageDeltaDps` — that would need
a sim run, which is out of scope here. The claim as stated ("the formula
reproduces those figures from the artifact's own singles") is exactly what was
tested and it holds.

## C3 — CONFIRMED (recomputed-from-artifact, exhaustive)

24 of 407 rows carry a `setContext`. All 5 Thunderheart rows (31044 legs, 31034
hands, 31042 chest, 31048 shoulder, 31039 head) have
`nextThreshold === 2`, `crossesThreshold === false`, and
`prospectiveBonusDps === 31.459750845162944`. Distinct-value check over the set:
`{2}` and `{31.459750845162944}` — no exceptions, not a sample.

The string `193.889` does not occur anywhere in `ranking.items`. The 4pc figure
is genuinely unreachable from every row.

Mechanism (from `nextMeasurableThreshold`, set-value.ts:97–106): with
`piecesAfterSwap = 1`, the first threshold above 1 is 2, and Thunderheart 2pc is
implemented, so the search stops there and never reaches 4. Contrast Nordrassil,
whose 2pc is `{2: false}` in `IMPLEMENTED_IN_SIM`, so its rows *do* carry the
4pc figure 185.10210028936558. This asymmetry is the actual reason T6 4pc is
invisible while T5 4pc is not.

## C4 — CONFIRMED (recomputed-from-artifact)

`weightedSetPotentialDps` (rank-report-rules.ts:260–276) returns
`deltaDps + prospectiveBonusDps × factor`, factor = 1 for `full`, else
`SET_POTENTIAL_WEIGHTS[nextThreshold]` = 0.5 at t=2. It short-circuits to plain
`deltaDps` when there is no context / it crosses / threshold null / bonus
undefined — none of which applies here.

| Item | off | weighted | full |
|---|---|---|---|
| Thunderheart Chestguard | −100.16 | −84.43 | −68.70 |
| Thunderheart Pauldrons | −106.16 | −90.43 | −74.70 |

Both rows match the claim exactly. Because every Thunderheart row resolves to
t=2, the credit added is `0.5 × 31.4597… = 15.73` (weighted) and `31.46` (full)
— uniform across the set. Neither toggle position moves chest or shoulder within
~68 DPS of break-even, so the display choice does not change any decision here.

## C5 — CONFIRMED (recomputed + algebraically-derived)

Operands verified in C1/C2. Subtraction:
`193.8894463098602 − 185.10210028936558 = 8.787346020494624`.

**The meaningful part — do the confounds cancel?** Two conditions, both hold:

1. **`breaks` are identical.** Serialised with sorted keys, both are
   `[{"piecesAfter":0,"piecesBefore":2,"setId":640,"setName":"Malorne Harness","threshold":2}]`.
   Equality is exact.

2. **k is equal (k=2 for both).** Both packages occupy exactly
   `{shoulder, chest, hands, legs}`.

**Worn equipment is NOT in the artifact** — this is a finding. `ranking` has
keys `contentHash, cutoff, fight, baseline, assumptions, caps, substitutions,
items, setBonuses`; there is no equipment/gear/worn/slotIndex key anywhere. So k
is not *directly* readable and must be inferred. It is nonetheless
**well-defined** here, via three independent routes that agree:

- **`piecesAfterSwap` arithmetic.** Malorne rows all have `piecesWornBefore=2`.
  A candidate landing on a Malorne-held slot gives `2−1+1 = 2`; on a free slot,
  `2+1 = 3`. Observed: chest (29096) → 2, shoulder (29100) → 2; hands (29097),
  legs (29099), head (29098) → 3. **Malorne-held = {chest, shoulder}.**
- **`setBonusNote` census (exhaustive).** "breaks 2-piece Malorne Harness (below
  2)" appears on exactly 19 chest and 17 shoulder rows and on **no** row of any
  other slot. 19/20 chest and 17/18 shoulder — the single exception in each is
  the worn Malorne piece itself (delta 0.00), which cannot break its own set.
- **Delta structure.** Both slots' entire candidate fields sit ~100+ DPS below
  zero, the signature of paying a fixed toll.

Both packages put 2 pieces (shoulder, chest) on Malorne-held slots → **k=2 each**,
so the `(k−1)·B` inflation is `+1·B` in both and differences out. **No off-by-one:**
the count is of *Malorne-held slots occupied*, and hands/legs are demonstrably
not Malorne-held.

**Unstated assumption the "proven 8.79" depends on:** that B is the *same
quantity* in both packages. It is — same set, same threshold, same two slots
vacated — so the cancellation is sound. The residual 8.787346 is a difference of
*true* bonuses, `T_thunderheart − T_nordrassil`, and that much is proven. What is
**not** proven by this subtraction is either bonus's absolute value; it is
scale-free. The prior work is right to treat 8.79 as exact and ~116 as an estimate.

## C6 — algebra CONFIRMED; docstring REFUTED

**Derivation** (mine, from `computeSynergy`). Let B = the broken bonus's DPS,
sᵢ = piece i's pure stat contribution, T = the true set bonus, k = package pieces
landing on Malorne-held slots.

- Single swap onto a Malorne slot: `δᵢ = sᵢ − B`. Onto a free slot: `δᵢ = sᵢ`.
  Hence `Σδᵢ = Σsᵢ − k·B`.
- The package loses the 2pc **once** — it is one indivisible bonus, lost whether
  1 or 2 of its slots are taken: `packageDelta = Σsᵢ + T − B·[k≥1]`.
- Therefore `reported = packageDelta − Σδᵢ = T + k·B − B·[k≥1]`.

Giving **`reported = T + (k−1)·B` for k≥1, and `reported = T` exactly for k=0.**

Numerically verified (B=116, T=20, n=4): k=0 → 20.00, k=1 → **20.00**, k=2 →
136.00, k=3 → 252.00, k=4 → 368.00. Matches the closed form at every k.

**k=1 produces exactly zero inflation.** The single charge inside `packageDelta`
and the single charge inside `Σ singles` cancel term-for-term.

**The docstring is wrong.** `brokenSetBonuses` (set-value.ts:220–234) asserts as
a general property: *"the lost bonus is charged once inside `packageDelta` but
twice across `Σ singles` (each single that touches the slot pays it too)"*.
"Twice" is true only when two singles touch broken slots — i.e. k=2, which is the
case that happens to be in front of us. The general statement is `k` times, not
twice, and the net inflation is `(k−1)·B`, not `B`. At k=1 the docstring predicts
double-charging where none occurs.

The docstring's cited evidence is consistent with k=2 and does not distinguish
the two accounts, which is presumably how the over-general wording survived. The
*behaviour* of `brokenSetBonuses` is unaffected — it reports breakage and
deliberately does not correct for it. This is a comment-accuracy defect, not a
computational one. Under AGENTS.md's comment policy ("a non-obvious constraint…
why a slower or uglier path was deliberately chosen") this comment is exactly the
load-bearing kind that must be right.

## C7 — CONFIRMED (recomputed-from-artifact)

Best `deltaDps` per slot: chest **0.00**, shoulder **0.00**, head **0.00**, legs
**+32.97**, waist **+45.50**, weapon **+86.95**. All six match.

(Full sweep also shows ranged 0.00 — a fourth dead zone the claim omits. Its
leader is Everbloom Idol, `setContext: None`, so it is a no-upgrade-available
zone like head, not a set-break zone.)

**Head zero is Wolfshead Helm (8345)** with `setContext: None` and
`setBonusNote: None`. From `data/items/index.json`, item 8345 has
`"setId": null, "setName": null`. **Not a set effect** — confirmed at the item-DB
level, not merely by absence in the report. The next-best head item is −202.05,
so head is a genuine "nothing in the pool beats what you wear" zone.

**Chest and shoulder zeros are set-break driven** — and note the zeros there are
*the worn Malorne pieces themselves* (29096 chest, 29100 shoulder, delta 0.00 by
construction). Every other candidate in both slots carries the Malorne-break
note. The two zero types have different causes despite the identical number.

## C8 — PARTIALLY REFUTED (recomputed by enumeration)

Enumerated `.scratch/rank-reports/*.json` and counted `"setContext"`:

- **`.json` files: 16** — not 28.
- Files containing `setContext`: **5**, all `shredzepelin-*`
  (`-demo` 13, `-p3` 24, `-set-weight-toggle` 13, `-toggle` 13, `-weighted-demo` 13).
- Non-shredzepelin files with `setContext`: **none**.

Directory totals: 42 files overall, 16 `.json`, 15 `.html`, no subdirectories.
So 28 matches neither the JSON count (16) nor the file count (42).

**Numerator and the substantive point are correct** — set-potential data exists
only for shredzepelin, so this feature has been exercised on exactly one
character. The denominator is wrong. Low severity (it makes the coverage sound
*worse* than it is: 5/16 = 31%, not 5/28 = 18%), but it is a number stated as
fact that does not reproduce, and the conclusion "only shredzepelin" stands
regardless.

## C9 — reproducible; method sound; range defensible for an unstated reason

The proxy **is** specified precisely enough to reproduce — `2·Str + Agi + AP`
over `data/items/index.json` `stats[0], stats[1], stats[31]`, x taken relative to
a named worn anchor per slot, with a runnable snippet. I ran it unmodified:

```
non-breaking: n=68 slope=0.1519 intercept= -11.70 residSD=18.00
breaking:     n=36 slope=0.1384 intercept=-127.47 residSD=12.71
B_hat = 115.77
```

Exact match to the reported figures. **Not a reproducibility failure** — the
audit brief's expectation that this could not be reproduced was itself wrong.
Per-slot fits also match: legs −7.15, hands −10.12, feet −15.65, chest −128.82,
shoulder −125.92.

**Is the method sound?** Yes, in structure. The identifying assumption is that
breaking and non-breaking slots share one stat→DPS calibration, so the intercept
gap isolates the fixed toll. That assumption is *testable and passes*: slopes
0.152 vs 0.138 agree to ~9%, which the model could have failed. The 116 gap
against residual SDs of 12.7/18.0 is not scatter. Chest (−128.8) and shoulder
(−125.9) agree independently, so it is not one slot dragging a pool.

**Does n=36/n=68 support the precision?** Yes for a range, no for a point. I ran
a 4000-draw bootstrap over both slot classes:

```
bootstrap B_hat: median=115.9  2.5%=108.0  97.5%=124.3
```

Sampling error alone gives roughly ±8, so quoting **116 as a point estimate is
overconfident**, and quoting a range is correct.

**But the stated 100–130 is right for a reason the report does not give.** The
dominant uncertainty is not sampling, it is **proxy specification**:

| proxy | B̂ |
|---|---|
| `2·Str + Agi + AP` (reported) | 115.8 |
| `Str + Agi + AP` | 120.7 |
| `AP` only | 125.1 |
| `Agi` only | 130.9 |
| `2·Str + Agi + AP + crit` | 99.8 |

Spread 100–131 across defensible proxies — **wider than the bootstrap CI**. So
"100–130" is defensible and honestly about the right width, but the report
justifies it from residual scatter when the real driver is proxy choice. Adding
crit alone moves B̂ by 16. The report flags proxy crudeness as "Weakness 1" and
says a better proxy "would tighten both fits" — my sensitivity check suggests the
opposite: proxy choice *is* the error bar, and refining it moves the centre as
much as it tightens the spread.

**Classification:** B̂ ≈ 116 is an **estimate derived from the artifact**, not a
measurement — which is how the prior report labels it. That labelling is correct
and should be preserved in anything downstream. The corrected true bonuses
(Thunderheart ≈ 78, Nordrassil ≈ 69) inherit the full 100–130 uncertainty and
should never be quoted to more than 2 significant figures.

---

## Summary for the engineering team

- **C1–C7 hold exactly.** The published set-bonus arithmetic is internally
  consistent to the last decimal place across four independent packages. I could
  not falsify any of it.
- **The one real defect is a comment**, not a computation: `brokenSetBonuses`'s
  docstring generalises k=2 into a universal "charged twice". Correct statement:
  net inflation is `(k−1)·B`, zero at k=1.
- **C8's denominator (28) does not reproduce** (16 JSON files). Its conclusion is
  unaffected.
- **C9 reproduces exactly** and its method survives scrutiny; the honest headline
  is "B is around 100–130, dominated by proxy-specification uncertainty", not
  "B = 116".
- **Worn equipment is absent from the rank artifact.** k had to be inferred (three
  agreeing routes, unambiguous here). Anyone re-deriving these numbers on a
  different character will not have that luxury if the Malorne-held slots are not
  as cleanly separable — consider emitting the baseline equipment into the
  artifact so k is readable rather than reconstructed.
