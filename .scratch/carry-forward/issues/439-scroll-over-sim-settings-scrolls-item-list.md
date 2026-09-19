Status: open
Type: bug
Origin: owner viewing session, 2026-09-19
Blocks: none
Blocked by: none
Related: the post-run tab layout (results/settings panels)

# After a run, scrolling over the sim settings scrolls the item list instead

Owner report from the 2026-09-19 viewing session. After a sim run completes, if
you put the cursor over the **sim settings** area (the run-settings / left
controls panel) and scroll, the scroll goes to the **sim's item/results list**
instead of scrolling the settings panel under the cursor. The wrong element
captures the wheel event / owns the scroll.

Likely an overflow-containment or scroll-target issue in the post-run layout:
the settings panel either isn't the scroll container it should be, or the
results list is capturing wheel events that originate over the settings, or
`overscroll-behavior`/`overflow` is set such that scroll chains to the results
list.

## What would close this

- After a run, scrolling with the cursor over the sim-settings panel scrolls
  THAT panel (or does nothing if it doesn't overflow), NOT the results/item
  list. Verify live post-run: hover the settings, scroll, confirm the settings
  panel moves and the results list does not.

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx` and
`ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss` — the post-run
grid/panel layout, the settings panel's `overflow`/scroll container, and any
`overscroll-behavior` on the results list. Check which element is the actual
scroll container at post-run widths.

## Notes

New from the owner's 2026-09-19 viewing session. A layout/scroll bug on the tab
surface — a natural fit for the next tab stage alongside the Sources/Sim-sets
design work (438) and the error-message fix (437), and exactly the kind of thing
the approved automated visual review should eventually cover.
