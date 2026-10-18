Status: open
Type: task
Origin: pre-merge review feat/tab-wowsims-items, CQ1-CQ7 deferred parts and round 2 R2-2
Blocks: none
Blocked by: none
Serves: .scratch/plans/upgrades-tab-finish-line.md, Tab-adjacent follow-on
Related: 505

# Code-quality fixes left in the tab's fixture-input files

The review's code-quality pass did not edit fork files that
`scripts/check_tab_fixtures.py` `INPUT_PATHS` lists, nor ported engine files,
because any edit there marks the six recorded tab fixtures stale and forces
live re-records. Do these with the next change that re-records the fixtures
anyway. Fork paths are under `ui/features/upgrades/` unless stated, at fork
`527c0d798`.

- CQ1: `model/pool_source.ts:30` and `model/settings_pool.ts:77` call the
  option text "Add it, but leave it switched off" the owner's answer; the owner
  answered "1".
- CQ2: `model/pool_source.ts:5-8`, `:40` and `:82` cite a gitignored stage
  script, an unsourced "about 5.4x" figure and "plan-review M1".
- CQ3: `model/engine/types.ts:20` still says "universe" and allows `'Alt'`
  (ported engine file). R2-2: fork `assets/locales/en/upgrades.json:142`
  `"alt_badge"` and its schema entries have no reader since `ed7b40cac`.
- CQ4: the rule "heroic, and not Magisters' Terrace" is written twice,
  `model/pool_source.ts:94-97` and `utils/item_sources.ts:61-63`.
- CQ5: `model/pool_source.ts:73` treats a missing phase as Infinity;
  `:149-152` and `:203` use the raw phase.
- CQ6: `model/data/data.ts:104-139` passes presets inconsistently;
  `model/assumptions.ts:36` and `hooks/useUpgradesSettings.ts:69-71` repeat
  the walk.
- CQ7: `model/data/data.ts:115` `{ file: 'wowsims db' }` names no file;
  `components/UpgradesResults/UpgradesResults.tsx:69` builds the whole pool to
  test emptiness; the main repo's `fork-universes:*` names still say
  "universes" (80 tracked files mention them).

## Done means

Each item is fixed or ruled out with a reason, and the fixtures are
re-recorded in the same change.
