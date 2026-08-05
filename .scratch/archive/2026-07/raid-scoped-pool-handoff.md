# Handoff: Raid-scoped pool formation (next path)

**Audience:** next agent / engineer continuing pool redesign  
**Repo:** `tbc-gear-prio`  
**Branch context when written:** `phase-1/five-seed-spread` (dirty tree likely; do not land without owner ask)  
**Date:** 2026-07-28  
**Status:** Direction locked by product owner; **not implemented**. This supersedes the A/B hybrid recommendation as the path forward.

---

## 0. One-paragraph brief

Stop using linear EP to decide which items exist in the candidate pool. Build the pool as a **raid shopping list**: every drop (and raid-tied craft / token redemption) from the raids that belong to the selected content phase → keep only class-eligible items → use EP only as a **wide junk filter** (drop pure caster/spirit trash for melee) → **sim the rest**. Wowhead / wowsims BiS lists are **tags only** (display, pin, notes) — never membership. That matches the product question *“what should I want to drop tonight?”* (PLAN §1 / §8.3) better than either “BiS-union = pool” or “multi-shell sim scout = pool.”

---

## 1. Decisions locked (do not re-litigate without owner)

| ID | Decision |
|----|----------|
| D1 | **EP is not membership.** Reference EP top-N/slot (current `generate_pool.py`) is considered inadequate in absolute terms, not merely wrong at hit/expertise caps. |
| D2 | **Same EP must not gate twice.** Today generate EP is stored on rows and reused by `prefilterPool` — that double poison ends. |
| D3 | **BiS lists are tags**, not the pool. Promoting “on Wowhead / wowsims set” is fine for display/pin; it must not define who gets simmed. Sleepers and off-list crafts matter. |
| D4 | **Rejected:** Option A (lists-first membership) as too narrow. |
| D5 | **Rejected:** Option B (structural nominator + multi-shell sim scout as membership) as expensive / opaque; “trust after goldens” framing discarded as process slop. |
| D6 | **New membership thesis:** phase raid loot universe → eligibility → generous junk EP → sim. Product is a **raid gear shopping list**, not “anything in the game.” |
| D7 | **Cross-armor eligibility for ret:** plate + leather + mail on body slots (not plate-only). Librams only for ranged. 2H physical weapons for the weapon ladder. Kael encounter-only legendaries excluded; Twinblade kept. |
| D8 | **Polearm exclusion** (if kept) is a product scope choice, not “ret cannot equip polearms.” |
| D9 | Do **not** scrape Wowhead into CI. Human transcription / pinned loot datasets only. |

---

## 2. Why we are here (evidence, short)

- Product question is raid-scoped (“tonight”), not naked BiS solving (PLAN §1.1, §8.3).
- Current pool: EP top-12/slot + `FORCE` pins. Only **9/36** vendored wowsims ret gear-set item IDs appear in `data/pools/ret.json`. Leather BiS (e.g. Belt of One-Hundred Deaths) enters only via FORCE because generate is plate-only.
- `vendor/wowsims/db.json` `sources` are incomplete (many epics / tier pieces `null`) — cannot derive “everything from BT” from db alone (PLAN §8.3.1–8.3.2).
- Rough count: ~200 rare+ ret-wearable items already *have* BT/Hyjal/SSC/TK sources in db — sim-budget-shaped if loot tables fill gaps. Not 2000.
- Belt Δ undercount vs website was largely **race/expertise baseline** (Human nearer exp cap), not “CLI ungems gear.” Separate from pool membership. See `.scratch/handoffs/belt-delta-investigation.md`.

---

## 3. Target architecture

```text
phase (maxPhase) 
  → zone set for that phase (data)
  → loot universe: drops + token redemptions + raid-tied crafts (+ optional badges — open)
  → eligibility (spec rules)
  → junk filter (generous EP / stat-family reject)
  → committed pool file(s) with required ItemSource
  → rank: phase filter already implicit; NO EP top-80 membership gate
  → sim single-slot swaps (existing rankUpgrades)
  → BiS tags applied for display/pin only
```

### 3.1 Phase → raid zones (example; lock in data)

| maxPhase | Core raids (starter mapping — owner may adjust) |
|---------:|--------------------------------------------------|
| 1 | Karazhan, Gruul, Magtheridon |
| 2 | + SSC, TK |
| 3 | + Black Temple, Hyjal Summit |
| 4 | + Zul'Aman (and badge era as decided) |
| 5 | + Sunwell |

**Carryover policy (open — see §6):** at maxPhase 3, does the shopping list include SSC/TK leftovers and prior-phase crafts, or only BT+Hyjal? Owner leaned “raids in the selected phase”; PLAN R2 wants earlier phases still visible via `phase <= maxPhase` on items. Recommend: **universe = union of loot from all raids with `phase <= maxPhase`**, so P3 night still sees Vashj belt — unless owner wants a strict “tonight’s instance only” filter as a *view* on top.

### 3.2 Loot universe sources (build-time)

Priority (aligns PLAN §8.3.2):

1. Pin **AtlasLootClassic** (or equivalent) as build input — boss → item IDs, vendors, tokens.
2. Fill gaps from `db.json` `sources` where present.
3. Human HAND map for residue; **null source = build fail** for shipped rows.
4. **Token two-hop:** T6 armor appears under BT/Hyjal via `{ kind: 'token', zone: <token drop zone>, token: ... }` so raid filter doesn’t drop tier.

Raid-tied crafts: recipes that require raid drops / patterns from those zones (define rule in data; start with known ret crafts: e.g. belts/boots cloaks commonly chased).

### 3.3 Eligibility (ret v1)

- Body: armorType ∈ {plate, leather, mail}
- Back / neck / finger / trinket: no armor gate
- Weapon: 2H only for ret DPS ladder; exclude staves; polearms = product flag
- Ranged: libram only
- Quality floor: rare+ (or epic-only for late phases — open)
- Strip Kael temp legendary IDs (existing `kael-temp.ts` list)

### 3.4 Junk filter (EP’s only job)

**Purpose:** remove *obviously* wrong-stat gear (spirit/heal/spell-power cloth that somehow passed armor gates, pure caster sticks if any slip in).

**Rules of thumb:**

- Use a **reject** predicate, not top-N.
- Example: if item’s EP under *physical* weights is near 0 **and** dominant stats are spirit/spell/heal → drop.
- Threshold must be **generous** — borderline hit/exp/AP hybrids still sim.
- Do **not** sort and keep top 12.
- Do **not** store junk-filter score as rank-time prefilter key.

Optional later: player-aware junk filter; not required for v1.

### 3.5 Rank-time

- Candidates = pool entries with `phase <= maxPhase` (and optional view filter by zone).
- **Remove or bypass** EP `prefilterPool` top-80 for this pool shape; default to simming the phase-filtered shopping list (`fullPool` behavior or delete the gate).
- Sims remain sole ΔDPS authority.
- BiS tags: import wowsims sets / transcribed guides into `bisTags` only.

### 3.6 What stays from current engine

- `rankUpgrades`, compose, CliSimRunner, meta repair, candidate gem fill (softcap-aware fill already in tree).
- Item/gem indexes from wowsims pin.
- Disclosure / assumptions / reports.

### 3.7 What gets replaced

- `scripts/generate_pool.py` membership engine (EP top-12).
- `FORCE` as primary way famous pieces enter (should become unnecessary for raid drops once loot tables work; tiny safety allowlist OK for known db gaps).
- Rank-time EP membership prefilter.

---

## 4. Implementation phases

### Phase 0 — Spec freeze (short; owner answers §6)

Write `docs/adr/` or extend this handoff with: phase→zone map, carryover rule, badge/PvP default, polearm policy. No code until those are explicit.

### Phase 1 — Loot universe spike (≤ few days)

**Goal:** Prove we can list “all BT+Hyjal item IDs a ret can wear” without EP.

1. Vendor/pin AtlasLootClassic (or chosen loot DB); record pin in lockfile style.
2. Script: `phase_zones → item ids` (+ token vendor expansions).
3. Diff vs current `ret.json` and vs wowsims ret P2 gear set IDs.
4. Report: counts per slot; missing Onslaught/Lightbringer? missing 100 Deaths? (100 Deaths is SSC — tests carryover policy.)

**Exit:** deterministic ID set for maxPhase=3 under chosen zone policy; known gaps listed.

### Phase 2 — Eligibility + junk filter + pool emit

1. Replace generate path: loot universe → eligibility → junk reject → `ret.generated.json`.
2. Curate: sources required; kill FORCE-driven membership (migrate any still-needed pins to loot gaps file).
3. Emit `data/pools/ret.json` with real `ItemSource`.
4. Tests: no bows; no Kael temps; leather waist from SSC present if carryover on; tier tokens attributed to BT.

**Exit:** `pnpm pool:generate` / curate produce a shopping-list-sized pool (~hundreds max, not thousands).

### Phase 3 — Rank wiring

1. Default rank sims full phase-filtered pool (no EP top-80).
2. Optional CLI `--raid Black Temple` view filter using `source` (PLAN already envisioned).
3. Keep `--full-pool` as alias or remove as redundant.
4. Regression: slamaltman offline P3 rank; shortlist still has Torch / Cata / Devastation-class names when those items are in universe.

**Exit:** one real character rank “you would act on tonight” under raid framing (PLAN Phase 1 gate spirit).

### Phase 4 — BiS as tags only

1. Import wowsims gear set IDs → `bisTags: ['BiS'|'Alt'|…]` on overlapping pool rows.
2. Optional human Wowhead tag file — tags only.
3. `pinBis` display sort works when tags exist; degrades when empty (P3+).

**Exit:** tags never change membership; pin is display-only.

### Phase 5 — Hardening

1. Build gate: null sources fail.
2. Contain/exclude tests (not vibe): named chase can appear; bows/Kael cannot.
3. Document ops: bump loot pin when new phase launches.
4. Revisit junk-filter false negatives with SME spot-check.

---

## 5. Success criteria

| # | Criterion |
|---|-----------|
| S1 | Membership explainable as “drops/crafts from these raids,” not “EP liked it.” |
| S2 | Leather/mail chase pieces appear without FORCE theater. |
| S3 | Tier pieces appear when filtering the raid where their **token** drops. |
| S4 | No EP top-N membership; junk filter only removes obvious trash. |
| S5 | Sim count for maxPhase=3 is plausible as a job (order ~10² candidates, not ~10³+). |
| S6 | BiS tags optional; removing them does not shrink the pool. |
| S7 | Rank shortlist remains game-credible under SME (librams, no Kael temps, raid-framed). |

---

## 6. Open questions for owner (block Phase 0)

1. **Carryover:** At maxPhase=3, include SSC/TK/Kara loot in the sim universe, or only BT+Hyjal (with prior phases only via a separate view)?
2. **Badges:** Include Badge of Justice vendors competitive with that phase’s raids by default?
3. **PvP:** Default exclude arena/honor from raid shopping list (tag/separate bucket)?
4. **Polearms:** In or out of ret weapon ladder?
5. **Junk filter:** Spec-specific reject rules — who defines “spirit gear” cutoff?
6. **Multi-spec:** Build loot universe once, eligibility per spec — confirm.

---

## 7. Anti-goals

- Do not implement Option A or B from `.scratch/handoffs/pool-redesign/`.
- Do not restore EP top-12 as “temporary.”
- Do not scrape Wowhead in CI.
- Do not treat That’s My BiS as a data source.
- Do not expand into full BiS set solving or multi-item optimize.
- Do not block on perfect website Δ parity for belts (race/preset differences); track sim-input bugs separately.

---

## 8. Suggested file / touch map (when implementing)

| Area | Likely touch |
|------|----------------|
| New | `scripts/build_loot_universe.py` (or similar), `data/loot/` or vendored AtlasLoot pin |
| New | `data/phase_raids.json` (phase → zones) |
| Replace | `scripts/generate_pool.py` membership logic |
| Slim | `scripts/curate_ret_pool.py` (`FORCE` → gap pins only) |
| Rank | `packages/core/src/pool.ts` `prefilterPool` — stop EP membership |
| Tags | `data/bis-tags/ret.json` (PLAN already named this) |
| Tests | pool composition / no bows / token zone / leather present |
| Docs | ADR: “Raid-scoped pool membership”; update PLAN §8.3 notes when landing |

---

## 9. Prior art / reading (in-repo)

| Path | Why |
|------|-----|
| `PLAN.md` §1.1, §8.3, §8.3.2, §8.3.3 | Product question, source/AtlasLoot, EP prefilter history |
| `.scratch/handoffs/pool-redesign-external-brief.md` | EP failure framing for outside agents |
| `.scratch/handoffs/pool-redesign/compiled-recommendation.md` | A/B attempt — **superseded by this handoff** |
| `.scratch/handoffs/candidates-origin.md` | How current pool works |
| `.scratch/handoffs/belt-delta-investigation.md` | Sim Δ ≠ pool membership |
| `scripts/generate_pool.py`, `curate_ret_pool.py` | Current code |
| `data/pools/ret.json` | Current committed pool |
| `packages/core/src/kael-temp.ts` | Encounter-only ban list |

---

## 10. First agent task (copy-paste)

```text
Read `.scratch/handoffs/raid-scoped-pool-handoff.md` (this file).
Do NOT implement Option A/B. Do NOT land to dev.

Phase 0+1 only unless owner answered §6:
1. Propose concrete phase→zone map and carryover default (call out assumptions).
2. Spike: how to pin AtlasLootClassic (or justify cmangos fallback); sketch script output schema itemId→ItemSource[].
3. For maxPhase=3 under YOUR assumed carryover rule, estimate candidate counts after ret eligibility (no junk filter yet).
4. List tier-token gaps you cannot resolve from db.json alone.
5. Write findings to `.scratch/handoffs/raid-scoped-pool-spike.md`.
Stop before rewriting generate_pool.py.
```

---

## 11. Owner summary (non-LLM)

You rejected BiS-as-pool and sim-scout-as-pool. Next build is: **loot tables for the phase’s raids → wear filter → gentle junk EP → sim**, BiS as tags. Biggest engineering dependency is **pinning a real loot dataset** so tier tokens and source-null epics don’t vanish. Confirm carryover/badge/PvP knobs, then run the spike in §10.
