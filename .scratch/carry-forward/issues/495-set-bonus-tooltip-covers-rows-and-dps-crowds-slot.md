Status: open
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
