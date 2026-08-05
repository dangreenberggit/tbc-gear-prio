# SME rank review — Loop 3 (minimum-loop close)

**Date:** 2026-07-27  
**Audience:** engineering team  
**Character:** slamaltman @ Dreamscythe-US, ret paladin  
**Role:** Loop 3 of minimum 3 — independent fresh game judgment  
**Prior writeup compared:** `.scratch/handoffs/sme-loop-2-review-b.md`  
**Verdict:** `trust-with-caveats`  
**Loop 3 gate:** **PASS** (minimum 3-loop cycle may close)

---

## Verdict

**trust-with-caveats**

A ret who knows Phase 3 would recognize this shortlist and weapon table as the right answers for this set: Torch and Cataclysm’s Edge over Lionheart; Twinblade of the Phoenix slightly under Lionheart; Vashj / Hyjal / Lightbearer belts; Band of Devastation and Ranger-General as ring goals with correct replace labels; Shadowmoon / Cloak of Darkness over the Kara cloak; Onslaught greaves and chest off weak Shattrath / Crystalforge. Ranged is librams only. Act on tonight is raid and craft only. Owned rows that appear stay flat 0. No Kael encounter-only legendaries. No caster one-hander on the 2H ladder. Gorehowl’s absurd loss is marked.

Soft caveats remain (Gorehowl magnitude, harsh Soul Cleaver loss, mid-list mush inside ~119 SE, soft wrist craft miss). None of those are product blockers. This is the same post–Tempest-removal artifact Loop 2 B already passed — Loop 3 finds no new game failure and no regression.

**Loop 3 pass? Yes.** Minimum three-loop SME cycle can close on this run.

---

## What was reviewed

| Item | Detail |
|------|--------|
| Results | `.scratch/rank-reports/slamaltman-p3-full-pool.html`, `.scratch/rank-reports/slamaltman-p3-full-pool.json` |
| Baseline gear | `.scratch/rank-reports/slamaltman-baseline-gear.json` (WCL Hydross) |
| Prior SME | `.scratch/handoffs/sme-loop-2-review-b.md` |
| Spec / phase | ret, `maxPhase: 3`, full-pool offline rank, `generatedAt: 2026-07-28T04:02:04.658Z` |
| Baseline set (summary) | Furious Gizmatic Goggles; Pendant of the Perilous; Shoulderpads of the Stranger; Drape of the Dark Reavers; Crystalforge Breastplate; Bladespire Warbands; Gloves of the Searing Grip; Girdle of the Endless Pit; Shattrath Leggings; Warboots of Obliteration; Ring of a Thousand Marks + Shapeshifter’s Signet; Dragonspine Trophy + Bloodlust Brooch; Lionheart Executioner; Libram of Avengement |
| Baseline DPS | ~2042.8 (±119 stdev); 16 above cutoff; cutoff 3.4 DPS / 0.15% |
| Stated assumptions | RaceHuman; talents/APL/buffs/consumes/encounter from pinned preset (not the log); profession-locked gems/items excluded; weapon imbue omitted |

**Independence note:** Fresh game judgment of the named files. Loop 2 B was read only after scoring the report, to track whether anything improved or regressed and whether B’s caveats still hold.

**Artifact note:** `generatedAt` matches Loop 2 B exactly (`2026-07-28T04:02:04.658Z`). This is a third pass on the same run, not a newer rank. Do not claim Loop 3 “fixed” anything relative to B — the file did not change.

---

## Gate checklist (strict)

| Gate | Result |
|------|--------|
| Libram / bow equip | **Pass.** Eight ranged rows, all librams; no bow/gun/crossbow. Avengement owned at 0; other librams lose. |
| Owned fake loss / fake upgrade | **Pass.** Every owned row that appears is flat 0: goggles, Dark Reavers, Crystalforge, Warboots, Thousand Marks, Lionheart, Avengement. |
| Kael temps as normal loot | **Pass.** No Netherstrand / Warp Slicer / other Kael encounter-only legendaries. Keepable Kael loot present: Twinblade of the Phoenix (2H) and Band of the Ranger-General. Band of Devastation is Illidan BT ring, not a Kael temp weapon. |
| Weapon ladder complete & physical | **Pass.** Compared weapons: Torch (+37.9), Cataclysm’s Edge (+24.4), Lionheart (0 owned), Twinblade (−13.9), World Breaker (−23.1), Soul Cleaver (−38.6), Gorehowl (−103.9 flagged). **No** Tempest of Chaos (30910). **No** caster 1H. **No** arena Bonegrinder. Twinblade vs Lionheart is a believable small loss for a P2 physical stick on this P3-leaning set. |
| Arena not in Act tonight | **Pass.** Sixteen chips: Torch, Cataclysm’s Edge, three belts, Band of Devastation, Shadowmoon / Cloak of Darkness, Onslaught greaves/chest, Ranger-General, Endless Rage, soft rings, Swiftsteel. All PvP rows sit below cutoff and off the shortlist. |
| Gorehowl flagged | **Pass.** −103.9 (−5.1%); HTML `sim magnitude` warn; JSON `magnitudeWarning: true`. Number still unbelievable; disclosure satisfies the gate. |
| Finger replace labels | **Pass.** Above-cutoff rings replace Thousand Marks; alternate slot shows Shapeshifter’s with a worse (or near-flat for Devastation) delta — matches “drop the weaker ring, keep the hit ring.” |

---

## Game problems

### Blocking

None on this artifact.

### Non-blocking (flag; do not sink Loop 3)

1. **Gorehowl −103.9 remains nonsense; flagged.**  
   Direction (loss vs Lionheart) can be fine. A ~5% absolute hole is not a believable weapon swap on this set. Warn pill is enough; readers should ignore the number.

2. **Soul Cleaver −38.6 vs Lionheart.**  
   Real BT 2H (Shahraz). Loss size still looks harsh for a same-tier physical axe; not flagged like Gorehowl. Suspicious magnitude, not a shortlist false positive.

3. **Legs order still soft.**  
   Onslaught Greaves (+11.7) over Endless Rage (+7.3); Bow-stitched (+2.6) below cutoff. Character has no other Onslaught pieces. “Upgrade Shattrath legs” is right; strict order between Onslaught and Endless Rage is inside noise and set-bonus context.

4. **Ring mid-list mush.**  
   Reciprocity / Stormrage / Deceitful ~3–4 DPS inside ~119 SE. Devastation (+20.7) and Ranger-General (+7.6) stay clear goals. Replace + alt-slot labels correctly treat Thousand Marks as the drop and Shapeshifter’s as the stronger keep (Devastation alt ≈ −1.3 if forced onto the wrong finger).

5. **Soft craft wrist; Bindings still absent.**  
   Swiftsteel (+3.7) near cutoff vs Bladespire — low urgency, direction OK. Bindings of Lightning Reflexes (common craft competitor for ret wrists) still not in the compared wrist set — soft completeness miss, not a false chip.

6. **Neck / head / hands / shoulders hold look fine; soft absences only.**  
   Pendant of the Perilous not listed as an owned neck row (Choker of Endless Nightmares +0.5 below cutoff vs that baseline is believable). Engi goggles beat Onslaught helm; Searing Grip beats Onslaught hands; Stranger shoulders beat Onslaught shoulders by a small amount — all match known ret priorities for this profile. Pepe’s Shroud (−28) as a tank Hyjal trash cloak losing to Dark Reavers is correct, not a BiS miss.

---

## Rows that look fine

- **Weapons:** Torch / Cataclysm’s Edge over owned Lionheart — right BT Reliquary / Hyjal Archimonde goals. Twinblade slightly under Lionheart — credible. Ladder is physical 2H only.
- **Act on tonight:** Raid/craft upgrades only; matches real chases for this set (weapons, Vashj belt, Devastation, Shadowmoon, Onslaught legs/chest, Ranger-General).
- **Waist:** One-Hundred Deaths, Seething Fury, Lightbearer over Endless Pit — right SSC / Hyjal / BT belt ladder; Red Belt / Mentor correctly lose.
- **Back:** Shadowmoon and Cloak of Darkness over owned Dark Reavers; weaker cloaks and Pepe’s tank shroud lose.
- **Chest / legs:** Onslaught breastplate and greaves as upgrades; Lightbringer breastplate as a loss vs Crystalforge while Onslaught gains is consistent with ret preferring warrior DPS plate chest on many profiles.
- **Ranged:** Librams only; Avengement best.
- **Trinkets:** DST + Bloodlust hold; Tsunami / Madness / Coil / older trinkets lose — expected.
- **Owned gear:** Flat 0 wherever shown — no fake upgrade or loss.
- **Kael:** Twinblade and Ranger-General treated as normal persistent loot — correct.

---

## Gate

**Would a ret who knows the game trust this output?**  
**Yes for the shortlist and the weapon section**, with soft mid-list noise and “ignore Gorehowl’s number.”

**Loop 3 pass?**  
**Yes.** Minimum three SME loops are satisfied on this artifact.

Must stay true (already true here):

1. Weapon comparison stays real ret physical sticks — no caster 1H, Twinblade present when claiming P3 completeness.
2. Gorehowl-style nonsense stays flagged (or magnitudes become believable).
3. Act on tonight stays raid/craft framed (no arena weapons mixed in).
4. Readers treat ±3–8 DPS mid-list as soft given ~119 noise.

---

## What changed vs Loop 2 SME (B)

| Topic | Loop 2 B | This Loop 3 | Changed? |
|-------|----------|-------------|----------|
| Artifact `generatedAt` | `04:02:04.658Z` | Same | Same file |
| Tempest of Chaos | Absent | Absent | Held |
| Twinblade of the Phoenix | −13.9 present | Same | Held |
| Libram / no bow | Pass | Pass | Held |
| Owned flat 0 | Pass | Pass | Held |
| Kael temps as loot | Pass | Pass | Held |
| Arena in Act tonight | Pass | Pass | Held |
| Gorehowl flagged | Pass | Pass | Held |
| Finger replace labels | Pass | Pass | Held |
| Soft legs / rings / Soul Cleaver / wrist / Bindings | Non-blocking | Same + Pepe tank-cloak note | Unchanged blockers; one extra soft confirmation |
| Verdict | `trust-with-caveats` | `trust-with-caveats` | Same |
| Gate | Pass | Pass | Same |

**Usefulness of B’s writeup for engineers:** High. B correctly closed Loop 2 on the post-removal run and listed the right remaining soft caveats. Loop 3 agrees on every gate and does not invent new blockers. Closing the minimum three-loop cycle is justified; further loops only pay if the rank is regenerated after material pool/sim fixes.

---

## Notes for engineering

- Same `generatedAt` as Loop 2 B — Loop 3 is a re-review, not evidence of a newer rank.
- Weapons present: 32332, 30902, 28430, 29993, 30090, 32348, 28773 — no 30910; Gorehowl still `magnitudeWarning`.
- Act tonight has no arena rows; finger `replacesEquipped` + `alternateSlot` present.
- Soft completeness: Bindings of Lightning Reflexes (32574) still absent from wrist comparisons.
- Optional hygiene: Amulet of Bitter Hatred appears as itemId `278827` (loss vs Perilous is game-sensible); confirm that id is the real Anniversary item if engineers care about id fidelity.
