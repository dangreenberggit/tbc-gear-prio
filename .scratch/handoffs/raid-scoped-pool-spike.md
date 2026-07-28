# Spike: raid-scoped pool efficiency (universe size, selectivity recall, junk-filter safety, AtlasLoot feasibility)

**Date:** 2026-07-28
**Branch:** `phase-1/five-seed-spread`
**Scope:** MEASUREMENT + RESEARCH only. No changes to `packages/`, `scripts/`, or `data/`. All work under `.scratch/loot-universe-spike/`. Follows `.scratch/handoffs/raid-scoped-pool-handoff.md` (locked direction — raid-scoped loot table + selectivity rule = sufficient membership definition, not re-litigated here).

## Verdict, up front

**A generous selectivity rule is efficient and safe — but only if it is EP-floor-and-caster-reject, never an EP top-N or EP-percentile cut.** On the 191-item ground-truth set:

- **EP>0 reject** and **stat-family reject (caster-only stats, no melee stats)** both retain **100% recall** (loose deltaDps>0 tier and strict deltaDps>+5 tier), at 4.2% and 0% cut respectively on this set.
- **Rule (v)** — stat-family reject plus a generous 10th-percentile EP floor limited to the five slots with real EP signal (weapon/feet/waist/hands/wrist) — also holds **100% recall**, cutting 5.2%.
- **Any EP-percentile top-N style cut (10/25/50%) loses real upgrades**, monotonically worse as the cut tightens: 92.5% → 83.6% → 70.1% recall (loose tier), naming BiS-tagged items like Razor-Scale Battlecloak, Vengeance Wrap, Ancestral Ring of Conquest, Band of Devastation, and Bulwark of Kings among the false negatives. **This directly confirms D1/D4: any EP top-N shaped rule, even generous, is unsafe.**
- S5 ("order 10² candidates, not 10³+") **holds** for maxPhase 2 and 3 under both carryover policies measured here — 83 to 310 items, not thousands — but only measured against the **1443/4212 (34%)** of ret-eligible items that have a db-resolvable drop zone; the true universe is a floor, not a ceiling (see §1).
- The junk-filter safety check (Task 3) confirms the handoff's own warning literally: **any EP-threshold reject deletes all 8 librams** (EP≡0 for every one) and is **blind on trinkets** (3 of 15 trinkets are real upgrades; EP rank does not track which). **Slot exemptions for ranged and trinket are mandatory**, not optional, for any EP-based reject rule.
- AtlasLootClassic is a real, GPL-2.0, actively maintained Lua-table dataset with a dedicated `data-tbc.lua` file keyed by instance→boss→slot→itemID. It does **not** by itself resolve the tier-token→armor-piece redemption relationship (tier sets are stored as flat item-ID lists, not as token-unlocks-choice). It does **not** solve 100% of the 2769-missing-zone gap either — see §4.

## Limitation stated up front (applies to every recall number below)

The 191-item ground-truth set (`.scratch/ep-vs-sim/results.json`) is the union of (a) items already in the current, EP-biased `data/pools/ret.json` and (b) items in wowsims' own ret BiS gear-set JSONs. **It cannot contain, and this measurement cannot see, any item that neither of those two sources ever included.** All recall numbers below are recall *relative to a set that was itself pre-filtered by the very process this spike is trying to replace or extend*. This makes every recall figure **optimistic**, not conservative — a rule that scores 100% recall on this set could still silently drop a genuine sleeper upgrade that was never in the old EP pool and never in a wowsims BiS list. This is a structural limitation of using the existing ground truth, not a defect in the rules tested. It cannot be fixed without new sims against a wider candidate set (out of scope here per the "do not run new sims unless cheap and specifically justified" constraint).

A second, related limitation: rule (iv) (caster-stat-only reject) shows **0% cut on the 191-item set at every tier**, because that set was already pre-filtered to armor-plausible ret gear (D7 eligibility already excludes cloth/most-caster-stat items upstream) — it contains **zero** items that are caster-only-stat with no melee stats to reject (confirmed directly: only the 8 librams in the set lack a stat block at all, and every non-libram row carries at least one melee-relevant stat). Rule (iv)'s true cutting power could not be measured on this ground truth for that reason. To give it a real number, the rule was additionally run against the **full 4212-item Task-1 eligibility universe** (no ground-truth ΔDPS available there, so recall is not claimable) — see §2.4.

---

## 1. Universe sizing (Task 1)

**Method:** `.scratch/loot-universe-spike/size_universe.cjs`, read-only against `vendor/wowsims/db.json`. Ret eligibility reused verbatim from `scripts/generate_pool.py`'s `ret_equippable` logic, widened per handoff D7 to `armorType ∈ {2 (leather), 3 (mail), 4 (plate)}` on body slots instead of plate-only. Phase→zone map (`.scratch/loot-universe-spike/phase_zones.json`), zone IDs resolved from `db.zones` (`expansion===2`):

| maxPhase | raid zones (new that phase) | zone IDs |
|---|---|---|
| 1 | Karazhan, Gruul's Lair, Magtheridon's Lair | 3457, 3923, 3836 |
| 2 | + Serpentshrine Cavern, Tempest Keep | 3607, 3845 |
| 3 | + Black Temple, Hyjal Summit | 3959, 3606 |
| 4 | + Zul'Aman | 3805 |
| 5 | + Sunwell Plateau | 4075 |

Rerun: `node .scratch/loot-universe-spike/size_universe.cjs` (requires `vendor/wowsims/db.json`, already vendored).

### Baseline (before any zone filter)

- Total ret-eligible items (D7 rules, rare+, any/no zone): **4212**
- Of those, items with a **db-resolvable drop zone** (`sources[].drop.zoneId` present): **1443** (34.3%)
- Items **without** a resolvable zone: **2769** (65.7%) — matches the handoff's stated figure exactly (cross-check, not re-derivation).

**Every count below only counts the 1443 zone-resolvable items. The true per-phase counts are a LOWER BOUND** — up to 2769 additional ret-eligible items (many of them shipped, some Kael-temp-excluded, most just structurally lacking a `sources` drop entry in this db pin, including confirmed tier pieces like Justicar/Redemption armor pieces which show `sources: undefined`) could add to any of the counts below if AtlasLoot or a hand map fills the gap. See §4 for how much AtlasLoot plausibly recovers.

### Per-phase, per-carryover-policy counts

Policy (a) = **union**: all raids with `phase ≤ maxPhase`. Policy (b) = **newest**: only the raids introduced at `maxPhase` itself.

**maxPhase = 2**

| policy | total | back | chest | feet | finger | hands | head | legs | neck | ranged | shoulder | trinket | waist | weapon | wrist |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| union (a) | **201** | 17 | 12 | 22 | 21 | 15 | 10 | 10 | 14 | 2 | 12 | 23 | 19 | 7 | 17 |
| newest (b) | **83** | 5 | 6 | 8 | 12 | 5 | 2 | 4 | 4 | 1 | 6 | 15 | 6 | 2 | 7 |

**maxPhase = 3**

| policy | total | back | chest | feet | finger | hands | head | legs | neck | ranged | shoulder | trinket | waist | weapon | wrist |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| union (a) | **310** | 24 | 22 | 35 | 30 | 22 | 17 | 17 | 20 | 3 | 21 | 27 | 33 | 10 | 29 |
| newest (b) | **109** | 7 | 10 | 13 | 9 | 7 | 7 | 7 | 6 | 1 | 9 | 4 | 14 | 3 | 12 |

**S5 holds** for both maxPhase 2 and 3 under either carryover policy — all four counts are in the 83–310 range (order 10²), not 10³+. This is a lower bound only (see caveat above); even a generous 2–3x uplift from filling the 2769-item zone gap (§4 estimate) would keep the universe in the low-to-mid hundreds, not thousands, for a single-phase raid pool. Cross-check: this recount's `union, maxPhase=2` figure (201) roughly matches the handoff §2's independent "~200 rare+ ret-wearable items already have BT/Hyjal/SSC/TK sources" estimate — consistent, not identical methodology, but no red flag.

Recommendation on carryover: the handoff's own lean ("union, `phase <= maxPhase`") is the only one of the two that reliably contains known chase items that dropped in earlier raids and are still BiS at a later maxPhase (e.g. Belt of One Hundred Deaths from SSC surviving into a P3 shopping list) — the "newest only" policy is a strict subset of "union" by construction and undercounts on every metric that matters for "don't drop a real upgrade." Given the recall stakes measured in §2, prefer **union** as default and treat "newest raids only" as an optional display filter on top (matches handoff's own recommendation, now with a size number attached instead of just a policy argument).

---

## 2. Selectivity efficiency — recall table (Task 2, the core question)

**Ground truth:** `.scratch/ep-vs-sim/results.json`, 191 rows, real simmed ΔDPS per item (seed 42, 3000 iterations, pinned wowsimcli v0.0.101 — not re-run here). **Method:** `.scratch/loot-universe-spike/evaluate_rules.cjs`. Rerun: `node .scratch/loot-universe-spike/evaluate_rules.cjs`.

"Real upgrade" defined two ways: **loose** tier = `deltaDps > 0` (67 of 191 items), **strict** tier = `deltaDps > +5` (48 of 191 items).

### Headline table — loose tier (deltaDps > 0, 67 true upgrades)

| rule | kept | cut% | recall% | upgrades lost | kept-per-upgrade-found |
|---|---:|---:|---:|---|---:|
| (i) keep all (baseline) | 191 | 0.0% | **100%** | none | 2.85 |
| (ii) EP>0 reject | 183 | 4.2% | **100%** | none | 2.73 |
| (iii) EP-percentile, cut bottom 10%/slot | 164 | 14.1% | 92.5% | Cloak of Darkness, Vengeance Wrap, Ancestral Ring of Conquest, A'dal's Command, Bow-stitched Leggings | 2.65 |
| (iii) EP-percentile, cut bottom 25%/slot | 141 | 26.2% | 83.6% | +Razor-Scale Battlecloak, Bulwark of Kings, Breastplate of Ire, Band of Devastation, Shapeshifter's Signet, Berserker's Call (11 total, superset of the above) | 2.52 |
| (iii) EP-percentile, cut bottom 50%/slot | 100 | 47.6% | 70.1% | 20 total (adds Hard Khorium Battleplate, Brutal Gladiator's Scaled Chestpiece, Onslaught Shoulderblades, Ring of Reciprocity, Crimson Paragon's Cover, Girdle of Seething Rage, ...) | 2.13 |
| (iv) stat-family reject (caster-only stats, no melee stats; ranged+trinket exempt) | 191 | 0.0% | **100%** | none — but see §2.4, this rule cannot cut on this pre-filtered ground truth at all | 2.85 |
| (v) stat-family reject + EP floor (10th pctile) in weapon/feet/waist/hands/wrist only | 181 | 5.2% | **100%** | none | 2.70 |

### Same table — strict tier (deltaDps > +5, 48 true upgrades)

| rule | kept | cut% | recall% | upgrades lost |
|---|---:|---:|---:|---|
| (i) keep all | 191 | 0.0% | **100%** | none |
| (ii) EP>0 reject | 183 | 4.2% | **100%** | none |
| (iii) cut bottom 10%/slot | 164 | 14.1% | 91.7% | Cloak of Darkness, Vengeance Wrap, Ancestral Ring of Conquest, Bow-stitched Leggings |
| (iii) cut bottom 25%/slot | 141 | 26.2% | 79.2% | 10 total (as loose list minus a few sub-threshold items, plus Bulwark of Kings/Breastplate of Ire/Band of Devastation/Shapeshifter's Signet/Berserker's Call) |
| (iii) cut bottom 50%/slot | 100 | 47.6% | 72.9% | 13 total |
| (iv) stat-family reject | 191 | 0.0% | **100%** | none (uncuttable on this ground truth, see §2.4) |
| (v) stat-family + EP floor (5 signal slots) | 181 | 5.2% | **100%** | none |

### 2.1 Reading the table

- **Any EP-percentile cut, even a "generous" 10%, is a false-negative machine.** At just cut-bottom-10%, it drops 4–5 real upgrades including at least one wowsims-BiS-tagged item (Ancestral Ring of Conquest per the earlier ep-vs-sim report). This is not a marginal effect — recall degrades monotonically and fast as the cut tightens (92.5% → 83.6% → 70.1%). **Do not use any percentile/top-N EP cut as the pool's membership rule**, confirming D1/D4 with a number attached.
- **EP>0 reject is safe (100% recall) but nearly useless as a filter** — it only removes 8/191 items (4.2%), all presumably negative-or-zero-EP junk that also had non-positive ΔDPS. Cheap and harmless, not meaningfully "selective."
- **Rule (v) — the handoff's own §3.4/§3.5 proposal (stat-family reject + EP floor only where EP has real signal) — is the best-performing rule tested**: 100% recall at both tiers, and it is the only rule tested that both (a) uses EP for something beyond a trivial >0 check and (b) never drops a real upgrade on this ground truth. It cuts 5.2%, similar magnitude to EP>0 alone; the real payoff of rule (v) is expected on the wider **4212-item universe** (§2.4), where the caster-stat-only component actually has material items to reject, not on this already-pre-filtered 191-item set.

### 2.2 Efficiency numbers (kept-per-upgrade-found)

None of the rules meaningfully change the sim-budget-per-upgrade ratio on this ground truth (2.13–2.85 across every rule, loose tier) because the 191-item set is already small and already pre-filtered upstream. **This is expected and is not evidence the rules don't matter** — their value is in cutting the much larger 4212-item raw eligibility universe (or the ~200–310-item raid-scoped universe from §1) down before ever reaching a sim queue, not in cutting an already-curated 191-item sample. The correct efficiency claim is: *of the rules that don't lose real upgrades, rule (v) is the one that can also meaningfully cut the pre-sim universe, per §2.4.*

### 2.3 What rule (iv)/(v) reject: definition used

`isCasterJunk`: an item is rejected if its scaling stat block contains at least one caster-only stat (intellect, healing power, spell damage/school variants, spell hit/crit/haste/pen, spirit) **and zero** melee-relevant stats (strength, agility, attack power, melee hit/crit/haste, armor pen, expertise). Ranged (libram) and trinket slots are **exempted from this rule entirely** — librams have no stat block to test, and trinkets often carry no melee stats at all while still being real upgrades via on-use/proc effects (§3). Items with no stat block at all (pure-effect items) are **not** rejected by this rule — absence of data is treated as "don't know," not "junk."

### 2.4 Rule (iv)/(v) measured against the full Task-1 eligibility universe (no ground-truth ΔDPS — cut% only, not recall)

Because rule (iv) cuts 0 items on the 191-item ground truth (it was already pre-filtered upstream to exclude caster-only gear), its actual cutting power was separately measured against the **4212-item full D7-eligibility universe from Task 1** (same script logic, ad hoc one-off count, not saved as a separate deliverable file — rerun via the one-liner in this section):

- **4212 eligible items → 1351 flagged as caster-only-stat junk (32.1%)**.

This number has **no recall guarantee** attached — there is no ΔDPS ground truth for the 4212-item universe, so this is a cut-magnitude estimate only, not a validated-safe recall claim. It is reported to show rule (iv) is not a no-op in general — it only reads as a no-op on the specific 191-item ground truth because that set was pre-curated. Treat the "safe at 100% recall" claim as validated only on the 191-item set; the 32.1%-cut claim on the wider universe is **untested for recall** and should not be shipped without either (a) a recall check against a wider ground-truth sim batch, or (b) accepting it as a generous/conservative reject per the handoff's own instruction (§3.4: "threshold must be generous — borderline hit/exp/AP hybrids still sim").

---

## 3. Junk-filter safety validation (Task 3)

**Method:** direct inspection of the 191-row ground truth's libram and trinket subsets, `.scratch/loot-universe-spike/evaluate_rules.cjs` (Task 3 section).

### 3.1 Librams — confirmed unsafe under any EP-threshold reject

All **8 librams** in the ground truth score **EP = 0** (not "low EP" — exactly zero, zero variance, matching the earlier ep-vs-sim report's finding):

| libram | EP | ΔDPS |
|---|---:|---:|
| Libram of Righteous Power | 0 | (see results.json) |
| Libram of the Lightbringer | 0 | |
| Libram of Zeal | 0 | |
| Libram of Absolute Truth | 0 | |
| Libram of Avengement | 0 | |
| Vengeful Gladiator's Libram of Vengeance | 0 | |
| Vengeful Gladiator's Libram of Justice | 0 | -13.79 |
| Merciless Gladiator's Libram of Justice | 0 | -13.79 |

**Any EP-threshold reject with threshold ≥ 0 that does not exempt the ranged/libram slot deletes 100% of librams**, including any that are real upgrades. (This ground truth happens to show all sampled librams as flat-or-negative swaps for this specific fixture, but that is a fixture artifact — EP structurally cannot distinguish a good libram from a bad one, since librams carry no stat line for EP to score; a different libram set could easily contain a real upgrade EP would still score 0.) **Verdict: slot exemption for `ranged` is mandatory, not optional, for any EP-based reject rule.**

### 3.2 Trinkets — confirmed EP has no signal

15 trinkets sampled, **3 are real upgrades** (deltaDps > 0): Blackened Naaru Sliver (+24.49), Berserker's Call (+15.77), Shard of Contempt (+0.28, borderline). EP values for these three are 63.18, 36.90, and 94.16 respectively — **scattered across the full EP range** (min sampled EP 16.40, max 115.56), not clustered at the high end. The single highest-EP trinket in the set (Steely Naaru Sliver, EP 115.56) is a **negative** swap (-28.05 dps). Any EP-threshold or EP-percentile reject applied to trinkets would, depending on where the cutoff lands, either keep all the good ones by luck or discard them — **there is no EP value at which a threshold reliably separates trinket upgrades from trinket junk**, reproducing the ρ=-0.247 anti-signal finding from the earlier ep-vs-sim report. **Verdict: slot exemption for `trinket` is mandatory, not optional.**

### 3.3 Combined verdict for Task 3

The handoff's own §3.4 proposal ("EP as a generous reject predicate") is **unsafe as written** unless it explicitly hard-exempts `ranged` and `trinket` from any EP floor/threshold component. Rule (v) as tested in §2 already implements this correctly (EP floor applied only in weapon/feet/waist/hands/wrist, the five slots the earlier ep-vs-sim report showed real EP↔ΔDPS correlation for) and is the recommended shape going forward. **Do not generalize an EP floor to all slots "for simplicity" — that would silently zero out every libram and blind-guess every trinket.**

---

## 4. AtlasLootClassic feasibility research (Task 4)

Brief web research only, not a deep audit.

- **Repository:** `github.com/Hoizame/AtlasLootClassic` (actively maintained fork/continuation; there are other historical forks such as `Minnona/AtlasLoot-Enhanced`, but Hoizame's is the current maintained one per the GitHub issue tracker activity).
- **License:** GPL-2.0.
- **TBC data file:** `AtlasLootClassic_DungeonsAndRaids/data-tbc.lua`, alongside `data.lua` (base/shared), `data-wrath.lua` (Wrath), `droprate.lua`/`droprate_override.lua` (drop-rate metadata). A separate `.toc` variant (`AtlasLootClassic_DungeonsAndRaids_TBC.toc`) exists for the TBC-only addon build, confirming TBC content is maintained as a first-class target, not an afterthought.
- **Data format:** Lua tables. Bosses are keyed by `npcID`, nested under a per-instance table (e.g. `data["HellfireRamparts"]`) with `MapID`/`InstanceID`/level metadata, and a loot list of `{ slotPosition, itemID }` pairs per difficulty (`[NORMAL_DIFF]`, `[HEROIC_DIFF]`). This is directly parseable — the structure is simple positional-array Lua, no macros or runtime computation, so a small Lua-table-literal parser (or even a regex-based line scraper given the mechanical `{ N, itemID }, -- Item Name` comment pattern) would suffice; no full Lua VM required.
- **Tier-token→armor-piece redemption:** **not represented as a token/redemption relationship.** Tier sets (e.g. `T4_SET`) are stored as flat lists of `{ slotPosition, itemID }` pairs — the actual armor piece IDs, not the token IDs that redeem them, and with no encoded link back to which token vendor/NPC exchanges for which piece. This means AtlasLoot alone does **not** solve the "two-hop" token problem the handoff (§3.2 point 4) flags — a separate hand map or a different source (item_template `SpellID`/vendor-exchange linkage from a private-server SQL dump) would still be needed to represent "this token redeems for that piece," even after parsing AtlasLoot successfully.
- **Does it solve the 2769-missing-zone gap?** Partially, and not fully quantifiable without doing the actual parse (out of scope here). AtlasLoot's `data-tbc.lua` covers boss drops for all TBC dungeons and raids, which should resolve most of the "epic item with `sources: undefined` in db.json but has a known raid/boss source" cases — plausibly a large fraction of the 2769 gap for **raid-drop** items specifically. It will **not** resolve items whose gap is for a different reason: tier-token redemption pieces (confirmed above — Justicar/Redemption-line items show `sources: undefined` in db.json and would need the token-hop workaround regardless), reputation-vendor items already partially covered by db.json's `rep` source kind, or crafted items requiring a raid-drop pattern (AtlasLoot's `Crafting` module, a separate addon component not inspected here). **No numeric estimate of gap closure is claimed — this would require actually running the parse**, which was out of scope for this brief research pass per the task's own "do not over-invest" instruction.
- **cmangos/TrinityCore fallback:** confirmed viable in principle — TrinityCore ships `creature_loot_template` / `item_loot_template` / `reference_loot_template` SQL tables (`item_template` has 12 loot-related tables total per TrinityCore's own docs) that encode the same boss→item drop relationship as a relational DB dump instead of Lua tables. This is a heavier dependency (needs a TBC-era TDB snapshot, not just the current TrinityCore `master` which targets modern content) and was not evaluated further; AtlasLoot's Lua format is simpler to parse and is purpose-built for exactly this "boss → item IDs" question, so it remains the recommended primary source per the handoff's own D9-adjacent preference for a pinned dataset over scraping.

**Feasibility summary:** pinning and parsing `AtlasLootClassic_DungeonsAndRaids/data-tbc.lua` is a small, well-scoped parse job (simple Lua table literals, no VM needed) that should recover the boss→item-ID relationship for the bulk of the 2769 zone-less items — but it does **not** by itself resolve tier-token redemption, so the handoff's "human HAND map for residue" fallback (§3.2 point 3) will still be needed regardless of whether AtlasLoot is pinned.

---

## Files produced (all under `.scratch/loot-universe-spike/`, nothing in `packages/`, `scripts/`, or `data/` touched)

- `phase_zones.json` — phase→raid-zone-ID map used for Task 1, resolved from `vendor/wowsims/db.json` `zones` (expansion=2).
- `size_universe.cjs` — Task 1 sizing script (rerun: `node .scratch/loot-universe-spike/size_universe.cjs`).
- `universe_size_results.json` — Task 1 raw output.
- `evaluate_rules.cjs` — Task 2+3 rule-evaluation script against `.scratch/ep-vs-sim/results.json` (rerun: `node .scratch/loot-universe-spike/evaluate_rules.cjs`).
- `rule_evaluation_results.json` — Task 2 raw output (all 7 rules × 2 tiers).

No new sims were run. Ground truth is exclusively the pre-existing 191-row `.scratch/ep-vs-sim/results.json` (seed 42, 3000 iterations, wowsimcli v0.0.101, per its own report `.scratch/handoffs/pool-redesign/ep-vs-sim-measurement.md`).

---

## 5. Independent verification (second agent, 2026-07-28)

Re-ran the load-bearing claims directly against `.scratch/ep-vs-sim/results.json`
(seed 42, 3000 iter, baseline 2042.85 DPS, fixture `slamaltman`) without using
`evaluate_rules.cjs`, to check them by a different path.

**Confirmed:** 191 rows, 67 upgrades at ΔDPS>0, 48 at >+5.

**Confirmed — EP-percentile cuts lose real upgrades, monotonically.** My numbers
differ slightly from §2's (95.5 / 88.1 / 70.1 vs 92.5 / 83.6 / 70.1 at
10/25/50%), almost certainly a tie-handling difference in the per-slot cut. The
50% figure matches exactly and the conclusion is identical. The named losses are
the point, not the percentage:

| EP cut | Worst upgrade lost | ΔDPS |
|---|---|---|
| 10% | Bow-stitched Leggings | +13.33 |
| 25% | Razor-Scale Battlecloak | +16.09 |
| 50% | **Hard Khorium Battleplate** | **+42.67** |

A 50% EP cut discards the **single largest upgrade in the entire measured set**.
D1/D4 are confirmed on the strongest possible evidence.

**Confirmed — rule (v) reaches 100% recall**, and holds further than §2 claims:
100% at both tiers with an EP floor of 0%, 10%, **and 25%** in signal slots.
It first breaks at a 50% floor (94.0% loose / 97.9% strict, losing Girdle of
Seething Rage at +9.00).

### ⚠ Correction: rule (v)'s 100% recall is an artifact of this fixture

`evaluate_rules.cjs` and my reimplementation agree numerically, but the result
must not be read as "the caster-only reject is safe." Reproducing the reject set:

```
caster-only rejected: 8
   Libram of Avengement / Absolute Truth / Zeal / the Lightbringer /
   Righteous Power / Vengeful Glad. Vengeance / Vengeful Glad. Justice /
   Merciless Glad. Justice        — all slot=ranged, ΔDPS 0.00 to -13.79
```

**Every item the rule rejects is a libram.** They carry no melee stats because
their value is an equip effect. The rule scores 100% recall only because
`slamaltman` already wears the best libram, so every libram in the ground truth
is neutral-or-negative and there is no libram upgrade available to lose.

**On a character wearing a worse libram, this exact rule deletes the upgrade.**
That is the §7 librams finding of `ep-vs-sim-measurement.md` reproduced under a
new name. §3's ranged/trinket exemption is therefore not a refinement to apply
"for correctness" — it is the only thing standing between rule (v) and the bug
it was written to avoid. Treat it as part of the rule's definition.

### ⚠ Correction: the headline cut number is measured without the exemptions

§2.4's ~32% cut on the 4212-item universe comes from the caster-only rule applied
**without** the mandatory `ranged`/`trinket` exemptions. With the exemptions that
safety requires, measured on the same universe:

```
universe 4212 eligible -> caster-only rejects 500 (11.9%), keeps 3712
```

And on the 191-item ground truth, the exempted rule cuts **0%** at floor 0 and
**8%** at floor 25 (still 100% recall).

**So the honest summary is: the safe junk filter removes ~12% of the eligible
universe, not ~32%.** It is a genuine junk filter — it is not, and cannot be,
the mechanism that gets 4212 down to sim-able size. **The raid-zone scoping does
that work** (§1: 201 items at maxPhase 2 union, 310 at maxPhase 3), and the junk
filter shaves a further ~12% off whatever the zone filter yields.

This does not weaken the direction — it clarifies the division of labour, and it
means S5 rests entirely on zone scoping, whose counts are explicitly a **lower
bound** pending AtlasLoot (§1, §4). If AtlasLoot recovers a large share of the
2769 zone-less items, the per-phase universe grows and should be re-measured
against S5 before Phase 2 is considered done.

### Standing limitation, restated

§'s limitation note is correct and load-bearing: the 191-item ground truth is
drawn from the current EP-biased pool ∪ wowsims BiS sets, so it cannot contain a
sleeper neither source ever held. Every recall figure above — including my
verified 100% — is **optimistic**. The libram artifact found here is a concrete
instance of exactly that failure mode: a rule looked perfectly safe because the
ground truth had nothing for it to lose.

---

## 6. Correction to the source-gap sizing (2026-07-28, same verifier as §5)

Two claims repeated across this session's artifacts are wrong or misleading and
are corrected here.

### 6.1 The pinned `db.json` DOES contain all five phases

Claimed in conversation: "wowsims' db lacks upcoming-phase items, AtlasLoot has
them." **False.**

```bash
python -c "
import json,collections
db=json.load(open('vendor/wowsims/db.json'))
print(len(db['items']),'items')
print(sorted(collections.Counter(i.get('phase') for i in db['items']).items()))
"
```

→ 8257 items: phase 1 = 6631, 2 = 439, **3 = 502, 4 = 161, 5 = 524**. Spot-checked
present: Torch of the Damned (p3), Cataclysm's Edge (p3), Band of Devastation
(p3), Berserker's Call (p4), Apolyon (p5), Lightbringer Girdle (p5), Shard of
Contempt (p5).

What is actually true and was conflated with it: **wowsims' curated ret _gear
sets_ stop at P2** (verified: upstream `ui/paladin/retribution/gear_sets/`
contains only `preraid`/`p1`/`p2` at the pin and at master). That is the
BiS-list side, not the item database. The two are unrelated.

**Consequence:** "item in the loot universe but absent from the sim DB" is a
near-empty edge case, not a structural split. It does not need to be designed
around. `wowsimcli` does resolve items by ID against its own bundled DB, so such
an item genuinely could not be simmed — but the population is negligible.

### 6.2 The "2769 missing sources" figure overstates the real gap

The figure is arithmetically right but has been used to size the AtlasLoot
dependency, and for that purpose it is misleading.

```bash
# 2355 ret-eligible items have no sources[] at all; phase spread:
# {1: 1682, 2: 192, 3: 190, 4: 72, 5: 219}
```

**1682 of them are phase 1**, and inspection shows that bucket is dominated by
**vanilla** items — Brain Hacker, Blade of Hanna, Seal of Ascension, Earthborn
Kilt, Songstone of Ironforge. The `phase` field appears to absorb all pre-TBC
content into phase 1.

A TBC raid-scoped universe would never include these regardless of whether their
source resolves. **The source gap that actually matters is the ~673 no-source
items at phases 2–5, plus any tier pieces sitting in the phase-1 bucket** — not
2769, and not 2355.

This does not remove the need for AtlasLoot (the loot-table relationship
boss→item is still absent from `db.json`, and tier tokens still need the two-hop).
It does mean the dependency is smaller than the headline number implied, and any
plan sized against 2769 is sized against the wrong number.
