# Compiled recommendation — pool formation redesign

**Role:** Manager compile  
**Date:** 2026-07-28  
**Inputs:** `option-a.md`, `option-b.md`, `review-math.md`, `review-sme.md`, external brief  
**Harness note:** Design workers and critics ran on Cursor’s Grok-high ceiling after Sol usage walls. Do not treat that as a silent quality downgrade of the *options*; treat Sol-class re-read as optional if the owner wants a second sharp pass.  
**Non-goals:** Implementation, `ret.json` regen, land/merge.

---

## One-line pick

**Hybrid (A-membership + B-hygiene)** — not pure A, not pure B.

---

## 1. Why we are here (shared diagnosis)

Both designs and both critics agree with the owner:

- Linear **reference** EP as membership is **absolutely** inadequate (wrong feature vector + single gear-point slope + plate gate), not “a bit wrong at caps.”
- Same EP in generate **and** rank prefilter is correlated double poison.
- Player-aware clip (PLAN §8.3.3) alone does not restore white damage, sockets, procs, set bonuses, or cross-armor BiS.
- Sims stay ΔDPS authority; pool only chooses who gets simmed.
- Today’s `FORCE` list is an admission that generate is not producing a chase universe.

---

## 2. Option summaries

### Option A — Lists-first (`option-a.md`)

**Thesis:** Community-validated item ID lists **are** the pool. EP is shadow QA only — never membership, never rank-time gate.

**Pipeline:**

1. Union pinned wowsims ret gear sets (P0–P2 automated) + human-transcribed Wowhead/peer BiS+**Alt** tables (committed JSON, no CI scrape) + optional community sheets.
2. Attach `source`; apply product rules (libram-only ranged, 2H path, Kael-temp ban, **no plate-only** body gate, polearms default include).
3. Ship `data/pools/ret.json`; density by list coverage (block ship if a live phase slot has 0–2).
4. Rank-time: phase filter + Kael strip; **kill EP prefilter**; sim the phase-filtered list (~100–180) or provenance-capped K/slot — never reference EP.

**Policy change:** PLAN’s “BiS tags never filter the pool” is superseded for *membership* because EP+human-curate failed. Lists become primary membership; same manifests still feed bis-tags and QA.

**Cost:** Low CPU; ~2–4 eng days + 4–8h initial transcription; ~30–60 min/patch ongoing. Runtime ≈ today’s `fullPool`.

### Option B — Quant-first (`option-b.md`)

**Thesis:** Do not invent a less-wrong single EP. Membership = structural eligibility + effective item model + multi-regime envelope **nomination** + **build-time sim scout** ΔDPS; guides are QA only.

**Pipeline:**

1. Stage 0: leather+mail+plate eligibility; librams; 2H (+polearms); Kael denylist.
2. Stage 1: socket-filled / white-damage / effect-aware vectors (not bare tooltip).
3. Stage 2: multi-regime EP envelope as **nominator only** (~250–400 nominees).
4. Stage 1b: tiny effect nets (all librams; opaque procs) — not growing FORCE BiS sheets.
5. Stage 3: pinned low-iter sim scout → top ~8–12/slot into `ret.json`.
6. Rank-time: player CapState re-score or fullPool — **never** stored generate EP.

**Cost:** Dominated by offline scout (tens of minutes per pin); rank path stays similar. Engineering heavier (index growth, regimes, scout harness).

---

## 3. Key review points

### Math (`review-math.md`)

| Axis | A | B |
|------|---|---|
| Escapes ref EP membership? | Yes (watch EP-shadow auto-add) | Stage-2 yes; Stage-1 still a different affine proxy |
| Estimand | Editorial support \(1_{i\in L}\) | Noisy multi-shell \(\widehat{\Delta}\) after structural sieve |
| Primary FN | Not listed / stale / thin alts | Killed in Stage-1 or never winning on sampled shells |
| Circularity | High vs “discovery”; QA non-independent if same \(L\) | Soft via golden-tuning / shell recipes embedding Stage-1 bias |
| Cost | Human ops | Offline CPU; low-iter cutoff noise |

**Math falsifiers that matter:** held-out recall failure (A); Stage-1 kill of goldens or shell inadequacy / cutoff instability (B). Cardinality gates ≠ recall. Prefer full curated ~180 at rank-time over another low-iter gate unless wall-clock forces it. Math hint: **lists as Stage-1 hardbands into a sim sieve** if pure A or pure B fails held-out recall.

### SME (`review-sme.md`)

Equip bar both must meet: leather/mail BiS eligible; librams only; 2H path; Kael temps out / Twinblade in; PvP not unlabeled raid flood.

| Question | A | B |
|----------|---|---|
| Famous P2/P3 chase appear? | Yes if transcription + wowsims union complete | Maybe — shells + Stage-1 must promote them |
| Mid-gear alts/crafts? | Strong if Alt roles mandatory | Weak unless shells span poverty |
| Looks like what rets chase? | Directly | Indirectly (sims well ≠ community chase) |

**SME verdict:** A better serves a real Anniversary shortlist **if** Anniversary-dated guides + mandatory Alt/craft/hit rows. B’s equip hygiene + libram/trinket hardbands + white-DPS weapon narrow are right; **B alone** is not chase-credible without golden must-contain IDs (list knowledge by another name).

Must-appear examples (gate): Twinblade, Lionheart path, DST/Bloodlust, Belt of One-Hundred Deaths, Torch/Cataclysm’s Edge/Gorehowl ladder, Bow-stitched, Ranger-General / Devastation rings, Avengement-class librams, craft alts (Red Belt, Bindings of Lightning Reflexes), **no** bows / Kael temps.

---

## 4. Manager recommendation

### Pick: **hybrid** (A primary membership + B Stage-0 / anti-EP hygiene)

**Reject pure B as v1 membership.** Rediscovering chase via multi-shell scout is the right *kind* of quantity, but shell choice + Stage-1 sieve recreate “never admitted” failure under a new name, and proving success requires goldens that are Option A’s content. Offline cost and low-iter flap are real before any game win is shown.

**Reject pure A without B’s rules.** Lists-first without explicit equip/product rules can still inherit silent polearm bans, PvP pollution, or plate-thinking. EP-shadow “high EP not in list → auto enlarge pool” must be **banned** (human ticket only) — math correctly flags that as re-poison.

**Do this:**

1. **Membership engine = committed list union** (wowsims sets P0–P2 ∪ Anniversary Wowhead BiS+Alt manifests ∪ legacy FORCE folded in as provenance). No TOP_N by reference EP.
2. **Hard filters from B Stage-0:** leather+mail+plate; libram-only; Kael denylist; 2H product path; polearm policy made explicit (default include until product says otherwise).
3. **Rank-time:** remove reference-EP `prefilterPool` default; sim phase-filtered list (or provenance K/slot). Do not revive `p2.ep-weights.json` as who-gets-simmed.
4. **CI golden oracle:** short must-contain P2/P3 chase ID set (SME list above) — fail build on miss. Distinct from runtime FORCE theater.
5. **Held-out QA:** keep at least one publisher or frozen SME slice **out** of membership so Phase-1 gate is not a tautology.
6. **Quant R&D (optional, not blocking v1):** prototype B’s Stage-0→2 on waist/weapon/trinket only as a *shadow admission* report (“sim would have added X not in lists”) — feed human tickets, do not auto-merge into pool until recall/noise bars pass.

**Why not “neither”?** Both options correctly kill the current poison. The product needs *some* principled narrowing; A+B-hygiene is the lowest-risk path that matches Anniversary chase social reality and PLAN’s offline/no-scrape preference (transcription ≠ scrape).

**External BiS lists role (success-bar Q3):** **the pool (primary membership)**, with QA/gate dual-use carefully held-out; **not** a seed for EP re-rank; **not** QA-only (gate cannot rescue a pool that never contained BiS).

---

## 5. Prototype first (≤1 week, still no full ship)

Ordered for maximum falsification per hour:

| # | Prototype | Pass / fail signal |
|---|-----------|-------------------|
| 1 | Extract wowsims `ret_preraid`∪`p1`∪`p2` IDs; diff vs current `ret.json` | Documents miss set (expect large); regression fixture for later |
| 2 | Hand manifest for **one phase band** (P2∪P3): wowsims sets ∪ FORCE ∪ transcribed Wowhead BiS+**Alt** for waist, weapon, trinket, ranged only | Density gate; leather belt + Twinblade path + librams present |
| 3 | Assemble scratch pool JSON; one fixture rank **with EP prefilter off** | Shortlist game-credible under SME eyeball (must-appear list) |
| 4 | CI stub: `EXPECT_PRESENT` for ~10–15 golden IDs (30106, 28830, 27484, 29993, …) | Fails if union misses known chase |
| 5 | *(Optional shadow)* B Stage-0+white-DPS / effect hardband on those slots only — report IDs Stage-1 would admit that lists omit | Discovery candidates for human add; do **not** auto-ship |

**Stop before:** regenerating committed `ret.json`, rewriting generate for all slots, multi-shell full-db scout, Wowhead scrape, land to `dev`.

---

## 6. Open decisions for the owner (before implement)

1. Polearms: include when listed / equip-legal, or product-exclude?
2. Default raid pool: arena Glad sticks off unless tagged?
3. Who owns Anniversary guide re-transcription calendar?
4. Above P2: Wowhead-only vs stale wowsims/tbc seeds flagged and spot-checked?
5. When phase-filtered \|L\| > ~200: provenance caps vs always fullPool?

---

## 7. Artifact index

| File | Author |
|------|--------|
| `option-a.md` | Design A (lists-first) |
| `option-b.md` | Design B (quant-first) |
| `review-math.md` | Math critic |
| `review-sme.md` | SME critic |
| `compiled-recommendation.md` | Manager (this file) |

---

## 8. Success bar check (design pass)

1. **Why EP membership fails absolutely** — documented in brief + both options + math shared ground.  
2. **Two seriously different strategies** — A lists vs B sim-scout.  
3. **External BiS role** — pool membership (hybrid), with held-out QA.  
4. **≤1 week prototype** — §5 above.
