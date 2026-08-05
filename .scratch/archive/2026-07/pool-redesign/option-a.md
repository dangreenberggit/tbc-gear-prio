# Option A — Lists-first pool membership

**Author:** Design Worker A  
**Bias:** External curated lists are **primary membership**. Linear EP is demoted to an optional shadow-check / QA report — **never** the membership engine, **never** the rank-time gate that decides who gets simmed.  
**Scope:** Ret candidate pool that `rankUpgrades` sims. No implementation in this pass.  
**Out of scope:** Landing, regenerating `ret.json`, scraping Wowhead into the build, TMB as a data source.

---

## 1. Thesis

**Today’s pool is doomed because membership is EP top-N.** Reference linear EP on item stats (plus a white-damage fudge) is not a mild mis-ordering at hit/expertise caps — it is the wrong *kind* of filter for “what a competent ret would chase.” From ~thousands of `db.json` items it keeps an arbitrary-looking top-12/slot; famous chase pieces only appear via `FORCE`; leather/mail BiS are invisible to generate’s plate gate; the same poison EP then prefilters at rank time. That is absolute inadequacy of EP-as-membership, not a softcap bug.

**Replacement:** Treat community-validated **item ID lists** as the universe of candidates:

1. **Pinned wowsims curated gear sets** (already vendored / syncable).
2. **Human-transcribed Wowhead (and peer) per-tier BiS + alt tables** — committed JSON, no CI scrape.
3. **Optional community sheets** (RetSim / spreadsheet exports) as additional provenance layers.

**Union those lists → attach `source` → apply hard equip/product filters → ship `data/pools/ret.json`.** Sims remain the sole authority for ΔDPS ordering. Lists answer only: *who is allowed into the sim budget*.

**Verdict on PLAN’s BiS-tag rule:** PLAN §2 / §8.3 said curated BiS is a **display tag / pin**, never a pool filter — because PLAN assumed EP generate + human curate already produced a credible pool. That assumption failed. Option A deliberately **changes product policy**: list membership *is* the pool. Tags remain useful for pin/display, derived from the same manifests with richer provenance (`BiS` vs `Alt` vs `carryover`), but the membership decision itself is list-union, not EP.

**Lists are the pool** (primary membership), not a seed for EP to re-rank, and not merely a Phase-1 QA gate. QA still uses the same lists as a regression oracle when guides update.

---

## 2. Why current EP membership fails (absolute terms)

Evidence from this repo (re-runnable; not hypothetical):

| Failure | Mechanism | Concrete signal |
|--------|-----------|-----------------|
| BiS sets ≠ pool | EP top-12 ≠ human/sim-curated sets | Of **36** unique item IDs in vendored `ret_preraid` / `ret_p1` / `ret_p2` gear sets, only **9** appear in committed `ret.json`. Missing includes Dragonspine Trophy, Bloodlust Brooch, Shapeshifter’s Signet, Justicar Crown, Mithril Chain of Heroism, Vengeance Wrap, Mask of the Deceiver, etc. |
| Cross-armor BiS invisible | Generate requires plate on body slots | Belt of One-Hundred Deaths (leather), Bow-stitched Leggings (mail) enter only via `FORCE` |
| Weapon white damage vs hit rares | Stats-only EP historically ranked hit-heavy rares above real 2H BiS; fudge was bolted on later | Pool-composition audit: Twinblade ~74 EP while garbage 2H rares sat in EP ranks 3–7 and survived global top-80 |
| `FORCE` is the real curator | Human ID list papering over generate | ~21 FORCE pins; without them the “generated” shortlist is not a chase list |
| Double poison | Same reference EP in generate **and** `prefilterPool` | Rank-time top-80 cannot rescue a pool that never contained the right IDs; it can only drop more list-credible low-EP pieces |
| Cap-clipped EP (PLAN §8.3.3) | Not implemented; still linear | Softcaps are one discontinuity among many (set bonuses, weapon DPS, sockets/gems, procs, encounter). Fixing caps does not make EP a membership oracle |

Community / tooling consensus (Pawn docs, sim vs weight discussions): static EP / Pawn weights are a **quick filter or teaching aid**, not a substitute for sim-backed BiS construction. Guides and wowsims sets are already the artifact humans trust before they open a sim. Option A aligns pool formation with that social fact.

**Note:** Gem naming — “Sovereign Nightseye” is one purple gem. Irrelevant to membership redesign except do not split the name in reviews.

---

## 3. Algorithm / steps

### 3.0 Artifacts (committed)

```
data/pool-manifests/ret/
  sources.lock.json          # provenance: wowsims pin, guide URLs + retrieved dates, sheet hashes
  wowsims-sets.json          # extracted IDs from synced *.gear.json (+ optional old-tbc seed)
  wowhead-p1.json … p5.json  # human-transcribed BiS / Alt / note rows (itemId, slot, tier, role)
  community-optional.json    # optional third-party sheet IDs
  product-rules.json         # libram-only ranged, 2H path, Kael-temp ban, polearm policy, quality floors
```

`data/pools/ret.json` remains the **shipped** pool the engine loads (same shape as today: `itemId`, `name`, `slot`, `phase`, `source`; `ep` optional/shadow-only).

### 3.1 Ingest wowsims gear sets (automated, offline)

1. `pnpm sync:wowsims` already pins `ret_preraid.gear.json`, `ret_p1.gear.json`, `ret_p2.gear.json` from `ui/paladin/retribution/gear_sets/` (`data/wowsims.lock.json`).
2. Extract every non-empty `items[].id` → slot via `db.json` type map.
3. Tag provenance: `{ source: 'wowsims', set: 'p2', variant: 'default' }`.
4. **Gap today:** `tbc-new` stops at P2. For P3–P5 membership until upstream adds sets:
   - Prefer human Wowhead manifests (authoritative for Anniversary chase).
   - Optionally bootstrap from archived `wowsims/tbc` P3–P5 sets as **seed IDs only**, flagged `stale-seed`, spot-checked against Wowhead before shipping (PLAN already warns these encode 2021-era understanding).

### 3.2 Ingest Wowhead (and peer) guides (human transcription, no scrape)

Wowhead structure (describe; do not scrape into repo):

- One **per-phase** Ret DPS BiS guide URL (P1 Kara/Gruul/Mag → … → P5 SWP).
- Each guide is organized by **equipment slot**.
- Per slot: a **primary BiS** row and usually **alternatives** (hit/expertise fillers, craftable, badge, “close second,” set-bonus variants).
- Separate from the main class guide’s short “recommended sets” blurb; the dedicated BiS page is the dense table.
- Peer sources (Warcraft Tavern, RetSim/spreadsheet community posts) follow the same slot×phase table pattern with explicit Alt rows.

**Process:**

1. Human opens the current Anniversary-relevant guide for each phase.
2. Records `itemId` (from Wowhead item page / tooltip), slot, phase, and role: `bis` | `alt` | `hit` | `set-bonus` | `craft` | `badge` | `pvp-optional`.
3. Commits JSON under `data/pool-manifests/ret/wowhead-pN.json` with `retrievedAt`, guide URL, author/patch note.
4. Diff CI: manifest change must bump `sources.lock.json` and regenerate pool; no network in `pnpm verify`.

This preserves PLAN’s “no scraping” rule as a **build** constraint while making guides the membership source via deliberate curation (same labor class as filling `HAND` / `FORCE` today — but the list *is* the product, not a band-aid).

### 3.3 Optional community sheet layer

- Import item ID columns from a pinned RetSim / community spreadsheet export (committed CSV/JSON).
- Tag `community:<sheet-id>@<hash>`.
- Default **on** for raid chase IDs; PvP arena pieces default **off** unless product wants a separate PvP shortlist later (HTML already separates PvP reading).

### 3.4 Union + hard filters (membership engine)

```
members = ∅
for each manifest layer:
  members ∪= itemIds
attach name, slot, phase from db.json
apply product-rules:
  - drop Kael encounter-only legendaries (same ID set as today)
  - ranged: libram only (rangedWeaponType == Libram)
  - weapon: 2H only for this product’s DPS path (handType == 2H);
            staff excluded (unequippable); polearm policy = INCLUDE by default
            (ret can equip polearms — today’s generate excludes them as a product filter;
             lists-first should not silently inherit that unless SME confirms)
  - do NOT require plate on body slots (leather/mail BiS stay)
  - optional: drop quality < rare unless explicitly list-tagged (pre-raid greens)
require source ≠ null (db → HAND map → human Wowhead lookup) — same build gate as §8.3.2
write data/pools/ret.json
```

**No TOP_N by EP. No plate-only generate pass.**

### 3.5 Density policy (list-shaped, not EP-shaped)

Target remains PLAN’s ~8 real options/slot (~180), but density is achieved by **list coverage**, not score cutoff:

| Slot density after union | Action |
|--------------------------|--------|
| 0–2 for a live phase | **Block ship** — incomplete transcription / missing alts |
| 3–5 | Soft warn; human adds alts from guide “also consider” / previous-phase BiS that remains competitive |
| 6–12 | Ideal |
| >12 | Allowed (lists already curated). Prefer **keep all** over EP trim. If sim budget demands, trim by **provenance priority** (wowsims∪Wowhead-bis > alt > community > stale-seed), never by reference EP |

**Carryover rule:** At `maxPhase: N`, pool file still holds all phases (tier-agnostic file, R2). Rank-time keeps `phase <= maxPhase`. Earlier-phase BiS naturally remain candidates — correct for badge/Kara pieces that stay competitive.

### 3.6 Optional EP shadow-check (never membership)

After union, optionally compute reference EP (current `p2.ep-weights.json` + weapon white-damage) and emit a **report**, not a filter:

- List members with very low EP → expected for leather BiS / librams; confirm they are intentional.
- DB items with very high EP **not** in the list → “EP noise candidates”; human may spot-check whether a guide omitted a real chase piece (list miss), but default is **trust the list**.
- Diff vs previous pool: adds/drops with provenance.

Player-aware / cap-clipped EP (PLAN §8.3.3) is **out of Option A’s critical path**. If ever rebuilt, it may help **rank-time ordering of which list members to sim first** under a hard budget — still secondary to “on the list.”

### 3.7 Rank-time (after pool ships)

1. `filterPoolByPhase(maxPhase)` — keep.
2. Kael-temp strip — keep (defense in depth).
3. **`prefilterPool` by stored EP — remove or disable by default.** Sim the full phase-filtered list (~80–180 depending on maxPhase and density). Cost is acceptable if membership is credible; today’s waste was simming EP garbage, not simming ~100 real chase pieces.
4. Escape hatch: if budget ever hurts, replace EP top-80 with **slot-balanced take** (e.g. all list members, or max K/slot by provenance), still not reference EP.
5. Sims produce ΔDPS; BiS tags/pin remain display-only *ordering* aids, not membership.

### 3.8 Bis-tags dual-use

The same manifests feed `data/bis-tags/ret.json`:

- `BiS` / `Alt` / `Realistic` from Wowhead roles + wowsims set membership.
- Degrade empty above available tag coverage (PLAN §4.1) — but **pool** does not degrade empty: pool uses multi-source union including transcribed guides through P5.

---

## 4. Data sources

| Source | Role | Offline / CI | Notes |
|--------|------|--------------|-------|
| `vendor/wowsims/db.json` | Name, slot, phase, equip flags, source hints | Yes (pinned) | Not a membership scorer |
| `vendor/wowsims/ret_*.gear.json` | Primary automated membership seed P0–P2 | Yes | Already in lockfile; **must** be in pool |
| Wowhead per-phase Ret BiS guides | Primary membership P1–P5 + alts | Human → committed JSON | Structure: slot tables, BiS + alts; no scrape |
| Peer guides / RetSim sheets | Coverage + disagreement check | Committed exports | Optional layer |
| `HAND` source map | Fill `source` gaps | Yes | Keep; expand as list grows |
| `p2.ep-weights.json` | Shadow report only | Yes | Not membership |
| That’s My BiS | **None** | — | Downstream wishlist only (PLAN) |
| Live Wowhead HTTP in CI | **Forbidden** under this option | — | Policy change would be explicit |

---

## 5. How it fails (adversarial)

| Failure mode | Severity | Mitigation |
|--------------|----------|------------|
| **Stale guides** | High — wrong BiS after patch/meta shift | `retrievedAt` + periodic human refresh; Phase gate “would you act on tonight”; shadow EP/disagreement report |
| **Too-narrow BiS-only union** | High — mid-gear players need alts / previous tier | Require Alt rows; multi-phase union; density gate per slot |
| **Guide disagreement** | Medium — two lists diverge | Union both; tag provenance; let sims order; document conflicts in manifest notes |
| **Transcription errors** | Medium — wrong itemId | CI: id must exist in db; slot must match; spot-check vs wowsims sets for P1–P2 |
| **Missing “sleeper” upgrades** | Medium — unlisted badge/craft sleeper | Community sheet layer; human add; EP-shadow “high EP not in list” review queue (human accepts/rejects) |
| **PvP noise** | Low–medium | Default exclude arena sets from raid pool; optional separate list |
| **Pre-raid greens in wowsims sets** | Low | Allow if list-tagged; else quality floor |
| **Anniversary ≠ Classic guide** | Medium | Prefer Anniversary-dated Wowhead pages; record patch in lock |
| **Polearm / 1H policy drift** | Low | Explicit `product-rules.json`; SME sign-off |
| **Set-bonus pieces look weak as single swaps** | Expected | Not a pool bug — sims + `setBonusNote` / pin explain; list should still include tier pieces |

Option A **accepts** dependence on external editorial quality. That is the point: editorial lists already outperform EP membership in this repo’s evidence. The failure mode shifts from “systematic nonsense shortlist” to “curation freshness,” which humans know how to operate.

---

## 6. Cost

| Cost | Estimate |
|------|----------|
| **Initial engineering** | ~2–4 days: replace generate membership with union script; keep source attach; kill EP prefilter default; tests for “every wowsims set id ∈ pool”; manifest schema |
| **Initial curation** | ~4–8 hours: transcribe Wowhead P1–P5 BiS+alts into JSON; merge FORCE/HAND into manifests; verify leather/libram/2H/Kael rules |
| **Ongoing curation** | ~30–60 min per content patch / guide update |
| **Runtime sims** | Phase-filtered full list: often **similar to today’s `--full-pool`** (~100–170 sims × seeds). Removes EP top-80. Budget OK if list stays ~8/slot; if not, provenance trim — not EP |
| **CI** | No network. Manifest + pool byte/schema checks. Optional: assert ⊆ relation wowsims sets → pool |
| **Storage** | Small JSON manifests ≪ db.json |

Unacceptable cost avoided: simming thousands of db items; maintaining ever-growing `FORCE` to patch EP blindness.

---

## 7. Migration from current `ret.json`

1. **Freeze** current `ret.json` as `ret.json.ep-legacy` (scratch or one commit) for diff archaeology — do not keep EP as generator.
2. **Extract** all `FORCE` IDs into `wowhead-*` / `manual-must.json` with provenance `legacy-force`.
3. **Build** first lists-first pool = union(wowsims sets P0–P2, FORCE, transcribed Wowhead through current Anniversary phase, keep existing HAND sources).
4. **Diff** against legacy pool:
   - Expect **many adds** from wowsims sets currently missing (~27 IDs).
   - Expect **drops** of high-EP plate/PvP/noise that no guide cites.
5. **Re-run** slamaltman (or fixture) full list rank; SME gate: top shortlist vs Wowhead/wowsims (PLAN §14 Phase 1 gate — now aligned with how the pool was built).
6. **Delete** EP top-N path from `generate_pool.py` (or rename to `report_ep_shadow.py`). `curate_ret_pool.py` becomes `assemble_ret_pool.py` (union + source + rules).
7. **Rank default:** `fullPool`-equivalent for list members; remove reliance on stored `ep` for prefilter. Keep `ep` field nullable or shadow-only for reports.
8. **Do not** land in this design pass.

Shape compatibility: keep `PoolEntry` fields the engine already understands so `rankUpgrades` / CLI stay stable.

---

## 8. Domain rules (leather / librams / 2H / Kael)

| Rule | Option A handling |
|------|-------------------|
| **Leather / mail BiS** | First-class via lists (Belt of One-Hundred Deaths, Bow-stitched Leggings, Mask of the Deceiver, etc.). No plate-only generate. |
| **Librams** | Product rule: ranged = libram only. Guides list librams; bows never enter. |
| **2H weapons** | Product rule: MH ranking path = 2H. Twinblade, Gorehowl, Torch, etc. come from lists — not weapon-EP luck. Polearms: default **include** if listed (equip-legal); do not copy today’s silent polearm ban without SME decision. |
| **Kael temps** | Hard exclude by ID (Netherstrand, Warp Slicer, Devastation, …). Twinblade of the Phoenix **stays** (persistent loot). |
| **Tier / tokens** | Guides name tier pieces; `source` kind `token` with drop zone (existing HAND patterns). |
| **Sims** | Still sole ΔDPS authority. A list BiS can show **negative** delta on a given character (set break, caps) — correct; pin/display may still surface it. |

---

## 9. Sims remain ranking authority

Clarified contract:

| Stage | Authority |
|-------|-----------|
| Pool formation | **Lists** (who may be simmed) |
| ΔDPS / shortlist order | **wowsimcli** via `SimRunner` |
| Display pin | Bis-tags from same manifests (optional) |
| EP | Shadow QA only |

This matches product framing: relative upgrades for *this* logged set, not “export the Wowhead table as the answer.” The table is the **candidate universe**; the sim is the **judge**.

---

## 10. Lists = pool vs seed vs QA gate

| Role | Option A choice |
|------|-----------------|
| **Primary membership (the pool)** | **Yes** — union of curated external lists after hard filters |
| **Seed for EP re-ranking** | **No** — that recreates today’s failure |
| **QA / Phase-1 gate only** | **Insufficient alone** — gate cannot fix a pool that never contained BiS; but the **same** lists still serve as the regression oracle when guides move |

PLAN’s old “BiS never filters the pool” line is **superseded for membership** under this option; pin/display semantics for tags can remain.

---

## 11. Open questions

1. **Polearm policy:** Include list-cited 2H polearms, or keep product “swords/maces/axes only”?
2. **PvP gear:** Exclude from default raid pool, or include arena weapons/librams when guides mention them?
3. **How many alt tiers** must Wowhead transcription capture before density gate passes?
4. **Bootstrap from old `wowsims/tbc` P3–P5 sets** — yes as stale-seed, or Wowhead-only above P2?
5. **Rank-time budget:** Always sim full phase-filtered list, or provenance-capped K/slot when `maxPhase: 5` grows past ~200?
6. **Anniversary drift:** Who owns the calendar reminder to re-transcribe after Wowhead updates?
7. **Multi-spec:** Manifest layout `data/pool-manifests/<spec>/` — confirm cheap enough for feral Phase 2 gate.
8. **Disagreement protocol:** When Wowhead BiS ≠ wowsims set for P2, union both (preferred) or prefer one publisher?
9. **Should `ep` remain on `PoolEntry`?** Prefer drop from shipping schema once prefilter dies, to avoid reintroducing EP membership by accident.
10. **Green pre-raid items** in wowsims preraid set — keep for `maxPhase: 0/1` completeness?

---

## 12. Prototype plan (≤1 week, still no full ship)

1. Script: extract wowsims set IDs → assert against current `ret.json` (expect large miss set; documents the bug).
2. Hand-build a **minimal** `manifest-p2.json` = wowsims p1∪p2∪preraid ∪ current FORCE ∪ ~1 Wowhead P2/P3 alt table for waist/weapon/trinket only.
3. Assemble a scratch pool JSON; run one fixture rank **without** EP prefilter.
4. SME eyeball: does shortlist contain Vashj belt, Dragonspine, Twinblade path, librams only, no Kael bow?
5. Stop. Feed results to math/SME critics and manager compile — **do not** regenerate committed `ret.json` until recommendation lands.

---

## 13. Success criteria for this option (if chosen)

- Every ID in pinned wowsims ret gear sets appears in `ret.json` (modulo Kael-temp / unequippable).
- Leather/mail chase pieces appear without a special `FORCE` escape hatch.
- No membership step sorts or cuts by reference EP.
- Rank default sims the phase-filtered list (or provenance-balanced subset), and Phase 1 gate (“act on tonight” + Wowhead/wowsims check) becomes a **consistency** check, not a rescue mission.
)
