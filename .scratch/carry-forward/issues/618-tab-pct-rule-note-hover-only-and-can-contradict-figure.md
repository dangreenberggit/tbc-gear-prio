Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 (Tab-adjacent)
Type: bug
Origin: SME reads of ticket 254 output (live tab capture .scratch/rank-reports/sme-254-tab-boundary.png on fork 316326a95; report .scratch/rank-reports/sme-254-slamaltman.html from .scratch/rank-reports/stage2-close-slamaltman.json), triaged 2026-10-11
Blocks: none
Blocked by: none
Related: 254, 506

# The tab's "by % rule" note is mouse-hover only and can contradict the figure beside it

Fork code. All paths are in fork 316326a95 under `ui/features/upgrades/`
unless they start with `assets/`.

## What the player sees

- The explanation of "by % rule" is only in a `title` attribute on a
  `<small>` that cannot take focus (`components/ResultsTable/DeltaCell.tsx:50-56`).
  Keyboard and touch users cannot read it.
- The text (`assets/locales/en/upgrades.json:96`) says "percentage arm
  (0.15%)". It does not say "of your current DPS", and it does not give the
  bar in DPS for this run.
- Two latent cases. Neither occurs in the five committed tab fixtures
  (`data/tab-fixtures/*.json`, scanned for rows the percentage rule admits):
  - The figure is formatted to 1 decimal (`utils/format.ts:17-25`), so a
    ΔDPS from 3.35 to 3.399 shows "+3.4 by % rule" beside a 3.4 DPS bar.
  - With Set potential on, the marker tests the raw `row.deltaDps`
    (`DeltaCell.tsx:29`), while the figure (`DeltaCell.tsx:30`, from
    `dpsSortKeyFor`, `model/results_view.ts:130-134`) and the view's
    above/below test (`belowCutoffUnderView`, `model/engine/view.ts:231-249`)
    use ΔDPS plus set credit. A marked row could then show a figure such as
    +8, well above the bar.

## Acceptance

- [ ] Keyboard and touch users can read the explanation.
- [ ] The explanation names the bar as a percentage of the player's current
      DPS and as a DPS figure for this run.
- [ ] The marker shows only when the figure shown beside it is below the
      absolute bar, with Set potential on and with it off.
- [ ] Each case above has a unit test of `DeltaCell` (today the marker's
      tests are in `components/ResultsTable/ResultRow.test.tsx:126-135`).
