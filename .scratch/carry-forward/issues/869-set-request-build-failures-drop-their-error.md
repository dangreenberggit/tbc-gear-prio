Status: open
Type: bug
Origin: docs/reviews/fix-621-863-865-tab.md (round 1, row P2)
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 863, 867

# A set-phase sim request that cannot be built shows no error

## What happens today

Read from the fork at `550c01576` (branch `fix/621-863-865-tab`), paths
under `ui/features/upgrades/model/engine/`. Ticket 863 made each failed
set-phase **sim** add a line ending in the sim's error. Two places fail
earlier, while building the sim's request, and the error they catch does
not reach the player:

- The set screen: when `applyCopies` throws (`set-screen.ts:268-273`) or
  `requestsFor` builds no request for a rung (`set-screen.ts:261-266`),
  the code writes only a `console.warn` and adds no line. Ticket 863 listed
  `set-screen.ts:269` at fork `e1f0a16d8`, which is this catch; its
  closing note does not say why it was left.
- The same-gear gate: when `applyCopies` throws
  (`set-less-copies.ts:162-167`), the catch drops the error and returns
  undefined. The package loop then adds "The <set> <n>-piece set bonus was
  not measured, because the sims that measure it could not be built."
  (`rank.ts:2467`, `SET_BONUS_SKIP_REASONS.measuringSimsNotBuilt`), with
  no error text.

What the player sees in the set-screen case (a set kept with no line) is
from code, not seen on screen.

The owner, 2026-11-06, in ticket 852: "i dont know why we need to invent to
new error, rather than just normally bubbling up whatever error we got from
existing sim code". These errors come from the tab's request building, not
from the sim, so whether that rule covers them is a reading, not a ruling.

## Done when

A set-phase request that cannot be built adds a line that ends in the
error that was caught, or the ticket records the owner's ruling that it
need not, and a fork test covers each of the two places.
