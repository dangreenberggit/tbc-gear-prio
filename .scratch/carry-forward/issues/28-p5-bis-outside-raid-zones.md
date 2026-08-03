Status: open
Type: bug
Origin: ticket 17 triage + pre-merge review (Domain finding 2), 2026-08-02
Blocks: none
Blocked by: none

# `ret-p5.json` omits five phase-5 BiS items because they drop outside a raid

## Problem

The universe gates membership on the source's zone appearing in
`phase_raids.json`, which lists raid zones only. At phase 5 that drops five
items the Wowhead ret list names, four of them BiS-labelled:

| id | item | list label | db sources |
|---|---|---|---|
| 34472 | Shard of Contempt | **Absolute BIS** | drop: Magisters' Terrace (heroic) |
| 34388 | Pauldrons of Berserking | P5 BIS - 48 hit | *none* |
| 34392 | Demontooth Shoulderpads | P5 BIS - 48 hit | *none* |
| 34397 | Bladed Chaos Tunic | P5 BIS - Contested | *none* |
| 34679 | Shattered Sun Pendant of Might | Rep Option | *none* |

These are not marginal. **Shard of Contempt is 44 expertise rating**
(`stats {24: 44}`), and expertise is weighted 2.14 in the ret EP model — the
second-heaviest term. The domain review called the "Absolute BIS" label
"correct and if anything understated". 34397 is ilvl 159 with three sockets.

Only a **p5** run is affected. p2/p3/p4 are unchanged.

## Why this is a defect and not scope

Whether an item belongs in a tier's universe is about **its power at that
tier, not which content type drops it**. A P5 shopping list that omits the
best trinket available at P5 is wrong, whatever zone it came from. See the
2026-08-02 correction on ticket 17 — an earlier triage dismissed these as
"out of raid scope", which was the wrong test.

Note badge vendors being absent at P2/P3 was a **convenience shortcut**, not
a scoping decision, and should not be cited as intent.

## The mechanism is half-built already

`scripts/assemble_universe.py` already has what it needs on one side:

- `ITEM_SOURCE_KINDS` includes `"heroic"`.
- `source_zones()` already treats `heroic` like `raid`/`token` for zone
  attribution.
- `pool.ts`'s `ItemSource` union has a `heroic` variant with a `dungeon`
  field, and `rank-report.ts` already formats it (`Heroic · ${dungeon}`).

**But nothing emits a `heroic` source.** The shipped p5 universe carries only
`raid` (514), `crafted` (39), `token` (18), `pvp` (6) and `badge` (6).

## Done when

- A phase → heroic-dungeon mapping exists (or an equivalent inclusion rule)
  so a heroic drop can be admitted at the right tier, with `Magisters'
  Terrace` reaching phase 5.
- A source path exists for the four items db.json gives `sources: null` —
  Shattered Sun badge/craft/rep rewards. AtlasLoot or a documented
  force-include, same shape as the world-boss handling.
- 34472 enters `ret-p5.json` with a real source row; the other four either
  enter or get a per-item note saying why not.
- The `it.todo` in `pool-hardening.test.ts` ("admits the phase-5 BiS items
  outside raid zones") becomes a real test.
- Re-run the ticket-17 intersection afterwards: p4/p5 stage lists vs the
  shipped universe should leave no BiS-labelled item outside.

## Notes

Scope is bounded — intersecting the p4/p5 Wowhead stage lists with
`ret-p5.json` leaves exactly these five. The phase-1 pre-raid remainder is a
separate question (ticket 17) and is deliberately not part of this.

Watch the zone guard added in `d9dee9f`: source validation now rejects any
`raid`/`token` zone absent from `phase_raids.json`. A heroic dungeon is a
different `kind`, so it is not caught by that rule — but whatever admits it
should get an equivalent guard rather than none.
