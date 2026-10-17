Status: open
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
