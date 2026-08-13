Status: closed
Closed: see docs/reviews/feat-set-bonus-value.md round 5 disposition
Type: bug
Origin: docs/reviews/feat-set-bonus-value.md round 5 (adversarial 5-A3)
Blocks: none
Blocked by: none

# No feral coverage on the `rankUpgrades` path, so the spec branch is untested

In `packages/core/test/rank.test.ts`:

    grep -c 'spec: "ret"'    -> 29
    grep -c 'spec: "feral"'  -> 0

Ret is the one spec **with** a `SPEC_PREFERRED_METAS` entry, so no test drives
the branch round 5 added. This is why ticket 139 shipped with 746 tests green.

Two specific holes:

1. The suite's own wiring test ("threads the requested spec into the gem
   context") asserts a **negative** on a ret run — that no note is present. It
   passes identically if `spec` were dropped on the floor entirely, because
   `missingMetaPreferenceNote(undefined)` is also `undefined`. It cannot
   distinguish "threaded correctly" from "not threaded at all".

2. `emptyMetaSocket` has no `rankUpgrades` coverage. Its only appearance in
   tests is a hand-written literal `emptyMetaSocket: true` in a report fixture
   (`rank-report.test.ts:417`) — the field is never produced by the ranking
   path under test, only asserted as rendered input.

## Fix

Add a feral `rankUpgrades` case through the recorded adapters that asserts on
the produced gem array and the produced `emptyMetaSocket` value, not on a
fixture literal. Assert a **positive**: that the no-preference note appears for
feral, and that a feral candidate carrying a migrated meta is *not* flagged.
That test is the one that fails today (ticket 139).
