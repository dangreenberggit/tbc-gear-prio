Status: closed
Type: bug
Origin: owner viewing session, 2026-09-20
Blocks: none
Blocked by: none
Related: tab-signoff-followups layout cluster (454)
Resolution: Fixed in fork commit 7cc65f572 (re-pin da82e4c4). #upgrades-tab
  now cancels the shared .tab-pane top padding the way #bulk-tab does, so the
  settings card no longer stacked the pane padding on its own; the left panel
  re-adds the top padding. Verified live at 1280 and 1536 on the Go backend:
  the Upgrades settings card top sits 21px below the header bottom, matching
  the Batch card's 21px (live-verify.md 5a; tab-review facts).

# Vertical gap between the sim-settings panel and the top navbar is too big

Owner report, 2026-09-20. The Upgrades tab leaves a much larger vertical gap
between the top navbar and the settings panel than the Batch tab does, for no
apparent reason.

## What would close this

- The gap above the settings panel matches the Batch tab's (compare the two
  tabs at the same width). Find where the extra top margin/padding comes from
  (likely a tab-local rule on the settings container or its wrapper) and bring
  it in line with the Batch tab.
- Verify live against the Go backend at desktop width, side by side with the
  Batch tab.
