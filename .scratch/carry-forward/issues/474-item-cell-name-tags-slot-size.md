Status: open
Type: task
Origin: owner walkthrough of the 472 render, 2026-09-22
Blocks: none
Blocked by: none
Related: 472

# Item cell: name/tag spacing during and after simming, slot text too large

Owner report on the 472 render: during simming the BiS/set pill tags wrap
under the name; after the run the tags sit too close to the name ("not
enough space between the text and words"). Slot column text is "definitely
too big".

Owner's preferred layout: name on the first line, tags directly under the
name, and both name and tags sit beside the (now 3rem) icon.

## What would close this

Item cell renders icon left, then a stacked name-over-tags block, with
consistent spacing in provisional and settled tables; slot text sized down
(match the Gear list's secondary text scale); layout gate green; visual
check at 1280 and 375; re-pin.

Pointers: `itemCell` in `upgrades_tab.tsx` (~:3375), provisional item-cell
rules `_upgrades_tab.scss` ~:1027-1110, slot column `td:nth-child(3)` rules.

Preserve 468 (name wrap during simming) and 469 (header alignment).
