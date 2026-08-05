# Pool formation — independent diagnosis and recommended plan

> **⚠ STATUS: PLAN SUPERSEDED — MEASUREMENTS STILL VALID.**
> The owner has locked a different direction: **raid-scoped pool formation**, in
> `.scratch/handoffs/raid-scoped-pool-handoff.md`. That handoff rejects both
> Option A (lists-first membership, its D4) and Option B (sim-scout membership,
> its D5). **§8 Tier 2 of this document recommended leaning toward Option A —
> that recommendation is dead. Do not follow it.**
>
> What remains valid and is cited by the new direction: every **measurement**
> here — the 2/16 BiS admission rate (§1), the three EP failure mechanisms (§2),
> the plate-gate interaction showing the armor fix alone rescues 1 of 7 (§8), the
> tier-set gap (§5), and the ρ=0.183 EP-vs-simmed-ΔDPS result (§7). Those are
> facts about the current pipeline and are unaffected by which direction is
> chosen. §7's librams finding (EP ≡ 0 for every libram, generator emits zero
> ranged entries) directly constrains the new direction's junk filter.
>
> **Correction to a claim made in conversation, not in this doc:** I stated
> "membership needs a BiS-list source, not a loot table." That was an unjustified
> leap. The measurements rule out *linear EP as the selector*; they say nothing
> about whether a loot table plus a selectivity rule suffices. It can. The open
> question is efficiency, now under measurement in
> `.scratch/handoffs/raid-scoped-pool-spike.md`.

**Author:** Independent diagnostic pass (outside Cursor), 2026-07-28
**Role:** Diagnosis, analysis, independent problem-solving perspective. **No project code changed by this author.**
**Branch context:** `phase-1/five-seed-spread` (dirty tree). Not landed, not merged.
**Relationship to prior work:** This builds on the existing fan-out
(`option-a.md`, `option-b.md`, `review-math.md`, `review-sme.md`,
`compiled-recommendation.md`). It does **not** replace them. It supplies the
*measured* evidence that pass argued from qualitatively, corrects one shared
premise, and sharpens the prototype ordering.

---

## 0. TL;DR

The owner's claim is correct and now has a number behind it.

| Finding | Measurement |
|---|---|
| Generator admits wowsims' own curated ret BiS sets | **2 of 16 items**, identically for preraid / P1 / P2 |
| Distinct BiS items missed across all 3 sets | 22 EP rank-out, **7 plate-only filter**, 1 `quality<rare` |
| Ret tier set pieces present in pool | T4 2/5, T5 2/5, T6 5/8 — **a 4pc bonus is unrepresentable** |
| Pool entries surviving `phase<=2` gate | **65 of 164**; wrist 2, head 3, legs 3, waist 3 |
| Worst tier-piece EP shortfall | Lightbringer Gauntlets misses cutoff by **1.5 EP** |
| Fixing the armor gate *alone* | rescues **1 of 7** — the two failures interact (§8) |
| **EP vs simmed ΔDPS, 191 real sims** | **overall ρ = 0.183**; trinket/finger/shoulder ≈ 0; librams EP ≡ 0 (§7) |

The single most important correction to the existing docs: **this is two
independent fatal failures, not one.** Every prior artifact frames the problem as
"EP is the poison." EP accounts for 22 of 30 misses. The other 8 are the
`armorType == PLATE` gate and the quality floor — structural exclusions that
**no EP redesign can ever fix**, because the items are rejected before scoring.

---

## 1. Reproducing the headline measurement

All numbers below come from scoring items with the generator's own functions, so
there is no re-implementation drift:

```bash
python -c "
import json,sys; sys.path.insert(0,'scripts'); import generate_pool as G
db=json.load(open('vendor/wowsims/db.json')); items={i['id']:i for i in db['items']}
gen=json.load(open('data/pools/ret.generated.json'))
genids={e['itemId'] for e in gen['entries']}
for tag in ['preraid','p1','p2']:
    g=json.load(open(f'vendor/wowsims/ret_{tag}.gear.json'))
    ids=[it['id'] for it in g['items'] if it.get('id')]
    print(tag, sum(1 for i in ids if i in genids), '/', len(ids))
"
```

Expected output: `preraid 2 / 16`, `p1 2 / 16`, `p2 2 / 16`.

**Oracle caveat, stated up front.** These vendored sets are wowsims' curated
gear sets, which PLAN §8.3 nominates as the BiS-tag source and simultaneously
warns are dated and stop at P2. So the honest reading is: *the generator
disagrees violently with the best offline reference the repo already vendors.*
A 12.5% agreement rate is not explicable by the oracle being somewhat stale.
This is evidence of generator failure, not proof the sets are truth.

---

## 2. The three EP failure mechanisms, separated

Prior docs treat "EP is wrong" as one thing. It is three, and they need
different fixes.

### 2.1 Structural blindness (unfixable by reweighting)

Linear EP scores a **stat vector**. Procs, on-use effects, and set bonuses are
not in that vector. No choice of weights in `p2.ep-weights.json` can score a
quantity the model cannot represent.

Measured: Bloodlust Brooch EP **29.5**, Dragonspine Trophy EP **16.4**, against a
trinket cutoff of **36.9**. Both are in wowsims' P1/P2 BiS sets. Both rank out.
Trinkets are the slot where linear EP is *most* wrong and it is applied there
identically to every other slot.

This is the strongest form of the owner's claim and I would put it directly to
anyone still arguing for cap-clipping (PLAN §8.3.3 / R13) as sufficient.
Cap-clipping fixes slope error at a point. It does nothing about a missing
dimension.

### 2.2 Tier-blindness (the budget leak)

EP has no notion of phase; it ranks by total stat, and later tiers always carry
more. Of 156 generated entries, **60 are phase 4–5** content that does not exist
at `maxPhase: 2`.

Consequence: the top-12-per-slot budget is spent mostly on items the rank stage
immediately discards, which is *why* several slots collapse to 2–3 live
candidates. The pool is nominally 164 and effectively 65.

```bash
python -c "
import json,collections
cur=json.load(open('data/pools/ret.json'))
p2=[e for e in cur['entries'] if (e['phase'] or 9)<=2]
print(len(p2),'of',len(cur['entries']))
print(sorted(collections.Counter(e['slot'] for e in p2).items()))
"
```

### 2.3 Hard-cutoff brittleness

Top-N on a blind scorer means noise-level EP margins decide membership.
Lightbringer Gauntlets misses by **1.5 EP**; Crystalforge Gauntlets by **4.3**.
Those margins decide whether a 4-piece set bonus is representable at all.

---

## 3. The failure the prior docs under-weight: the plate gate

`scripts/generate_pool.py:168-178` requires `armorType == 4` on all eight body
slots. Ret's real BiS is not all plate:

| Item | armorType | In which vendored set |
|---|---|---|
| Belt of One-Hundred Deaths | 2 (leather) | p2 |
| Shattrath Leggings | 2 (leather) | **all three** |
| Cobra-Lash Boots | 3 (mail) | p2 |
| Mask of the Deceiver | 2 | preraid |
| Grips of Deftness | 2 | p1 |
| Gloves of the Searing Grip | 2 | p2 |
| Shoulderpads of the Stranger | 2 | p2 |

These are invisible to the generator at any EP weighting. This is what `FORCE`
in `curate_ret_pool.py:146` actually exists to paper over — **FORCE is not
curation, it is a manual patch over a generator that structurally cannot
represent the answer.**

`option-b.md` Stage 0 and the compiled recommendation's item 2 both call for
leather+mail+plate eligibility. Correct. My addition is only that this must be
scoped as a **separate, independently-verifiable fix**, because it is the one
change that is unambiguously a bug fix rather than a design choice — and it can
ship before any membership redesign is settled.

---

## 4. Same EP in both stages — verified in code

`packages/core/src/pool.ts:44-51`:

```ts
export function prefilterPool(pool, opts = {}) {
  const limit = opts.limit ?? EP_PREFILTER_LIMIT;
  if (opts.fullPool || pool.length <= limit) return [...pool];
  return [...pool].sort((a, b) => (b.ep ?? 0) - (a.ep ?? 0)).slice(0, limit);
}
```

The `ep` sorted on here is the **stored value the generator wrote**. Confirmed:
correlated double poison, as the brief claimed.

Two details worth adding to the record:

- The prefilter is a **global** top-80, not per-slot. Slot starvation therefore
  compounds rather than being bounded per slot.
- **`--full-pool` cannot rescue this.** It escapes the rank-time prefilter only.
  The pool file is strictly upstream and strictly more restrictive. No runtime
  flag can recover an item that was never generated. Anyone triaging
  "is it the prefilter or the generator" should start at the generator.

---

## 5. Set bonuses — measured, and the cheap win is real

`db.json` carries `setId` and `setName` on **1957 items**. The generator reads
neither. The ret tier sets are exactly three IDs:

| setId | Set | Pieces | In pool | Missing |
|---|---|---|---|---|
| 626 | T4 Justicar Battlegear | 5 | 2 | 3 |
| 629 | T5 Crystalforge Battlegear | 5 | 2 | 3 |
| 680 | T6 Lightbringer Battlegear | 8 | 5 | 3 |

**All 9 missing pieces pass `ret_equippable`.** They are pure EP rank-outs. So a
set-aware include is a clean 9-item fix requiring **no filter changes and no EP
changes**.

```bash
python -c "
import json,sys; sys.path.insert(0,'scripts'); import generate_pool as G
db=json.load(open('vendor/wowsims/db.json'))
cur={e['itemId'] for e in json.load(open('data/pools/ret.json'))['entries']}
for sid,label in {626:'T4',629:'T5',680:'T6'}.items():
    v=[i for i in db['items'] if i.get('setId')==sid]
    print(label, len(v), 'pieces,', sum(1 for i in v if i['id'] in cur), 'in pool')
"
```

**Scope this narrowly.** A naive "include all set pieces" adds **199** items —
mostly vanilla and PvP sets (Lawbringer, Gladiator's *, Oathbound's). The
correct selector is the three ret tier `setId`s above, not `setId is not null`.

**Measurement caveat that must survive into implementation:** a single tier piece
swapped in alone can sim *worse* than a non-tier alternative because it does not
complete a bonus. The existing set-break machinery (commit `cffba53`) already
flags 2/4pc breakage at rank time, so the engine knows about set bonuses — the
membership stage is what does not. Including the pieces is necessary but the
single-swap product framing still cannot fully value them. Flag this as a known
limitation rather than a solved problem.

---

## 6. Where I differ from `compiled-recommendation.md`

I agree with the hybrid pick. Four amendments:

1. **Split the fixes by type before choosing a membership engine.** The compiled
   doc bundles equip hygiene into "Option B Stage-0 rules" as part of a larger
   redesign. Three of these are plain bug fixes with no design content: the
   armor gate, the set-piece include, and phase-awareness. They are independently
   testable and should not wait on the lists-vs-quant decision.

2. **The "stops at P2" premise is now VERIFIED TRUE.** Both the compiled doc
   (§6 open decision 4) and PLAN §8.3 build on it, and it holds:

   ```bash
   gh api repos/wowsims/tbc-new/contents/ui/paladin/retribution/gear_sets --jq '.[].name'
   ```

   Returns exactly `p1.gear.json`, `p2.gear.json`, `preraid.gear.json` — at our
   pinned `v0.0.101` and at `master`. Upstream `CURRENT_PHASE` is still
   `Phase.Phase2`, so upstream has no reason to have authored P3+ sets yet.
   The planner did not look in the wrong place.

   One correction to the supporting investigation: `scripts/sync_wowsims.py`
   `TRACKED` (lines 43-50) is a **hardcoded path map**, not a directory
   enumeration — it would *not* automatically pick up new gear-set files if
   upstream added them. That does not change the conclusion (the files genuinely
   do not exist upstream), but it does mean **a P3 launch requires editing
   `TRACKED`**, and nothing currently alarms on new upstream gear sets. Worth a
   ticket.

   **Consequence for the design:** Option A's largest stated weakness is real and
   permanent for now. There is no offline list source above P2, so P3+ membership
   *must* come from human transcription or from the legacy `wowsims/tbc` repo.
   I could not resolve the legacy repo's layout via the API path PLAN cites;
   treat "legacy has complete P1–P5" as **unverified** until someone checks it.

3. **PLAN's polearm claim was factually wrong and is now fixed.** PLAN.md §8.3
   [R11] asserted paladins cannot equip polearms. They can (Weapon Skill:
   Polearms trainer); they cannot equip staves. Corrected in this pass —
   PLAN.md only, no code touched. **Residual:** `scripts/generate_pool.py:10-11`
   still states the false equip rule as its docstring rationale. The code
   *behaviour* is defensible as a product filter (no ret-itemized polearms in
   TBC); only the stated reason is wrong. Comment-only fix, deliberately left
   for the owner. This resolves compiled-doc open decision 1 on the facts:
   the exclusion is a product choice, not an equip rule.

4. **Prototype ordering should lead with the falsifier, not the manifest.**
   The compiled doc's Prototype 1 (extract IDs, diff vs `ret.json`) is already
   done — that is §1 of this document, and the answer is 2/16. The highest-value
   unknown now is *whether EP has any usable signal at all*, which is a
   measurement nobody has. See §7.

---

## 7. The measurement that should gate the design decision

**RESOLVED.** Full report: `ep-vs-sim-measurement.md`. 191 candidates, real
pinned `wowsimcli` v0.0.101, seed 42, 3000 iterations, single-slot swaps onto the
`slamaltman` fixture. All 191 sims succeeded. **I independently recomputed every
correlation below from the raw `results.json` — they reproduce exactly.**

**Overall Spearman ρ(EP, ΔDPS) = 0.183** (n=191).

Per slot, with bootstrap 95% CIs I added (2000 resamples) because n≈14 per slot
is small and the agent's report gives point estimates only:

| Slot | n | ρ | 95% CI | Verdict |
|---|---|---|---|---|
| weapon | 13 | **+0.851** | [+0.47, +0.98] | real signal |
| feet | 15 | +0.685 | [+0.09, +0.94] | real signal |
| waist | 14 | +0.657 | [+0.06, +0.97] | real signal |
| hands | 15 | +0.632 | [+0.14, +0.85] | real signal |
| wrist | 13 | +0.560 | [−0.01, +0.91] | marginal |
| legs / head / chest / neck / back | 13–15 | +0.17 … +0.35 | — | weak |
| shoulder | 13 | −0.016 | [−0.57, +0.58] | **no signal** |
| finger | 15 | −0.211 | [−0.62, +0.36] | **no signal** |
| trinket | 15 | −0.247 | [−0.69, +0.31] | **no signal** |
| ranged (librams) | 8 | undefined | — | **EP ≡ 0 for every libram** |

Pooled to reduce small-n noise: **stat-ish slots ρ=+0.27 (n=111)** vs
**effect-ish slots ρ=+0.01 (n=72)**.

**One correction to the agent's framing.** It reports trinkets as *negatively*
correlated. The bootstrap CI is [−0.69, +0.31] — it contains zero, so the
negative sign is not established at n=15. The defensible claim is **"no usable
signal in effect-driven slots,"** not "anti-correlated." Do not let the stronger
version propagate into design docs; it is not supported and it is not needed —
zero signal is already disqualifying for a membership gate.

**The librams result is the cleanest single finding in the whole pass**, and
verifying it turned up something worse than the agent reported. EP scores *every*
libram exactly **0.0** (their value is an equip effect, invisible to the stat
vector), so `generate_pool.py:221`'s `if score <= 0: continue` drops all of them:

```bash
python -c "
import json
g=json.load(open('data/pools/ret.generated.json'))
print('generated ranged entries:', sum(1 for e in g['entries'] if e['slot']=='ranged'))
c=json.load(open('data/pools/ret.json'))
print([(e['name'], e['ep']) for e in c['entries'] if e['slot']=='ranged'])
"
```

**The generator emits 0 ranged entries.** All 8 librams in the committed pool
exist only through `FORCE`, carrying hand-invented EP values (40, 45, 48, 50, 52,
55, 58, 60) written by a human in `curate_ret_pool.py`. Meanwhile their true
ΔDPS spans −13.79 to 0.

Two consequences worth stating plainly:

1. An entire equipment slot **bypasses the pipeline completely**. The
   "generate-then-curate" story does not describe what happens for ranged.
2. Those fabricated numbers are **live inputs to `prefilterPool`**, which sorts
   them against genuinely-computed EP from other slots. Invented ordering and
   measured ordering are mixed in one comparison with nothing marking which is
   which.

**Confirmed false negatives with sim numbers attached:** Razor-Scale
Battlecloak, Vengeance Wrap, Ancestral Ring of Conquest — all wowsims BiS/alt
picks, all **+9.8 to +16.1 real ΔDPS**, all EP-ranked out.

**Untested, flagged honestly:** the set-bonus interaction. The fixture wears only
1 tier piece, so no candidate crossed a 2pc/4pc threshold. §5's caveat remains
**unmeasured**, not cleared.

**Also unreconciled:** the agent counted 36 distinct BiS item IDs where I counted
30. Both counts are from the same three files; the difference is likely
slot-scoping of the union. Minor, but resolve it before either number is quoted
in a committed artifact.

### What this result means for the design

The hoped-for clean split — "EP works for stat slots, fails for effect slots" —
is **half true and not usable as a rescue**:

- The four solid slots (weapon, feet, waist, hands) do carry real signal.
- But ρ≈0.65 still reorders heavily inside a top-12 cutoff, and overall ρ=0.183
  means a global top-80 prefilter on stored EP is close to arbitrary.
- Effect-driven slots (trinket, finger, shoulder, ranged) have **no** signal, and
  those are exactly the slots where the famous chase items live.

So: **EP is not salvageable as a membership gate**, and the quant lane should not
be kept as a co-equal option. This vindicates Option A's core move (kill EP as
membership) on measured evidence rather than argument.

There is one narrow, legitimate survivor: **weapons** (ρ=0.851, CI excluding 0,
and the slot where the white-damage proxy does real work). If a cheap
quantitative nominator is wanted anywhere, that is the only slot with evidence
supporting it — and even there it should nominate, never exclude.

**Framing note for whoever reads that result:** membership and ranking need
different mathematics. Ranking asks "which is better" — nonlinear, sims answer
it. Membership only needs a **cheap admissible bound** with a bounded
false-negative rate. Current EP is neither: a point estimate used as a bound,
with no error term, so it discards silently. If a quantitative lane survives, it
should be built as an admissible heuristic — score generously, admit on the
optimistic side, assign unknown-effect items a high uncertainty bonus rather
than zero — not as "better weights."

---

## 8. Recommended plan

Ordered by (evidence gained) / (effort), and by dependency.

### Tier 0 — Bug fixes, independent of the membership decision

| # | Change | Files | Verification |
|---|---|---|---|
| 0.1 | Admit leather + mail + plate on body slots | `generate_pool.py` armor gate | All 7 non-plate BiS items become *eligible* (see warning below) |
| 0.2 | Auto-include ret tier `setId` ∈ {626, 629, 680} regardless of EP rank | `generate_pool.py` | All 18 ret tier pieces present; 9 → 18 |
| 0.3 | Make top-N phase-aware (N per slot **per live phase**, not global) | `generate_pool.py` | No slot has <6 candidates at `maxPhase: 2` |
| 0.4 | Fix `generate_pool.py:10-11` docstring polearm rationale | comment only | — |

#### ⚠ 0.1 does NOT work on its own — measured

I tested the armor fix in isolation. **It rescues 1 of 7.**

| Item | Slot | EP rank once admitted | Result |
|---|---|---|---|
| Belt of One-Hundred Deaths | waist | 9 / 267 | in top-12 |
| Gloves of the Searing Grip | hands | 14 / 361 | **still out** |
| Shoulderpads of the Stranger | shoulder | 16 / 349 | **still out** |
| Grips of Deftness | hands | 27 / 361 | **still out** |
| Shattrath Leggings | legs | 37 / 394 | **still out** |
| Mask of the Deceiver | head | 41 / 377 | **still out** |
| Cobra-Lash Boots | feet | 55 / 293 | **still out** |

Reason: admitting leather+mail takes body-slot eligibility from **1731 → 3510**
items. The top-12 cutoff gets *harder*, so six newly-admitted BiS pieces are
scored by the same blind EP and discarded again.

**The two failures are not additive — they interact.** Shipping 0.1 alone would
double generator input, change the committed pool, and rescue one item. That is
a poor trade and could easily read as "we fixed the armor bug" when the shortlist
barely moved.

**Therefore: 0.1 must ship together with a membership change that does not rank
on blind EP (Tier 2), not ahead of it.** 0.2 and 0.3 remain safe to ship
independently — 0.2 because set-membership bypasses EP ranking entirely, 0.3
because it reallocates budget rather than enlarging the input.

This also retro-justifies `FORCE`: with a blind top-N scorer, forcing was the
*only* mechanism that could put these items in the pool. The fix is to remove the
need for FORCE, not to remove FORCE first.

**0.1 and 0.3 will change `data/pools/ret.generated.json` and `ret.json`.** Per
AGENTS.md "Durable claims", regenerate from committed sources with the pinned
toolchain and confirm the tree matches `HEAD` before commit. Note both files are
**already dirty** on this branch — reconcile that first.

### Tier 1 — Resolve the two open premises

| # | Question | Status |
|---|---|---|
| 1.1 | Do P3+ ret gear sets exist upstream? | **RESOLVED — no.** See §6.2 |
| 1.2 | Per-slot EP vs simmed ΔDPS correlation | **RESOLVED — ρ=0.183.** See §7 |
| 1.3 | Does legacy `wowsims/tbc` actually carry P1–P5 ret sets? | **Unverified** — PLAN asserts it; API path did not resolve |

**Both blocking questions are answered. The membership decision is unblocked.**

1.1: no offline list source above P2 — Option A needs a human transcription path
for P3+ regardless. 1.2: EP has no usable membership signal — the quant lane is
not a co-equal option.

1.3 is now the *only* open data question, and it matters more than it did before:
with upstream capped at P2, the legacy repo is the difference between
"transcribe P3+ by hand" and "seed from stale-but-real lists." Worth one hour
before Tier 2 starts. It is not blocking — Option A works either way, the cost
just differs.

### Tier 2 — Membership engine (unblocked; 1.2 decided its shape)

Adopt the compiled doc's hybrid, **leaning further toward Option A than that doc
did**, because ρ=0.183 removes the empirical case for keeping a quantitative
membership lane:

- **Membership = committed list union** (vendored wowsims sets P0–P2 ∪
  transcribed Anniversary BiS+Alt manifests for P3+ ∪ existing FORCE folded in as
  provenance), gated by Tier-0 equip rules.
- **Remove reference-EP `prefilterPool` as the default gate** (`pool.ts:44`).
  With overall ρ=0.183, a global top-80 on stored EP is close to arbitrary
  narrowing. Sim the phase-filtered list.
- **Delete the fabricated libram EP values.** EP is definitionally 0 for every
  libram; the 45–60 values in `curate_ret_pool.py` FORCE entries are invented
  ordering with no referent. Whatever replaces them must not be a number that
  looks like a measurement.
- **Ban EP-shadow auto-add** — high-EP-not-in-list produces a human ticket, never
  an automatic pool insert. `review-math.md` flags this as the re-poisoning
  vector, and ρ=0.183 says such a signal would be near-noise anyway.
- **Optional, evidence-backed exception:** weapons (ρ=0.851) may keep a
  quantitative *nominator* to catch items the lists miss. Nominate only —
  never exclude. This is the single slot with measured support.

### Tier 3 — Regression oracle (do this alongside Tier 2, not after)

Commit the 2/16 measurement as a **test**, not a memory. Assert that the
generated pool contains the vendored gear-set IDs (minus a documented, justified
exclusion list). This is the artifact that prevents silent regression to
today's state, and it costs almost nothing now that the measurement exists.

Keep at least one reference slice **held out** of membership so the Phase-1
gate (PLAN §14) is not a tautology — an oracle that is also the input proves
nothing.

### Explicitly not in this plan

Landing to `dev`, `pnpm land`, rewriting the sim/rank engine, Wowhead scraping as
a build dependency, TMB as a data source, and the Gorehowl magnitude / P2-vs-P3
preset tracks.

---

## 9. Open decisions for the owner

Carried from `compiled-recommendation.md` §6, with two now resolved:

1. ~~Polearms: include or product-exclude?~~ → **Resolved on the facts.** Equip
   rule was false; exclusion stands as a product choice. Owner may still choose
   to include; that is now an itemization judgment, not a rules question.
2. Arena/Gladiator gear in the default raid pool — off unless tagged?
3. Who owns Anniversary guide re-transcription cadence?
4. ~~Above P2: Wowhead-only vs stale `wowsims/tbc` seeds?~~ → **Pending 1.1**,
   which may make this moot.
5. When phase-filtered list exceeds ~200: provenance caps vs always full-pool?
6. **New:** does the single-swap product framing adequately serve tier sets at
   all, given a lone piece can sim worse than its alternative? (§5 caveat.)
