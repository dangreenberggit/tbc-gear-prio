Status: open
Type: feature
Origin: owner request, 2026-09-18 (viewing the running tab)
Blocks: none
Blocked by: none
Related: 312 (the run-settings/filter redesign), 418 (the crafted-profession gate rides on the Crafted source)

# Content source filter should be multi-select checkboxes, not a single dropdown

Owner request, on the Upgrades tab. Today the **Content** control is a single
`<select>` dropdown that picks one value at a time: All, Black Temple, Gruul's
Lair, Tempest Keep, Serpentshrine Cavern, Hyjal Summit, World Bosses,
Karazhan, Magtheridon's Lair, Crafted, Source not recorded, Badge vendor,
Reputation vendor, PvP vendor, World drop.

The owner wants this restructured into **checkboxes** in the sim settings — one
per content source — so a user includes/excludes several sources at once
(e.g. tick Black Temple + Badge vendor + Crafted together) rather than being
limited to one selection or "All".

**This is blocking** — the owner considers it part of the tab being finished.

## What would close this

- The content-source filter is a set of checkboxes (multi-select), not a
  single-select dropdown. A user can tick any combination of sources and the
  ranking considers exactly the ticked sources.
- Placement: in the sim settings / run-settings area (the owner said "in the
  sim settings"), consistent with the other run knobs — confirm exact spot
  with the owner when it lands.
- Default selection preserves today's behaviour (all sources on = the current
  "All"), so an unchanged user sees the same pool.
- Each source maps to the same underlying filter the dropdown used, so the
  ranking result for a given selection matches what the equivalent dropdown
  choice produced.

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
(the `.upgrades-raid-filter` `form-select` and the `raidFilterGroups` /
content-source wiring) and `_upgrades_tab.scss`. Prefer the site's native
multi-checkbox idiom over a hand-rolled group (same "use wowsims' own controls"
direction as 312/328).

## Notes

The **Crafted** source is the hook for ticket 418 (the post-finish
per-profession gate for Bind-on-Pickup crafted items): 418's profession
dropdown is enabled only when the Crafted checkbox from THIS ticket is ticked.
Build 417 so that a per-source companion control (like 418's) can attach to a
checkbox without another restructure.
