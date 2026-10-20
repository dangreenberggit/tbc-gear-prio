Status: open
Type: task
Origin: docs/reviews/chore-ticket-housekeeping.md (A3)
Blocks: none
Blocked by: none

# The tab's BiS tags can come from an older phase, and only the browser console says so

For specs whose presets stop at phase 3 (ret, mage, rogue and shadow, per the
2026-10-19 handoff), a run at phase 4 or 5 tags rows "BiS" from phase-3 preset
sets and selects those sets by default. The tab's only notice is the line
`BiS tags: from P3 sets, ranking P5` in the assumptions line that
`model/run_session.ts:59` writes with `console.info`
(`ui/features/upgrades/model/assumptions.ts:36-37`; default sets at
`model/settings_pool.ts:160-165`; tbc-new-fork@bc3cca6a1). Whether the player
sees this anywhere on the page is untested.

Ticket 153 held the CLI half of this (its `bisStale` box) and was marked
wontfix in `chore/ticket-housekeeping`; its comment pointed the tab half at the
gitignored handoff, so this ticket holds it.

## What to do

During the all-specs runs (handoff Track A step 2), look at a ret, mage, rogue
or shadow run at phase 4 or 5 and record what the player sees. If nothing on
the page says the tags come from phase-3 sets, decide with the owner whether
the tab needs a visible note. Close with what was found.
