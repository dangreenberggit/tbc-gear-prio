Status: closed
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

## Closing note

Fixed 2026-11-10 on branch `fix/867-870-tab-errors`, fork commit
`0f286ebc3` 'Show the error when a set sim cannot be built'. Paths under
the fork's `ui/features/upgrades/model/engine/`.

In the tab every set-phase request comes from `versionGears`
(`rank.ts`), and that is where the errors were dropped: its catches of
`composeFor` and `applyCopies`, and a failed gem repair, each gave an
undefined entry. Each now gives a `BuildFailure` (`set-less-copies.ts`)
that carries the caught error. The two places this ticket names:

- The set screen (`set-screen.ts`, `rungSimmer`): a rung whose request
  cannot be built, from `requestsFor` or from `applyCopies`, calls
  `onRequestNotBuilt`, and the ranking adds "The <set> set was kept
  without the quick check that can skip it, because the check's sim
  could not be built." with the error on the next line.
- The same-gear gate (`measureSameGearBonus`): it returns the
  `BuildFailure`, and the line now reads "The <set> <n>-piece set bonus
  was not measured, because the sims that measure it could not be
  built." with the error on the next line. The crossing gate uses the
  same function and adds the same line; before, it added none.

The page shows the first line; the error is in the browser console, as
for the other set-phase lines. The decision the ticket left open (whether
the owner's 2026-11-06 rule covers errors from the tab's own request
building) was not needed: the fix shows the caught error, which is what
that rule asks for sims.

Other places that get a build failure still give no line or a wrong
one: ticket 872.

Verified by: in the pair,
`pnpm exec vitest run packages/core/test/fork-set-net.test.ts -t "869-"`.
869-S (set screen, `setScreen: "on"`), 869-G (same-gear gate) and 869-U
(`measureSameGearBonus` directly, with and without `requestsFor`) failed
before the fix (3 failed: the gate's line had no error, the screen added
no line, the function returned undefined) and pass with it. The whole
file passes (111 tests). The integration cases make `applyCopies` throw
with a scenario database that has no Thunderheart rows
(`Scenario.databaseWithout`).
