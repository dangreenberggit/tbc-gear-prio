Status: closed
Type: bug
Origin: docs/reviews/feat-upgrades-dedup-wowsims.md (round 3 — domain axis, D1)
Blocks: none
Blocked by: none

# A second copy of a non-unique ring or trinket can never be ranked

Found by the domain axis while checking whether ticket 304's UI change (dropping
worn items from the below-cutoff group) could hide a real upgrade. It cannot —
but only because of this pre-existing engine limitation, which the reviewer
surfaced in the process.

**This diff neither causes nor worsens it.** Filed because it is a real TBC case
the engine cannot express, and because the safety argument for 304's UI change
quietly depends on it.

## The limitation

`rank.ts:680-681` (fork `vendor/tbc-new-fork`):

```ts
const wornAt = equipment.findIndex((spec) => spec.id === entry.itemId);
if (wornAt >= 0 && wornAt !== slotIndex) continue;
```

An item that is already worn is only ever simmed back into **the slot it already
occupies**. If the player wears item X in `finger1`, the candidate row for X in
`finger2` is skipped by that `continue` — the row is never produced at all.

## Why it is a real case in TBC

Rings and trinkets come in pairs of slots, and **non-unique** items may legally
be worn twice. A player holding two copies of the same non-unique ring can
equip both. Today the tool cannot tell them that is an upgrade, because the
second-copy row does not exist.

Note `usedUnique` (`rank.ts:1615`) tracks uniqueness for **gems only**, never for
items — so there is no existing item-uniqueness signal to build on. Adding this
means teaching the ranker the difference between "already worn here" and
"already worn somewhere", and consulting item uniqueness before allowing the
second placement.

## Why it matters beyond the missing feature

The UI change in ticket 304 drops `owned` rows from the below-cutoff group. That
is safe *because* an owned item is only ever re-simmed into its own slot, so its
delta is ~0 by construction (noise). If this ticket is ever fixed — if a second
copy becomes a rankable candidate — then an `owned` item could legitimately
carry a real positive delta in the *other* slot, and the UI's unconditional drop
would start hiding a genuine upgrade.

So whoever fixes this must revisit `rowsTable`'s
`belowCutoffInView && !r.owned` filter in `upgrades_tab.tsx` at the same time.
That coupling is the reason this is filed rather than left as folklore.

## Acceptance

- [x] Decide whether second-copy placement is in scope for this tool at all —
      it may be deliberately out of scope, which is a fine answer to record.
      **Decided: deliberately out of scope.** See the decision below.
- [x] If in scope: item uniqueness is consulted, and a second copy of a
      non-unique item becomes a candidate for the other slot of its pair.
      Vacuous — the "if in scope" arm does not apply. The work is mapped in
      ticket 309.
- [x] The `owned`-row drop in `rowsTable` is revisited in the same change, so a
      genuinely positive owned row cannot be hidden. **Revisited and left
      unchanged, deliberately** — see below.
- [x] A test covers the second-copy case at the module interface. Carried to
      ticket 309 with its honest form (a live recording, not a fabricated
      fixture) — see below.

## Decision: deliberately out of scope

Recorded 2026-08-27. No ranking behaviour changed; comments only.

**The guard named above is not the only thing suppressing the row, so relaxing
it does not produce one.** `rankUpgrades` emits one row per *item*, not per
*placement*: it loops the item's eligible slots, keeps only the best swap, and
emits a single `RankedItem`. For an owned ring the worn-slot placement is the
identity swap at delta ~0, so an unguarded second placement would not appear
alongside it — it would **win and overwrite it**, silently turning "you already
wear this" into "wear a second one" with nothing in the row saying which. That
is a silent wrong answer, which is worse than the missing feature.

Doing it correctly is a **per-placement row redesign** spanning engine output,
the view, and the UI — not a guard edit. Two further structural blockers:

- **The fixtures cannot measure it honestly.** `RecordedSimRunner.run` throws
  `no recording for sim key ${key}` on any unrecorded request, so a
  duplicate-equip probe cannot distinguish "the sim rejects it" from "no
  recording exists". A test would need a live recording; fabricating one would
  decide its outcome in advance.
- **The UI has no worn-slot signal.** `ViewRow.owned` derives from
  `equippedIds.has(entry.itemId)` — it records *that* an item is worn, never
  *where*, so the filter adjustment an implementation needs has no left-hand
  side.

**Why the `rowsTable` filter stays unchanged.** Its safety argument — an owned
item is only ever re-simmed into its own slot, so its delta is ~0 — remains true
while the guard stands, and this change leaves the guard standing. Changing the
filter now would alter behaviour with no defect to fix. The revisit is
discharged as documentation instead: the comment block at the filter now names
the guard coupling, ticket 309, and the `ViewRow` plumbing an implementation
would need, so the next reader finds it by reference rather than by folklore.

The reasoning is written at all three sites — the guard in `packages/core/src/rank.ts`,
the guard in the fork's `upgrades/engine/rank.ts`, and the `rowsTable` filter in
`upgrades_tab.tsx` — so nobody has to re-derive it from a closed ticket.

**Follow-up: ticket 309** (`309-per-placement-rows-second-copy.md`) carries the
redesign map, the ready item data, the live-recording test requirement, and the
filter coupling.

## Comments
