Status: closed
Type: bug
Origin: owner viewing session, 2026-09-20
Blocks: none
Blocked by: none
Related: layout gate (test-layout.mjs asserts column geometry post-run, not mid-run)
Resolution: Reproduced live (feral, prune off, 1280): the mid-run provisional
  table used table-layout:auto, so a late row with a longer item name widened the
  Item column and shoved the columns after it ~65px between 11 and 98 landed rows
  (did not reproduce on ret in one attempt; reproduced on feral). Fixed in fork
  commit 85f0a545e (re-pin 80fc19f9), column widths + overflow tuned in af421fa53
  (re-pin 348a380c): the provisional table only is pinned to table-layout:fixed
  with a <colgroup> and width:100%, and long cell content wraps
  (overflow-wrap:anywhere). Re-measured live: 0px column movement across 12/131/244
  rows, no overflow. The settled table stays table-layout:auto, so the layout gate
  (which measures the settled table) is unaffected — it passes 53 assertions
  (live-verify Step 9).

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
