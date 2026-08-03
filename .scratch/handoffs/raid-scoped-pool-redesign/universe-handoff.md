# Universe assembly — worker handoff

**Date:** 2026-07-28  
**Branch:** `phase-1/w-universe`  
**Base:** `82bd24bef75a815c14f9815305d9ba21d66529e7` (HEAD matched; no correction)

## Deliverables

| Artifact | Status |
|----------|--------|
| `scripts/assemble_universe.py` | Done |
| `data/universes/ret-p2.json` | Done — 224 entries |
| `data/universes/ret-p3.json` | Done — 347 entries |
| Sidecar reports | `data/universes/ret-p{2,3}.report.json` |
| This handoff | Done |

## D7 eligibility

`generate_pool.ret_equippable()` is **still plate-only** on armor slots. D7 rules (plate/leather/mail body, 2H non-polearm/staff weapons, libram ranged, Kael temp legendary exclusion, rare+) are implemented in `assemble_universe.py` only. Measured D7-eligible total: **4212** items (matches spike `size_universe.cjs`).

## Assembly procedure

1. Start from D7-eligible `db.json` items (4212).
2. Merge sources per item: `db.json` direct, `data/atlasloot_sources.json`, `data/two-hop/ret-tokens.json` (token kind with token drop zone), Wowhead list entries for applicable stages (`p1-p2` at maxPhase 2; `p1-p2` + `p3` at maxPhase 3).
3. Phase filter: **union** carryover — zone names from `data/phase_raids.json` with `phase <= maxPhase`.
4. Membership: item included if any source zone hits the phase union **or** Wowhead list-only (badge/PvP/crafted/rep without raid zone).
5. Build failure if any output row has empty `sources[]` (0 violations in both outputs).

## Measured counts (rerunnable)

```bash
python scripts/assemble_universe.py --max-phase 2
python scripts/assemble_universe.py --max-phase 3
```

### maxPhase 2

| Metric | Value |
|--------|------:|
| Phase zones (union) | Karazhan, Gruul's Lair, Magtheridon's Lair, SSC, TK |
| Universe total | **224** |
| D7 eligible (no phase filter) | 4212 |
| Excluded (no source at all) | 2326 |
| List-only membership (badge/PvP/crafted) | 12 |
| Zone-matched membership | 212 |
| Wowhead list IDs considered | 86 (`p1-p2.json`) |

**Per slot:** back 18, chest 15, feet 22, finger 21, hands 17, head 15, legs 12, neck 16, ranged 2, shoulder 14, trinket 24, waist 22, weapon 8, wrist 18.

**Source record adds (non-exclusive; an item may have several):** db 1857, atlasloot 357, two-hop 18, wowhead 32.

**Items by primary origin (exclusive, one bucket per item):** db 208, two-hop 10, wowhead-only 6.

**D7 armor in universe:** leather 40, mail 40, plate 55 (non-null armorType body slots + mixed).

**Tier pieces:** 10 expected (T4+T5 token zones in phase union), **10 present**, 0 missing.

**vs spike lower bound:** spike measured ~201 items at maxPhase 2 using db zones only (`.scratch/loot-universe-spike/size_universe.cjs`). This assembly is **+23** — AtlasLoot overlap, two-hop tier pieces, and Wowhead list-only badge/PvP entries.

### maxPhase 3

| Metric | Value |
|--------|------:|
| Phase zones (union) | above + Black Temple, Hyjal Summit |
| Universe total | **347** |
| Excluded (no source) | 2322 |
| List-only membership | 21 |
| Wowhead list IDs | 123 (`p1-p2` + `p3`) |

**Per slot:** back 26, chest 27, feet 35, finger 30, hands 25, head 23, legs 20, neck 22, ranged 3, shoulder 25, trinket 28, waist 36, weapon 14, wrist 33.

**Source record adds:** db 1857, atlasloot 357, two-hop 18, wowhead 62.

**Exclusive primary origin:** db 323, two-hop 15, wowhead-only 9.

**D7 armor:** leather 66, mail 66, plate 92.

**Tier pieces:** 15 expected (T4+T5+T6 BT/Hyjal), **15 present**, 0 missing.

**vs spike lower bound:** ~310 db-only → **+37**.

## Junk filter (measured on assembled universe; no sim recall)

Full-universe sim against `.scratch/ep-vs-sim/measure.ts` was **not run** this slice (optional per exit criteria; 224–347 items is affordable but out of scope for this worker pass).

Junk filter definition matches sub-plan §2.2 (caster-only stat reject with ranged/trinket exempt; EP 10th-percentile floor in weapon/feet/waist/hands/wrist only). Counts from `assemble_universe.py` sidecar:

| maxPhase | Universe | Caster reject | EP floor reject | Combined reject | Combined keep |
|---------:|---------:|--------------:|----------------:|----------------:|--------------:|
| 2 | 224 | 69 (30.8%) | 11 | 80 (35.7%) | 144 |
| 3 | 347 | 114 (32.9%) | 16 | 130 (37.5%) | 217 |

**False-negative rate vs simulated ΔDPS: untested** (no sim ground truth produced).

**Narrowing rule outcome:** universe is already sim-sized (hundreds). **No EP-percentile or top-N narrowing rule ships.** Zone scoping does the sizing work; junk filter removes real junk but its recall on upgrades was not validated here — defer full recall measurement to sub-phase 5 wiring or a dedicated sim pass if owner wants it before rank wiring.

## AtlasLoot gap (confirmed downstream)

Per atlasloot handoff: AtlasLoot resolves **0/673** equippable gap items directly. All 18 tier pieces enter via **two-hop** token map (`data/two-hop/ret-tokens.json`), not `atlasloot_sources.json`.

## Verification

```bash
python scripts/assemble_universe.py --max-phase 2   # exit 0, 224 entries
python scripts/assemble_universe.py --max-phase 3   # exit 0, 347 entries
python -c "import json; u=json.load(open('data/universes/ret-p2.json')); assert all(e['sources'] for e in u['entries'])"
```

## Notes

- Wowhead `pre-raid.json` is not merged into p2/p3 universes (raid-scoped outputs only).
- List-only badge/PvP items lack raid zones by design; tracked via `listOnlyMembership` in report JSON.
- GPL-2.0 AtlasLoot licence question remains open (see atlasloot handoff).
- `generate_pool.ret_equippable()` D7 adoption deferred to sub-phase 5 / fan-in if desired.

## Suggested follow-ups

1. **Sub-phase 5:** wire `data/universes/ret-p*.json` into rank path; drop EP membership default.
2. **Optional sim pass:** point `.scratch/ep-vs-sim/measure.ts` at assembled universe for maxPhase 2; run junk-filter recall with weak-libram fixture swap per sub-plan §4.
3. **Fan-in:** adopt D7 in `generate_pool.ret_equippable()` to align generator baseline with universe eligibility.
