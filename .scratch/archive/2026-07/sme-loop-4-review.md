# SME rank review — Loop 4 (fresh rank)

**Date:** 2026-07-28  
**Audience:** engineering team  
**Character:** slamaltman @ Dreamscythe-US, ret paladin  
**Role:** Loop 4 — independent game judgment of a **new** full-pool rank  
**Prior writeup compared:** `.scratch/handoffs/sme-loop-3-review.md` (and Loop 3 B numbers)  
**Verdict:** `trust-with-caveats`

---

## Verdict

**trust-with-caveats**

A ret who knows Phase 3 would trust this shortlist and weapon table for this set. Torch and Cataclysm’s Edge still beat owned Lionheart; Twinblade of the Phoenix sits near Lionheart (tiny gain, below cutoff); Vashj belt is a clear waist goal; Band of Devastation and Ranger-General are the right ring goals with correct replace labels; Shadowmoon / Cloak of Darkness over the Kara cloak; legs and chests off weak Shattrath / Crystalforge look like real P3 chases. Ranged is librams only. Act on tonight is raid and craft only. Owned rows that appear stay flat 0. No Kael encounter-only legendaries. No caster one-hander on the 2H ladder. Gorehowl’s absurd loss is marked.

Vs Loop 3’s shortlist shape, several magnitudes moved in a **more** game-plausible direction (stronger Vashj belt; Bow-stitched as a real legs upgrade; Twinblade near-parity with Lionheart; Lightbringer chest as a gain). Soft caveats remain (Gorehowl number, harsh Soul Cleaver loss, mid-list mush inside ~119 SE, soft wrist craft completeness). None are product blockers.

---

## What was reviewed

| Item | Detail |
|------|--------|
| Results | `.scratch/rank-reports/slamaltman-p3-full-pool.html`, `.scratch/rank-reports/slamaltman-p3-full-pool.json` |
| Baseline gear | `.scratch/rank-reports/slamaltman-baseline-gear.json` (WCL Hydross) |
| Prior SME | `.scratch/handoffs/sme-loop-3-review.md` |
| Spec / phase | ret, `maxPhase: 3`, full-pool offline rank, `generatedAt: 2026-07-28T05:09:27.761Z` |
| Baseline set (summary) | Furious Gizmatic Goggles; Pendant of the Perilous; Shoulderpads of the Stranger; Drape of the Dark Reavers; Crystalforge Breastplate; Bladespire Warbands; Gloves of the Searing Grip; Girdle of the Endless Pit; Shattrath Leggings; Warboots of Obliteration; Ring of a Thousand Marks + Shapeshifter’s Signet; Dragonspine Trophy + Bloodlust Brooch; Lionheart Executioner; Libram of Avengement |
| Baseline DPS | ~2042.8 (±119 stdev); **24** above cutoff (was 16 on Loop 3 artifact); cutoff 3.4 DPS / 0.15% |
| Stated assumptions | RaceHuman; talents/APL/buffs/consumes/encounter from pinned preset (not the log); profession-locked gems/items excluded; weapon imbue omitted |

**Independence note:** Fresh game judgment of the named files. Loop 3 was used only to note magnitude / shortlist-shape changes on this newer `generatedAt`.

**Artifact note:** This is a **new** rank (`05:09:27.761Z`), not a re-read of the Loop 3 file (`~04:02` / `04:06`).

---

## Gate checklist (strict)

| Gate | Result |
|------|--------|
| Libram / bow equip | **Pass.** Eight ranged rows, all librams; no bow/gun/crossbow. Avengement owned at 0; other librams lose. |
| Owned fake loss / fake upgrade | **Pass.** Every owned row that appears is flat 0: goggles, Dark Reavers, Crystalforge, Warboots, Thousand Marks, Lionheart, Avengement. |
| Kael temps as normal loot | **Pass.** No Netherstrand / Warp Slicer / other Kael encounter-only legendaries. Keepable Kael loot present: Twinblade of the Phoenix (2H) and Band of the Ranger-General. Band of Devastation is Illidan BT ring, not a Kael temp weapon. |
| Weapon ladder complete & physical | **Pass.** Compared weapons: Torch (+37.9), Cataclysm’s Edge (+24.4), Twinblade (+1.3 below cutoff), Lionheart (0 owned), World Breaker (−23.1), Soul Cleaver (−38.6), Gorehowl (−103.9 flagged). **No** Tempest of Chaos (30910). **No** caster 1H. **No** arena Bonegrinder. Twinblade ≈ Lionheart is believable soft parity for this set. |
| Arena not in Act tonight | **Pass.** Twenty-four chips: Torch, Cataclysm’s Edge, belts (incl. Red Belt craft), Bulwark / Onslaught / Lightbringer chests, Bow-stitched / Onslaught / Endless Rage legs, Band of Devastation / Ranger-General / soft rings, Shadowmoon / Cloak of Darkness, Dreadboots, Onslaught shoulders, Furious Shackles / Swiftsteel. All PvP rows sit below cutoff and off the shortlist. |
| Gorehowl flagged | **Pass.** −103.9 (−5.1%); HTML `sim magnitude` warn; JSON `magnitudeWarning: true`. Number still unbelievable; disclosure satisfies the gate. |
| Finger replace labels | **Pass.** Above-cutoff rings replace Thousand Marks; alternate slot shows Shapeshifter’s with a worse (or near-flat for Devastation) delta — matches “drop the weaker ring, keep the hit ring.” |

---

## Game problems

### Blocking

None on this artifact.

### Non-blocking (flag; do not sink Loop 4)

1. **Gorehowl −103.9 remains nonsense; flagged.**  
   Direction (loss vs Lionheart) can be fine. A ~5% absolute hole is not a believable weapon swap on this set. Warn pill is enough; readers should ignore the number.

2. **Soul Cleaver −38.6 vs Lionheart.**  
   Real BT 2H (Shahraz). Loss size still looks harsh for a same-tier physical axe; not flagged like Gorehowl. Suspicious magnitude, not a shortlist false positive.

3. **Waist #2 above Cataclysm’s Edge is a soft ordering surprise.**  
   Belt of One-Hundred Deaths at +32.0 ahead of Cataclysm’s Edge at +24.4 is stronger belt-vs-weapon spread than Loop 3 (+23.6 belt behind Cata). Direction for both pieces is right (Vashj leather BiS-tier belt; Hyjal Archimonde 2H). Treat strict #2 vs #3 as soft given ~119 SE — not a false chip.

4. **Ring / wrist mid-list mush.**  
   Reciprocity / Stormrage / Deceitful / Swiftsteel ~3–4 DPS inside ~119 SE. Devastation (+20.7) and Ranger-General (+7.6) stay clear goals. Replace + alt-slot labels correctly treat Thousand Marks as the drop and Shapeshifter’s as the stronger keep.

5. **Soft craft wrist completeness.**  
   Swiftsteel (+3.7) near cutoff vs Bladespire — low urgency, direction OK. Bindings of Lightning Reflexes (common craft competitor for ret wrists) still not in the compared wrist set — soft completeness miss, not a false chip.

6. **Neck / head / hands hold look fine; soft absences only.**  
   Pendant of the Perilous not listed as an owned neck row (Choker of Endless Nightmares +0.5 below cutoff vs that baseline is believable). Engi goggles beat Onslaught helm; Searing Grip beats Onslaught hands; Stranger shoulders lose only a small amount to Onslaught shoulders (+7.9) — all match known ret priorities for this profile. Pepe’s Shroud (−28) as a tank Hyjal trash cloak losing to Dark Reavers is correct.

---

## Surprising magnitude changes vs Loop 3 (game-plausibility only)

| Piece | Loop 3 shape | This Loop 4 | Game read |
|-------|--------------|-------------|-----------|
| Torch of the Damned | +37.9 #1 | +37.9 #1 | Unchanged; still the right Reliquary stick over Lionheart. |
| Cataclysm’s Edge | +24.4 #2 | +24.4 #3 | Unchanged magnitude; still a clear Hyjal 2H upgrade. |
| Belt of One-Hundred Deaths | ~+23.6 #3 | **+32.0 #2** | Larger gain over Endless Pit; still a believable Vashj leather belt chase. Soft that it now prints above Cata Edge. |
| Twinblade of the Phoenix | **−13.9** | **+1.3** (below cutoff) | Soft flip to near-parity with Lionheart. Either side is fine inside noise; not a ladder failure. |
| Bow-stitched Leggings | **+2.6 below cutoff** | **+18.9 #7** | Big jump. New number looks **more** like a real upgrade off Shattrath Leggings; old +2.6 looked suspiciously weak for Kaz’rogal leather. |
| Onslaught Greaves / Endless Rage | +11.7 / +7.3 | +13.8 / +7.3 | Small legs bump; Bow-stitched now leads both — matches common ret preference for those leather legs when set bonus is not in play. |
| Lightbringer Breastplate | **loss** vs Crystalforge (Loop 3 note) | **+10.1 #15** | Direction flip to gain. T6 ret chest beating T5 is the more obvious in-game expectation; not a false positive. |
| Red Belt of Battle | losing (Loop 3 “correctly lose”) | **+8.3 #16** | Direction flip to craft gain over Endless Pit — plausible for a socketed craft belt; soft that it flipped. |
| Band of Devastation / Ranger-General | +20.7 / +7.6 | same | Stable ring goals. |
| Bulwark of the Ancient Kings / Kings | not emphasized as top chips in Loop 3 shortlist size | **+22.0 / +14.9** (#4 / #9) | Classic ret blacksmith chests; strong vs Crystalforge is game-fine. |
| Weapon losses (World Breaker / Soul Cleaver / Gorehowl) | −23.1 / −38.6 / −103.9 flagged | same | Unchanged; Gorehowl still the magnitude outlier. |

Above-cutoff count **16 → 24** is mostly the same raid goals plus crafts (Bulwarks, Red Belt) and Bow-stitched / Lightbringer / Onslaught shoulders entering the chip list — raid/craft framed, not arena pollution.

---

## Rows that look fine

- **Weapons:** Torch / Cataclysm’s Edge over owned Lionheart — right BT Reliquary / Hyjal Archimonde goals. Twinblade near Lionheart — credible soft parity. Ladder is physical 2H only.
- **Act on tonight:** Raid/craft upgrades only; matches real chases for this set (weapons, Vashj belt, Bulwark/Onslaught chests, Devastation, Bow-stitched, Shadowmoon, Ranger-General).
- **Waist:** One-Hundred Deaths, Seething Fury, Lightbearer, Red Belt over Endless Pit — right SSC / Hyjal / BT / craft belt ladder; Mentor correctly loses hard.
- **Back:** Shadowmoon and Cloak of Darkness over owned Dark Reavers; weaker cloaks and Pepe’s tank shroud lose.
- **Chest / legs:** Bulwark / Onslaught / Lightbringer chests and Bow-stitched / Onslaught / Endless Rage legs as upgrades off Crystalforge / Shattrath — right kind of P3 answers.
- **Ranged:** Librams only; Avengement best.
- **Trinkets:** DST + Bloodlust hold; Tsunami / Madness / Coil / older trinkets lose — expected.
- **Owned gear:** Flat 0 wherever shown — no fake upgrade or loss.
- **Kael:** Twinblade and Ranger-General treated as normal persistent loot — correct.

---

## Gate

**Would a ret who knows the game trust this output?**  
**Yes for the shortlist and the weapon section**, with soft mid-list noise and “ignore Gorehowl’s number.”

Must stay true (already true here):

1. Weapon comparison stays real ret physical sticks — no caster 1H, Twinblade present when claiming P3 completeness.
2. Gorehowl-style nonsense stays flagged (or magnitudes become believable).
3. Act on tonight stays raid/craft framed (no arena weapons mixed in).
4. Readers treat ±3–8 DPS mid-list as soft given ~119 noise.

---

## Notes for engineering

- Fresh `generatedAt` `2026-07-28T05:09:27.761Z` — not the Loop 3 artifact.
- Weapons present: 32332, 30902, 29993, 28430, 30090, 32348, 28773 — no 30910; Gorehowl still `magnitudeWarning`.
- Act tonight has no arena rows; finger `replacesEquipped` + `alternateSlot` present.
- Soft completeness: Bindings of Lightning Reflexes (32574) still absent from wrist comparisons.
- Optional hygiene: Amulet of Bitter Hatred appears as itemId `278827` (loss vs Perilous is game-sensible); confirm that id is the real Anniversary item if engineers care about id fidelity.
- Loop 3 → 4 game-facing deltas of note: belt +23.6→+32.0, Bow-stitched +2.6→+18.9, Twinblade −13.9→+1.3, Lightbringer and Red Belt flipped from loss to gain — all look more (or still) game-plausible; no new equip/loot-rule failures.
