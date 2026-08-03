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

## Measured 2026-08-02 — the join does not exist in the committed inputs

The "done when" allows "an explicit empty list with measurement." This is
that measurement, and the answer is that the map **cannot be built from what
this repo pins**, not that it is empty.

**13 crafted rows ship in `ret-p3.json`** — Lionheart Executioner (the worn
weapon), Stormherald, Red Belt of Battle, Bulwark of the Ancient Kings,
Swiftstrike Shoulders and eight more. All carry `{"kind": "crafted",
"profession": N}` with no `recipeZone`, exactly as the ticket says.

Both halves of the two-hop are present. **The link between them is not.**

- **db.json** gives a crafted item only `{"profession", "spellId"}` — e.g.
  Lionheart Executioner is `{"profession": 2, "spellId": 36259}`. There is no
  recipe-item table: `db.json` holds 0 items whose name contains
  recipe/pattern/plans, and `spellEffects` (17 rows) has no entry for 36259.
  So the spellId dead-ends.
- **AtlasLoot** *does* carry raid-dropped recipes — 45 entries under a
  `"Patterns"` pseudo-boss, 16 in Black Temple and 29 in Sunwell Plateau.
  But those ids (32736, 32737, …) are the **recipe items**, which db.json
  does not contain, and **none of the 13 crafted products appears in
  `atlasloot_sources.json` at all**.

So one side has products with no recipe, the other has recipes with no
product, and nothing joins them. Populating `recipeZone` needs a third
input — a recipe→product map (Wowhead spell pages, or an AtlasLoot recipe
block that names what each pattern teaches).

### Not done, and why that is the right call for now

Adding `recipeZone` to the `ItemSource` crafted variant is a five-minute
change, but it would be a field nothing can populate. The measurement above
is the useful half; the schema change should land with the data that fills
it, or it ships a permanently-null field and a false suggestion that the
attribution works.

**Scope note:** the 45 AtlasLoot patterns are Black Temple (p3) and Sunwell
(p5). Whether raid-recipe crafts belong in a raid-scoped universe at all is
the same question ticket 17 flagged for badge/craft/rep items, and has the
same answer: it needs a decision, not a quiet widening.

## Done when

- A verified craft/recipe map exists (or an explicit empty list with
  measurement that none apply for ret at the current maxPhase).
- `ItemSource` crafted variant can carry `recipeZone` when known.
- Assembler includes those items under the correct phase union.
