Status: open
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
- Game: the capes and cloaks are an Alliance and a Horde version.
  **Recalled, unverified.**
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
