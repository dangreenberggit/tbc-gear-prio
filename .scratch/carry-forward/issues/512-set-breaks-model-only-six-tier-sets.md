Status: open
Type: bug
Origin: docs/reviews/feat-tab-signoff-followups.md (targeted engine review 2026-09-25, finding D3)
Blocks: none
Blocked by: none
Related: 452, 467, 476

# Set breaks model only six tier sets, and only at 2pc and 4pc

## Evidence

From the domain axis of the targeted engine review
(`.scratch/stage-gate/upgrades-tab-closeout/engine-review/domain.md`, D3):

- The fork's `IMPLEMENTED_IN_SIM` table
  (`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/set-value.ts`)
  lists six tier sets: Justicar, Crystalforge, Lightbringer, Malorne,
  Nordrassil, Thunderheart. `isBonusImplemented` is false for every other
  set, so `brokenSetBonuses` never reports a break of one.
- The sim also implements Wastewalker 2pc and 4pc, Burning Rage 2pc, and
  Primal Intent 3pc (`sim/common/tbc/items_sets.go`).
- The feral `pre_raid.gear.json` preset wears Wastewalker 4pc. The ret
  `preraid.gear.json` preset wears Ragesteel 2pc (Burning Rage).
- A phase-1 run starts from that gear (the project's default: previous
  phase preset). The path to Malorne 4pc then takes Wastewalker to 1 piece
  or fewer and loses its 2pc, and nothing charges that loss.
- `SetThreshold = 2 | 4` cannot represent a 3pc bonus such as Primal
  Intent's.

## What would close this

1. The break model covers every set bonus the pinned sim implements that a
   supported DPS spec can wear, including non-tier sets, and can represent
   a 3pc threshold.
2. The table is re-verified against the Go source at the fork's pin, with
   the command recorded.
3. A fixture in `packages/core/test/fork-set-net.test.ts` in which a
   Thunderheart or Malorne package breaks a worn Wastewalker 2pc, with the
   break measured and charged. Literals derived by hand in
   `docs/set-bonus-fixture-derivations.md`.
