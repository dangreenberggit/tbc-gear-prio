Status: open
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
