Status: wontfix
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 follow-on (Tab-adjacent)
Type: task
Origin: .scratch/handoffs/sme-rank-judgment-613-tab-item-lists.md (finding F2)
Blocks: none
Blocked by: none
Related: 613

# The 2 Ring is offered in lists before the patch that added it

The 2 Ring (34837) is in the phase-2 and phase-3 lists (and every later one)
because `vendor/wowsims/db.json` gives it `phase: 1` and no `sources`, so the
db-phase route (ticket 613) admits it at every phase. The game added it in
patch 2.4.0 as a rare reward from Old Man Barlo's fishing-daily bag
([warcraft.wiki.gg](https://warcraft.wiki.gg/wiki/The_2_Ring)). It ranks
+4.7, above the cutoff, in `data/tab-fixtures/feral-p3-th-hands-legs.json`.

The SME also named other 34xxx ids with db phase 1 in the feral-p3 list:
34073 The Horseman's Signet Ring, 34074 Witches Band, 34075 Ring of Ghoulish
Delight (Hallow's End rings; their source label is ticket 640). When the game
added them is not yet checked.

Re-run: `python -c "import json;d={i['id']:i for i in json.load(open('vendor/wowsims/db.json'))['items']};print([(k,d[k]['name'],d[k].get('phase'),d[k].get('sources')) for k in (34837,34073,34074,34075)])"`

Done when: 34837 (and any other sourceless item the check finds was added
after its db phase) appears only in lists of its real content phase, with
the source of the corrected phase cited.

## Comments

2026-11-03 (p45 DPS pass): The 2 Ring has one row in each of the 22 phase 4/5 runs, on all 11 DPS tabs. Whether phase 5 is its real phase is for this ticket to settle. Details: row 641 in docs/live-runs/2026-11-03-p45-dps-pass.md § Known defects seen again; .scratch/handoffs/sme-rank-judgment-452-p4-physical.md K1, -p5-physical.md K1, -p4-casters.md § Rows that look fine.

## Closing note

2026-11-12, closed without a change on branch `fix/tab-polish`: settled by
wowsims. The tab offers The 2 Ring at the phase wowsims gives it, as the
site's own gear picker does.

- wowsims sets 34837 to phase 1 on purpose. Upstream commit `5a7dd2496`
  ("fix(database): tag The 2 Ring (34837) as Phase 1"), merged as
  `19c4c4856` (PR #351, 2026-05-14), changed its db.json phase from 5 to 1
  and added the rule at `tools/database/item_source_utils.go:129-131`
  (`if item.Id == 34837 { // The 2 Ring - Available in P1`).
- The tab's phase test is the picker's test. The pool keeps an item when
  `phaseOf(item) <= maxPhase` (fork `ui/features/upgrades/model/pool_source.ts:148`
  at `690fcdeb5`); the gear picker keeps it when
  `itemData[index].phase <= phase`
  (`ui/features/gear/components/SelectorModal/ItemList.tsx:76`). The
  ticket's account of a "db-phase route" in `scripts/assemble_universe.py`
  is out of date for the tab: since ADR-0038 the tab builds its pool from
  the page's wowsims database at run time.
- The Hallow's End rings 34073, 34074 and 34075 are no longer in wowsims'
  database. Upstream commit `7b1e187dc` ("[DB] Run Hallow's End at ilvl
  141") replaced them with 281907, 281911 and 281915, which
  `tools/database/overrides.go:86-88` sets to phase 3.
- The owner, 2026-11-11: "generaly we should match what wowsims has and
  not try to reinvent new things, especially when our reinventions are
  most likely dumb AI slop." Moving 34837 to phase 5 in the tab would
  disagree with wowsims about an item fact, and would need a second item
  source or an edit to a wowsims file. If wowsims is wrong, the fix is in
  wowsims; the tab picks it up at the next engine-pin move.

Investigation: `.scratch/agent-reports/2026-11-12-general-task-641-item-phase.md`
(main checkout, gitignored). Re-run from inside the fork, with node v22:

```
sed -n 129,131p tools/database/item_source_utils.go; sed -n 86,88p tools/database/overrides.go
python3 -I -c "import json;d={i['id']:i for i in json.load(open('assets/database/db.json'))['items']};print([(k,d[k]['name'],d[k].get('phase')) if k in d else (k,'absent') for k in (34837,34073,34074,34075,281907,281911,281915)])"
```

On 2026-11-12 at fork `690fcdeb5` the second line printed
`[(34837, 'The 2 Ring', 1), (34073, 'absent'), (34074, 'absent'), (34075, 'absent'), (281907, 'Ring of Ghoulish Delight', 3), (281911, "The Horseman's Signet Ring", 3), (281915, 'Witches Band', 3)]`.
