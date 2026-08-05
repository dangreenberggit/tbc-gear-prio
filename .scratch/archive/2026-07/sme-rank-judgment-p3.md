# SME / domain judgment — slamaltman P3 full-pool rank

**Date:** 2026-07-27  
**Character:** slamaltman @ Dreamscythe-US (ret)  
**Artifacts:** `.scratch/rank-reports/slamaltman-p3-full-pool.{html,json}`, `.scratch/full-pool-rank-p3.log`, `.scratch/rank-reports/slamaltman-baseline-gear.json`, `.scratch/handoffs/pool-composition-audit.md`  
**Gate framing:** PLAN.md §14 Phase 1 — “ranking you’d act on tonight” / survives check vs judgment / wowsims BiS / Wowhead ret guides  
**CONTEXT.md:** absent (glossary gaps noted in §5). No `docs/adr/` yet.

---

## 1. Verdict

**trust-with-caveats**

For *this* logged set (strong T4/T5 mix, Lionheart Executioner, Libram of Avengement, DST + Bloodlust Brooch), the shortlist’s **raid armor / ring / BT–Hyjal waist–cloak–legs** rows are directionally what a ret would want tonight if the raid is BT/Hyjal/TK leftovers. **Torch of the Damned ≫ Lionheart** is credible and would drive wishlist priority.

It is **not** yet a substitute for human judgment end-to-end:

1. **Ranged #2 (Netherstrand Longbow) is a hard false positive** — ret’s ranged slot is a *libram*; the pool has **zero librams** and twelve hunter-style ranged weapons (pool audit + `ret.json`). A human would discard that row instantly.
2. **Weapon absolute ranking is incomplete** — Twinblade / Gorehowl / Cataclysm’s Edge / World Breaker / Lionheart / Merciless Glad weapons are **missing** from the pool; Torch only won among a broken weapon list (Torch + Vengeful Glad ×2 + four −180…−276 DPS rares).
3. **Arena weapons (#7–8)** are real small upgrades vs Lionheart in-sim, but they are not “tonight’s raid loot” without a PvP path.
4. **Settings fidelity** (P2 skeleton at `maxPhase: 3`, RaceHuman override, preset encounter ≠ Hydross log, independent SE ~120 DPS) means mid-list order (±3–8 Δ) is soft.

**Would act tonight (with human filter):** Torch, Shadowmoon Destroyer’s Drape, Seething Fury / Lightbearer, Endless Rage legs, Ranger-General (and maybe Onslaught Greaves / Swiftsteel Bracers as craft/token goals).  
**Would not act on:** Netherstrand; treat Vengeful Glad weapons as optional PvP, not raid prio.

---

## 2. Input / settings fidelity (what a human must know)

| Setting | This run | Why it matters |
|--------|----------|----------------|
| **Baseline gear** | Offline dump from WCL fight `VGjFb3mtX9xHgyav` / Hydross #8; goggles, Crystalforge BP (lone T5 piece), Lionheart, Avengement, DST+Brooch, etc. | Ranking answers *single swaps vs this set*, not vs a P3 BiS skeleton. Weak legs (Shattrath) and Kara cloak make P3 belt/cloak/legs look huge — correct for *him*, not for a fully geared P3 ret. |
| **Preset** | Still `ret/p2.raid-sim-skeleton` + `p2.ep-weights.json` while `maxPhase: 3` | APL / buffs / consumes / encounter / EP weights are **P2-era pins**. Compose only overlays race + equipment. No P3 preset exists yet — deltas are “P2 sim world, P3 item candidates.” |
| **Race** | Disclosure: **RaceHuman** (RankInput default), even though skeleton JSON says BloodElf | Weapon skill / racials affect melee; Human vs BE is a standing assumption, not from WCL. |
| **Fight / encounter** | Log fight is Hydross; standing assumption says **encounter comes from the preset**, not the log | Product question is “tonight’s loot,” but the sim encounter may not match the logged boss or tonight’s raid. |
| **fullPool** | `true` → phase ≤3 **104** candidates simmed (log `0/105`…`105/105` = baseline + 104) | Without `--full-pool`, EP top-80 would cut 24 items. Full pool was the right escape hatch here; EP still can’t fix weapons (audit). |
| **maxPhase ahead of lock** | CLI `--max-phase 3`; `wowsims.lock` still `currentPhase` / `defaultMaxPhase: 2` | Gem palette = `gemsForPhase(3)` (epics allowed). Meta repair ran; **`metaAdjusted=false`** on baseline. BiS tags empty (no curated sets above P2 — PLAN §8). |
| **Seeds / iterations / cutoff** | Defaults: seed **42**, **3000** iters, `CUTOFF { absDps: 3.4, pct: 0.15 }` | Independent SE ~**119–122** DPS → shortlist order inside a few DPS is **not** a hard ranking. Cutoff hides noise below ~3.4 DPS / 0.15%. |
| **Talents** | Log `[5,11,45]` on gear dump; standing assumption still says talents come from **preset** | Treat talent/APL fidelity as “assumed pinned,” not “proven from log,” until disclosure and compose are audited end-to-end. |
| **Imbue / professions** | Weapon imbue omitted (constant); profession-locked gems/items excluded | Fine for relative Δ; not a full character model. |

**Bottom line for a human reading the HTML:** trust the **direction** of large Δ raid pieces; do not treat mid-list order or ranged rows as loot bible; remember this is **maxPhase 3 on a P2 sim pin**, ahead of lock’s default phase 2.

---

## 3. Per-slot sanity (shortlist)

### Weapon — Torch of the Damned (+37.9) vs Lionheart; Vengeful Glad (+7.6)

- **Torch > Lionheart Executioner** is the right call for Anniversary ret at BT (Reliquary). Ilvl / white damage / stats all favor Torch; ~38 DPS single-swap is in the believable range for that gap.
- **Caveat:** among *real* P3 weapon choices, Torch is a top contender, not proven #1 — **Cataclysm’s Edge, Twinblade, Gorehowl, World Breaker** never entered the candidate set (pool EP ignores weapon damage; top-12-per-slot filled with hit-heavy rares). Arena S3 Bonegrinder/Greatsword edging Lionheart by ~7.6 is plausible as “slightly better stick,” tied with each other (identical Δ — expected for near-identical weapons).
- **False “BiS confirmation” risk:** #1 looks authoritative; it is only authoritative *within a broken weapon pool*.

### Ranged — Netherstrand Longbow (+20.1)

- **Do not trust.** Paladin ranged = **libram**. Pool ranged list is entirely bows/guns/crossbows/thrown (Netherstrand, Thori’dal, Golden Bow, …). Zero Libram of Zeal / Absolute Truth / etc.
- Wowsims may still *simulate* a bow as a stat stick if the request allows the item id; that does **not** make it equippable loot for this character.
- Baseline Avengement is a real ret relic; any “upgrade” must be another libram. This row fails the Phase 1 human check hard.

### Back — Shadowmoon Destroyer’s Drape (+13.9)

- Classic physical P3 cloak vs Kara **Drape of the Dark Reavers**. Human judgment: **yes, want this**. Magnitude sensible.

### Waist — Belt of Seething Fury (+13.1), Girdle of the Lightbearer (+11.3)

- Both are standard Hyjal/BT waist upgrades over **Girdle of the Endless Pit**. Order Seething > Lightbearer is guide-plausible; small gap → soft. **Act on both as goals.**

### Finger — Ranger-General (+7.6), Reciprocity (+3.9), Stormrage (+3.7), Deceitful Intent (+3.3)

- Baseline: **Thousand Marks** + **Shapeshifter’s Signet**. Ranger-General (Kael) remaining elite for ret into P3 is correct; Stormrage / Deceitful Intent as BT options are correct *candidates*.
- **Ring of Reciprocity** (Kara Netherspite) above Stormrage is a mild eyebrow raise — possible with this hit/exp/crit profile and P2 EP/APL, but Δ sits near cutoff with huge independent SE. Treat **Ranger-General as clear**; treat Reciprocity vs Stormrage vs Deceitful as **tie mush**, not a strict wishlist order.
- All finger rows use `slotChoice: "a"` — human must know which equipped ring is being replaced.

### Legs — Legguards of Endless Rage (+7.3), Onslaught Greaves (+5.2)

- Baseline **Shattrath Leggings** are a soft crafted piece — both upgrades make sense.
- **Endless Rage (Archimonde)** over **Onslaught Greaves** for a pure single-item DPS swap is a common ret read when you are not fishing Onslaught 2pc/4pc from this one slot (baseline has **no** Onslaught pieces; Crystalforge BP alone). Credible.
- Onslaught Greaves still above cutoff: fine as token chase; not a false positive.

### Wrist — Swiftsteel Bracers (+3.7)

- Crafted P3 vs **Bladespire Warbands** — small, near-noise, but directionally OK if blacksmithing is available. Low urgency vs Torch/cloak/belts.

### Slots with no above-cutoff upgrades

- **Trinkets:** DST + Brooch already excellent; Tsunami / Madness / Coil all negative — expected.
- **Head / chest / shoulder / hands / feet / neck:** best candidates flat or negative. Lone Crystalforge BP means Onslaught/Lightbringer single pieces correctly look bad (set bonuses not captured by one-slot pin without siblings). Feet already Warboots of Obliteration — nothing beat them in-pool. Credible emptiness, not a silent failure — except **neck** Choker of Endless Nightmares barely positive below cutoff (+0.5).

---

## 4. Obvious misses / false positives a ret would catch

| Issue | Type | Notes |
|-------|------|--------|
| Netherstrand (and all pool “ranged”) | **False positive / pool bug** | Unequippable; zero librams in `ret.json`. |
| Vengeful Glad weapons as #7–8 “tonight” | Soft FP for raid framing | Real Δ vs Lionheart; wrong default loot context without raid/boss view. |
| Twinblade / Gorehowl / Cata Edge / World Breaker / Lionheart not ranked | **Miss (pool)** | Cannot answer “is Torch better than Twinblade for me?” |
| Libram upgrades | **Miss (pool)** | No path to replace Avengement with a better libram. |
| Mid-tier rings order | Soft noise | Reciprocity > Stormrage ≈ Deceitful — human would not obsess. |
| Onslaught / T6 chest-shoulder-hands negative | Not a miss | Single-swap without set is expected; pin-BiS / setBonusNote not in Phase 1 gate yet. |
| −180…−276 DPS weapons still simmed | Waste / credibility hit | Audit: EP ignores white damage; still in P3 list. |
| No BiS tags at P3 | Display/tiebreak gap | Cannot cross-check wowsims curated sets above P2 (PLAN). |
| Classic scraps still in long tail | Clutter | Royal Seal, Drake Fang, etc. correctly below cutoff / large negatives. |

---

## 5. Agent-as-SME score (CONTEXT / PLAN substitute)

**Score: 2 / 5**

What PLAN + disclosure + pool audit *do* give an agent:

- Product question (“tonight’s single swaps,” not full BiS solve).
- Standing assumptions (race, preset APL/buffs/encounter, professions, imbue).
- Known EP/weapon-pool failure mode.

What they **don’t** give (glossary / CONTEXT gaps that would raise the score toward 4+):

1. **Equip constraints by class** — paladin relic vs bow/gun/thrown (would auto-kill Netherstrand).
2. **Ret weapon ladder by tier** — Lionheart / Twinblade / Torch / Cata Edge / Gorehowl / Glad seasons; white-damage dominance.
3. **Libram ladder** — Avengement vs later librams; never hunt bows.
4. **Set-bonus intuition** — when Onslaught/Crystalforge/Lightbringer single pieces look “wrong.”
5. **Raid-tonight framing** — BT/Hyjal vs arena vs craft priority without `applyView`.
6. **Noise literacy** — independent SE ≫ cutoff ⇒ don’t over-order 3–8 DPS rings.
7. **Preset lag** — “P2 skeleton at maxPhase N” as a first-class trust caveat.

With those in CONTEXT.md (or ADRs), an agent could reject ranged FPs and flag weapon-pool incompleteness without a human ret SME in the loop. Today, PLAN alone is **not** enough to pass the Phase 1 “act tonight” gate unattended.

---

## 6. Actionable follow-ups

### Data
- **Re-curate `slot: ranged` for ret → librams only**; delete hunter weapons from the ret pool (or hard-filter by `weaponType` / class can-equip).
- **Fix weapon EP / re-generate weapon rows** so Twinblade, Gorehowl, Cataclysm’s Edge, World Breaker, Lionheart, Glad seasons enter the top-N (pool audit priorities 1–3).
- Drop or floor the −200 DPS rare weapons (quality/ilvl/avg-dmg).
- Add P3+ BiS tag source or explicitly disclose “no tags above P2.”

### Product
- Surface standing assumptions loudly on the HTML report (race, preset id, maxPhase vs lock, fullPool, encounter source).
- Raid/boss `applyView` before treating arena/craft rows as “tonight.”
- P3 raid skeleton + EP weights (or disclose “P2 sim pin”).
- Consider class equip validation before sim (or at pool load).
- Paired-replicate SE / higher iters for top-N before trusting ring order (Phase 2 PLAN items).

### Human-only (for this character tonight)
- Wishlist: **Torch** → **Shadowmoon Drape** → **Seething Fury / Lightbearer** → **Endless Rage** → **Ranger-General**; craft Swiftsteel if cheap; Onslaught Greaves as token path.
- **Ignore Netherstrand.**
- Treat Glad weapons as arena goals only.
- Do not use this run to settle Torch vs Twinblade/Cata Edge until those items are in-pool and re-simmed.
- Confirm real race / tonight’s raid vs RaceHuman + P2 preset encounter before sweating ±4 DPS rows.

---

## Evidence anchors (re-runnable)

```text
# Rank meta / shortlist
.scratch/rank-reports/slamaltman-p3-full-pool.json  → meta.maxPhase=3, fullPool, assumptions.race=RaceHuman, presetId=ret/p2.raid-sim-skeleton, baseline ~2042.85, 14 above cutoff
.scratch/full-pool-rank-p3.log                      → simming 0/105 … 105/105; #1 Torch … #14 Deceitful Intent

# Pool: no librams; P3 weapons incomplete
node -e "const p=require('./data/pools/ret.json').entries; console.log(p.filter(e=>e.slot==='ranged').map(e=>e.name)); console.log(p.filter(e=>e.slot==='weapon'&&e.phase<=3).map(e=>e.name))"
```

**Phase 1 gate implication:** this run **partially** supports “survive human check” for **raid armor/weapon-direction**, but **fails** an unattended “act on the printed #1–#2 tonight” bar until ranged pool and weapon BiS coverage are fixed. Keep the gate checkbox open; use as a **trust-with-caveats** milestone, not a close.
