Status: closed
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

## Comments

2026-09-22: closed. Root cause: `.sim-header` is sticky (z-index 100) inside the `.sim-ui` scroller; below xl the run-settings card is reordered above the results and once it scrolls past, the View options row sits under the header, whose background/border painted over the heading. Fix (fork d7d55f35a): `scroll-margin-top: var(--sim-header-height)` on `.upgrades-view-controls-host`; settings card stays sticky (gate assertion). Verified by manual scroll sweep at 1070 and tab-review at 1070/1024/1280. Main re-pin ef5c84ac.
