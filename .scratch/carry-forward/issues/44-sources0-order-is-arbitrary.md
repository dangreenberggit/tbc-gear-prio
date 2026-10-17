Status: closed
Closed: 2026-10-16, stage tab-source-labels
Type: bug
Origin: pre-merge review of `phase-2/feral` (adversarial A5), 2026-08-06
Blocks: none
Blocked by: none
Progress: measured 2026-08-06 on `fix/carry-forward-backlog` — **the stated cause below is false**; see `## Measured 2026-08-06` at the end. The precedence ladder is unnecessary; what remains is a narrower display question.

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

## Measured 2026-08-06

Full plan and re-runnable scripts: `.scratch/carry-forward/ticket-44-plan.md`,
`.scratch/carry-forward/ticket-44/measure{,2,3}.py`. Each locates the repo root
from its own path, so the working directory does not matter:

```bash
python .scratch/carry-forward/ticket-44/measure.py
```

Across all six committed universes (2114 entry rows):

- Rows where `sources[0].kind` is `rep`/`badge`/`unknown` while a `raid` row
  exists: **0**. The cross-kind precedence problem this ticket asserts does not
  occur in the data.
- The only multi-kind pair that occurs at all is `raid`+`token` (61 rows), which
  is one fact recorded twice; `sources[0]` is already the `token` row — the more
  informative one — in all 61.
- What survives: **7 distinct within-`raid` zone ties** (e.g. 32591 Choker of
  Serrated Blades, genuinely T6-era trash in both Black Temple and Hyjal
  Summit). SME review confirms neither zone is more true, so displaying both is
  the only honest option. `matchesZone`/`matchesBoss` already scan every source,
  so filtering is correct today — only `zoneKeyOf` and the report's
  single-source line collapse it.

So the fix is not a precedence ladder. Rescope to the display question, which
is the same root cause as ticket 35 seen from the pool layer.

The measurement also surfaced 10 tier items whose `raid` row had a token name
spliced into `boss`; those were filed and fixed separately as tickets 48-52.

## Done when

- The 7 zone-tie combos are displayed honestly (both zones, or one stated rule)
  rather than collapsing to whichever came first.
- ~~A row's primary source is chosen by a stated rule, not by pipeline order.~~
  Withdrawn — measured false, see above.

## Closed 2026-10-16 (stage tab-source-labels)

The Upgrades tab now applies one stated rule. The plain-text Source cell
names the row's first shown source: the first source that is not hidden,
else the first. When nothing is hidden and upstream's `db.json` has the
item, the cell shows upstream's `ItemSource` block instead. That is true
for all six rows in `data/universes/*-p5.json` with more than one distinct
zone (32589, 32590, 32591, 32592, 32609, 34009): each has upstream `drop`
sources in zones 3606 and 3959. Count run 2026-10-16 at
`tbc-gear-prio@9af4fae8` from the repo root (corrected by the pre-merge
review of feat/tab-source-labels, finding S2, which found the count cited
to a gitignored plan that marked it unrun):
`python -I -c "import json,glob;ids=set();[ids.add(e['itemId']) for f in glob.glob('data/universes/*-p5.json') for e in json.load(open(f,encoding='utf-8-sig'))['entries'] if len({s['zone'] for s in e.get('sources') or [] if 'zone' in s})>1];db={i['id']:i for i in json.load(open('vendor/wowsims/db.json',encoding='utf-8'))['items']};print(sorted(ids),{i:[s['drop']['zoneId'] for s in db[i]['sources'] if 'drop' in s] for i in sorted(ids)})"`
→ `[32589, 32590, 32591, 32592, 32609, 34009]`, each `[3606, 3959]`. That
block names upstream's first drop, so the tab matches the site's gear
picker. Filtering already scans every source of a row, not only the first:
`matchesZone` (fork `ui/features/upgrades/model/engine/view.ts:135-137`)
and `sourceMatches` (fork `ui/features/upgrades/model/settings_pool.ts:60-64`)
test every source's zone. No cell lists two zones.

Verified by: `npx vitest run ui/features/upgrades/utils/format.test.ts`
in `tbc-new-fork@e26c05bb2`; the `the Source cell under Filter by source`
block (format.test.ts:85-118) and `rowSourceDetail` (format.test.ts:156-172)
test the first-shown rule.
