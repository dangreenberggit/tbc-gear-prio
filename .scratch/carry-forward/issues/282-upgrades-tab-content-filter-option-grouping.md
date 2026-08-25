Status: closed (2026-08-24, fork commit e565d4a67 on feat/upgrades-tab —
labelled optgroups driven by the engine's ZONELESS_SOURCE_LABELS split;
option conservation proven against the old flat list. Review also confirmed
a pre-existing selection-wipe bug, filed as ticket 285.)
Type: deferred feature
Origin: stage-gate `upgrades-ui-pass`, deferral decision, 2026-08-23
Blocks: none
Blocked by: none

# The Upgrades tab content filter lists zones and non-zones in one flat list

Deferred deliberately from the `upgrades-ui-pass` work.

The content filter is one flat `<select>`. Measured on a served ret run, its
options are:

    All, Gruul's Lair, Serpentshrine Cavern, Tempest Keep, Karazhan,
    World Bosses, Magtheridon's Lair, Source not recorded, PvP vendor,
    Crafted, Reputation vendor, Badge vendor, World drop

Two different kinds of thing in one list. The first group is raid zones; the
rest are the zoneless buckets — vendors, crafting, world drops, and the
"source not recorded" catch-all. They read as peers and are not.

`<optgroup>` is the obvious fix and needs no new machinery. The engine's
`raidFilterOptions` already knows which bucket each option came from, since
`ZONELESS_SOURCE_LABELS` is a distinct set from the zone names.

## Why it was deferred

Scope, and it is the least costly of the three deferrals to pick up later.
Nothing is unreachable today — every row is reachable under exactly one
option, which was the property the filter was built to guarantee.

## Done when

- Zones and zoneless buckets sit under labelled `<optgroup>`s.
- The grouping is derived from what the engine already distinguishes, not from
  a second hardcoded list of zone names in the UI.
- The existing value-preservation behaviour across re-runs still holds.
