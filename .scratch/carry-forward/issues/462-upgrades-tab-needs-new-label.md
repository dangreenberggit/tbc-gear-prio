Status: closed
Type: task
Origin: owner viewing session, 2026-09-20
Blocks: none
Blocked by: none
Related: 461 (explanation section), Batch tab as reference
Resolution: Fixed in fork commit 7cc65f572 (re-pin da82e4c4). upgrades_tab.title
  is now "Upgrades (<span class=\"text-success\">New</span>)", mirroring
  bulk_tab.title; SimTab.buildNavItem interpolates it raw into the nav innerHTML.
  Verified live: the nav reads "Upgrades (New)" with a green "New" (live-verify;
  tab-review navText / navNewSpan facts).

# Upgrades tab needs a "(New)" label like the Batch tab has

Owner report, 2026-09-20. The Upgrades tab's nav label should carry a "(New)"
marker the same way the Batch tab's label does.

## What would close this

- Add the "(New)" treatment to the Upgrades tab nav label, matching how the
  Batch tab does it (same markup/styling/idiom).
- Find the Batch tab's "(New)" label source and mirror it for the Upgrades tab.
