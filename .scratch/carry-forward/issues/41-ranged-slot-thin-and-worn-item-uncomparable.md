Status: partly fixed — see "What was fixed" below; the remainder stays open
Type: bug
Origin: sme-rank-review on phase-2/feral (ticket 05, gate box 2)
Blocks: none

# The ranged slot offers two items, and the worn one is not among them

Found by `sme-rank-review` on shredzepelin's feral cat shortlist
(`.scratch/handoffs/sme-rank-judgment-feral-shredzepelin.md`). It is a **pool**
problem, not a feral problem — ret has the same shape — so it is filed as
carry-forward rather than against ticket 05.

Rewritten 2026-08-06 after collecting `data/wowhead-lists/feral/p1-p2.json` and
running the count the previous revision only hypothesised about. Two causal
claims from the first revision were wrong and have been deleted; the real cause
is in "Why the worn items are absent" below, and it is neither of them.

## What a player sees

Both shipping universes offer exactly **two** items for the whole ranged slot:

```bash
python -c "import json;u=json.load(open('data/universes/feral-p2.json'));print([e['itemId'] for e in u['entries'] if e['slot']=='ranged'])"
# feral: 28568 Idol of the Avian Heart, 30051 Idol of the Crescent Goddess
# ret:   28592 Libram of Souls Redeemed, 30063 Libram of Absolute Truth
```

Two things make this worse than a small number:

1. **The item the character is wearing is not in the pool.** shredzepelin wears
   Everbloom Idol (29390). It never appears as a candidate, so the engine cannot
   say whether either offered idol beats it.
2. **One of the two is for the wrong role.** Idol of the Avian Heart boosts
   healing spells. Offering it to a feral cat is noise.

## How many worn items are uncomparable (the §3 count)

Measured across all three captured characters against their own universe. The
subject actor is the one whose name matches the fixture filename — the fixture
also contains the subject's whole raid, so matching any other way picks a
bystander.

| character | universe | worn | in universe | absent |
|---|---|---|---|---|
| slamaltman | ret-p2 | 18 | 12 | **6** |
| shredzepelin | feral-p2 | 17 | 5 | **12** |
| nexess | feral-p2 | 17 | 11 | **6** |

So it is a general hole, not one idol. Collecting the feral Wowhead list did not
move these numbers, because the list was never the binding constraint — see
below.

Not all 24 are closable by better source data. Three kinds:

- **Absent from the pinned db entirely** (3342, 28788, 14617, 5976) — shirts,
  tabards and similar. No pool change can admit them.
- **Real, eligible, and excluded for lack of a usable source** — the rest,
  including the two six-digit ids 278827 Amulet of Bitter Hatred and 278823
  Icebound Cloak. Those ids look like WCL-side offsets but are not: both are
  present in the pinned db, quality 4, phase 2, and D7-eligible, with
  `sources: None`. They fail for exactly the reason the rest of this ticket
  describes.

## Why the worn items are absent

Not "no db source records": that is a symptom shared by 29 rows sitting in the
shipping ret universe today, so it plainly does not prevent membership.

The binding constraint is that **wowsims' own curated gear sets already name
these items, and the repo reads that list but never lets it grant membership.**
`wowsims_curated_item_ids()` in `scripts/assemble_universe.py` loads the
vendored `*_gear.json` presets, and its result is used at one place only — line
~896, to stamp `bisTags: ["BiS"]` on an item that already got in some other way.
An item wowsims explicitly equips on a feral character is dropped for lacking a
parseable source, and the label that would have marked it never applies because
the row is not there to label.

```bash
python -c "
import json,sys; sys.path.insert(0,'scripts')
from assemble_universe import SPEC_PROFILES, wowsims_curated_item_ids
for spec in ['ret','feral']:
    ids=wowsims_curated_item_ids(SPEC_PROFILES[spec])
    u=json.load(open(f'data/universes/{spec}-p2.json'))
    uids={int(e['itemId']) for e in u['entries']}
    print(spec, 'curated', len(ids), 'in-universe', len(ids&uids), 'MISSING', len(ids-uids))
"
# ret   curated 36 in-universe 23 MISSING 13
# feral curated 32 in-universe 15 MISSING 17
```

**30 items across the two specs** are on wowsims' curated sets, are equippable
by the class, and are missing from the shipping universes. 29 of the 30 pass D7
eligibility. Everbloom Idol, Bloodlust Brooch, Shapeshifter's Signet,
Overseer's Signet and Idol of the Raven Goddess are all in this set, as are
slamaltman's Libram of Avengement and Shattrath Leggings.

Splitting them by why they are missing:

| cause | ret | feral |
|---|---|---|
| has a db source, excluded by phase/heroic scope | 7 | 9 |
| no usable source in any input | 6 | 8 |

The first group is ticket 17's five-man question and should stay there. The
second group is this ticket.

## Why the Wowhead list does not close it

`data/wowhead-lists/feral/p1-p2.json` now exists (79 rows). It did not recover
the ranged slot. `parse_wowhead_source` recognises ret's badge phrasing
(`50x Badge of Justice`, a leading count) but the feral guide writes
`Vendor: G'eras (Badges of Justice)` with no count, and writes reputation and
quest sources as free prose. 18 of the 79 feral rows parse to nothing.

Widening that regex was **not** the fix to reach for, and the membership change
below confirms it: Everbloom Idol, Bloodlust Brooch and Idol of the Raven
Goddess all entered without the parser learning a single new phrase. Chasing one
guide's prose style would have been reinventing something already vendored.

The unparsed rows are still worth revisiting eventually — the guide names
badge costs and reputation factions this repo could display — but that is now a
presentation improvement, not a membership blocker.

## What was fixed (2026-08-06)

Per user steer: the pool does not need an item's provenance, it needs to know
whether to hide the item behind a raid filter. An unrecorded non-raid item is
simply *not from a raid* — it should never appear in a raid-specific view, and
should never be filtered out by one either.

That removed the blocker. A new `{ kind: "unknown" }` variant carries no fields,
which is honest (no invented badge cost or faction) and, because it has no
`zone`, is already excluded from every raid and boss filter by the existing
`matchesZone` in `view.ts`. It renders as "Source not recorded".

`assemble_universe.py` now lets the curated sets grant membership, not just
apply a label — but **only for items with no recorded origin at all**. A curated
item that does have a db source keeps that source's scope rules; several point
at five-mans outside `PHASE_HEROIC_DUNGEONS`, and admitting those remains
ticket 17's question.

Effect on the worn-item count:

| character | absent before | absent after |
|---|---|---|
| slamaltman | 6 | **4** |
| shredzepelin | 12 | **8** |
| nexess | 6 | **2** |

The ranged slot recovers: Everbloom Idol (29390) and Idol of the Raven Goddess
(32387) now appear, both tagged `BiS`.

ret gained 5 rows at p2 and 3 at p3/p4/p5 — strictly additions, no row removed
and no existing row changed, so the phase-2 additions-only rule holds. All 8 are
wowsims-curated ret items that were being silently dropped, including Shattrath
Leggings, which slamaltman wears.

## What remains open

14 worn items are still uncomparable. By cause:

- **Not in the pinned db** (3342, 28788, 14617, 5976) — shirts and tabards. No
  pool change admits these; they may not belong in the count at all.
- **PvP gear** — shredzepelin's three Veteran's pieces and Violet Signet. Not on
  any curated set, not on the Wowhead list.
- **Five-man drops** — Hourglass of the Unraveller, Shackles of Quagmirran,
  Libram of Avengement. Curated, but their db source names an out-of-scope
  dungeon. Ticket 17.
- **278827 / 278823** — real, eligible, phase-2, `sources: None`, and absent
  from every curated set, so nothing admits them yet.

So the original "a worn item should be comparable in every slot" is still not
guaranteed. The remaining options:

- Always admit the character's **currently equipped** item as a candidate,
  regardless of source data. Independent of pool scoping and closes the rest.
- Emit a low-count warning when a slot has fewer than N candidates, so this is
  caught by the product rather than by a domain review.

## Done when

- A character's worn item is comparable in every slot, or there is a recorded
  reason it cannot be.
- The ranged slot either carries the tier's real contenders or discloses that it
  does not. ✅
- The curated-but-missing items are either admitted or each has a recorded
  reason it is excluded. ✅ (16 admitted; the rest deferred to ticket 17 with
  the reason recorded above.)
