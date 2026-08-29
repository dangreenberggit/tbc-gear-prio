Status: open
Type: bug
Origin: owner report, 2026-08-28 (third time raised)
Blocks: none
Blocked by: none

# Upgrades results table is illegible below 768px

Owner report, viewing a Feral Cat druid at ~653px: text in the results table
cells **goes vertical** (slot labels "Legs"/"Waist" render as stacked single
characters; "+58.7 DPS" breaks across several lines), some text is **cut off /
disappears**, and there are **huge vertical gaps** between rows despite the
cramped text. Owner: "basically a 0.5/10 on CSS fundamentals."

**This is the third time results-table legibility has been raised.** The layout
gate ticket 322 shipped (`test-layout.mjs`) passed without catching it because it
asserted structure (viewport overflow, control-group order, sticky, grid-column)
and **not cell legibility** — see ticket 329.

## Owner direction

Use **wowsims' native styling presumptively** — study how wowsims styles its own
results tables (the Bulk tab is the closest sibling) and reuse those patterns
rather than the from-scratch `.upgrades-*` SCSS. This takes research and direct
observation of the rendered result per component, not a code-only pass. The break
is **below 768px**; verify the fix there (375 / 653 / 767) and at a desktop width.

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/_upgrades_tab.scss`
(and shared `_sim_tab.scss`); the results/shopping-list markup in
`upgrades_tab.tsx`. A diagnosis pass (2026-08-28) maps each defect to its
selector+property; the fix reuses native table styling. The environment CAN
drive narrow widths now (the browser pane's `resize_window` works this session),
so the fix must be verified by direct observation, not asserted.
