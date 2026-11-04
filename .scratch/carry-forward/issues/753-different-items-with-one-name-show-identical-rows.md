Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 3b (DPS spec list)
Type: task
Origin: docs/live-runs/2026-11-03-p45-dps-pass.md (SME handoff .scratch/handoffs/sme-rank-judgment-452-p4-casters.md)
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
- Every one of the 22 run JSONs has two or more rows named
  `Mark of the Champion`, `Sergeant's Heavy Cape` and
  `Sergeant's Heavy Cloak` (a name count over each file's `rows`).

## Game fact and source

- Repo data (db.json, read by the SME): Mark of the Champion is 23206 and
  23207, with different effects (spells 29112 and 29113, a melee and a
  caster version); Sergeant's Heavy Cape is 28378 and 28379 (identical
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
