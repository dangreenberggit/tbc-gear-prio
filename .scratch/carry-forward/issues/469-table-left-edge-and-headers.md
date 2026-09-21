Status: closed
Type: task
Origin: owner walkthrough, Upgrades-tab UI pass, 2026-09-20
Blocks: none
Blocked by: none

# Table starts too far right; headers not aligned

Two problems in the results table:

- Left offset: the table wrapper carried the shared `.p-gap` class (padding-left
  1.5rem), which the controls above it lack. Owner wanted the table flush with
  the controls. Fix: cancel the left padding on `.upgrades-shopping-list` and
  `.upgrades-slot-pane` only.
- Header alignment: on desktop, the sort-button padding didn't match the body
  cell padding, and the DPS header lacked right-alignment. The fixes for both
  already existed in the mobile CSS block; desktop counterparts were missing
  and were added.

Verified flush alignment and numeric header alignment
(`getBoundingClientRect`) both visually and by measurement, in both desktop
and mobile states, with mobile unregressed.

Fork commit `07099cb1e`. Main-repo pin commit `8acc6b96`. `pnpm verify` green.

## Comments

2026-09-21: filed retroactively; number was used in the re-pin commit before the file existed.
