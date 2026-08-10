# SME rank judgment — shredzepelin, feral, P3 (set-bonus values)

Date: 2026-08-10. Read-only: no production source modified, no sims run, nothing committed.
Scope: **TBC game-domain plausibility only.** A separate agent audits the arithmetic; I do not
re-derive it. My question is whether these numbers describe a game that exists.

---

## Verdict

**do-not-trust** — specifically, do not trust any 4-piece figure in this artifact, and do not
trust the ~116 DPS Malorne 2pc estimate that a downstream correction is built on.

The 2-piece figures are fine. The whole 4pc column is not. The correction proposed to fix it is
built on a number that is itself impossible, so the "corrected" values inherit the error rather
than removing it.

Nothing here is an arithmetic complaint. Every number I dispute reproduces from the artifact
exactly. They are correct computations of a quantity that is not the set bonus.

---

## What was reviewed

- Character: shredzepelin, feral druid, night elf (assumed from preset, not from the log —
  `ranking.assumptions.standing[0]`), maxPhase 3 (Black Temple / Hyjal tier).
- Baseline: 2152.10 DPS, stdev 128.18 (`ranking.baseline`). Encounter is Void Reaver
  (`ranking.fight`), which is a Tempest Keep (P2) fight, not a BT/Hyjal one.
- Worn tier: 2 pieces Malorne Harness (T4, setId 640) — Breastplate 29096 (chest) and Mantle
  29100 (shoulder). 0 pieces Thunderheart Harness (T6, setId 676). Head is 8345 Wolfshead Helm.
- Pool: 407 entries, `data/universes/feral-p3.json`.
- Artifact: `.scratch/rank-reports/shredzepelin-p3.json`.
- Prior writeups I read but am not bound by:
  `.scratch/set-bonus-value/investigation-2026-08-10-t6-4pc-invisible.md`,
  `.scratch/set-bonus-value/break-confound-correctability.md`,
  `.scratch/set-bonus-value/verification.md`.

**Mechanics source.** `vendor/wowsims/db.json` carries **no set-bonus text at all** — there is no
`itemSets`/`setBonuses` structure and no `2pc`/`4pc` strings anywhere in the file (verified by a
sub-agent parsing the 3MB file; it reported "absent from db.json" explicitly). So the bonus
mechanics below come from `verification.md` V1, which transcribes the pinned Go source
(`sim/druid/item_sets.go` at pin `8aa378b3671a0923fd11fb34b4b3753e53f20c9b`). That table is the
only in-repo record of what these bonuses do. I did not re-read the Go source.

---

## Game problems

### G1 — Thunderheart (T6) 4pc at 193.89 DPS is not possible. (Q1)

**What the bonus does in the sim** (`verification.md:144`): T6 feral 4pc is
`SpellMod_DamageDone_Flat +0.15` on `Rip | Swipe | FerociousBite`.

That is a +15% damage modifier on three abilities. **I checked what this APL actually casts** rather
than assuming — `vendor/wowsims/feral_default.apl.json`, spell ids resolved against `db.json`:

```
python -c "import json,re; s=open('vendor/wowsims/feral_default.apl.json').read(); \
print(sorted(set(int(x) for x in re.findall(r'\"spellId\"\s*:\s*(\d+)',s))))"
# [768 Cat Form, 2825 Bloodlust, 24248 Ferocious Bite, 27002 Shred,
#  27008 Rip, 27011 Faerie Fire (Feral), 33983 Mangle (Cat), 35476 -]
```

The priority list (12 actions) is: Faerie Fire → **Rip** at 5cp when the dot is down and >10s remain
(action 3) → **Ferocious Bite** at 5cp when Rip is already up or the fight is nearly over (action 4)
→ Mangle (Cat) to maintain the debuff (action 5) → Shred filler (action 6).

So **two of the three buffed abilities are in live rotation**, and Ferocious Bite is not a fringe
cast — it is the default 5-combo-point finisher for every finisher after the first Rip. This
corrects my initial reading, which assumed the standard TBC practice of skipping Bite. **Swipe is
absent from the APL entirely**, so the Swipe component of the bonus contributes nothing here.

Rip plus Ferocious Bite together plausibly account for something like 25–35% of cat damage in this
rotation. **Domain knowledge, unverified against repo** — I did not read a damage breakdown, and
this is the number engineering should measure rather than take from me. +15% of a ~30% share is
**~4.5% of total DPS**, i.e. roughly **95 DPS**, with a defensible band of perhaps **60–120**.

That is materially higher than the ~30–50 I would have estimated for a Rip-only bonus, and it means
**193.89 is roughly 2× too large rather than 4–6×**. It does not rescue the figure — 9.0% of total
damage from a +15% modifier on a ~30% damage share is still arithmetically impossible, since the
ceiling if those abilities were 100% of damage would be ~13% and they plainly are not — but the
honest gap is a factor of about two, not five. **The plausible range is ~60–120 DPS; I would centre
near 95.**

Note this also makes the "corrected" ~78 figure land *inside* my plausible band rather than above
it (see G4), which changes what I can say against it. I address that below.

Note this bonus is also, in reality, mostly a *threat/bear* and AoE bonus with a modest cat
single-target component — T6 feral 4pc was never regarded as a huge cat DPS gain in TBC.
**Domain knowledge, unverified against repo.**

### G2 — The artifact contains its own proof that 193.89 is not a bonus value.

I do not need my Rip estimate to reject this figure. The artifact refutes it internally:

- `setBonuses` for 676 threshold 4 reports `packageDeltaDps: 64.07`.
- `setBonuses` for 676 threshold 2 reports `packageDeltaDps: 76.50`.

`packageDelta` is raw simmed DPS of the package against baseline. So **equipping four T6 pieces is
measurably worse than equipping two** — the 4pc package is a net regression versus the 2pc package.
A player who does exactly what this row describes gets *less* DPS. Reporting "the 4pc bonus is worth
+193.89" next to a package that loses 12 DPS relative to the smaller package is not a defensible
statement about the game in any framing.

The 4pc row also carries `breaks: [{setId: 640, "Malorne Harness", threshold: 2, piecesBefore: 2,
piecesAfter: 0}]`. The 2pc row carries no `breaks`. That is the whole difference: the 4pc package
puts T6 into chest and shoulder, which are the exact two slots holding this character's Malorne
pieces, destroying the T4 2pc. The 193.89 is an accounting residue of that breakage, not a bonus.

### G3 — Thunderheart 2pc at 31.46 DPS is plausible and is the one figure I trust. (Q2)

**What it does** (`verification.md:144`): `SpellMod_PowerCost_Flat -5` on Mangle (Cat), plus a bear
threat modifier that is irrelevant to a cat.

Mangle (Cat) is a core, frequently-cast ability. A 5-energy discount on it is a real, continuous
throughput gain — a cat is energy-capped, so energy saved converts almost directly into extra
Shreds. **Domain knowledge, unverified against repo:** 5 energy off Mangle is commonly reckoned at
roughly 1–2% DPS for TBC feral. 31.46 DPS is **1.46% of baseline**, sitting squarely in that range.

Structurally it is also the clean case: the 2pc package is hands (31034) + legs (31044), neither
slot holds a set piece, and the row has **no `breaks` entry**. `se` is 4.02, so this is ~7.8σ.
**This figure I would defend.** It is the shape a real 2pc measurement should have.

### G4 — Malorne (T4) 2pc at ~116 DPS is impossible. This is the crux. (Q3)

**Verdict: implausible by a wide margin. The plausible range is ~15–40 DPS, and I would centre on
~25–35.** Everything built on 116 — including the "de-confounded Thunderheart 4pc ≈ 78" figure —
is wrong.

**What the bonus does** (`verification.md:142`): Malorne 2pc is a **4% proc on melee for +20 energy**
in cat form (+10 rage in bear).

Work the rate. A 4% proc on melee landings, for a cat druid whose auto-attack is roughly one swing
per second, yields on the order of one proc every ~25 seconds — call it 2–3 procs per minute, and
generously more if the sim procs off special attacks too. **Domain knowledge, unverified against
repo:** I did not confirm the proc's trigger mask or ICD from the Go source, and the engineering
team should, because a proc that fires off every special rather than only autos changes the rate
materially.

At ~2.5 procs/minute × 20 energy, that is ~50 energy per minute. A cat regenerates 10 energy per
second, i.e. **600 energy per minute**. So the bonus is roughly an **8% increase in energy income**
— and only if every procced point is spent, which it is not, since a proc landing near energy cap
is partly wasted. Feral DPS is close to linear in energy, so the honest ceiling is well under 8% of
DPS, and realistically **1–2%**: about **20–40 DPS**.

Three internal cross-checks all agree, and they are the strongest part of this finding:

1. **Against the same set's 4pc.** Malorne 4pc is `+30 Strength` on `CatFormAura`
   (`verification.md:142`) and this artifact measures it at **18.04 DPS** — that is 0.60 DPS per
   Strength, an entirely sane feral conversion. The claim is that the **2pc is 6.4× the 4pc.** Tier
   sets are not built that way; the 4-piece is the marquee bonus, and Blizzard did not ship a T4
   2-piece worth six times its own 4-piece. A T4 2pc worth 116 DPS would also have been the most
   famous set bonus in the expansion, and it was not.

2. **Against the T6 2pc.** Malorne 2pc at 116 would be **3.7× Thunderheart's 2pc (31.46)** — a T4
   bonus beating its two-tiers-later T6 counterpart by nearly 4×. Tier bonuses scale up across
   tiers, not down. And mechanically the T6 2pc (−5 energy on every Mangle) is a *larger and more
   reliable* energy effect than a 4% chance at +20, which makes the inversion doubly wrong.

3. **Against total damage.** 116 DPS is **5.4% of this character's entire output** from one T4
   2-piece bonus. Nothing in T4 did that.

**Consequence for the pipeline.** The regression in `break-confound-correctability.md` recovers
`B̂ ≈ 115.8` as a difference of intercepts between breaking and non-breaking slots. That estimator
is picking up **everything that differs between those slot groups**, not the set bonus. Chest and
shoulder are large-armor, high-stat-budget slots and the worn Malorne pieces are well-itemised
raid gear; the non-breaking control slots are different in item budget and in what the stat proxy
captures. The intercept difference is dominated by that mis-specification. It is a real number
about the regression and not a fact about the game.

**What this does and does not do to the ~78 figure.** Being explicit, because my APL check (G1)
moved my own ceiling and I do not want to overclaim:

- The **~116 input is wrong** on the ratio arguments above, and I hold that firmly. It is an
  intercept difference between two dissimilar slot groups, not a bonus.
- The **~78 output nonetheless lands inside my G1 plausible band of ~60–120.** So I cannot call the
  number itself implausible. What I can say is that it is **right for the wrong reason** — a
  correct-looking answer produced by subtracting an impossible quantity, which is a coincidence
  and not a validation. It also does not reconcile arithmetically: if `B` is really ~25–35 then
  `k·B` with k=2 removes only ~50–70 from 193.89, giving ~125–145, not 78.
- That non-reconciliation is the actual finding. **Something beyond the Malorne break is inflating
  193.89**, because no plausible value of `B` simultaneously explains the correction and the
  mechanics. A single scalar toll is not a sufficient model of what went wrong.

I would **not** ship 193.89. I would **not** ship 78 either — not because the value is out of range
but because its derivation is unsound, and a number that is only accidentally right will drift the
moment the gear changes. Suppress when `breaks` is non-empty and say why (option R2(a) in the prior
investigation), or measure the toll directly. Either beats publishing a coincidence.

### G5 — The gearing premise does not hold as stated. Upstream's own P3 BiS has no T6 4pc. (Q4)

The user's premise was that in real optimal feral gearing, T4 chest and shoulders get replaced by
T6 to enable the T6 4pc. **Checked against the vendored curated sets — it is not what upstream does.**

`vendor/wowsims/feral_p3_6p.gear.json` and `feral_p3_9p.gear.json` (item ids resolved via a
sub-agent parse of `db.json`):

| slot | P3 6p | P3 9p |
|---|---|---|
| head | 8345 Wolfshead Helm | 8345 Wolfshead Helm |
| shoulder | 31048 Thunderheart Pauldrons | 31048 Thunderheart Pauldrons |
| chest | 31042 Thunderheart Chestguard | 31042 Thunderheart Chestguard |
| hands | 31034 Thunderheart Gauntlets | 31034 Thunderheart Gauntlets |
| legs | 31044 Thunderheart Leggings | 31044 Thunderheart Leggings |

So the picture is split, and the split matters:

- **The user is right that upstream's P3 BiS uses T6 chest and shoulder.** Both curated sets do.
- **The user is right that upstream's P3 BiS carries a T6 4pc** — in fact 4 Thunderheart pieces
  (shoulder, chest, hands, legs), which is exactly the 4pc package this artifact assembled.
- **The user is wrong that this is a T4→T6 swap.** Upstream's P3 set wears **zero** Malorne pieces
  and **zero** T5 Nordrassil pieces. There is no T4 anywhere in it. By P3, T4 is simply gone.

That last point is what makes the artifact's answer wrong rather than merely pessimistic. Upstream
BiS agrees with the user's destination (T6 chest + shoulder, 4pc active) while the engine ranks
those two exact items at **−100.16 and −106.16**, dead last-ish in their slots, because it prices
each one as a solo swap that shatters a T4 2pc the destination set does not keep. The engine and
upstream BiS disagree about the two specific items upstream picked. That is the finding.

**This is the one I would flag as embarrassing to act on.** Any change justified by "the engine says
T6 chest and shoulders are −100 DPS pieces for a P3 feral" contradicts the sim project's own
curated P3 BiS list, sitting in this repo, which equips both. If that reasoning reached a player it
would tell them to keep two-tiers-old T4 gear over Black Temple tier. No feral would take that
advice, and the repo can be shown to contradict it in one file read.

### G6 — Chest and shoulder both topping out at 0.00 is a measurement signature, not a game fact. (Q5)

Best delta per slot in this artifact: legs +32.97, weapon +86.95, waist +45.50, feet +24.17, hands
+21.75, finger +18.70, neck +14.15, wrist +10.87, trinket +10.34, back +9.27 — but **chest 0.00
(n=20)**, **shoulder 0.00 (n=18)**, **head 0.00 (n=18)**, where 0.00 is the worn item scored against
itself.

Twenty chest candidates and eighteen shoulder candidates with **not one positive** is not a
statement about twenty items. It is a fixed toll charged to any swap that vacates a Malorne slot.
The runner-up gaps confirm it: chest goes 0.00 → −90.16 with nothing in between, shoulder 0.00 →
−102.16. Real gear does not distribute in a cliff like that; you expect a spread of near-misses.

The pool is not the problem. I checked `data/universes/feral-p3.json` for the pieces a feral cat
would expect to compete here, and they are present: Thunderheart, Nordrassil, Malorne, and the
Vengeful Gladiator dragonhide pieces all appear by name. Chest specifically has 33675 Vengeful
Gladiator's Dragonhide Tunic, 31042 Thunderheart Chestguard, 30222 Nordrassil Chestplate, 32252
Nether Shadow Tunic, 30905 Midnight Chestguard. Shoulder has 33674 Vengeful Gladiator's Dragonhide
Spaulders, 31048 Thunderheart Pauldrons, 30230 Nordrassil Feral-Mantle, 30055 Shoulderpads of the
Stranger. Those are the right names for the tier. **The pool is fine; the pricing is not.**

Worth noting for engineering: two of the three slots that collapse (chest, shoulder) are the Malorne
slots, and the third (head) is the Wolfshead slot — see G7. Every slot the engine says is unbeatable
is a slot holding an item with a special effect the single-swap comparison charges in full.

### G7 — The head cliff is not credible as stated, but Wolfshead is genuinely BiS. (Q6)

**Wolfshead Helm being best-in-slot at P3 is correct and is not a bug.** It is an old crafted
leatherworking helm whose feral effect made it BiS for the entire expansion. The confirmation is in
this repo and is decisive: **both** curated P3 sets equip 8345 in the head slot
(`vendor/wowsims/feral_p3_6p.gear.json`, `feral_p3_9p.gear.json`). Upstream's own P3 BiS wears a
level-40-ish crafted helm over every T5 and T6 head. The engine agreeing is a point in its favour.

**Domain knowledge, unverified against repo:** the effect is bonus energy on Feral Charge / shapeshift
in TBC's era, and it is the standard, well-known feral head choice for TBC. I could not verify the
effect text from repo data — `db.json` has no set-bonus text and I did not extract item effect
bodies for 8345 — so engineering should confirm what the pinned sim actually models before relying
on the magnitude.

**The magnitude is the problem, not the winner.** A ~202 DPS gap to *every* alternative is ~9.4% of
total DPS from one helm effect, and the cliff has the same shape as G6: 0.00 then nothing until
−202.05. Wolfshead is BiS in TBC by a meaningful but not enormous margin — it wins because tier
helms are unexciting and its effect is free value, not because it doubles as a second trinket.
That every T5/T6 helm including 31039 Thunderheart Cover (−211.95) and 32235 Cursed Vision of
Sargeras (−202.13) lands in a tight −202 to −226 band is the tell: the band is the effect's price
being charged in full to every candidate, and the small spread among them is the only part that is
actually item stats. **I would expect the true gap to be tens of DPS, not ~200, and I would treat
the sim as over-valuing this effect** — with the caveat that I could not read the effect body to
confirm.

Right winner, wrong distance. The ordering is safe to show; the numbers are not.

---

## Rows that look fine

- **All 2-piece figures.** Thunderheart 2pc (31.46) is mechanically sensible and structurally clean
  (G3). Malorne 4pc at 18.04, or 0.60 DPS per Strength for a +30 Str bonus, is a sane conversion and
  a good sanity anchor for the rest.
- **Wolfshead Helm winning the head slot** (G7) — correct, and corroborated by upstream's curated P3
  sets.
- **The per-slot winners outside the three collapsed slots.** Weapon +86.95, waist +45.50, legs
  +32.97, feet +24.17 are ordinary-looking upgrade magnitudes for a P3 feral with gaps.
- **The `breaks` reporting itself.** The 4pc row honestly records that it destroys Malorne 2pc. The
  data needed to catch this defect is already in the artifact and correctly populated — the problem
  is that a DPS number is published alongside it as if it were unaffected.
- **Sets reported `not-implemented-in-sim`** (Gladiator's Sanctuary, Primal Intent, Fel Skin, The
  Fists of Fury, Nordrassil 2pc) are being declared rather than silently zeroed. That is the right
  behaviour.

---

## Gate

**Would I trust this output as a feral who knows the game? No — not the 4pc column.**

What must be true before yes:

1. **No 4-piece DPS figure is published when `breaks` is non-empty.** Show the breakage and withhold
   the number. Both current 4pc figures in this artifact (Thunderheart 193.89, Nordrassil 185.10)
   fail this and both are inflated several-fold.
2. **The ~116 Malorne 2pc estimate is retracted before anything is built on it** (G4). The ~78 T6
   4pc derived from it should not ship either — it happens to land in a plausible band but its
   derivation subtracts an impossible quantity, and it does not reconcile with any credible value
   of the toll. If a de-confounded value is wanted, it needs a measurement — sim the baseline with
   both Malorne pieces removed and read the toll directly — not a regression intercept.
3. **A plausibility band exists on set bonuses.** Any 2pc or 4pc measuring above ~5% of baseline
   should be treated as a suspected confound and held back. 193.89 (9.0%) and 116 (5.4%) both trip
   it; 31.46 (1.5%) and 18.04 (0.8%) both pass. This is a cheap gate that would have caught the
   whole episode. Note the band must be set from the bonus's mechanics, not a flat constant — a
   +15% modifier on a ~30% damage share caps near 4.5%, whereas a pure stat bonus caps far lower.
4. **A slot whose entire candidate list is non-positive is surfaced as a warning.** Chest (n=20),
   shoulder (n=18) and head (n=18) all have zero positive candidates here. That pattern means the
   worn item carries something the comparison charges in full to every rival, and it should be
   reported as low-confidence rather than as twenty confident losses.
5. **The upstream-BiS contradiction is resolved or disclosed.** The engine ranks 31042 and 31048 at
   −100/−106 while the vendored curated P3 sets equip both. Until that is explained, chest and
   shoulder output for this character should not be presented as decision-grade.

Items 1, 3 and 4 are display-level and cheap. Item 2 is a retraction. Item 5 is the real one.

---

## Notes for engineering

- 4-piece package measures worse than the 2-piece package (64.07 vs 76.50) while being reported as a
  +193.89 bonus — the two statements cannot both describe the same gear change.
- The T6 4pc buffs Rip + Ferocious Bite + Swipe; this APL casts the first two heavily and Swipe not
  at all. Plausible band ~60–120 DPS, centre ~95 — so 193.89 is about 2× too large, not 5×.
- A T4 2-piece cannot be worth 6.4× its own 4-piece, or 3.7× the T6 2-piece. Both ratios fall out of
  the ~116 estimate and both are backwards.
- Upstream's own curated P3 feral sets wear T6 chest + shoulder and no T4 at all; the engine ranks
  those two items near the bottom of their slots. Worth reconciling before anyone acts on the slot.
- Three slots (chest, shoulder, head) return zero positive candidates out of 56. All three hold an
  item with a special effect. That is one bug shape, not three slots of bad luck.
- The Void Reaver encounter (`ranking.fight`) is a P2 Tempest Keep fight being used for a P3
  ranking. Probably intentional, but flagging it since the tier framing is BT/Hyjal.
- `db.json` carries no set-bonus text whatsoever, so `verification.md` V1's transcription of the Go
  source is the single point of truth for every mechanic above. If V1 drifts from the pin, every
  plausibility judgment in this document moves with it.

---

## What I did not check

- **I ran no sims** (instructed not to) and modified nothing.
- **I did not read the wowsims Go source.** All mechanics come from `verification.md` V1's
  transcription. My G1 and G4 magnitude arguments depend on it being accurate at the pin.
- **I did read `feral_default.apl.json`** and resolved its spell ids, which corrected my first-pass
  G1 estimate upward (Ferocious Bite is a live finisher here, not skipped). What I did **not** do is
  measure the actual damage share of Rip + Ferocious Bite in this rotation — my ~30% figure is
  recall, and it is the single number most worth replacing with a real breakdown, since the whole
  G1 band rests on it.
- **I did not extract the effect body for 8345 Wolfshead Helm**, so my G7 claim that the sim
  over-values it is a magnitude-plausibility argument, not a source-verified one.
- **I did not verify the Malorne 2pc proc's trigger mask or ICD.** If it procs off specials rather
  than autos only, the rate in G4 rises — though not far enough to reach 116.
- **I did not audit other characters or specs** for the same signature.
- My Rip-share and rotation claims are marked **domain knowledge, unverified against repo**
  throughout and are the parts most worth a second opinion.
