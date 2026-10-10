Status: open
Type: task
Origin: docs/reviews/feat-tab-settings-persist.md
Blocks: none
Blocked by: none
Related: 564, 587

# A phase change downloads the Upgrades tab's data on every spec page, opened or not

Fork `b2f9293a2` (ticket 587) makes a phase change reach the tab's saved
settings even when the tab never opens. To do that, the eager
`ui/app/tabs/UpgradesTabBody.tsx` (`openStoreFor`, lines 17-21, started at
line 56) runs `import('@features/upgrades/hooks/useUpgradesStore')` on any
phase change made before the tab's store exists. That module reaches
`model/follow_phase.ts`, which imports `./data/data` (every spec's
`*.universe.json`, statically) and `./run`. The built chunk
`vendor/tbc-new-fork/dist/tbc/bundle/useUpgradesStore-S9N8_lXr.chunk.js` is
6,317,978 bytes (`ls -la`, built 17:20 on 2026-10-09, after the 17:16 fork
commit); the Adversarial axis measured 756,579 bytes with `gzip -9`
(unverified here). Before 587 this chunk was downloaded only when the tab
opened. The item picker's phase control (`ItemList.tsx:140`) makes this a
common path. The 587 closing note does not mention the cost; a code comment
in `UpgradesTabBody.tsx` does. Found by the Adversarial (A9) and Spec (SP5)
axes, round 2, rated medium.

A spec with no ranking data (not in `SPEC_ID_BY_PROTO_SPEC`, `model/run.ts`,
for example the tank specs) is worse off: `followPhase` returns before
`followPhaseChanges` (`follow_phase.ts:25`), so no follower is ever set. The
first phase change downloads the chunk for nothing, and every later one
appends to `missed` and calls `import()` again (module cache; a list that
grows by one number per change) (`phase_changes.ts:30-34`). A10, low.

Possible directions, each a hypothesis, untested:

- Save the reset without the store: `phase_changes.ts` (or another small
  eager file) clears `selectedSetKeys` and `defaultsFor` in the saved entry
  directly, so no chunk is needed. It must stay free of the tab's data
  (`lazy_load.test.ts` checks this).
- Import the store only for a spec that has ranking data, using a small
  eager list of supported specs, and stop recording for the others.

Riders from the round-2 Standards axis (all low, same files):

- S8: `dropUnofferedSources` repeats the `scopeChanged` filter
  (`model/settings_reducer.ts`); one helper.
- S9: the zero-timer flush `new Promise(resolve => setTimeout(resolve, 0))`
  is written in four test files (`UpgradesTabBody.test.tsx`,
  `useUpgradesSettings.test.tsx`, `useUpgradesStore.test.ts`,
  `follow_phase.test.ts`); one helper in `testing/fake_tab_host.ts`.
- S10: in `model/saved_settings.ts` the name `unchanged` covers three of the
  four saved fields; one expression for all four.
- S11: `SettingsSeed.candidateCap` (`model/upgrades_store.ts`) has no
  production caller now that the cap comes only through the dev link.
- S12: the `upgrades_store.ts` comment on the `exportFlavour` default points
  at `ExportPanel` for the reason, which that file no longer gives.

Done when a phase change on a page whose tab never opens no longer
downloads the tab's data chunk (or the owner accepts the cost in writing on
this ticket), a spec with no ranking data downloads nothing on a phase
change, the 587 tests in `UpgradesTabBody.test.tsx` still pass, and the
riders are done or each closed with a reason.
