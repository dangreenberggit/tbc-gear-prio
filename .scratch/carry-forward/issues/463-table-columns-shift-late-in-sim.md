Status: open
Type: bug
Origin: owner viewing session, 2026-09-20
Blocks: none
Blocked by: none
Related: layout gate (test-layout.mjs asserts column geometry post-run, not mid-run)

# Table layout breaks late in a sim — columns shift horizontally

Owner report, 2026-09-20. While simming, toward the end of the run the results
table layout sort of breaks: some columns shift horizontally, pushed too far to
both sides (at least two columns pushed too far right).

## What would close this

- The table columns stay put through the whole run — no horizontal shift as rows
  land near the end of the sim.
- Likely a column-width reflow as late rows arrive (a wide cell value, a badge,
  or a scrollbar appearing changing the available width). Reproduce mid-run,
  identify which cells drive the shift, and pin the column widths so the layout
  is stable during streaming.
- The layout gate measures the settled post-run table; this is a *mid-run*
  transient, so it needs a live reproduction on the Go backend to see.

## Notes

Possibly related to whatever makes the results table width elastic during
streaming. Worth checking whether a fixed table layout / reserved column widths
fixes it without hurting the settled layout the gate asserts.
