Status: closed
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
   `NewLegacyPPMManager` does (`sim/core/procs.go:46-54`), or record why it
   stays.
3. Re-pin the fork in the main repo (AGENTS.md "The forked tab repo").

## Closed 2026-10-04: fixed at fork 536645d01

Fixed by one fork commit on `feat/upgrades-tab` in
`dangreenberggit/tbc-new`, not pushed (the remote still names
`7d4d69d6a`, `git -C vendor/tbc-new-fork ls-remote origin
refs/heads/feat/upgrades-tab`):

- `536645d011160b9760f78012700a9d404d4fcafb` "Rebuild PPM procs in place
  on weapon swap (546)": both sites and three tests.

The main-repo commit "Re-pin fork to 536645d01 for ticket 546" moves
`data/wowsims-fork.lock.json` to `536645d01` with `pushed: false`. Plan,
logs and evidence are in `.scratch/stage-gate/round-11-followups/`
(gitignored, so a fresh checkout does not have them): `546-plan.md`,
`546-red.txt`, `546-green.txt`, `546-sim-all.txt`, `546-verify.txt`.

### The fix

Both sites now build their manager with `NewLegacyPPMManager`
(`sim/core/procs.go:46-54`) in place of `NewStaticLegacyPPMManager`. It
takes the same arguments, registers an item-swap callback that rebuilds
the manager into the variable whose address the proc trigger holds, and
so needs no new helper. Neither site had a dead swap callback to delete.

### The tests and the measured rates

Each test wears one set of weapons, swaps to another through a swap-only
rotation at the start of each iteration, and divides the procs by the
landed white hits (hit, crit, glance, block, crush). The result is
compared with the chance per hit of the swapped-in weapons, speed × PPM /
60, within 10%. All runs use 10 iterations of 180 s at seed 531.

| Test | Weapons (start → swap) | Start chance | Swapped-in chance | Rate at `d14f459d0` | Rate at `536645d01` |
| --- | --- | --- | --- | --- | --- |
| `TestItemSwapRateUnbridledWrath` | 2.6 MH → 1.5 MH | 0.6500 | 0.3750 | 0.6326 (823 / 1301) | 0.3689 (480 / 1301) |
| `TestItemSwapRateUnbridledWrathOffHand` | 3.6 2H → 2.6 MH + 1.5 OH | 0.3246 red, 0.3286 green | 0.4742 red, 0.4754 green | 0.3206 (544 / 1697) | 0.4737 (794 / 1676) |
| `TestItemSwapRateSealOfVengeance` | 2.6 MH → 1.5 MH | 0.8667 | 0.5000 | 0.8525 (988 / 1159) | 0.4802 (559 / 1164) |

At `d14f459d0` each rate is within 3% of the start chance, so all three
tests failed red for the reason the ticket gives. At `536645d01` each is
within 4% of the swapped-in chance.

For the off-hand test, both chances are blends weighted by the measured
hits of each hand (612 main hand and 1085 off hand red, 612 and 1064
green), so each run has its own pair (`546-red.txt:37`,
`546-green.txt:36`). The start chance there is the main-hand-only rate: the
two-hander's 0.9 on main-hand hits and nothing on off-hand hits, because
the off hand had speed 0 when the manager was built and got no proc mask
(`mergeOrAppend`, `procs.go:134-137`). The red rate matches it, which
confirms the off-hand case from a run.

The Unbridled Wrath procs are the rage events of 13002. The Seal of
Vengeance procs are the landed and missed Holy Vengeance (31803) casts:
the metrics count no casts for a passive spell. The seal rotation recasts
the seal when under 3 s remain, so it was up 178.5 of 180 s per
iteration (read from a throwaway debug run at `d14f459d0`). That gap and
sampling noise (one standard deviation is about 0.015 at 1164 hits and
p = 0.5) are the likely reasons the green rate sits 4% under 0.5
(hypothesis, untested).

`go -C vendor/tbc-new-fork test -tags=with_db ./sim/ -run
'TestWeaponProc|TestItemSwap' -count=1 -v` gives rc=0 with 10 PASS lines
for the 10 test functions in the file. `go -C vendor/tbc-new-fork test
-tags=with_db ./sim/... -count=1` passes every package except
`TestProtoVersioning` in `sim/core`, the same upstream proto-deletion
failure ticket 540 records; the commit changes no proto file.

### DPS effect

Not measured, by plan decision, as in ticket 540. The Go tests show that
the proc chance now follows the weapons worn after a swap. The size of
the change depends on a player's swap set, and no decision in this ticket
depends on it. It matters only when the player's item swap is on.
