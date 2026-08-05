# SME rank review — Loop 1 gate (second opinion)

**Date:** 2026-07-27  
**Audience:** engineering team  
**Character:** slamaltman @ Dreamscythe-US, ret paladin  
**Role:** independent second opinion / **Loop 1 gate**  
**Prior writeup compared:** `.scratch/handoffs/sme-loop-1-review.md`  
**Verdict:** `do-not-trust`  
**Loop 1 gate:** **FAIL — do not continue to Loop 2**

---

## Verdict

**do-not-trust**

Raid *direction* on armor/jewelry for this set is mostly credible (Torch / Cataclysm’s Edge / Vashj belt / Band of Devastation / Shadowmoon cloak). That is not enough for this gate.

Strict blockers still fail on the printed output:

1. Absolute P3 weapon #1 is incomplete — no Illidan-tier stick and no Twinblade of the Phoenix on the ladder.
2. Arena Season 3 Bonegrinder sits in **Act on tonight** beside Reliquary / Archimonde / Vashj loot.
3. Gorehowl at −103.9 DPS vs Lionheart still fails magnitude sanity.

Compared to prior Loop 1 SME (A): **same report, same numbers, same caveats.** Nothing in this artifact improved. Equip-rule / Kael-temp / owned-gear failures from the *earlier* pre-loop era are already gone here — those wins hold — but they were already credited by A. Gate still fails.

---

## What was reviewed

| Item | Detail |
|------|--------|
| Results | `.scratch/rank-reports/slamaltman-p3-full-pool.html`, `.scratch/rank-reports/slamaltman-p3-full-pool.json` |
| Baseline gear | `.scratch/rank-reports/slamaltman-baseline-gear.json` (WCL Hydross) |
| Prior SME (A) | `.scratch/handoffs/sme-loop-1-review.md` |
| Spec / phase | ret, `maxPhase: 3`, full-pool offline rank, `generatedAt: 2026-07-28T03:38:15.544Z` |
| Baseline set (summary) | Furious Gizmatic Goggles; Pendant of the Perilous; Shoulderpads of the Stranger; Drape of the Dark Reavers; Crystalforge Breastplate; Bladespire Warbands; Gloves of the Searing Grip; Girdle of the Endless Pit; Shattrath Leggings; Warboots of Obliteration; Ring of a Thousand Marks + Shapeshifter’s Signet; Dragonspine Trophy + Bloodlust Brooch; Lionheart Executioner; Libram of Avengement |
| Baseline DPS | ~2042.8 (±119 stdev); 17 above cutoff |
| Stated assumptions | RaceHuman; talents/APL/buffs/consumes/encounter from pinned preset (not the log); profession-locked gems/items excluded; weapon imbue omitted |

**Independence note:** This is a fresh game judgment of the named files, not a resume of any prior SME agent. A’s writeup was read only to score improvement and usefulness for the gate.

**Artifact note (for engineers):** This JSON/HTML matches A’s reviewed run (same timestamp and deltas). A ret reading the report still sees the same incomplete weapon set and the same arena chip. Pool edits after the report do not change what the report shows.

---

## Game problems

### Blocking (Loop 1 gate — must fix before Loop 2)

1. **Incomplete absolute P3 weapon ladder.**  
   Printed weapons: Torch (+37.9), Cataclysm’s Edge (+24.4), Vengeful Gladiator’s Bonegrinder (+7.6), Lionheart (0), World Breaker (−23.1), Soul Cleaver (−38.6), Gorehowl (−103.9).  
   Missing from the compared set: **Tempest of Chaos** (Illidan, BT) and **Twinblade of the Phoenix** (Kael’thas, TK — persistent 2H, not encounter-only). There is no real item named “Twinblade of the Ashtongue”; those two are the sticks a Phase 3 ret expects on the same ladder as Torch. Torch as printed #1 is “best of an incomplete list,” not settled BiS among real P3 two-handers.

2. **Arena weapon in the raid shortlist.**  
   Vengeful Gladiator’s Bonegrinder is #12 in **Act on tonight** (+7.6). It is Season 3 arena, not raid loot. Sitting next to Torch / Cataclysm’s Edge / Belt of One-Hundred Deaths mislabels loot context in the primary CTA.

3. **Gorehowl −103.9 DPS fails magnitude sanity.**  
   Direction (Gorehowl behind Lionheart Executioner for many ret profiles) can be fine. A ~5% single-swap loss for a known Karazhan two-hander is not believable as a game-facing number. Do not ship that row as trustworthy.

### Non-blocking (flag; do not alone sink raid-direction trust)

4. **Finger upgrades only replace ring slot “a” (Thousand Marks).**  
   Shapeshifter’s Signet is never the replacement target. Band of Devastation / Ranger-General as goals vs Thousand Marks are directionally right; the report does not answer which equipped ring to drop.

5. **Legs order soft / arguable.**  
   Onslaught Greaves (+11.7) over Legguards of Endless Rage (+7.3); Bow-stitched below cutoff (+2.6). Character has no other Onslaught. Community often ranks Bow-stitched / Endless Rage ahead of a naked Onslaught leg. “Upgrade Shattrath legs” is fine; strict order is not.

6. **Ring mid-list mush.**  
   Reciprocity / Stormrage / Deceitful Intent all ~3–4 DPS with ~119 independent SE. Band of Devastation and Ranger-General as clear goals stay; mid-list order is not a wishlist.

7. **Soul Cleaver −38.6 vs Lionheart.**  
   Real BT stick on the same ladder as Torch. Large loss can happen on some profiles; magnitude still looks harsh next to the Gorehowl problem. Suspicious loss size, not a shortlist false positive.

8. **Soft craft wrist.**  
   Swiftsteel Bracers (+3.7) near cutoff vs Bladespire — low urgency. Bindings of Lightning Reflexes (often preferred craft wrists) absent — soft miss.

### Gate checklist (strict)

| Blocker | Status on this report |
|---------|----------------------|
| Libram / bow equip rules | **Pass** — ranged is librams only; no bows/guns; Avengement holds at 0 |
| Owned gear fake loss | **Pass** — equipped pieces that appear are flat 0 |
| Kael temp legendaries as normal loot | **Pass** — no Netherstrand / Warp Slicer / other encounter-only Kael weapons as keepable gear |
| Incomplete weapon ladder | **Fail** — Tempest of Chaos and Twinblade of the Phoenix absent from compared weapons |
| Arena in raid shortlist | **Fail** — Bonegrinder in Act on tonight |

---

## Rows that look fine

- **Weapon (partial):** Torch and Cataclysm’s Edge over Lionheart — right BT/Hyjal *kind* of goals for this set. Lionheart at flat zero as owned.
- **Waist:** Belt of One-Hundred Deaths, Belt of Seething Fury, Girdle of the Lightbearer — legitimate leather/plate P3 belts; strong vs Endless Pit.
- **Finger (direction):** Band of Devastation and Band of the Ranger-General as clear ring chases.
- **Back:** Shadowmoon Destroyer’s Drape and Cloak of Darkness over Dark Reavers — legitimate; near-tie fine.
- **Ranged:** Librams only. Libram of Avengement best — matches usual Anniversary ret relic expectation.
- **Trinkets:** DST + Bloodlust Brooch hold; Tsunami / Madness / Coil losses — expected.
- **Head / hands / feet / shoulders:** Goggles, Searing Grip, Warboots, Stranger shoulders holding — credible.
- **Chest:** Lone Onslaught Breastplate small upgrade over Crystalforge; Lightbringer chest negative — sensible for ret.
- **Owned gear:** Flat 0 where shown — no fake upgrade/loss.

---

## Gate

**Would a ret who knows the game trust this output unattended?**  
**No.**

**Would they trust raid *direction* after a human filter?**  
**Mostly yes** for belts, cloaks, rings, Torch/Cata as chase *types* — same as A.

**Loop 1 pass?**  
**No. Do not continue to Loop 2 on this artifact.**

Must be true before gate pass:

1. P3 weapon comparison includes Illidan-tier Tempest of Chaos **and** Twinblade of the Phoenix (or an explicit, visible disclosure that those sticks were not compared — still weaker than including them).
2. **Act on tonight** (or equivalent shortlist) does not mix arena/PvP into raid loot framing — or clearly separates them.
3. Gorehowl (and similar mid-tier weapon) loss magnitudes look believable, or those rows are clearly marked untrustworthy.
4. Prefer: finger results cover both equipped rings or say which one is replaced.
5. Mid-list ±3–8 DPS stays soft given ~119 DPS noise.

Until then: product gate stays **do-not-trust**. A’s softer `trust-with-caveats` was fair for “direction after human filter”; for **this** Loop 1 exit gate, incomplete weapon #1 + arena-in-shortlist + Gorehowl magnitude are enough to fail.

---

## What improved vs prior Loop 1 SME (A)

| Topic | A said | This report (B) | Improved? |
|-------|--------|-----------------|-----------|
| Libram / no bow | Pass | Pass | Already fixed; no further change |
| Owned flat 0 | Pass | Pass | Already fixed; no further change |
| Kael temps as loot | Pass (implicit) | Pass | Already fixed; no further change |
| Twinblade / Illidan stick missing | Blocking | Still missing | **No** |
| Gorehowl −104 | Blocking | Still −103.9 | **No** |
| Arena Bonegrinder in Act on tonight | Non-blocking for A; blocking for this gate | Still #12 chip | **No** |
| Finger only slot a | Non-blocking | Same | **No** |

**Usefulness of A’s writeup for engineers:** High for game facts and for what looks right. Correct on Torch/Cata/belts/rings/librams. Under-weights arena-in-shortlist for a **ship gate** (flagged non-blocking). Correct that Twinblade naming needs care — real names are Twinblade of the Phoenix and Tempest of Chaos. B disagrees with A only on **verdict severity for Loop 1 exit**: same evidence, stricter gate → fail.

---

## Notes for engineering

- Report weapons omit Tempest of Chaos (30910) and Twinblade of the Phoenix (29993); Bonegrinder still in Act on tonight; Gorehowl −104 unchanged vs A.
- Same `generatedAt` / deltas as A’s review — re-rank after pool/report fixes before claiming Loop 1 closed.
