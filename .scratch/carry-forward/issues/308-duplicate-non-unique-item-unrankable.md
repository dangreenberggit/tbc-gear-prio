Status: open
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

- [ ] Decide whether second-copy placement is in scope for this tool at all —
      it may be deliberately out of scope, which is a fine answer to record.
- [ ] If in scope: item uniqueness is consulted, and a second copy of a
      non-unique item becomes a candidate for the other slot of its pair.
- [ ] The `owned`-row drop in `rowsTable` is revisited in the same change, so a
      genuinely positive owned row cannot be hidden.
- [ ] A test covers the second-copy case at the module interface.

## Comments
