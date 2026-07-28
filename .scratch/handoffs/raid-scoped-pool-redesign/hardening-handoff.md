# Hardening — worker handoff

**Date:** 2026-07-28  
**Branch:** `phase-1/w-hardening`  
**Base:** `a20f65459d1b2d6028b5d09ac8521c9a64a695cd` (HEAD matched; no correction)

## Status

partial — S6, specific-ID regressions, source gate, and doc fixes land; two planned
assertions remain `it.todo` (30257 source gap; 12/36 wowsims curated IDs still
excluded for missing sources / quality).

## What I did

- Added `packages/core/test/pool-hardening.test.ts` — universe (`ret-p3.json`) regression
  suite: S6 bisTags independence, empty-sources check, wowsims vendor shape + 24
  admitted IDs, ranged libram-only via `RangedWeaponTypeLibram`, Kael temp loop +
  Twinblade 29993, leather/mail 30106/30104 with `ArmorType` cross-check, 15/15
  phase-3 tier pieces with two-hop token zone attribution.
- Extended `packages/core/test/pool-file.test.ts` — S6 bisTags tests on legacy
  `data/pools/ret.json` through `filterPoolByPhase` and `filterPoolByZone`.
- Exported `KAEL_TEMP_LEGENDARY_IDS` from `kael-temp.ts` / `index.ts` for tests.
- Fixed `scripts/generate_pool.py` docstring and `WEAPON_POLEARM` inline comment
  (staff = equip rule; polearm = product scope per PLAN.md D8).
- Added per-phase refresh runbook comment block on `TRACKED` in
  `scripts/sync_wowsims.py`.

## Paths touched

- `packages/core/test/pool-hardening.test.ts` (new)
- `packages/core/test/pool-file.test.ts`
- `packages/core/src/kael-temp.ts`
- `packages/core/src/index.ts`
- `scripts/generate_pool.py`
- `scripts/sync_wowsims.py`
- `.scratch/handoffs/raid-scoped-pool-redesign/hardening-handoff.md`

## Verification

```bash
git log -1 --format=%H   # a20f65459d1b2d6028b5d09ac8521c9a64a695cd → branched
pnpm --filter @tbc-gear-prio/core exec vitest run   # 80 passed, 2 todo
python scripts/assemble_universe.py --max-phase 2   # exit 0, 224 entries
python scripts/assemble_universe.py --max-phase 3   # exit 0, 347 entries
python -c "import json; u=json.load(open('data/universes/ret-p3.json')); assert all(e['sources'] for e in u['entries'])"
```

## Notes / concerns

- **S6:** Proven mechanically on universe + curated pools; `bisTags` remain
  display-only (`rank.ts` copies after candidate fix — unchanged).
- **Missing source gate:** `assemble_universe.py` exits 2 on empty `sources[]`;
  universe JSON tests assert every row resolves; CI gate is `pnpm verify` test
  run (no new npm script).
- **30257 (Shattrath Leggings):** D7-eligible leather legs but `db.json` has no
  `sources`, AtlasLoot/Wowhead lists omit it — correctly excluded from universe;
  test left as `it.todo` per 06-hardening §2.4.
- **Wowsims curated sets:** 24/36 IDs present in `ret-p3`; 12 excluded —
  `23522, 27484, 27985, 28176, 28288, 28429, 29119, 29177, 30257, 30341,
  30834, 33173` — mostly zero-source rows or green-quality (`30341`); full
  36/36 admission test is `it.todo` (06-hardening §2.1).
- **Tier pieces:** All 18 exist in `db.json`; at maxPhase 3 expect **15**
  (Sunwell 34431/34485/34561 are phase 5 — excluded by design). All 15 carry
  `kind: "token"` primary source with zone matching `data/two-hop/ret-tokens.json`.
- **Junk-filter sim recall:** untested (optional per sub-plan; not run).
- **Legacy curated pool:** `data/pools/ret.json` still plate-heavy generator
  output; D7 leather/mail assertions target universe only.

## Suggested follow-ups

1. Add Wowhead/source rows for 30257 and the 12 wowsims-gap IDs, then flip todos green.
2. Assemble `ret-p4`/`ret-p5` universes when fan-in needs Sunwell tier coverage.
3. Optional sim recall pass on assembled universe (`.scratch/ep-vs-sim/measure.ts`).
4. Fan-in: merge `phase-1/w-hardening` onto `phase-1/five-seed-spread` after review.
