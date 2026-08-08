Status: open
Type: bug
Origin: user request to add in-game phase 3 items, 2026-08-07
Blocks: none
Blocked by: 58 (partially — see "Correction" below; the Ashtongue half is not blocked)
Plan: .scratch/carry-forward/65-plan.md

# Phase 3 raid zones are covered; its reputation vendors and recipe vendors are not

The premise "we may not have phase 3" is **half wrong, and the wrong half is the
expensive one**. Black Temple and Hyjal Summit are already in the P3 universe as
zones; the two P3 reputation vendors are absent entirely.

## What is already there

`data/universes/ret-p3.json` carries `maxPhase: 3` and both raids are in
`phaseZones` (`data/universes/ret-p3.report.json`):

```bash
python -c "import json;print(json.load(open('data/universes/ret-p3.report.json'))['phaseZones'])"
# ['Black Temple', "Gruul's Lair", 'Hyjal Summit', 'Karazhan', ...]
```

So the drop tables are not the gap. 364 entries, 367 `raid` sources.

## What is missing

Counting source kinds across the 364 P3 entries:

```bash
python -c "
import json,collections
c=collections.Counter()
for i in json.load(open('data/universes/ret-p3.json'))['entries']:
    for s in (i.get('sources') or []): c[s['kind']]+=1
print(c.most_common())"
# raid 367, crafted 16, token 15, pvp 6, unknown 3, badge 3, rep 2, world 2
```

**Two** `rep` sources in the whole P3 universe, and both are P2-era factions:

| item | faction |
| --- | --- |
| Shapeshifter's Signet (30834) | Lower City |
| Haramad's Bargain (29119) | The Consortium |

The two factions that *are* P3 — **Ashtongue Deathsworn** (Black Temple) and
**Scale of the Sands** (Hyjal Summit) — appear nowhere as a source, in any
universe, at any phase:

```bash
python -c "
import json,glob
for f in sorted(glob.glob('data/universes/*.json')):
    if 'report' in f: continue
    fa={s.get('faction') for i in json.load(open(f))['entries']
        for s in (i.get('sources') or []) if s['kind']=='rep'}
    print(f, sorted(x for x in fa if x))"
# ret-p3:  ['Lower City', 'The Consortium']
# ret-p4:  ['Lower City', 'The Consortium']
# ret-p5:  ['Lower City', 'Shattered Sun Offensive', 'The Consortium']
# feral-p3:['Cenarion Expedition', 'Lower City', "Ogri'la"]
```

Note P4/P5 inherit the same two — this is not a P3-only hole, it is the P3
vendors missing from every phase that should carry them forward.

### The one false lead, ruled out

`grep -ril ashtongue data vendor` hits `vendor/wowsims/db.json` and
`data/items/index.json`, which looks like the data is already on disk. It is
not — the single occurrence in each is the item **name** "Staff of the Ashtongue
Deathsworn" (31417), not a faction or a vendor row. There is no faction table to
read from; `assemble_universe.py:579` already records that
("db.json ships no faction table").

## Why this is ticket 58's blocked-by

58 established that only AtlasLoot's *instance* tables were vendored, and that
the badge/reputation/crafted modules were never copied in. The measurement above
is the P3-shaped consequence of exactly that: `rep` sources can only arrive
today through **guide prose regexes** (`VENDOR_REP_RE`,
`VENDOR_STANDING_FIRST_RE`, `REP_RE` at `scripts/assemble_universe.py:263-289`),
which is the single-witness transcription channel tickets 48-53 kept producing
defects through. Two rep rows is what that channel yields when no guide happened
to phrase an Ashtongue item in one of the three recognised forms.

Recipe vendors are the same story from the other side. 16 `crafted` sources
exist and three of them already carry `recipeZone: "Black Temple"` — so the
*recipe-drops-in-BT* case works. What is untested is whether recipes bought from
the two rep vendors are represented at all; every crafted row currently has
`origin: db`, none has a vendor origin.

## Measured scope

Run `python .scratch/carry-forward/notes/65-faction-overlap.py <factions.lua>`
(the docstring gives the pinned-commit fetch). Against `ret-p3`:

| faction | rows | gear | already in universe | **gear to add** | recipes |
| --- | --- | --- | --- | --- | --- |
| Ashtongue Deathsworn | 26 | 9 | **0** | 9 | 17 |
| Scale of the Sands | 48 | 16 | **0** | 16 | 30 |

**Overlap is zero.** The concern that a BT drop and an Ashtongue purchase might
be the same item does not materialise — none of these 25 ids is in `ret-p3` by
any route. So the missing-rep-row count *is* the missing-item count here.

### The 25 gear items

- **Ashtongue: 9 trinkets** (32485-32493), the Ashtongue Talismans. One per
  class role; the ret-relevant one is **32485 Ashtongue Talisman of Valor**.
- **Scale: 16 rings** (29294-29309), the Band of Eternity ladder — four stat
  variants x four standings, the Exalted tier being the named Bands.

### The recipes split cleanly, and only one half is work

- **Scale's 30 recipes are all gem Designs.** Their outputs are already in
  `vendor/wowsims/db.json` (208 gems; spot-checked Bold Crimson Spinel, Rigid
  Lionseye, Wicked Pyrestone, Delicate Crimson Spinel — all present). The gem
  solver already has them. **No gear work.**
- **Ashtongue's 17 recipes are gear patterns** (Shadesteel, Redeemed Soul,
  Shackled Souls, Soulguard). All 17 outputs resolve in `data/items/index.json`
  and **none is in `ret-p3`** — so this is a second, distinct body of ~17
  crafted items, on top of the 25 vendor items.

### Two things that could have blocked this, and do not

- **Zero-stat trinkets are already accepted.** All nine Ashtongue talismans have
  an all-zero `stats` array in the item index — their value is proc effects.
  That is not novel: `ret-p3` already carries three such trinkets (The Lightning
  Capacitor 28785, Tome of Fiery Redemption 30447, Prism of Inner Calm 30621).
  Whether their *EP* is modelled is a separate question this ticket does not
  answer.
- **The junk filter cannot silently drop them.** `ret-p3.report.json` has
  `junkFilter.applied: false` — it reports counts without filtering.

### Upstream has what is needed

`AtlasLootClassic_Factions/data-tbc.lua` (46,868 bytes at the pinned commit
`0bc91eb`) contains `data["AshtongueDeathsworn"]` and
`data["TheScaleOfTheSands"]`, with standings as nested tables. `sync_atlasloot.py`
`TRACKED` currently holds exactly one file — adding the Factions module there is
the concrete form of 58. `ItemSource` already has the
`{ kind: "rep"; faction; standing }` variant (`pool.ts:45`), so no type work.

## Done when

- The Ashtongue Deathsworn and Scale of the Sands item sets are sourced from a
  machine input, not guide prose — 58's vendored reputation module is the
  intended route, hence `Blocked by: 58`.
- Their items carry a `rep` source with the correct faction and standing, and
  recipe-vendor items carry a source that distinguishes "recipe bought from
  vendor" from the existing `recipeZone` drop case, or a note records why the
  existing `crafted` shape is sufficient.
- P4 and P5 carry the P3 vendors forward. The carryover mechanism itself is
  **verified working** — both existing rep items survive into P4 and P5:

  ```bash
  python -c "
  import json
  for ph in ('p3','p4','p5'):
      ids={i['itemId'] for i in json.load(open(f'data/universes/ret-{ph}.json'))['entries']}
      print(ph, 30834 in ids, 29119 in ids)"
  # p3 True True / p4 True True / p5 True True
  ```

  So nothing needs fixing in `carryoverPolicy: union`; adding the vendors at P3
  should be sufficient for P4/P5 to inherit them. Re-run the above with a new
  Ashtongue/Scale item id to confirm rather than assume.
- The rep-source count is re-measured with the command above and the figures
  here updated.

## Correction (2026-08-07, during planning)

The claim above that `rep` sources "can only arrive today through guide prose"
is **wrong for half the payload**, and the ticket's `Blocked by: 58` is
correspondingly too strong.

`vendor/wowsims/db.json` already carries a rep source on the nine Ashtongue
talismans — `{"rep": {"repFactionId": 1012, "repLevel": 8, "factionId": 1}}`.
It is discarded at `assemble_universe.py:585`, which returns `None` when a rep
row has neither `factionName` nor `standing`. The comment there claims this hits
one item; it hits **111 items across 10 factions**. That is a resolvable-id
problem needing a lookup table, not a vendoring problem.

Scale of the Sands' 16 rings have `sources: null` in the DB and do still need
58's Factions module.

So: **Ashtongue is unblocked and cheap; Scale is real 58 work.** The plan
sequences them accordingly, which gets the ret and feral talismans in first.

Also corrected: the DB *does* carry proc data (`itemEffects`, populated on 802
items including all nine talismans) — an earlier read using the singular key
`itemEffect` found nothing and wrongly suggested proc data was absent entirely.

## Suggested slicing

Ordered so each step is independently landable:

1. **Vendor the Factions module** — add
   `AtlasLootClassic_Factions/data-tbc.lua` to `sync_atlasloot.py` `TRACKED`,
   re-run `--update`, commit the lockfile. This is 58's core ask and unblocks
   everything below.
2. **Parse faction tables into `rep` sources** — extend `parse_atlasloot.py` to
   walk the standings tables into `{kind: "rep", faction, standing}`. Yields the
   25 vendor items. Gets `origin: atlasloot` rather than prose, which is the
   whole point.
3. **Ashtongue's 17 crafted patterns** — `parse_raid_recipes` already maps
   recipe→output for raid drops; this is the vendor-bought analogue. Decide then
   whether a vendor-bought recipe needs a source shape distinct from
   `recipeZone`, or whether `crafted` + faction is enough.
4. **Re-measure 57's 94 load-bearing prose rows** — 58 asks for this and it can
   only be done once 1-2 land.

Scale's 30 gem Designs need no step: already covered.
