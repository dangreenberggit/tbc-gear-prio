Status: closed
Type: task
Origin: owner viewing session, 2026-09-20
Blocks: none
Blocked by: none
Related: 453 (same panel, layout cluster)
Resolution: Fixed in fork commit 7cc65f572 (re-pin da82e4c4), corrected in
  af421fa53 (re-pin 348a380c). #upgrades-tab .upgrades-tab-right is flex:1.5 at
  xl and up; the id scope is needed to outrank the shared
  .tab-pane-content-container .tab-panel-right (two-class) rule. Verified live:
  the right panel is 27.3% of the content row at 1280 and 1536 (was ~24%), and
  stacks full-width at 375 with no horizontal scroll (live-verify 5a; tab-review).

# Settings panel should probably be a tiny bit wider

Owner report, 2026-09-20. The sim-settings panel feels a touch narrow; a small
width bump would read better.

## What would close this

- Widen the settings panel a little (owner-taste on the exact amount). Keep it
  within the tab's grid/breakpoint scheme; don't break the narrow-width stack.
- Verify live at desktop and mobile widths — no horizontal overflow, still
  stacks correctly below xl.
