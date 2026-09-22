Status: open
Type: bug
Origin: owner review of the 472 render (screenshot .scratch/handoffs/owner-screens/2026-09-22-upgrades-header-glitch.png), 2026-09-22
Blocks: none
Blocked by: none
Related: 472, 481, 470

# View options heading clipped

In the owner's screenshot the "View options" heading is partly hidden: the
text reads "Vi..." with a horizontal line drawn across it, and the rest of
the row (Set potential / BiS only) sits slightly higher than the heading.
Likely the sticky/toolbar border or the 470 divider overlapping the
heading at that width; needs reproduction (window about 1070 px wide per
the screenshot).

## What would close this

- Heading fully visible at every width from 375 to 1600.
- Layout gate green.
- Re-pin.

Pointers: `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`,
`vendor/tbc-new-fork/ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss`.
