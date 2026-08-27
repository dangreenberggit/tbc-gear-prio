Status: open
Type: design
Origin: .scratch/stage-gate/tickets-306-308/plan.md (Q2; closes ticket 308 as out of scope)
Blocks: none
Blocked by: none

# Per-placement rows, so a second copy of a non-unique item can be ranked

Ticket 308 asked for a second copy of a non-unique ring or trinket to become a
rankable candidate. It was closed as **deliberately out of scope** because the
change it names is not the change it needs. This ticket carries what an actual
implementation would require, so the work is deferred with its map rather than
lost.

## Why the guard is not the fix

308 pointed at the worn-item guard:

```ts
const wornAt = equipment.findIndex((spec) => spec.id === entry.itemId);
if (wornAt >= 0 && wornAt !== slotIndex) continue;
```

Relaxing it does not produce the missing row. `rankUpgrades` emits **one row per
item, not per placement**: for each pool entry it loops over the item's eligible
slots, keeps only `if (!best || deltaDps > best.deltaDps)`, and emits a single
`RankedItem` (`packages/core/src/rank.ts`, the slot loop around the `best`
accumulator). For an owned ring, the worn-slot placement is the identity swap at
delta ~0, so an unguarded second placement would **win that comparison and
overwrite it** — the row would silently change meaning from "you already wear
this" to "wear a second one", with nothing in the row saying which it is. That
is a silent wrong answer, the failure mode this project treats as its worst
case.

So the feature is a **per-placement row concept**, not a guard edit.

## What an implementation has to change

1. **Engine output shape.** `RankedItem` needs to express which placement a row
   prices, so a second-copy row and an identity-swap row for the same item can
   coexist and be told apart. Today `slotChoice` records the slot the best swap
   landed in, but there is still only one row per item to carry it.
2. **View and UI.** `ViewRow.owned` comes from `equippedIds.has(entry.itemId)`
   (`rank.ts`) — it records *that* an item is worn, never *where*. Any UI that
   must distinguish "your worn ring" from "a second copy of your worn ring"
   needs worn-slot information that does not exist in the view today.
3. **The below-cutoff owned-row filter.** `upgrades_tab.tsx`'s
   `allRows.filter((r) => r.belowCutoffInView && !r.owned)` is safe **only
   because** the guard stands: an owned item is re-simmed into its own slot, so
   its delta is ~0 and nothing real is hidden. Once an owned item can carry a
   genuine positive delta in the other slot, this filter starts hiding a real
   upgrade and must change in the same change. The coupling is now commented at
   both sites; this is the ticket that discharges it.
4. **Uniqueness consulted at candidacy.** Only non-unique items may be worn
   twice, so the second placement has to be gated on the item's `unique` flag.

## The data is already there

- Every item entry carries `unique`: **8,253 items, all populated — 1,409 true /
  6,844 false**; **163 of 735** rings+trinkets are non-unique.
  Measured: `python` over `data/items/index.json`.
- Both engine copies already expose `unique: boolean` on their item entry
  (`packages/core/src/items.ts`, fork `upgrades/engine/items.ts`).
- It is currently **dead data** for items: all five `.unique` consumers in
  `packages/core/src` are gem paths (`candidate-gems.ts` ×3, `meta-repair.ts`,
  `rank.ts`'s `usedUnique`). Measured: `grep -rn '\.unique' packages/core/src/`.

So nothing needs to be sourced or backfilled. The gap is entirely in the row
model, not in the item data.

## The test requirement — do not fabricate a fixture

`RecordedSimRunner.run` keys on a sha256 of the whole request and throws
`no recording for sim key ${key}` on any miss
(`packages/core/src/seams/sim-runner.ts`). A duplicate-equip request is
necessarily a miss, so **no offline probe can distinguish "the sim rejects
duplicate equip" from "no recording exists"** — both surface as the same throw.

A test for this feature therefore needs a **live recording** of a duplicate-ring
configuration, not a hand-written fixture. Choosing the DPS by hand would decide
the test's outcome in advance and prove nothing. Recording that configuration is
part of this ticket's work.

## Payoff, measured on one pool only

The committed `data/universes/ret-p3.json` pool contains **467 entries, 70
finger+trinket, of which exactly 3 are non-unique**: Band of Devastation
(32526), Ring of Ancient Knowledge (32527), Blessed Band of Karabor (32528).
Re-measured independently during execution; it reproduces.

Read this as a fact about **one committed pool file**, not about the feature. A
different phase or spec universe could hold many more non-unique pairs, and the
count of pool entries a player actually holds two copies of is smaller still.
It is context for prioritisation, not an argument — the out-of-scope decision in
308 rests on the structural facts above and stands without this number.

## Acceptance

- [ ] A row model that can express per-placement candidacy, agreed before it is
      built (this is a design ticket first).
- [ ] Uniqueness consulted so only non-unique items get a second placement.
- [ ] `ViewRow` carries worn-slot information, not just worn-or-not.
- [ ] The `rowsTable` owned-row filter changes in the same change.
- [ ] A live sim recording covers the duplicate-equip case; no fabricated
      fixture.
- [ ] The comments at both `rank.ts` guards and at the `rowsTable` filter are
      updated to match whatever is built.

## Comments
