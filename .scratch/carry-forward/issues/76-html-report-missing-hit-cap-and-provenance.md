Status: closed
Type: task
Origin: docs/reviews/phase-2-trust.md (domain axis)
Blocks: phase-3
Blocked by: none
Resolution: rendered from `ranking.caps` / `ranking.fight`, which
  `renderRankHtml` already receives -- no new RankReportMeta fields needed.
  Digest test repinned. 2026-08-09.

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


## What was done (2026-08-09)

Confirmed on the committed artifact first
(`.scratch/phase2-verify-ui/reports/nexess-p3-all.html`): 22 occurrences of
"your gap" and "hit rating" against **0** each of "gear read from", "Heroic
Presence", "salvation" and "off-tank" -- exactly as filed.

**Departed from the suggested fix.** The ticket proposes adding
`hitCap`/`fightProvenance` fields to `RankReportMeta` and populating them the
way `cli.ts` does. Not needed: `hitCapBanner` takes `ranking.caps.hit` and
`fightProvenanceLines` takes `ranking.fight`, and `renderRankHtml(ranking,
meta)` already receives the whole `Ranking`. Adding meta fields would copy
state that is already in scope and let the two drift. The report now calls the
same two functions the CLI does, so there is one source rather than two.

No duplication in output: the CLI prints to stdout, the report writes to a
file. Each artifact is separately self-contained, which is the point -- the
HTML is the shareable one.

Rendered as `.cap-banner` (body weight, since it qualifies every "widens your
gap" row) and `.provenance` (fine print), placed after the noise note and
before the slot nav.

Tests in `rank-report.test.ts`: one for the banner and provenance line, one
driving the `report-events` route with `confidence: 1, salvationUptime: 0` --
the combination that actually fires the off-tank warning (the first draft used
`salvationUptime: 0.42`, which does not, since `fightProvenanceLines` gates on
zero uptime and a confident parse).

The byte-identical digest test was repinned to
`2bca97bf...` / 11450 bytes. Before repinning, the rendered document was dumped
on both sides and diffed: the delta is exactly the two new `<p>` elements and
their two CSS rules, nothing else moved.

`pnpm verify`: 471 tests pass, typecheck/lint/format clean. `sim-defaults:check`
DRIFT is pre-existing (reproduces on clean `HEAD`, local gitignored `vendor/`).
