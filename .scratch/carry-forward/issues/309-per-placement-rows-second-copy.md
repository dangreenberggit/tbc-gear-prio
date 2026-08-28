Status: open
Type: design
Origin: .scratch/stage-gate/tickets-306-308/plan.md (Q2; closes ticket 308 as out of scope)
Blocks: none
Blocked by: none

# Per-placement rows, so a second copy of a non-unique item can be ranked

Intended shape, per the owner: a **user-facing option**, default off — see
"If this ships as a user-facing option" below. The switch is cheap; everything
in front of it is not, and the switch cannot be built without it.

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

## If this ships as a user-facing option

The owner's framing (2026-08-27): second-copy rows would be **a toggle the user
turns on**, not unconditional behaviour. Recording the shape now so the option
is specified whenever this is picked up.

**The toggle is strictly additive to everything above — it does not replace any
of it.** The per-placement row model has to exist and label its rows honestly
*before* a switch can turn them on. There is no version of this that skips the
redesign: the cheap version is flipping the guard, and that is the silent wrong
answer this ticket exists to avoid. Read the toggle as *redesign + switch*, and
size it accordingly.

**The switch itself is the cheap part, and cheaper than it looks.** Measured
2026-08-27:

- The tab already has a `ToggleControl` class (`upgrades_tab.tsx`) and **three
  existing checkboxes** built on it — `bisPrune`, `setPotential`, `bisOnly`. A
  fourth copies an established pattern rather than inventing one, and
  `ToggleControl` already handles the preference-preservation problem its own
  comment describes (forcing a control off must not destroy the user's setting).
- `ViewOptions` (`packages/core/src/view.ts`) already carries exactly this kind
  of flag — `hideOwned`, `pinBis`, `withSetPotential` — and `applyView` is a
  **pure post-sim filter**: zero `await`, zero `SimRunner` references in the
  whole file. A view-level toggle therefore costs no re-sim and no recording.

**But the toggle probably cannot live entirely in `ViewOptions`,** and this is
the design question to settle first. `applyView` filters rows that already
exist; second-copy rows do not exist unless the ranker produced them. Two
options, and they differ in cost:

1. **Rank-time flag.** The ranker emits second-copy placements only when the
   option is on. Cheapest row model — nothing downstream sees a placement
   concept when the toggle is off — but flipping the switch requires a re-rank,
   and `content-hash.ts` deliberately excludes `ViewOptions` from the hash
   (see its comment at line 106), so this flag is **not** a `ViewOptions` field
   and must not be added as one.
2. **Always rank, filter at view.** The ranker always emits per-placement rows;
   the toggle hides them. Flipping is instant and needs no re-sim, but every
   downstream consumer of `RankedItem` sees the placement concept permanently,
   whether or not any user enables it — which is the larger of the two blast
   radii against those 51 references.

Choose deliberately; do not let the choice fall out of whichever file gets
edited first.

**A default and a reason to switch it off are part of the work.** A toggle
nobody would ever turn off should not be a toggle. The honest default is
**off**, because the rows are only meaningful to a player who actually holds two
copies of a non-unique item, and an always-on second-copy row is noise for
everyone else.

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
- [ ] **Toggle:** rank-time-flag vs always-rank-filter-at-view decided on the
      record, with the blast radius each implies stated.
- [ ] **Toggle:** if rank-time, the flag is kept out of `ViewOptions` so
      `content-hash.ts`'s exclusion stays honest.
- [ ] **Toggle:** default is off, with the reason a user would turn it on
      written where the control lives.

## Comments
