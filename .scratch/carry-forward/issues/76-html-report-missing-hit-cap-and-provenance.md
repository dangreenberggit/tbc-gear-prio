Status: open
Type: task
Origin: docs/reviews/phase-2-trust.md (domain axis)
Blocks: phase-3
Blocked by: none

# The HTML report renders hit-gap advice but omits the hit-cap banner and fight-provenance warning

`hitCapBanner` and `fightProvenanceLines` are called only from `cli.ts`
(around lines 375 and 395) for the CLI's own stdout — `RankReportMeta`
(`rank-report-rules.ts:51-68`) has no field for either, so `rank-report.ts`
never receives them. But `rank-report.ts` (around line 164) still renders
per-row "costs N hit rating — widens your gap to X" text.

Confirmed on the committed artifact
`.scratch/phase2-verify-ui/reports/nexess-p3-all.html`: the banner text, the
"gear read from" provenance line, and the salvation/off-tank warning all
appear zero times, while rows referencing "your gap" are present.

This matters because the HTML report is the shareable artifact — a reader
sees "widens your gap" with no statement of what the gap is, no Heroic
Presence caveat, and none of the off-tank warning ticket 06 added precisely
because "nothing in the output named the fight." The JSON sidecar does carry
`caps` and `fight`, so this is a rendering gap, not a data gap.

## What to do

Add `hitCap`/`fightProvenance` (or equivalent) fields to `RankReportMeta`,
populate them the same way `cli.ts` does, and render them in the HTML report
template alongside the existing hit-gap row text.
