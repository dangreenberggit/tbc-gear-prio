Status: closed
Type: defect
Origin: pre-merge review round 11 on feat/tab-signoff-followups, findings A4 and D5, 2026-10-03
Blocks: none
Blocked by: none
Related: 531

# Some weapon and talent procs keep the old proc chance after an item swap

## What was found

Ticket 531 fixed weapon procs that panicked on item swap by moving them to
`NewDynamicLegacyProcForWeapon`, which rebuilds the proc manager in place
(`sim/core/procs.go:85-98` in `vendor/tbc-new-fork` at fork `3613d654f`).
Two review axes found other sites with the same pattern that ticket 531 did
not change: an item-swap callback assigns a new manager to a local `dpm`,
but the `ProcTrigger` already holds the old pointer
(`sim/core/aura_helpers.go:68-70`), so the swap does not change the proc
chance. These sites do not panic, because `NewStaticLegacyPPMManager`
registers no callback (`sim/core/procs.go:57-61`).

- Twin Blades of Azzinoth 2pc, `sim/common/tbc/items_weapons.go:331-372`
- Hand of Justice, `sim/common/classic/items_trinkets.go:11-48`
- Arms warrior talents, `sim/warrior/talents_arms.go:374-395` and `:442`

The effect on DPS is not measured (hypothesis, untested). It matters only
when item swap is on and the swapped weapon has a different speed.

## What would close this

1. For each site, show from a Go test whether the proc chance follows the
   worn weapon after a swap (the 531 tests in
   `sim/item_swap_weapon_proc_test.go` are the model; run with
   `go -C vendor/tbc-new-fork test -tags=with_db ./sim/ -run <name> -count=1 -v`).
2. Fix each site that does not, by rebuilding in place as
   `NewLegacyPPMManager` does (`sim/core/procs.go:47-54`), or record why it
   stays.

## Closed 2026-10-04: fixed at fork a6a0323f8

Fixed by two fork commits on `feat/upgrades-tab` in
`dangreenberggit/tbc-new`, neither pushed (the remote still names
`7d4d69d6a`):

- `5e0c6f16aa77774243991183ea714bf156e46388` "Rebuild type-keyed procs in
  place on swap (540)": the helper, four sites and four tests.
- `a6a0323f85ad794595a99403cc0586cb18ece05b` "Fix Twin Blades 2pc proc
  after item swap (540)": the Twin Blades site, its `Slots` line and its
  test.

The main-repo commit "Re-pin fork to a6a0323f8 for ticket 540" moves
`data/wowsims-fork.lock.json` to `a6a0323f8` with `pushed: false`. Plan,
logs and evidence are in `.scratch/stage-gate/round-11-followups/`
(gitignored, so a fresh checkout does not have them): `540-red.txt`,
`540-green.txt`, `540-sim-all.txt`.

### The helper

`NewDynamicLegacyProcForTypes(ppm, fixedProcChance, types...)` in fork
`sim/core/procs.go` wraps `newDynamicProcManagerWithDynamicProcMask` with
the per-slot weapon-type test of `GetProcMaskForTypes`. It rebuilds the
proc manager in place on a swap, so the pointer the `ProcTrigger` holds
(`sim/core/aura_helpers.go:68-70`) stays correct. The dead swap callbacks
at each site are deleted.

### The five sites and their tests

Each test starts with no weapon of the keyed type, swaps one in through a
swap-only APL, and asserts the effect fires. All five failed at
`7d4d69d6a` (`540-red.txt`).

| Site | File | Test |
| --- | --- | --- |
| Twin Blades of Azzinoth 2pc | `sim/common/tbc/items_weapons.go` | `TestItemSwapProcTwinBlades` |
| Hand of Justice | `sim/common/classic/items_trinkets.go` | `TestItemSwapProcHandOfJustice` |
| Arms warrior Mace Specialization | `sim/warrior/talents_arms.go` | `TestItemSwapProcArmsMaceSpec` |
| Arms warrior Sword Specialization | `sim/warrior/talents_arms.go` | `TestItemSwapProcArmsSwordSpec` |
| Rogue Sword Specialization | `sim/rogue/talents_combat.go` | `TestItemSwapProcRogueSwordSpec` |

The rogue site was not in this ticket. Plan review R2 added it: its swap
callback wrote `procTrigger.Dpm`, a field the trigger never reads again
(`sim/core/aura.go:141-142` reads it only in `Reset`), so it had the same
bug.

`go -C vendor/tbc-new-fork test -tags=with_db ./sim/ -run
'TestWeaponProc|TestItemSwapProc' -count=1 -v` gives rc=0 with 7 PASS
lines for the 7 test functions in the file (the two 531 tests and the
five above). `go -C vendor/tbc-new-fork test -tags=with_db ./sim/...
-count=1` passes every package except `TestProtoVersioning` in
`sim/core`. That test reports upstream proto deletions, and neither
commit changes a proto file.

### Twin Blades had a second defect: set slots

The Twin Blades set had no `Slots`, so `core.NewItemSet` gave it
`DefaultItemSetSlots()`: head, shoulder, chest, hands and legs
(`sim/core/item_sets.go:30-38`, `:63-65`). A set's status aura re-checks
the bonus only when one of its `Slots` is swapped (`item_sets.go:244-252`),
so swapping the Warglaives in never turned the 2pc on. Fork `a6a0323f8`
adds `Slots: core.AllMeleeWeaponSlots(),` to the set. The executor
measured each fix alone: with only the proc manager fix, or only the
`Slots` line, the haste aura 41435 never fired (0.00 procs); with both
it fired 2.30 times per run on average.

The plan's claim C21 ("bonuses of sets not worn at start ... activate on
swap-in") was wrong for sets made only of weapons. It holds only for sets
whose pieces sit in the set's `Slots`.

A swap-out test (blades worn at start, swapped out) was not written. The
2pc status aura has no metrics, because `ExposeToAPL` sets its `ActionID`
after the aura is registered and `sim/core/aura.go:508` copies the metrics
id at registration. The haste proc cannot show it either, since no sword
is left after the swap. That the `Slots` line also ends the 2pc on
swap-out is a hypothesis, untested.

### Other weapon-only sets

All 79 `NewItemSet` calls in fork `sim/` (excluding tests) were checked
against the piece types in `assets/database/db.json` (matched by set name,
alternative name and set id). The Twin Blades is the only set with any
weapon or ranged piece, so no other set changed. 29 of the other sets
have pieces outside the five default slots (feet, waist, wrist, finger),
so a swap of only those slots would not re-check those bonuses either. That is the same mechanism in a case a weapon swap set
does not reach. It is not changed here and has no ticket.

### Hand of Justice mask

Hand of Justice keeps upstream's sword-only proc mask
(`NewDynamicLegacyProcForTypes(0, 0.013333,
proto.WeaponType_WeaponTypeSword)`). Whether the trinket should proc from
other weapon types is a question for upstream; combat modelling is
upstream's (ticket 258, wontfix). No ticket.

### DPS effect

Not measured, by plan decision. The Go tests show that each proc now
follows the gear worn after a swap. The size of the change depends on a
player's swap set, and no decision in this ticket depends on it.
