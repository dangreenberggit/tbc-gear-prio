Status: closed
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

## Closed

Fixed in fork commit `b781d1b58`, re-pinned at repo commit `aaa0e892` (fork tip
`6c08a6a56`). The non-link Source fallback is wrapped in the same
`<small class="upgrades-source-fallback">` at `--bs-gray-500` as the native
`<a><small>` anchor. Measured pre-fix (live :3333): anchor cell 12.25px muted vs
fallback cell 14px link-white; post-fix both are 12.25px muted. The rendered text
is unchanged, so the desktop-gate golden's Source readback is unaffected (golden
unchanged). verify rc=0.
