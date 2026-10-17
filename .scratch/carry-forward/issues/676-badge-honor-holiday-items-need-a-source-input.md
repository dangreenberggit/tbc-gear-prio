Status: open
Type: task
Origin: stage tab-source-labels (deferred part P3), branch feat/tab-source-labels
Blocks: none
Blocked by: none
Serves: .scratch/plans/upgrades-tab-finish-line.md, Tab-adjacent follow-on (source labels)
Related: 643, 660, 293, 45, 173

# Badge, honor and holiday items need an input that names their source

Filed 2026-10-16: 643, 660 (part 1) and 45 (§2) carry `Blocked by: 676`;
293 points here. Their bodies are not copied; this ticket is the work plan
they share. Ticket 660 part 2 (the Mug's stats) is ticket 677.

## Owner's words (verbatim, handoff `.scratch/handoffs/upgrades-tab-source-labels-HANDOFF.md` § Owner rulings)

- 2026-10-16T04:07Z (tab-blocking-finish decision-log:79): "If it's a certain factual fix then of course."
- Empty Mug of Direbrew, 2026-10-15T21:21Z: ""Empty Mug of Direbrew now tops most trinket lists" this is fine."

## What the player sees

Idol of Terror (33509), Staff of the Forest Lord (34898), the Frost Lord's
War Cloak (278819, Ahune) and every other row the db-phase route admits
show "Source not recorded" (ticket 643, 660 part 1). At p5 that is 223
(warlock) to 403 (warrior) rows per spec, 29-34% of each list
(2026-10-16; command in the handoff § The tickets).

## Why it is deferred

~~No committed or vendored input names these sources~~ (corrected by the
pre-merge review of feat/tab-source-labels, finding P1, 2026-10-16: false
for some rows; see § Review correction below) (measured 2026-10-16,
stage tab-source-labels planning): `vendor/wowsims/db.json` `sources[]` has
only `drop`, `crafted`, `rep`; `assets/db_inputs/atlasloot_db.json` only
`drop`, `crafted`; `data/atlasloot_sources.json` only `raid`, `heroic`,
`rep`; `data/two-hop/*` only tokens and recipes. The only badge costs in
the repo are the Wowhead prose in `data/wowhead-lists/{ret,feral}/*.json`
~~(4 ids)~~ (8 Badge of Justice item ids, 7 of them with a cost, and 20
with honour or arena text; corrected by the same review). Most of the work
is data collection, not a code fix.

## Goal

A committed input, regenerated into `data/universes/*` and the fork copies,
from which badge-vendor, honor, PvP-vendor and holiday-boss items get a
source kind a player can read, with a `holiday` kind (or an agreed
alternative) added to `packages/core/src/item-source-kinds.json`, fork
`model/engine/pool.ts`, `SOURCE_LABELS`, the locale and the schema.

## Decide first (one owner question, if any)

Ticket 293's route is a per-spec Wowhead harvest, up to 45 hand-copied
files with `wowheadSourceText` verbatim. A smaller route is one table of
badge-vendor and PvP-vendor items (a few hundred ids from the Badge of
Justice and honor vendors) plus a holiday-boss list (Ahune, Coren
Direbrew, Headless Horseman). Measure what each closes (count of unknown
rows each would remove, per spec) before asking; ask only if the owner's
preference is not derivable.

## Seam contract

- From P1: `sourceDetail` in fork `utils/format.ts` prints a new kind only
  after a rule is added for it; `SOURCE_LABELS` is in a ported engine file
  (PROVENANCE cycle in `docs/agents/known-traps.md:70-94`).
- From P2: the builder writes db/AtlasLoot drops for the force-included
  items; the db-phase route at `scripts/assemble_universe.py:2380` still
  writes `unknown` for everything else. 31033 Libram of Righteous Power
  and 31856 Darkmoon Card: Crusade still ship
  `{"kind": "unknown", "origin": "curated"}` in ret; their only source is
  the prose in `TICKET_157_FORCE_INCLUDE` ("Quest: News of Victory",
  "Quest: Darkmoon Blessings Deck (BoE trinket)"). A quest/vendor source
  input or kind from this ticket closes them; the membership grant stays
  in `ticket_157_included`. The validation guard accepts any zone name in
  db.json's `zones` table for `raid` and `heroic`, so a source naming a
  real five-man zone passes without another guard change.

## Done when

- Every row in the ticket 643 and 660 lists carries a non-`unknown` source
  from a cited input; 281739 Empty Mug of Direbrew's label follows the same
  rule (its rank is ruled fine; its label was not ruled on).
- The 293 count is re-measured and recorded.
- `pnpm verify` green; fork re-pinned; `pnpm tab-fixtures:smoke` shows the
  new labels on `feral-p5-th4pc`.

## Review correction 2026-10-16 (pre-merge review feat/tab-source-labels, P1)

The premise "no committed input names these sources" is false for some
rows. A committed `data/wowhead-lists/*/*.json` file names their source,
but only ret and feral have lists, and each universe reads only its own
spec's list (`wowhead_lists_for_phase`, `scripts/assemble_universe.py`).
So 33296 Brooch of Deftness is `badge` cost 25 (origin `wowhead`) in
ret-p5 but `unknown` (origin `db`) in warrior-p5, balance-p5 and
feral-p5; 33880 is `pvp` honour in feral-p5 and `unknown` in balance-p5;
33910 is `pvp` honour in ret-p5 and `unknown` in warrior-p5.

Measured at feat/tab-source-labels 9af4fae8: p5 rows whose first source is
`unknown`, and how many of those item ids any Wowhead list names:

| p5 universe | unknown-first rows | named in a Wowhead list |
| ----------- | -----------------: | ----------------------: |
| balance     |                328 |                      27 |
| ele         |                370 |                      12 |
| enh         |                379 |                      14 |
| feral       |                318 |                       8 |
| hunter      |                323 |                      11 |
| mage        |                224 |                       8 |
| ret         |                375 |                      10 |
| rogue       |                290 |                      13 |
| shadow      |                248 |                       8 |
| warlock     |                223 |                       8 |
| warrior     |                403 |                      15 |
| total       |               3481 |                     134 |

Re-run from the repo root:

```
python -I -c "import glob,json,os;L={e['itemId'] for p in glob.glob('data/wowhead-lists/**/*.json',recursive=True) for e in json.load(open(p,encoding='utf-8'))['entries']};[print(os.path.basename(p),len(u),sum(e['itemId'] in L for e in u)) for p in sorted(glob.glob('data/universes/*-p5.json')) if not p.endswith('.report.json') for u in [[e for e in json.load(open(p,encoding='utf-8'))['entries'] if e['sources'][0]['kind']=='unknown']]]"
```

Of the 134, the list text is Badge of Justice for 51 rows, honour or arena
for 15, and a drop, quest or world drop for 68 (classified by the list's
`wowheadSourceText`). 12 of the 134 are named by the universe's own spec's
list and are still `unknown` (ret 10, feral 2); why the builder does not
read those rows is a hypothesis, untested (the stage files read for p5, or
text `parse_wowhead_source` cannot read).

So the Wowhead lists close at most 134 of 3481 unknown p5 rows (about 4%).
The rest of this ticket's data collection stands.

**Remaining work this review adds:** apply a Wowhead-list source to an item
whichever spec's list names it (the builder change in
`scripts/assemble_universe.py`), then regenerate `data/universes/*` and the
fork copies, and re-measure the table above.
