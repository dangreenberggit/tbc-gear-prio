Status: open
Type: bug
Origin: pre-merge-review adversarial axis (round 2), feat/tab-signoff-followups, 2026-09-18
Blocks: none
Blocked by: none
Related: 431 (DPS-cell tooltip), 429 (chip count tooltip), 420 (the view-toggle tooltip)

# Upgrades tab creates tippy instances per render without destroying them

Adversarial finding (minor) from the round-2 review. The tab attaches tippy
tooltips per render — the DPS-cell breakdown (`upgrades_tab.tsx:2546`,
`tippy(dpsCellRef.value!, …)`) and the set chips (`:1925`, `tippy(chip, …)`) —
but `renderSubTabs` (`:1992`) discards the old cells with
`resultsElem.replaceChildren(...)` and `refreshSetChips` rebuilds the chips,
neither ever calling `.destroy()` on the prior tippy instances. On a completed
ranking, repeatedly clicking a sort header or a view toggle (each fires
`render()` → `renderSubTabs`) accumulates one orphaned tippy per set-bonus row
per re-render.

Bounded by GC (tippy keys off the element's own `_tippy`, so the detached node +
instance become collectible), so it is transient accumulation, not an unbounded
leak — and it matches the file's pre-existing no-destroy pattern rather than
being a regression this diff introduced. But the rest of the codebase does clean
up (`grep -rc '.destroy()' ui/core/components` → 26 uses), so the tab is the
outlier.

## What would close this

- The tab destroys the tippy instances it created before rebuilding the elements
  that host them (track them and `.destroy()` in the rebuild path, or attach via
  a delegated/one-per-container tippy rather than one-per-cell).
- Verify: after N sort/toggle re-renders on a done ranking, the number of live
  tippy instances rooted in the results host does not grow with N.

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
(the `tippy(...)` calls at ~1925 and ~2546, the `renderSubTabs`/`refreshSetChips`
rebuild paths). Note the mid-run high-churn path is already safe: it passes
`noiseFloorDps === undefined`, so no cell tippy is created.

## Notes

Minor, deferred from the round-2 pre-merge review (not merge-blocking — bounded
by GC, pre-existing pattern). Worth fixing with the other tippy usages so the tab
matches the codebase's cleanup discipline.
