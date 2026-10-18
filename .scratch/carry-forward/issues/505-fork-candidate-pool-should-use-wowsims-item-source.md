Status: closed
Type: task
Origin: owner decision on ticket 500 (2026-09-24)
Blocks: none
Blocked by: none

# Fork candidate pool should use wowsims' item source

## Owner decision

2026-09-24: "items come from wherever wowsims gets items from as far as
this fork is concerned." The fork's candidate pool should use wowsims'
own item source, not this repo's assembled universes.

## Current state

Today the fork's Upgrades tab ranks candidates from
`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/data/*.universe.json`.
Those files are byte copies of this repo's `data/universes/*.json`, which
`scripts/assemble_universe.py` builds from AtlasLoot, token maps, Wowhead
lists and curated includes, and `scripts/sync_fork_universes.py` copies
into the fork.

The owner's direction is that, for the fork, items should come from
wherever wowsims gets its items (its item database and the gear picker's
source and phase data). The repo should not maintain its own item
database for the fork.

## The work

Investigate how the wowsims gear picker sources and filters items (phase,
source, spec eligibility), then plan how the Upgrades tab gets its
candidates the same way, and what happens to the universe-sync path.

Supersedes the approach in 500 and 298. Related: 301 (borrow upstream,
don't re-mirror).

## Scope

Outside the current Upgrades-tab closeout arc unless the owner says
otherwise.

## What would close this

A plan that says where the tab's candidates come from, approved by the
owner, and implemented with the universe-sync path removed or explicitly
kept for a stated reason.

## Comments

**2026-10-11 — how the Chunk 3b direction relates to this ticket**
(`.scratch/plans/upgrades-tab-finish-line.md`, step 6, Q-feral-p5). Asked
about ticket 500's missing items with an option phrased as "take items from
where wowsims gets items from", the owner replied: "'take items from where
wowsims gets items from' This makes no sense. This is a wowsims tab. Why
would it get items from anywhere else? Why would this fix anything if it's
already being done?" The list builder already reads the wowsims item
database (`vendor/wowsims/db.json`, pinned to upstream's
`assets/database/db.json` by `data/wowsims.lock.json`); the gaps come from
its membership rules (tier tokens, Sunmote upgrades, crafted patterns, and
ret/feral's older rules). The owner then asked for "a programmatic way to
check and add such items", which is now tickets 609–613 (Tab-blocking).

Those tickets keep the assembled lists and fix their rules. This ticket's
question (should the tab stop shipping its own list files and read
wowsims' item data at run time) stays open and is not on the finish list:
the re-asked question proposed keeping it out, and the owner's reply did
not object (not an explicit ruling). Tickets 500 and 298 are no longer
superseded by this ticket; 298 closed as superseded by 609, and 500 points
at 609, 611 and 612.

## Closed 2026-10-18 (stage tab-wowsims-items)

The owner's ruling of 2026-10-17, verbatim: "Yes: tier-token and Sunmote exchange data is the one stated exception the fork may carry. Plan ticket 505 with everything else from wowsims only."

Branch `feat/tab-wowsims-items` (this repo and the fork) builds the tab's
candidate pool at run time from the fork's wowsims item database
(`sim.db`, `canEquipItem`, `MISSING_ITEM_EFFECTS`) and the spec's wowsims
preset gear sets, in `ui/features/upgrades/model/pool_source.ts`. Row
sources come from wowsims' item facts plus one copied exchange file,
`tier-exchange.json` (tier piece to token, Sunmote upgrade to base item).
The 44 bundled universe copies are deleted. ADR-0038 records the rule.

The universe-sync path is kept for a stated reason:
`scripts/sync_fork_universes.py` now copies only the 19 EP-weight files and
`tier-exchange.json`, and fails on any other JSON file in the fork's data
folder. This repo's builder and universes are unchanged (owner, 2026-10-17:
"they can be in tbc gear prio but not the upgrades tab repo").

Verified by: `python -I scripts/sync_fork_universes.py --check` prints "20
bundled copies byte-match", and `git -C vendor/tbc-new-fork ls-files ui/features/upgrades/model/data | grep -c universe.json` prints 0 at `tbc-new-fork@f06772929`.
