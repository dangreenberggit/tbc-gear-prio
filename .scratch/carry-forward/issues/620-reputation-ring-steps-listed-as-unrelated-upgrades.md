Status: open
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
quest-chain source.

## Cause

Each standing's item id is an independent candidate. Nothing in the pool
links one step to the next. That a player holds only one ring of a chain at
a time is game knowledge; hypothesis, untested here.

## Acceptance

- [ ] Rows from one quest-upgrade chain are shown as steps of one item, each
      naming its standing, in the report and in the tab.
- [ ] Whether lower steps are collapsed is decided and recorded in this
      ticket.
