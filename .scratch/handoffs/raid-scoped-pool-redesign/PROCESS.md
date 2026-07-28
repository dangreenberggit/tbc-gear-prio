# Raid-scoped pool — fan-out process

**Feature branch:** `phase-1/five-seed-spread`  
**Base SHA (wave 1):** `9f6c49616a154de80f855e503906fcc2b38ad811`  
**Parent plan:** `.scratch/handoffs/raid-scoped-pool-plan.md`  
**Date:** 2026-07-28  
**Status:** Wave 1 in progress (sub-phases 1 + 3 parallel; 2 after 3)

## Locked decisions (sub-phase 0 — owner accepted via "chug through")

| # | Decision | Locked value |
|---|----------|--------------|
| 1 | Carryover | **Union** — all raids with phase ≤ maxPhase |
| 2 | Badge vendors | **Include** via hand-authored `{kind:"badge"}` list |
| 3 | PvP gear | **Include**, `source.kind: "pvp"`, separate view from raid |
| 4 | Quality floor | **Rare+** (no epic-only rule) |

Do not re-open without asking the owner.

## Wave 1 partition

| Slice | Branch | pathsAllowed | pathsForbidden | Depends |
|-------|--------|--------------|----------------|---------|
| 1 AtlasLoot | `phase-1/w-atlasloot` | `scripts/sync_atlasloot.py`, `scripts/parse_atlasloot.py`, `data/atlasloot.lock.json`, `data/atlasloot_sources.json`, `data/phase_raids.json`, `.scratch/handoffs/raid-scoped-pool-redesign/atlasloot-handoff.md` | `packages/**`, `data/pools/**`, `data/wowhead-lists/**`, `scripts/curate_ret_pool.py`, `scripts/generate_pool.py` | none |
| 3 Wowhead lists | `phase-1/w-wowhead-lists` | `data/wowhead-lists/ret/**`, `.scratch/handoffs/raid-scoped-pool-redesign/wowhead-handoff.md` | `packages/**`, `scripts/**`, `data/pools/**`, `data/atlasloot*` | none |
| 2 Two-hop | `phase-1/w-two-hop` | `data/two-hop/**` (token map + raid-recipe crafts), `.scratch/handoffs/raid-scoped-pool-redesign/two-hop-handoff.md` | `packages/**` type edits (flag `tokenId` for fan-in), `data/pools/**` | **after slice 3** — verify extraction, do not rebuild from scratch |

**Shared manifests:** none of these slices own `package.json` / lockfiles / `packages/*/src/index.ts`. If a slice needs a barrel or package.json line, put the exact line in the handoff; fan-in applies it.

**Fan-in:** editorial (delegator). Conflict policy: path ownership above; never resolve by inventing pool membership.

**Licensing (slice 1 exit):** raise GPL-2.0 AtlasLoot pin with owner in handoff Notes — do not silently decide to publish or withhold.

## Wave 2 (after 1+2+3 merged)

4 universe → 5 rank wiring → 6 hardening (sequential; see parent plan §8).

## Stash note

Delegator stashed unrelated ranking/pool WIP before fan-out:

```
git stash list   # "phase-1 ranking/pool WIP before raid-scoped fan-out"
```

Restore after wave 1 merge only if still needed; prefer not to re-apply until wave 2 knows whether that WIP conflicts with new membership.
