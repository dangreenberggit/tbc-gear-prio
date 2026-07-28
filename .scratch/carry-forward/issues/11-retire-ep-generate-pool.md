Status: resolved
Type: task
Origin: docs/reviews/phase-1-five-seed-spread.md
Blocks: none
Blocked by: none

# Retire EP top-N membership in generate_pool / curated ret.json

## Problem

Raid-scoped plan S4 / §11: no EP top-N membership anywhere; replace
`generate_pool.py` membership logic. Rank CLI loads
`data/universes/ret-p*.json`, but `scripts/generate_pool.py` still uses
`TOP_N = 12` EP and plate-only `ret_equippable`, and `data/pools/ret.json`
remains for curation/tests — a dual path that invites regressing to EP
membership.

Also still open from the redesign: BiS tag population on universe rows,
raid-recipe craft two-hop (`recipeZone`), and aligning D7 eligibility into
`generate_pool` if that script survives.

## Done when

- Membership for ranking has a single documented path (universes / assembler).
- EP generator is deleted, clearly demoted to a non-membership tool, or
  rewritten so it cannot be mistaken for the pool source of truth.
- Optional follow-ons (bisTags import, raid-recipe crafts) tracked here or
  split once started.

## Resolution (2026-07-28)

- Rank path remains universes only; `data/pools/README.md` states that.
- `generate_pool.py` / `curate_ret_pool.py` marked DEPRECATED; `pnpm
  pool:generate` / `pool:curate` exit with a pointer to
  `pnpm universe:assemble`.
- `pool-file.test.ts` no longer treats ~12/slot density as a membership
  gate; maxPhase↔palette test uses the universe.
- Follow-ons split to tickets 12 (bisTags) and 13 (raid-recipe crafts).
