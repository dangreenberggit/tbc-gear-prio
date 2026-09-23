Status: open
Type: task
Origin: owner live look at the 483-488 polish arc, 2026-09-22
Blocks: none
Blocked by: none
Related: 483, 481, 468

# Widen the Source column cap so rows are not four lines tall

Owner ruling, 2026-09-22: "Wider source cap is fine. There's no point having
only a one or two line long item name if the source makes it four lines."

483 fixed the shared column scheme at Rank 2.5rem / Slot 5.5rem / DPS 5.5rem
/ Source 7rem (wrapping at spaces) / two 2rem action cells / Item = remainder
(fork 86981ed30, `resultsColgroup()` in `upgrades_tab.tsx`, rules in
`_upgrades_tab.scss`). At 7rem, long sources such as "Serpentshrine Cavern
(N) Fathom-Lord Karathress" wrap to four lines and the row grows to ~119 px
while the Item column sits at ~306 px with room to spare.

## What would close this

- Source cap raised (try 10-11rem) and Item's share reduced accordingly, so
  the longest Source in the feralcat phase-3 pool takes at most two lines at
  1280 while item names still fit on one or two lines.
- Measured with `pnpm tab-review` `rect:` facts on the Source cell and the
  row (row height should drop from ~119 px toward the 73-84 px of untagged
  rows) — 481's Comments hold the earlier measurements and method.
- Both settled tables and the provisional table still share the one colgroup
  and still fit their scroll hosts at 1280 (no horizontal scrollbar).
- `python scripts/check_layout_gate.py` failed:0 a11yFailed:0; re-pin;
  `pnpm verify` rc=0.
