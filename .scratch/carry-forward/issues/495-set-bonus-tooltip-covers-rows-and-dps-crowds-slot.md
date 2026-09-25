Status: closed
Type: bug
Origin: stage-gate upgrades-tab-closeout round 2b (owner review of the round-1 Mantle of Malorne capture, 2026-09-24)
Blocks: none
Blocked by: none
Related: 493, 494

# Set-bonus tooltip covers neighbouring rows; DPS figure crowds Slot

Two layout problems the owner's review of the round-1 Mantle of Malorne
capture showed, outside round 2b's tickets:

1. The DPS-cell tooltip opens above the row and covers the one or two
   rows above it, including their item names and Source text. Seen on
   every round 2b tooltip capture, for example
   `.scratch/stage-gate/upgrades-tab-closeout/round-2b/feral-worn2-tip-BreastplateofMalorne-on.png`
   (gitignored). This is tippy's default top placement; whether a side
   placement or a smaller offset is better is untested.
2. The DPS figure sits right against the Slot text ("Shoulder -94.8 DPS"
   in the round-1 capture). DPS and Slot both drop their inner padding
   (`_upgrades_tab.scss`, "Rank and DPS drop their own horizontal
   padding"), so the gap is the width left over in the 5.5rem columns.

## What would close this

1. A placement for the tooltip that does not hide the rows a reader is
   comparing, or an owner decision that the cover is acceptable.
2. A minimum gap between Slot and DPS text, ideally asserted by the
   layout gate.
3. Fork commit, re-pin, `pnpm verify` rc=0, a real layout gate run, a
   gate-visual pass.

## Comments

**2026-09-25, round 2c: closed.** Owner answer (checkpoint 2): open the hover
to the right of the figure when it fits, and above it otherwise. Built:
tippy `placement: 'right'` with the flip fallback set to `top` (Popper's own
fallback would pick `left`). Measured on the fixtures: 465–507px of room at
1280, 165–207px at 768. At 1280 the hover opens right and covers the Source
text and row buttons, never a DPS figure; at 768 it opens above. The gap
half of this ticket (DPS crowding Slot) is fixed with 499: Slot text to the
figure is at least 19.0px, and to a set row's "set detail" line at least
19.9px, on all five fixtures at 768 and 1280 (it was 2.4px). Gate assertions
(13) and (15) check both in the fixture pass: `(13) Slot-to-DPS gap >= 8px:
338 figures (min 19.2px), 16 set-bonus lines (min 19.9px) checked`, and
`(15) hover on "Thunderheart Leggings" ... opened right as expected` at 1280
and `opened top as expected` at 768, 653 and 375.
Fork `7ed8c99410ac836443c2e07ede9790f5439467d5`, re-pinned in main
`f6bc9087`. `pnpm verify` rc=0. Layout gate (real run on this source):
`{"outcome":"measured","passed":121,"failed":0,"a11yFailed":0,"a11yWarned":26}`.
Visual pass: gate-visual, pass, handoff
`.scratch/handoffs/visual-review-round-2c.md`.
