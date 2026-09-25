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

## Comments

2026-09-25 (round 2e-1 measurements): both proposed designs for this
ticket were rejected in plan review, and the measurements found that the
set-bonus figure itself has a gear-dependent error (ticket 514), so the
redesign is handed to a future session:
`.scratch/handoffs/511-512-set-credit-redesign.md`, with all sources in
`.scratch/handoffs/511-512-set-credit-redesign/`. Measured break values
(10000 iterations): Wastewalker 2pc about 26 to 28 DPS at 2, 3 and 4
pieces worn, Wastewalker 4pc 21.41 ± 1.48 at 4 worn, Burning Rage 2pc
0.34 ± 2.23 on the ret pre-raid gear (ticket 516). Fel Skin 573,
Gladiator's Vindication 583 and Gladiator's Sanctuary 584 could not be
measured. The evidence above says a phase-1 run starts from the pre-raid
gear, but no phase-1 universe exists (ticket 515), so the round measured
the pre-raid gear at phase 2. The owner decided on
2026-09-25 that this ticket is fixed before the merge. It stays open.
