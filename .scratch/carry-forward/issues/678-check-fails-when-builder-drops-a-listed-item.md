Status: closed
Closed: 2026-10-17, stage tab-follow-ups
Type: task
Origin: stage tab-source-labels (deferred part P5), branch feat/tab-source-labels
Blocks: none
Blocked by: none
Serves: .scratch/plans/upgrades-tab-finish-line.md, Tab-adjacent follow-on (source labels)
Related: 173, 17, 174

# A check that fails when the builder silently drops a listed item

This ticket carries ticket 173 forward. Ticket 173 stays open with
`Blocked by: 678`: closing it as superseded would need a `Verified by:`
line naming evidence (`docs/agents/issue-tracker.md` § Closing a ticket),
and no check exists yet to cite.

## What is wanted (ticket 173:46-52)

A test that fails when an item a Wowhead list names ends in
`excludedNoSource` (the builder dropped its prose) — for every spec and
phase, not only the p3 ret and feral byte compare that
`pnpm pool-listings:check` does today (173:65-92).

## Why it is deferred

Ticket 173 says the real fix is ticket 17's deferred ~280-item question
and not to grow `TICKET_157_FORCE_INCLUDE` (173:54-63). Stage
tab-source-labels P2 removes the six force-included items' `unknown` by
writing their db/AtlasLoot drops; after P2, the shape of what is left to
detect is known and this check can be written against it.

## Seam contract

- From P2: `pool-hardening.test.ts`'s id exclusion for the six is deleted;
  the test "reserves kind:unknown for items no input mentions at all" runs
  on its own again. This ticket extends that test, or adds a sibling, to
  every committed universe file.
- From P2: `TICKET_157_FORCE_INCLUDE` is membership-only (the set
  `ticket_157_included` in `scripts/assemble_universe.py`); a detector can
  compare `ticket_157_included` with the ids whose db source resolves and
  report when the set can shrink.

## Done when

A `pnpm verify` gate reads every `data/universes/<spec>-p<n>.report.json`
`missedItems` (or the equivalent field) and fails when an item named by a
Wowhead list ships `unknown`; its first run's count is recorded here.

## Resolution (2026-10-17, stage tab-follow-ups)

`pnpm wowhead-list-gaps:check` (`scripts/check_wowhead_list_gaps.py`) is a
`pnpm verify` step, directly after `universe-rebuild:check`, so a stale
universe fails by name before this check reads it. For the two profiles
with a Wowhead list folder (ret, feral) and each committed phase 2-5, it
takes the list ids from the stage files the phase reads and fails when one
is absent from the universe or present with first source `kind: unknown`,
unless `data/wowhead-list-gaps.json` names that `(spec, itemId)` at that
phase. A row that is no longer a gap also fails (`STALE GAP`), so the file
only shrinks.

It reads the list files and the committed universes directly, not the
reports' `missedItems` that "Done when" above names: a report is the
builder's own account, so a check built on it would pass whenever the
builder misreports. The absent count it finds equals each report's
`wowheadRecall.missed` today (below).

First run, at `tbc-gear-prio@f4951822` (universes unchanged since
`89e5c1f6`). The counts and ids equal the measurement at `f979411f`, before
stage P1: P1's cross-spec sources moved none of these rows.

| spec-phase | list ids | absent (= report `missed`) | first source `unknown` |
| --- | --- | --- | --- |
| ret-p2 | 86 | 6 | 4 |
| ret-p3 | 123 | 12 | 4 |
| ret-p4 | 130 | 12 | 4 |
| ret-p5 | 160 | 13 | 4 |
| feral-p2 | 79 | 15 | 2 |
| feral-p3 | 115 | 16 | 2 |
| feral-p4 | 115 | 16 | 2 |
| feral-p5 | 115 | 16 | 2 |

`data/wowhead-list-gaps.json` holds 36 rows (ret 18, feral 18), one per
`(spec, itemId)`, with reasons notInDb 2, notD7 2, noSource 6, stubOnly 2,
sourcedNoRoute 18, unknownSource 6. Summary line:
`wowhead-list-gaps: 923 list rows, 36 tolerated gaps, 0 new, 0 stale`.

Planted checks: with the ret 31920 row deleted, four
`NEW GAP ret p<n> 31920 Shaffar's Band of Brutality absent` lines and rc 1;
with ret 28442's `phases` given p3 (where it is present),
`STALE GAP ret p3 28442 sourcedNoRoute -- no longer a gap, remove it` and
rc 1; with 22401's first source set to `unknown` in `ret-p3.json`,
`NEW GAP ret p3 22401 Libram of Hope first source unknown` and rc 1. Each
file was restored after its run.

`packages/core/test/pool-hardening.test.ts:1153-1182` (feral p3, present
with `unknown`) is left as it is.

Verified by: `pnpm wowhead-list-gaps:check` at `tbc-gear-prio@f4951822`.
