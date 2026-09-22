Status: open
Type: bug
Origin: owner review of the 472 render, 2026-09-22
Blocks: none
Blocked by: none
Related: 472

# Favorite click marks the ranking stale

Clicking the star on a results row greys out the whole results table with
"settings changed since this ranking" and re-enables Simulate, exactly as a
sim-setting change does.

Cause: favorites are stored in `sim` filters (`sim.setFilters` →
`filtersChangeEmitter` → `settingsChangeEmitter` → `sim.changeEmitter`, fork
`ui/core/sim.ts` ~:202-217, 1006-1017) and the tab's `markStale` listens on
`sim.changeEmitter` (`upgrades_tab.tsx` ~:1350-1362). Favoriting changes no
DPS, so the stale marking is wrong.

The 472 plan listed this as pre-existing Gear-modal behaviour and out of
scope; the owner (2026-09-22) rules it a bug. Note the same mechanism also
rebuilds the rows (render() → renderSubTabs at ~:1790), which is why the
toggle module keeps a tab-level refresh.

## What would close this

A favorite/filters change no longer marks the ranking stale nor re-enables
Simulate (e.g. subscribe `markStale` to the emitters that feed the ranking
inputs rather than to `sim.changeEmitter`, or ignore
`filtersChangeEmitter`-originated changes), the star still repaints across
tabs, no engine edits, live-verified on :5173, re-pin.

Also confirm whether other filter changes (item source filters in the Gear
picker) should mark stale — they may legitimately change the candidate
pool; say so in the fix.
