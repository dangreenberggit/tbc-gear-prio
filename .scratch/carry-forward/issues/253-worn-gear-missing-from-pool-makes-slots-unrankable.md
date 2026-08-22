Status: open
Type: bug (pool coverage — worn items absent from the candidate pool)
Origin: `gate-sme` seat 1, 2026-08-21, on the Stage 2 gate shortlists; handoff at
  `.scratch/handoffs/sme-rank-judgment-stage2-close-shortlists.md` (verdict
  `do-not-trust` on shredzepelin)
Blocks: phase-2
Blocked by: none

# Worn gear missing from the pool scores rows against an empty slot

## What happens

When a character's worn item is not in the candidate pool for its slot, that slot
is scored against an **empty slot** rather than against what the character is
wearing, so every candidate in it shows an inflated gain. The report discloses
this — `ranking.plausibilityWarnings` emits a `dead-slot` / `worn-unrankable`
entry naming the slot and the worn item — but the affected rows still appear in
the shortlist with their inflated deltas.

This is what made the Stage 2 gate stay open. On the 2026-08-21 regeneration,
shredzepelin had three unrankable slots (neck, back, waist), leaving **4 of his 14
above-cutoff rows** measured against real gear. nexess, on identical code, pool
and spec, had one (wrist) and was judged `trust-with-caveats`. The difference
between a usable and an unusable shortlist was entirely pool coverage.

Reproduce:

```
python -c "import json;r=json.load(open('.scratch/rank-reports/stage2-close-shredzepelin.json'))['ranking'];[print(w['slot'],w['cause'],w.get('wornItemName')) for w in r['plausibilityWarnings']]"
```

## Two causes found, both unverified as to fix

The SME seat identified two distinct gaps. **Both were independently re-derived
by the pre-merge domain axis on 2026-08-21 and both hold — but cause 1 is
described wrongly here, and the correction matters for whoever fixes it.**

1. **Holiday-event loot never reaches the pool — and the id ceiling is not why.**
   shredzepelin's worn neck and back are Ahune items `278827` (Amulet of Bitter
   Hatred) and `278819` (The Frost Lord's War Cloak). The original wording
   ("no item with `id > 100000` enters any pool") points at a numeric filter
   **that does not exist**, and would send a fixer to the wrong file.

   What is actually true: `data/items/index.json` **does** carry both items, and
   `test/fixtures/shredzepelin-cat.raw.json` carries both ids, so WCL reports
   them faithfully. They vanish in the **pool builder**, and the mechanism is
   missing source data — `data/atlasloot_sources.json` returns `null` for both,
   because holiday-boss loot is not in AtlasLoot's raid/heroic/rep tables.

   So this is a **source-data gap**, not an id filter.

2. **Heroic-dungeon drops are excluded wholesale.** Confirmed, and at a level
   independent of the SME's difficulty-field route. Girdle of the Deathdealer is
   `29247`, and `data/atlasloot_sources.json` gives it exactly
   `[{"dungeon": "The Black Morass", "kind": "heroic"}]` — correct TBC, it drops
   from Aeonus in Heroic Black Morass. Across the whole sources file: 903 `raid`,
   602 `heroic`, 518 `rep`, with 583 distinct items carrying a heroic source.
   Across all three rank reports the source kinds present are `raid`, `crafted`,
   `rep`, `token`, `badge`, `pvp`, `world`, `unknown` — **no `heroic` in any
   pool**. Re-runnable:

   ```
   python -c "import json,glob;   [print(f, sorted({s.get('kind') for it in json.load(open(f))['ranking'].get('items',[]) for s in (it.get('sources') or []) if s.get('kind')})) for f in sorted(glob.glob('.scratch/rank-reports/stage2-close-*.json'))]"
   ```

**So the three items split two ways, not one:** neck and back are missing source
data (holiday); waist is a filtered source kind (heroic). One filter explains
shredzepelin's waist and nexess's wrist together; a different gap explains the
other two slots. A fix aimed at only one of these leaves the box open.

## Acceptance

- [x] The two causes above are confirmed or refuted against the pool-building code
      with a re-runnable command.
      → **Both confirmed** by the pre-merge domain axis, 2026-08-21, with the
      commands above. Cause 1's description was corrected: it is a source-data
      gap, not an id ceiling.
- [ ] A character's worn item is in the pool for its own slot, or the rows in that
      slot are withheld from the shortlist rather than shown with an empty-slot delta.
- [ ] Regenerating shredzepelin at p2 yields a shortlist whose above-cutoff rows are
      measured against worn gear, and an SME seat re-reads it.
