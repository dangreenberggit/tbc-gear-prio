Status: open
Type: task
Origin: ticket 539 close on feat/round-11-followups, "Not checked live", 2026-10-04
Blocks: none
Blocked by: none
Related: 539

# Spec options and consumables are not checked for the stale notice

## What is wrong

Ticket 539's live check showed that race, a rotation option, bonus stats,
talents and gear each mark a finished Upgrades result stale and re-enable
Simulate. Spec options and player consumables were not tried. That they
do the same is hypothesis, untested in the tab.

## Where it was found

Branch `feat/round-11-followups` at `2d281ee7`, fork `536645d01`. Ticket
539, "Closed 2026-10-04", lines 108-110 ("Not checked live"). The code
reading behind the hypothesis: `consumesChangeEmitter` and
`specOptionsChangeEmitter` are in `Player.changeEmitter`'s `onAny` list
(fork `ui/core/player.tsx:338-358`), the same path the five checked inputs
use.

## Why it matters

If a change to spec options or consumables did not mark the result stale,
a player would read a ranking made for settings they no longer have, with
no warning.

## What would close this

A live check in the Upgrades tab (same method as ticket 539 "Live check
2026-10-04"): change one spec option and one consumable after a settled
run, and record the stale notice and Simulate state for each.
