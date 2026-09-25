Status: open
Type: bug
Origin: gate-visual seat, stage-gate upgrades-tab-closeout round 2b Step 9 (2026-09-24)
Blocks: none
Blocked by: none
Related: 493, 495

# DPS figures of 100+ and the focus outline overrun the DPS cell

Two advisory findings from the round 2b visual review
(`.scratch/handoffs/visual-review-467-round-2b.md`):

1. With "Set potential" ON, figures of 100 DPS or more ("+220.3 DPS") are
   wider than the 77px DPS cell (5.5rem at ≥ md). They run about 8–12px
   into the Source column and leave about a 3px gap to the Source text;
   nothing overlaps. The 8–12px and 3px are the seat's estimates from
   enlarged crops, not page measurements. Captures (gitignored):
   `.scratch/stage-gate/upgrades-tab-closeout/round-2b/feral-worn0-table-on.png`
   rows 1–4, `feral-worn1-table-on.png` row 1. Layout assertion (7) did not
   fail on it; whether that is because no such row lands in the gate's run
   is untested.
2. While the tooltip is open, the outline drawn around the focused DPS cell
   crosses the figure's sign, the "S" of "DPS" and the last letter of "set
   detail": `feral-worn1-tip-Thunderheart-on.png`,
   `feral-p2-tip-Thunderheart-on.png`.

The sub-line fix of 493 ("set detail" ends exactly on the cell edge) leaves
no room for a longer string either.

## What would close this

1. A measured width for the widest DPS figure the ranking can show, and a
   DPS column or figure format that fits it (watch the Item truncation
   price, ticket 489).
2. A focus style that does not draw over the cell's text.
3. A layout-gate assertion over every DPS cell, like (11) for sub-lines.

## Comments

- 2026-09-24: Round 2c's first real fixture gate run (fork bcbb5e741,
  fixture feral-p3-p2bis) failed assertion (6) at 768 and 1280. The Slot
  label "Main Hand" wraps to two lines in the 5.5rem Slot column (content
  height 31.3 > 1.5× line-height 15.3). This is an existing defect; the
  new fixture pass exposed it because the live ret sample never had a
  Main Hand row. It is tied to 499's DPS-column fix: dropping " DPS" from
  the figure frees width that could go to Slot.
