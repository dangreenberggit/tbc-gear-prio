# Set-bonus value — design review

Date: 2026-08-10. Scope: read-only design review of how set-bonus value reaches the ranking.
No production source changed; no sims run. All numbers are read from committed JSON artifacts
or from source at file:line.

Companion documents (do not duplicate):
- `.scratch/set-bonus-value/investigation-2026-08-10-t6-4pc-invisible.md` — the root-cause
  investigation for D1/D2/D3 on shredzepelin-p3. This review assumes its findings and does not
  re-derive them.
- `.scratch/set-bonus-value/break-confound-correctability.md` — a separate agent's derivation of
  whether the Malorne-breakage confound is arithmetically correctable. **Not addressed here.**
  Several recommendations below are gated on its answer; each says so explicitly.

Defect labels used throughout, as given by the delegating agent:
- **D1** — the 4pc never reaches a row (`nextMeasurableThreshold` returns the nearest threshold).
- **D2** — cross-set inversion (an unimplemented 2pc makes a set's rows advertise a *larger*
  prospective bonus than a set whose 2pc is implemented).
- **D3** — slot-level dead zones (every candidate vacating a worn-set slot pays the break toll).

---

## 1. Generality — is this one unlucky configuration, or systemic?

### 1.1 What was surveyed

Every `.json` under `.scratch/rank-reports/` (16 files) and `data/universes/` (12 files),
enumerated mechanically by a subagent using `node -e`-equivalent reads. Reproduce the file
classification with:

```
node -e "const fs=require('fs');for(const f of fs.readdirSync('.scratch/rank-reports').filter(f=>f.endsWith('.json'))){const j=JSON.parse(fs.readFileSync('.scratch/rank-reports/'+f));console.log(f, Object.keys(j).join(','), j.ranking?j.ranking.items.length+' items':'no ranking');}"
```

**Corpus reality check, and it is the single most important finding of this section:**

| category | files | usable for this question |
|---|---|---|
| rank reports with `ranking.items` | 14 | yes |
| rank reports carrying **any** `setContext` | **5** | yes |
| rank reports with `setBonuses` absent entirely | 9 | no — predate the feature |
| `data/universes/*.json` | 6 | no — pool definitions, no ranking |
| `data/universes/*.report.json` | 6 | no — coverage/membership reports, no ranking |
| other (`slamaltman-baseline-gear.json`, `slamaltman-p3-sme-review.json`) | 2 | no — not rank reports |

The five files with `setContext` are **all shredzepelin (feral)**: four are P2
(`shredzepelin-demo`, `-toggle`, `-set-weight-toggle`, `-weighted-demo` — byte-identical in every
field this review reads) and one is P3 (`shredzepelin-p3`). **There is no committed post-feature
ret artifact at all.** The ret side's only set-bonus evidence in the repo is verification.md §8.4's
pasted CLI block, not a committed JSON.

> **This is the honest headline: the corpus cannot answer "is it systemic?" across specs, because
> the corpus contains exactly one spec and effectively two distinct configurations (feral P2 and
> feral P3, same character, same worn gear).** Any claim below about ret is inference from
> `IMPLEMENTED_IN_SIM` and verification.md V1, marked as such.

### 1.2 D1 — does any row ever carry `nextThreshold === 4` with an implemented 2pc?

Yes, but only via the legitimate route. Tally across the 5 setContext-bearing files:

| route | rows per file | setId | why |
|---|---|---|---|
| **legit** (player already wears ≥2, so the walk starts above 2) | 5 | 640 Malorne (2pc implemented) | `piecesWornBefore: 2` |
| **by skip** (`piecesAfterSwap === 1`, 2pc unimplemented so the walk jumps to 4) | 5 | 641 Nordrassil (2pc **not** implemented) | `piecesWornBefore: 0` |
| **blocked** (`piecesAfterSwap === 1`, 2pc implemented so the walk stops at 2) | 5 (P3 only) | 676 Thunderheart | `piecesWornBefore: 0` — **this is D1** |

Reproduce on the P3 artifact:

```
node -e "const r=require('./.scratch/rank-reports/shredzepelin-p3.json').ranking;
const t={};for(const i of r.items){const c=i.setContext;if(!c)continue;
const k=[c.setId,c.setName,c.nextThreshold,c.piecesWornBefore,c.piecesAfterSwap].join('|');
t[k]=(t[k]||0)+1;} console.log(t);"
```

**Conclusion for D1: the blocking condition is exactly `piecesWornBefore === 0` AND the set's 2pc
is implemented.** That is not an unlucky coincidence — it is the *default state for every tier set
the player has not started*, which is the precise population the feature exists to inform about
(spec §1: "a tier piece that does not cross a threshold by itself… the player cannot see that it is
a step toward a bonus"). D1 fires on the feature's own primary use case.

How many sets can hit it? From `IMPLEMENTED_IN_SIM` (`set-value.ts:29-39`), the sets whose 2pc is
implemented are **629 Crystalforge, 680 Lightbringer, 640 Malorne, 676 Thunderheart** — four of six.
For any of those four, a player at 0 or 1 worn pieces can never see the 4pc on a row. Only 626
Justicar and 641 Nordrassil escape, and they escape by being *broken in a different way*.

**So D1 is systemic in the strong sense: it is a property of the algorithm crossed with the
worn-piece count, and it fires for 4 of the 6 known sets whenever the player is below 2 pieces.**
It is invisible in the P2 artifacts only because Thunderheart is not in the P2 universe — the P2
files have no set at all in the (0 worn, 2pc implemented) state. Feral P3 is not unlucky; feral P2
is the lucky one.

**Untested / inference:** for ret specifically, Crystalforge (629) and Lightbringer (680) both have
implemented 2pc, so a ret player at 0 pieces of either would hit D1 identically. I have no committed
ret artifact with `setContext` to confirm this against — it follows from the same code path, but it
is **not measured**. Confirming it costs one `pnpm rank` on `ret-p3` with `--with-set-potential`,
which I had no budget for.

### 1.3 D2 — the cross-set inversion

Present and stable in **all five** setContext files, not just P3. Every one of them carries:

| setId | setName | nextThreshold | prospectiveBonusDps | rows | piecesWornBefore |
|---|---|---|---|---|---|
| 641 | Nordrassil Harness | 4 | **185.10** | 5 | 0 |
| 640 | Malorne Harness | 4 | 18.04 | 5 | 2 |
| 676 | Thunderheart Harness (P3 only) | 2 | **31.46** | 5 | 0 |

The P2 files show a *milder* version of the same disease: Nordrassil rows (0 worn) advertise 185.10
while Malorne rows (2 worn, i.e. genuinely one or two pieces from the 4pc) advertise 18.04. A reader
sorting on `full` credit sees the set the player has *no* pieces of ranked far above the set they are
two pieces into, and the ordering is driven by which 2pc happens to be unimplemented plus the
uncorrected break confound, not by DPS.

The P3 file adds the sharp case the investigation named: Nordrassil Chestplate at
−110.90 + 185.10 = **+74.20** versus Thunderheart Chestguard at −100.16 + 31.46 = **−68.70**, with
Thunderheart being the strictly better item in reality.

**Note the compounding.** D2 is not one defect but two stacked:
1. the threshold-walk asymmetry (185.10 is a *4pc* figure, 31.46 is a *2pc* figure — different
   quantities compared as if commensurate), and
2. **both** 185.10 and 193.89 carry `breaks: [{setId: 640, threshold: 2, piecesBefore: 2,
   piecesAfter: 0}]`, so both are inflated by the same uncorrected Malorne toll.

Fixing D1 alone converts D2 from "185.10 vs 31.46" to "185.10 vs 193.89" — commensurate at last, and
the inversion disappears. **But both numbers remain confounded.** That is the dependency on the
other agent's question.

### 1.4 D3 — slot dead zones

This one is emphatically **not** feral-specific, and it is the most widespread of the three. Every
rank report in the corpus has at least two dead-zone slots (best `deltaDps` ≤ 0.01). Reproduce:

```
node -e "const r=require('./.scratch/rank-reports/shredzepelin-p3.json').ranking;
const s={};for(const i of r.items)(s[i.slot]=s[i.slot]||[]).push(i.deltaDps);
for(const k of Object.keys(s)){const v=s[k].sort((a,b)=>b-a);
console.log(k,'n='+v.length,'best='+v[0].toFixed(2),'2nd='+(v[1]??NaN).toFixed(2));}"
```

Dead-zone slots per file (best delta ≤ 0.01), with the gap to the runner-up:

| file | dead slots | worst gap (best → runner-up) |
|---|---|---|
| shredzepelin-p3 (feral) | chest, shoulder, head, ranged | head 0 → −202.05; chest 0 → −90.16; shoulder 0 → −102.16 |
| shredzepelin-demo/toggle/×3 (feral P2) | chest, shoulder, head, wrist, ranged | head 0 → −220.69; shoulder 0 → −112.55; chest 0 → −110.90 |
| sme-2026-08-06-nexess(-fixed) (feral P2) | back, chest, head, legs, ranged, shoulder, trinket | head 0 → −215.14; chest 0 → −73.65; shoulder 0 → −75.02 |
| sme-2026-08-06-slamaltman(-fixed) (ret P2) | hands, head, neck, shoulder, trinket, wrist, weapon, ranged | hands 0 → −12.68; shoulder 0 → −10.10 |
| slamaltman-p3-universe (ret P3) | head, shoulder, trinket, ranged | head 0 → −13.97; shoulder 0 → −0.96 |
| slamaltman-p3-post-cleanup / -postfix (ret P3) | trinket, ranged | trinket 0 → 0 |
| slamaltman-p3-full-pool (ret P3) | head, ranged, hands, trinket | head 0 → −16.19 |
| t8-paired-se-measurement (ret P2) | hands, head, neck, shoulder, trinket, weapon, wrist, ranged | head 0 → −0.47 |

**But the *cause* is not uniform, and this is the distinction that matters for whether D3 is one bug
or two phenomena.** Compare the gap magnitudes:

- **Feral chest/shoulder: gaps of −73 to −112.** These are the set-break dead zones. The worn Malorne
  pieces sit in chest and shoulder; every candidate vacating either pays the 2pc toll. This is D3 as
  described.
- **Feral head: gaps of −202 to −220.** This is **not** a set break — Wolfshead Helm is `setId: null`
  (verification.md V0c states this explicitly). It is a unique-effect item (the +20 energy on
  Cat Form shift) that no stat-stick can match. Structurally similar *symptom*, different cause.
- **Ret shoulder/head/hands/wrist: gaps of −0.20 to −16.** These are ordinary "your current item is
  simply the best in this pool" slots. Not a toll, not a defect. A dead zone with a −0.96 runner-up
  is a slot where the pool has nothing to offer, which is a true and useful answer.

So the mechanical detector "best delta ≤ 0" over-collects badly. **The signature that isolates the
D3 pathology is a dead zone whose worn item carries a `setId` that is at or above an implemented
threshold, together with a large runner-up gap.** In this corpus that is: feral chest + shoulder,
in all five feral files (Malorne 640, 2 worn, 2pc implemented). Ret's dead zones are, as far as this
corpus shows, benign.

**Untested:** I cannot confirm the ret dead zones are set-free from the artifacts alone — the ret
files have no `setBonuses` block and items carry no `setId` field in the report JSON, so I inferred
"benign" from the *small* runner-up gaps (−0.20 to −16, versus feral's −73 to −220), not from set
membership. A toll costing under 1 DPS is not a toll worth naming. Confirming properly means joining
each report's worn items against `data/items/index.json` for `setId`, which I did not do.

### 1.5 Verdict on generality

| defect | verdict |
|---|---|
| **D1** | **Systemic.** A property of `nextMeasurableThreshold` × worn-piece count. Fires for 4 of 6 known sets whenever the player wears <2 pieces — the feature's own primary use case. Feral P3 is the normal case; feral P2 avoids it only because its universe contains no set in that state. Ret is **inferred** to behave identically (untested — no committed ret artifact carries `setContext`). |
| **D2** | **Systemic within the current set table, and present in every setContext-bearing artifact** (5/5), including the four P2 ones. Requires only that two sets in one universe differ in whether their 2pc is implemented — true for feral (Nordrassil vs Malorne/Thunderheart) and true for ret (Justicar vs Crystalforge/Lightbringer). |
| **D3** | **The dead-zone *symptom* is universal** (every report has ≥2 such slots) **but the set-break *cause* is confined, in this corpus, to feral chest/shoulder.** Ret's dead zones have runner-up gaps of −0.2 to −16, consistent with "pool has nothing better", not with a toll. Do not report D3 as a repo-wide set-bonus defect without the `setId` join described above. |

**One-line answer: D1 and D2 are the normal case, not one unlucky configuration. D3 is real but
narrower than the raw dead-zone count suggests, and its most dramatic instance (feral head, −220) is
not a set-bonus problem at all.**

---

## 2. Design options for D1 — how should `setContext` carry threshold information?

Current shape (`spec.md` §3, implemented at `rank.ts:1128-1152`):

```ts
setContext?: {
  setId; setName; piecesWornBefore; piecesAfterSwap;
  nextThreshold: 2 | 4 | null;      // ← the scalar that collapses the information
  crossesThreshold: boolean;
  prospectiveBonusDps?: number;     // ← the matching SetBonusValue.bonusDps
}
```

The defect is that `applySetContext` selects one `SetBonusValue` at engine time, before any display
logic runs, and the selection rule ("nearest implemented threshold above `piecesAfterSwap`") is a
poor proxy for "the one worth showing".

### (a) Carry ALL measurable thresholds per row

```ts
thresholds: { threshold: 2|4; bonusDps?: number; se?: number;
              piecesNeeded: number; unmeasured?: UnmeasuredReason;
              breaks?: BrokenSetBonus[] }[]
```

- **Fixes:** D1 completely and D2 as a consequence (a Thunderheart row and a Nordrassil row both
  carry their 4pc entry, so the display compares like with like).
- **Costs:** medium. `set-value.ts` (new selector), `rank.ts:1128-1152`, `rank-report-rules.ts:260-300`
  (`weightedSetPotentialDps` must fold a list), `view.ts:256-276` (`belowCutoffUnderView`,
  `sortKeyFor`), the HTML `data-*` attributes at `rank-report.ts:322-323`, and every test touching
  those. Report JSON grows by ~2 entries per set-bearing row (24 rows on the P3 artifact — trivial).
- **Breaks:** `SetContext` is a published shape. Mitigate by *adding* `thresholds[]` and leaving the
  scalars as-is (nearest-threshold values), so existing consumers keep working. Note spec §8.2's
  "default ranking output unchanged" check strips `setContext` wholesale, so it should survive — but
  that must be **re-run, not assumed** (procedure is in verification.md §8.2).
- **Can it mislead?** Yes, and this is the important caveat: it hands the display a menu and makes
  the *choice* the display's problem. If display picks max-value, a 3-pieces-away 4pc outranks a
  1-piece-away 2pc every time. That is D1 fixed and a new distortion introduced, unless the
  `piecesNeeded` divisor comes with it. The current flat weighting explicitly declines a
  pieces-remaining divisor (`rank-report-rules.ts:222-228`) — that decision must be revisited
  together with this, not after.

### (b) Carry the *best* (highest-value) reachable threshold

- **Fixes:** D1 for the Thunderheart case (4pc's 193.89 > 2pc's 31.46, so 4pc wins). Fixes D2's
  symptom.
- **Costs:** small — a one-function change in `set-value.ts` plus the `applySetContext` lookup. No
  shape change at all, so no consumer breaks and no test churn beyond the selector's own.
- **Breaks:** nothing structural. Changes numbers in the existing shape, which changes the report and
  any snapshot test asserting on it.
- **Can it mislead?** **Badly, and worse than the status quo in one direction.** "Best" is defined by
  a number that is currently confounded — 193.89 and 185.10 are both inflated by the Malorne break.
  So this option *selects on the confound*: the more a package breaks, the larger its inflated
  bonus, the more likely it is chosen as "best". It systematically prefers the most-confounded
  threshold. It also silently makes every 0-piece row advertise a 4-pieces-away bonus with no signal
  of distance. **I would not ship this without the confound correction landing first**, and even then
  the distance problem remains.

### (c) Carry nearest (unchanged), let display walk `ranking.setBonuses` itself

- **Fixes:** D1, if the display does the walk. `ranking.setBonuses` already contains every measured
  `(setId, threshold)` including the 193.89 4pc row — the data is in the artifact today.
- **Costs:** smallest engine change (**zero**). But `weightedSetPotentialDps` and `sortKeyFor`
  currently take `Pick<RankedItem, "deltaDps" | "setContext">` — a row only. They would need the
  whole `Ranking` threaded through, which is a wider signature change than it sounds and pushes
  domain logic (which threshold is relevant for this row?) into the display layer.
- **Breaks:** the layering. `setContext` exists precisely so a renderer does not have to know the
  threshold rules. This option deletes that benefit. Also: the HTML report's client-side toggle is
  pure JS over `data-*` attributes (`rank-report.ts:322-323`), so the walk would have to be
  reimplemented in the browser or pre-baked into attributes — at which point you have done option
  (a) with extra steps.
- **Can it mislead?** No more than (a), but it makes the same misleading choice available in two
  places that can drift apart (CLI/`applyView` vs the HTML client).

### (d) Leave `setContext` alone; surface set completion as its own UI concept

- **Fixes:** it does not fix D1 — it **dissolves** it. If a package's value is never smeared onto
  member rows, there is no "which threshold does this row advertise" question to get wrong. D2
  likewise dissolves (nothing on a row to invert). D3 remains.
- **Costs:** **largely already built.** `rank-report.ts:383-390` renders a `Set potential (N)` panel
  listing every `SetBonusValue` via `formatSetBonusLine`, with `setPotentialDisclosureLine()` naming
  the method; the CLI prints the equivalent block (verification.md §8.4). The remaining work is
  editorial: make the panel state the package contents (`packageItemIds` is already on the type but
  the line does not name the items), show `breaks` prominently, and — if the smearing is removed —
  delete the `weighted`/`full` toggle and its weights.
- **Breaks:** removing the toggle is a visible feature regression for anyone using it. The
  `--with-set-potential` per-item line (`formatSetPotentialLine`) would go or become purely
  informational ("member of Thunderheart 4pc — see set potential"), carrying no DPS number into the
  sort.
- **Can it mislead?** Least of the four. Its failure mode is omission, not misattribution: a user
  scanning only the ranked list will not notice a set opportunity. That is fixable with a
  non-numeric badge on member rows.

### Recommendation for Q2

**(d) as the destination, (a) as the fallback if the team wants to keep numeric per-row credit.**

(d) is the only option that does not require choosing a fraction with no principled basis (see §3),
and the panel it depends on already exists. (a) is the right *shape* if per-row credit is kept, but
it must ship with a pieces-needed divisor, which means reopening the deliberate
`rank-report-rules.ts:222-228` decision. **(b) should be rejected outright** — it selects on the
confound. (c) is (a) with worse layering.

---

## 3. Is smearing a package's value across member rows ever honest?

### The case for smearing

1. **Users act on ranked lists, not panels.** The ranked list is the artifact's product. A T6 chest
   that is a genuine step toward a 193-DPS bonus and shows −100 with no annotation is *misleading by
   omission* — the reader concludes "don't take it", which is the wrong call if they intend to
   assemble the set. Omission is a form of dishonesty too.
2. **The counterfactual is often not "one item".** `full` credit's docstring
   (`rank-report-rules.ts:238-248`) makes exactly this argument: "what is this piece worth *if* I end
   up completing the set anyway", which is realistic when the remaining pieces are upgrades on their
   own merits. Under that framing a member row's credit is not a claim about tonight but about a
   plan, and the plan is the thing a loot-priority tool exists to serve.
3. **Attribution across a package is a standard, tractable problem.** Shapley value gives a
   principled per-member split of a coalition's surplus. A package's bonus divided N ways is
   defensible in a way that "0.5×" is not.

### The case against

1. **You cannot collect it N times, and the display sums as if you could.** Four Thunderheart rows
   each carrying +193.89 total +775 DPS of advertised value against a bonus worth (at most) 193.89
   once. Nothing in the sort or the cutoff knows these are the same DPS counted four times. A user
   reading down the list sees four independently-strong items.
2. **It corrupts the sort's meaning.** The default rank answers "value tonight" and spec §1 says that
   must not change. The toggled sort answers something else — but it produces *one interleaved list*
   in which set rows have been credited with a conditional future and non-set rows have not. The two
   kinds of row are no longer commensurable, yet they are sorted against each other.
3. **The conditional is unstated and load-bearing.** "+193.89 if you complete the set" is a
   conditional whose probability the tool does not know and cannot estimate. Collapsing it to a point
   estimate on a row erases the condition. `formatSetPotentialLine` does append "(needs N more
   pieces)" — good — but the *number that enters the sort* carries none of that.
4. **It is being applied to a confounded quantity.** Smearing 193.89 four ways spreads a figure the
   investigation argues is ~4× too large. Smearing amplifies whatever error is in the input by
   distributing it into four rows that each look independently credible.

### On the 0.5 / 0.25 fractions

Read `rank-report-rules.ts:219-233`. The docstring's justification is: *"A 2pc is nearer and cheaper
than a 4pc, so it is discounted less."* That is a statement about **distance**, and the code then
explicitly refuses to scale by distance ("the weight does not scale by how many pieces are still
missing. A row three pieces short of 4pc therefore carries the same 0.25x credit as one that is a
single piece away").

**The fractions have no principled basis and the code says so, in a way.** The stated reason
(`so the toggle stays the arithmetic the reader can do in their head`) is a *legibility* argument,
not a correctness one — and it is a legitimate consideration, but it is not a defence of 0.5 and
0.25 as values. Observe:

- If the fraction meant "expected share of the bonus this piece delivers", 2pc → 1/2 and 4pc → 1/4
  are exactly the reciprocal of the threshold. That is the Shapley split of an atomic threshold bonus
  across its members, and it would be principled — **but it is not what the code computes.** Shapley
  would divide by the number of *contributing members*, and the code divides by the *threshold*
  while crediting **every** member row the same fraction. With four member rows each at 0.25, the
  total credited is 4 × 0.25 × bonus = **the whole bonus, counted once in aggregate but four times in
  any pairwise comparison** — which is the objection in point 1 above, merely rescaled.
- Worse, it is not even consistently reciprocal-of-threshold: a row 3 pieces away and a row 1 piece
  away get identical 0.25. So the fraction is not a probability, not a share, and not a distance
  discount. It is a plausible-looking constant.

`full` (1.0) is more defensible than `weighted`, precisely because it stops pretending. Its docstring
says it "reads as an upper bound rather than an estimate" — that is an honest label for an honest
quantity. **`weighted` is the less honest of the two modes**, because 0.5/0.25 has the *shape* of a
calibrated discount without being one.

### My position

**Smearing is honest only under two conditions, and the repo currently meets neither:**

1. The smeared quantity must be **de-confounded** (a corrected bonus, or suppressed when
   `breaks` is non-empty), and
2. The display must make the **shared, non-additive** nature of the credit unmissable — at minimum,
   member rows of the same package visually grouped and the credit shown as a property of the group,
   never as N independent row values that a sort silently interleaves with unconditional deltas.

Absent (2), any fraction — 0.5, 0.25, 1.0, or a Shapley 1/N — makes the same false implication, just
at different magnitudes. **The fraction is not the problem; putting a package's number in a
per-item sort key is the problem.** That is why I land on option (d): a "complete this set" card that
names the package, its measured value, its cost (`breaks`), and its distance is the honest
representation of a quantity that is inherently about a *set of items*. A number that only exists for
a coalition should be displayed on the coalition.

The one concession I would make to the pro-smearing case: member rows should carry a **non-numeric**
badge ("Thunderheart 4pc — 3 more") linking to the card. That kills the omission objection without
putting a shared number into a per-item sort.

---

## 4. Prior art in-repo — what was anticipated, what is settled

### Already decided deliberately — do not reopen

| decision | where | status |
|---|---|---|
| **Do not split a bonus across pieces.** "A set bonus is gained and lost atomically at a threshold… Splitting its value per piece invents a fiction: no single below-threshold piece delivers any of it." | `spec.md` §2.1 | **Settled, and it is the same argument I make in §3.** Note the irony: the *measurement* honours §2.1 (attached whole per (set, threshold)); the *display* (`weightedSetPotentialDps`, added later) violates its spirit by smearing fractions onto rows. Option (d) restores §2.1's intent rather than overturning it. |
| **Default ranking output must not change.** | `spec.md` §1, §8.2; PLAN.md §14 amendment | **Settled.** Any option here must keep it; §8.2's procedure is the check and it is re-runnable (verification.md §8.2). |
| **Nearest-measurable threshold rule.** "A candidate's `nextThreshold` points at the smallest threshold above `piecesAfterSwap` whose bonus is *implemented*… Example: a first Nordrassil piece shows the 4pc Shred bonus because 2pc is `not-implemented-in-sim`." | `spec.md` §2.3 | **Deliberate, and D1/D2 are its direct and foreseeable consequences — but the consequence was not foreseen.** The spec's own worked example is the *by-skip* case (Nordrassil), presented as a feature. Nobody wrote down what happens to the symmetric case (Thunderheart: 2pc implemented, 0 worn). **This is the one prior decision I think should be reopened**, and reopening it is not re-litigating: the spec chose "nearest" without considering that it makes the 4pc unreachable for the majority of sets. |
| **Multi-item bundles as ranked units are out of scope.** "Multi-set interaction, cross-set packages, or ranking whole packages as recommendations." | `spec.md` §7 | **Settled and correctly deferred.** This is R5 in the investigation. Do not propose it. |
| **Measuring bonuses the player already has is out of scope** (break case stays qualitative via `setBonusNote`). | `spec.md` §7 | **Settled** — but note this is precisely why D3 has no numeric handle. See §5 R4. |
| **The cutoff is absolute; a filter never moves the bar.** | `docs/adr/0020` | **Settled.** Relevant because it forecloses "just lower the cutoff so chest/shoulders surface" — correctly, and the investigation's E8 independently confirms no plausible cutoff change reaches them. |
| **Negative deltas on BiS rows are correct and expected**, often via set breaks; keep the signed delta visible, never let a pin imply "upgrade". | PLAN.md line 272 | **Settled, and it is the closest thing to a prior acknowledgement of D3.** PLAN.md anticipated the *symptom* ("most often by breaking a tier 2-set or 4-set bonus") and chose disclosure over correction. D3 is therefore a **known, accepted limitation** at the item level. What PLAN.md did not anticipate is the *slot-level* version — that the toll makes an entire slot uniformly negative, so the slot conveys no ranking information at all. |

### Anticipated and explicitly flagged, not yet acted on

| finding | where | status |
|---|---|---|
| **The break confound.** "the lost bonus is charged once inside `packageDelta` but twice across `Σ singles`… the residue is misattributed to the set being completed. No sim can separate the two after the fact, so this reports the breakage rather than trying to correct for it." | `set-value.ts:220-234` docstring; verification.md V0b caveat + "Production consequence (finding 8)" | **Known, deliberately reported-not-corrected.** V0b (+91.68, confounded) vs V0c (+20.89, clean) is the measured demonstration. The `breaks` field exists *because of* this decision. Whether the "no sim can separate the two" claim holds is exactly the other agent's question — **if they show it is correctable, this docstring's stated rationale is falsified and the decision is open again.** |
| **The flat-vs-distance weighting choice.** | `rank-report-rules.ts:222-228` | **Deliberate**, justified on legibility. Ripe for revisiting if option (a) is chosen (§2), since (a) without a divisor makes the distance problem worse. |
| **`full` over-credits every row of the set equally; "reads as an upper bound rather than an estimate".** | `rank-report-rules.ts:238-248` | **Known and stated.** The author of `full` understood the N-times objection and shipped it as an explicit upper bound. That is a defensible framing and I do not think it should be called a defect — but it is not documented anywhere the *reader of the report* sees. |
| **Justicar 2pc reclassified `not-implemented-in-sim`** (research.md said otherwise; V1's Go-source read corrected it). | verification.md V1 | **Settled.** Relevant to D2: it means ret has the same implemented/unimplemented 2pc asymmetry feral has (Justicar vs Crystalforge/Lightbringer), which is the basis for §1's inference that D2 reaches ret. |
| **Burning Rage (566) and Gladiator's Vindication (583) default to `not-implemented-in-sim` untested.** | verification.md §8.4 closing note | **Flagged follow-up, unrelated to D1–D3** but it widens the D2 surface: any set wrongly defaulted to unimplemented gets a by-skip 4pc. |

### Not anticipated anywhere

- **D1 as a general condition** (as opposed to the Nordrassil by-skip case, which the spec presents as
  intended behaviour). No document states that a set with an implemented 2pc and 0 worn pieces can
  never surface its 4pc.
- **D2, the cross-set inversion.** First identified in
  `investigation-2026-08-10-t6-4pc-invisible.md` E7. Nothing prior.
- **D3 at slot granularity.** PLAN.md line 272 covers the item-level case; nothing covers "an entire
  slot's candidate list is uniformly negative and therefore uninformative".
- **No ADR covers set bonuses at all.** `docs/adr/` contains 0016–0022; a grep for
  `set bonus|setBonus` over `docs/adr/` and `CONTEXT.md` returns nothing. The whole feature's design
  record lives in `.scratch/set-bonus-value/` plus the PLAN.md §14 amendment. If any of §5's
  recommendations land, **that gap should be closed with an ADR** — the threshold-selection rule is
  exactly the kind of decision that has now been made twice and mis-remembered once.

---

## 5. Ranked recommendations

Each entry: what it fixes / what it risks / rough size / dependency on the confound question.

Legend for the confound dependency:
- **BLOCKED** — do not ship before `break-confound-correctability.md` reports.
- **INDEPENDENT** — safe to do now regardless of its answer.

---

### R1 — Document the limitation and change nothing. **INDEPENDENT. Size: S (half a day).**

Write the boundary down where readers see it: the report's disclosure line and an ADR. Text:
*this tool ranks single swaps against your current gear; a multi-piece set completion's value exists
only when the pieces are worn together, is listed in the "Set potential" panel, and is not reflected
in per-item ranks.* Plus the investigation's E7 finding as a known-issue note.

- **Fixes:** the omission objection, partially. Nothing mechanical.
- **Leaves live — state this plainly:** **D1 live** (4pc still invisible on rows), **D2 live** (the
  Nordrassil/Thunderheart inversion still renders and still misleads anyone who toggles to `full`),
  **D3 live**. The confounded 185.10/193.89 figures still display in the Set potential panel.
- **Risk:** documenting a misleading number is weaker than removing it. A user who toggles `full`
  and sees Nordrassil chest at +74.20 above Thunderheart chest at −68.70 is misled *at the point of
  decision*, and a disclosure line elsewhere on the page does not reach them.
- **Verdict: defensible only as a floor, not as the answer.** I would accept it as the whole response
  if and only if R2 ships with it — otherwise the tool's most misleading output is left running with
  a footnote.

### R2 — Suppress or flag the number wherever `breaks` is non-empty. **INDEPENDENT. Size: S–M (1–2 days).**

Where a `SetBonusValue` carries a non-empty `breaks`, do not render a bare DPS figure — render the
value with an explicit "includes the cost of breaking <set> <n>pc; magnitude unreliable" qualifier,
and exclude it from `weightedSetPotentialDps` (fall through to plain `deltaDps`, which the function
already does for unmeasured bonuses at `rank-report-rules.ts:265-272`).

- **Fixes:** the *acute* harm of D2 — the inversion is driven by two confounded figures, and
  suppressing both removes the misleading comparison immediately. Also removes the confounded
  193.89/185.10 from any sort key.
- **Leaves live:** D1 (still no 4pc on rows — but now visibly nothing rather than misleadingly
  something), D3.
- **Risk:** removes numbers currently displayed. They were wrong numbers, and V0b/V0c is the measured
  evidence for that (91.68 confounded vs 20.89 clean on the same mechanism). Low risk.
- **Why INDEPENDENT:** it is the correct behaviour whether or not the confound turns out to be
  correctable — if correctable, R2 is later replaced by the corrected figure; if not, R2 is the
  permanent answer. Either way it is not wasted.
- **This is the highest value-per-cost item on the list and I would do it first.**

### R3 — `setContext` carries all measurable thresholds (option 2a) + a distance-aware display. **BLOCKED. Size: M (3–5 days).**

Add `thresholds[]` alongside the existing scalars (keeping them as the nearest-threshold values so
consumers do not break). Display picks, and must pick with `piecesNeeded` in hand.

- **Fixes:** D1 fully; D2 structurally (commensurate quantities at last).
- **Risks:** (i) published-shape change — mitigated by adding, not replacing; (ii) re-run spec §8.2's
  unchanged-output check, do not assume it passes; (iii) **it puts a bigger number into the sort, so
  if the confound is uncorrected it makes D2's magnitude worse, not better** — a Thunderheart chest
  would surface at +93 on a figure argued to be ~4× too large. Right answer, wrong reason.
- **Dependency: BLOCKED on the confound question.** Shipping R3 over uncorrected figures is the one
  outcome I would actively argue against. R2 first, then R3.
- **Also requires reopening** the flat-weight decision (`rank-report-rules.ts:222-228`), which was
  deliberate — so this needs an explicit decision, not a quiet change.

### R4 — Surface the slot dead zone as a first-class report concept. **INDEPENDENT. Size: M (2–4 days).**

Where a slot's best delta is ≈0 *and* the worn item is at/above an implemented threshold of its set,
label the slot: "every candidate here breaks your Malorne 2pc (−X DPS); these deltas each pay that
toll once, but replacing chest and shoulder together pays it once total."

- **Fixes:** D3's interpretability. It does not change any number — it explains why a whole column is
  negative, which is currently unexplained and reads as "this slot has no upgrades".
- **Leaves live:** D1, D2. The arithmetic of D3 is untouched (correctly — the per-item numbers are
  right answers to the single-swap question).
- **Risk:** the detector must not over-collect. Per §1.4, "best delta ≤ 0" alone flags benign ret
  slots and feral head (Wolfshead, `setId: null`, a unique-effect item, gap −202). **Gate the label
  on the worn item's `setId` being at/above an implemented threshold**, not on the delta alone.
- **Prerequisite:** report items currently carry no `setId` field (confirmed: item fields are
  `rank, itemId, name, slot, source, deltaDps, deltaPct, se, seMethod, bisTags, belowCutoff, sources,
  hitRegression, setContext, belowCutoffInView`). The worn-item join against `data/items/index.json`
  needs doing, in the engine, not the renderer.
- **Note this is the only recommendation that addresses the user's original complaint** ("T6
  chest/shoulders should replace T4"). D1/D2 fixes make the *number* better; only R4 explains the
  *slot*.

### R5 — Move to option (d): package-as-card, no per-row numeric smear. **BLOCKED (partly). Size: M–L (4–7 days).**

Enrich the existing `Set potential` panel (`rank-report.ts:383-390`) into a real "complete this set"
card: name the package items (`packageItemIds` is already on the type and already carried in the
JSON), its measured value, its `breaks` cost, and pieces-needed. Replace the per-row numeric credit
with a non-numeric member badge. Retire `SET_POTENTIAL_WEIGHTS` and the `weighted`/`full` toggle.

- **Fixes:** D1 and D2 by dissolution — no per-row threshold selection means no wrong selection and
  no cross-set inversion. Aligns display with spec §2.1's own "do not split the bonus across pieces"
  rule, which the display currently contradicts.
- **Leaves live:** D3.
- **Risks:** removes a shipped, user-visible toggle — needs the user's agreement, not just a review's.
  Loses the (real) benefit that toggling `full` surfaces set members in the ranked list at all; the
  member badge must be prominent enough to compensate or the omission objection returns.
- **Dependency: the *card* is INDEPENDENT** (it can display a `breaks`-qualified value per R2 today);
  **the decision to delete the smear is BLOCKED** only in the sense that if the confound proves
  correctable and someone wants numeric per-row credit back, R3 becomes viable again. R5 and R3 are
  alternatives, not a sequence.
- **This is my recommended destination** (see §2, §3), but it should follow R2 and can follow R4.

### R6 — Package-aware ranking (multi-item bundles as ranked units). **Do not do. Explicitly deferred.**

Settled out of scope by `spec.md` §7. Listed only so the deferral is visible. Would blow spec §2.4's
sim budget and change what `rank` means.

### Recommended sequence

```
R2 (suppress confounded figures)          ← now, independent, cheap
  └─ R1 (document, incl. E7)              ← alongside R2
       ├─ R4 (slot dead-zone labelling)   ← independent, addresses the original complaint
       └─ [await break-confound answer]
            ├─ correctable  → R3 (thresholds[] + distance weighting)  OR  R5
            └─ not correctable → R5 (card, no smear)  ← my preference either way
```

---

## What I did not check

- **No sims run**, per instruction. Every figure is read from committed artifacts or from source.
- **No ret artifact with `setContext` exists in the repo**, so §1's claims about D1/D2 reaching ret
  are **inference from `IMPLEMENTED_IN_SIM` and V1**, not measurement. Confirming costs one
  `pnpm rank` on `ret-p3` with `--with-set-potential`.
- **I did not join report items against `data/items/index.json` for `setId`**, so §1.4's
  classification of ret dead zones as benign rests on runner-up gap magnitude (−0.2 to −16) rather
  than on set membership. This is the weakest empirical claim in the review.
- **I did not open a rendered HTML report or exercise the client-side toggle.** All display claims are
  code-reading claims (`rank-report.ts`, `rank-report-rules.ts`, `view.ts`).
- **I did not read the wowsims Go source at the pin** — `IMPLEMENTED_IN_SIM` and verification.md V1
  are taken as given.
- **I did not address whether the break confound is arithmetically correctable** — out of scope by
  instruction; that is `break-confound-correctability.md`.
- **`pnpm verify` not run** — no source modified.
- Two inert probe scripts were left at `.scratch/_enum_probe.js` and `.scratch/_enum_probe.cjs` by
  the enumeration subagent (a guardrail hook blocked its own cleanup). Safe to delete.
