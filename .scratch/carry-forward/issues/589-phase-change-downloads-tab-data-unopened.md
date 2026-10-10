Status: closed
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

## Closing note (2026-10-09, feat/tab-settings-persist, review fix round 3)

Fork `0ba3765ec` ("Save phase resets without loading the tab's data"),
pinned by `8dde85fa`.

A9, SP5: the ticket's first direction. A phase change made while no tab
store follows the phase now edits the saved entry directly: the new eager
`model/saved_entry.ts` (`forgetSavedSets`) clears `selectedSetKeys` and
`defaultsFor`, as the store's `scopeChanged` would, and keeps every other
saved field. When the tab opens, the store starts from that entry and
`applyDefaults` applies the phase's default sets. `saved_entry.ts` holds the
storage key and the version, which `saved_settings.ts` now imports, so both
read and write the same entry. `model/phase_changes.ts` still starts the
watch after `waitForInit` (A3). The tab body's import of the store and the
store's replay of missed changes are removed.

A10: the `missed` list is gone. On a spec with no ranking data a phase change
downloads nothing; it rewrites the saved entry only if one exists.

One difference from the replay, chosen because it needs the tab's data: a
phase change with the tab closed no longer drops an exclusion that the new
phase's pool does not offer. When the tab opens, `applyDefaults` and
`dropUnofferedSources` drop the exclusions the current phase's pool does not
offer. So after 3 to 4 to 3 with the tab closed, an exclusion offered at
phase 3 but not at 4 stays. With the tab open it is dropped, as before. The
pre-587 code also kept it.

Tests (fork, `npx vitest run upgrades ui/app/tabs`, 58 files, 456 tests
pass):

- New `ui/app/tabs/UpgradesTabBody.unopened.test.tsx`, on real page
  subscriptions. "downloads none of the tab's data on a phase change" on a
  spec with ranking data and on one without (a mock of `model/data/data`
  records whether it was loaded). "saves a phase change as the saved sets'
  reset, and keeps every other saved choice". "writes nothing on a phase
  change when the page has saved no settings". All four failed against
  `b2f9293a2` and pass now. "keeps the saved sets through the page's own
  start-up phase write" (A3) passed against both.
- `lazy_load.test.ts`: "is downloaded by the tab body only when the tab
  opens" (the tab body's only `import()` is `components/UpgradesTab`) failed
  against `b2f9293a2` and passes now. "reaches, from the tab body's static
  imports, no feature file but the eager ones, so not the tab's data" walks
  the static imports through every alias. "follows static imports far enough
  to find the data" shows that the walk does reach `model/data/data.ts` from
  the store. Changed for the new mechanism: `EAGER_FILES` adds
  `model/saved_entry.ts`, and the per-file check now allows an eager file to
  import another eager file.
- The two 587 tests in `UpgradesTabBody.test.tsx` and the A3, A4 and D2 tests
  in `useUpgradesStore.test.ts` keep their assertions. Only their timer
  helper (S9) and an import path changed.

Network check, production `vite build` served by the harness's
`startServer`, headless Chrome over the harness's CDP helpers
(`.scratch/tab-settings-persist/r3-network.log` and `r3-build.log`,
gitignored). The store and the item data are now in one chunk,
`UpgradesTab-BBr2TiNk.chunk.js` (6,358,112 bytes served). A phase change 3
to 4 to 3 in the item picker, with the tab closed, fetched no chunk and no
JSON on the protection paladin page or on the retribution paladin page.
Opening the tab then fetched that chunk.

587 re-check, same log, retribution page: the saved entry held no sets for
`ret:3` and iterations 1234. A plain reload kept `defaultsFor: "ret:3"` (A3).
A phase round trip with the tab closed removed `defaultsFor` and fetched
nothing. Opening the tab on the same page showed `preset:3:P3` and 1234.
With a reload between the round trip and the open, the result was the same.
Control: without a phase change the tab opened with no sets, as saved.

Riders: S8, one `offeredExclusions` helper serves `applyDefaults`,
`scopeChanged` and `dropUnofferedSources`. S9, one `settled()` in
`testing/fake_tab_host.ts` replaces the zero-timer flush in the four named
test files and in `run_session.test.ts`. S10, one `SAVED_PARTS` check covers
all four saved parts. S11, `SettingsSeed` and `initialSettings` take only the
iterations; the tests that seeded a cap now set it through the restored
settings or a `setCandidateCap` action, and "treats a seeded cap of 0 as no
cap" is removed (the `setCandidateCap` 0 and -3 cases still cover it). S12,
the `exportFlavour` default comment states its reason without the pointer.

Gates at this pin: layout gate measured and passed
(`.scratch/tab-settings-persist/r3-layout-gate.log`), desktop gate (a)-(h)
passed with no golden update (`r3-desktop-gate.log`).
