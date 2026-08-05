# SME rank review — Loop 1 (fresh)

**Date:** 2026-07-27  
**Audience:** engineering team  
**Character:** slamaltman @ Dreamscythe-US, ret paladin  
**Verdict:** `trust-with-caveats`

---

## Verdict

**trust-with-caveats**

The above-cutoff raid upgrades for *this* set look like what a Phase 3 ret would expect: Torch and Cataclysm’s Edge over Lionheart, Belt of One-Hundred Deaths / Seething Fury / Lightbearer over Endless Pit, Band of Devastation and Ranger-General as ring goals, Shadowmoon Destroyer’s Drape and Cloak of Darkness over the Kara cloak, legs upgrades off weak Shattrath Leggings. Ranged is librams only; Avengement holds. Equipped pieces sit at flat zero.

Do **not** treat the printed shortlist as unattended truth end-to-end. Twinblade of the Ashtongue is absent from the weapon comparison, so absolute weapon #1 is incomplete. Gorehowl’s −104 DPS loss fails a magnitude sanity check. Arena Bonegrinder is mixed into “act on tonight.” Finger results only replace one equipped ring. Mid-list order sits inside huge run-to-run noise.

---

## What was reviewed

| Item | Detail |
|------|--------|
| Results | `.scratch/rank-reports/slamaltman-p3-full-pool.html`, `.scratch/rank-reports/slamaltman-p3-full-pool.json` |
| Baseline gear | `.scratch/rank-reports/slamaltman-baseline-gear.json` (WCL Hydross fight dump) |
| Pool spot-check | `data/pools/ret.json` (equip / presence only) |
| Spec / phase | ret, `maxPhase: 3`, full-pool offline rank, generated `2026-07-28T03:38:15.544Z` |
| Baseline set (summary) | Furious Gizmatic Goggles; Pendant of the Perilous; Shoulderpads of the Stranger; Drape of the Dark Reavers; Crystalforge Breastplate; Bladespire Warbands; Gloves of the Searing Grip; Girdle of the Endless Pit; Shattrath Leggings; Warboots of Obliteration; Ring of a Thousand Marks + Shapeshifter’s Signet; Dragonspine Trophy + Bloodlust Brooch; Lionheart Executioner; Libram of Avengement |
| Baseline DPS | ~2042.8 (±119 stdev); 17 above cutoff; cutoff 3.4 DPS / 0.15% |
| Stated assumptions (from report) | RaceHuman; talents/APL/buffs/consumes/encounter from pinned preset (not the log); profession-locked gems/items excluded; weapon imbue omitted |

This is a **fresh** judgment of this Loop 1 output — not a second opinion on an earlier SME writeup.

---

## Game problems

### Blocking (product should not ship these as trustworthy without fix or clear disclosure)

1. **Absolute P3 weapon ladder is incomplete without Twinblade of the Ashtongue.**  
   Torch ≫ Lionheart and Cataclysm’s Edge as #2 are credible for BT/Hyjal. Twinblade (Illidan) is a standard top-tier ret 2H in this phase and is **not** in the compared set. A ret cannot treat printed weapon #1 as settled among all real P3 sticks.

2. **Gorehowl at −103.9 DPS vs Lionheart Executioner fails magnitude sanity.**  
   Direction (Gorehowl weaker than Lionheart for many ret sims) is plausible. A ~5% single-swap loss for a known Kara two-hander is not. That row should not be trusted as a game-facing number.

### Non-blocking (flag, do not sink the whole shortlist)

3. **Vengeful Gladiator’s Bonegrinder in the shortlist (#12, +7.6).**  
   Real small stick upgrade in-sim is fine. It is **arena Season 3**, not raid loot. Calling it out beside Reliquary / Archimonde / Vashj pieces mislabels loot context.

4. **Finger upgrades only replace ring slot “a” (Thousand Marks).**  
   Shapeshifter’s Signet is never swapped. Band of Devastation / Ranger-General / Stormrage / Deceitful Intent as goals vs Thousand Marks are directionally right; the report does not answer “which of my two rings should this replace?”

5. **Legs order is soft / arguable.**  
   Onslaught Greaves (+11.7) over Legguards of Endless Rage (+7.3), with Bow-stitched Leggings only +2.6 (below cutoff), on a character with **no** other Onslaught pieces. Community often ranks Bow-stitched / Endless Rage ahead of a naked Onslaught leg. Direction “upgrade Shattrath legs” is fine; strict order is not.

6. **Ring mid-list is mush.**  
   Ring of Reciprocity (Kara) above Stormrage Signet and Ring of Deceitful Intent, all ~3–4 DPS with ~119 independent SE. Band of Devastation and Ranger-General as clear goals stay; Reciprocity vs Stormrage vs Deceitful is not worth wishlist-ordering from this run.

7. **Soul Cleaver −38.6 vs Lionheart.**  
   Soul Cleaver is a real BT two-hander people evaluate on the same ladder as Torch. A large loss can happen in some profiles; magnitude still looks harsh next to the Gorehowl problem. Treat as “suspicious loss size,” not a shortlist false positive.

8. **Soft craft wrist.**  
   Swiftsteel Bracers (+3.7) near cutoff vs Bladespire — direction OK, low urgency. Bindings of Lightning Reflexes (often preferred craft wrists for ret) are absent from the compared set — soft miss, not a false positive on Swiftsteel.

---

## Rows that look fine

- **Weapon:** Torch of the Damned (+37.9) and Cataclysm’s Edge (+24.4) over Lionheart — right BT/Hyjal goals for this set. Lionheart at flat zero as owned.
- **Waist:** Belt of One-Hundred Deaths, Belt of Seething Fury, Girdle of the Lightbearer — leather/plate P3 belts a ret can wear; strong upgrades over Girdle of the Endless Pit.
- **Finger (direction):** Band of Devastation and Band of the Ranger-General as the clear ring chases.
- **Back:** Shadowmoon Destroyer’s Drape and Cloak of Darkness — both legitimate P3 cloak upgrades over Drape of the Dark Reavers; near-tie is fine.
- **Ranged:** Librams only (no bows/guns). Libram of Avengement stays best — matches usual Anniversary ret relic expectation.
- **Trinkets:** DST + Bloodlust Brooch hold; Tsunami / Madness / Coil all losses — expected.
- **Head / hands / feet / shoulders:** Goggles, Searing Grip, Warboots of Obliteration, Stranger shoulders holding or beating singles — credible for this gear.
- **Chest:** Lone Onslaught Breastplate small upgrade over Crystalforge; Lightbringer chest negative — sensible for ret.
- **Owned gear:** Equipped pieces that appear are flat 0, not fake upgrades/losses.

---

## Gate

**Would a ret who knows the game trust this output?**  
**Partly — for raid *direction* on this character, after human filter. Not as an unattended loot bible.**

Must be true before full trust:

1. P3 weapon comparison includes Twinblade (and ideally other real contenders on the same ladder), so #1 weapon is not “best of an incomplete list.”
2. Loss magnitudes for known mid-tier weapons (especially Gorehowl) look believable, or those rows are clearly marked untrustworthy.
3. Shortlist / “act on tonight” framing separates **raid** loot from **arena**.
4. Ring results cover **both** equipped rings, or clearly say which one is being replaced.
5. Readers treat mid-list order (±3–8 DPS here) as soft given ~119 DPS noise — not a ranked wishlist.

Until then: **trust-with-caveats**. Phase-style “would you act on the printed list blind?” stays **no**; “are the big raid upgrades the right kind of answer for slamaltman?” stays **yes**.

---

## Notes for engineering

- Twinblade of the Ashtongue missing from weapon set; Gorehowl −104 magnitude; finger `slotChoice` only `"a"`; arena Bonegrinder in act-tonight chips; Bow-stitched under Onslaught/Endless Rage.
)
