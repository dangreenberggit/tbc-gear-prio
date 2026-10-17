Status: closed
Closed: 2026-10-17, stage tab-follow-ups
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

## Upstream cause (not fixed here)

Upstream's generator `vendor/tbc-new-fork/tools/database/atlasloot.go:84`
matches the boss key with the lazy `AL(?:IL)?\["(.*?)"\]`. On five Tier 0.5
boss lines it runs past the key's first `"]`, so five npc names in
`assets/database/db.json` read `<key>"].." - "..format(AL["Tier %s Sets`:
npcs 16042, 16059, 16080, 16097 and 16118 (keys Lord Valthalak, Theldren,
Mor Grayhoof, Isalien, Kormok). The fix there is the regex plus regenerating
`assets/db_inputs/atlasloot_db.json` and `assets/database/db.json`. Those are
existing wowsims files, which the fork rule
(`docs/fork-upstream-touchpoints.md`) does not let this project edit, so
nothing was changed or filed upstream. This branch recovers the key on both
sides instead: the builder's `GARBLED_NPC_NAME_RE` (`"]`) in
`scripts/assemble_universe.py` keeps the text before the first `"]` as the
boss, and the fork's `overrunNpcKey` in
`ui/features/upgrades/utils/item_source.ts` does the same for the tab's
Source cell.

## Resolution (2026-10-17, stage tab-follow-ups)

- Builder (`tbc-gear-prio@5674783e`): 22401's universe rows in ret p2-p5
  carry `{"kind": "raid", "zone": "Dire Maul", "boss": "Isalien"}`.
- Tab (`tbc-new-fork@d5d4a45e2`, bundled data `3bdacb8c6`): `SourceCell.tsx`
  maps a drop whose npc name holds `"]` to `npcId: 0` with the key as
  `otherName`, so upstream's `ItemSource` prints the zone over the key.
  `Eric "The Swift"` (6907) has no `"]` and is unchanged.
- Fixture `ret-p3-p2` (re-recorded on `3bdacb8c6`, committed in
  `7de8a2c2`) gives 22401 `{'kind': 'raid', 'zone': 'Dire Maul', 'boss':
  'Isalien', 'origin': 'db'}`. On the fixture page (Ranged, below-cutoff
  group) the Libram of Hope row's Source cell reads "Dire Maul" over
  "Isalien" and links to the zone; it holds no `"`, `[` or `]`.
- Upstream's own gear picker (`http://localhost:5173/tbc/paladin/retribution/`,
  Gear tab, libram slot, search "Libram of Hope", fork `3bdacb8c6`) still shows
  the fragment: "Dire Maul (N)" over `Isalien"].." - "..format(AL["Tier %s
  Sets`. That is upstream's page, outside the tab.

Verified by: `npm --prefix vendor/tbc-new-fork run test:unit` at
`tbc-new-fork@3bdacb8c6` (2026-10-17: 2526 passed, 1 failed; the one
failure is `ui/no_class_hooks.test.ts` on upstream
`ui/specs/warlock/dps/inputs.ts:75`, tracked by open ticket 629 and not
caused by this work; the new `item_source.test.tsx` and
`ResultRow.test.tsx` cases pass), and
`python -I -c "import sys;sys.path.insert(0,'scripts');import assemble_universe as A;p,_=A.assemble(3,spec='ret');print([x['sources'] for x in p['entries'] if x['itemId']==22401])"`
(prints a `raid` source with zone Dire Maul and `boss: 'Isalien'`), and the
fixture row at `tbc-gear-prio@7de8a2c2`.
