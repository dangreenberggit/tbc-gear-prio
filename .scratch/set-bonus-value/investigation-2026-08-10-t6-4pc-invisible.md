# Investigation — T6 Thunderheart chest/shoulders never surface (feral, P3)

Date: 2026-08-10. Artifact under test: `.scratch/rank-reports/shredzepelin-p3.json` (not regenerated).
Scope: read-only. No production source changed; all probes were `node -e` reads of the committed artifact.

---

## Verdict

Two independent mechanisms stack, and **either one alone would be sufficient** to keep Thunderheart
Chestguard (31042) and Pauldrons (31048) off the list.

**(1) The 4pc bonus is structurally unreachable by any row.** The player wears **zero** Thunderheart
pieces, so every single-swap candidate lands at `piecesAfterSwap === 1`.
`nextMeasurableThreshold(676, 1)` walks `SET_THRESHOLDS` in ascending order and returns the *first*
implemented threshold strictly above 1 — which is **2**, because Thunderheart's 2pc *is* implemented
(`IMPLEMENTED_IN_SIM[676] = {2: true, 4: true}`, `set-value.ts:38`). It therefore never reaches 4.
Every Thunderheart row consequently carries `nextThreshold: 2` and `prospectiveBonusDps: 31.46`, and
the measured 4pc value of 193.89 is **credited to no row in any display mode**. This is not a bug in
the sense of code diverging from spec — `applySetContext` (`rank.ts:1128-1134`) is doing exactly what
§2.3 asks. It is a **modelling gap**: "nearest threshold" is the wrong quantity when the interesting
bonus is two thresholds away.

**(2) Even with the 4pc fully credited, chest and shoulders would still lose their slots.** Their raw
deltas are −100.16 and −106.16. Adding the full 193.89 gives +93.7 and +87.7 — which *would* clear the
cutoff. So mechanism (2) is not independently fatal at `full` credit, but it is fatal at `weighted`
(0.25 × 193.89 = 48.5, giving −51.7 and −57.7) and fatal at every setting currently reachable, since
mechanism (1) pins the credit at 31.46 regardless.

The reason the deltas are ~−100 in the first place is the third finding, and it is the one I consider
most important: **the chest and shoulder slots are globally depressed by the Malorne 2pc breakage.**
The best available delta in *every other* slot is positive (legs +32.97, weapon +86.95, waist +45.50),
but chest and shoulder both top out at exactly **0.00 — the worn Malorne piece itself**. Every
non-Malorne candidate in those two slots is −90 or worse, including the PvP tunic (−90.16) and the
Nordrassil chest (−110.90). That is not five bad items; that is a ~90–100 DPS toll charged to *any*
swap that vacates a Malorne slot. The user's real-gearing intuition ("T6 chest/shoulders replace T4")
is correct precisely because in real play you swap *both at once* and pay the Malorne 2pc **once** —
which is the one thing single-swap ranking cannot represent.

---

## Evidence

Each claim below is reproducible against the committed artifact with the node snippet noted, or cites
file:line.

### E1 — Every Thunderheart row has `nextThreshold === 2`, including chest/pauldrons

```
node -e "const r=require('./.scratch/rank-reports/shredzepelin-p3.json').ranking;
const b=new Map(r.items.map(i=>[i.itemId,i]));
for(const id of [31034,31044,31048,31042,31039]){const i=b.get(id);
console.log(id,i.name,i.slot,i.deltaDps.toFixed(2),i.belowCutoff,JSON.stringify(i.setContext));}"
```

| item | slot | deltaDps | belowCutoff | piecesAfterSwap | nextThreshold | prospectiveBonusDps |
|---|---|---|---|---|---|---|
| 31044 Leggings | legs | +23.29 | false | 1 | 2 | 31.4598 |
| 31034 Gauntlets | hands | +21.75 | false | 1 | 2 | 31.4598 |
| 31042 Chestguard | chest | −100.16 | **true** | 1 | 2 | 31.4598 |
| 31048 Pauldrons | shoulder | −106.16 | **true** | 1 | 2 | 31.4598 |
| 31039 Cover | head | −211.95 | **true** | 1 | 2 | 31.4598 |

Confirms the delegating agent's table. The 193.89 4pc figure appears on **no** row.

### E2 — The mechanism, in source

- `nextMeasurableThreshold` (`packages/core/src/set-value.ts:97-106`) returns the *first* implemented
  threshold `t > piecesAfterSwap`. With `piecesAfterSwap = 1` and `isBonusImplemented(676, 2) === true`,
  it returns `2` and never inspects `4`.
- `applySetContext` (`packages/core/src/rank.ts:1128-1134`) computes
  `nextThreshold = nextMeasurableThreshold(setId, piecesAfterSwap)`, then at 1147-1152 looks up only
  `bonusesForSet.find(b => b.threshold === nextThreshold)`. A single `SetBonusValue` is selected; the
  4pc row is never consulted for these items.
- `weightedSetPotentialDps` (`rank-report-rules.ts:260-276`) reads `ctx.nextThreshold` for its weight
  and `ctx.prospectiveBonusDps` for its magnitude. Both are already pinned to the 2pc by the above, so
  **no display mode can recover the 4pc** — `full` multiplies 31.46 by 1.0, not 193.89 by 1.0.

### E3 — Displayed values in all three modes (arithmetic, from E1 + `rank-report-rules.ts:260`)

| mode | Leggings | Gauntlets | Chestguard | Pauldrons |
|---|---|---|---|---|
| off (`deltaDps`) | 23.29 | 21.75 | −100.16 | −106.16 |
| weighted (0.5 × 31.46) | 39.02 | 37.48 | −84.43 | −90.43 |
| full (1.0 × 31.46) | 54.75 | 53.21 | −68.70 | −74.70 |

Reproduces the delegating agent's table exactly. Chest/shoulders remain deeply negative everywhere.

### E4 — The synergy arithmetic reproduces exactly (so the pipeline is not miscomputing)

```
node -e "..."   # singles summed from the artifact's own item rows
bonus2 = packageDelta2 - Σsingles2 = 76.50072 - 45.0410  = 31.4597  (reported 31.45975)
bonus4 = packageDelta4 - Σsingles4 - bonus2
       = 64.07344 - (-161.2758) - 31.45975            = 193.8895  (reported 193.88945)
```

Σsingles4 = (−106.16) + (−100.16) + 21.75 + 23.29 = −161.2758. `computeSynergy`
(`set-value.ts:332-345`) is implemented as specified; the formula is not the defect.

### E5 — `packageDelta` for 4pc (64.07) is LOWER than for 2pc (76.50) — explained

This looked alarming and is in fact the clearest single piece of evidence for the Malorne confound.
`packageDelta` is the raw DPS of the whole package versus baseline. Going 2pc → 4pc **adds the
chest and shoulder pieces**, which is what destroys the Malorne 2pc (`breaks: [{setId: 640, threshold: 2,
piecesBefore: 2, piecesAfter: 0}]` — present on the 4pc row, absent on the 2pc row, since the 2pc
package is hands+legs and touches no Malorne slot). So the 4pc package buys the T6 4pc bonus but pays
the Malorne 2pc loss *plus* two large raw stat downgrades, netting slightly worse in absolute terms.
That the 4pc package is a net *regression* against this specific P3 gear set is a real, correctly
measured fact — and it is the strongest argument that the user's real-gearing intuition applies to a
**fuller** T6 set than the one this pool can assemble, not to this two-piece marginal step.

### E6 — Chest and shoulder slots are globally depressed (the Malorne toll)

```
node -e "const r=require('./.scratch/rank-reports/shredzepelin-p3.json').ranking;
const s={};for(const i of r.items)(s[i.slot]=s[i.slot]||[]).push(i.deltaDps);
for(const k in s)console.log(k,'best',Math.max(...s[k]).toFixed(2),'n',s[k].length);"
```

Best delta per slot: legs +32.97, weapon +86.95, waist +45.50, feet +24.17, hands +21.75, finger
+18.70, neck +14.15, wrist +10.87, trinket +10.34, back +9.27 — but **chest 0.00 (n=20)** and
**shoulder 0.00 (n=18)**, where 0.00 is the worn Malorne piece scoring against itself. Head is also
0.00 (worn Wolfshead). Runner-up in each: chest −90.16, shoulder −102.16.

Twenty chest candidates and eighteen shoulder candidates, none positive, is a slot-level signature,
not an item-level one.

### E7 — The 0.25× (4pc) weight arm is NOT dead code

The delegating agent hypothesised it might be. It is not — 10 rows in this very artifact carry
`nextThreshold === 4`:

```
node -e "const r=require('./.scratch/rank-reports/shredzepelin-p3.json').ranking;
console.log(r.items.filter(i=>i.setContext&&i.setContext.nextThreshold===4)
.map(i=>[i.itemId,i.name,i.setContext.prospectiveBonusDps]));"
```

- 4 Nordrassil pieces + Headdress (5 rows) → `prospectiveBonusDps: 185.10`
- 5 Malorne pieces → `prospectiveBonusDps: 18.04`

**The asymmetry is the crux of the whole defect.** Nordrassil rows reach `nextThreshold === 4` from
`piecesAfterSwap === 1` *only because Nordrassil's 2pc is unimplemented* (`set-value.ts:37`,
`641: {2: false, 4: true}`), so `nextMeasurableThreshold` skips 2 and lands on 4. Malorne rows reach 4
because the player already wears 2. Thunderheart is the unlucky middle case: 2pc implemented, 0 worn,
so the walk stops at 2 forever.

That means **the tool currently advertises a 185.10 4pc potential for Nordrassil rows but a 31.46 2pc
potential for Thunderheart rows, purely as an artifact of which set happens to have an unimplemented
2pc.** Nordrassil Chestplate (−110.90) and Feral-Mantle (−112.55) get +185.10 × 0.25 = +46.3 in
weighted mode and the full +185.10 in `full` mode (→ +74.2 and +72.6, above cutoff), while the
strictly-better-in-reality Thunderheart equivalents get +31.46. **A user toggling to `full` will see
T6.5 Nordrassil chest/shoulders surface while T6 Thunderheart chest/shoulders stay buried — an
inversion produced entirely by the threshold-walk, not by any DPS fact.** I regard this as a more
serious reportable defect than the original complaint, because it is actively misleading rather than
merely silent.

### E8 — Sorting and cutoff are NOT independent causes

- `belowCutoffUnderView` (`view.ts:256-270`) *does* add the full prospective bonus before re-testing
  the cutoff — it is explicitly written to let set pieces climb back in (see its comment at 250-255).
  So the view path is sympathetic, not obstructive; it simply has 31.46 to work with instead of 193.89.
- `sortKeyFor` (`view.ts:272-276`) sorts on `deltaDps + prospectiveBonusDps` (full, unweighted).
  Again correct-in-intent, again starved of the right number.
- The HTML path does not use `applyView`: `rank-report.ts:322-323` stamps `data-delta`,
  `data-weighted`, `data-full` on every row and the client re-sorts. `groupBySlot`
  (`rank-report-rules.ts:98-110`) sorts by raw `b.deltaDps - a.deltaDps` for the initial render.
  Both read the same starved `setContext`.
- `cutoff` is `{absDps: 3.4, pct: 0.15}`. Chest/shoulders at −68.70 (best case, `full`) miss it by ~72
  DPS. **No plausible cutoff change surfaces them**; this is not a threshold-tuning problem.

Conclusion: sorting and cutoff would surface these rows correctly *if given the right value*. They are
downstream, not causal. **The user's hypothesis 2 is not supported.**

---

## Which user hypothesis was right

- **Hypothesis 1 (weird weighting)** — *partially*. The weighting is not "weird" so much as **never
  applied to the relevant bonus**. The 0.25× 4pc arm is live (E7) but unreachable for Thunderheart.
  The genuine weighting defect is the cross-set inversion in E7, which the user did not anticipate.
- **Hypothesis 2 (our sorting)** — **wrong**. Sorting and cutoff propagate the value faithfully (E8).
- **Hypothesis 3 (set bonuses evaluated at the wrong point)** — **right, and the proximate cause.**
  `nextMeasurableThreshold` collapses a *set of reachable thresholds* into a *single nearest one*, at
  `applySetContext` time, before any display logic can choose differently. `setContext` carries one
  scalar where it needs a vector. This is the concrete, fixable defect.
- **Hypothesis 4 (package effect single-swap ranking structurally cannot see)** — **right, and the
  deeper cause.** Confirmed below.

Both 3 and 4 are correct and they are different problems. Fixing 3 alone (crediting 193.89) would put
chest/shoulders on the list at `full` credit — but for a partly wrong reason, since 193.89 is inflated
(next section). Fixing 4 is not a patch; it is a change of method.

---

## Is the single-swap architecture structurally incapable of this? (hypothesis 4)

**Yes, and this should be stated plainly rather than patched around.**

The engine sims one candidate swapped into the logged baseline. A gearing decision whose value only
exists when four items move together is, by construction, outside the range of the question the engine
asks. Concretely, from E6: swapping *only* the T6 chest costs the Malorne 2pc and gains T6 stats, net
−100. Swapping chest *and* shoulders costs the Malorne 2pc **once** and gains two T6 pieces plus
progress toward 4pc. Single-swap ranking charges the Malorne loss to *each* candidate independently —
which is correct as an answer to "what if I equip exactly this one item tonight" and badly wrong as
an answer to "what should I aim for".

The completion-package machinery (`buildSetBonuses`, `rank.ts:914+`) is an existing, deliberate
partial escape from this limit — it sims the *package* to recover the synergy the singles miss. That
machinery works (E4 reproduces its arithmetic; V0c in `verification.md` validates the method
confound-free). The gap is purely that its **4pc result is not routed to the rows** (E2). So the
architecture is not incapable of *measuring* the package; it is incapable of *ranking on* it, because
the ranked unit is one item and the valuable unit is four.

Caveat I want on record: crediting the full 193.89 to a lone −100 chest is its own lie in the opposite
direction — it asserts that equipping that one item tonight is worth +93, which it is not. Any fix
must not merely move the error from one sign to the other.

---

## Is 193.89 trustworthy?

**No — it is inflated, and I estimate the true Thunderheart 4pc at roughly 30–60 DPS on this gear,
with low confidence on that range.** Three converging arguments:

**1. It nets in a broken Malorne 2pc, and the accounting double-charges it.** The 4pc row carries
`breaks: [{setId: 640, setName: "Malorne Harness", threshold: 2, piecesBefore: 2, piecesAfter: 0}]`.
`brokenSetBonuses`' own docstring (`set-value.ts:220-234`) states the failure mode precisely: the lost
bonus is charged **once** inside `packageDelta` but **twice** across `Σ singles` (the chest single and
the shoulder single each pay it), and since `bonus = packageDelta − Σsingles`, the residue lands in
the synergy as a **spurious positive**. Here two Malorne slots are vacated, so the over-subtraction is
roughly **two Malorne-2pc-equivalents** of phantom synergy.

**2. This is V0b reproduced almost exactly, at larger scale.** `verification.md` V0b measured a
Thunderheart package over **one** Malorne shoulder and got **+91.68**; the confound-free V0c measured
**+20.89**. V0b's caveat block explicitly forbids citing its figure as the bonus's value. The present
run breaks **two** Malorne slots (chest *and* shoulder, per `piecesBefore: 2 → piecesAfter: 0`) rather
than one, which is consistent with an even larger inflation than V0b's.

**3. The Nordrassil cross-check corroborates the magnitude.** Nordrassil 4pc reports **185.10** with
the *same* `breaks` entry (Malorne 2pc, 2→0) and the same two vacated slots. Two different sets landing
at 193.89 and 185.10 — within ~5% of each other — while their actual Go-source effects are entirely
different (Thunderheart 4pc: +15% Rip/Swipe/FerociousBite; Nordrassil 4pc: +75 flat Shred, +3 Lacerate
ticks, per `verification.md` V1) is a strong signal that **a large shared component dominates both
figures**, and the only shared component is the Malorne breakage. Roughly: if ~150 of each figure is
the common confound, the residual set-specific values (~44 and ~35) are plausible 4pc magnitudes and
sit in the same range as V0c's clean 20.89 for Malorne 4pc.

**Marked hypothesis (untested):** the ~150 decomposition above is inference from the near-equality of
two numbers, not a measurement. Confirming it requires a confound-free probe — a Thunderheart 4pc
package built over slots holding **no** Malorne piece, which this character's gear cannot supply
(Malorne occupies chest and shoulder, two of the four T6 slots). An alternative clean probe is to
measure baseline-minus-Malorne-2pc directly (unequip both Malorne pieces, sim, compare) and subtract
the toll explicitly. **I did not run either probe** (see scope limits).

The 2pc figure of **31.46 is comparatively trustworthy**: its package is hands+legs (31034, 31044),
neither slot holds a set piece, and the row carries **no `breaks` entry**. It is structurally the V0c
case. Its `se` is 4.02, so 31.46 is ~7.8σ — comfortably real.

---

## Recommendations, ranked

### R1 — Report the cross-set inversion as a defect in its own right (E7). Highest value, lowest cost.

Before changing any valuation, record that Nordrassil rows advertise 185.10 while Thunderheart rows
advertise 31.46 *for structural reasons unrelated to their DPS*, and that under `full` credit this
inverts their order on the page. **Cost:** a ticket, no code. **Risk:** none. **Breaks:** nothing.
I would do this regardless of which of R2–R5 is chosen, because it is the finding most likely to
mislead a user acting on the report tonight.

### R2 — Fix the confound before the valuation. Prerequisite for R3/R4 being worth doing.

Both 4pc figures in this artifact are unusable as magnitudes. Options, cheapest first:
(a) **Suppress the number when `breaks` is non-empty**, showing the breakage reason instead of a
DPS figure — honest, and `formatBreaksSuffix` already has the vocabulary.
(b) **Measure the broken bonus's cost separately** (one extra sim: baseline with the other set's
pieces removed) and subtract it, reporting a corrected figure with the correction shown.
**Cost:** (a) is display-only, ~an hour; (b) is one extra sim per breaking package plus arithmetic.
**Risk:** (a) removes numbers users may have been relying on — but they were wrong numbers.
**Breaks:** (a) changes `--with-set-potential` output and any test asserting on it; (b) changes
§2.2's formula surface and would need a `verification.md` entry.
**Do not ship R3 or R4 on top of an uncorrected 193.89** — that would surface chest/shoulders using a
number I have argued is ~4× too large, i.e. right answer for wrong reason, and fragile.

### R3 — Make `setContext` carry all reachable thresholds, not the nearest one. The principled fix for hypothesis 3.

Replace the single `nextThreshold` / `prospectiveBonusDps` pair with a list of
`{threshold, bonusDps, piecesNeeded}` for **every** implemented threshold above `piecesAfterSwap`.
Display then chooses — e.g. `weighted` credits `Σ bonus_t × weight(t) / piecesNeeded_t`, or shows the
best-scoring threshold and names it ("+193.89 at 4pc, needs 3 more pieces").
**Cost:** medium. Touches `set-value.ts`, `rank.ts:1128-1152`, `rank-report-rules.ts:260-300`,
`view.ts:256-276`, the HTML data attributes, and their tests.
**Risk:** moderate. `SetContext` is a published shape; changing it is a breaking change to the report
JSON. Mitigate by *adding* a `thresholds[]` field and leaving the existing scalars as the nearest-
threshold values, so old consumers keep working.
**Breaks:** the §8.2 "default ranking output unchanged" invariant in `verification.md` — that check
strips `setContext`, so it should survive, but this needs re-running to confirm rather than assuming.
**This is the fix I would choose if the team wants the tool to answer the user's question.** Pair it
with a pieces-needed divisor so a 3-pieces-away 4pc is not credited like a 1-piece-away one — the
current flat weighting explicitly declines to do this (`rank-report-rules.ts:222-228`), and that
choice is exactly what makes a lone chest look like a top upgrade.

### R4 — Change nothing in valuation; document the limitation. Defensible, and my recommendation if effort is constrained.

Add a standing note to the report (and `CONTEXT.md` / an ADR) stating: *this tool ranks single swaps
against your current gear; multi-piece set completions whose value only exists when several pieces are
worn together are visible in the "set potential" section but are not, and cannot be, reflected in
per-item ranks.* Optionally surface the raw `setBonuses` block more prominently, since it **already
contains** the 4pc row the user wants to see — it is in the artifact, just not on any item.
**Cost:** low, documentation only. **Risk:** low. **Breaks:** nothing.
**Why it is defensible:** the per-item numbers are *correct answers to the question actually asked*
("what if I equip this one item tonight"). Nothing is lying except by omission, and R1 + R4 together
close the omission. The user's expectation is about a different question, and naming that boundary is
more honest than approximating an answer to it with a confounded 193.89.

### R5 — Package-aware ranking (evaluate multi-item bundles as ranked units). Do not do this now.

The only fix that genuinely addresses hypothesis 4. Would require ranking bundles alongside items,
a combinatorial candidate-generation step, and a re-think of what `rank` means.
**Cost:** very high — a new phase, not a slice. **Risk:** high; combinatorics, sim budget (§2.4 targets
~4 extra sims per run and this blows through it), and a UI that must not present a 4-item bundle as if
it were a drop. **Breaks:** the core `RankedItem`-per-item model and most of the report.
Listed for completeness and to be explicitly deferred.

---

## What I did not check

- **I ran no sims.** Every number here is read from the committed
  `.scratch/rank-reports/shredzepelin-p3.json` or recomputed arithmetically from it. I did not
  regenerate the artifact (instructed not to) and did not run the confound-free probe that would
  turn my 30–60 DPS estimate into a measurement. That estimate is **hypothesis, not observation**.
- **The ~150 shared-confound decomposition in the "Is 193.89 trustworthy" section is inference**
  from the near-equality of 193.89 and 185.10, not a measured quantity.
- **I did not verify the HTML report renders as the code implies.** I read `rank-report.ts` and
  `rank-report-rules.ts` and traced the data attributes, but did not open a generated HTML file or
  exercise the client-side toggle in a browser. My E8 claim about the HTML path is a **code-reading
  claim**, not an observed-behaviour one.
- **I did not read the wowsims Go source at the pin.** I relied on `verification.md` V1's table for
  what Thunderheart/Nordrassil/Malorne bonuses actually do. If V1 is stale relative to the current
  pin, my E7 asymmetry argument (which depends on Nordrassil 2pc being unimplemented) would need
  re-checking — though `set-value.ts:37` encodes the same claim, so the code and the doc at least agree.
- **I did not audit other characters, specs, or universes** for the E7 inversion. I found it in this
  one artifact; whether it is widespread is unmeasured.
- **I did not check whether the P3 pool can even supply a fuller T6 set** (e.g. whether a 5-piece
  Thunderheart configuration avoiding both Malorne slots exists), which bears on how much of the
  user's real-gearing intuition this tool could ever represent.
- **I did not run `pnpm verify`** — no source was modified, so there was nothing to verify.
