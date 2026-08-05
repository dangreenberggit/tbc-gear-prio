# SME rank judgment — slamaltman P3 universe

**Date:** 2026-07-28  
**Audience:** engineering (product gate), not the player

## Verdict

**trust-with-caveats**

The top of the list (new raid sticks, belts, rings, cloaks, leather hit pieces, Lightbringer greaves) looks like what a ret who knows P3 would expect for this logged set. There is no bow-in-ranged false positive this time, and the five omitted class-wrong trinkets/shoulders are mostly correct game exclusions.

Do **not** treat the full “above cutoff” band as clean: several pieces the character is **already wearing** appear as meaningful upgrades, and the equipped engineering head appears as a large loss. That fails a basic in-game sanity check and contaminates the near-cutoff list.

## What was reviewed

| | |
|--|--|
| **Character** | slamaltman, US-Dreamscythe, ret, maxPhase 3 |
| **Baseline DPS** | ~2042.85 |
| **Pool / ranked** | universe ~347; 342 ranked; 40 above cutoff; 5 omitted after sim failures |
| **Primary** | `.scratch/rank-reports/slamaltman-p3-universe.json` |
| **Readable** | `.scratch/rank-reports/slamaltman-p3-universe.html` |
| **Headline** | `.scratch/rank-reports/slamaltman-p3-universe.SUMMARY.md` |
| **Baseline gear** | `.scratch/rank-reports/slamaltman-baseline-gear.json` (WCL Hydross dump) |
| **Names / pool** | `data/universes/ret-p3.json` (spot-checks only) |

**Baseline worn (summary):** Furious Gizmatic Goggles; Pendant of the Perilous; Shoulderpads of the Stranger; Drape of the Dark Reavers; Crystalforge Breastplate; Bladespire Warbands; Gloves of the Searing Grip; Girdle of the Endless Pit; Shattrath Leggings; Warboots of Obliteration; Ring of a Thousand Marks + Shapeshifter’s Signet; Dragonspine Trophy + Bloodlust Brooch; Lionheart Executioner; Libram of Avengement.

## Game problems

1. **Already-worn gear listed as upgrades above cutoff**  
   - **Girdle of the Endless Pit** (+4.52, #34) — currently equipped.  
   - **Bladespire Warbands** (+4.35, #35) — currently equipped.  
   - **Crystalforge Breastplate** (+4.26, #36) — currently equipped.  
   A ret reading “above cutoff” would see three pieces they already have as if they were upgrades. That is nonsense and should not survive a game sanity check.

2. **Already-worn head listed as a large loss**  
   **Furious Gizmatic Goggles** show about **−35 DPS** while they are the equipped head. Other non-socketed worn pieces correctly sit near **0** (cloak, boots, rings, trinkets, Lionheart, Searing Grip). Same-item deltas that are not ~0 on equipped gear are a hard credibility failure.

3. **Shoulderpads of the Stranger slightly positive while equipped** (+1.45, below cutoff). Same class of problem as (1), softer because it is under the cutoff line.

4. **Beast-tamer’s Shoulders omitted** (sim failure, no row). These are **mail** Hyjal shoulders; a ret can wear mail. Not a top BiS expectation, but unlike the caster/hunter/druid/mage trinkets below, this is not an obvious “wrong class” exclusion on equip rules alone.

5. **Soft / context caveats (not hard fails)**  
   - **Vengeful Gladiator’s Greatsword** (+7.59, #26) is a real-looking stick upgrade vs Lionheart, but it is **arena** loot, not raid loot for tonight.  
   - **Tsunami Talisman** and **Madness of the Betrayer** both lose vs DST + Bloodlust Brooch. Plausible for this strong trinket pair; still worth a human eye because both are well-known melee trinkets.  
   - Mid-list order inside a few DPS (rings, craft bracers, near-cutoff gloves like Grips of Damnation at +2.9) is soft; not worth arguing over.  
   - Leather/mail agi pieces high on the list (Shadow-walker’s Cord, Bow-stitched Leggings, Shadowmaster’s Boots, etc.) are **equippable** and often used for hit/exp — not a false positive by class rules.

## Rows that look fine

- **Torch of the Damned** ≫ **Lionheart Executioner**, with **Cataclysm’s Edge** clearly second among 2H options — right shape for P3 ret.  
- **Belt of One-Hundred Deaths** as the big waist upgrade over Endless Pit — classic expectation.  
- **Band of Devastation**, **Unstoppable Aggressor’s Ring**, **Ranger-General**, **Stormrage**, **Deceitful Intent** as ring upgrades over Thousand Marks / Shapeshifter’s — sensible candidates; exact order among mid rings is soft.  
- **Cloaks** (Cloak of Darkness, Razor-Scale, Thalassian, Vengeance Wrap, Shadowmoon Destroyer’s Drape) beating Kara Dark Reavers — expected.  
- **Lightbringer Greaves** and **Leggings of Divine Retribution** / Bow-stitched over weak **Shattrath Leggings** — expected.  
- **Ranged** rows are **librams only** (other librams lose to Avengement) — correct class equip picture; no bow/gun false positive.  
- **Omitted trinkets** Void Star Talisman, Talon of Al’ar, Living Root of the Wildheart, Serpent-Coil Braid — wrong class / wrong role; fine that they did not rank.  
- **No Kael’thas temporary legendaries** in the results — good.  
- Large losses on tank/healer/spirit plate and junk weapons (Legacy, Gorehowl as a downgrade stick here, etc.) — directionally fine as “do not wear.”

## Gate

Would a ret who knows the game trust this output?

- **Yes** for the **clear new-piece** upgrades at the top (Torch, 100 Deaths, Cataclysm’s Edge, top rings/cloaks/belts/legs/boots).  
- **No** for treating the entire **above-cutoff** list as actionable without stripping **already-equipped** rows and without distrusting **same-item** deltas on socketed worn gear.  
- **Before “trust” without caveats:** already-equipped items must show ~0 (or be absent from “upgrade” lists), and the engineering head must not appear as a −35 “candidate.” Optionally surface arena vs raid on PvP weapons so the loot context is obvious.

## Notes for engineering

- Already equipped: Endless Pit, Bladespire, Crystalforge above cutoff; Gizmatic Goggles large negative; Stranger slight positive.  
- Beast-tamer’s Shoulders: mail, ret-wearable, no ranked row (unlike clear wrong-class trinket skips).  
- Ranged libram-only outcome is a game win vs prior bow false positives.  
- Arena greatsword in the upgrade band needs a loot-context label, not a DPS dispute.
