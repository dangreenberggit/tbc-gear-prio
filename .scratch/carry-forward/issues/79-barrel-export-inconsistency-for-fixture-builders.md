Status: closed
Type: task
Origin: docs/reviews/phase-2-trust.md (standards axis)
Blocks: none
Blocked by: none
Resolution: chose direct-import (the ticket's second option); dropped the
  report-events re-export from index.ts and recorded the convention there.
  2026-08-09.

# `index.ts`'s public re-exports are inconsistent about which fixture builders are public

`index.ts` re-exports `REPORT_EVENTS_REF`, `reportEventsOfflineRecordings`,
`ReportEventsRawFixture` (lines ~29-31) and `classifyFeralForm` (~106), but
not `salvationUptimeOf` or `feralOfflineRecordings`/`FeralRawFixture` — even
though `cli.ts` imports the feral ones directly from
`./fixtures/feral-offline.js` rather than through the barrel.

Not a bug (nothing breaks), but no rule currently governs which
fixture-builder symbols are "public" via the barrel vs. internal-only. Pick
one: either all offline-fixture builders go through `index.ts` for
consistency, or none do and `cli.ts`'s direct-import pattern becomes the
convention everywhere (in which case the report-events ones should stop
being re-exported).

## What to do

Decide the convention, then make both fixture builders (report-events,
feral) match it.


## What was done (2026-08-09)

**Chose the second option: no fixture builder goes through the barrel.** The
code had already voted. There are three offline fixture modules --
`slamaltman-offline`, `report-events-offline`, `feral-offline` -- and every
consumer imports directly from its own module:

- `cli.ts` imports all three directly (lines 20, 24, 30)
- `feral-preset.test.ts`, `report-events-fallback.test.ts` and
  `slamaltman-offline.test.ts` each import their own directly

Nothing anywhere imported the three re-exported symbols *through* `index.ts` --
the only other hits were `dist/` build output. So the re-export was dead
surface, and removing it is what makes the codebase consistent rather than
what changes it. It also keeps test scaffolding off the package's public API.

Safety check before deleting a public export: this is a single-package repo
(`packages/core` only), nothing imports `@tbc/core` by name, and no file
outside `packages/core/src` referenced the symbols. Typecheck and all 471
tests pass after removal.

**Scope correction.** The ticket also names `salvationUptimeOf` and
`classifyFeralForm` as part of the inconsistency. They are not: both live in
`spec.ts`, not in a fixture module, so they are ordinary domain functions and
the fixture-builder convention does not apply to them. `classifyFeralForm`
stays exported; nothing changed there.

The convention is now written where it can be seen -- a comment at the point
in `index.ts` where the re-export used to be, so the next person adding a
fixture builder finds the rule instead of the precedent.
