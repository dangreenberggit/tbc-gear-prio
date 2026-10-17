Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 follow-on (Tab-adjacent)
Type: task
Origin: .scratch/handoffs/sme-rank-judgment-613-tab-item-lists.md (finding F4)
Blocks: none
Blocked by: 676
Related: 613, 619, 676

# Badge and honor items show "Source not recorded" while similar items show a source

Items that ticket 613's db-phase route admitted have `source: {kind:
"unknown"}`. Some of them are vendor or honor items: Idol of Terror (33509),
Staff of the Forest Lord (34898), Angelista's Revenge (34887),
Bloodthirster's Wargreaves and Nyn'jah's Tabi Boots (Badge of Justice vendor,
per the SME, recalled and unverified), Vindicator's Band of Triumph (33919)
and Guardian's Dragonhide Bracers (35167). Meanwhile Everbloom Idol shows
`badge` and Vindicator's Dragonhide Bracers show `pvp`. Three of the
`unknown` rows are above the cutoff in `data/tab-fixtures/feral-p5-th4pc.json`.

Re-run: `python -c "import json;r=json.load(open('data/tab-fixtures/feral-p5-th4pc.json',encoding='utf-8'))['ranking'];print([(i['itemId'],i['name'],i['source'].get('kind')) for i in r['items'] if i['itemId'] in (33509,34898,34887,35167,33919,29390)])"`

Done when: badge-vendor and honor items get their source kind the same way
whichever route admitted them, checked against a cited source list.

## Comments

2026-10-16 (stage tab-source-labels): ~~no committed input names badge or
honor sources for db-phase items~~ (corrected by the pre-merge review of
feat/tab-source-labels, finding P1: false for some rows, see below), so
this needs new data first. The shared work plan is ticket 676; this ticket
closes when 676's input labels the rows named above.

2026-10-16 (pre-merge review feat/tab-source-labels, P1): a committed
Wowhead list names the source of some of these rows, but each universe
reads only its own spec's list, and only ret and feral have lists. For
example 33296 Brooch of Deftness is `badge` cost 25 in ret-p5 but
`unknown` in warrior-p5, balance-p5 and feral-p5; 33880 is `pvp` honour in
feral-p5 and `unknown` in balance-p5. Across the eleven p5 universes, 134
of 3481 unknown-first rows are item ids a Wowhead list names (51 with
Badge of Justice text, 15 with honour or arena text); the per-spec table
and the command are in ticket 676 § Review correction. The rows named in
this ticket's first paragraph by id (33509, 34898, 34887, 33919, 35167)
are in no Wowhead list, so they still need new data. The builder change
(apply a list's source whichever spec's list names the item) is in 676.
