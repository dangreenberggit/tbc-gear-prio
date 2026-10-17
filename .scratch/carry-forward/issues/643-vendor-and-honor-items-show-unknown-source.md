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

2026-10-16 (stage tab-source-labels): no committed input names badge or
honor sources for db-phase items, so this needs new data first. The shared
work plan is ticket 676; this ticket closes when 676's input labels the
rows named above.
