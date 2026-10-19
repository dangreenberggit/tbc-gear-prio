Status: wontfix
Type: bug
Origin: SME reads of ticket 254 output (live tab capture .scratch/rank-reports/sme-254-tab-boundary.png on fork 316326a95; report .scratch/rank-reports/sme-254-slamaltman.html from .scratch/rank-reports/stage2-close-slamaltman.json), triaged 2026-10-11
Blocks: none
Blocked by: none
Related: 105

# The HTML report calls every ranked difference "run noise"

Core HTML report only; the tab does not render this note.

## What the reader sees

`.scratch/rank-reports/sme-254-slamaltman.html` says "Order within ~±118.1
DPS is run noise, not a ranked wishlist." over a list whose largest gain is
+49.68 (Belt of One-Hundred Deaths). Every one of the 48 above-cutoff rank
numbers is greyed: the file has 48 `class="rank soft-rank"` and no plain
`class="rank"` (`grep -o 'class="rank soft-rank"' <file> | wc -l`). The
reader is told that the gap between +49.7 and +3.1 is noise.

## Cause

Both the note and the greyed ranks use `ranking.baseline.stdev`, the
per-iteration spread of one sim (118.14 on this run):

- the note: `packages/core/src/rank-report.ts:294-297`;
- the greyed rank: `packages/core/src/rank-report.ts:376-382`, which greys
  any above-cutoff row with `|deltaDps| < stdev`.

The noise on a row's delta is the row's own `se`, which runs from 0.07 to
2.29 on `stage2-close-slamaltman.json` (a scan of `ranking.items[].se`). The
note came in the WIP-salvage commit `05ab947c` ("Salvage WIP recovery…"),
which gives no reason for the stdev scale.

## Acceptance

- [ ] Rendering `stage2-close-slamaltman.json` no longer says that the gap
      between +49.7 and +3.1 is noise.
- [ ] The noise note and the greyed ranks rest on the rows' `se` values, or
      on tie groups built from them, not on `baseline.stdev`.

## Comments

### 2026-10-19 — wontfix (ticket housekeeping)

Per the owner's 2026-10-16 scope ruling: there is no standalone web app or Stage 4 deploy, and the work is the fork's Upgrades tab only (`PLAN.md:934`; `.scratch/plans/upgrades-tab-finish-line.md:53-56`): this concerns only this repo's command-line ranking or its HTML report, which the tab does not use. The ticket states the tab does not render this note.
