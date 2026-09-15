# Regen prediction — step 8 (fork commit + re-pin)

Written **before** editing the lock or running any generator
(`data-pipeline-work` rule 2). The fork commit touches only:

- `ui/core/components/individual_sim_ui/upgrades_tab.tsx` (the two `data-runner`
  statements, step 3)
- `ui/core/components/individual_sim_ui/upgrades/tools/run-tab-cdp.mjs` (new,
  step 4)
- `ui/core/components/individual_sim_ui/upgrades/tools/README.md` (section,
  step 4)

Nothing under `upgrades/engine/` changes, so no `PROVENANCE.md` row moves and no
ported-file drift cycle applies (C16).

## Predicted changed paths in `git -C <core> status --porcelain` after re-pin + regen

| Path | Predicted change |
| --- | --- |
| `data/wowsims-fork.lock.json` | `commit` → new fork tip; `pushed` → `false`; dated `_comment` appended |
| `data/sim-implemented-effects.json` | **only** its embedded `forkCommit` field; the implemented/stub counts stay **218 / 451** (same as at 2781486d6, per the lock's own bbad1b8a4/2781486d6 notes) |

## Predicted unchanged (checked, not assumed)

| Path | Why unchanged |
| --- | --- |
| `data/equip-eligibility.json` | generated from `canEquipItem` over the fork db; the harness commit touches no engine/db source |
| `data/gems/meta-conditions.json` | hand copy of `gems.ts`; unchanged upstream |
| `data/presets/*/*.ep-weights.json` | hand copies of preset symbols; unchanged |
| any `PROVENANCE.md` row | nothing under `upgrades/engine/` touched |

Any path in `git status` not in the first table is a surplus to explain here
before committing.

## Reconciliation (after running the regen)

- `data/sim-implemented-effects.json`: the committed diff is **exactly one line**
  — `forkCommit` `2781486d6...` -> `eb040855c...`. The implemented/stub counts
  did **not** change. Prediction shape correct.
- **Count correction:** the prediction said counts stay "218 / 451" citing the
  lock's historical note. The actual committed count at base `654a53b6` was
  already **221 / 451** (`implementedEffectItemIdsCount: 221` at HEAD, unchanged
  by my regen — verified against `git show HEAD:`). The generator's stdout "221
  implemented" reports the current count; my change did not move it. The "218"
  was a stale figure in the lock's older `_comment` lines; nothing in this chunk
  changed the count. No surplus, no engine file touched.
- `data/equip-eligibility.json`, `data/gems/meta-conditions.json`,
  `data/presets/*/*.ep-weights.json`: unchanged (checked below).
