# Rank wiring — worker handoff

**Date:** 2026-07-28  
**Branch:** `phase-1/w-rank-wiring`  
**Base:** `36da6411e088dcb0ed1a8687d7d58f901931d594` (HEAD matched; no correction)

## Deliverables

| Artifact | Status |
|----------|--------|
| Remove EP prefilter / `fullPool` | Done — `prefilterPool`, `EP_PREFILTER_LIMIT`, `RankInput.fullPool` deleted |
| Universe → rank path | Done — CLI loads `data/universes/ret-p{maxPhase}.json` via `poolFromUniverse` |
| `PoolEntry.ep` → `curationHint` | Done — type + JSON + generator/curator/assembler scripts |
| Report-time `--raid` | Done — `filterByZone` on ranked items; validates zone against `zonesInPool` |
| Kael temp filter | Done — `isKaelTempLegendary` in `kael-temp.ts`, applied in `rankUpgrades` |
| Tests | Done — pool filters, universe load (224), rank seam tests green |
| This handoff | Done |

## What changed (by file)

| File | Change |
|------|--------|
| `packages/core/src/pool.ts` | Removed prefilter; added `curationHint`, `UniverseEntry`, `poolFromUniverse`, `filterByZone` / `filterPoolByZone`, `zonesInPool` |
| `packages/core/src/rank.ts` | Candidates = phase filter + Kael strip only; no EP cut |
| `packages/core/src/cli.ts` | Universe load; `--max-phase`, `--raid`; removed implicit ~80-pool semantics from log line |
| `packages/core/src/kael-temp.ts` | New — 7 temp legendary IDs (matches `assemble_universe.py`) |
| `packages/core/src/index.ts` | Updated exports |
| `packages/core/test/pool.test.ts` | Zone/universe tests; prefilter tests removed |
| `packages/core/test/pool-file.test.ts` | Accepts legacy `ep` or `curationHint` in curated pool JSON |
| `data/universes/ret-p{2,3}.json` | `ep` → `curationHint` (224 / 347 entries) |
| `data/pools/ret.json`, `ret.generated.json` | `ep` → `curationHint` (legacy curated pool; CLI no longer loads this) |
| `scripts/{generate_pool,curate_ret_pool,assemble_universe}.py` | Emit/read `curationHint` |

## Integration choices (locked this slice)

| Decision | Choice |
|----------|--------|
| D2 EP double-gate | **Removed** — rank sims full phase-filtered universe |
| Raid view | **Report-time** — full universe simmed; `--raid` slices displayed items only |
| Pool file | **Universe** — `ret-p{maxPhase}.json`, not `data/pools/ret.json` |
| `curationHint` | Renamed from `ep`; rank path ignores it |

## Measured universe sizes (from sub-phase 4, unchanged)

| maxPhase | Entries |
|---------:|--------:|
| 2 | **224** |
| 3 | **347** |

Re-verify: `python scripts/assemble_universe.py --max-phase 2` → 224.

## Wall-clock impact

**Untested this slice.** Per sub-plan §5, per-sim latency was not measured (`time npx tsx .scratch/ep-vs-sim/measure.ts` not run). Candidate count scales ~2.8× (80 → 224) at maxPhase 2 and ~4.3× (80 → 347) at maxPhase 3 vs the old EP top-80 cap — acceptable per universe-handoff judgment unless measured latency says otherwise.

## Verification

```bash
pnpm --filter @tbc-gear-prio/core test   # exit 0
python -c "import json; u=json.load(open('data/universes/ret-p2.json')); assert len(u['entries'])==224"
grep -r 'prefilterPool\|fullPool\|EP_PREFILTER_LIMIT' packages/core   # no matches
```

## Notes

- `--raid` uses exact zone string match (`Karazhan`, `Serpentshrine Cavern`, etc.) from `PoolEntry.source.zone`; badge/PvP/crafted rows without zone never appear in a raid view.
- Universe loader picks `sources[0]` as primary `source`; multi-source rows retain full provenance in JSON but rank display uses one source.
- `data/pools/ret.json` kept for legacy tests / curation pipeline; rank CLI no longer reads it.

## Suggested follow-ups

1. **Sub-phase 6 (hardening):** junk-filter recall sim pass; optional `--max-phase 1/4/5` universe files if needed.
2. **Wall-clock:** run `time npx tsx .scratch/ep-vs-sim/measure.ts` against assembled universe; escalate only if intolerable — do not resurrect EP prefilter.
3. **Fan-in:** merge `phase-1/w-rank-wiring` onto `phase-1/five-seed-spread` after sub-phase 6.
