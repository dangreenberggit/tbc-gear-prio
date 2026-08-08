Status: closed
Type: task
Origin: scrapeability investigation on fix/carry-forward-backlog, 2026-08-07
Blocks: none
Blocked by: none

Landed 2026-08-07. Suppression lives in `assemble_universe.build` keyed on
`carries_locus`; gated by `scripts/check_wowhead_prose_suppression.py`
(`pnpm wowhead-prose:check`). Measured after: 61 source rows removed from the
six universes, 0 without a same-zone non-wowhead sibling, pool membership
unchanged in every file. One correction to the plan below — see "How it was
actually keyed".

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
  `world`. `vendor/atlasloot/` holds only the addon's **instance** loot tables
  (25 dungeon/raid/world-boss sets), so vendor, quest and world-drop items have
  no machine witness *here* and the guide is the only one. That is the 94, and
  it is the guide earning its place. Note this is a property of what was
  vendored, not of AtlasLoot: the addon ships badge, reputation, PvP and crafted
  modules too, and vendoring one would shrink the 94.
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

> Measured outcome, 2026-08-07. Note `57-impact.py` **cannot** verify this: it
> runs `parse_wowhead_source` standalone, so it reports the same 148/94/11
> before and after the change and is a planning instrument only. The two
> scripts that do see the change are `57-orphan-check.py` (61 → 0) and
> `57-removal-check.py` (61 rows removed, 0 without a same-zone non-wowhead
> sibling). `57-emitted-check.py` prints the surviving wowhead rows per
> universe.

- ~~Re-running `57-impact.py` after the change reports **0** suppressible
  rows~~ — see the note above; use `57-orphan-check.py`, which went 61 → 0.
- The kept kinds still emit. The 29/20/13/11/8/7/6 split above is *parser*
  output across all seven lists, not emitted rows, so it is not the thing to
  assert against — the universes dedupe and only carry items that made the pool
  for that phase. What the six universes actually keep on the `wowhead` origin:
  `pvp` 36, `crafted` 31, `badge` 23, `rep` 17, `world` 13, `raid` 11 (131
  rows), from `57-emitted-check.py`. Heroic coverage is unchanged at 11 `db`
  rows; no wowhead-origin `heroic` row was ever in the shipped universes, so
  the presence-vs-supplies trap does not show up here — see the note in "How it
  was actually keyed" about why only a constructed case can catch it.
- All six universes regenerated, and every removed row has
  `origin: "wowhead"` and a surviving same-zone row from another origin. Any
  removal failing that pair is a real loss of coverage, not a redundancy.
  **Measured: 61 removed, 0 failing the pair.** Pool membership is identical in
  every file (240/364/411/492/253/380 items before and after) and no item was
  left sourceless.
- Two checks, both mutation-verified, in
  `scripts/check_wowhead_prose_suppression.py`: `carries_locus` pinned on
  constructed sources (locus kinds trip it, the kept kinds do not), and no
  emitted `origin: wowhead` locus row on an item another origin also places.
  Mutating away the heroic-`dungeon` branch fails the first and *not* the
  second; mutating `crafted` into a locus kind fails both.
- The four Thunderheart rows still appear — they are prose-only until the feral
  T6 map lands (see
  [[54-transcribed-inputs-are-the-defect-source-and-cross-checks-are-the-only-detector]]),
  so `KNOWN_UNCORROBORATED` stays at 5 entries.
- `pnpm verify` green on Node 22.

## How it was actually keyed

Two things the plan above did not anticipate.

**The machine-coverage set must be frozen before the list loop**, not read from
`source_acc` per row. `source_acc` is the accumulator the wowhead loop is itself
writing into, so a per-row read also sees wowhead rows added by an *earlier*
list, and an item on two lists suppresses its own second row. 30017
(Telonicus's Pendant of Mayhem) does exactly that — a zone-only quest row on
feral p1-p2, a zone+boss drop row on feral p3 — and it is one of the 11
prose-only items, so the first cut silently deleted a claim from an item whose
only witness is prose. `KNOWN_UNCORROBORATED` allowlists it, so the existing
gate would not have caught it either.

**The trap is real but unexercised by current data, so no data-driven check can
detect it.** Keying on presence (`set(source_acc)`) instead of on supplied locus
produces *byte-identical* universes today: 668 ids are present-without-locus,
but none of them carries a Wowhead locus row. Both keys were run to confirm.
That is why `check_wowhead_prose_suppression.py` pins `carries_locus` on
constructed sources rather than only asserting over the emitted files — the
emitted half stays green under the wrong key, and only the constructed half
fails. If AtlasLoot coverage later changes, the two keys diverge and the
constructed half is what will have been holding the line.

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
