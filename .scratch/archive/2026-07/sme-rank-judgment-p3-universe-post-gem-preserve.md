# SME rank judgment — slamaltman P3 universe (post gem-preserve)

**Date:** 2026-07-28  
**Audience:** engineering (product gate), not the player  
**Prior review:** `.scratch/handoffs/sme-rank-judgment-p3-universe.md` (trust-with-caveats — same-item nonsense)  
**Fix under review:** commit `4933d35` (preserve worn gems on same-item swap), acceptance `.scratch/rank-reports/slamaltman-p3-universe.ACCEPTANCE.md`

## Verdict

**trust-with-caveats**

The prior same-item sanity failures are **gone**. Every equipped piece that appears in the rank output is **Δ0.00** and below cutoff — including **Furious Gizmatic Goggles** (was ~−35) and **Endless Pit / Bladespire / Crystalforge** (were false upgrades above cutoff). The above-cutoff band is now only new pieces a ret would read as real candidates.

Remaining caveats are soft: one arena weapon in the upgrade band, one mail shoulder with no row, and one non-worn wrist (Bracers of Eradication) sitting at exact 0 next to the worn Bladespire. None of those recreate the “already wearing it but it ranks as an upgrade/loss” failure mode.

## What was reviewed

| | |
|--|--|
| **Character** | slamaltman, US-Dreamscythe, ret, maxPhase 3 |
| **Baseline DPS** | ~2042.85 |
| **Pool / ranked** | universe ~347; 342 ranked; **37** above cutoff |
| **Primary** | `.scratch/rank-reports/slamaltman-p3-universe.json` (`generatedAt` 2026-07-29T00:24:13Z) |
| **Readable** | `.scratch/rank-reports/slamaltman-p3-universe.html` |
| **Acceptance** | `.scratch/rank-reports/slamaltman-p3-universe.ACCEPTANCE.md` (same-item PASS) |
| **Baseline gear** | `test/fixtures/slamaltman.raid-sim-request.json` (equipped IDs/gems); `test/fixtures/slamaltman.raw.json` (WCL combatants) |

**Baseline worn (from raid-sim fixture):** Furious Gizmatic Goggles (gemmed); Pendant of the Perilous; Shoulderpads of the Stranger; Drape of the Dark Reavers; Crystalforge Breastplate (gemmed); Bladespire Warbands (gemmed); Gloves of the Searing Grip; Girdle of the Endless Pit (gemmed); Shattrath Leggings; Warboots of Obliteration; Ring of a Thousand Marks + Shapeshifter’s Signet; Dragonspine Trophy + Bloodlust Brooch; Lionheart Executioner; Libram of Avengement.

## Same-item status (explicit)

**Prior nonsense is gone.**

| Check | Prior review | This run |
|--|--|--|
| Gizmatic while equipped | ~−35 DPS | **0.00**, below cutoff, owned |
| Endless Pit / Bladespire / Crystalforge | above cutoff as “upgrades” | **0.00**, below cutoff, owned |
| Other owned rows in output (cloak, boots, rings, trinkets, Lionheart, Searing Grip, Stranger, Pendant) | ~0 or small drift | **all 0.00** |
| Any owned row above cutoff | yes (three) | **none** |

Equipped phase-1 pieces not in this P3 universe (Shattrath Leggings, Shapeshifter’s Signet, Libram of Avengement) simply have no row — that is not the same bug as ranking worn gear as a gain/loss.

## Game problems

1. **Bracers of Eradication at exact Δ0.00 while not equipped**  
   These are real SSC plate wrists a ret often compares to Bladespire. Showing a flat zero next to the owned Bladespire (also 0) looks odd in-game: a different item should usually move the needle at least a little, even if the swap is a wash within noise. Soft suspicion only — not a hard fail like the old worn-item upgrades.

2. **Beast-tamer’s Shoulders still have no ranked row**  
   Mail Hyjal shoulders; a ret can wear mail. Not a top BiS expectation, but unlike Void Star / Talon of Al’ar / Living Root / Serpent-Coil (wrong class/role), this is not an obvious “cannot equip” skip on class rules alone.

3. **Soft / context caveats (not hard fails)**  
   - **Vengeful Gladiator’s Greatsword** (+7.59, #26) is a real-looking stick upgrade vs Lionheart, but it is **arena / PvP** loot, not raid loot.  
   - **Tsunami Talisman** and **Madness of the Betrayer** both lose vs DST + Bloodlust Brooch — plausible for this trinket pair; still worth a human eye.  
   - Mid-list order inside a few DPS (near-cutoff wrists/rings, Grips of Damnation at +2.9 below cutoff) is soft; not worth arguing over.  
   - Leather/mail agi hit pieces high on the list remain **equippable** for ret — not class false positives.

## Rows that look fine

- **Torch of the Damned** ≫ **Lionheart**, with **Cataclysm’s Edge** clearly second among 2H options — right shape for P3 ret.  
- **Belt of One-Hundred Deaths** as the big waist upgrade over Endless Pit — classic expectation.  
- **Band of Devastation**, **Unstoppable Aggressor’s Ring**, **Ranger-General**, **Stormrage**, **Deceitful Intent** as ring upgrades — sensible; exact mid-ring order soft.  
- **Cloaks** (Cloak of Darkness, Razor-Scale, Thalassian, Vengeance Wrap, Shadowmoon Destroyer’s Drape) beating Kara Dark Reavers — expected.  
- **Lightbringer Greaves** and **Leggings of Divine Retribution** / Bow-stitched over weak Shattrath legs — expected.  
- **Ranged** rows are **librams only** (other librams lose to Avengement) — correct class equip picture; no bow/gun false positive.  
- **Omitted wrong-class trinkets** (Void Star, Talon of Al’ar, Living Root, Serpent-Coil) — fine.  
- **No Kael’thas temporary legendaries** in the results — good.  
- Large losses on tank/healer/spirit plate and junk weapons (Legacy, Gorehowl as a big downgrade stick here, etc.) — directionally fine as “do not wear.”  
- **Cursed Vision of Sargeras** losing to gemmed engi Gizmatic — plausible for an engineering ret on this set.

## Gate

Would a ret who knows the game trust this output?

- **Yes** for the **above-cutoff upgrade list** as game-facing new-piece ranking (Torch, 100 Deaths, Cataclysm’s Edge, top rings/cloaks/belts/legs/boots). The old contamination from already-equipped rows is fixed.  
- **Still caveat** on treating every mid-band row as equally “raid tonight” without noticing **arena** vs **raid**, and on the missing **Beast-tamer’s** row / flat **Eradication** zero if wrists/shoulders are under the microscope.  
- **Before dropping caveats entirely:** optional loot-context clarity on PvP weapons; a second look at Eradication vs Bladespire if wrists matter for the gate; Beast-tamer either ranks or is explained as a sim failure in product terms engineers already track.

## Notes for engineering

- Same-item gem-preserve acceptance matches game sanity: all 13 owned ranked rows Δ0.00; Gizmatic no longer a −35 poster child.  
- Above-cutoff count dropped 40→37 vs the pre-fix writeup — consistent with removing the three false worn “upgrades.”  
- Still odd: Bracers of Eradication Δ0.00 and not owned.  
- Beast-tamer’s Shoulders: mail, ret-wearable, still no ranked row.  
- Arena greatsword still in the upgrade band — loot context, not a DPS dispute.
