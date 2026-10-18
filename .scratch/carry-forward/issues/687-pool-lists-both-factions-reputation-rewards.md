Status: wontfix
Type: decision
Origin: pre-merge review feat/tab-wowsims-items, A6 (same as D3)
Blocks: none
Blocked by: owner ruling
Serves: .scratch/plans/upgrades-tab-finish-line.md, Tab-adjacent follow-on
Related: 505

# The pool lists both factions' copies of faction-locked reputation rewards

## What the player sees

A Blood Elf ret run ranks Alliance-only 29153 and 29156 (Honor Hold) beside
Horde-only 29155 and 29165 (Thrallmar), at about -1,390 DPS
(`data/tab-fixtures/ret-p3-p2.json`). None of the four was in the old bundled
ret list. For specs that use one-handers, both faction copies could rank
higher (hypothesis, untested).

## Cause

The run-time pool (fork `ui/features/upgrades/model/pool_source.ts`) never
reads wowsims' `factionRestriction`; upstream's gear picker can filter on it
(`sim.getFilters().factionRestriction`).

## The catch

wowsims also marks 29119 (Consortium) and 29171 (Cenarion Expedition) as
Alliance-only. Filtering on the field as it stands would drop items a Horde
player can get (game fact, hypothesis, untested).

## Done means

The owner rules whether the tab filters by the player's faction the way
upstream's picker does, treating wrong marks as a wowsims data gap, or keeps
both copies. The chosen behaviour is built and tested.

## Closing note

The tab keeps both factions' copies, as the site does. wowsims' gear picker
hides nothing by race: its faction filter is a manual picker setting whose
default is none (fork `ui/sim/player/player.ts:1299-1304`,
`ui/sim/sim.ts:1107-1117`). So the tab's default pool already matches the
site's default item list, and the tab reads no other picker filter either;
adopting this one alone is out of scope. wowsims marks some neutral
reputation rewards Alliance-only (db.json 29119 The Consortium, 29171
Cenarion Expedition); that is wowsims' data, not the tab's to correct.
Investigation: `.scratch/agent-reports/2026-10-18-general-task-faction-filter.md`
in the main folder (gitignored).
