# AtlasLoot pin and parse — worker handoff

**Date:** 2026-07-28  
**Branch:** `phase-1/w-atlasloot`  
**Base:** `afd063f15d11412bcf7f5abaea0118131897796b` (HEAD matched; no correction)

## Deliverables

| Artifact | Status |
|----------|--------|
| `scripts/sync_atlasloot.py` | Done — wowsims-style pin/check/update, `TRACKED` = `data-tbc.lua` only |
| `data/atlasloot.lock.json` | Done — pinned `v3.4.3.pre-release` @ `0bc91eb6899bebbf3b99072b446c1b83778ddeb9` |
| `scripts/parse_atlasloot.py` | Done — line/regex parser, no Lua VM |
| `data/atlasloot_sources.json` | Done — 1,410 item IDs → `ItemSource` lists |

## Pin

- Tags exist on `Hoizame/AtlasLootClassic`; latest is `v3.4.3.pre-release`.
- Lockfile records commit SHA + per-file sha256 (`86101e5c0ad4…`, 172,864 bytes).
- `python scripts/sync_atlasloot.py --check` → in sync.

## Parser choices (locked decisions)

- **Dungeons:** parse dungeon and raid tables. Normal-mode dungeon loot is skipped at emit time (comment in parser); heroic dungeon drops emit `kind: "heroic"` with `dungeon` from MapID → `db.json` zone name.
- **Raids:** emit `kind: "raid"` with zone from NPC `zoneId` in `db.json` (665 bosses), MapID fallback (218), or instance alias (0). World-boss NPCs missing from `db.json` npcs (Doomwalker, Lord Kazzak) left 20 item rows without a zone — expected; world bosses are outside `phase_raids.json`.
- **Raid heroic guard:** no raid instance in pinned file uses `HEROIC_DIFF`.
- **Output keys:** string item IDs (JSON object keys).

## Gap measurement (section 4.2 — measured, not guessed)

### 4.1 Baseline

Using the plan’s exact import (`ret_equippable` from `generate_pool.py`, phase ≥ 2, no `sources`):

```
baseline gap: 435 items
```

**Delta vs parent plan’s ~673:** the spike’s 673 uses **D7-expanded** eligibility (plate/leather/mail, two-hand non-polearm/staff, libram ranged, Kael temp legendary exclusion). Current `ret_equippable()` is still **plate-only** on armor slots. Re-running with D7 rules reproduces `{1:1682, 2:192, 3:190, 4:72, 5:219}` → **673** at phase ≥ 2.

### 4.2 Closure

```
ret_equippable baseline:  0/435 resolved, 435 unresolved
D7 reference baseline:    0/673 resolved, 673 unresolved
```

**Why zero closure:** AtlasLoot boss loot tables list **drop IDs** (boss loot + tokens/spheres). The 435/673 gap items are **final equippable pieces** (tier armor, token-redemption results, “via sphere/deck” items) that `db.json` lacks `sources[]` for and that **do not appear** as item IDs in `data-tbc.lua` boss loot lines. Spot checks:

| Item | In gap | In `data-tbc.lua` boss loot | In `atlasloot_sources.json` |
|------|--------|------------------------------|-------------------------------|
| 30017 Telonicus's Pendant | yes | no (sphere 32405 is listed) | no |
| 30131 Crystalforge War-Helm | yes | no (token 30242 etc. listed) | no |
| 32405 Verdant Sphere | n/a (not in db items) | yes | yes → TK / Kael |
| 30236 Chestguard of the Vanquished Champion | n/a (not in db items) | yes | yes → TK / Kael |

Cross-check: of 1,410 parsed IDs, **1,122** exist in `db.json` and **all 1,122 already had `sources[]`** before this parse. **Zero** `db.json` items without sources gained a new entry from AtlasLoot. **288** parsed IDs are absent from `db.json` (mostly tokens, keys, non-equippables).

**Parser sanity:** items with existing db sources parse correctly (e.g. 28477 → Karazhan / Attumen; 28825 → Gruul's Lair).

## Tier pieces (exit criterion 4)

All **18** ret tier piece IDs (sets 626, 629, 680) — **none** appear in `atlasloot_sources.json`. Plan claim confirmed.

## Parse stats

```
instances: 26 (16 dungeons + 9 raids + WorldBossesBC)
item keys emitted: 1410
items_emitted (source records): 1485
dungeon_normal_skipped: 433
zone_via_npc: 665 | zone_via_mapid: 218 | zone_unresolved: 20
```

## Licence (exit criterion 5 — owner decision required)

AtlasLootClassic is **GPL-2.0**. This slice commits **parsed output** (`data/atlasloot_sources.json`) derived from vendored Lua; the Lua stays gitignored under `vendor/atlasloot/`. Whether mechanically extracted item→zone mappings are derivative works that impose GPL obligations on this **private** repo is **unresolved**. Owner should decide before any public release or if build artifacts must stay local-only.

## Suggested follow-ups

1. **Sub-phase 2 (two-hop):** token→piece and sphere/deck→reward mappings — this is where the 673 gap actually closes, not from raw AtlasLoot boss tables.
2. **Fan-in:** consider whether `generate_pool.ret_equippable()` should adopt D7 rules before sub-phase 4 universe measurement (baseline desync).
3. **Optional:** add world-boss zone aliases for Doomwalker/Kazzak if world drops matter for membership.
4. **Optional:** expose `scripts/measure_atlasloot_gap.py` if delegator wants a permanent re-run command (measurement was run inline per plan 4.2).
