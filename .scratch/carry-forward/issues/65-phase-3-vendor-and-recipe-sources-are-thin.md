Status: open
Type: bug
Origin: user request to add in-game phase 3 items, 2026-08-07
Blocks: none
Blocked by: 58

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

**Unmeasured, and the thing to measure first:** how many real P3 items the two
factions actually contribute, and how many of those are already in the universe
via some other source (a BT drop *and* an Ashtongue purchase can be the same
item). Do not assume the count of missing rep rows equals the count of missing
items — resolve against existing `itemId`s before sizing the work.

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
