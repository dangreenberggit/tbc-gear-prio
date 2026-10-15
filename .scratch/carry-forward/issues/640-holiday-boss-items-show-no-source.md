Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 follow-on (Tab-adjacent)
Type: task
Origin: .scratch/handoffs/sme-rank-judgment-613-tab-item-lists.md (finding F1)
Blocks: none
Blocked by: none
Related: 613, 108

# Holiday-boss items rank near the top with no source

Since ticket 613 gave ret and feral the db-phase route (stage
`tab-item-lists`, main `3c2334a2`), Empty Mug of Direbrew (281739) ranks
above the cutoff in five of the six tab fixtures (ret-p3-p2 +20.6, the three
feral-p3 fixtures about +17, feral-p5-th4pc +4.3) and first in
`data/desktop-gate/golden-ret-p4-cap40.json` (+22). It is a Brewfest drop
from Coren Direbrew, available about two weeks a year, but every row shows
`source: {kind: "unknown"}` ("Source not recorded" on the tab). A player
reading the top row cannot tell it is a once-a-year event drop.

The same applies to other holiday rows the SME named: The Frost Lord's War
Cloak (278819) and Amulet of Bitter Hatred (Midsummer, Ahune), and Ring of
Ghoulish Delight, Witches Band and The Horseman's Signet Ring (Hallow's End;
the SME marked these recalled, unverified).

Second part: the ilvl-141 stats of 281739 in `vendor/wowsims/db.json`
(98 AP, use 376 AP) come from upstream's database; the wiki lists only the
original ilvl-110 version. Confirm the live stats (Wowhead tooltip or an
in-game check) before trusting its rank. Unverified until then.

Re-run to see the rows:
`python -c "import json;r=json.load(open('data/tab-fixtures/ret-p3-p2.json',encoding='utf-8'))['ranking'];print([(i['rank'],i['name'],round(i['deltaDps'],1),i['source']) for i in r['items'] if i['itemId']==281739])"`

Done when: holiday-boss items carry a source a player can read (for example
"World event: Brewfest — Coren Direbrew"), and the 281739 stat line is
confirmed or corrected with a cited source.
