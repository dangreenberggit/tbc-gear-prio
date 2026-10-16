Status: open
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
