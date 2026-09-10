Status: open
Type: bug
Origin: .scratch/stage-gate/342-learn-from-upstream/comparison.md
Blocks: none
Blocked by: none

# A two-hander swapped into the main hand leaves the worn off-hand item

Group: `.scratch/upgrades-tab-sim-followups/README.md`

## What

For a dual-wield spec currently wearing a one-hander plus an off-hand item, a
two-handed candidate is priced against a gear set that keeps the off-hand item.
The composed request therefore describes two-hander **plus** off-hand — gear the
game cannot equip — so the row does not price the gear it claims to.

Our only hand-compatibility guard runs in one direction. `attemptEligibility`
(fork `U/engine/rank.ts`, core `packages/core/src/rank.ts`) has:

```ts
if (slotName === "offhand" && !mainHandIsOneHanded) return { kind: "skip" };
```

That fires only when the *candidate* targets the off hand. The mirror case is
unguarded:

- `itemFitsSimSlot` (`U/engine/pool.ts`) admits everything except a dedicated
  off-hand item into `mainhand`, so a two-hander passes.
- `attemptEligibility` sees `slotName === "mainhand"` and never reaches the
  guard.
- `swapItemAt` maps over `equipment` and rewrites exactly one index, so the worn
  off-hand item stays.

Reachable for the four specs in `DUAL_WIELD_SPECS` (`U/engine/pool.ts`) — rogue,
enh, warrior, hunter — since only they get an off-hand placement and so only
they can be wearing an off-hand item when a two-hander is offered.

**Present in both engine copies**, so it is not a port artifact: core's
`mainHandIsOneHanded`, its single `offhand`-only guard, and its one-index
`swapItemAt` are the same shape as the fork's. Locate by symbol; the line
numbers in both copies drift.

## Where it came from

Ticket 342's upstream comparison. Upstream hit the same class of bug and fixed it
in `bb4e77528` ("Fix 2x2H and 2H+OH bug", upstream `feature/backend-reforge` @
`cbf6b75a8`). That commit has two halves:

- It deleted a branch that emitted a two-hander in each hand. **This half cannot
  reach us** — `itemFitsSimSlot` bars a two-hander from `offhand`, and we never
  assemble a weapon pair.
- It added a defensive clear in `buildGearForCombo` (`sim/core/bulk/generator.go`):
  when the main hand holds a `HandTypeTwoHand` item, blank the off-hand slot.
  **This half is the gap.**

## The decision this ticket owes

Two candidate fixes, and the choice is a design call, not a mechanical port.

1. **Skip the attempt** — extend `attemptEligibility` so a two-handed candidate
   targeting `mainhand` is skipped when an off-hand item is worn, mirroring the
   existing off-hand skip.
2. **Clear the slot** — port upstream's clear into `swapItemAt`/
   `candidateSwapWithRepairs`, blanking the off-hand index when a two-hander
   lands in the main hand.

**Option 1 is consistent with a position the codebase already recorded.** The
comment above the existing guard rejects option 2's semantics for the mirror
case, in these terms: letting the off-hand pick displace the worn two-hander
"prices a two-item swap under a one-item row: the delta would silently include
losing the two-hander, which is not what the row claims." Clearing the off hand
for a two-handed candidate is that same trade in the other direction — the row
would debit the lost off-hand stats under a one-item heading.

Option 2's knock-on, if chosen anyway: `statDeltaBetween(equipment, swapped)`
would then correctly debit the off hand, and `applyRepairedGems`/
`repairAndMinimize` would see one fewer socketed item, so gem repair output
changes for those candidates too.

Whichever is chosen, note that option 1 removes rows that exist today and option
2 changes their numbers, so the choice is visible in output either way.

## What is NOT claimed

- **Not measured.** Nothing here says what the fork's equip logic does with a
  2H+OH request — silently drop the off hand, count both, or reject the set. The
  claim is only that the request is inconsistent with the row's own description.
  Establishing the engine's actual behaviour is step 1 below and would tell you
  how wrong today's numbers are.
- **No ranking is known to be wrong.** No row was measured before and after a
  fix. If the engine happens to ignore the off hand, today's numbers may already
  be right by accident.
- **Not the same as tickets 308/309.** Those cover the legal second-copy-of-a-
  non-unique-ring row that `attemptEligibility`'s `wornAt` guard blocks. This is
  a different guard and a different direction.

## What to do

1. Determine what the engine does with a 2H + off-hand equipment spec — a single
   composed request with both, run once, is enough. That fixes how much today's
   two-hander rows for dual-wielders are off by.
2. Pick option 1 or option 2 above, recording the reason against the
   `rank.ts:785-790` position either way.
3. Implement in `packages/core/src/rank.ts` first with a red-then-green unit
   test (a dual-wield spec wearing 1H+OH, a two-handed candidate, asserting the
   attempt is skipped or the off hand cleared), then port to the fork copy and
   run the full ported-engine-file cycle in `docs/agents/known-traps.md`
   ("Before editing a ported engine file").
4. Check whether any committed universe actually contains a two-hander in a
   dual-wield spec's weapon pool; if none does, the bug is latent and that is
   worth recording next to the fix.

## Acceptance

- [ ] The engine's behaviour on a 2H + off-hand request is established and
      written down.
- [ ] Option 1 or 2 chosen, with the reason recorded against the existing
      two-item-swap position in `rank.ts`.
- [ ] Fixed in `packages/core/src/rank.ts` with a unit test that fails before
      the fix, and ported to the fork copy with the known-traps cycle done.
- [ ] `pnpm verify` green, E-W3 green on Node >= 22.5.0 (it cannot collect on
      Node 20 — `node:sqlite` is missing).

## Notes

Found by reading, not by a failing test or a bad row. Related: 308 and 309
(second-copy rows, the other side of `attemptEligibility`), 342 (the comparison
that surfaced this), 351 (the other finding from the same pass).
