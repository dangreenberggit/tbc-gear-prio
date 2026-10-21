Status: closed
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

## Progress, 2026-10-18 (fix round after the pre-merge review)

Done in fork `bc3cca6a1` (pinned by `tbc-gear-prio@ef9d6ffd`, fixtures
re-recorded in `bb984a99`), no behaviour change:

- CQ1: both comments now say the owner chose the policy (answer "1").
- CQ2: `pool_source.ts` cites the cells fixture's `_comment` and ADR-0038 in
  place of the gitignored script, the unsourced "5.4x" and "plan-review M1".
- CQ4: one `isHeroicFiveManDrop` in `utils/item_sources.ts`, used by
  `sourceOfEntry` and `isHeroicFiveManOnly`.
- CQ5: one `knownPhase` lookup; the floor, `selectPool`'s preset phases and
  `itemPhaseLookup` all read a missing phase as none.
- CQ7 (fork part): `poolSourceFor` returns `name`, not `file`;
  `UpgradesResults.tsx` tests `poolFor(...).length === 0` directly. Building
  the pool there is kept: it runs only for a finished run with no rows, and
  nothing cheaper says whether the pool is empty.
- R2-2: `alt_badge` removed from `assets/locales/en/upgrades.json` and
  `schemas/upgrades.schema.json` (both fork-added); after ticket 686 nothing
  reads it.

Ruled out: CQ3's `model/engine/types.ts:20` comment and the `'Alt'` member
in `engine/pool.ts` and `engine/rank.ts`. Those are ported text from
`packages/core/src/types.ts:12`, `pool.ts:139,165` and `rank.ts:262`, where
this repo's builder still makes universes and `Alt` tags; changing only the
copy would make the fork's engine differ from its source for a comment.

Still open:

- CQ6: `poolFor` reads presets from the host while `bisTagPhaseFor` and
  `presetsWithPhase` take them as arguments, and `assumptions.ts` and
  `useUpgradesSettings.ts` walk them again. Changing `poolFor`'s signature
  touches its 5 production callers (`run.ts`, `follow_phase.ts`,
  `assumptions.ts`, `useUpgradesSettings.ts`, `UpgradesResults.tsx`) and 5 test
  mocks; not cheap enough for
  this round.
- CQ7 (main part): the `fork-universes:*` script and gate names still say
  "universes" (80 tracked files mention them).

## Closed, 2026-10-20 (stage dps-spec-coverage)

Verified by: tbc-new-fork@c89b0b912 (CQ6), pinned by
tbc-gear-prio@cf13cfd2; re-run `git -C <pair>/vendor/tbc-new-fork show --stat c89b0b912`

- CQ6 done: `poolFor(host, presets, maxPhase)` takes the preset gear sets as
  an argument. `run.ts`, `follow_phase.ts`, `assumptions.ts` and
  `UpgradesResults.tsx` pass the page's presets; `useUpgradesSettings` passes
  the phase-filled presets it already builds for `settingsOffer` and
  `bisTagPhaseFor`. No behaviour change. `pnpm verify` and the full fork
  vitest passed at that commit (stage execution report, chunk K3).
- CQ7 main part ruled out: renaming the `fork-universes:*` scripts and gates
  changes nothing the tab shows, the pool, or gate correctness, so it falls
  outside the scope filter the owner set on 2026-10-17. `git grep -l
  fork-universes | wc -l` gives 62 tracked files on this branch.
- The six tab fixtures were re-recorded in the same stage, at the final fork
  commit (Step 9 of `.scratch/stage-gate/dps-spec-coverage/plan.md`).
