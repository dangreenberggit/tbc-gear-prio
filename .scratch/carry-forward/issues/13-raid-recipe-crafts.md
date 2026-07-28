Status: open
Type: task
Origin: docs/reviews/phase-1-five-seed-spread.md (split from 11)
Blocks: none
Blocked by: none

# Raid-recipe crafted items in the universe (two-hop crafts)

## Problem

Ret-relevant crafted items whose recipe drops in a raid are part of the
shopping-list universe. Only tier token→piece two-hop shipped
(`data/two-hop/ret-tokens.json`). Crafted `ItemSource` still lacks
`recipeZone`, so raid views cannot attribute those crafts.

## Done when

- A verified craft/recipe map exists (or an explicit empty list with
  measurement that none apply for ret at the current maxPhase).
- `ItemSource` crafted variant can carry `recipeZone` when known.
- Assembler includes those items under the correct phase union.
