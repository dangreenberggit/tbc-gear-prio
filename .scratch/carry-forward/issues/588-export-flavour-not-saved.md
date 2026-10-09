Status: open
Type: task
Origin: docs/reviews/feat-tab-settings-persist.md
Blocks: none
Blocked by: none
Related: 126, 314

# The export panel's token/gear choice does not survive a reload

The owner asked on 2026-10-09: "Tab settings should survive a page reload".
Fork `56c87e6ed` and `c7f739d06` save the run settings, the sort and the two
view toggles. The export panel's flavour choice (token or gear) is still
local React state, `useState<ExportFlavour>('token')`
(`ui/features/upgrades/components/ExportPanel/ExportPanel.tsx:21`), so it
goes back to token on every reload. Found by the Spec axis (SP1).

Done when the flavour is saved in the tab's saved entry like the view
toggles (a new field, no version bump, an old entry restores `token`), with a
test.
