Status: closed
Type: task
Origin: owner walkthrough, Upgrades-tab UI pass, 2026-09-20
Blocks: none
Blocked by: none

# Cramped item names during simming

The provisional results table (`landedRowsTable`) forced `table-layout: fixed`
with a `<colgroup>` giving the Item column only 30% width. Item names starved
for space and broke mid-word while a sim was running.

Fix: the item cell now wraps properly — the name sits on its own full-width
first line (single line, ellipsis, title attribute for the full text), badges
and "(Owned)" wrap below at full width, and the Source cell opts out of
`overflow-wrap: anywhere` so it wraps at spaces instead of mid-word. The
colgroup was rebalanced to 9/38/15/18/20.

Fork commit `55333be88`. Main-repo pin commit `2d7019f2`.
`pnpm sim-implemented-effects:generate` and `pnpm verify` both green (rc=0,
1350 gates). Owner accepted the render.

## Comments

2026-09-21: filed retroactively; number was used in the re-pin commit before the file existed.
