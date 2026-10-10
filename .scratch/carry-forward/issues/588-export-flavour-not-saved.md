Status: closed
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

## Closing note (2026-10-09, feat/tab-settings-persist, review fix round)

Fork `b2f9293a2`, pinned by this commit's `data/wowsims-fork.lock.json`. The
export panel's token or gear choice moved from `useState` into the tab's
store (`exportFlavour`, `setExportFlavour` in `model/upgrades_store.ts`) and
is saved as an `exportFlavour` field of the same version-1 entry, with no
version bump. An entry without the field, or with a value other than `token`
or `gear`, restores `token`. Tests: `saved_settings.test.ts` "restores the
export panel's token or gear choice in a fresh store (ticket 588)" and
"restores token for an entry saved before the export choice was", and
`ExportPanel.test.tsx` "starts from the choice the page saved, and keeps a new
one in the tab's store"; each failed before the change and passes after.
Live check: the choice came back after a reload
(`.scratch/tab-settings-persist/r2-live-reload.log`, steps 7 and 8).
