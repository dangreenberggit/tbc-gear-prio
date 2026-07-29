Status: resolved
Type: task
Origin: docs/reviews/phase-1-five-seed-spread.md
Blocks: none
Blocked by: none

# Retire EP top-N membership in generate_pool / curated ret.json

## Problem

Raid-scoped plan S4 / §11: no EP top-N membership anywhere. Rank CLI loads
`data/universes/ret-p*.json`, but a dual path (`generate_pool.py` +
`data/pools/ret.json`) invited regressing to EP membership.

## Resolution

**2026-07-28 (demote):** scripts marked DEPRECATED; README pointed at
universes; pool-file tests stopped treating ~12/slot as membership.

**2026-07-28 (delete — planner review defects 1–2):** Removed
`data/pools/ret.json`, `ret.generated.json`, `scripts/generate_pool.py`,
`scripts/curate_ret_pool.py`, and `pnpm pool:generate` / `pool:curate`.
The curated file had shipped bows/guns and Kael temp legendary 30318 while
tests only guarded the universe path. Single membership pipeline is
universes only.

Follow-ons already split: 12 (bisTags), 13 (raid-recipe crafts).
