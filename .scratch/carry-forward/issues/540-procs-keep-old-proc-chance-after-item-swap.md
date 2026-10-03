Status: open
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
