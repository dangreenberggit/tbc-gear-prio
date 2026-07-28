# Two-hop token map — handoff

**Date:** 2026-07-28  
**Status:** success (tier tokens); raid-recipe crafts still open

## What I did
- Built `data/two-hop/ret-tokens.json` for all **18** ret tier pieces
- Token drop zone/boss from AtlasLoot (`data/atlasloot_sources.json`)
- pieceId/tokenId verified via Wowhead; `tokenId !== pieceId` for every row

## Black Temple filter (exit criterion)
Pieces whose tokens drop in Black Temple: 30997, 30990, 30993 (shoulders, chest, legs). Gloves token is Hyjal (Azgalor); helm token is Hyjal (Archimonde); SWP tokens for bands/girdle/boots.

## Still open
- Raid-recipe crafted items enumeration (sub-phase 2 §4) — not done this wave
- Schema `tokenId` on `ItemSource` type in packages/core — deferred to sub-phase 5/6
