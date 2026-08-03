Status: closed
Type: bug
Origin: ticket 17 triage + pre-merge review (Domain finding 2), 2026-08-02
Closed: 2026-08-03 (`3106bb5`)
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

## Resolved 2026-08-03 (`3106bb5`)

All five items are in `ret-p5.json` with real, discriminable sources. Two of
this ticket's premises were wrong, and both corrections are worth keeping.

**The root cause was narrower than "nothing emits a heroic source."** Nothing
read `sources[].drop.difficulty` either, so `map_db_source` labelled every
heroic drop `kind: "raid"` carrying a dungeon name, which membership then
tested against `phase_raids.json`. 34472 did not look excluded — it looked
like a raid drop from a raid that does not exist. Wowhead's own text hit the
same trap one layer up: `"Drop: Priestess Delrissa (Heroic Magisters'
Terrace)"` parsed to a `raid` row with zone `"Heroic Magisters' Terrace"`,
which would have tripped the `d9dee9f` guard had the item ever been admitted.

`difficulty == 2` turned out to be a clean discriminator — all 472 such drops
in the pinned db sit in the 16 five-man zones, none in a raid — so no zone
list is needed to tell heroic from raid.

**The "phase → heroic-dungeon map" this ticket asked for is deliberately
minimal.** Item `phase` already separates the tiers: 15 of the 16 heroics drop
phase-1 items only (284 ret-eligible, measured), and Magisters' Terrace drops
phase-5. `PHASE_HEROIC_DUNGEONS` therefore lists MT alone, and admission is
still gated on the item's own phase, so the map can grow later without
leaking phase-1 gear into a p2 list. Broadening it to the other 15 dungeons is
ticket 17's pre-raid question — noted as wanted eventually, lowest priority.

**The four `sources: null` items are not badge/craft/rep.** Per the Wowhead p5
list, 34388/34392/34397 are Sunwell Plateau raid drops (34192/34195/34211,
themselves already in the universe) upgraded via a **Sunmote** at vendor Yrma.
That is two-hop in exactly the sense the engine already models, so they got a
real source rather than the force-include this ticket proposed. They live in
`data/two-hop/ret-sunmote-upgrades.json` rather than `ret-tokens.json`,
because the latter is the ret **tier set** map and `pool-hardening.test.ts`
pins it against wowsims db `setId`s — adding non-set pieces there fails that
test, correctly. Only 34679 is a rep reward; the Wowhead parser simply had no
rep branch, so the text was discarded.

Membership: p2 230 unchanged, p3 354 → 356, p4 401 → 403, p5 467 → 484. The
p3/p4 additions are 29119 Haramad's Bargain and 30834 Shapeshifter's Signet,
two rep rewards the new parser branch resolves — both were already entitled to
membership through the existing list-only path. Each tier is still a strict
superset of the one below.

The `it.todo` is now a real test asserting the source **kind** per item rather
than mere presence, since the mechanism is what was broken in each case.
Mutation-checked three ways — emptying `PHASE_HEROIC_DUNGEONS`, disabling the
rep branch, and breaking the Sunmote file path each fail it naming the item
and the reason.

Ticket-17 intersection re-run afterwards: p4 and p5 both leave **69 missing,
all phase 1**, and **zero BiS-labelled items at phase ≥ 2** outside either
universe. Previously p5 left 76 (71 phase-1 + the 5 here).

### One thing fixed in passing

`map_db_source` was manufacturing `{"kind": "rep", "faction": "unknown",
"standing": "unknown"}` for rows keyed only by `repFactionId`. db.json ships
no faction table, so that row can never be resolved, and because `pool.ts`
reads `sources[0]` it displaced the real Wowhead-derived source on 29119. It
now returns `None` when both fields are unresolvable. Partially-resolved rows
are untouched.
