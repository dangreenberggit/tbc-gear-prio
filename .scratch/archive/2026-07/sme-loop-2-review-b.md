# SME rank review — Loop 2 gate (second opinion)

**Date:** 2026-07-27  
**Audience:** engineering team  
**Character:** slamaltman @ Dreamscythe-US, ret paladin  
**Role:** independent second opinion / **Loop 2 gate**  
**Prior writeup compared:** `.scratch/handoffs/sme-loop-2-review.md`  
**Verdict:** `trust-with-caveats`  
**Loop 2 gate:** **PASS**

---

## Verdict

**trust-with-caveats**

On the **post–Tempest-removal** report, the printed shortlist and the weapon table both look like Phase 3 ret answers a knowledgeable player would recognize: Torch and Cataclysm’s Edge over Lionheart; Twinblade of the Phoenix on the ladder with a small loss; no caster one-hander; ranged is librams only; Act on tonight is raid/craft only; owned rows stay flat 0; Gorehowl’s absurd loss is marked.

Soft caveats remain (mid-list mush inside noise, harsh Soul Cleaver loss, Gorehowl number still nonsense even though flagged). None of those fail the Loop 2 strict checklist.

**Loop 2 pass? Yes.**

---

## What was reviewed

| Item | Detail |
|------|--------|
| Results | `.scratch/rank-reports/slamaltman-p3-full-pool.html`, `.scratch/rank-reports/slamaltman-p3-full-pool.json` |
| Baseline gear | `.scratch/rank-reports/slamaltman-baseline-gear.json` (WCL Hydross) |
| Prior SME (A) | `.scratch/handoffs/sme-loop-2-review.md` |
| Spec / phase | ret, `maxPhase: 3`, full-pool offline rank, `generatedAt: 2026-07-28T04:02:04.658Z` |
| Baseline set (summary) | Furious Gizmatic Goggles; Pendant of the Perilous; Shoulderpads of the Stranger; Drape of the Dark Reavers; Crystalforge Breastplate; Bladespire Warbands; Gloves of the Searing Grip; Girdle of the Endless Pit; Shattrath Leggings; Warboots of Obliteration; Ring of a Thousand Marks + Shapeshifter’s Signet; Dragonspine Trophy + Bloodlust Brooch; Lionheart Executioner; Libram of Avengement |
| Baseline DPS | ~2042.8 (±119 stdev); 16 above cutoff; cutoff 3.4 DPS / 0.15% |
| Stated assumptions | RaceHuman; talents/APL/buffs/consumes/encounter from pinned preset (not the log); profession-locked gems/items excluded; weapon imbue omitted |

**Independence note:** Fresh game judgment of the named files. A was read only to score improvement and whether A’s blocking claim still applies to *this* artifact.

**Artifact note:** A reviewed `generatedAt: 2026-07-28T03:56:04.653Z` (Tempest of Chaos still present). This B review is on `04:02:04.658Z` — after Tempest removal. Do not mix the two runs.

---

## Gate checklist (strict)

| Gate | Result |
|------|--------|
| Libram / bow equip | **Pass.** Eight ranged rows, all librams; no bow/gun/crossbow. Avengement owned at 0. |
| Owned fake loss | **Pass.** Every owned row that appears is flat 0 (goggles, Dark Reavers, Crystalforge, Warboots, Thousand Marks, Lionheart, Avengement). |
| Kael temps as normal loot | **Pass.** No Netherstrand / Warp Slicer / other Kael encounter-only legendaries. Kael rows that appear are keepable loot: Twinblade of the Phoenix (2H) and Band of the Ranger-General. Band of Devastation is Illidan BT ring, not the Kael temp weapon. |
| Weapon ladder complete | **Pass.** Compared weapons: Torch (+37.9), Cataclysm’s Edge (+24.4), Lionheart (0 owned), Twinblade of the Phoenix (−13.9), World Breaker (−23.1), Soul Cleaver (−38.6), Gorehowl (−103.9 flagged). **No** Tempest of Chaos (30910). **No** caster 1H on the 2H ladder. **No** arena Bonegrinder. Twinblade delta vs Lionheart is believable. |
| Arena not in Act tonight | **Pass.** Sixteen chips: Torch, Cataclysm’s Edge, Vashj/Hyjal/Lightbearer belts, Band of Devastation, Shadowmoon / Cloak of Darkness, Onslaught greaves/chest, Ranger-General, Endless Rage, soft rings, Swiftsteel. No Glad/Bonegrinder weapons. |
| Gorehowl flagged | **Pass.** −103.9 (−5.1%); HTML `sim magnitude` warn; JSON `magnitudeWarning: true`. Number still unbelievable; disclosure satisfies this gate. |

---

## Game problems

### Blocking

None on this artifact.

### Non-blocking (flag; do not sink Loop 2)

1. **Gorehowl −103.9 remains nonsense; flagged.**  
   Direction can be fine. Magnitude is not. Warn pill is enough for this gate.

2. **Soul Cleaver −38.6 vs Lionheart.**  
   Real BT 2H. Loss size still looks harsh; not flagged like Gorehowl. Suspicious, not a shortlist false positive.

3. **Legs order still soft.**  
   Onslaught Greaves (+11.7) over Endless Rage (+7.3); Bow-stitched below cutoff. Character has no other Onslaught. “Upgrade Shattrath legs” fine; strict order arguable.

4. **Ring mid-list mush.**  
   Reciprocity / Stormrage / Deceitful ~3–4 DPS inside ~119 SE. Devastation and Ranger-General stay clear goals. Replace + alt-slot labels correctly show Thousand Marks as the drop and Shapeshifter’s as the stronger keep.

5. **Soft craft wrist.**  
   Swiftsteel (+3.7) near cutoff. Bindings of Lightning Reflexes still absent from compared wrists — soft miss.

---

## Rows that look fine

- **Weapons:** Torch / Cataclysm’s Edge over owned Lionheart — right BT/Hyjal goals. Twinblade slightly under Lionheart — credible P2 physical stick on a P3 set. Ladder is physical 2H only.
- **Act on tonight:** Raid/craft upgrades only; matches real chases for this set.
- **Waist / back / finger direction:** Vashj / Hyjal / Lightbearer belts; Shadowmoon / Darkness cloaks; Devastation + Ranger-General as ring goals with replace labels.
- **Ranged:** Librams only; Avengement best.
- **Trinkets:** DST + Bloodlust hold; Tsunami / Madness / Coil losses — expected.
- **Owned gear:** Flat 0 where shown — no fake upgrade or loss.
- **Kael:** Twinblade and Ranger-General treated as normal persistent loot — correct.

---

## Gate

**Would a ret who knows the game trust this output?**  
**Yes for the shortlist and the weapon section, with soft mid-list noise and “ignore Gorehowl’s number.”**

**Loop 2 pass?**  
**Yes.**

Must stay true (already true here):

1. Weapon comparison stays real ret physical sticks — no caster 1H, Twinblade present when claiming P3 completeness.
2. Gorehowl-style nonsense stays flagged (or magnitudes become believable).
3. Act on tonight stays raid/craft framed (no arena weapons mixed in).
4. Readers treat ±3–8 DPS mid-list as soft given ~119 noise.

---

## What improved vs Loop 2 SME (A)

| Topic | A (on `03:56` report) | This report B (`04:02`) | Improved? |
|-------|----------------------|-------------------------|-----------|
| Tempest of Chaos on 2H ladder | **Blocking** — caster 1H present | **Gone** — 30910 absent | **Yes** |
| Twinblade of the Phoenix | Present; credible −13.9 | Present; −13.93 | Held |
| Libram / no bow | Pass | Pass | Held |
| Owned flat 0 | Pass | Pass | Held |
| Kael temps as loot | Pass (implicit) | Pass (explicit) | Held |
| Arena in Act tonight | Pass | Pass | Held |
| Gorehowl flagged | Pass (flagged) | Pass (flagged) | Held |
| Finger replace labels | Pass | Pass | Held |
| Soft legs / rings / Soul Cleaver / wrist | Non-blocking | Same | Unchanged |

**Usefulness of A’s writeup for engineers:** High. Correct game identity: Tempest of Chaos (30910) is Archimonde’s caster one-hand sword, not a ret 2H. That was the right blocker for the `03:56` artifact. On this `04:02` post-removal run, A’s blocking finding is resolved; remaining caveats match A’s non-blocking list. B disagrees with A only on **whether Loop 2 is closed**: A’s `trust-with-caveats` was correct for the Tempest-still-present file; for the fresh file, same label, but **gate passes**.

---

## Notes for engineering

- Fresh `generatedAt` `2026-07-28T04:02:04.658Z` — confirm any gate claim cites this run, not A’s `03:56` Tempest-present run.
- Weapons: 32332, 30902, 28430, 29993, 30090, 32348, 28773 — no 30910; Gorehowl still `magnitudeWarning`.
- Act tonight has no arena `via`; finger `replacesEquipped` + `alternateSlot` present.
