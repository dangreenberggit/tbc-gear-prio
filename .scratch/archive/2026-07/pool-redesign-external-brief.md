# External brief — rethink candidate pool formation (ret)

**Purpose:** Run this on an **independent agent outside Cursor** (prefer a strong reasoning model: Opus / Sol / Codex-class). Cursor’s available sharp lane is often Grok-only; the product owner is skeptical that is enough for this design call.

**Do not implement** the new pool yet. Deliver a **design diagnosis + 2+ concrete proposals + critical reviews + a compiled recommendation**.

**Repo:** `tbc-gear-prio` (TBC Anniversary ret gear ranker backed by wowsims).  
**Branch context when written:** `phase-1/five-seed-spread` (dirty tree OK; don’t land to `dev`).

---

## 1. What the product does

Given a character’s logged gear, rank **single-slot item swaps** by ΔDPS via wowsimcli. Output is a shortlist of upgrades relative to *this* set — not a naked BiS sheet solver.

Deep module: `rankUpgrades` (`packages/core/src/rank.ts`). Seams: `GearSource`, `SimRunner`, `Store`.

---

## 2. How candidates are formed TODAY (the broken part)

### Source of truth for “what exists”

Pinned wowsims item DB: `vendor/wowsims/db.json` (~8k items). Generated indexes: `data/items/index.json`, `data/gems/palette.json`.

### Step A — generate (`scripts/generate_pool.py` → `data/pools/ret.generated.json`)

For every db item:

- rare+
- body armor: **plate only**
- weapons: **2H only** (excludes staves; also excludes polearms as a *product* filter — ret *can* equip polearms)
- ranged: **librams only**
- skip Kael encounter-only legendaries
- score = linear EP on item stats using **ret P2 reference weights** + a white-damage fudge for weapons
- **keep top 12 per slot**

### Step B — “curate” (`scripts/curate_ret_pool.py` → `data/pools/ret.json`)

- Attach loot `source` (db or hand `HAND` map); refuse null sources
- Inject hard-coded **`FORCE`** item IDs that must appear (how leather BiS like Belt of One-Hundred Deaths enter — generate cannot see non-plate)
- Re-trim to 12/slot

Committed pool today: **164 entries** (~12×13 slots + 8 librams).

### Step C — rank-time

- `phase <= maxPhase`
- unless `--full-pool`: keep top ~80 by the **same stored reference EP**
- drop Kael temps again
- sim each survivor as a single swap

### Current EP weights (`data/presets/ret/p2.ep-weights.json`)

Sparse wowsims P2 ret preset (stat index → weight), including high melee hit (2.15) and expertise (2.14). Used for pool generate, rank prefilter, gem fill (with a recent softcap zero for hit/expertise on **candidate gem fill only**), and meta-repair (full weights).

---

## 3. Why the owner says this is doomed (hear this clearly)

**Not** “EP is a bit wrong at hit cap.”  

The claim is: **linear reference EP as the membership engine is garbage in absolute terms** — it does not produce a shortlist that resembles what a competent ret would chase. From ~thousands of items it surfaces a small set that feels effectively arbitrary; famous BiS pieces must be **FORCE**-injected; then we spend sim budget comparing that skewed set and can even declare winners among noise.

If the same poison EP is used in both generate and rank-time prefilter, **both stages are doomed by it**. Fixing only TOP_N or only curation theater does not fix the root.

Player-aware / cap-clipped EP (PLAN §8.3.3 / R13) was proposed as mitigation and is **not implemented**. Owner’s position: even that may be insufficient if the flaw is deeper than breakpoints (nonlinearity of DPS, set bonuses, weapon white damage, gem/socket interactions, softcaps, encounter, etc.).

---

## 4. What PLAN actually said (do not mythologize)

| Topic | PLAN intent | Reality |
|--------|-------------|---------|
| Pool workflow | Generate-then-**human-curate** to ~8 real options/slot (~180) | EP top-12 + FORCE/HAND band-aids |
| Rank prefilter | Player-aware EP, hit/exp clipped to remaining gap; sim ~80 | Reference EP top-80 or `fullPool` |
| BiS tags | From **wowsims curated gear sets**; display / pin / tiebreak — **never pool filter** | Empty / unused above P2 |
| Wowhead | (1) Human fills `source` gaps; **no scrape**. (2) Phase 1 **gate**: human check ranks vs wowsims sets **and Wowhead per-tier ret guide** | Not a pool data source |
| That’s My BiS | Downstream wishlist destination only | N/A |

There was **no** PLAN requirement to hardcode Wowhead phase BiS lists as the candidate pool. Using Wowhead (or similar) lists as the **pool itself** is a **product redesign**, not recovering a skipped step — but it is on the table given current failure.

Relevant sections: PLAN.md §8.3, §8.3.3, §14 Phase 1 gate, BiS pin §4.1.

---

## 5. Related sim lesson (context, not the pool task)

Belt of One-Hundred Deaths Δ looked “too low” vs a manual wowsims session largely because **race/expertise baseline differed** (Human already nearer expertise cap → belt expertise clipped). Pipeline equipment JSON was not silently ungemming. Meta stayed active on Bold×2 fill.  

Gem naming: **“Sovereign Nightseye”** is one gem name (purple). Do not speak as if “Sovereign” and “Nightseye” are two different gems.

Import fixtures for manual web compare: `.scratch/wowsims-import/` (user before + after 30106).

Belt input investigation: `.scratch/handoffs/belt-delta-investigation.md`.

---

## 6. Mission for the redesign effort

**Rethink pool formation from the ground up** so that, before any sim runs, we have a curated candidate set that is *not* doomed by bad linear EP membership.

### Required process (orchestration)

1. **Two parallel design workers** — each proposes a **radically different** approach to building the curated list that will later be simmed. They may research:
   - wowsims databases / curated gear sets / how wowsims UI shortlists
   - Wowhead phase BiS / guide structures (describe; don’t scrape into repo yet)
   - community / academic discussion on gear ranking, EP limitations, Pawn-style weights, sim-based filters, etc.
   - whether a **better/tweaked EP** could still be part of a defensible pipeline — but they must confront current weights and absolute failure modes, not only hit-cap clipping
2. **Independent critical review (math)** — quantitative / statistical / approximation critique of both proposals (bias, failure modes, cost, determinism).
3. **Independent critical review (SME)** — TBC Anniversary **ret game** critique: would this shortlist contain the real chase pieces and exclude nonsense (librams vs bows, Kael temps, plate vs leather BiS, 2H path, etc.)?
4. **Compiler (manager)** — one doc with both options, both reviews, and the manager’s own comparative recommendation (including “neither; do X instead” if warranted).

### Constraints

- Spec focus: **ret** (design should not paint into a corner that blocks other specs later if cheap to avoid).
- Sims remain the **ranking** authority for ΔDPS; pool formation only chooses *who gets simmed*.
- Cost: full pool sim of thousands is unacceptable as default; some narrowing is required — but narrowing must be **principled**.
- Offline / pinned data preferred for CI; live Wowhead scrape as a build dependency is hostile to PLAN (“no scraping”) unless explicitly proposed as a deliberate policy change.
- Leather BiS, librams, 2H weapons, Kael encounter-only rules must be handled correctly somehow.
- Do not implement code or regenerate `ret.json` in this pass unless the human asks.

### Deliverables (paths)

Write under `.scratch/handoffs/pool-redesign/`:

| File | Author |
|------|--------|
| `option-a.md` | Design worker A |
| `option-b.md` | Design worker B |
| `review-math.md` | Math critic (both options) |
| `review-sme.md` | Game SME critic (both options) |
| `compiled-recommendation.md` | Manager |

Each option doc should include: thesis, algorithm/steps, data sources, how it fails, cost, migration from current `ret.json`, open questions.

---

## 7. Starter prompts for workers (copy/adapt)

### Design worker (×2 — force divergence)

> Propose one complete system for building the ret candidate pool that will be simmed by tbc-gear-prio. Current system (EP top-12/slot + FORCE) is considered **absolutely** inadequate, not merely wrong at caps. Read PLAN §8.3 and current `scripts/generate_pool.py` / `curate_ret_pool.py`. Research wowsims/Wowhead/community approaches. Deliver `option-*.md`. Do not implement.

Worker A bias: prefer **external curated lists** (wowsims gear sets, Wowhead guides, community sheets) as primary membership, EP only as optional shadow-check.  
Worker B bias: prefer **improved quantitative filter** (better EP, sim-assisted prefilter, multi-point EP, etc.) with minimal dependence on scraped guides.

### Math review

> Critically review option-a and option-b for approximation quality, selection bias, determinism, and cost. Be adversarial. Write `review-math.md`.

### SME review

> Critically review option-a and option-b as a TBC Anniversary ret SME. Would the resulting shortlists be game-credible? Equip rules, leather BiS, librams, Kael temps, PvP vs raid. Write `review-sme.md`. Game facts only for findings.

### Manager compile

> Merge into `compiled-recommendation.md`: summarize both options, quote key review findings, give your recommendation and why, list what to prototype first (still no full implement).

---

## 8. Suggested reading in-repo

- `PLAN.md` §8.3, §8.3.3, §14
- `scripts/generate_pool.py`, `scripts/curate_ret_pool.py`
- `data/pools/ret.json` (shape)
- `data/presets/ret/p2.ep-weights.json`
- `.scratch/handoffs/candidates-origin.md`
- `.scratch/handoffs/candidates-origin-sme.md`
- `.scratch/handoffs/belt-delta-investigation.md`
- wowsims vendor curated sets under `vendor/wowsims/` if present (`gear_sets`, ret presets)

---

## 9. Success bar for this design pass

A competent outsider should be able to answer:

1. Why current EP membership fails in absolute terms (not just “hit cap”).
2. Two seriously different replacement strategies with clear data dependencies.
3. Whether external BiS lists should become the pool, a seed, or only a QA gate.
4. What to prototype in ≤1 week of engineering without boiling the ocean.

---

## 10. Out of scope for this pass

- Landing to `dev` / `pnpm land`
- Rewriting the sim/rank engine
- Scraping Wowhead into the repo
- Treating That’s My BiS as a data source
- Fixing Gorehowl magnitude / preset P2-vs-P3 (separate tracks)
