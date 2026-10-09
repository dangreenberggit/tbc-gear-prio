# Pre-merge review — feat/tab-settings-persist

Reviewed range: `3571ec434764710f78c4dd82387dbea3fbc9653b..acce6cb00d867d3ec2bd962b95356b749a1f418f`

Main commits: `f4943010` (ticket 570 closed wontfix on the owner's ruling), `200144fb` (fork pin to `56c87e6ed`), `acce6cb0` (fork pin to `c7f739d06`).

Fork code reviewed with it: `vendor/tbc-new-fork` branch `feat/upgrades-tab-react`, `e417a504ebbf8ae343d8fa82fe0356852df8041b..c7f739d0632831160197078349720259e27bc489`: `56c87e6ed` (the tab's settings and column sort saved per spec) and `c7f739d06` (the Set potential and BiS only view toggles saved with them). 19 files, all under `ui/features/upgrades/` plus `ui/app/tabs/UpgradesTabBody.test.tsx`.

Spec: the owner's request of 2026-10-09, "Tab settings should survive a page reload. Have an opus agent knock that out, it should be straightforward". The orchestrator added the two view toggles to the saved set. Ticket 570 is closed on the owner's words "This concept is dumb. If we are simming on wowsims then the sim uses whatever settings a user has on wowsims."

Dispatch (round 1, 2026-10-09): `codex` is not on PATH, so four fresh `general-task` subagents on Opus (effort `high`, the review lane) ran in one parallel batch: Adversarial, Domain, and the `code-review` skill's Standards and Spec sub-agents. Each was told it writes nothing and not to grep the fork's `node_modules`. Both trees were clean at dispatch (`git status --porcelain`, main and fork).

Wowsims-file rule, run by the aggregator: `git -C vendor/tbc-new-fork diff --numstat --diff-filter=M 5262ff386bd171e6349d0f9cf00f4d762a6c9951 HEAD` prints only `6	0	ui/app/SimTabsSection.tsx`; the `--diff-filter=D` twin prints nothing (fork HEAD `c7f739d06`). The Standards axis re-ran the same check at `c7f739d06` with the same result.

## Adversarial

No blocking defect. Settings, sort and view toggles round-trip through real storage writes; a run never writes storage (the only run writer, `dispatchRun`, sets only `run`); unreadable or other-version data falls back without throwing; a saved `defaultsFor` cannot hold back a different phase's defaults. The axis ran `vitest run` on `saved_settings`, `useUpgradesStore`, `UpgradesResults.view`, `settings_reducer` and `follow_phase`: 5 files, 46 tests pass, rc=0.

- **A1 (low).** A phase change made before the tab's store exists is not seen, and the saved state now outlives it. Saved `{defaultsFor:'feral:3', selectedSetKeys:[]}`, reload, phase 3→4→3 on another tab, open Upgrades: `applyDefaults` returns early (`model/settings_reducer.ts`, key match) and the tab shows no sets. Ticket 564 (K2-1) says a phase change resets to the phase's defaults "whether or not the tab is on screen". The store and `followPhase` are made only when the lazy tab body first opens (`hooks/useUpgradesStore.ts`, `app/tabs/UpgradesTabBody.tsx`).
- **A2 (dev builds).** The dev link's `cap` and `iterations` go into the store's first state, and the next ordinary write saves them. Same finding as D1; see there.
- **A3 (hypothesis, untested).** If the tab opens before `waitForInit` → `loadSettings` finishes (`app/individual_sim_ui.tsx` near line 135) and the saved phase differs from the starting one, `followPhase` dispatches `scopeChanged` during the load, clearing the restored sets and saving that.
- **A4 (test gap).** No test reloads after a phase change, and none checks that `scopeChanged` is saved.
- **A5 (checked, clean): out-of-range values.** A restored `iterations: 0` runs with the default 3000 (`model/run_reducer.ts:30`); negative or non-integer values are rejected (`saved_settings.ts`, `isCount`); `candidateCap` must be > 0. A huge value can come only from the input or a hand edit, and behaves as it would within one session.
- **A6 (checked, clean): write frequency.** One `setItem` per change to settings, sort or view, so one per picker keystroke; about 200 bytes, no debounce (upstream debounces, `persistence.ts:73-76`). Harmless.
- **A7 (checked, clean): saved sort and the in-flight table.** The four sort columns are always present (`results_columns.ts:18`) and a run in flight ignores the sort (`useResultsTable.ts:63`). `restoredSort` accepts only one known column.
- **A8 (checked, clean): `fakeTabHost`.** The real key is `specStorageKey` = prefix + part (`ui/sim/state/storage_keys.ts:12`), as the fake assumes; the real host's storage calls are wrapped in try/catch like the fake's callers; each `fakeHost` call makes a new `sim`, so the `WeakMap` gives each test its own store.

Unexamined by this axis: the main-repo lock/doc/ticket diff (Standards lane) and a real browser.

## Domain

Nothing contradicts `docs/stage0-findings.md` or `docs/verification-log.md`. The key is per spec (`specStorageKey(playerSpec, …)`, `app/individual_sim_ui.tsx:346`), which matches upstream. Phase comes from `useSimStore('phase')`; the diff derives no phase or content tier of its own. When the page's phase does not match the saved `defaultsFor`, `appliedSettings` replaces the sets with the new phase's defaults and drops exclusions the new pool does not offer, so a saved set key never selects anything in another phase.

- **D1 (medium for this project).** A candidate cap set once through `?upgrades-dev&cap=N` is saved and restored on every later load, while the cap picker is hidden without `?upgrades-dev` (`components/RunSettingsPanel/RunSettingsPanel.tsx:54-58`, ticket 466: "a cut of the candidate list the user cannot see drops real upgrades"). `toRunSettings` passes the cap to every run; the eligible count shows the uncapped count. `DEV_FLAGS` is `{}` on a production build (`utils/dev_flags.ts`, last line), so the public site cannot set a cap; the dev server (:5173, used for live verification and SME captures) and the gate-harness build can. Aggregator check: `RunSettingsPanel.tsx:56` `hidden={!devVisible}` and `utils/dev_flags.ts` read as stated.
- **D2 (low).** If a pool-data update removes a source while the scope still matches, the stale key stays saved; the pool ignores it, but the Sources summary counts it.
- **D3 (product risk, judged low).** A saved `excludedSources` the user has forgotten. Excludable sources are raid zones plus Badge, Crafted, Reputation, PvP, World drop and Heroic buckets (`model/engine/view.ts:150`). What the UI shows on load: under the Sources button, "{n} of {m} sources excluded", or "All {m} sources included" (`components/SourcesDialog/SourcesButton.tsx:28-32`, `assets/locales/en/upgrades.json:15-16`). At the `xl` width and above that line is always shown; below it, the run-settings body is collapsed until the Settings button is pressed (`RunSettingsPanel.tsx:44`, `open ? 'grid' : 'hidden', 'xl:grid'`), and only the eligible count stays visible, which drops when sources are excluded. Aggregator check: the three files read as stated.
- **D4 (none).** The ticket 570 closing note quotes the owner and states no game fact.

## Standards + Spec

### Standards

The wowsims-file rule holds. The Standards axis re-ran `docs/fork-upstream-touchpoints.md`'s commands: 112 commits, merge-base `5262ff386bd1…`, one merge `fedf78807`, `255 A` and `1 M`, 250 of the A files under `ui/features/upgrades`, ticket-number grep empty. The lock `commit` and `sim-implemented-effects.json` `forkCommit` both name `c7f739d06`; `python scripts/check_layout_gate.py --print-hash` equals the committed `testedTabHash` (`cc08a5fc…`). No commit body line is over 72 characters.

- **S1 (hard).** Fork `c7f739d06`'s subject "Save the Upgrades tab's view toggles with its settings" is 54 characters (rule 2, limit 50). Aggregator count agrees.
- **S2.** `model/upgrades_store.ts` `SettingsSeed` comment is stale ("the dev link's iterations and cap, or the defaults").
- **S3.** `saved_settings.ts`: "A run changes neither" about three things.
- **S4.** `saved_settings.ts` `FIELD_CHECKS` comment compares to upstream's `ignoreUnknownFields` read (`persistence.ts:53`); whether a wrong-typed known field throws there is a hypothesis, untested.
- **S5 (Duplicated Code).** Three in-memory `Env['storage']` fakes: `testing/fake_tab_host.ts`, `saved_settings.test.ts`, `hooks/useUpgradesStore.test.ts`.
- **S6 (Durable claims).** The fork lock `_comment` re-run command uses `HEAD` (`git diff --numstat --diff-filter=M 5262ff386bd1 HEAD`), which moves.
- **S7.** Neither main pin commit says whether `testedTabHash` was advanced by a measured green run.

### Spec

The implementer's claims hold against the fork code and the cited upstream files: the `Env` storage adapter, `host.getStorageKey('__upgradesSettings__')` with the per-spec prefix (`app/individual_sim_ui.tsx:346-347`), the `version` field, try/catch on read and write, the persisted fields as listed, no version bump for `view` with an old entry restoring toggles off (`saved_settings.test.ts:55`), and link values winning over saved ones. Ticket 570's `Status: wontfix` is a valid word and the closing quote matches the owner's words exactly.

- **SP1 (partial).** The export panel's token/gear choice is local `useState` (`components/ExportPanel/ExportPanel.tsx:21`) and is not saved. Everything else the user sets on the tab is saved by the tab or by upstream (phase, favourites, batch); open panes, open below-cutoff groups and the settings panel's open state are display state.
- **SP2 (not asked for).** The column sort is saved across reloads. The owner's ruling on ticket 582 covered keeping it across runs.
- **SP3 (wrong).** Same as D1.
- **SP4 (thin evidence).** In a real browser only the two view toggles were shown to survive a reload (`.scratch/tab-settings-persist/live-view-toggles.log`, gitignored); iterations read 3000 both times, which is `DEFAULT_ITERATIONS`. Sets, sources, prune and sort are shown only by unit tests. `verify-2.log`, `layout-gate-2.log` and `desktop-gate-2.log` check other things.

## Summary

The feature does what was asked and follows upstream's own pattern for saved settings; no axis found a defect in the round trip, the fallback, or the per-spec key. One finding needs a code change before this is trusted on the dev server: the dev link's candidate cap is saved and comes back hidden (A2/D1/SP3, ticket 586, with riders S2 to S6 and a live reload check, SP4). The remaining follow-ups are low: a phase change made before the tab opens (ticket 587) and the export choice not saved (ticket 588). Recommended: fix ticket 586 on this branch, re-pin, and review that round before the merge ask.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                      |
| --- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | defer       | `.scratch/carry-forward/issues/587-saved-sets-miss-phase-change-before-tab-opens.md` — phase change before the tab opens                                                                                                           |
| A2  | Adversarial | defer       | `.scratch/carry-forward/issues/586-saved-tab-settings-keep-hidden-dev-cap.md` — same as D1; recommended fix on this branch                                                                                                         |
| A3  | Adversarial | defer       | `.scratch/carry-forward/issues/587-saved-sets-miss-phase-change-before-tab-opens.md` — load-order hypothesis, untested                                                                                                             |
| A4  | Adversarial | defer       | `.scratch/carry-forward/issues/587-saved-sets-miss-phase-change-before-tab-opens.md` — no reload-after-phase-change test                                                                                                           |
| A5  | Adversarial | wontfix     | checked: out-of-range iterations and cap are rejected or fall back to the default (`saved_settings.ts` `isCount`, `run_reducer.ts:30`)                                                                                             |
| A6  | Adversarial | wontfix     | checked: one ~200-byte write per user change, none per run; no debounce needed                                                                                                                                                     |
| A7  | Adversarial | wontfix     | checked: sort columns always present, in-flight runs ignore the sort (`results_columns.ts:18`, `useResultsTable.ts:63`)                                                                                                            |
| A8  | Adversarial | wontfix     | checked: `fakeTabHost` key and storage match the real host (`storage_keys.ts:12`); a new `sim` per test                                                                                                                            |
| D1  | Domain      | defer       | `.scratch/carry-forward/issues/586-saved-tab-settings-keep-hidden-dev-cap.md` — saved dev cap, control hidden; recommended fix on this branch                                                                                      |
| D2  | Domain      | defer       | `.scratch/carry-forward/issues/587-saved-sets-miss-phase-change-before-tab-opens.md` — stale source key counted in the summary                                                                                                     |
| D3  | Domain      | wontfix     | judged low: the excluded count shows under the Sources button at `xl` and above, behind the Settings button below it, and the eligible count always shows; owner may want it outside the collapsed panel                           |
| D4  | Domain      | wontfix     | checked: the ticket 570 note states no game fact                                                                                                                                                                                   |
| S1  | Standards   | wontfix     | fork `c7f739d06` subject is 54 characters; the commit is pinned by `acce6cb0` and named in `docs/fork-upstream-touchpoints.md`, so rewriting it means a re-pin for a cosmetic change                                               |
| S2  | Standards   | defer       | `.scratch/carry-forward/issues/586-saved-tab-settings-keep-hidden-dev-cap.md` — rider: stale `SettingsSeed` comment                                                                                                                |
| S3  | Standards   | defer       | `.scratch/carry-forward/issues/586-saved-tab-settings-keep-hidden-dev-cap.md` — rider: "neither" about three things                                                                                                                |
| S4  | Standards   | defer       | `.scratch/carry-forward/issues/586-saved-tab-settings-keep-hidden-dev-cap.md` — rider: `ignoreUnknownFields` comparison untested                                                                                                   |
| S5  | Standards   | defer       | `.scratch/carry-forward/issues/586-saved-tab-settings-keep-hidden-dev-cap.md` — rider: three storage fakes in tests                                                                                                                |
| S6  | Standards   | defer       | `.scratch/carry-forward/issues/586-saved-tab-settings-keep-hidden-dev-cap.md` — rider: lock `_comment` re-run command names `HEAD`                                                                                                 |
| S7  | Standards   | wontfix     | `.scratch/tab-settings-persist/layout-gate-2.log` (gitignored) records `"outcome":"measured","pass":true` and "layout gate: PASSED. Advanced the baseline to cc08a5fccba8..."; the hash equals `check_layout_gate.py --print-hash` |
| SP1 | Spec        | defer       | `.scratch/carry-forward/issues/588-export-flavour-not-saved.md` — export token/gear choice not saved                                                                                                                               |
| SP2 | Spec        | wontfix     | the sort is a choice the user makes on the tab, so it fits "Tab settings"; the owner can overrule, and dropping it is one field                                                                                                    |
| SP3 | Spec        | defer       | `.scratch/carry-forward/issues/586-saved-tab-settings-keep-hidden-dev-cap.md` — same as D1                                                                                                                                         |
| SP4 | Spec        | defer       | `.scratch/carry-forward/issues/586-saved-tab-settings-keep-hidden-dev-cap.md` — live reload check of sets, sources, iterations and sort                                                                                            |
