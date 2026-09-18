Status: open
Type: bug
Origin: owner report, 2026-09-18 (viewing the running tab, mobile/narrow width)
Blocks: none
Blocked by: none
Related: 327 (results-table legibility below 768px, resolved for char-stacking), 310 (narrow overflow, resolved)

# Mobile results table: misaligned columns and BiS tag crowding

Owner report viewing the Upgrades results table at mobile/narrow width. The
char-by-char letter-stacking that ticket 327 fixed is gone (327 approved), but two
distinct narrow-width problems remain:

1. **Column alignment is a mess.** The table columns (Rank / Item / Slot / DPS /
   Source) do not have consistent horizontal alignment — the labels and cell
   contents don't line up down each column, so the table "looks like a mess" at
   narrow width.
2. **BiS tag crowds the text above it.** The "★ BiS" tag under an item name sits
   too close to the text above it — needs vertical spacing so it doesn't crowd.

See owner screenshots (2026-09-18): the ranked rows (e.g. Thunderheart Leggings
with its "★ BiS" tag and set-bonus lines, Shady Dealer's Pantaloons) show the
columns not aligning cleanly.

## What would close this

- At mobile/narrow widths (375–767px), each column's header and its cell contents
  share a consistent horizontal alignment down the column; the table reads as an
  aligned grid, not a jumble.
- The "★ BiS" tag has adequate spacing from the item text above it.
- Verify by direct observation at 375 / 653 / 767 px (and confirm desktop width is
  unaffected). Extend `test-layout.mjs` with an alignment assertion if practical
  so the layout gate catches a regression.

## Where

`vendor/tbc-new-fork/ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss`
(the narrow-width results-table rules and the BiS-tag spacing) and the results
markup in `upgrades_tab.tsx`. Same tab-surface family as 327/310. Use wowsims'
native table alignment idiom (the Bulk tab is the closest sibling) per the owner's
standing "borrow native styling" direction.

## Notes

New from the owner's sign-off pass, 2026-09-18. This is the spinoff from 327: 327's
char-stacking defect is resolved/approved; these are the residual alignment and
spacing issues, tracked here so 327 can close cleanly.
