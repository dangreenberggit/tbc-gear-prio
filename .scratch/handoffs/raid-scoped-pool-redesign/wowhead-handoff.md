# Wowhead list collection — handoff

**Date:** 2026-07-28  
**Branch:** `phase-1/five-seed-spread` (delegator collected; not a worker branch)  
**Status:** success

## What I did
- Collected ret BiS guides for `pre-raid`, `p1-p2`, `p3`, `p4`, `p5` into `data/wowhead-lists/ret/*.json`
- Captured headline + alternative sections; librams present on all raid pages
- Extracted via-token fields; Phase 3+ uses `Drop: <Token> - <Boss> (Zone)` (plain text, no item link) unlike Phase 2's `(via ...)` links
- Check B: every collected `itemId` exists in `vendor/wowsims/db.json` (0 missing)

## Counts
| stage | entries | viaTokenId |
|-------|---------|------------|
| pre-raid | 72 | 0 |
| p1-p2 | 86 | 10 |
| p3 | 89 | 8 |
| p4 | 96 | 7 |
| p5 | 118 | 9 |

## Notes
- Alternative sections on P2+ have full Source columns (plan assumed null) — kept source text
- Overlap measurement vs AtlasLoot universe deferred to sub-phase 4 (script not written)
- Lightbringer Breastplate guide row named wrong token (Vanquished); corrected in `data/two-hop/ret-tokens.json`
