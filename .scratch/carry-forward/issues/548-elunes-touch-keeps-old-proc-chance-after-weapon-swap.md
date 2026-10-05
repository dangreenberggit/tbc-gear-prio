Status: open
Type: defect
Origin: pre-merge review round 13 on feat/round-11-followups, finding R13-D2 (wontfix, outside 546), 2026-10-04
Blocks: none
Blocked by: none
Related: 546, 540

# Elune's Touch keeps the old proc chance after a weapon swap

## What is wrong

Elune's Touch (Moonkin Form, mana on melee white hits) builds its proc
manager once with `NewStaticLegacyPPMManager(15, ...)` (fork
`sim/druid/forms.go:362`). That manager registers no item-swap callback
(`sim/core/procs.go:56-61`), so after a weapon swap the proc chance stays
at the build-time weapon speed. Ticket 546 fixed the same bug for
Unbridled Wrath and Seal of Vengeance.

## Where it was found

Branch `feat/round-11-followups` at `2d281ee7`, fork `536645d01`. It is the
last caller: `grep -rn NewStaticLegacyPPMManager vendor/tbc-new-fork/sim
--include=*.go` lists only the definition and `forms.go:362`. Upstream
`17a8fb28c` has the same line (`git -C vendor/tbc-new-fork show
upstream/master:sim/druid/forms.go`). Review round 13 R13-D2
(`docs/reviews/feat-round-11-followups.md:339-340`, `:411`).

## Why it matters

Balance druids can swap main hand and off hand (`ui/druid/balance/sim.ts:90`).
After a swap to a weapon of a different speed, a moonkin's melee mana
return would be wrong. The effect on DPS is probably small, because a
moonkin rarely melees (hypothesis, untested). The review's note that no
ranked case swaps weapons on such a druid is also hypothesis, untested.

## What would close this

A Go test showing whether the proc chance follows the swapped-in weapon's
speed (the 546 tests in `sim/item_swap_weapon_proc_test.go` are the
model), then a fix or a recorded reason to leave it, and a fork re-pin if
the fork changes.
