Status: open
Type: task
Origin: stage-gate cleanup-upstream-footprint, plan revision 4, step D3, 2026-10-08 (`.scratch/stage-gate/cleanup-upstream-footprint/plan.md`; gitignored, owner's checkout)
Blocks: none
Blocked by: none
Related: 311, 531, 532, 540, 541, 546

# The engine fixes are parked on a fork branch that is never merged

## What is there

The Upgrades tab branch (`feat/upgrades-tab-react` in `vendor/tbc-new-fork`)
used to change 11 wowsims Go engine files. The cleanup returned all 11 to
upstream's text (fork `205975607`), because the tab does not need them and the
owner's rule is to leave existing wowsims files alone. The fixes and their
tests were kept on a separate fork branch:

- Branch `fix/engine-item-swap-and-off-class-guards`, commit
  `fa57ef5b7aadb30c9a7b81a372aedec379b8fd75`, parent `42c75dc9` (upstream).
- 14 files: `sim/core/procs.go`, `sim/common/classic/items_trinkets.go`,
  `sim/common/tbc/items_weapons.go`, `sim/rogue/talents_combat.go`,
  `sim/warrior/talents_arms.go`, `sim/paladin/seals.go`,
  `sim/warrior/talents_fury.go`, `sim/druid/item_sets.go`,
  `sim/rogue/items.go`, `sim/warrior/items.go`, `sim/hunter/item_sets.go`, and
  the tests `sim/item_swap_weapon_proc_test.go`,
  `sim/off_class_set_bonus_test.go`, `sim/core/meta_socket_bonus_test.go`.
- Re-run: `git -C vendor/tbc-new-fork show --stat fa57ef5b7`.

The branch is local to the fork clone; it is on no remote.

## Where the fixes came from

- Ticket 540: weapon procs keep the starting weapon's chance after an item
  swap (`NewDynamicLegacyProcForTypes` in `procs.go`, used by Hand of Justice,
  the Twin Blades of Azzinoth, Blinkstrike, rogue Sword Specialization and
  warrior Mace and Sword Specialization).
- Ticket 546: Seal of Vengeance and Unbridled Wrath keep a static chance after
  a weapon swap (`seals.go`, `talents_fury.go`).
- Tickets 532 and 311: class guards on set bonuses, so another class wearing a
  druid, rogue, warrior or hunter set piece does not panic the sim or change
  unrelated spells (`item_sets.go`, `items.go`).
- Ticket 531: World Breaker dropped from every ranking with item swap on.
  `sim/item_swap_weapon_proc_test.go` names it (`:13`; `TestWeaponProcSwappedIn`,
  `:167`).
- Ticket 541: `sim/core/meta_socket_bonus_test.go` records the sim's rule that
  an empty meta socket withholds the socket bonus. It tests upstream
  behaviour; it fixes nothing.

## What the tab loses without them

As upstream behaves today, per the cleanup plan's Costs section (not re-run
for this ticket): some weapon procs keep the starting weapon's chance under
item swap, and Blinkstrike drops from a ranking with item swap on, with the
tab's existing "was dropped" note. An off-class set piece that upstream's
sim cannot measure shows as "couldn't measure" (the owner said that fallback
is fine; candidate lists stop holding off-class set pieces in ticket 576).

## Rule

Never merge this branch into `feat/upgrades-tab-react`. Any of these fixes
could go to wowsims as its own upstream PR; that is the owner's call, and none
is planned.

## Done when

The owner decides what happens to the branch (an upstream PR, or deleting it),
and this ticket records that decision.
