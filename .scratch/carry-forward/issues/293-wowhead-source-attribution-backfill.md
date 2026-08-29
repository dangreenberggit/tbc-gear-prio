Status: open
Type: enhancement
Origin: stage-gate feature upgrades-all-dps-specs, plan amendment 1, 2026-08-25
Blocks: none
Blocked by: none

# Backfill source attribution for the nine db-phase specs

The nine DPS specs added by the all-DPS-specs pass ship no Wowhead list
layer. Their pool membership comes from db.json's `phase` field wherever
no source is parseable, and those rows carry
`{"kind": "unknown", "origin": "db"}` — the item is really in the pool and
really available at that phase, but where it comes from is not recorded.

At p5 this is 484-908 rows per spec, 55-60% of each pool. Ret and feral
are unaffected: their hand-collected lists supply the detail.

The tab discloses this per run in the Assumptions drawer
("Source attribution: partial — N items ... carry no drop, badge or vendor
detail"), so it is stated rather than silent. This ticket is about
replacing the disclosure with the data.

## What is missing, concretely

Badge cost, PvP season and rating requirement, reputation standing, and
vendor location — everything that lets a reader act on a row rather than
just see it. Also the editorial labels a guide carries (`rankLabel`,
`section`) which feed `bisTags`.

## What to do

Harvest per the playbook at
`.scratch/handoffs/feral-wowhead-lists-and-nonraid-sources.md:36-56` into
`data/wowhead-lists/<spec>/{pre-raid,p1-p2,p3,p4,p5}.json`. Budget
honestly: the existing ret and feral files run 72-118 entries each, every
row carrying `wowheadSourceText` **verbatim** from the page, because
`parse_wowhead_source` reads that prose for the source kind. A paraphrase
silently drops the kind. That is up to 45 files across the nine specs.

Do not reason from raid drop tables instead — that is how ticket 41 went
wrong, and the playbook says so explicitly.

Activation is a profile edit, not a directory appearing: each new spec
sets `wowhead_dir=None` in `scripts/assemble_universe.py`, which is a
deliberate sentinel so a directory created by this ticket cannot silently
switch the layer on. Point the profile at the directory in the same change
that lands the files.

## Recorded, not taken

The fork's `DatabaseFilters` phase exposure (about ten lines of Go) was
considered and declined during the amendment: the tab consumes committed,
already phase-scoped universe JSONs and never queries the fork db by
phase. It is noted here as a nice-to-have rather than a dependency.

## Done when

Every spec's profile names a real `wowhead_dir`, the universes regenerate
with `listOnly` and real source kinds in place of `dbPhase` rows, and the
Assumptions drawer stops rendering the partial-attribution line.
