# SME rank review — Loop 3 gate (second opinion / FINAL)

**Date:** 2026-07-27  
**Audience:** engineering team  
**Character:** slamaltman @ Dreamscythe-US, ret paladin  
**Role:** independent second opinion / **Loop 3 FINAL gate**  
**Prior writeup compared:** `.scratch/handoffs/sme-loop-3-review.md`  
**Verdict:** `trust-with-caveats`  
**Loop 3 gate:** **PASS**  
**Pipeline loop may stop?** **Yes**

---

## Verdict

**trust-with-caveats**

Independent re-score of the Phase 3 full-pool report agrees with Loop 3 A: the shortlist and weapon table look like answers a ret who knows the game would trust. Torch and Cataclysm’s Edge beat owned Lionheart; Twinblade of the Phoenix sits slightly under Lionheart; belts (Vashj / Seething Fury / Lightbearer), Band of Devastation, Shadowmoon / Cloak of Darkness, Onslaught greaves and chest, and Ranger-General are the right raid/craft chases. Ranged is librams only. Act on tonight is raid and craft only. Owned rows that appear stay flat 0. No Kael encounter-only legendaries. No caster one-hander on the 2H ladder. Gorehowl’s absurd loss is marked.

**Blocking game failures:** none.

Soft caveats (Gorehowl magnitude, harsh Soul Cleaver loss, mid-list mush inside ~119 SE, soft wrist completeness) remain non-blocking. Closing the minimum three-loop SME cycle is justified.

**Loop 3 pass? Yes. Pipeline loop can stop.**

---

## What was reviewed

| Item | Detail |
|------|--------|
| Results | `.scratch/rank-reports/slamaltman-p3-full-pool.html`, `.scratch/rank-reports/slamaltman-p3-full-pool.json` |
| Baseline gear | `.scratch/rank-reports/slamaltman-baseline-gear.json` (WCL Hydross) |
| Prior SME (A) | `.scratch/handoffs/sme-loop-3-review.md` |
| Spec / phase | ret, `maxPhase: 3`, full-pool offline rank |
| Artifact `generatedAt` | `2026-07-28T04:06:40.333Z` (on disk now) |
| Baseline set (summary) | Furious Gizmatic Goggles; Pendant of the Perilous; Shoulderpads of the Stranger; Drape of the Dark Reavers; Crystalforge Breastplate; Bladespire Warbands; Gloves of the Searing Grip; Girdle of the Endless Pit; Shattrath Leggings; Warboots of Obliteration; Ring of a Thousand Marks + Shapeshifter’s Signet; Dragonspine Trophy + Bloodlust Brooch; Lionheart Executioner; Libram of Avengement |
| Baseline DPS | ~2042.8 (±119 stdev); 16 above cutoff; cutoff 3.4 DPS / 0.15% |
| Stated assumptions | RaceHuman; talents/APL/buffs/consumes/encounter from pinned preset (not the log); profession-locked gems/items excluded; weapon imbue omitted |

**Independence note:** Fresh game judgment of the named HTML/JSON first. Loop 3 A was read only after scoring, to compare gate calls and soft caveats.

**Artifact note:** Loop 3 A cites `generatedAt: 2026-07-28T04:02:04.658Z`. The files on disk now show `04:06:40.333Z`. Game content checked here (above-cutoff chips, weapon ladder, deltas, Gorehowl flag) matches what A described — same shortlist shape and numbers. Do not treat B as evidence of a material rank change; treat it as a second opinion on the same game-facing output (timestamp string differs).

---

## Gate checklist (strict)

| Gate | Result |
|------|--------|
| Libram / bow equip | **Pass.** Eight ranged rows, all librams; no bow/gun/crossbow. Avengement owned at 0; other librams lose. |
| Owned fake loss / fake upgrade | **Pass.** Flat 0 wherever owned gear appears: goggles, Dark Reavers, Crystalforge, Warboots, Thousand Marks, Lionheart, Avengement. |
| Kael temps as normal loot | **Pass.** No Netherstrand / Warp Slicer / other Kael encounter-only legendaries (ids 30311–30318 absent). Keepable Kael loot present: Twinblade of the Phoenix (2H) and Band of the Ranger-General. Band of Devastation is Illidan BT ring, not a Kael temp weapon. |
| Weapon ladder complete & physical | **Pass.** Compared weapons: Torch (+37.9), Cataclysm’s Edge (+24.4), Lionheart (0 owned), Twinblade (−13.9), World Breaker (−23.1), Soul Cleaver (−38.6), Gorehowl (−103.9 flagged). **No** Tempest of Chaos (30910). **No** caster 1H. **No** arena Bonegrinder. Twinblade vs Lionheart is a believable small loss for a P2 physical stick on this set. |
| Arena not in Act tonight | **Pass.** Sixteen chips — all raid or craft. PvP rows exist below cutoff / off the shortlist only. |
| Gorehowl flagged | **Pass.** −103.9 (−5.1%); HTML `sim magnitude` warn; JSON `magnitudeWarning: true`. Number still unbelievable; disclosure satisfies the gate. |
| Finger replace labels | **Pass.** Above-cutoff rings replace Thousand Marks; alternate slot shows Shapeshifter’s with a worse (or near-flat for Devastation) delta — drop the weaker ring, keep the hit ring. |

---

## Game problems

### Blocking

**None.** No equip-rule failures, no encounter-only legendaries as keepable loot, no owned fake losses/upgrades, no arena weapons in Act on tonight, no caster stick on the 2H ladder.

### Non-blocking (flag; do not sink Loop 3)

1. **Gorehowl −103.9 remains nonsense; flagged.**  
   Direction (loss vs Lionheart) can be fine. A ~5% absolute hole is not a believable weapon swap on this set. Warn pill is enough; readers should ignore the number.

2. **Soul Cleaver −38.6 vs Lionheart.**  
   Real BT 2H (Shahraz). Loss size still looks harsh for a same-tier physical axe; not flagged like Gorehowl. Suspicious magnitude, not a shortlist false positive.

3. **Legs order still soft.**  
   Onslaught Greaves (+11.7) over Endless Rage (+7.3); Bow-stitched (+2.6) below cutoff. Character has no other Onslaught pieces. “Upgrade Shattrath legs” is right; strict order between Onslaught and Endless Rage is inside noise and set-bonus context.

4. **Ring mid-list mush.**  
   Reciprocity / Stormrage / Deceitful ~3–4 DPS inside ~119 SE. Devastation (+20.7) and Ranger-General (+7.6) stay clear goals. Replace + alt-slot labels correctly treat Thousand Marks as the drop and Shapeshifter’s as the stronger keep.

5. **Soft craft wrist; Bindings still absent.**  
   Swiftsteel (+3.7) near cutoff vs Bladespire — low urgency, direction OK. Bindings of Lightning Reflexes (32574) still not in the compared wrist set — soft completeness miss, not a false chip.

6. **Neck / head / hands / shoulders hold look fine.**  
   Engi goggles beat Onslaught helm; Searing Grip beats Onslaught hands; Stranger shoulders beat Onslaught shoulders by a small amount — match known ret priorities for this profile. Pepe’s Shroud as a tank Hyjal trash cloak losing to Dark Reavers is correct.

---

## Rows that look fine

- **Weapons:** Torch / Cataclysm’s Edge over owned Lionheart — right BT Reliquary / Hyjal Archimonde goals. Twinblade slightly under Lionheart — credible. Ladder is physical 2H only.
- **Act on tonight:** Raid/craft upgrades only; matches real chases for this set.
- **Waist:** One-Hundred Deaths, Seething Fury, Lightbearer over Endless Pit — right SSC / Hyjal / BT belt ladder; Red Belt / Mentor correctly lose.
- **Back:** Shadowmoon and Cloak of Darkness over owned Dark Reavers; Pepe’s tank shroud loses.
- **Chest / legs:** Onslaught breastplate and greaves as upgrades; Lightbringer breastplate as a loss vs Crystalforge while Onslaught gains — consistent with ret preferring warrior DPS plate chest on many profiles.
- **Ranged:** Librams only; Avengement best.
- **Trinkets:** DST + Bloodlust hold; weaker / older trinkets lose.
- **Owned gear:** Flat 0 wherever shown.
- **Kael:** Twinblade and Ranger-General treated as normal persistent loot — correct.

---

## Gate

**Would a ret who knows the game trust this output?**  
**Yes for the shortlist and the weapon section**, with soft mid-list noise and “ignore Gorehowl’s number.”

**Loop 3 pass?**  
**Yes.**

**Pipeline loop can stop?**  
**Yes.** Minimum three SME loops are satisfied. No blocking game failure remains on this artifact. Further SME loops only pay if the rank is regenerated after material pool/sim changes.

Must stay true (already true here):

1. Weapon comparison stays real ret physical sticks — no caster 1H; Twinblade present when claiming P3 completeness.
2. Gorehowl-style nonsense stays flagged (or magnitudes become believable).
3. Act on tonight stays raid/craft framed (no arena weapons mixed in).
4. Readers treat ±3–8 DPS mid-list as soft given ~119 noise.

---

## What changed vs Loop 3 SME (A)

| Topic | Loop 3 A | This Loop 3 B | Changed? |
|-------|----------|---------------|----------|
| Artifact `generatedAt` | `04:02:04.658Z` | `04:06:40.333Z` on disk | Timestamp string differs; game content matches A’s numbers |
| Tempest of Chaos | Absent | Absent | Held |
| Twinblade of the Phoenix | −13.9 present | Same | Held |
| Libram / no bow | Pass | Pass | Held |
| Owned flat 0 | Pass | Pass | Held |
| Kael temps as loot | Pass | Pass | Held |
| Arena in Act tonight | Pass | Pass | Held |
| Gorehowl flagged | Pass | Pass | Held |
| Finger replace labels | Pass | Pass | Held |
| Soft caveats | Non-blocking list | Same list | No new blockers |
| Verdict | `trust-with-caveats` | `trust-with-caveats` | Same |
| Gate | Pass / stop | Pass / stop | Same |

**Usefulness of A’s writeup for engineers:** High. A’s gate checklist and soft-caveat list are the right product questions; B independently reaches the same pass and the same empty blocker list. Closing the loop is justified.

---

## Notes for engineering

- On-disk `generatedAt` is `04:06:40.333Z`; A cited `04:02:04.658Z`. Game deltas and chip set match A — no new blocker from the timestamp mismatch alone.
- Weapons present: 32332, 30902, 28430, 29993, 30090, 32348, 28773 — no 30910; Gorehowl still `magnitudeWarning`.
- Act tonight has no arena rows; finger `replacesEquipped` + `alternateSlot` present and correct.
- Soft completeness: Bindings of Lightning Reflexes (32574) still absent from wrist comparisons.
