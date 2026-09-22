Status: open
Type: task
Origin: owner review of the 472 render (screenshot .scratch/handoffs/owner-screens/2026-09-22-upgrades-header-glitch.png), 2026-09-22
Blocks: none
Blocked by: none
Related: 472, 481, 474

# Item name to tag spacing

Owner: "we probably need another pixel or so between the text of the item
name and the tags", and the tags "are so close that they're mushed into
each other".

## What would close this

- A small gap (2-4 px) between `.upgrades-item-name` and
  `.upgrades-item-tags`.
- Horizontal gap between adjacent badges, plus padding inside the pills so
  text does not touch the pill edge.
- Same treatment in the provisional and settled tables.
- Row height stays under the gate limit.
- Re-pin.

Pointers: `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`,
`vendor/tbc-new-fork/ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss`.
