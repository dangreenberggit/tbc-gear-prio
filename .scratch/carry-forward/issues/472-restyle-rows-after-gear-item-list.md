Status: open
Type: task
Origin: owner walkthrough, Upgrades-tab UI pass, 2026-09-20
Blocks: none
Blocked by: none
Related: 468, 469, 470, 471

# Restyle Upgrades results rows after the Gear tab's item-select list

Owner's intent, verbatim:

> line up styling of the [Upgrades results] table to potentially model the
> rows after the rows in the gear tab's item select table (and include the
> "add to favorites" and "add to batch sim" features that are in that table).
> this will be tough and will require some visual checks by subagents to look
> at both.

## Decisions made with the owner, 2026-09-21

- **Option A**: keep the Upgrades results `<table>` element; adopt the Gear
  tab item list's visual idioms on top of it — 3rem icon, larger name, zebra
  striping, hover background, spacing.
- Add favorite-star and add-to-batch-sim columns to the Upgrades rows.
- Extract the Gear list's private favorite/batch toggle logic
  (`ui/core/components/gear_picker/item_list.tsx:510-597`) into a shared
  module used by both tables, rather than duplicating it.
- Keep rank order as-is — do NOT sort favorites first.
- No edits under `upgrades/engine/`. `RankedItem` already carries `itemId`;
  favorites need only an id via `sim.getFilters()`, batch needs
  `ItemSpec.create({id})` plus `simUI.bt`.
- New icon-only buttons need aria-labels.
- Verify with a real side-by-side render of both tables, not a source-only
  comparison.

To be executed via the `stage-gate` skill, slug `upgrades-rowstyle`.

## What would close this

Both tables render from shared toggle code and shared row styles; the owner
accepts a side-by-side render; `pnpm verify` is green; the fork is re-pinned.
