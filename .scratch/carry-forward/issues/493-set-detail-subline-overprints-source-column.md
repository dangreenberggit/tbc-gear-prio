Status: open
Type: bug
Origin: stage-gate upgrades-tab-closeout round 2, Gate C (visual seat finding, 2026-09-24)
Blocks: none
Blocked by: none
Related: 489, 467

# "hover for set detail" prints over the Source column

On set rows, the `upgrades-set-bonus` sub-line under the DPS figure ("hover
for set detail") runs into the Source column and prints over the Source text
at 1280px.

**Possible cause, untested:** Round 1's 489 change widened the Source column
from 7rem to 11rem (fork `49a1208fc6f7b8421bd80b17291037fbe1960c0b`), which
leaves less room for the DPS cell's sub-line.

## Evidence

Captures (gitignored) in `.scratch/stage-gate/upgrades-tab-closeout/round-2/`,
fork `371da7dce972ea8bf6267daadf9f20627f7e58bb`, width 1280:

- `feral-worn1-table-on.png`: every set row (1–10 and 12) overlaps; rows 10 and
  12 ("Serpentshrine Cavern") are the worst.
- `feral-worn0-table-on.png` rows 12 and 14; `feral-worn2-tip-Malorne-on.png`.
- Advisory, same area: long DPS figures touch the Slot text ("Shoulder+112.3
  DPS") in `feral-worn1-table-off.png` row 1 and `feral-worn0-table-off.png`
  row 8.
- Visual handoff `.scratch/handoffs/visual-review-467-round-2.md`, section
  "Findings".
- The layout gate passed on this source (53 passed, 0 failed), so no gate
  assertion covers this overlap.

## What would close this

1. Confirm or rule out 489 as the cause (render at 7rem and at 11rem).
2. A layout fix so the sub-line does not overlap Source at 375, 653, 768 and
   1280px, preferably with a layout-gate assertion for it.
3. Fork commit, re-pin, `pnpm verify` rc=0, a real layout gate run, and a
   gate-visual pass on a re-capture of `feral-worn1-table-on`.
