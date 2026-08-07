Status: open
Type: bug
Origin: broader sweep after tickets 48-52, 2026-08-07
Blocks: none
Blocked by: none

# `profession` carries prose, giving 12 values for ~5 real professions

The sweep that closed [[52-boss-names-conflate-encounters-and-their-units]]
enumerated every remaining string field on `ItemSource`. `zone` (10), `faction`
(5), `standing` (2), `via` (2) and `dungeon` (1) are all clean.
`profession` is not:

```bash
python -c "
import json,glob
v=set()
for f in sorted(glob.glob('data/universes/*-p*.json')):
    if 'report' in f: continue
    for e in json.load(open(f,encoding='utf-8-sig'))['entries']:
        for s in e.get('sources',[]):
            if isinstance(s.get('profession'),str): v.add(s['profession'])
for x in sorted(v): print(repr(x))
"
# 'Armorsmithing Blacksmithing'
# 'Blacksmithing'
# 'Engineering'
# 'Jewelcrafting'
# 'Jewelcrafting - can be purchased on the Auction House'
# 'Leatherworking'
# 'Leatherworking - BoP only'
# 'Leatherworking - can be purchased on the Auction House'
# 'Master Hammersmith Blacksmithing'
# 'Master Swordsmith Blacksmithing'
# 'Tailoring'
# 'Tailoring - can be purchased on the Auction House'
```

Twelve values for five professions. Two failure shapes:

1. **Trailing prose**: `"Jewelcrafting - can be purchased on the Auction
   House"`, `"Leatherworking - BoP only"`. This is the same `" - "` splice as
   [[48-token-name-spliced-into-boss-field]], in a different field.
2. **Specialisation prefix**: `"Master Hammersmith Blacksmithing"`,
   `"Armorsmithing Blacksmithing"`. The specialisation is real information, but
   it is not the profession, and it makes the value fail any equality test
   against `"Blacksmithing"`.

## User-facing

`formatItemSource` (`packages/core/src/rank-report.ts:41`) emits
`` `Crafted · ${source.profession}` ``, so a user reads:

```
Crafted · Jewelcrafting - can be purchased on the Auction House
```

Unlike `boss` and `zone`, `profession` is **not** currently a `ViewOptions`
filter control, so this is display-only today. It would become a correctness
bug the moment anyone groups or filters by profession, because the same
profession does not compare equal to itself.

## Suggested fix

Follow the shape already used twice: a canonicaliser applied in `add_source`
(the funnel every input reaches), splitting the prose off and keeping the
specialisation somewhere that is not the profession field — or dropping it, if
no consumer wants it.

Unlike [[52-boss-names-conflate-encounters-and-their-units]] there is no
AtlasLoot vocabulary to check against; the authority is the five real TBC
profession names, which is a small enough closed set to state literally and
gate on.

## Done when

- `profession` holds only a bare profession name; the distinct-value count
  drops to the number of real professions.
- A gate fails on any value outside that closed set.
- Whether the specialisation (`Master Hammersmith`, `Armorsmithing`) is
  preserved elsewhere or deliberately dropped is stated here.
- Universes regenerate with only the intended diff.
