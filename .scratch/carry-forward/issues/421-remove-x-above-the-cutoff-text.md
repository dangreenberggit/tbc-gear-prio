Status: open
Type: bug
Origin: owner report, 2026-09-18 (viewing the running tab, post-run)
Blocks: none
Blocked by: none
Related: 312 (results header area)

# Remove the "Upgrades — X above the cutoff" text

Owner report on the Upgrades tab. The results header shows "Upgrades" followed by
"X above the cutoff" (e.g. "1 above the cutoff"). The owner: this text serves no
purpose and should be removed.

## What would close this

- The "X above the cutoff" line/label no longer renders above the results table.
- The "N item(s) below the cutoff" collapsible footer is a separate element — this
  ticket is only the "above the cutoff" count in the results header. Confirm with
  the owner if the below-cutoff footer should also change; default is leave it.

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
(the results-header / "Upgrades" heading area where the above-cutoff count
renders) and any related string in `translation.json`.

## Notes

New from the owner's sign-off pass, 2026-09-18. Small, mechanical.
