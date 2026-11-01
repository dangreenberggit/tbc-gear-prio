Status: open
Type: bug
Origin: docs/reviews/fix-644-655-set-bonus-list.md (finding P2)
Blocks: none
Blocked by: none
Related: 655, 511

# The set-bonus popover names no below-gate bonus when another bonus of the set clears the gate

Ticket 655 case 2 added a "too small to measure" line for a row whose every
future set bonus was measured within the noise gate. A row with one bonus that
clears the gate and another that does not still names the second one nowhere,
in either toggle state.

Source: `vendor/tbc-new-fork/ui/features/upgrades/model/set_bonus_tip.ts`
`noiseLines` at fork `5b9182ed0` returns no lines when
`futures.some(f => stepEligible(f, noiseFloorDps))`, and `reachableLines`
lists only `stepEligible` futures. Re-run:
`git -C vendor/tbc-new-fork show 5b9182ed0:ui/features/upgrades/model/set_bonus_tip.ts | grep -n -A8 "^function noiseLines"`.
The test near `set_bonus_tip.test.ts:247` (fork `5b9182ed0`) pins this
behaviour.

This predates branch `fix/644-655-set-bonus-list`: before fork `5b9182ed0`
no below-gate bonus was named in any row. The owner's "Case 2 a sounds fine"
(2026-11-01, ticket 655) was given about rows whose only future bonus is below
the gate, so it does not rule on these mixed rows. Whether any recorded row has
this mix: hypothesis, untested.

Done when: the owner rules whether a mixed row lists the below-gate bonus
(for example under "Not counted" with "too small to measure") and the popover
follows the ruling with a fork test; or a recorded reason to keep today's
behaviour is written here.
