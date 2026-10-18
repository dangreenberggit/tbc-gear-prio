Status: closed
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 follow-on (Tab-adjacent)
Type: task
Origin: .scratch/carry-forward/issues/640-holiday-boss-items-show-no-source.md (parts the 2026-10-15 wontfix did not rule on)
Blocks: none
Blocked by: none (676 closed 2026-10-18; part 2 lives in 677)
Related: 640, 613, 619, 643, 676, 677

# Holiday items show no readable source, and the Mug's item-level-141 stats are unchecked

Ticket 640 closed `wontfix` on 2026-10-15 on the owner's words, verbatim:
""Empty Mug of Direbrew now tops most trinket lists" this is fine." That
ruling is about the Mug's rank. Ticket 640 also held two parts the owner did
not rule on. This ticket keeps them open.

**Part 1: holiday items have no source a player can read.** Since ticket 613
(stage `tab-item-lists`, main `3c2334a2`) admitted db-phase items for ret and
feral, holiday-boss items are in every spec's lists with
`source: {kind: "unknown"}`, which the tab shows as "Source not recorded".
The Frost Lord's War Cloak (278819, Midsummer, Ahune) is in all 44 lists and
in every committed tab fixture. Ticket 640 also names Amulet of Bitter Hatred
(Midsummer, Ahune) and the Hallow's End rings Ring of Ghoulish Delight,
Witches Band and The Horseman's Signet Ring; the SME marked the Hallow's End
names as recalled, unverified. A label rule for holiday-boss items would
label 281739 (Empty Mug of Direbrew) too; the owner's ruling says nothing
about its label.

**Part 2: 281739's stats.** The ilvl-141 stats of 281739 in
`vendor/wowsims/db.json` (98 AP, use 376 AP) come from upstream's database;
the wiki lists only the original ilvl-110 version (ticket 640, from the SME
handoff `.scratch/handoffs/sme-rank-judgment-613-tab-item-lists.md` F1).
Unverified until the live stats are confirmed.

Re-run to see the rows and their sources (from the repo root):

```
python -c "import json,glob;[print(f,i['rank'],i['name'],round(i['deltaDps'],1),i['source']) for f in sorted(glob.glob('data/tab-fixtures/*.json')) for i in json.load(open(f,encoding='utf-8'))['ranking']['items'] if i['itemId'] in (278819,281739)]"
```

On `feat/tab-item-lists` `c559b5ea` this prints 11 rows, every one with
`{'kind': 'unknown', 'origin': 'db'}`.

Done when: holiday-boss items carry a source a player can read (for example
"World event: Midsummer — Ahune"), and the 281739 stat line is confirmed or
corrected with a cited source (Wowhead tooltip or an in-game check).

## Comments

2026-10-16 (stage tab-source-labels): split in two. Part 1 (holiday items
have no readable source) is planned in ticket 676, with the badge and honor
sources of ticket 643. Part 2 (281739's stats) is ticket 677. Close this
ticket when 676 and 677 are both done.

2026-10-18 (stage tab-wowsims-items): closed. Part 1: wowsims names no
source for holiday-boss items (278819 and 281739 have no db.json `sources`),
and the owner's ruling of 2026-10-17, verbatim: ""only ret or feral" is a smell. for development it makes sense, for the app it sounds absurd like a 2nd or even 3rd source of truth in one line you mentioned. yikes. if wowsims has no named source for it then fine. thats an issue for wowsims for another day, not our job". The tab (ADR-0038)
shows "Source not recorded" for them. Part 2 (281739's stats) is ticket
677, which stays open; this ticket holds nothing else.

Verified by: `python -I -c "import json;db={i['id']:i for i in json.load(open('vendor/tbc-new-fork/assets/database/db.json',encoding='utf-8'))['items']};print([db[i].get('sources') for i in (278819,281739)])"`
prints `[None, None]` at `tbc-new-fork@f06772929`.
