Status: open
Type: task
Origin: owner review of the 472 render (screenshot .scratch/handoffs/owner-screens/2026-09-22-upgrades-header-glitch.png), 2026-09-22
Blocks: none
Blocked by: none
Related: 472, 481, 470, 474

# Results area typography consistency

Owner: "it looks sloppy, the text sizes and styling all over the place
look iffy"; the "BiS only" checkbox with the tiny "Phase 3 (2.2 - T6) list"
text under it "is weird".

## What would close this

- One documented type scale for the results area (heading/tab labels, row
  name 1.125rem, secondary cells one size, badges one size, status lines
  one size) applied in `_upgrades_tab.scss`.
- The BiS-only sub-caption moved into the checkbox's tooltip (owner to
  confirm; alternative: drop it).
- A before/after `pnpm tab-review` capture pair for the owner.
- Re-pin.

Pointers: `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`,
`vendor/tbc-new-fork/ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss`.
