Status: closed
Type: bug
Origin: docs/reviews/fix-random-suffix.md
Blocks: none
Blocked by: none

# Random-suffix candidates are simmed with no suffix

What the player sees: the twelve Karazhan trash epics that come with a random
suffix (Lurker's, Glider's and Ravager's belts, boots and bracers, ids
30675-30687) are ranked as if they had only their armor. Their rows sit near
the bottom or below the cutoff, where a good suffix ("of the Beast", "of the
Bandit") would make some of them real upgrades.

Found while fixing the worn-suffix drop on `fix/random-suffix` (agent report
`.scratch/agent-reports/2026-11-22-general-task-random-suffix.md`). That
branch makes a *worn* suffix reach every request; a *candidate* has no suffix
to carry, because the pool holds item ids only (`PoolEntry`,
`ui/features/upgrades/model/engine/pool.ts`).

## Evidence

- `db.json` has 12 epic items with `randomSuffixOptions` (20-28 options
  each); all are item level 115, phase 1, so `selectPool` keeps them
  (`MIN_QUALITY` epic, `MIN_ILVL` 100, `pool_source.ts`).
- Live ret run, P2 gear, tab phase 3 (`.scratch/random-suffix/before-readback.json`,
  `summary.candidateSuffixCalls`): 11 tab requests put one of these items in
  as a candidate, each as `{ id }` or `{ id, enchant }` with no
  `randomSuffix` and no `randomSuffixes` database row.

## What wowsims does

- The gear picker ranks a suffix item by its best suffix option's EP
  (`computeItemEP`, `ui/sim/player/player.ts:1198-1203`: "use the suffix
  option with the highest EP for the purposes of ranking items in the
  picker").
- Bulk sim sims whatever `ItemSpec` the player added, suffix included
  (`makeBulkGearDatabase`, `ui/sim/bulk/gear_database.ts:21-22`); it never
  sims a suffix item bare.

## Options

1. Sim each such item with its best-EP suffix (the picker's rule), and name
   the suffix on the row. One sim per item, as today. Recommended: it is
   wowsims' own rule, and costs nothing extra.
2. Sim every suffix option as its own row. About 26 extra sims per item a
   spec can wear (3 for a plate wearer is about 78 sims).
3. Leave these items out of the pool, with a note.

Either fix needs the pool entry, the candidate swap (`swapItemAt`,
`engine/gear-swap.ts`) and the row label to carry a suffix id.

## Closed (2026-11-22)

Fixed with option 1 on `fix/892-suffix-candidates` (fork `1676cdf81`). Each
candidate with random-suffix options is simmed with the suffix the player
wears on it, or else its option with the highest EP under the run's weights,
the gear picker's rule (`computeItemEP`, `ui/sim/player/player.ts:1188-1203`).
The row shows the item's name and the suffix's name, as the gear picker's item
cell does (`ItemDetailCell.tsx:111-112`), and its wowhead link and Batch Sim
entry carry the suffix. A worn or candidate suffix is now part of the ranking
key, so a run after a suffix change is simmed again.

Live ret run, P2 gear, tab phase 3
(`.scratch/suffix-cand/before-readback.json` and `after-readback.json` in the
main checkout): the 12 candidate requests went from no suffix to a suffix with
its database row each; Ravager's Bracers went from -48.3 to -7.4 ("of the
Tiger"), Glider's Greaves from -58.9 to -3.8, Lurker's Belt from -110.4 to
-55.6. None is an upgrade on P2 gear.

Verified by: `pnpm exec vitest run packages/core/test/fork-random-suffix.test.ts`
(RS-2 worn row name, RS-4 candidate suffix and name, RS-5 ranking key) and
tbc-new-fork@1676cdf81
