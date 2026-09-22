Status: open
Type: bug
Origin: owner review of the 472 render, 2026-09-22
Blocks: none
Blocked by: none
Related: 472

# Results table overflows its container at 1280px

Since 472 added the Favorite and Batch-sim columns, the results table is
wider than the space it has on the page at a 1280-px window (measured live
2026-09-22: table 642 px / 753 px in a 606-px container for the shortlist /
below-cutoff tables). Effect: a horizontal scrollbar, and long item names in
the shortlist wrap onto 2-3 lines.

Source is the widest column. Candidate fix: cap/shrink the Source column
(e.g. narrower `td:nth-child(5)`, allow wrapping at spaces — it already
wraps at spaces per 468) and/or tighten the action cells; measure row
heights before/after so rows do not grow tall instead (a measurement is
being taken by an investigator and will be appended as a comment).

Pointers: `vendor/tbc-new-fork/ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss`
(`.upgrades-results` has `overflow-x: auto` at every width since fork
162a907df; column rules `td:nth-child(n)` ~:861-883, 957-980),
`.upgrades-action-cell`.

## What would close this

At 1280 the shortlist table fits its container without a horizontal
scrollbar, item names stay on one line where they did before 472, row
height does not exceed the layout gate's limit, `python
scripts/check_layout_gate.py` failed:0, re-pin.
