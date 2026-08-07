Status: open
Type: task
Origin: scrapeability investigation on fix/carry-forward-backlog, 2026-08-07
Blocks: none
Blocked by: none

# Stop sourcing zone/boss from guide prose where a machine input already covers it

The Wowhead BiS guides are an **editorial** input: they tell us *which items
matter for a spec*, which is opinion no database carries. They are not a
database. Their Source cell is the guide author restating drop/vendor facts
that `atlasloot_sources.json`, `vendor/wowsims/db.json` and the two-hop token
maps already hold in machine-parsed form.

Every defect in tickets 48, 49, 50, 51 and 52 was in that restated prose, for an
item whose real source we already had. We have been parsing a blog post for
facts we hold more reliably elsewhere, and then writing gates to catch the blog
post being wrong.

## The measurement

Across the 276 distinct items on the seven lists, classifying each by whether a
machine input supplies a zone or boss for it, and running the real
`parse_wowhead_source` rather than eyeballing:

| Outcome | Sources |
|---|---|
| Wowhead `raid` rows that would be **suppressed** (machine input covers the item) | 148 |
| Wowhead rows that would be **kept** (crafted 29, pvp 20, heroic 13, raid 11, badge 8, rep 7, world 6) | 94 |
| zone/boss claims left resting on prose alone | 11 |

Reproduce:

```bash
python .scratch/carry-forward/notes/57-impact.py
```

It imports `scripts/assemble_universe.py` directly, so the classification runs
through the real parser rather than a re-implementation of it.

The 11 residual claims are the **same 11** that ticket 54's `origin`-based query
found and `KNOWN_UNCORROBORATED` allowlists, arrived at from the opposite
direction. Two independent routes to the same set is good evidence the number is
real.

## The 148 are redundant, not contested

For items where AtlasLoot supplies a zone, wowhead prose and AtlasLoot agree on
that zone **99 times**. The 19 apparent disagreements are all cases where
AtlasLoot has the item with an **empty** zone list — heroic dungeon drops it
records without a zone — so they are gaps, not conflicts.

### The suppression is lossless, measured on the shipped universes

Stronger than the agreement count: across all six committed universe files,
every `origin: "wowhead"` row carrying a zone or boss **on an item a machine
input covers** has a non-wowhead row for the same zone sitting beside it.

```bash
# prints: 61 such rows, 0 without a same-zone non-wowhead sibling
python .scratch/carry-forward/notes/57-orphan-check.py
```

61 rather than 148 because the universes deduplicate and only include items that
made the pool for that phase; the 148 counts parsed sources across all seven
lists. Both numbers point the same way: nothing unique is being dropped.

### The one trap

Those 19 empty-zone rows are the whole design constraint:

> Suppression must key on **"does the machine input actually supply a zone/boss
> for this item"**, not on **"is this item known to a machine input"**.

Getting that wrong deletes the heroic-dungeon zones and silently shrinks the
pool. It is an easy mistake — this investigation made it once, reporting "zero
uncovered items" from a check that counted mere presence in `db.json` while
ignoring whether the entry had a `sources` array. The corrected figure was 66.

## Scope

In `scripts/assemble_universe.py`, where `parse_wowhead_source` output is fed to
`add_source` (~line 1063):

- Keep every non-locus kind unconditionally — `crafted`, `pvp`, `badge`, `rep`,
  `world`. AtlasLoot does not cover vendor/quest/world-drop items and the guide
  is the only witness for many of them. That is the 94, and it is the guide
  earning its place.
- For a source carrying a `boss`, or a `raid`/`dungeon` `zone`: emit it only
  when no machine input supplies a zone/boss for that item id.
- Leave `wowhead` membership semantics alone. This changes where an item's
  *source* comes from, not whether the item is in the pool. `wowhead_list_ids`
  and `wowhead_list_only` must behave exactly as before.

## Expected effects

- Universe output changes; regenerate all six files and expect a real diff.
- Tickets 48/49/50/51/52 become structurally unreachable for covered items,
  because the field that carried them stops being read for those items.
- Ticket 53 (`profession` prose) is **not** fixed by this — `crafted` is a kept
  kind. It needs its own parser fix or verbatim re-collection.
- The tier cross-check gate from `c3f5b97` keeps its value: it now guards the 11
  residual claims and the token maps rather than 148 redundant rows.

## Known junk this exposes

The residual 11 include rows where the parser invented a locus from prose that
never had one. Worth fixing while in here, or filing separately:

- `31856 Darkmoon Card: Crusade` → `zone: "Bind on Equip"`
- `32658 Badge of Tenacity` → `boss: "Depleted Badge"`
- `29301 Band of the Eternal Champion` → `zone: "The Scale of the Sands Exalted"`

These are `QUEST_ZONE_RE` / `DROP_RE` matching a parenthetical that is not a
zone. They are display-visible via `formatItemSource`.

## Done when

- Re-running `57-impact.py` after the change reports **0** suppressible rows —
  every one of the 148 is gone from the emitted universes.
- The 94 kept sources still emit: `crafted` 29, `pvp` 20, `heroic` 13, `raid` 11,
  `badge` 8, `rep` 7, `world` 6. A drop in `heroic` means the
  presence-vs-supplies trap above was hit.
- All six universes regenerated, and every removed row has
  `origin: "wowhead"` and a surviving same-zone row from another origin. Any
  removal failing that pair is a real loss of coverage, not a redundancy.
- Two tests, both mutation-verified: an item with a machine-supplied zone gains
  no `origin: wowhead` raid row from prose; an item without one still does.
- The four Thunderheart rows still appear — they are prose-only until the feral
  T6 map lands (see
  [[54-transcribed-inputs-are-the-defect-source-and-cross-checks-are-the-only-detector]]),
  so `KNOWN_UNCORROBORATED` stays at 5 entries.
- `pnpm verify` green on Node 22.

## Relationship to ticket 45 (unparsed prose)

[[45-unparsed-wowhead-prose-and-unknown-bucket]] wants `parse_wowhead_source` to
understand **more** prose shapes; this ticket wants it consulted for **fewer**
items. They agree more than they look like they do, because they act on
different rows.

Measured on the current tree, the unparsed rows split:

```bash
# 72 unparsed rows: 40 on machine-covered items, 32 on uncovered ones
python .scratch/carry-forward/notes/57-unparsed-split.py
```

So 57 makes **40 of the 72** moot — the prose never needed reading for those
items — and leaves **32** that 45 must still teach the parser, since nothing
else knows where those items come from. 45 stays worth doing at roughly half
its stated size.

(72, not the 87 in 45's own text: that ticket predates parser work which has
since narrowed it. Re-measure before starting rather than trusting either
number.)

Sequencing: land 57 first, then re-scope 45 against the kept population.

## Relationship to the scraper (ticket 56)

This **shrinks** [[56-scrape-the-wowhead-gear-pages]]. If the Source cell is not
a factual input for covered items, the scraper only needs the item id and the
rank label — both of which are structured on the page (`[item=NNNNN]`) rather
than prose. Land this first and 56 gets easier and less urgent.
