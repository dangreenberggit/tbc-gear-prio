Status: closed
Closed: 2026-10-17, stage tab-follow-ups
Type: bug
Origin: pre-merge review feat/tab-source-labels, D3
Blocks: none
Blocked by: none
Serves: .scratch/plans/upgrades-tab-finish-line.md, Tab-adjacent follow-on (source labels)
Related: 619, 642

# Honour PvP rows name no season, while arena rows do

## What the player sees

An arena row's Source cell names its season, for example Vengeful
Gladiator's Greatsword (33688) reads "PvP vendor · Arena, season 3". An
honour row names none: Vindicator's Dragonhide Boots (33880) and its
siblings read "PvP vendor · Honor". The input the builder reads gives the
season for these honour items.

## Evidence

- `data/wowhead-lists/feral/p3.json` lines 238, 258, 388 and 498 read
  `"wowheadSourceText": "Vendor: Honor Points (Season 3)"`; line 818 reads
  `(Season 1)`: `grep -n "Honor Points (Season" data/wowhead-lists/feral/p3.json`.
- `parse_wowhead_source` in `scripts/assemble_universe.py` appends
  `{"kind": "pvp", "via": "honor"}` for any text with "honor points" and
  reads no season (`grep -n '"via": "honor"' scripts/assemble_universe.py`).
- The fork's `sourceDetail` (`ui/features/upgrades/utils/format.ts`) prints
  the season only when the source carries one.

The owner's season ruling covers arena items only. Verbatim, 2026-10-16T00:57Z
(`.scratch/stage-gate/tab-blocking-finish/decision-log.md:28`, gitignored):
"Yeah sure arena items as a source are fine. If it's good it's good, as long
as it's the  season is open for the selected phase". Whether honour items
should name their season is not ruled; it follows the same rule as the arena
rows only if the session decides so (the honour season is in the input, so
no owner question is needed to record it).

## Done when

- The builder records the season the Wowhead text names on an honour `pvp`
  source (`season` is already a field of the `pvp` kind), universes and fork
  copies are regenerated, and an honour row's Source cell names its season
  the same way an arena row does.
- A test pins the parse of "Vendor: Honor Points (Season 3)" to
  `{"kind": "pvp", "via": "honor", "season": 3}`.

## Regenerated 2026-10-17 (stage tab-follow-ups P1)

`parse_wowhead_source` now reads `Season N` on an honour row, pinned by
`pnpm wowhead-parse:check` (`scripts/check_wowhead_parse.py`, a
`verify:steps` entry). After regenerating the 44 universes, honour `pvp`
sources without a season: 0 (19 before). With a season: 54, which is the
19 own-list rows plus 35 honour rows that other specs' universes now take
from the ret and feral lists (ticket 676). Re-run from the repo root:

```
python -I -c "import glob,json;print(sum(1 for p in glob.glob('data/universes/*-p*.json') if not p.endswith('.report.json') for e in json.load(open(p,encoding='utf-8'))['entries'] for s in e['sources'] if s.get('kind')=='pvp' and s.get('via')=='honor' and 'season' not in s))"
python -I -c "import glob,json;print(sum(1 for p in glob.glob('data/universes/*-p*.json') if not p.endswith('.report.json') for e in json.load(open(p,encoding='utf-8'))['entries'] for s in e['sources'] if s.get('kind')=='pvp' and s.get('via')=='honor' and 'season' in s))"
```

The first prints 0 and the second 54.

## Resolution (2026-10-17, stage tab-follow-ups)

The builder records the season on an honour `pvp` source (`5cbb2d59`,
regenerated universes in `5674783e`), the fork's bundled copies carry it
(`tbc-new-fork@3bdacb8c6`), and both fixtures were re-recorded on that fork
commit (`7de8a2c2`). On the fixture pages the honour rows read "PvP vendor ·
Honor, season N", the same label form as an arena row, through the tab's
own `sourceDetail` label, not upstream's PvP block:

- `ret-p3-p2`, Wrist: Vindicator's Scaled Bracers (33910) reads "PvP vendor ·
  Honor, season 3".
- `feral-p5-th4pc`: Vindicator's Dragonhide Boots (33880), Vindicator's
  Dragonhide Belt (33879) and Vindicator's Leather Bracers (33893) read
  "Honor, season 3"; Veteran's Leather Bracers (32814) reads "Honor, season
  2". Vindicator's Dragonhide Bracers (33881) is the worn item, so it has no
  table row; its fixture row carries `season: 3`.

Verified by: `python -I -c "import sys;sys.path.insert(0,'scripts');import assemble_universe as A;print(A.parse_wowhead_source('Vendor: Honor Points (Season 3)'))"`
(prints `[{'kind': 'pvp', 'via': 'honor', 'season': 3}]`) and
`pnpm wowhead-parse:check` at `tbc-gear-prio@5674783e`; fixture rows at
`tbc-gear-prio@7de8a2c2`.
