Status: closed
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

## Resolved 2026-08-03 — the join does exist; shipped

**The 2026-08-02 measurement below is superseded.** Every individual fact it
records is true, but its conclusion is wrong: it only ever tried to join on
**item ids**, and the recipe→product link is not carried by an id. AtlasLoot
records the product in the **trailing Lua comment** on each recipe loot row,
in the file this repo already vendors:

```
{ 3, 32736 }, -- Plans: Swiftsteel Bracers
{ 12, 32747 }, -- Pattern: Swiftstrike Shoulders
```

`scripts/parse_atlasloot.py`'s `LOOT_RE` captured `{slot, itemId}` and
discarded everything after the closing brace, which is why the mapping looked
absent. Re-run to reproduce the counts:

```
python scripts/parse_atlasloot.py
```

- 170 recipe comments in `vendor/atlasloot/data-tbc.lua`; 125 name a product
  that resolves to an id via `vendor/wowsims/db.json` `items[].name`.
- 49 products are enchants/gems/consumables (not equippable, correctly out).
- **67 crafted products have a recipe that drops in a `data/phase_raids.json`
  raid zone** → `data/two-hop/raid-recipes.json`.
- Of the 13 crafted rows in `ret-p3.json`, **6 join** (not 0): Swiftsteel
  Bracers, Bindings of Lightning Reflexes, Swiftstrike Shoulders → Black
  Temple; Red Belt of Battle, Belt of Deep Shadow, Belt of the Black Eagle →
  Serpentshrine Cavern (recipe also drops in Tempest Keep). The other 7 are
  genuinely vendor/rep/world-drop recipes.

**Independent confirmation the join is right:** for all 6, the recipe's raid
zone phase equals the phase the assembler had already independently assigned
the item (BT→3, SSC/TK→2). A wrong-recipe match would not agree. That
agreement is asserted, not just observed — see the second half of the
`attributes raid-dropped recipes` test.

### What shipped

- `scripts/parse_atlasloot.py` also emits `data/two-hop/raid-recipes.json`
  (67 entries). `data/atlasloot_sources.json` is byte-identical after the
  change (`git diff --stat data/atlasloot_sources.json` is empty).
- `ItemSource` crafted variant carries optional `recipeZone` / `recipeBoss`.
- `assemble_universe.py` enriches crafted sources inside `add_source`, so the
  attribution applies whichever input produced the source. A recipe dropping
  in several zones is attributed to the earliest-phase one.
- Regenerated p2/p3/p4/p5. **Membership is unchanged on all four tiers** —
  every one of these items was already in the universe via its list-driven
  crafted membership, so this is attribution only, and the pinned row counts
  (230 p2 / 354 p3) are untouched by design. Items gaining `recipeZone`:
  3 at p2, 6 at p3, 6 at p4, 11 at p5.

Regenerate with absolute paths, e.g.:

```
python scripts/assemble_universe.py --max-phase 3 \
  --out <abs>/data/universes/ret-p3.json --report <abs>/data/universes/ret-p3.report.json
```

### Known weakness

The join key is an English display string parsed from a hand-written Lua
comment, not an id. It fails in one direction only — a typo or upstream
rename drops a row silently; it cannot produce a *wrong* zone that also
agrees with the item's phase. The generated file is committed and the six p3
rows are pinned in `pool-hardening.test.ts` so a silent regression is caught.
A pure-id alternative exists (`AtlasLootClassic_Data/source-tbc.lua` carries
`[4]=spellID`, matching the `spellId` already on db.json crafted sources) but
would need adding to `TRACKED` in `sync_atlasloot.py`; **untested** — that
file's presence at the pinned commit was not verified.

## Superseded measurement 2026-08-02 — "the join does not exist"

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
