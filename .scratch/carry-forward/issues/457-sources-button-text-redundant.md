Status: closed
Type: task
Origin: owner viewing session, 2026-09-20
Blocks: none
Blocked by: none
Related: 447 (the Sources popup), 458 (Sources modal overlap)
Resolution: Fixed in fork commit 7cc65f572 (re-pin da82e4c4). settings.sources_button
  now reads "Select item sources" (value-only). Verified live in the tab-review capture.

# "Sources…" button text looks redundant

Owner report, 2026-09-20. The "Sources…" button label reads as redundant.

## What would close this

- Reword to something clearer, e.g. "Select item sources".
- String is `upgrades_tab.settings.sources_button`; update locale (no schema
  change — value only).
