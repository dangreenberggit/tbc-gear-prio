Status: open
Type: task
Origin: owner review of the 472 render (screenshot .scratch/handoffs/owner-screens/2026-09-22-upgrades-header-glitch.png), 2026-09-22
Blocks: none
Blocked by: none
Related: 472, 481

# Per-table scroll host and shared column widths

Owner: the horizontal scrollbar must sit directly under each table, not
under the whole results area. Today `overflow-x: auto` is on
`.upgrades-results`, the container around the shortlist, the "below the
cutoff" section, and the JSON export, since fork 162a907df.

Owner also asked why the below-cutoff table looks different: it is a
separate `<table>` that sizes its own columns from its own (longer)
content, so the two never line up (measured 2026-09-22: 627 vs 676 px in a
627-px container, using the 481 V3 styles).

## What would close this

- Each `.upgrades-results-table` wrapped in its own scroll host.
- Both settled tables (and the provisional one) share one fixed
  column-width scheme so columns align.
- Slot column narrower (owner: "a bit too wide, unnecessarily" — Slot text
  like "Trinket 2" needs about 5.5rem; today min-content wins because it is
  nowrap).
- Source capped (481 measured 7rem fits the shortlist).
- The table's right edge extends to the line under the slot tabs (owner:
  "get a bit more width to the right ... closer to the settings area, like
  where the horizontal line under the item slot tabs is, and then maybe
  that line a teensy bit longer").
- At 1280 no table overflows.
- Layout gate failed:0.
- Re-pin.

Note: 481's measurements apply to this ticket. Close 481 as superseded
when this lands.

Pointers: `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`,
`vendor/tbc-new-fork/ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss`.
