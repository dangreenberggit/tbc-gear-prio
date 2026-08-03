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

### Corrected 2026-08-02 — "out of raid scope" is the wrong test

An earlier revision of this section called the whole remainder "the
raid-scoped design working as intended." That reasoning does not hold up, and
the correction matters for the p5 finding below.

**Whether an item belongs in a tier's universe is about its power at that
tier, not about which content type drops it.** If a heroic dungeon drops
something that is BiS at phase 5, a phase-5 shopping list that omits it is
wrong, regardless of the zone it came from. Content type is a fact about
where you go to get an item; it is not a reason to hide the item.

Note also that badge vendors being absent at P2/P3 was a **convenience
shortcut**, not a scoping decision. It should not be cited as intent.

So the remainder splits by *what the list is advising*, not by source kind:

- **26 phase-1 items labelled "Best"/"Near Best", all from the `pre-raid`
  stage list** — these are BiS *before you raid*. A P2+ universe omitting
  them is defensible: the guide itself scopes them to pre-raid.
- **The 5 phase-5 items below** — labelled BiS *at the top tier*, which is
  precisely the tier `ret-p5.json` exists to serve. Omitting these is a real
  defect, not scope.

- **30257 Shattrath Leggings** — `sources` is `null` in db.json, so no
  AtlasLoot/Wowhead coverage resolves it from current inputs; it needs a
  force-include with a documented source. It is phase 1 and pre-raid stage,
  so it stays out of a p2/p3 universe on the pre-raid argument above — not
  on a content-type argument.

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

These are not marginal. Measured from db.json:

- **34472 Shard of Contempt** — `stats {24: 44}`, i.e. **44 expertise
  rating**, the second-heaviest term in the ret EP model at 2.14. Drops in
  Magisters' Terrace at `difficulty: 2` (heroic).
- **34388 / 34392 / 34397** — ilvl **159** each (the pre-merge domain review
  claimed 154 for the first two; `scalingOptions.0.ilvl` in the pinned db.json
  says 159 for all three — re-check before "correcting" this), two or three
  sockets each, on
  plate/leather body slots. For comparison the shipped p5 universe's raid
  gear tops out around the same ilvl.
- **34679 Shattered Sun Pendant of Might** — 64 AP, 18 Agi, a rep reward.

So the p5 universe is missing four "P5 BIS"/"Absolute BIS" items and a named
rep option, at the exact tier that file exists to serve. **This is a defect
to fix, not scope to accept** (see the correction above).

### The mechanism is already there, just unwired

`ITEM_SOURCE_KINDS` in `assemble_universe.py` already includes `"heroic"`,
and `source_zones()` already treats `heroic` like `raid`/`token` for zone
attribution. But **nothing emits a `heroic` source** — the shipped p5
universe contains only `raid` (514), `crafted` (39), `token` (18), `pvp` (6)
and `badge` (6). Membership is gated on the source's zone appearing in
`phase_raids.json`, which lists raid zones only.

So admitting these needs: a phase→heroic-dungeon mapping (or an equivalent
inclusion rule) plus a source path for the four with `sources: null`, which
are Shattered Sun badge/craft/rep rewards that db.json does not attribute.

**Scope of the fix is small and bounded**: intersecting the p4/p5 stage lists
with `ret-p5.json` leaves exactly **5 items**. The phase-1 pre-raid remainder
is a separate question and is not part of this.

Only a **p5** run is affected today; p2/p3 are unchanged. Re-derive with the
p4/p5 stage-list intersection described above.

## Update 2026-08-03 — the phase-5 half is closed, and the heroic path now exists

Ticket 28 landed (`3106bb5`). The five phase-5 items are in `ret-p5.json`, and
re-running the intersection above now gives **69 missing at both p4 and p5,
all phase 1, zero BiS-labelled at phase ≥ 2**. (76 → 69 at p5: the five from
28, plus 29119 and 30834, two rep rewards a new Wowhead parser branch
resolves.)

What that leaves on this ticket is the phase-1 pre-raid remainder, unchanged.

**The mechanism this ticket said was missing now exists.** `assemble_universe.py`
reads `sources[].drop.difficulty` and emits `kind: "heroic"`, keyed by
`PHASE_HEROIC_DUNGEONS`. That map deliberately lists **only Magisters'
Terrace at phase 5**.

Measured while doing 28, and directly relevant here: the other **15 heroic
dungeons carry 284 ret-eligible items, every one of them phase 1** —

```
Mana-Tombs 25, The Botanica 23, The Underbog 23, Hellfire Ramparts 21,
The Blood Furnace 20, Old Hillsbrad Foothills 20, The Steamvault 18,
The Black Morass 18, The Slave Pens 18, The Mechanar 18, The Arcatraz 18,
The Shattered Halls 17, Shadow Labyrinth 16, Sethekk Halls 16,
Auchenai Crypts 13
```

So admitting heroic dungeons broadly is now a **one-line change** to that map
plus a re-measure — the plumbing, the source kind, the `pool.ts` variant, the
report formatting and the validation guard are all in place, and admission is
already gated on the item's own phase so nothing leaks upward into p2+.

Flagged by the user as wanted eventually, **lowest priority**: it would rewrite
the phase-1 end of every tier, so it needs its own before/after measurement of
what a pre-raid shopping list should contain, not a drive-by.

Note this does not by itself resolve 30257 Shattrath Leggings — that one has
`sources: null` in db.json, so no difficulty-based path reaches it.

## Done when

- A short inventory (script or report section) lists phase≥2 `excludedNoSource`
  IDs that appear in wowsims ret gear sets and/or Wowhead ret lists after a
  fresh collect — ranked by relevance.
- Decision per bucket: add AtlasLoot/Wowhead coverage, explicit force-include
  with documented source, or accept exclude with reason.
- 30257 either enters the universe with a real source row, or a ticket note
  explains why it stays out (and the `it.todo` is updated).
