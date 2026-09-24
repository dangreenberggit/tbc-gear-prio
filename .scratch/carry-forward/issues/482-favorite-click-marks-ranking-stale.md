Status: closed
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

## Comments

**2026-09-24 — closed (stage-gate upgrades-tab-closeout round 1).**
Fork `d6fd2f6856833d56c52d0a1551f60aac8e286466`, main re-pin
`f14f33d7d1c63fd23e0ee0bbb18cdc3e4d639b69`. `pnpm verify` rc=0. Layout
gate: real run, `passed:53 failed:0 a11yFailed:0` (a11yWarned 28). No
engine file, `sim.ts` or `item_toggles.tsx` edit.

The fix: `wireStalenessListeners` in `upgrades_tab.tsx` no longer
subscribes `markStale` to `sim.changeEmitter`. It builds one tab-local
`TypedEvent.onAny([...])` (so one event id still runs `markStale` once)
over `sim.iterationsChangeEmitter`, `phaseChangeEmitter`,
`fixedRngSeedChangeEmitter`, `showDamageMetricsChangeEmitter`,
`showThreatMetricsChangeEmitter`, `showHealingMetricsChangeEmitter`,
`showExperimentalChangeEmitter`, `wasmConcurrencyChangeEmitter`,
`showQuickSwapChangeEmitter`, `showEPValuesChangeEmitter`,
`languageChangeEmitter`, `sim.raid.changeEmitter` and
`sim.encounter.changeEmitter`: every member of `sim.ts`'s
`settingsChangeEmitter` except `filtersChangeEmitter`, plus raid and
encounter. Gear, talents and the tab's own `settingsChangedEmitter`
listener are unchanged. The code comment says the list must follow
`sim.ts` if a member is added there.

**Do other filter changes mark stale? No, and they should not.** The
Upgrades pool never reads the sim's `DatabaseFilters`, so neither a
favorite nor a Gear-picker item-source filter can change a result.
Command, from `vendor/tbc-new-fork/ui/core/components/individual_sim_ui`:

    grep -rnE "getFilters|DatabaseFilters|filtersChangeEmitter|\.filters\b|favoriteItems|favoriteGems|favoriteRandomSuffixes|favoriteReforges|favoriteEnchants|sourceFilter|raidFilter|minIlvl|factionRestriction|filterItems|getItems\(" upgrades_tab.tsx upgrades/

Output (fork 5d84ffff9, before the edit):

    upgrades_tab.tsx:1389:		this.simUI.sim.filtersChangeEmitter.on(refresh);
    upgrades_tab.tsx:2020:	 * `raidFilterGroups` makes over ranked rows, but computed over `poolFor`
    upgrades_tab.tsx:2988:			key: { method: 'favoriteItems', id: row.itemId },
    upgrades/engine/view.ts:89:export function raidFilterGroups(items: readonly RankedItem[]): RaidFilterGroup[] {

Line 1389 is the star repaint (`wireToggleRefresh`), 2988 is the star's
own write, and `raidFilterGroups` is the tab's own view grouping, not
the sim filters. So the favorites-stripped compare in the plan was not
needed, and no filter listener was added. The tab's own Sources picker
is a run input and still marks stale through `settingsChangedEmitter`.
This replaces the earlier direction that source filters must keep
marking stale (plan amendment F3).

Live check, browser pane on :5173 with :3333 up, feralcat, phase 3,
capped at 20 candidates ("Took 13s"), fork d6fd2f685 through Vite HMR:

- (a) Star on the first starred row (Madness of the Betrayer, id
  32505): before `far fa-star`, "Add to favorites"; after
  `fas fa-star text-brand`, "Remove from favorites". No
  `.upgrades-status-line.text-warning`, `button.upgrades-run-button`
  disabled = true, 45 rows before and after, the same `<tr>` element.
- (b) Clicked again to un-favorite: star back to `far`, "Add to
  favorites"; no stale line, Simulate still disabled, same 45 rows and
  the same `<tr>`.
- (d) Gear tab, head slot picker, Filters, "Crafting" source unchecked
  then re-checked: after each click no stale line, Simulate disabled,
  45 rows; after the uncheck the first starred row was the same `<tr>`
  (not re-checked after the second click).
- (c) Tab phase picker 3 → 4: the stale line appears ("settings changed
  since this ranking — results may be out of date") and Simulate
  enables (disabled = false). Phase set back to 3 afterwards.
