# data/pools/

**Removed.** The CLI's ranking membership is only
`data/universes/<spec>-p<phase>.json`, one file per spec for each of phases
2 to 5 (built by `pnpm universe:assemble` / `scripts/assemble_universe.py`).
The Upgrades tab reads neither folder: it builds its pool at run time
(ADR-0038).

The old EP top-N files (`ret.json`, `ret.generated.json`) and
`scripts/generate_pool.py` / `curate_ret_pool.py` were deleted after a
detached plan review found the curated file shipped bows/guns and a
Kael’thas temp legendary while tests only guarded the universe path.
