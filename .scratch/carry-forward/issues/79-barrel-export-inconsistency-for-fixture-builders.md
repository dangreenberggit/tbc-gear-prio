Status: open
Type: task
Origin: docs/reviews/phase-2-trust.md (standards axis)
Blocks: none
Blocked by: none

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
