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

Our only hand-compatibility guard runs in one direction, and **the two engine
copies spell it differently** — grep for the condition, not the function name:

- Fork (`U/engine/rank.ts`): extracted into `attemptEligibility`, which returns
  `if (slotName === "offhand" && !mainHandIsOneHanded) return { kind: "skip" };`
- Core (`packages/core/src/rank.ts`): **no `attemptEligibility` function exists**
  — the same guard is inlined in the `runCandidate` slot loop as
  `if (slotName === "offhand" && !mainHandIsOneHanded) continue;`

That fires only when the *candidate* targets the off hand. The mirror case is
unguarded:

- `itemFitsSimSlot` (`U/engine/pool.ts`) admits everything except a dedicated
  off-hand item into `mainhand`, so a two-hander passes.
- The guard sees `slotName === "mainhand"` and so never fires.
- `swapItemAt` maps over `equipment` and rewrites exactly one index, so the worn
  off-hand item stays.

Reachable only for the four specs in `DUAL_WIELD_SPECS` (`U/engine/pool.ts`) —
rogue, enh, warrior, hunter — since only they get an off-hand placement and so
only they can be wearing an off-hand item when a two-hander is offered.

**The bug is live, not latent, for three of those four.** Counting weapon-slot
entries in the committed universes by `handType` from `data/items/index.json`,
with `HandTypeTwoHand = 4` read from the generated
`packages/core/src/proto/common_pb.ts` (note `HandTypeOneHand` is 2 — using 2
here is a plausible-looking mistake that reports one-handers as two-handers):

| universe | weapon entries | two-handers |
| --- | --- | --- |
| rogue-p2 / p5 | 117 / 187 | **0 / 0** |
| enh-p2 / p5 | 151 / 235 | 42 / 59 |
| warrior-p2 / p5 | 190 / 294 | 55 / 77 |
| hunter-p2 / p5 | 111 / 179 | 43 / 64 |

Rogues carry no two-handers at all, which is correct for TBC and makes the bug
unreachable for them. For enhancement, warrior and hunter it is reachable in
every phase on disk.

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
  non-unique-ring row that the `wornAt` guard blocks (in the fork, the second
  `{ kind: "skip" }` in `attemptEligibility`). This is a different guard and a
  different direction.

## What to do

1. Determine what the engine does with a 2H + off-hand equipment spec — a single
   composed request with both, run once, is enough. That fixes how much today's
   two-hander rows for dual-wielders are off by.
2. Pick option 1 or option 2 above, recording the reason against the position
   in the comment above `if (slotName === "offhand" && !mainHandIsOneHanded)
   continue;` in `packages/core/src/rank.ts` — grep for the condition.
3. Implement in `packages/core/src/rank.ts` first with a red-then-green unit
   test (a dual-wield spec wearing 1H+OH, a two-handed candidate, asserting the
   attempt is skipped or the off hand cleared), then port to the fork copy and
   run the full ported-engine-file cycle in `docs/agents/known-traps.md`
   ("Before editing a ported engine file").
4. Reachability is already established (see the table above) — enh, warrior and
   hunter carry two-handers in every phase, rogue carries none. No need to
   re-derive it; do confirm the numbers if the fix depends on them.

## Acceptance

- [ ] ~~The engine's behaviour on a 2H + off-hand request is established and
      written down.~~ Struck: declined by owner 2026-09-10.
- [ ] Option 1 or 2 chosen, with the reason recorded against the existing
      two-item-swap position in `rank.ts`. **Option 2 is chosen** — see the
      decision below. The box stays unticked because the implementation half
      is still open.
- [ ] Fixed in `packages/core/src/rank.ts` with a unit test that fails before
      the fix, and ported to the fork copy with the known-traps cycle done.
- [ ] `pnpm verify` green, E-W3 green on Node >= 22.5.0 (it cannot collect on
      Node 20 — `node:sqlite` is missing).

## Notes

Found by reading, not by a failing test or a bad row. Related: 308 and 309
(second-copy rows, the other side of `attemptEligibility`), 342 (the comparison
that surfaced this), 351 (the other finding from the same pass).

## Decision (2026-09-10)

**Step 1 of this ticket could not be run.** There is no committed dual-wield
skeleton or request fixture. The only request fixtures are `feralCatDruid` and
`retributionPaladin`; the only skeletons `packages/core/src/cli-wiring.ts` can
load are `data/presets/{feral,ret}/p2.raid-sim-skeleton.json`; and both of those
specs are excluded from `DUAL_WIELD_SPECS` in `packages/core/src/pool.ts`,
so `simSlotsForPoolSlot` never offers either an off-hand **placement** and the
ranker cannot compose a 1H+OH set for them. (`pool.ts`'s own comment there says
"neither can put anything in the off hand"; read as a statement about TBC that
is too strong — feral-p3 carries 11 `HandTypeOffHand` held items a druid can
wear. It is the ranker's placement rule, not the game's equip rule, that makes
these skeletons unable to express the set. Corrected at the pre-merge review,
finding D2; the comment itself is left as upstream-of-us prose.) A request for enh,
warrior or hunter would have to be hand-authored, which
the `hand-built` warning in `packages/core/test/direct-sim-support.ts` (grep
for it) warns can differ from what `rank.ts` actually sends. Commands and output:
`.scratch/stage-gate/reforge-catchup-leftovers/probe/results.md`. The missing
fixture is filed as **ticket 365**.

**Reading only — not a measurement.** No hand-type check gates the off-hand
weapon on the `raidsim` path. `IsDualWielding` is `options.OffHand.SwingSpeed
!= 0` (`sim/core/attack.go:441`), and `GetOHWeapon`
(`sim/core/character.go:560-568`) returns nil only when the off-hand item is
absent, a shield, or a dedicated `WeaponTypeOffHand` item — never because the
main hand is `HandTypeTwoHand`. So the reading splits by what is worn: a
dedicated off-hand item contributes no swing but **its stats still apply**,
while a real one-hander left in the off hand appears to swing alongside the
two-hander. Upstream's defensive clear lives only in the bulk generator
(`sim/core/bulk/generator.go:335`), which this path does not reach.

**Live observation: unavailable.** The enhancement page was expected to show a
*rejects* outcome as a run error or missing two-hander rows. It aborts earlier
than that, in the item-swap path (`No item with id: 30832`, ticket 362), before
any candidate is priced. It separates none of the three candidate answers.

**One finding that holds regardless of what the engine does.**
`statDeltaBetween(equipment, swapped)` in `packages/core/src/rank.ts` and the
fork's `upgrades/engine/rank.ts` — grep for the call — diffs a set that still
contains the worn off-hand item,
because `swapItemAt` rewrites exactly one index. So a two-hander row's **stat
delta column** never debits the off-hand stats it claims to replace — true
whether the engine drops the off hand, counts it, or rejects the set. This is an
argument about the delta column only. It is **not** a selection between Option 1
and Option 2, and not a reason to prefer either.

**No option is chosen, and no code lands on this branch.** The choice between
skipping the attempt and clearing the slot waits on the measurement that ticket
365 unblocks. The acceptance boxes above stay unticked: recording "unmeasurable
from committed inputs" satisfies none of them.

## Decision (2026-09-10, option 2 chosen)

### 1. Option 2 is the owner's choice

**Clear the off-hand slot when a two-hander lands in the main hand, and price
that swap honestly.** Option 1 (skip the attempt) is rejected because
two-handers are a real upgrade path for enh, warrior and hunter, and hiding
those rows is worse than disclosing a two-item change.

The engine measurement this ticket carried as step 1 is **not wanted**: "sounds
like a waste of processing" (owner, 2026-09-10). It is struck from acceptance
rather than deferred.

Ticket 365 no longer blocks this one. The tab reaches this case from live page
state with no fixture and no skeleton, so the fixture 365 describes was never
what stood in the way — see `ADR-0031`.

### 2. Relation to the existing off-hand guard — two cases, no conflict

The guard is inlined in the `runCandidate` slot loop in
`packages/core/src/rank.ts`; grep for
`slotName === "offhand" && !mainHandIsOneHanded`. Its comment reads in full:

> A one-hander is only a legal off-hand candidate if the weapon
> already in the main hand is itself one-handed. `simSlotsForPoolSlot`
> filters the _candidate's_ hand type and knows nothing about what is
> worn, so without this the ranker sims a one-hander into an empty off
> hand while a two-hander stays in the main hand — a pairing the game
> cannot equip, priced as an upgrade.
>
> Skipping is the minimal correct semantics. The alternative, letting
> the off-hand pick displace the worn two-hander, prices a two-item
> swap under a one-item row: the delta would silently include losing
> the two-hander, which is not what the row claims. A player holding a
> two-hander who wants to dual-wield gets that answer from the
> main-hand rows, which are ranked normally.

**The comment's case:** a two-hander is already **worn**, and a one-hander is
offered as an **off-hand candidate**. Equipping it would give 2H + 1H, which the
game cannot equip, so the guard skips it. The comment separately rejects the
alternative remedy — displacing the worn two-hander — because that row would
price a one-hander while silently costing a two-hander.

**This ticket's case is the mirror:** a one-hander plus an off-hand item is
worn, and a **two-hander is the candidate** for the main hand. The guard never
fires here, because it tests only candidates aimed at the off hand.

**The remedies differ because the outcomes differ.** Clearing the worn
two-hander (the comment's case) leaves a strictly worse setup and a dishonest
row. Clearing the worn off-hand item (this case) leaves a legal, ordinary
two-hander build and an honest one-for-one swap.

**Option 2 is not an override of that comment.** The owner read the comment in
full on 2026-09-10 and ruled there is no conflict to resolve: "sounds good, I
don't see anything wrong with that". On the rejected alternative — a worn
off-hand weapon with no main hand — "an offhand weapon with no mainhand would
never happen, no one would do it. it would never win."

The guard comment gains a scope statement in this branch (the `ADR-0031` stage,
comment-only, no logic change) so the distinction is visible at the code and
does not need this ticket to reconstruct it.

### 3. The row must disclose the off-hand loss

A two-hander row that clears the off hand is a **two-item row**, and must read
as one rather than as a silent one-item swap. `statDeltaBetween(equipment,
swapped)` will debit the off hand only once the swapped array has the off-hand
index emptied — today it never does, because `swapItemAt` rewrites exactly one
index.

### 4. No behaviour change lands in this stage

This is the decision record only. Implementation is a separate ticket: it
touches a ported engine file, so it runs the five-step cycle in
`docs/agents/known-traps.md` § "Before editing a ported engine file".
