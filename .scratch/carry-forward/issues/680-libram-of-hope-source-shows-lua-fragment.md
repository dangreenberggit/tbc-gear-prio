Status: open
Type: bug
Origin: pre-merge review feat/tab-source-labels, D1
Blocks: none
Blocked by: none
Serves: .scratch/plans/upgrades-tab-finish-line.md, Tab-adjacent follow-on (source labels)
Related: 174, 619

# Libram of Hope's Source cell probably shows a Lua fragment as the boss

## What the player sees

Probably, on a ret row for Libram of Hope (22401) with no source hidden, a
Source cell that reads "Dire Maul (N)" over the text
`Isalien"].." - "..format(AL["Tier %s Sets` where the boss name should be.
Hypothesis, untested: no live render or fixture shows this row.

## Evidence

- The fork's `assets/database/db.json` gives 22401 one source,
  `{"drop": {"difficulty": 1, "npcId": 16097, "zoneId": 2557}}`, and its
  `npcs` entry 16097 has the name `Isalien"].." - "..format(AL["Tier %s Sets`.
  Re-run from `vendor/tbc-new-fork`:
  `python -I -c "import json;db=json.load(open('assets/database/db.json',encoding='utf-8'));print([i['sources'] for i in db['items'] if i['id']==22401],[n for n in db['npcs'] if n['id']==16097])"`.
- Upstream's `ui/features/gear/components/SelectorModal/ItemSource.tsx`
  prints `npc.name + category` under the zone whenever the npc exists
  (lines 55-74).
- The tab shows that upstream block when no source of the row is hidden and
  `itemSourceShows` is true; for a `drop` whose zone exists it is true
  (fork `ui/features/upgrades/utils/item_source.ts`,
  `ui/features/upgrades/components/ResultsTable/SourceCell.tsx`).

feat/tab-source-labels fixed only the universe row: 22401 now carries
`raid` Dire Maul (origin `db`, no boss) in `data/universes/ret-p*.json`
(ticket 174). The garbled npc name is in upstream's data and predates that
branch.

## Done when

- A live run or a fixture render shows what the Source cell prints for 22401.
- If it prints the fragment: the tab shows a readable source for 22401
  without editing any existing wowsims file (the fork rule in
  `docs/fork-upstream-touchpoints.md`), for example by treating this npc
  name as absent, and a test pins it. Whether upstream's own gear picker
  shows the same text is recorded in the ticket.
