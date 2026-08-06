Status: open
Type: bug
Origin: pre-merge review of `phase-2/feral` (adversarial A5), 2026-08-06
Blocks: none
Blocked by: none

# `sources[0]` is whichever pipeline ran first, not the best source

`poolEntryFromUniverse` (`packages/core/src/pool.ts:83`) takes `entry.sources[0]`
as *the* source, and every caller that switches on `kind` sees only that one.
But `assemble_universe.py` appends in a fixed pipeline order — db, atlasloot,
two-hop, sunmote, wowhead, curated — so `sources[0]` is an artefact of which
input happened to mention the item first, not a judgement about which origin a
player should act on.

Two ways that bites today:

- A weak db `rep` row outranks a precise `raid` row that Wowhead supplied, so
  the UI names a faction when it could have named a boss.
- For trash that drops in two raids, the "/" split appends both zones and the
  first-listed one silently becomes the primary. 32591 Choker of Serrated
  Blades reads as Hyjal Summit; Black Temple is equally true.

```bash
python -c "
import json
u=json.load(open('data/universes/feral-p3.json'))
print([e['sources'] for e in u['entries'] if e['itemId']==32591])
"
```

Pre-existing — this predates the feral branch — but the slashed-zone split and
the new `unknown` kind both widen the surface, so it is worth pinning now.

## Suggested shape of a fix

Order `sources` by how actionable they are before writing the artifact (a named
raid boss beats a faction beats an unpriced badge beats `unknown`), or have
`PoolEntry` expose the whole list and make callers choose. The second is
honest but touches every consumer.

Note ticket 35 (`groupby-raid-picks-an-arbitrary-zone`) is the same root cause
seen from the view layer; fixing this may close both.

## Done when

- A row's primary source is chosen by a stated rule, not by pipeline order.
- An item that drops in two raids does not silently claim one of them.
