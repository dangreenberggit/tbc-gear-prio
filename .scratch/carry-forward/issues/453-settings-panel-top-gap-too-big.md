Status: open
Type: bug
Origin: owner viewing session, 2026-09-20
Blocks: none
Blocked by: none
Related: tab-signoff-followups layout cluster (454)

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
