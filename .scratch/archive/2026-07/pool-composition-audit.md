# Ret candidate pool composition audit

**Date:** 2026-07-27  
**Scope:** `data/pools/ret.json` (168 entries) + rank-time filters in `packages/core/src/pool.ts` / CLI  
**Read-only:** no product code changes

---

## Executive summary

1. `ret.json` is exactly **12 per slot × 14 slots = 168** curated entries (all have `ep` and `source`; no nulls).
2. **Phase filter** is the main sim-count knob: `phase≤2 → 69`, `phase≤3 → 104`, file total **168**. Default `maxPhase` comes from `data/wowsims.lock.json` (`defaultMaxPhase: 2`), overridable via `--max-phase`.
3. **EP prefilter (top 80)** is a no-op at P2 (69 ≤ 80). At P3 it cuts 104 → 80. At P5 it would cut 168 → 80. `--full-pool` skips it.
4. CLI log line prints **raw file length** (`pool=168`), not post-filter candidate count — the slamaltman full-pool run simmed **69 + baseline** (`0/70`…`70/70`) under phase ≤ 2.
5. Pool is intentionally wide (“from everywhere”): **classic raid leftovers** (MC/BWL/AQ/Naxx/DM), heroic-dungeon blues, rep rares, crafted, PvP, and T4–T6. No source/zone filter at rank time yet.
6. The **−186…−276 DPS weapon losers** (Hellscream’s Will, Arechron’s Gift, The Burning Crusader, Khorium Champion) all have **high reference EP** (ranks **3–7 of 69** at P2) and would **survive** any reasonable global top-N EP cut.
7. Root cause: generator EP scores **stat weights only** — **weapon damage is ignored**. Hit-heavy rares outrank Twinblade of the Phoenix on EP (~125–140 vs ~74), so BiS 2H weapons never made the top-12-per-slot list.
8. **Missing from pool:** Twinblade, Gorehowl, Lionheart Executioner/Champion, World Breaker, Merciless Glad weapons, etc. P2 weapon slot is only those four mid/bad options.
9. Simming −300 DPS weapons under today’s filters is **wasteful** for those four, but EP prefilter alone cannot knock them out; need **weapon-damage-aware EP**, **quality/ilvl floor**, or **curation fix** (replace weapon rows).
10. Best next filters (priority): fix weapon EP / re-curate weapons → quality≥epic (or ilvl floor) for weapons → slot-aware EP caps → optional classic-zone / expansion drop. Player-aware EP (PLAN §8.3.3) still blocked on incomplete item stats on the index.

---

## Tables / counts

### By phase

| phase | count | cumulative `≤N` |
|------:|------:|----------------:|
| 1 | 47 | 47 |
| 2 | 22 | **69** |
| 3 | 35 | **104** |
| 4 | 10 | 114 |
| 5 | 54 | **168** |

### By slot (full file)

Every slot has **exactly 12** entries: back, chest, feet, finger, hands, head, legs, neck, ranged, shoulder, trinket, waist, weapon, wrist.

**P2 (`phase≤2`) density is uneven** — weapons only 4; wrists 2; head 3; rings 9; ranged 8.

### By `source.kind`

| kind | count |
|------|------:|
| raid | 91 |
| pvp | 27 |
| token | 24 |
| crafted | 16 |
| rep | 7 |
| world | 2 |
| badge | 1 |
| heroic | 0 |

### Requested zone / kind buckets

| bucket | count | notes |
|--------|------:|-------|
| Karazhan | 16 | |
| Magtheridon’s Lair | 1 | |
| SSC | 11 | |
| Tempest Keep | 8 | |
| Black Temple | 19 | |
| Hyjal Summit | 9 | |
| classic (vanilla raids + DM) | 6 | see below |
| Badge of Justice | 1 | |
| crafted | 16 | profession often numeric (`"2"`) from db |
| pvp | 27 | arena 16 + honor 11 |
| Zul’Aman | 10 | phase 4 |
| Sunwell | 23 | phase 5 |
| Gruul’s Lair | **0** | not present |

### Classic / suspiciously low pieces still in pool

| item | slot | phase | ep | ilvl (db) | quality | source |
|------|------|------:|---:|----------:|--------:|--------|
| Royal Seal of Eldre’Thalas | trinket | 1 | 43 | 62 | rare | Dire Maul tribute |
| Drake Fang Talisman | trinket | 1 | 65.96 | 75 | epic | BWL / Ebonroc |
| Chromatic Boots | feet | 1 | 56.5 | 77 | epic | BWL / Chromaggus |
| Onslaught Girdle | waist | 1 | 63.28 | 78 | epic | MC / Ragnaros |
| Girdle of the Mentor | waist | 1 | 68.28 | 85 | epic | Naxx / Razuvious |
| Gauntlets of Annihilation | hands | 1 | 67.28 | 88 | epic | AQ40 / C’Thun |

Also: **18/69** P2 candidates are **quality 3 (rare)**, including all three rare weapons below.

### P2 weapons in pool (the −300 DPS cluster)

| item | ep | P2 EP rank | quality | ilvl | avg weapon dmg | sim Δ (slamaltman full-pool) |
|------|---:|----------:|--------:|-----:|---------------:|-----------------------------:|
| The Burning Crusader | 139.53 | 3 | rare | 109 | 315 | −248.40 |
| Khorium Champion | 129.55 | 4 | epic | 105 | 358 | −186.92 |
| Hellscream’s Will | 124.74 | 6 | rare | 115 | 327 | −276.30 |
| Arechron’s Gift | 124.74 | 7 | rare | 115 | 327 | −244.38 |

Baseline context: fixture gear includes **Twinblade of the Phoenix** (id 29993, ilvl 141, avg dmg ~470) and **Lionheart Executioner** (28430) — **neither is in the candidate pool**.

Reference EP for Twinblade on the same weights: **~73.6** (would not make top-12 weapons). Hellscream wins on EP because it has **42 hit × 2.15 weight ≈ 90 EP** and EP **ignores white damage**.

---

## Why sim count is ~69 / ~104 / 168 / 80

Pipeline in `packages/core/src/rank.ts`:

```ts
const candidates = prefilterPool(
  filterPoolByPhase(deps.pool ?? [], input.maxPhase),
  input.fullPool ? { fullPool: true } : {}
);
```

| step | code | effect |
|------|------|--------|
| Load pool | CLI loads `data/pools/ret.json` → 168 entries | file size |
| `maxPhase` | `args.maxPhase ?? lock.defaultMaxPhase` (`cli.ts`); lock default **2** | inclusive `phase ≤ maxPhase` |
| `filterPoolByPhase` | `pool.ts` | P2 → **69**, P3 → **104**, P5 → **168** |
| `prefilterPool` | sort by `ep` desc, take **80** unless `fullPool` or `len ≤ 80` | P2: still **69**; P3: **80**; P5: **80** |
| Sims | 1 baseline + `candidates.length` | P2 full or not: **70** sims |

So:

- **~69** = phase ≤ 2 only (EP cap dormant).
- **~104** = phase ≤ 3 + `--full-pool` (or if prefilter disabled).
- **80** = phase ≤ 3 (or 5) **without** `--full-pool` (EP cap active).
- **168** = file size / CLI log `pool=` / theoretical P5+fullPool.

User surprise (“80 of 168 from everywhere”) mixes two different gates: the file is the wide curated universe; rank time always applies phase, then optionally EP top-80. At default P2 you never even hit 80.

---

## Would EP prefilter have excluded the −200…−300 DPS weapons?

**No.**

- All four have `ep` set and rank in the **global top ~15** even among all 168 / top **3–7** among P2’s 69.
- Stricter global caps (top 40 / 50 / 60 / 70) still keep every one of them.
- At P3 EP cut (drop ranks 81–104), drops are mostly low-EP cloaks/ranged/trinkets — **not** these weapons.

**Why EP lies here**

- `scripts/generate_pool.py` `ep_score` only dots **stat map × weights**; `weaponDamageMin/Max` never enter the score.
- Rank-time `prefilterPool` reuses those same stored reference EPs (not player-aware yet). `packages/core/src/pool.ts` comment + PLAN §8.3.3: player-aware hit/expertise clipping needs item stats on the index — **not shipped** (`data/items/index.json` has sockets/enchantable/phase, not combat stats or weapon damage).

So EP prefilter is the wrong tool for this failure mode until weapon damage (and ideally delta-vs-equipped) is in the score.

---

## Is −300 DPS sim waste?

**Yes for these weapons — but the waste is small and the filter that would catch them is not “stricter top-N EP.”**

- At P2 full-pool: **4 weapon sims** of ~69 candidates ≈ **~6%** of candidate sims, all below cutoff by hundreds of DPS.
- They are obvious losers **given a Twinblade-tier baseline**; EP cannot see that.
- Broader “sim terrible candidates” waste also includes classic-ilvl scraps and many rares, but those often have **low EP** and would fall off at P3+ when the 80-cap engages — weapons are the pathologically inverted case.

**Efficiency verdict:** keep simming the wide non-weapon pool for now (PLAN: EP is filter not answer; `fullPool` is the escape hatch). **Do** knock out weapon garbage earlier via curation or weapon-aware scoring before burning iterations.

---

## Recommended next filters (prioritized, do not implement here)

| priority | option | what it does | tradeoff |
|---------:|--------|--------------|----------|
| **1** | **Fix weapon EP / re-generate weapons** | Include white-damage proxy in generator EP (or separate weapon score); re-run top-N so Twinblade/Gorehowl/etc. enter the pool and blues drop out | Highest leverage; aligns pool with reality; needs a defined weapon-damage→EP conversion |
| **2** | **Weapon quality floor (epic+)** or **weapon ilvl floor (~120+ at P2)** | Drops Hellscream / Arechron / Burning Crusader immediately; Khorium needs ilvl or avg-dmg floor | Simple; may drop legitimate early-P1 stepping stones if someone sims maxPhase 1 undergeared |
| **3** | **Curation pass: replace weapon rows** | Hand-swap the 12 weapon slots to real ret 2H options per phase | Fast human fix; drifts until generator is fixed |
| **4** | **Slot-aware EP prefilter** (e.g. top K per slot, K≈6–8) | Stops one slot (weapons/rings) eating the global top-80; matches “~8 per slot” density intent | Still won’t drop high-EP bad weapons until their EP is fixed; better for cloaks/ranged spam at P3+ |
| **5** | **Drop `expansion === 1` / classic zones** | Removes MC/BWL/AQ/Naxx/DM scraps | Tiny sim savings at P2; product may still want “from everywhere” for nostalgia/alt catch-up — make it a view or opt-in floor |
| **6** | **Stricter global EP (e.g. top 50)** | Saves sims at P3+ | **Does not** fix weapon losers; risks dropping hit-heavy upgrades once player-aware EP exists |
| **7** | **Phase floor** (e.g. only `phase ≥ maxPhase−1`) | Shrinks P2 list by dropping old P1 | Conflicts with R2 / PLAN: Kara/badges still matter at T5; **avoid** as default |
| **8** | **Player-aware EP (PLAN §8.3.3)** | Correct long-term prefilter | Blocked on item stats (+ weapon damage) on index; still need weapon white damage in the model |

**Not recommended as first move:** relying on today’s global EP top-80 to save weapon sims.

---

## Commands used / files read

```bash
# Pool characterization + EP ranks (node one-shots against ret.json / db.json)
node -e '…'   # structure, phase/slot/kind/zone counts, EP ranks, P2/P3 sim counts

# Weapon damage / quality / missing BiS from wowsims db
node -e '…'   # vendor/wowsims/db.json scalingOptions ilvl + weaponDamage*
```

**Files read**

- `data/pools/ret.json`
- `data/pools/ret.generated.json`
- `data/wowsims.lock.json` (`defaultMaxPhase: 2`)
- `data/presets/ret/p2.ep-weights.json`
- `data/items/index.json` (no ilvl/combat stats)
- `vendor/wowsims/db.json` (ilvl, quality, weaponType, weaponDamage)
- `packages/core/src/pool.ts` (`filterPoolByPhase`, `prefilterPool`, `EP_PREFILTER_LIMIT = 80`)
- `packages/core/src/rank.ts` (candidate pipeline)
- `packages/core/src/cli.ts` (`--max-phase`, `--full-pool`, pool load, log line)
- `scripts/generate_pool.py` (stat-only `ep_score`; polearm/staff exclude)
- `scripts/curate_ret_pool.py` (source hand map)
- `.scratch/full-pool-rank.log` (slamaltman Δs; 70 sims)
- `PLAN.md` §8.3 / §8.3.3 (wide pool + player-aware EP prefilter intent)

**Evidence commands to re-run**

```bash
node -e "const p=require('./data/pools/ret.json').entries; for (const m of [2,3,5]) console.log(m, p.filter(e=>e.phase<=m).length)"
# → 2 69 / 3 104 / 5 168
```
)
