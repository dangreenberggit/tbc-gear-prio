Status: open
Type: bug
Origin: SME reads of ticket 254 output (live tab capture .scratch/rank-reports/sme-254-tab-boundary.png on fork 316326a95; report .scratch/rank-reports/sme-254-slamaltman.html from .scratch/rank-reports/stage2-close-slamaltman.json), triaged 2026-10-11
Blocks: none
Blocked by: none
Related: 254, 104

# A below-cutoff row in the HTML report can print the 3 DPS bar as its figure

Core HTML report only. Cut down on 2026-10-11: ADR-0037 (owner ruling: one
flat 3 DPS bar, no percentage rule) removed the "cleared by %-arm" marker
and the rule it named, so the marker findings below "History" no longer
apply. One rounding case is left.

## What the reader sees

`fmtDelta` prints 2 decimals (`packages/core/src/rank-report.ts`, `fmtDelta`).
A row whose ΔDPS is from +2.995 to +2.9999 is below the cutoff, so it is
muted (`row muted`), but it prints "+3.00" while the lede says "Cutoff 3
DPS.". No row is in that range on `.scratch/rank-reports/stage2-close-slamaltman.json`
or on the five `data/tab-fixtures/*.json` rankings (scan of `deltaDps` in
[2.995, 3.0), 2026-10-11), so the case is latent.

## Acceptance

- [ ] No below-cutoff row prints a figure at or above the bar, or the
      report says why it does (for example, by printing such a figure with
      more decimals).

## History

The original ticket (SME read of ticket 254's output) asked for a marker on
rows only the percentage rule admitted, in every view and in plain wording.
With no percentage rule there are no such rows.
