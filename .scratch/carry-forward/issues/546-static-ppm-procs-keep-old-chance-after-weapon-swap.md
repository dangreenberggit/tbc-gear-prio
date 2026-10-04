Status: open
Type: defect
Origin: pre-merge review round 12 on feat/round-11-followups, finding A1, 2026-10-04
Blocks: none
Blocked by: none
Related: 540, 531

# Unbridled Wrath and Seal of Vengeance keep the old proc chance after a weapon swap

## What was found

Ticket 540 fixed five type-keyed procs that kept the old proc chance after
an item swap. Two more procs in `vendor/tbc-new-fork` (fork `1f102770e`)
build their proc manager once with `NewStaticLegacyPPMManager`, which
registers no item-swap callback (`sim/core/procs.go:57-61`):

- Unbridled Wrath (fury warrior talent), `sim/warrior/talents_fury.go:69`
- Seal of Vengeance (paladin), `sim/paladin/seals.go:815`

The proc chance per hit is weapon speed × PPM / 60, read when the manager
is built (`newDynamicWeaponProcManager`, `sim/core/procs.go:150-158`).
After a swap to a weapon of a different speed, the old chance stays. A
hand whose speed is 0 at build time gets no proc mask at all
(`mergeOrAppend` returns early, `procs.go:134-137`), so after a swap from
a two-hander to two one-handers, off-hand hits would never proc
(read from the code; hypothesis, untested in a run). The DPS
effect is not measured (hypothesis, untested). It matters only when the
player's item swap is on.

## What would close this

1. For each site, show from a Go test whether the proc chance follows the
   worn weapon's speed after a swap. The 540 tests in
   `sim/item_swap_weapon_proc_test.go` are the model; run with
   `go -C vendor/tbc-new-fork test -tags=with_db ./sim/ -run <name> -count=1 -v`.
   Assert on the chance or on a proc rate, not only on a proc count above
   0, so the test pins the speed (round 12, A2).
2. Fix each site that does not, by rebuilding in place as
   `NewLegacyPPMManager` does (`sim/core/procs.go:47-54`), or record why it
   stays.
3. Re-pin the fork in the main repo (AGENTS.md "The forked tab repo").
