# Faction ids are standard — key on them, don't invent a taxonomy

Research question for ticket 65: our universes are a *derivative* of existing
game databases, so a rep source should carry the same faction id those databases
use rather than floating free on a display string.

**Answer: the ids are standard and three independent sources agree.** Nothing
new needs constructing.

## The id space is game-canonical (`Faction.dbc` ID column)

Three sources, checked separately:

- **wowsims** `vendor/wowsims/db.json` — `{"rep": {"repFactionId": 1012, ...}}`
- **ui.proto** `RepFaction` enum, `data/proto/ui.proto:141-153`, 10 TBC ids
- **AtlasLoot** `AtlasLootClassic_Factions/data-tbc.lua` @ `0bc91eb`, one
  `FactionID = <n>` per faction table

All three agree id-for-id on the 10 ids in use. Wowhead's TBC Classic site
routes the same ids to the same factions (`wowhead.com/tbc/faction=1012` ->
Ashtongue Deathsworn, `=1038` -> Ogri'la, `=933` -> The Consortium, `=970`,
`=978` all checked). Retail Wowhead was not checked — TBC Classic is the right
ruleset here.

Caveat recorded honestly: the Wowhead check verified *routing* (id in URL lands
on the expected faction page), not a page echoing back its own numeric id, and
no raw DBC dump was consulted. Three-way agreement across wowsims, AtlasLoot and
Wowhead routing is strong; "byte-identical to Faction.dbc" is not proven.

## Standings are the standard 0-8 scale

AtlasLoot's `data-tbc.lua` carries the scale inline as a comment —
`0 Unknown, 1 Hated ... 8 Exalted` — identical to `ui.proto`'s `RepLevel` enum
member-for-member. Two independent codebases, so the scale is cross-confirmed
rather than self-consistent.

## AtlasLoot covers 21 factions; wowsims models 10

```bash
python -c "
import re
src=open('<factions-tbc.lua>',encoding='utf-8').read()
for k,v in sorted(re.findall(r'data\[\"(\w+)\"\]\s*=\s*\{\s*\n\s*FactionID\s*=\s*(\d+)',src), key=lambda x:int(x[1])):
    print(v,k)"
```

**Scale of the Sands is 990.** It is absent from `ui.proto`'s enum *and* from
every `repFactionId` in `db.json` — verified, the db uses exactly the 10 ids
`[933, 941, 942, 946, 947, 970, 978, 1012, 1015, 1038]`. So its absence is not a
repo bug: wowsims never modelled any Hyjal rep-vendor item as a `rep` source.
Same for Lower City (1011), which reaches our universes only through prose.

AtlasLoot also carries 932 The Aldor, 934 The Scryers, 935 The Sha'tar, 967 The
Violet Eye, 989 Keepers of Time, 1011 Lower City, 1031 Sha'tari Skyguard, 1077
Shattered Sun Offensive, 922 Tranquillien.

Note `data["DUMMY"]` also claims `FactionID = 932`, colliding with The Aldor —
so a parser keying AtlasLoot tables by `FactionID` must skip `DUMMY`.

## The one thing that is *not* upstream: English display names

- `ui.proto` gives CamelCase **enum member names** (`RepFactionOgriLa`), not
  display strings.
- AtlasLoot's Lua gives **internal table keys** (`Ogrila`, `TheMaghar`), also
  not display strings. Its human names live in `ALIL`/locale files, which are
  not vendored here and would drag in localisation.
- `db.json` carries no faction names at all.

So no already-pinned artifact hands over "Ashtongue Deathsworn" as a string.

## What this settles

The ids are standard and three sources agree. That is the whole finding, and it
is the reassuring answer: there is nothing to build here.

Two corrections to things previously written down:

- `REP_FACTION_DISPLAY` is a **presentation** table, not a database. The
  faction string has exactly one consumer — `rank-report.ts:43` interpolates it
  into a label. Nothing filters, groups or joins on it.
- The check script's claim that a spelling mismatch "would split one faction
  into two" is **wrong** — there is no faction filter. What the gate genuinely
  protects is narrower: every id in use resolves to a name, and the db path and
  prose path print the same faction the same way.

No schema change is proposed here. Whether a rep source should also carry its
numeric id is a separate question that has not been asked or decided.
