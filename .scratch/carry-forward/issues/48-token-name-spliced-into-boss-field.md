Status: open
Type: bug
Origin: ticket 44 investigation, 2026-08-07 (measurement, not the ticket's own claim)
Blocks: none
Blocked by: none

# Ten tier items carry a token name spliced into the `boss` field

`parse_wowhead_source` in `scripts/assemble_universe.py` reads a Wowhead drop
line of the shape `Drop: <TokenName> - <Boss> (<Zone>)` and puts **the whole
`<TokenName> - <Boss>` phrase** into `boss`. The result is a `kind: raid` source
whose `boss` is not a boss:

```json
{"kind": "raid", "zone": "Black Temple",
 "boss": "Chestguard of the Vanquished Champion - Illidan Stormrage"}
```

Measured on the ticket-42/45/41/37 tip (`bdf0ebd`) — 10 distinct items, all
tier pieces:

```bash
python -c "
import json,glob,os
seen=set()
for f in sorted(glob.glob('data/universes/*-p*.json')):
    if 'report' in f: continue
    for e in json.load(open(f,encoding='utf-8-sig'))['entries']:
        for s in e.get('sources',[]):
            if s.get('kind')=='raid' and ' - ' in (s.get('boss') or ''):
                seen.add((e['itemId'], e.get('name'), s['boss']))
print(len(seen))
for t in sorted(seen): print(t)
"
# 10
```

| itemId | Item | Files |
|---|---|---|
| 29071 | Justicar Breastplate | ret-p3/p4/p5 |
| 29075 | Justicar Shoulderplates | ret-p3/p4/p5 |
| 30133 | Crystalforge Shoulderbraces | ret-p3/p4/p5 |
| 30989 | Lightbringer War-Helm | ret-p3/p4/p5 |
| 30990 | Lightbringer Breastplate | ret-p3/p4/p5 — also [[49-lightbringer-breastplate-names-a-token-paladins-cannot-use]] |
| 30993 | Lightbringer Greaves | ret-p3/p4/p5 |
| 30997 | Lightbringer Shoulderbraces | ret-p3/p4/p5 |
| 34431 | Lightbringer Bands | ret-p5 |
| 34485 | Lightbringer Girdle | ret-p5 |
| 34561 | Lightbringer Boots | ret-p5 |

## Why it is user-facing, not cosmetic

`boss` is rendered. `formatItemSource` (`packages/core/src/rank-report.ts:33`)
emits `` `${source.zone} · ${source.boss}` ``, so a user reads:

```
Black Temple · Chestguard of the Vanquished Champion - Illidan Stormrage
```

`boss` is also a shipped `ViewOptions` filter control, so these ten items sit
under a "boss" whose name is an item.

## The curated map is right; the Wowhead path is wrong

`data/two-hop/ret-tokens.json` carries a correct, separately-sourced row for
every one of these — e.g. 30990 is `{"boss": "Illidan Stormrage", "tokenName":
"Chestguard of the Forgotten Conqueror", ...}`. The universe entries end up
with both a good `kind: token` row and a bad `kind: raid` row. So the fix is a
parse fix, not a data-collection job.

The raw text is intact and does contain the separator:

```bash
python -c "
import json
d=json.load(open('data/wowhead-lists/ret/p4.json',encoding='utf-8-sig'))
print([e['wowheadSourceText'] for e in d['entries'] if e['itemId']==30989])
"
# ['Drop: Helm of the Forgotten Conqueror - Archimonde (Hyjal Summit)']
```

## Why nothing caught it

`ItemSource` types `boss` as `string`, so any string passes the build gate —
the same shape as ticket 42's numeric `profession`. Nothing asserts that a
`boss` value is a plausible boss name, and `pool-hardening.test.ts`'s tier
check compares `zone` against the two-hop map but not `boss`. Ticket 37 has now
closed the `boss`/`token` half of that gap for **tier pieces present in the
map** — confirm whether that guard already covers these ten before writing a
new one.

## Done when

- No emitted `boss` field contains a token/item name. A `Drop: <Token> - <Boss>`
  line either populates `token` and `boss` separately or does not emit a `raid`
  row at all when a `token` row already covers the item.
- A gate fails if a `boss` value looks like an item name (untested hypothesis:
  a `" - "` check is enough, since no real TBC boss name contains that
  separator — verify before relying on it).
- Universes regenerate with only the intended diff.
