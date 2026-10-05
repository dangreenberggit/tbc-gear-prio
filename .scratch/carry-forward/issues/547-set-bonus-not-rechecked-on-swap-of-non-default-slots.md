Status: open
Type: defect
Origin: ticket 540 "Other weapon-only sets"; pre-merge review round 12 on feat/round-11-followups, finding P4 (wontfix), 2026-10-04
Blocks: none
Blocked by: none
Related: 540, 546

# Set bonuses with pieces in feet, waist, wrist or finger are not re-checked when only those slots are swapped

## What is wrong

A set's status aura re-checks its bonus only when an item in one of the
set's `Slots` is swapped (fork `sim/core/item_sets.go:244-252`). A set
with no `Slots` gets head, shoulder, chest, hands and legs
(`item_sets.go:30-38`, `:63-65`). Ticket 540 counted 29 sets with pieces
in feet, waist, wrist or finger slots (not re-counted here), so an item
swap of only those slots leaves the bonus on or off as it was at the start.
This is the mechanism of the Twin Blades slot bug that 540 fixed.

## Where it was found

Branch `feat/round-11-followups` at `2d281ee7`, fork `536645d01`.
Recorded in ticket 540 "Other weapon-only sets" ("It is not changed here
and has no ticket.") and review round 12 P4
(`docs/reviews/feat-round-11-followups.md:180-182`, `:233`).

## Why it matters

A sim with such a swap would give the wrong set bonus for part of the
fight. In the fork UI no spec offers a swap of these slots: `grep -rn -A8
"itemSwapSlots:" vendor/tbc-new-fork/ui` lists only weapon, ranged and
trinket slots. So it may not reach a player at all (hypothesis,
untested). The DPS effect is not measured.

## What would close this

Show from a Go test whether a swap of only a non-default slot re-checks
the bonus, then fix the affected sets or record why they stay (for
example, that no player can request such a swap).
