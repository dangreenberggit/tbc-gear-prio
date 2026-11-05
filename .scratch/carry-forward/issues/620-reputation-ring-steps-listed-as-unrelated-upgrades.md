Status: closed
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 (Tab-adjacent)
Type: task
Origin: SME reads of ticket 254 output (live tab capture .scratch/rank-reports/sme-254-tab-boundary.png on fork 316326a95; report .scratch/rank-reports/sme-254-slamaltman.html from .scratch/rank-reports/stage2-close-slamaltman.json), triaged 2026-10-11
Blocks: none
Blocked by: none
Related: 17

# The steps of one reputation ring are listed as unrelated upgrades

Core pool and report, and the tab.

## What the reader sees

On `stage2-close-slamaltman.json` the report ranks the steps of one Scale of
the Sands ring as separate items:

| Item id | Name                        | Standing | Rank          |
| ------- | --------------------------- | -------- | ------------- |
| 29301   | Band of the Eternal Champion | Exalted  | #11           |
| 29300   | Band of Eternity            | Revered  | #28           |
| 29299   | Band of Eternity            | Honored  | #35           |
| 29298   | Band of Eternity            | Friendly | below cutoff  |

In the tab fixture `data/tab-fixtures/ret-p3-p2.json`, the below-cutoff rows
include 12 rows named "Band of Eternity". They are the Friendly, Honored and
Revered steps of four rings whose Exalted steps have their own names:
29294-29297 (Band of the Eternal Defender), 29298-29301 (Champion),
29302-29305 (Sage), 29306-29309 (Restorer). The grouping by contiguous id
block is read from the ids and Exalted names; hypothesis, untested against a
quest-chain source. Order the steps by `source.standing`, not by item id: in
the Restorer chain 29307 is Friendly and 29306 is Honored (both fixtures).

## Cause

Each standing's item id is an independent candidate. Nothing in the pool
links one step to the next. That a player holds only one ring of a chain at
a time is game knowledge; hypothesis, untested here.

## Acceptance

- [ ] ~~Rows from one quest-upgrade chain are shown as steps of one item, each
      naming its standing, in the report and in the tab.~~ Not built: the
      owner's 2026-11-03 rulings below set it aside.
- [x] Whether lower steps are collapsed is decided and recorded in this
      ticket.
- [x] Added by the first ruling: every Upgrades-tab row shows its item level
      under its name.

## Owner rulings (2026-11-03, verbatim)

- On ring steps: "each step as its own item, which is true, being displayed
  that way, is fine. showing i level seems like a fine idea"
- On the half about the command-line ranking report in this repo: "we are
  working on the upgrades tab, not other shit in tbc gear prio (is that "shit
  repo"?) but rather the upgrades tab and the fork."

The analysis behind the rulings is
`.scratch/agent-reports/2026-11-03-general-task-620-ruling-prep.md`
(gitignored), option B. It also corrects this ticket: the tab reads wowsims'
db.json, which gives the 32 ring-step items (29276-29291 and 29294-29309) no
source and no standing, so the tab cannot name a standing without a second
item source; 28 of them reach the pool, because the pool keeps epics only and
the 4 Friendly Violet Signets are rare. The Violet Eye rings have the same
problem (8 rows named "Violet Signet").

## Closing note

- **Grouping the steps and naming standings (acceptance 1, tab half):** closed
  by the first ruling. Each step stays its own row. No steps are collapsed or
  hidden, which answers acceptance 2.
- **The report half (acceptance 1, "in the report"):** closed by the second
  ruling, out of scope.
- **What was built instead:** every row of the Upgrades tab, in the main table
  and in the fold-out of items that gain less than 3 DPS, shows "ILvl N" under
  the item name, beside its badges. "ILvl" is the word wowsims' gear picker
  uses for its item-level column, and N is read as the picker reads it (db.json
  `scalingOptions` key 0). Two "Band of Eternity" rows now read "ILvl 136" and
  "ILvl 135". The level does not follow standing order (Honored 29299 is 136,
  Revered 29300 is 135: levels from db.json, standings from
  `data/atlasloot_sources.json`), so the tab still does not say which standing
  a row needs. An item the site's database gives no level shows no line.
- **What the level does not tell apart:** it separates the steps of one ring
  chain, not steps of different chains. The four Scale of the Sands chains
  give 12 "Band of Eternity" items only four levels in db.json: 128 (29294,
  29298, 29302, 29307), 136 (29295, 29299, 29303, 29306), 135 (29300, 29304)
  and 144 (29296, 29308). So four rows still read "Band of Eternity" and
  "ILvl 136", four read "Band of Eternity" and "ILvl 128", and only the
  Wowhead tooltip tells the rows of each group apart. The 8 "Violet
  Signet" rows show two levels, 110 and 120.

Verified by: tbc-new-fork@594d07f66 (the item-level line) and
tbc-gear-prio@70b66f35, with these commands from the pair root:

```
env -C vendor/tbc-new-fork npx vitest run ui/features/upgrades/components/ResultsTable/ResultRow.test.tsx -t "item.level"
pnpm layout-gate:check
```

The vitest run passes the three item-level cases in `ResultRow.test.tsx`; the
layout gate passes check 22 (every row shows its item level on one line below
the name, at least 2 px clear) at 375, 653, 768 and 1280 on all six mock
fixtures.

## Comments

2026-11-03 (p45 DPS pass, on fork `13a980cf3`, before the item-level line (tbc-new-fork@594d07f66)): all 22 phase 4/5 runs of the 11 DPS specs list reputation-ring steps (Band of Eternity, Violet Signet) as separate rows with the same name. Details: row 620 in docs/live-runs/2026-11-03-p45-dps-pass.md § Known defects seen again; .scratch/handoffs/sme-rank-judgment-452-p4-casters.md F4, -p4-physical.md K2, -p5-casters.md F5, -p5-physical.md K2.
