# Option B — Quant-first pool membership (envelope + sockets/effects + sim scout)

**Worker:** Design Worker B  
**Bias:** Quant-first. Improved quantitative filter with **minimal** dependence on scraped guides. Tiny pinned allowlists only as safety nets for EP-blind effect items — not as the main engine.  
**Status:** Design only. Do not implement / do not regenerate `ret.json` from this doc.

---

## 1. Thesis

The current membership engine — **one sparse P2 reference EP vector, dotted with bare item stats, top-12/slot, then the same stored EP reused at rank-time** — is garbage in absolute terms, not “a bit wrong at hit cap.”

It systematically:

- **Excludes** real chase pieces (leather/mail BiS, proc trinkets, zero-stat librams, mid-phase 2H sticks crowded out by late white-DPS).
- **Includes** high-hit rare junk and PvP plate that look like winners only because hit/expertise weigh ~2.15 / 2.14 against uncapped item tooltips.
- Forces humans to **FORCE-inject** the pieces wowsims itself puts on the ret P2 gear set (Belt of One-Hundred Deaths, DST, Libram of Avengement, leather shoulders/hands/legs, etc.).

**Same poison in generate and prefilter ⇒ both stages are doomed.** Fixing `TOP_N`, curation theater, or “clip hit at cap on the same weights” does not fix the membership function.

**Option B’s replacement:** keep sims as the ΔDPS authority, but rebuild *who gets simmed* as a three-layer quantitative pipeline:

1. **Eligibility + effective item model** (cross-armor, sockets filled, white damage, effect/proc estimate from `db.json`).
2. **Multi-regime EP envelope** (several CapState / gear-point weight vectors — not one reference ray) as a **nominator**.
3. **Build-time sim scout** on pinned reference characters as the **membership authority** for the committed pool; rank-time uses a **player-aware** envelope (never the stored generate EP).

External BiS lists / Wowhead guides are **QA gates and regression oracles**, not pool membership. Tiny allowlists cover only effect-only items the linear model cannot see even after proc modeling.

---

## 2. Why today’s EP membership fails in absolute terms

Evidence is from committed scripts + pinned `vendor/wowsims/db.json` + `data/presets/ret/p2.ep-weights.json` (re-runnable). This is not “feels wrong.”

### 2.1 The weight vector is a single-point local slope, then abused globally

`data/presets/ret/p2.ep-weights.json` (wowsims P2 ret preset):

| Stat index | Meaning | Weight |
|-----------:|---------|-------:|
| 0 | Strength | 1.00 |
| 1 | Agility | 0.75 |
| 5 | Spell damage | 0.17 |
| 17 | Attack power | 0.41 |
| 20 | Melee hit | **2.15** |
| 21 | Melee crit | 0.77 |
| 22 | Melee haste | 1.17 |
| 23 | Armor pen | 0.10 |
| 24 | Expertise | **2.14** |

Raidbots’ own guidance ([Beware of Stat Weights](https://support.raidbots.com/article/66-beware-of-stat-weights)): stat weights are a coarse linearization at **one** gear point; they flip under multiplicative interactions; direct gear sims are the decision tool. Pawn-style scoring inherits every trap: caps, procs, set bonuses, weapons, gem layouts.

We go further wrong than Pawn usually does:

- Weights are **reference**, not player.
- Applied to **bare** item stats (no gems).
- Used as **hard membership**, not a soft hint.
- **Stored** on pool rows and reused at rank-time (`prefilterPool` sorts by `ep`).

PLAN §8.3.3 already named the local-linear failure and proposed player-aware clipping. That is necessary but **not sufficient** (see §4). Owner claim stands: the membership function itself is wrong.

### 2.2 Concrete inversions (same weights, same db)

**Weapons (historical poison; white-damage fudge only partially fixes):**  
Earlier audit (`.scratch/handoffs/pool-composition-audit.md`) caught generate ranking hit-heavy rares (~125–140 EP) above Twinblade (~74) because **white damage was absent**. Current `generate_pool.py` adds `weapon_damage_ep` (`WEAPON_DPS_EP = 12`). That flips the scale so hard that white DPS dominates (~1500–1900 EP) and **late-phase sticks + Glad weapons eat the top-12**, while Gorehowl sits ~rank 25 and still needs FORCE. So we traded “hit rares beat BiS” for “ilvl/white ladder crowds out phase-relevant chase sticks.” Still not a membership function.

**Leather BiS invisible to generate:** plate-only body filter. Belt of One-Hundred Deaths (30106) never enters without FORCE. Scored on the same EP it is ~105.6 (mostly 25 expertise × 2.14) — competitive if leather were eligible, but generate cannot see it.

**Wowsims’ own P2 ret gear set is mostly unreachable by generate:**

| Item | Armor | In generate path? |
|------|-------|-------------------|
| Belt of One-Hundred Deaths | leather | No (FORCE) |
| Shoulderpads of the Stranger | leather | No |
| Gloves of the Searing Grip | leather | No |
| Shattrath Leggings | leather | No |
| Cobra-Lash Boots | mail | No |
| Dragonspine Trophy | — | Bare EP ~16.4 (rank ~34 among trinkets); proc invisible |
| Libram of Avengement | — | Bare EP **0** (effect only) |

A membership engine that cannot recover the **pinned wowsims preset’s own items** without a hand list is not “slightly mistuned.”

**Proc / effect blindness:** `db.json` carries `itemEffects` (e.g. DST: 325 haste buff, 10s, 1 ppm, 20s ICD). Linear EP ignores this. Steely Naaru Sliver / static-stat trinkets crowd the top-12; DST requires FORCE or luck.

**Socket blindness:** 30106 has two sockets + agi socket bonus. Generate scores bare stats only. Gem-fill softcaps were fixed for **candidate sims** (`gemFillWeights` zeros hit/expertise) but **pool membership never sees socket value**. Two Bold Crimson Spinels change real ΔDPS (~+32 vs Endless Pit on slamaltman after Loop 4); membership still treats the belt as “expertise leather.”

**Set blindness:** Onslaught / Lightbringer / Crystalforge / Destroyer pieces scored as raw stats. 2pc/4pc value is zero in the score. Tier can lose to random high-hit plate.

**Librams:** ~32 rare+ librams; many have no useful combat stats on the tooltip. Avengement EP=0 ⇒ FORCE or disappear.

**Double poison:** `ret.json` stores generate EP; `prefilterPool` re-sorts by that field. Any systematic bias in generate is **re-applied** when shrinking ~180 → ~80. Player-aware clipping is unimplemented (`data/items/index.json` has sockets/enchantable/phase, not combat stats or weapon damage).

### 2.3 FORCE is the symptom, not a workflow

`curate_ret_pool.py` FORCE list is how leather BiS, real 2H sticks, librams, and cloaks enter. That is list-first membership smuggled under a quant label. Option B’s goal is to shrink FORCE to a **tiny effect safety net**, not grow it into a BiS sheet.

---

## 3. Algorithm (build-time → rank-time)

### Stage 0 — Spec eligibility (structural, not lists)

For **ret**, an item is eligible if:

| Slot family | Rule |
|-------------|------|
| Body armor (head/shoulder/chest/wrist/hands/waist/legs/feet) | `armorType ∈ {leather, mail, plate}` (paladin can wear all three). **Not plate-only.** |
| Back / neck / finger / trinket | Quality ≥ rare; no armor gate. |
| Weapon | Two-hand only (product path). Exclude staves. **Polearms:** include by default (ret *can* equip them; today’s exclude is a product filter — flip to include unless product re-affirms exclude). |
| Ranged | Librams only (`rangedWeaponType == Libram`). |
| Kael temps | Drop `KAEL_TEMP_LEGENDARY_IDS` (encounter-only). Twinblade (29993) stays eligible. |
| Quality / expansion floors | Soft floors per slot (e.g. weapons epic+ **or** white-DPS ≥ threshold by `maxPhase` band; drop classic-expansion scraps for body slots unless they survive Stage 3). These are quantitative gates, not name lists. |

Cross-armor is how Belt of One-Hundred Deaths / Searing Grip / Stranger / Shattrath / Cobra-Lash enter **without FORCE**.

### Stage 1 — Effective item vector (fix the bare-tooltip lie)

For each eligible item, build an **effective stats** vector before any ranking:

1. **Bare stats** from `scalingOptions['0'].stats` (same as today).
2. **Socket fill** using the same greedy colour-match vs free layout as `fillCandidateGems`, under **regime-specific** gem weights (see Stage 2). Add filled gem stats + socket bonus if colours match.
3. **White damage** for 2H: `(avg damage / speed) → AP-equivalent or DPS units` with a calibrated coefficient (today’s `WEAPON_DPS_EP=12` is a knob to re-fit against scout sims — not sacred).
4. **Effect / proc estimate** from `itemEffects` when present:
   - Average buff stats × estimated uptime from `ppm`, `icdMs`, `effectDurationMs` (simple renewal model is enough for nomination).
   - On-use: duration/CD duty cycle.
   - If effect cannot be mapped to stats, mark `effectOpaque: true` → Stage 1b safety net or must win via Stage 3 if nominated another way.
5. **Set-bonus provisional credit (optional, capped):** if `setId` is a DPS ret set (Battlegear / Onslaught / Lightbringer DPS branches), add a **small fractional** credit for 2pc/4pc *only during nomination*, or better: Stage 3 scout with a reference set that already wears N−1 pieces so the real bonus appears in ΔDPS. Prefer the scout path; keep fractional credit tiny to avoid inventing fake BiS.

Output per item: `effectiveStats[regime]`, `whiteDps`, `effectOpaque`, metadata (phase, source best-effort, setId, sockets).

### Stage 2 — Multi-regime EP envelope (nominator, not authority)

**Do not** use one P2 reference vector.

Derive **K ≥ 3** weight vectors (regimes), preferably by running wowsims/wowsimcli **StatWeights** (or equivalent scale-factor sims) on pinned reference raid-sim requests:

| Regime | Intent |
|--------|--------|
| R_under_hit | Reference set deliberately under melee hit cap (and/or Human vs non-Human race split). |
| R_at_hit | Near softcap; hit weight clipped / near zero. |
| R_under_exp | Under expertise softcap (non-Human / sword skill context). |
| R_phase_band | Optional: P2-ish vs P3-ish reference gear so late white-DPS does not monopolize early bands. |

Analytic softcap clipping of the current preset (PLAN §8.3.3) may bootstrap regimes before StatWeights automation exists — but **clipping one poison vector is only a bootstrap**, not the destination (§4).

For each item and regime `r`:

```
score[r] = dot(effectiveStats[r], weights[r]) + whiteTerm[r] + effectTerm[r]
```

**Envelope membership nomination:**

- Per slot, take the **union** of top `N_nom` by `score[r]` across regimes (e.g. `N_nom = 20–30`), **or** top by `max_r score[r]` with a diversity floor so one regime cannot monopolize.
- Phase-band the weapon ladder: within each `phase ≤ P` slice, nominate separately so P5 white-DPS does not erase P1–P2 sticks from the wide pool file (rank-time still filters `maxPhase`).

Target after Stage 2: ~250–400 nominees across slots (wide, cheap).

### Stage 1b — Tiny effect safety net (not the engine)

Pinned allowlists, intentionally small:

- **Librams:** all rare+ librams with `phase ≤ 5` (~32) are cheap enough to **always nominate** (or scout all of them). Prefer “nominate all librams” over hand-picking Avengement/Zeal names.
- **Opaque-effect trinkets/weapons:** items with `itemEffects` that Stage 1 could not map, filtered by quality/phase/expansion — auto-nominate top-M by ilvl or by “has melee proc” heuristic from effect stats (haste/str/AP/crit on buff). Names like Dragonspine Trophy get in because they have a mapped haste proc, not because someone typed the name.

No Wowhead BiS paste. No growing FORCE of leather names.

### Stage 3 — Build-time sim scout (membership authority)

Offline, pinned, deterministic:

1. Pick **1–2 reference characters** (committed fixtures: e.g. slamaltman-class mid set + an undergeared undercapped set). Same skeleton/buffs/consumes as product presets.
2. For each slot, for each Stage-2 nominee: single-slot swap, gem-fill as in product, **low iteration** scout (e.g. 500–1500 iterations, fixed seeds).
3. Keep top `N_keep ≈ 8–12` per slot by scout ΔDPS (plus always-keep: currently-equipped IDs are rank-time only, not pool).
4. Attach `source` (db → AtlasLoot/HAND as today). Refuse null sources for ship.
5. Write `data/pools/ret.json` **without** treating generate EP as gospel. Store optional diagnostic fields: `envelopeMax`, `scoutDelta`, `regimesHit[]` — rank-time must **not** prefilter by stale generate EP.

This is Droptimizer-shaped (sim each drop as a single swap) but **build-time and pinned**, not live Wowhead, and applied to envelope nominees rather than an entire raid table.

### Stage 4 — Rank-time (player-aware; poison EP banned)

At `rankUpgrades`:

1. `filterPoolByPhase(maxPhase)` (unchanged).
2. Kael temp strip (unchanged).
3. **Prefilter:** re-score the curated pool with **player CapState**:
   - Build player effective context (hit gap, expertise gap) from logged gear.
   - Score each pool entry with **player-aware** effective stats (socket fill under clipped weights) + white damage + effect estimate.
   - Keep top ~80 by that score (or top-K per slot, e.g. 6–8 × 14, if global top-80 lets one slot dominate).
4. **Never** sort by the EP number baked at generate time.
5. `fullPool` still skips prefilter.
6. Full-iteration sims remain the ranking authority.

`epVersion` / content hash must include regime weight set + scout policy version (PLAN already hashes `epVersion` for prefilter sensitivity).

### Stage 5 — QA oracle (guides as gate, not membership)

After regenerate:

- Diff pool vs wowsims curated gear sets (`vendor/wowsims/ret_p*.gear.json`).
- Human/SME check vs Wowhead per-tier guide (PLAN Phase 1 gate) — **report misses**, do not auto-ingest guide IDs into the pool.
- Optional: tiny `EXPECT_PRESENT` regression list of IDs that must appear (engineering test fixture), distinct from FORCE membership. If scout+eligibility miss Belt of One-Hundred Deaths, that is a **pipeline bug**, not a cue to re-grow FORCE.

---

## 4. Why this is not “clip hit at cap and pray”

Clipping hit/expertise on the current P2 vector (PLAN §8.3.3) fixes **one** discontinuity and is worth doing at rank-time. Alone it fails as a pool redesign because:

| Failure mode | Clip-only | Option B |
|--------------|-----------|----------|
| Plate-only excludes leather/mail BiS | Untouched | Stage 0 eligibility |
| Bare stats ignore sockets | Untouched | Stage 1 gem fill |
| Proc trinkets / librams ~0 EP | Untouched | Effects + libram nominate-all + scout |
| Set bonuses | Untouched | Scout with N−1 set context |
| Weapon white damage / phase crowding | Untouched or worsens | White term + phase-banded nomination + scout |
| Single local linearization | Still one vector (clipped) | Multi-regime envelope |
| Same score for generate + prefilter | Still coupled if you only clip stored EP | Generate uses envelope+scout; rank uses player CapState |
| Membership = top-N linear | Still | Scout ΔDPS is membership authority |

Clipping is a **regime operator inside Stage 2/4**, not the product.

Community consensus (Raidbots, Pawn maintainers, Peak-of-Serenity-style writeups): use weights for quick eyeballing; use **direct sims** for decisions. Option B uses weights only to **nominate** who is worth a cheap sim, then uses sims to decide who enters the pool and (at rank-time) who gets the expensive sim.

---

## 5. Data sources

| Source | Role | Offline? |
|--------|------|----------|
| `vendor/wowsims/db.json` | Items, stats, sockets, socketBonus, weapon damage, `itemEffects`, setId/setName, sources, phase/quality | Yes (pinned) |
| `data/presets/ret/p2.ep-weights.json` (+ future regime files) | Bootstrap weights; eventually replaced/augmented by StatWeights outputs | Yes |
| wowsimcli StatWeights / scale factors | Derive regime weight vectors | Yes, build-time |
| wowsimcli raid sim (scout) | Stage 3 membership | Yes, build-time |
| `data/gems/palette.json` / item index | Gem fill + (must grow) combat stats & weapon fields on `data/items/index.json` for rank-time player-aware score | Yes |
| AtlasLoot / HAND map | `source` fill only (unchanged PLAN §8.3.2) | Yes / human |
| wowsims `ret_p*.gear.json` | **QA oracle**, not membership | Yes |
| Wowhead guides | **Human Phase-1 gate / SME QA**, not scrape-into-pool | Human |
| Tiny allowlists | Libram nominate-all; opaque-effect heuristic — safety nets | Committed code |

Deliberately **not** primary: Wowhead scrape, That’s My BiS, pasted BiS sheets, growing FORCE name lists.

---

## 6. Leather / libram / 2H / Kael without list-first

| Concern | Mechanism |
|---------|-----------|
| **Leather / mail BiS** | Stage 0 allows leather+mail+plate. Socket-aware scoring + scout on a reference that benefits from agi/exp leather (Belt of One-Hundred Deaths pattern). No FORCE name required for Vashj belt / Searing Grip / Stranger / Shattrath. |
| **Librams** | Ranged gate = libram only (not bows). Nominate **all** rare+ librams (~32) into scout; keep top ~6–8 by ΔDPS. Effect-only librams win on scout, not on EP. |
| **2H path** | Hand-type 2H filter; white-damage term; phase-banded nomination so P5 sticks do not erase Twinblade/Gorehowl/Lionheart from the wide file; scout picks real winners per band. Polearms included unless product re-affirms exclude. |
| **Kael temps** | Keep explicit ID strip (encounter-only legendaries). Twinblade stays. Quantitative scoring does not need to “discover” temps; they are a known encounter rule. |

---

## 7. How it fails (adversarial)

1. **Scout reference mismatch:** If both reference characters are hit-capped Humans, undercapped hit pieces underrank in the committed pool; player-aware rank prefilter mitigates but cannot **add** IDs that Stage 3 dropped. Mitigation: at least one undercapped / non-Human reference.
2. **Proc model error:** Bad uptime math mis-orders trinkets at Stage 2; Stage 3 should correct if nominees include the proc item. If Stage 2 drops DST before scout, safety net / effect heuristic must catch `itemEffects` melee buffs.
3. **Set-bonus myopia:** Single-slot scout on a reference with 0 set pieces undervalues the piece that completes 2pc/4pc for *this* player. Mitigation: reference wears common tier; rank-time still sims real Δ (set note already planned). Pool may under-include awkward off-pieces.
4. **Cost blow-ups:** Too-wide Stage 2 + high scout iterations → hour-long pool builds. Cap nominees; cache scout results keyed by wowsims pin + policy hash.
5. **Determinism / CI:** Scout noise at 500 iter can flap membership. Use fixed seeds, higher iter for borderline ties, or hysteresis (keep previous member if Δ within SE).
6. **Spec generalization:** Ret-first eligibility tables must be data-driven per spec later (feral = leather-primary, etc.).
7. **Still not Top Gear:** Single-slot membership cannot invent multi-slot synergies; product scope is single-swap ranking (acceptable).
8. **QA oracle temptation:** Turning wowsims gear-set diffs into auto-FORCE recreates Option A under another name. Diffs are fail-the-build or ticket, not silent inject — except for the tiny effect net.

---

## 8. Cost

| Phase | Order of magnitude | Notes |
|-------|--------------------|-------|
| Stage 0–1 scan of db | Seconds | ~8k items; Python/TS fine |
| Stage 2 StatWeights × K regimes | Tens of minutes once per pin | Cache artifacts under `data/presets/ret/regimes/` |
| Stage 3 scout | Dominates: ~14 slots × ~25 nominees × 1–2 refs × ~1–2s ≈ **10–30+ minutes** | Parallelize; CI weekly / on wowsims bump, not every commit |
| Rank-time prefilter | Milliseconds | Pure score |
| Rank-time sims | Unchanged ~80 × full iter | Same product budget |

Default product path stays “tens of seconds to a couple of minutes.” Pool rebuild is a **build/curation job**, not a request-path job.

---

## 9. Migration from current `ret.json`

1. **Expand item index** — combat stats, weapon damage min/max/speed, `itemEffects` summary, setId (blocked today for player-aware prefilter).
2. **Implement Stage 0 eligibility** (leather+mail+plate); keep Kael strip; decide polearms.
3. **Implement Stage 1 effective stats** (reuse `fillCandidateGems` policy).
4. **Bootstrap regimes** — start with clipped variants of current P2 weights (under/at hit, under/at exp); schedule StatWeights replacement.
5. **Scout prototype** — one fixture, one slot (waist or weapon) end-to-end; compare recall vs wowsims P2 gear set + current FORCE list.
6. **Generate new pool** → diff vs `ret.json`; expect FORCE shrinkage; investigate every wowsims-P2 miss as a bug.
7. **Rank-time:** switch `prefilterPool` to player-aware envelope; stop sorting by stored generate `ep`.
8. **Shrink FORCE** to empty or effect-opaque-only; keep HAND for sources.
9. **Leave QA guides out of membership**; wire EXPECT_PRESENT tests for a handful of canaries (30106, 28830, 27484, 29993) as regression alarms.

No big-bang land: ship index + player-aware prefilter even before scout replaces generate, but **do not** claim the redesign is done until generate membership is no longer single-point bare EP.

---

## 10. Open questions

1. **Polearms:** Include in 2H path (game-correct) or keep product exclude?
2. **K regimes / which references:** Exact CapState grid and races (Human expertise) for Anniversary.
3. **WEAPON_DPS coefficient:** Fit against scout so white term and stat term share units; avoid another pure white-ladder monopoly.
4. **Set credit:** Fractional EP vs scout-only — which is enough for tier off-pieces?
5. **Scout iteration / SE:** Membership flap tolerance; hysteresis policy.
6. **Per-slot vs global top-80** at rank-time once envelope is honest.
7. **PvP gear:** Quantitative score will still admit Glad plate; is a source-kind soft penalty wanted, or leave to UI raid filter?
8. **StatWeights automation:** Does pinned wowsimcli expose scale factors cleanly, or do we commit regime JSONs hand-refreshed per pin?
9. **Mail boots / leather chest density:** Cross-armor multiplies nominees — confirm Stage 2 caps stay affordable.
10. **Gem naming:** Treat **Sovereign Nightseye** as one gem (purple) everywhere in docs/code comments — never split the name.

---

## 11. Success bar for a ≤1 week prototype (still no full ship)

1. Waist + weapon + trinket only: Stage 0–3 on those slots.
2. Measure **recall** of wowsims `ret_p2.gear.json` IDs in those slots (Belt of One-Hundred Deaths, DST, Lionheart) **without** FORCE.
3. Show rank-time prefilter no longer uses stored generate EP (player-aware or fullPool).
4. Document remaining FORCE IDs; target ≤ effect-opaque safety net.

If recall fails, debug eligibility/sockets/effects/scout — do **not** paste Wowhead lists into the pool (that is Option A’s job to argue).

---

## 12. One-paragraph summary

Option B rejects linear reference EP as pool membership. It widens eligibility to the armor ret can actually wear, scores **socket-filled, white-damage-aware, effect-aware** items under a **multi-regime EP envelope**, then lets a **pinned build-time sim scout** decide who enters `ret.json`. Rank-time re-scores with **player CapState** and never reuses generate’s poison EP. Guides and wowsims gear sets are QA oracles; FORCE shrinks to a tiny effect net. That is the quant-first path that confronts absolute EP failure instead of praying after a hit-cap clip.
