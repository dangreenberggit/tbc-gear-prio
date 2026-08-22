Status: open
Type: bug (pool coverage — worn items absent from the candidate pool)
Origin: `gate-sme` seat 1, 2026-08-21, on the Stage 2 gate shortlists; handoff at
  `.scratch/handoffs/sme-rank-judgment-stage2-close-shortlists.md` (verdict
  `do-not-trust` on shredzepelin)
Blocks: PLAN.md §14 Stage 2 gate — "≥3 real characters produce believable shortlists"
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

The SME seat identified two distinct gaps. Both are **its measurements, not yet
independently re-derived** beyond the warnings above:

1. **Holiday-event loot is invisible to the pool.** shredzepelin's worn neck and
   back are Ahune items with ids `278827` and `278819`. No item with `id > 100000`
   enters any pool in the three runs — observed pool max is 33058.
2. **Heroic-dungeon drops are excluded wholesale.** Counting the nexess pool by
   drop difficulty gave 177 items at difficulty 1 and exactly 1 at difficulty 2.
   Quality is not the filter: 9 blues are in the pool. This is the stated cause of
   shredzepelin's waist and nexess's wrist gaps.

## Acceptance

- [ ] The two causes above are confirmed or refuted against the pool-building code
      with a re-runnable command.
- [ ] A character's worn item is in the pool for its own slot, or the rows in that
      slot are withheld from the shortlist rather than shown with an empty-slot delta.
- [ ] Regenerating shredzepelin at p2 yields a shortlist whose above-cutoff rows are
      measured against worn gear, and an SME seat re-reads it.
