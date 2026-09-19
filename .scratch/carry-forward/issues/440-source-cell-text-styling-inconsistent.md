Status: open
Type: bug
Origin: owner viewing session, 2026-09-19
Blocks: none
Blocked by: none
Related: the results-table Source column

# Source column text styling is inconsistent / looks bad

Owner report, 2026-09-19. In the results table, the Source cell text has
inconsistent styling — e.g. a zone with a boss shows "Black Temple (N)" +
"Gurtogg Bloodboil" in one (muted/secondary) style while a plain "Black Temple"
renders in a different (bolder/brighter) style. The mix looks bad; the Source
column should read as one consistent treatment.

## What would close this

- The Source cell uses a consistent text style across all source shapes
  (zone-only, zone + boss, non-raid buckets). Owner eyeballs the results table.

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
(the Source cell render) and `_upgrades_tab.scss`.

## Notes

New from the owner's 2026-09-19 viewing session. Tab-surface cosmetic; next tab
stage.
