Status: closed
Type: task
Origin: docs/live-runs/2026-11-03-p45-dps-pass.md (SME handoff .scratch/handoffs/sme-rank-judgment-452-p4-casters.md)
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 3b (DPS spec list)
Blocks: none
Blocked by: none
Related: 452, 620

# Different items with one name show as identical rows

On the balance tab at phase 4, starting from the "Phase 3" preset, the table
shows two rows reading `Trinket 1 | Mark of the Champion | -69.3`, and two
rows each for Sergeant's Heavy Cape and Sergeant's Heavy Cloak. The player
cannot tell which row is which item. All 22 runs of the phase 4/5 pass (11
DPS specs) show these three pairs. Ticket 620 covers the steps of one
reputation ring; these are different items that share a name.

## Rows (exact text from the run JSON)

- balance p4: `310 | Trinket 1 | Mark of the Champion | -69.3` and
  `311 | Trinket 1 | Mark of the Champion | -69.3`.
- balance p5: `529 | Trinket 2 | Mark of the Champion | -93.7` and
  `530 | Trinket 2 | Mark of the Champion | -93.7`.
- Every one of the 22 run JSONs has exactly two rows named
  `Mark of the Champion`, two named `Sergeant's Heavy Cape` and two named
  `Sergeant's Heavy Cloak`. Re-run from the main checkout; each line
  prints `[2, 2, 2]`:

  ```
  python3 -I -c "import json,glob,collections as c; n=('Mark of the Champion',\"Sergeant's Heavy Cape\",\"Sergeant's Heavy Cloak\"); [print(f.split('/')[-1], [c.Counter(r['item'] for r in json.load(open(f))['rows'])[x] for x in n]) for f in sorted(glob.glob('.scratch/agent-reports/2026-11-03-p45-runs/*-p[45].json'))]"
  ```

## Game fact and source

- Mark of the Champion: db.json gives two items, 23206 and 23207, each
  with only an effect named "Champion of the Dawn" (29112, 29113) and no
  stats. The engine gives them different effects: 23206 +150 attack power
  against Undead and Demons
  (`vendor/tbc-new-fork/sim/common/tbc/items_trinkets.go:737-738`), 23207
  +85 spell damage against them (`:760-761`).
- Repo data (db.json, read by the SME): Sergeant's Heavy Cape is 28378 and 28379 (identical
  stats); Sergeant's Heavy Cloak is 28377 and 28380. None has a
  `factionRestriction` in db.json.
- Game: in original TBC the capes and cloaks were an Alliance and a Horde
  version (warcraft.wiki.gg). In TBC Classic, Wowhead's vendor data lists
  28377 and 28378 as sold to both factions, and 28379 and 28380 as sold by
  no one (checked 2026-11-12; `.scratch/agent-reports/2026-11-12-general-task-753-same-name-rows.md`
  § 3 in the main checkout, gitignored). wowsims' data gives no faction for
  any of the four.
- In the runs judged, both rows of a pair have the same DPS and sit far
  below the cutoff, so no upgrade above the cutoff changes. For Mark of the
  Champion the two items have different effects, so on another page the
  two rows could differ.

## Evidence

- Run JSON (gitignored): `.scratch/agent-reports/2026-11-03-p45-runs/*-p[45].json`.
- SME handoffs: `.scratch/handoffs/sme-rank-judgment-452-p4-casters.md` F5,
  `.scratch/handoffs/sme-rank-judgment-452-p5-casters.md` F6.

## Done when

No two rows on the tab have identical text while naming different items:
either a row names what tells the items apart, or an item the player cannot
wear (for example the other faction's version) is not offered.

## Comments

2026-11-12, closed on branch `fix/tab-polish` by fork commit
`tbc-new-fork@690fcdeb5` ("Offer items db.json describes the same but the id
once").

- **Capes and cloaks: fixed.** Sergeant's Heavy Cape 28378/28379 and
  Sergeant's Heavy Cloak 28377/28380 have db.json records that are equal in
  every field except the id, and no Go file names any of the four ids. The
  pool (`ui/features/upgrades/model/pool_source.ts`) now keeps one item per
  group of items whose db.json records match apart from the id: the id the
  player wears, else one a preset holds, else the lowest id, with the
  group's tags. Each cape and cloak is offered once. Across the 55 pool
  cells (11 specs, phases 1-5), under both heroic five-man policies, the
  change drops 28379 and 28380 and nothing else
  (`.scratch/agent-reports/2026-11-12-general-task-753-build.md` in the
  main checkout, gitignored).
- **This differs from wowsims' gear picker, on purpose.** The picker lists
  both ids of each pair as two identical rows: its list keeps an item by
  phase and search text only
  (`ui/features/gear/components/SelectorModal/ItemList.tsx:76`), and its
  faction filter keeps an item with no faction (`ui/sim/player/player.ts:1299-1304`).
  The tab offers one because it ranks: simming both gives two rows with one
  DPS figure that nothing on the page tells apart. This was the session's
  call (`.scratch/plans/tab-polish-2026-11-12.md` Decision log, 753), not a
  wowsims behaviour, and the merge ask says so.
- **Gear sets that name the other id: fixed in review.** A preset or saved
  set holding the id the pool left out showed "0 in pool", got no badge on
  the row, and prune dropped the item from the run. Fork `bee90b468`
  ("Match a set's items to the twin the pool offers") makes the settings
  hold a set's item under every id of its group (`twinIdsOf`,
  `settings_pool.ts`); finding A1 of `docs/reviews/fix-tab-polish.md`.
- **Mark of the Champion: stays two rows, on purpose.** 23206 and 23207 are
  different items: +150 attack power against Undead and Demons, and +85
  spell damage against them
  (`sim/common/tbc/items_trinkets.go:737-738`, `:760-761`). wowsims' own
  gear picker shows them as two rows with the same name and item level,
  told apart only by icon and Wowhead tooltip, and wowsims' data has no
  words for the difference. The tab rows have the same icon and tooltip.
  The owner's ruling on ticket 620's ring steps, on 2026-11-03, is close
  but not the same case: "each step as its own item, which is true, being
  displayed that way, is fine. showing i level seems like a fine idea"
  (the owner's message in session `0ce9166b-0892-4004-8c8c-bd4a041a9848`,
  transcript line 412, 2026-11-03T16:20Z; recorded verbatim in ticket 620
  § Owner rulings and in
  `.scratch/handoffs/2026-11-03-upgrades-tab-session-2-handoff.md:19`). The
  ring steps differ in item level, which the tab now shows; both Marks are
  item level 90, so their rows read the same in every word. What decides
  the Marks is the picker: it shows them the same way, and wowsims has no
  words for the difference.
  So "Done when" is met as "no two rows offer items the site's own database
  describes the same", not as its literal "no two rows have identical
  text". The faction route ("not offered") cannot be built: wowsims has no
  faction data for these ids. Investigation:
  `.scratch/agent-reports/2026-11-12-general-task-753-same-name-rows.md`
  (main checkout, gitignored).

Verified by: run from inside the fork (`vendor/tbc-new-fork`), with node v22:

```
npx vitest run ui/features/upgrades/model/pool_source.test.ts -t "Sergeant|describes the same but the id|keeps the id the player wears"
npx vitest run ui/features/upgrades/model/settings_pool.test.ts -t "names the other id of an item the pool offers once"
```

On 2026-11-12 at fork `bee90b468` the first printed `Tests  59 passed |
125 skipped (184)` and the second `Tests  3 passed | 36 skipped (39)`;
both exited 0. The 59 are "offers each Sergeant’s cape and cloak once and
keeps both Mark of the Champion items", the 55 cells of "%s offers no two
items db.json describes the same but the id", and the three cases of
"keeps the id the player wears, else one a preset holds, with the group’s
tags". The 3 are the review fix's: a saved set naming either id is counted
in the pool, kept by prune and badged, and a BiS preset naming the other id
is selected by default and names its heading. The whole of
`pool_source.test.ts` printed `Tests  184 passed (184)`. (At `690fcdeb5`,
before the review fix, the first command printed `59 passed | 124
skipped (183)`.)
