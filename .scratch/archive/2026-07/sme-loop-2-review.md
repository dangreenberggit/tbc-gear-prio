# SME rank review — Loop 2 (post weapon-data fixes)

**Date:** 2026-07-27  
**Audience:** engineering team  
**Character:** slamaltman @ Dreamscythe-US, ret paladin  
**Verdict:** `trust-with-caveats`

**Compared to:** `.scratch/handoffs/sme-loop-1-review.md`

---

## Verdict

**trust-with-caveats**

The printed shortlist and the main raid upgrades still look like Phase 3 ret answers for this set: Torch and Cataclysm’s Edge over Lionheart, Vashj / Hyjal / Lightbearer belts over Endless Pit, Band of Devastation and Ranger-General as ring goals (now labeled), Shadowmoon / Cloak of Darkness over the Kara cloak, legs off weak Shattrath. Ranged is librams only. Act-tonight is raid/craft only — no arena stick mixed in. Gorehowl’s absurd loss is marked.

Do **not** treat the weapon section as fully game-clean. Twinblade of the Phoenix is present with a believable small loss vs Lionheart. Tempest of Chaos is also present, but it is Archimonde’s **caster one-hander**, not a ret two-hander; a −25 DPS row for that swap fails a basic equip/role sanity check even though it sits below cutoff.

---

## What was reviewed

| Item | Detail |
|------|--------|
| Results | `.scratch/rank-reports/slamaltman-p3-full-pool.html`, `.scratch/rank-reports/slamaltman-p3-full-pool.json` |
| Baseline gear | `.scratch/rank-reports/slamaltman-baseline-gear.json` (WCL Hydross fight dump) |
| Prior judgment | `.scratch/handoffs/sme-loop-1-review.md` |
| Spec / phase | ret, `maxPhase: 3`, full-pool offline rank, generated `2026-07-28T03:56:04.653Z` (after Loop 1’s `03:38:15`) |
| Baseline set (summary) | Furious Gizmatic Goggles; Pendant of the Perilous; Shoulderpads of the Stranger; Drape of the Dark Reavers; Crystalforge Breastplate; Bladespire Warbands; Gloves of the Searing Grip; Girdle of the Endless Pit; Shattrath Leggings; Warboots of Obliteration; Ring of a Thousand Marks + Shapeshifter’s Signet; Dragonspine Trophy + Bloodlust Brooch; Lionheart Executioner; Libram of Avengement |
| Baseline DPS | ~2042.8 (±119 stdev); 16 above cutoff; cutoff 3.4 DPS / 0.15% |
| Stated assumptions (from report) | RaceHuman; talents/APL/buffs/consumes/encounter from pinned preset (not the log); profession-locked gems/items excluded; weapon imbue omitted |

This is a **fresh** judgment of Loop 2 output, with Loop 1 used only for improvement tracking.

---

## Gate checklist (requested)

| Gate | Result |
|------|--------|
| Weapon ladder includes Tempest of Chaos and Twinblade of the Phoenix with credible deltas | **Partial.** Both appear. Twinblade of the Phoenix −13.9 vs Lionheart is credible for a real P2 physical 2H. Tempest of Chaos −24.7 is **not** a credible ret-weapon delta (see Game problems). |
| No bows in ranged; librams only | **Pass.** Eight librams; Avengement holds at 0. |
| Arena weapons not in “Act on tonight” | **Pass.** Chips are Torch, Cataclysm’s Edge, belts, rings, cloaks, legs, Onslaught chest, Swiftsteel — no Bonegrinder / Glad weapons. |
| Gorehowl magnitude flagged or believable | **Pass (flagged).** Still −103.9 (−5.1%); HTML shows `sim magnitude` warn; JSON `magnitudeWarning: true`. Number remains unbelievable; disclosure is enough for this gate. |
| Finger rows show which ring replaced | **Pass.** Each finger row: “Replaces Ring of a Thousand Marks” plus alt “Also … if replacing Shapeshifter’s Signet.” |

---

## Loop 1 → Loop 2 improvement tracking

| Loop 1 issue | Loop 2 status |
|--------------|---------------|
| Absolute P3 weapon ladder incomplete (named “Twinblade of the Ashtongue”) | **Improved.** Twinblade of the **Phoenix** (Kael 2H) is in the compared set. There is no separate Illidan “Ashtongue” 2H in normal BT loot for ret; Phoenix was the real missing physical stick. |
| Gorehowl −104 fails magnitude sanity | **Mitigated.** Same number; now explicitly flagged untrustworthy. |
| Vengeful Glad Bonegrinder in act-tonight | **Fixed.** Gone from shortlist (and from this phase’s ranked weapon rows). |
| Finger upgrades only slot “a”, no replace label | **Fixed.** Replace + alternate shown. |
| Soft legs order / ring mid-list mush / Soul Cleaver harsh loss / soft craft wrist | **Unchanged** (still non-blocking). |

---

## Game problems

### Blocking (product should not ship these as trustworthy without fix or clear disclosure)

1. **Tempest of Chaos is not a ret two-hander.**  
   Item 30910 is Archimonde’s **one-hand spell-power sword** (caster MH). It does not belong on a ret physical 2H ladder next to Torch / Cataclysm’s Edge / Lionheart / Twinblade of the Phoenix. A −24.7 DPS loss vs Lionheart Executioner is far too mild for “swap a solid ret 2H for a caster 1H.” Direction (loss) is obvious; the row still fails game sanity and will mislead anyone reading the weapon section as a real contender list.

### Non-blocking (flag, do not sink the shortlist)

2. **Gorehowl −103.9 remains nonsense; flagged.**  
   Same as Loop 1 on magnitude. Warn pill makes it usable as “ignore this number.”

3. **Soul Cleaver −38.6 vs Lionheart.**  
   Real BT 2H; large loss can happen on some profiles. Still looks harsh; not flagged like Gorehowl. Suspicious loss size, not a shortlist false positive.

4. **Legs order still soft.**  
   Onslaught Greaves (+11.7) over Endless Rage (+7.3); Bow-stitched +2.6 below cutoff; character has no other Onslaught. Direction “upgrade Shattrath legs” fine; strict order still arguable.

5. **Ring mid-list still mush.**  
   Reciprocity / Stormrage / Deceitful all ~3–4 DPS inside ~119 SE. Devastation and Ranger-General stay clear goals. Alt-slot numbers correctly show Shapeshifter’s as the stronger kept ring.

6. **Soft craft wrist.**  
   Swiftsteel (+3.7) near cutoff. Bindings of Lightning Reflexes still not in the compared wrist set — soft miss.

---

## Rows that look fine

- **Weapon (physical ladder):** Torch (+37.9) and Cataclysm’s Edge (+24.4) over owned Lionheart (0) — right BT/Hyjal goals. Twinblade of the Phoenix (−13.9) slightly under Lionheart — believable for this set.
- **Act on tonight:** Raid/craft upgrades only; matches the big real chases.
- **Waist / back / finger direction:** Same credible P3 story as Loop 1; fingers now answer “which ring.”
- **Ranged:** Librams only; Avengement best.
- **Trinkets:** DST + Bloodlust hold; Tsunami / Madness / Coil losses — expected.
- **Head / hands / feet / shoulders / chest:** Same credible holds and small Onslaught chest bump; Lightbringer chest negative.
- **Owned gear:** Equipped pieces that appear stay flat 0.

---

## Gate

**Would a ret who knows the game trust this output?**  
**Mostly yes for the shortlist and raid direction on this character. Not yet for the full weapon table.**

Must be true before full trust:

1. Weapon comparison only shows (or clearly separates) real ret physical weapons — Tempest of Chaos off the ret 2H ladder, or marked as wrong role / not comparable.
2. Gorehowl-style nonsense stays flagged (already true) or magnitudes become believable.
3. Readers keep treating mid-list order (±3–8 DPS, ±119 noise) as soft.

Until Tempest is cleaned up: **trust-with-caveats**. Shortlist-blind “act on tonight” is much safer than Loop 1; weapon-section completeness is only half-fixed (Phoenix good, Tempest wrong item class).

---

## Notes for engineering

- Tempest of Chaos (30910) is `handType` 1H caster MH — not a ret 2H chase; Twinblade of the Phoenix (29993) delta looks fine; Gorehowl still `magnitudeWarning`; finger replace/alt labels look correct in HTML/JSON.
