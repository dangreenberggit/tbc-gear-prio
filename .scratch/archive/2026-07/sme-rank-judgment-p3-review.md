# Adversarial SME review — `sme-rank-judgment-p3.md`

**Date:** 2026-07-27  
**Reviewer role:** Second, independent TBC Anniversary ret SME — judgment of the writeup, not a fresh re-rank  
**Primary:** `.scratch/handoffs/sme-rank-judgment-p3.md`  
**Spot-checks:** `slamaltman-p3-full-pool.{html,json}`, `slamaltman-baseline-gear.json`, `pool-composition-audit.md`, `data/pools/ret.json`, PLAN.md §14 Phase 1 gate, Warcraft Tavern / community P3 ret BiS lists  

---

## 1. Verdict on the first writeup

**Keep their product verdict: `trust-with-caveats`.** Strength is right for *this* slamaltman P3 full-pool run: large raid Δ rows are directionally usable after a human filter; the printed shortlist is **not** safe to act on end-to-end.

Do **not** upgrade to full trust. Do **not** downgrade to do-not-trust either — the first SME correctly separated “Torch / cloak / belts / legs / Ranger-General” from “Netherstrand / Glad sticks as raid prio / mid-list ring order.”

**Writeup quality as a substitute for human judgment of this rank: 4 / 5.**

Catches the hard failures (libram/ranged FP, broken weapon pool, preset lag, SE noise) and gives an act/don’t-act list a ret would mostly keep. Loses the fifth point by under-calling several **pool holes that change tonight’s wishlist**, not just mid-list mush.

---

## 2. Where I agree (keep)

| Claim | Why keep |
|-------|----------|
| **`trust-with-caveats`** | Matches Phase 1 “survive human check” vs unattended “act on printed #1–#2.” |
| **Netherstrand = hard false positive** | Spot-check: `ret.json` ranged is **12/12** bows/guns/crossbows/thrown; **zero librams**. Baseline is Libram of Avengement. Instant discard. |
| **Torch ≫ Lionheart is credible for this set** | +37.9 Δ; community P3 lists put Torch as the BT weapon goal over Lionheart Executioner. Direction is right even though the pool is incomplete. |
| **#1 is only authoritative inside a broken weapon pool** | P3 weapons in-pool are Torch + Vengeful Glad ×2 + four garbage rares. Twinblade / Gorehowl / Cata Edge / World Breaker / Lionheart absent — confirmed. |
| **Glad S3 weapons = real small Δ, wrong “raid tonight” framing** | +7.6 each, identical; treat as arena path, not Reliquary/Hyjal loot prio. |
| **Settings fidelity table** | RaceHuman, `ret/p2.raid-sim-skeleton`, maxPhase 3 ahead of lock default 2, fullPool 104+baseline, seed 42 / 3000 iters, cutoff 3.4/0.15%, `metaAdjusted=false`, SE ~120 — all match the JSON. |
| **Shadowmoon Drape / Seething Fury / Lightbearer / Endless Rage / Ranger-General** as human-filtered goals | Directionally correct vs this baseline (Kara cloak, Endless Pit belt, Shattrath legs, Thousand Marks + Shapeshifter). |
| **Ring mid-list is tie mush** | Reciprocity / Stormrage / Deceitful all ~3–4 Δ with ~119 SE — do not wishlist-order them from this run. |
| **Empty head/chest/shoulder/hands/trinket above cutoff is credible** | DST+Brooch already stacked; lone Crystalforge BP correctly punishes naked Onslaught/Lightbringer singles. |
| **Agent-without-CONTEXT score ~2/5** | Fair: PLAN alone does not auto-kill bows or know the weapon ladder. (Different from scoring *this writeup*.) |
| **Phase 1 gate stays open** | Partially supports “human check” for raid direction; fails unattended “act tonight” until ranged + weapon coverage are fixed. |

---

## 3. Where I disagree or think they over/under-claimed

### Under-claimed (important)

1. **Waist shortlist is incomplete, not just soft-ordered.**  
   They treat Seething Fury / Lightbearer as the “standard” goals. Community P3 lists still put **Belt of One-Hundred Deaths** (Vashj) at or near the top of the waist ladder. That item is **missing from `ret.json`**. For a character with Endless Pit, “tonight if TK leftovers” should include 100 Deaths — the writeup never flags the hole.

2. **Legs: Endless Rage looks #1 partly because better legs aren’t in pool.**  
   **Bow-stitched Leggings** (Azgalor) are commonly ranked above Endless Rage; also missing. Saying Endless Rage over Onslaught is a “common ret read” is fine for Onslaught-vs-plate, but overstates Endless Rage as the legs answer for this character.

3. **Cloak: Shadowmoon is good, not alone.**  
   Several Anniversary guides still prefer **Cloak of Darkness** (LW craft) over or beside Shadowmoon. Cloak of Darkness is **missing**. “Yes, want Shadowmoon” stays; “the cloak row settled the slot” does not.

4. **Weapon miss list omitted Soul Cleaver.**  
   Twinblade / Gorehowl / Cata Edge / World Breaker / Lionheart are correctly called out. **Soul Cleaver** (Teron) is a real P3 contender on the same ladder and is also absent. Incomplete absolute ranking is slightly worse than written.

5. **Rings: Band of Devastation missing.**  
   They rightly downgrade Reciprocity vs Stormrage vs Deceitful. They did not note **Band of Devastation** (BT trash) — a staple P3 ring — is not in the pool. Ranger-General as a clear goal still holds; the BT ring picture is thinner than the writeup implies.

6. **Hit / race framing is thin.**  
   They mention Human vs BE for weapon skill/racials and soft ring order. They underplay that Reciprocity’s appearance above Stormrage is exactly the kind of hit-profile artifact you get with a **RaceHuman + P2 EP/APL** pin, and that Dreamscythe BE (skeleton default) vs Human changes party Heroic Presence / hit accounting. Not a verdict flip — but mid-list trust should be even lower.

### Mild over-claims

7. **“Libram upgrades” as an actionable miss for *this* character tonight.**  
   Pool having zero librams is a **product bug** (enables Netherstrand). For slamaltman’s wishlist *tonight*, Avengement is still the usual P3 relic on Anniversary guides — there often is no urgent libram chase. Phrase as “pool cannot validate relic slot / cannot reject bows,” not “you’re missing a libram upgrade.”

8. **“Torch only won among a broken list” can be misread as “Torch isn’t really BiS.”**  
   Their careful wording is mostly fine; still easy for a non-ret reader to under-trust Torch. Absolute ladder incomplete ≠ Torch≫Lionheart doubtful. Keep the caveat; don’t let it dilute the Torch wishlist line.

### Agree-with-nuance

9. **Swiftsteel Bracers** — directionally OK, low urgency. Also note **Bindings of Lightning Reflexes** (often preferred craft wrists) are absent (and profession-gated). Fine as a soft row; not a false positive.

---

## 4. Domain facts they covered vs missed

| Topic | Covered? | Notes |
|-------|----------|--------|
| Librams vs hunter ranged | **Yes (hard)** | Correct kill on Netherstrand; zero librams confirmed. |
| Weapon ladder / white damage / EP lie | **Yes** | Aligned with pool audit; add Soul Cleaver. |
| Set bonuses / single-piece Onslaught | **Yes** | Correctly not treated as silent failure. |
| Preset lag (P2 skeleton @ maxPhase 3) | **Yes** | First-class caveat — keep. |
| Hit caps / hit-ring inflation | **Weak** | Implied via ring mush; should be explicit. |
| Anniversary quirks (race, Heroic Presence, craft BiS) | **Partial** | RaceHuman called out; craft cloak/waist/legs BiS holes underplayed. |
| Arena vs raid framing | **Yes** | Keep. |
| BiS tags empty above P2 | **Yes** | Correct display/tiebreak gap. |

No CONTEXT.md — their glossary-gap list is still the right shape; extend it with **“known P3 BiS items that must appear in pool or be disclosed missing.”**

---

## 5. Is `trust-with-caveats` the right strength?

**Yes.**

- **Not full trust:** unequippable #2, incomplete weapon/waist/legs/cloak/ring coverage, P2 sim pin, SE ≫ cutoff on mid-list.
- **Not do-not-trust:** after discarding ranged and Glad-as-raid, the remaining large-Δ raid rows match what a ret SME would wishlist for *this* undergeared-legs / Kara-cloak / Lionheart baseline.

If the owner needs a binary for “print HTML and chase top 5 without thinking,” that binary is **do-not-trust**. With a human filter, **trust-with-caveats** is the honest label — keep it.

---

## 6. Score of the first writeup (1–5)

**4 / 5** as a substitute for human judgment of *this* slamaltman P3 rank.

- **+** Correct overall verdict and gate implication  
- **+** Correct hard FP and weapon-pool diagnosis (spot-checked)  
- **+** Sensible act / don’t-act split for Torch, cloak, belts, legs, Ranger-General, Netherstrand, Glad  
- **−** Missed high-value pool absences (100 Deaths, Bow-stitched, Cloak of Darkness, Band of Devastation, Soul Cleaver) that a human SME would put on the “before you act tonight” list  
- **−** Slightly soft on hit-cap / race effects for ring trust  

Their separate “agent-as-SME without CONTEXT = 2/5” score is about the *product docs*, not this writeup — leave that alone; it is fair.

---

## 7. Main issues for the human owner (blunt, prioritized)

1. **Ignore every ranged row.** Netherstrand is unequippable garbage in a ret pool with no librams. If that’s still #2 on the HTML, the shortlist is not “act tonight” without a human.

2. **Wishlist Torch, but do not treat this run as Torch-vs-world.** Cata Edge, Soul Cleaver, Twinblade, Gorehowl, World Breaker, Lionheart never competed. You still want Torch from Reliquary; you cannot use this file to pick among P3 sticks.

3. **Waist goals are wider than Seething / Lightbearer.** Belt of One-Hundred Deaths (Vashj) is a real priority waist and is **not in the pool** — chase it from judgment/guides, not from this shortlist.

4. **Legs: Endless Rage is a fine Archimonde chase; Bow-stitched may be better and wasn’t simmed.** Don’t crown Endless Rage as the only legs answer.

5. **Cloak: take Shadowmoon if it drops; also know Cloak of Darkness exists and wasn’t ranked.**

6. **Rings: Ranger-General is the clear one.** Reciprocity / Stormrage / Deceitful order is noise; Band of Devastation wasn’t even a candidate. Check which equipped ring `slotChoice: "a"` replaces.

7. **Glad Bonegrinder/Greatsword are optional PvP, not BT/Hyjal prio** — even though the Δ vs Lionheart is real in-sim.

8. **This is a P2 preset world with maxPhase 3 candidates.** Mid-list (±3–8 DPS) is soft; RaceHuman may not be the real character. Don’t sweat Swiftsteel vs ring mush until assumptions match.

9. **Do not close the Phase 1 “act on tonight” gate** on this artifact. Use it as a filtered milestone; fix ranged curation + weapon (and key BiS) coverage first.

---

## Evidence anchors (spot-check only)

```text
# Shortlist / assumptions
.scratch/rank-reports/slamaltman-p3-full-pool.json
  → aboveCutoff: Torch +37.9, Netherstrand +20.1, … 14 rows; race=RaceHuman; preset=ret/p2.raid-sim-skeleton; baseline ~2042.85; SE ~117–122

# Pool holes (node against data/pools/ret.json)
ranged: 12 hunter weapons, 0 librams
weapon phase≤3: Torch, Vengeful×2, Burning Crusader, Khorium, Hellscream, Arechron — no Twinblade/Cata/Soul Cleaver/Gorehowl/World Breaker/Lionheart
MISSING vs common P3 lists: Belt of One-Hundred Deaths, Bow-stitched Leggings, Cloak of Darkness, Band of Devastation, Soul Cleaver
```

**Bottom line:** Keep the first SME’s verdict and most of their act/don’t-act list; widen the “pool incomplete” warning beyond weapons/librams before treating the shortlist as tonight’s loot bible.
