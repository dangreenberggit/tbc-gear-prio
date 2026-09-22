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

## Comments

2026-09-22 measurement (live :5173, 1280x900, styles injected in-browser, no
file edits; container 605.8 px; row-height gate ~147 px never exceeded):

| Variant | Shortlist width | Below-cutoff width | Max row h |
| --- | --- | --- | --- |
| baseline | 642.4 (over by 37) | 752.5 (over by 147) | 101.5 |
| V1 Source max 9rem | 642.4 | 745.8 | 101.5 |
| V2 Source max 7rem | 629.5 | 717.8 | 119 |
| V3 = V2 + action cells 2rem (needs `!important` over the shipped rule) | 605.8 FITS | 675.8 (over by 70) | 119 |
| V4 = V3 + Slot width 5.5rem | no change: Slot text is nowrap, min-content wins | | |

Longest Source ("Serpentshrine Cavern (N) Fathom-Lord Karathress") goes from
5 to 6 lines under V2/V3. Recommendation: V3 for the shortlist; the
below-cutoff table still needs ~70 px more, most plausibly `white-space:
normal` on Slot or a narrower Item column. Shortlist sample was 2 rows.
