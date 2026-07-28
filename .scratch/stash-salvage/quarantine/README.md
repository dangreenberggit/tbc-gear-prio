# Quarantine index (`from-stash/`)

Frozen copies from `stash@{0}` — **not wired to tip**. See [UNRESOLVED.md](./UNRESOLVED.md) before touching anything.

| File | Description |
|------|-------------|
| `generate_pool.py` | EP top-12/slot generator → `ret.generated.json` |
| `curate_ret_pool.py` | HAND sources + FORCE includes → curated `ret.json` |
| `ret.generated.json` | Generator output at stash time |
| `ret.json` | Curated EP membership pool (~12/slot) |
| `cli.ts` | Stash rank CLI: `data/pools/ret.json`, `--full-pool` |
| `rank.ts` | Stash rank core: `prefilterPool` / `fullPool` |
