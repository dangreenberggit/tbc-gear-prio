Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 (Tab-adjacent)
Type: bug
Origin: SME reads of ticket 254 output (live tab capture .scratch/rank-reports/sme-254-tab-boundary.png on fork 316326a95; report .scratch/rank-reports/sme-254-slamaltman.html from .scratch/rank-reports/stage2-close-slamaltman.json), triaged 2026-10-11
Blocks: none
Blocked by: none
Related: 254, 506

# A below-cutoff row in the tab can show the 3 DPS bar as its figure

Fork code, under `ui/features/upgrades/`. Cut down on 2026-10-11: ADR-0037
(owner ruling: one flat 3 DPS bar, no percentage rule) removed the "by %
rule" note, so the hover-only explanation and the Set potential mismatch
this ticket was filed for no longer exist. One rounding case is left.

## What the player sees

The figure is formatted to 1 decimal (`utils/format.ts`, `formatDps`). A row
whose ΔDPS is from +2.95 to +2.999 is below the cutoff and shows "+3.0"
inside the group titled "N item(s) below the 3 DPS cutoff". With Set
potential on, the same holds for the figure plus set credit, which the view
tests against the same bar (`model/engine/view.ts`, `belowCutoffUnderView`).
No row is in that range in the five `data/tab-fixtures/*.json` rankings
(scan of `deltaDps` in [2.95, 3.0), 2026-10-11), so the case is latent.

## Acceptance

- [ ] No row in the below-cutoff group shows a figure at or above the bar,
      with Set potential on and with it off, or the tab says why it does.
- [ ] A unit test of `DeltaCell` or the group covers the case.

## History

The original ticket (SME read of ticket 254's output) found the "by % rule"
note readable only by mouse hover, not naming the bar in DPS, and able to
sit beside a figure at or above the absolute bar. The note is gone
(tbc-new-fork@be3d703a1), and the group title now names the bar in DPS.
