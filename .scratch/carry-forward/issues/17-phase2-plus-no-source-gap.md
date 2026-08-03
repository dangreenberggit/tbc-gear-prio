Status: open
Type: task
Origin: `.scratch/handoffs/raid-scoped-pool-implementation-review.md` defect 3
Blocks: none
Blocked by: none

# Own the phase-2+ `excludedNoSource` gap

## Problem

Universe assembly drops items with no resolvable source (db sources,
AtlasLoot, Wowhead list, or two-hop). Reports show thousands excluded;
among them **~673 at phase ≥ 2** that are not “vanilla junk.” Concrete miss:
**Shattrath Leggings (30257)** — in all three vendored wowsims ret gear sets,
quality 3, no db/AtlasLoot/Wowhead list source → absent from the universe
(`pool-hardening` has an `it.todo` for it).

Also named: Band of the Eternal Champion (29301) and Band of Eternity family.

Plan §3 treated no-source as mostly acceptable; the phase-2+ remainder needs
an owner and a triage, not silent acceptance.

## Triaged 2026-08-02 — the ret-relevant remainder is all phase 1

Inventory written to `.scratch/carry-forward/ticket-17-excluded-inventory.json`
(regenerate from the snippet in this section's commit). Method: union the
wowsims ret gear-set ids (36) with the Wowhead ret list ids for pre-raid, p1-p2
and p3 (171 total), subtract the shipped p3 universe.

**71 ret-relevant ids are excluded. Every one is phase 1**, and **none is a
drop in a `phase_raids.json` zone.**

| db source | count |
|---|---:|
| dungeon `drop` (non-raid zone) | 33 |
| no `sources[]` at all | 24 |
| `crafted` | 13 |
| `rep` | 1 |

So the headline "~673 at phase ≥ 2 that are not vanilla junk" does **not**
survive intersecting with what ret actually wants: the phase-2+ remainder
contains no item that any ret source lists. The 1366 `excludedNoSource` rows
at p3 are real, but the ret-relevant slice of them is empty above phase 1.

This is the raid-scoped design working as intended, not a defect — heroic
dungeon drops, crafted gear, rep and pre-raid items are deliberately out of a
raid-zone-scoped universe (the previous handoff's "things that look like bugs
but are not").

### Per-bucket decision

- **Dungeon drops, crafted, rep, pre-raid (70)** — accept the exclusion. All
  phase 1, all outside raid scope by design. Admitting them is the pre-raid /
  non-raid-sources feature, not a source-coverage bug.
- **30257 Shattrath Leggings** — `sources` is literally `null` in db.json, so
  no amount of AtlasLoot/Wowhead coverage resolves it from the current inputs;
  it needs a force-include with a documented source. It is **phase 1** and a
  pre-raid item, so it does not belong in a p2/p3 raid universe anyway. Left
  out, and the `it.todo` should say "phase 1, out of raid scope" rather than
  implying a coverage gap.

### Re-run at p4 and p5 — one real finding, left for a decision

The p4/p5 Wowhead lists **are** already collected (96 and 118 entries), so
this was measured rather than deferred, against the p4/p5 universes shipped
the same day:

```
p4: wowhead ids=178  missing=71  all phase 1  raid-zone drops missed: 0
p5: wowhead ids=208  missing=76  phase 1 x71 + phase 5 x5   raid-zone drops missed: 0
```

The p4 result is the same phase-1 set as above. **p5 surfaces five phase-5
items the Wowhead ret list names that the universe does not carry:**

| id | item | list says | db sources |
|---|---|---|---|
| 34388 | Pauldrons of Berserking | P5 BIS - 48 hit | *none* |
| 34392 | Demontooth Shoulderpads | P5 BIS - 48 hit | *none* |
| 34397 | Bladed Chaos Tunic | P5 BIS - Contested | *none* |
| 34472 | Shard of Contempt | **Absolute BIS** | drop: Magisters' Terrace |
| 34679 | Shattered Sun Pendant of Might | Rep Option | *none* |

Four have no db source at all; Shard of Contempt drops in Magisters' Terrace,
a **heroic dungeon**, not a raid zone. These are the Sunwell-era badge /
craft / rep tier — the same class of item as the phase-1 remainder, just at
the top of the game.

**Deliberately not acted on.** Admitting them means either widening past raid
zones or a force-include list, and the user scoped badge vendors to P1 and
possibly P4 — not P3, and this was never scoped at all. Flagging for a
decision rather than widening unasked.

Note this only bites a **p5** run, which became reachable the same day
`ret-p5.json` was first shipped. It does not affect p2/p3.

## Done when

- A short inventory (script or report section) lists phase≥2 `excludedNoSource`
  IDs that appear in wowsims ret gear sets and/or Wowhead ret lists after a
  fresh collect — ranked by relevance.
- Decision per bucket: add AtlasLoot/Wowhead coverage, explicit force-include
  with documented source, or accept exclude with reason.
- 30257 either enters the universe with a real source row, or a ticket note
  explains why it stays out (and the `it.todo` is updated).
