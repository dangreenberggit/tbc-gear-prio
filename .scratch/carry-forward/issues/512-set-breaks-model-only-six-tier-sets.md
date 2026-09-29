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

The cases named below are in `packages/core/test/fork-set-net.test.ts` and
run with the flag the tab sets (`measureBrokenSetValue`). Their literals are
derived by hand in `docs/set-bonus-fixture-derivations.md`. CI skips this
file because it needs the fork clone, so run it locally with the fork
present:

`npx vitest run packages/core/test/fork-set-net.test.ts --reporter=verbose; echo rc=$?`

It must print `rc=0` and a passing line for each case named below. A run
that skips the file also prints `rc=0`, so the case lines are the check.

1. The break model reads no list of implemented set bonuses. For each worn
   set, it measures every piece count that a swap takes the set below, with
   set-less copies on the player's own gear. It charges a break only when
   that measurement clears the same noise gate as a set bonus. Cases 512-W
   and 512-P check this. Their sets, Wastewalker 659 and Primal Intent 619,
   are not in the six-set table `IMPLEMENTED_IN_SIM` (`engine/set-value.ts`),
   so a break model that reads that table charges them nothing and fails.
   The E-W3 parity path, which runs without the flag, may keep that table.
2. Case 512-N: a worn set loses a piece count at which the test's model has
   no bonus. The swap's row gets no break charge for that count: either no
   break entry for it, or an entry of 0.
3. Case 512-W: a Thunderheart or Malorne package breaks a worn Wastewalker
   2pc, with the break measured and charged.
4. Case 512-P: a swap breaks a worn Primal Intent 3pc, with the break
   measured and charged.
5. Case 512-H: a worn set includes gloves whose Go effect is keyed by item
   id. These are the ids in `pvpGloveItemIDs` in `sim/hunter/item_sets.go`
   and `sim/warrior/items.go`, which `RegisterPvPGloveMod` checks. The
   test's model gives the gloves an effect that their set-less copy lacks.
   The charged break equals the model's set bonus and does not include the
   gloves' effect.

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

2026-09-28: the owner chose that the Upgrades tab keeps no list of
implemented set bonuses. The owner's words: "No list. The list would have
to be perfect and I don't want to do that." (source:
`.scratch/stage-gate/511-512-set-credit/decision-log.md`, last entry). Breaks
now rely on the approved same-gear measurement and its noise gate. The old
item 2, "The table is re-verified against the Go source at the fork's pin,
with the command recorded", assumed a table. The old item 1, "every set
bonus the pinned sim implements", could be checked only against a list. The
closing items were reworded so that each one is a named case in
`fork-set-net.test.ts` with a re-runnable command, and the wording was
reviewed independently against the `writing-for-agents` skill and for
testability. The old item 3 is now item 3 with a case name. A suggestion to
record the plan's Appendix B output in this ticket as an audit was left out,
because nothing would read it and it would be a list of sets again. Item 5
comes from the verifier's finding in the same log (2026-09-28, verifier
a42da40fe1ba68b71): a set-less copy has a new item id, so Go's id-keyed
PvP glove effect would be counted in the break (code reading,
`RegisterPvPGloveMod` in `sim/core/item_sets.go`; hypothesis, untested in a
sim).
