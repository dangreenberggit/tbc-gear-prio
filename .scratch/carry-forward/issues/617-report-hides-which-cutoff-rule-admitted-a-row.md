Status: open
Type: bug
Origin: SME reads of ticket 254 output (live tab capture .scratch/rank-reports/sme-254-tab-boundary.png on fork 316326a95; report .scratch/rank-reports/sme-254-slamaltman.html from .scratch/rank-reports/stage2-close-slamaltman.json), triaged 2026-10-11
Blocks: none
Blocked by: none
Related: 254, 104

# The HTML report hides which cutoff rule admitted a row

Core HTML report only. The tab marks these rows with its own "by % rule"
note (ticket 618 covers that note).

## What the reader sees

On `.scratch/rank-reports/sme-254-slamaltman.html`:

- The top ranked list shows #46 Ring of Deceitful Intent (+3.20), #47
  Stormrage Signet Ring (+3.15) and #48 Lightbringer Breastplate (+3.10), all
  below the stated 3.4 DPS bar, with no note. The chips come from `chipHtml`
  (`packages/core/src/rank-report.ts:117-145`), which has no cutoff-rule
  marker.
- In the per-slot rows the note reads "cleared by %-arm"
  (`rank-report.ts:527`). That is engineering wording; the tab says "by %
  rule" (fork 316326a95 `assets/locales/en/upgrades.json:95`).
- The note sits inside `<div class="pct">` (`rank-report.ts:547`), and
  `packages/core/src/rank-report-css.ts:524` hides `.pct` in the weighted,
  full and package views (the ticket-104 rule). In those three views the
  note is gone.
- `fmtDelta` prints 2 decimals (`rank-report.ts:169-172`), so a row at
  +3.395 to +3.399 would print "+3.40" beside a note saying it is below the
  3.4 bar. No row on this run is in that range.

## Acceptance

On `stage2-close-slamaltman.json`:

- [ ] A row admitted only by the percentage rule is marked in the top ranked
      list and in every view (off, weighted, full, package).
- [ ] The marker uses the tab's plain wording.
- [ ] No row prints a figure at or above the absolute bar beside the marker.
