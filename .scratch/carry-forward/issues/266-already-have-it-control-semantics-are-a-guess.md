Status: blocked
Type: task
Origin: docs/reviews/phase-3-web-shell.md (spec axis, Sp7)
Blocks: phase-4
Blocked by: owner ruling on what the "Already have it" control should do

# The "Already have it" control greys and un-greys, which answers no user question

## Problem

PLAN.md §12's view-control table reads: "Already have it | received items
shown greyed, not removed | `owned` — greyed, never dropped (§8.3.3)". That
describes the **default state of an owned row**, not a toggle. The shipped
control (`apps/web/src/components/ViewControls.tsx:94-99`) is a checkbox
`greyOwned`, default on; unchecking it makes owned rows look identical to
un-owned ones. TMB's equivalent control is show/hide received; ours is
grey/un-grey, which no one asks for.

The greyed-never-dropped rule itself is honoured: the UI never passes core's
`hideOwned` to `applyView` (ticket 265 covers the core option's semantics).
Only the control's meaning is a guess.

## Options (owner's call)

1. Remove the toggle; owned rows are always greyed. Matches §12's table as
   written.
2. Keep a control but make it "Hide already-have" — **not allowed** under
   §8.3.3 (never dropped) unless that rule is amended.
3. Keep the toggle and document why un-greying is useful.

## Verify

`grep -n greyOwned apps/web/src/components/ViewControls.tsx apps/web/src/view-options.ts`
