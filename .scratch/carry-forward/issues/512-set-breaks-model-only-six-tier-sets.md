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

Each case stands for a kind of situation that recurs across the DPS
specs, classes and sets the tool supports. The set a case uses is the
test's example of its kind, and the kind is what the case checks. Go
source paths below are in the fork clone `vendor/tbc-new-fork`, read at
the pinned commit `063600a3` (`data/wowsims-fork.lock.json`).

**The rule every case checks.** The break model reads no list of
implemented set bonuses. For each worn set, it measures every piece count
that a swap takes the set below, with set-less copies on the player's own
gear. It charges a break only when that measurement clears the same noise
gate as a set bonus. The E-W3 parity path, which runs without the flag,
may keep the six-set table `IMPLEMENTED_IN_SIM` (`engine/set-value.ts:36`).

1. **Case 512-W: a worn set bonus from a set that no hand-kept table
   lists.**
   - The situation: the player wears a non-tier set with bonuses at 2 and
     4 pieces, and an upgrade package takes some of its pieces off.
   - Why it matters: test and review runs start from the previous
     phase's preset gear, and pre-raid presets wear dungeon and crafted
     sets. The feral pre-raid preset wears Wastewalker 4pc and the ret one
     wears Ragesteel 2pc (see Evidence). A break model that reads the
     six-set table charges these breaks nothing and fails this case.
   - The check: a Thunderheart or Malorne package breaks a worn Wastewalker
     set. Each bonus the package takes away is measured and charged. A
     bonus the package leaves in place is not charged.
   - Example set: Wastewalker Armor 659, leather, bonuses at 2 and 4
     (`sim/common/tbc/items_sets.go:48-78`). The same kind in plate:
     Doomplate Battlegear 661, bonuses at 2 and 4
     (`sim/common/tbc/items_sets.go:16-45`).
2. **Case 512-P: a set whose only bonus needs 3 pieces.**
   - The situation: the player wears a three-piece crafted set, and a swap
     replaces one of its pieces.
   - Why it matters: three-piece crafted sets exist in cloth, leather and
     mail, so casters, melee and hunters all meet them. A piece-count type
     that allows only 2 and 4 (`SetThreshold = 2 | 4`) cannot record this
     break.
   - The check: a swap breaks a worn Primal Intent 3pc, with the break
     measured and charged.
   - Example set: Primal Intent 619, leather, one bonus at 3
     (`sim/common/tbc/items_sets.go:184-194`). The same kind in mail:
     Netherscale Armor 616 (`sim/common/tbc/items_sets.go:158-168`). In
     cloth: Wrath of Spellfire 552
     (`sim/common/tbc/items_sets.go:303-314`).
3. **Case 512-N: a swap that removes a piece but no bonus.**
   - The situation: the player wears more pieces of a set than its highest
     bonus needs, or a count between two bonuses. A swap removes one piece
     and the set keeps every bonus it had.
   - Why it matters: Go grants a bonus only when the running piece count
     equals that bonus's count (`sim/core/item_sets.go:141-152`), so the
     extra pieces add nothing. A tier set has 5 pieces with bonuses at 2
     and 4, and players often trade the fifth piece for a better item from
     another source. A break model that charges for each piece lost,
     instead of each bonus lost, penalizes every such swap.
   - The check: a worn set loses a piece count at which the test's model
     has no bonus. The swap's row gets no break charge for that count:
     either no break entry for it, or an entry of 0.
   - Example set: Malorne Harness 640 worn at 5 of 5, dropped to 4; its
     bonuses are at 2 and 4 (`sim/druid/item_sets.go:77-115`). The same
     kind in plate: Burning Rage 566 has 4 pieces in `data/items/index.json`
     and one bonus, at 2 (`sim/common/tbc/items_sets.go:115-125`).
4. **Case 512-H: a set piece that also has its own effect, keyed by its
   item id.**
   - The situation: a worn piece counts toward a set, and the sim also
     gives that exact item an effect of its own.
   - Why it matters: the break model measures with set-less copies, and a
     copy has a new item id. An effect that Go attaches to the original id
     is missing from the copy, so the measurement counts that effect as
     part of the set bonus. Hunter and warrior PvP gloves are set pieces
     with id-keyed effects. The hunter set Gladiator's Pursuit 586 holds
     four of them (28335, 31961, 33665, 34991) and the warrior set
     Gladiator's Battlegear 567 holds four (24549, 30487, 33729, 35067),
     per `data/items/index.json`.
   - The check: a worn set includes gloves whose Go effect is keyed by item
     id. The test's model gives the gloves an effect that their set-less
     copy lacks. The charged break equals the model's set bonus and does
     not include the gloves' effect.
   - Example items: the ids in `pvpGloveItemIDs`, 12 hunter gloves
     (`sim/hunter/item_sets.go:396-407`) and 8 warrior gloves
     (`sim/warrior/items.go:361-371`), which `RegisterPvPGloveMod` checks
     (`sim/core/item_sets.go:275-292`).

**Not covered by a case.** One set in the pinned sim has bonuses above 4
pieces: Cryptstalker Armor 530, at 2, 4, 6 and 8
(`sim/hunter/item_sets.go:11-100`). Its pieces are in the hunter,
enhancement, elemental and warrior pools under `data/universes/`. A
piece-count type that stops at 4 cannot record a 6pc or 8pc break, and
none of the four cases would catch that.

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

2026-09-28 (reorganized by scenario kind): the owner's feedback on the
closing items, verbatim: "I mean, these cases are specific so they'd have
to be representative of specific kids of scenarios considerjng a lot of
specs and classes and items and sets are actually involved (hopefully you
can see how even discussion of these sets and the list came out of left
field)". The closing items were reorganized by scenario kind. Each case now
states the situation in player terms, why it recurs across specs, the
check, and its set as an example, with a same-kind set from another armor
type where the Go source has one. The case ids 512-W, 512-P, 512-N and
512-H are unchanged. The checks of 512-P, 512-N and 512-H are unchanged.
512-W's check now covers every bonus the package takes away, not only
the 2pc, to match the plan's 512-W assertions
(`.scratch/stage-gate/511-512-set-credit/plan.md:1044-1050`). Three candidate kinds got no case of
their own. PvP pieces from different seasons share one set id and one set
name (`data/items/index.json`), and Go counts them by id first
(`sim/core/item_sets.go:119-131`). Grouping by set id, as the test's
model does (`getSetId`, `fork-set-net.test.ts:185`), counts them the same
way, so they add no behaviour a case must check. A profession set worn
without its profession, such as Burning Rage without Blacksmithing, gets
no bonus in Go
(`sim/core/item_sets.go:209-213`), so its break measures zero, the same
outcome 512-N checks (code reading; hypothesis, untested in a sim). Bonuses
above 4 pieces are real but come from one set, so they are recorded under
"Not covered by a case" for the plan to decide.
