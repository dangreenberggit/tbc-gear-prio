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
| A1  | Adversarial | fixed       | fixed in fork `b2f9293a2` (pinned by `b390ebd5`): `model/phase_changes.ts` records phase changes from page start, the store replays them; ticket 587 closed in `a2c7d09c`; superseded in round 2                                   |
| A2  | Adversarial | fixed       | fixed in fork `b2f9293a2` (pinned by `b390ebd5`): the cap is neither saved nor restored; ticket 586 closed in `a2c7d09c`; superseded in round 2                                                                                    |
| A3  | Adversarial | fixed       | fixed in fork `b2f9293a2` (pinned by `b390ebd5`): a test showed the fault was real; the phase record now starts after `waitForInit`; ticket 587 closed in `a2c7d09c`; superseded in round 2                                        |
| A4  | Adversarial | fixed       | fixed in fork `b2f9293a2` (pinned by `b390ebd5`): `useUpgradesStore.test.ts` (A4) reloads after a phase change; ticket 587 closed in `a2c7d09c`; superseded in round 2                                                             |
| A5  | Adversarial | wontfix     | checked: out-of-range iterations and cap are rejected or fall back to the default (`saved_settings.ts` `isCount`, `run_reducer.ts:30`)                                                                                             |
| A6  | Adversarial | wontfix     | checked: one ~200-byte write per user change, none per run; no debounce needed                                                                                                                                                     |
| A7  | Adversarial | wontfix     | checked: sort columns always present, in-flight runs ignore the sort (`results_columns.ts:18`, `useResultsTable.ts:63`)                                                                                                            |
| A8  | Adversarial | wontfix     | checked: `fakeTabHost` key and storage match the real host (`storage_keys.ts:12`); a new `sim` per test                                                                                                                            |
| D1  | Domain      | fixed       | fixed in fork `b2f9293a2` (pinned by `b390ebd5`): same fix as A2; ticket 586 closed in `a2c7d09c`; superseded in round 2                                                                                                           |
| D2  | Domain      | fixed       | fixed in fork `b2f9293a2` (pinned by `b390ebd5`): `dropUnofferedSources` after `waitForInit`; ticket 587 closed in `a2c7d09c`; superseded in round 2                                                                               |
| D3  | Domain      | wontfix     | judged low: the excluded count shows under the Sources button at `xl` and above, behind the Settings button below it, and the eligible count always shows; owner may want it outside the collapsed panel                           |
| D4  | Domain      | wontfix     | checked: the ticket 570 note states no game fact                                                                                                                                                                                   |
| S1  | Standards   | wontfix     | fork `c7f739d06` subject is 54 characters; the commit is pinned by `acce6cb0` and named in `docs/fork-upstream-touchpoints.md`, so rewriting it means a re-pin for a cosmetic change                                               |
| S2  | Standards   | fixed       | fixed in fork `b2f9293a2`: `SettingsSeed` comment rewritten; ticket 586 closed in `a2c7d09c`; superseded in round 2                                                                                                                |
| S3  | Standards   | fixed       | fixed in fork `b2f9293a2`: "A run changes none of them"; ticket 586 closed in `a2c7d09c`; superseded in round 2                                                                                                                    |
| S4  | Standards   | fixed       | fixed in fork `b2f9293a2`: the `ignoreUnknownFields` comparison is removed; ticket 586 closed in `a2c7d09c`; superseded in round 2                                                                                                 |
| S5  | Standards   | fixed       | fixed in fork `b2f9293a2`: tests use the exported `memoryStorage`; ticket 586 closed in `a2c7d09c`; superseded in round 2                                                                                                          |
| S6  | Standards   | fixed       | fixed in `b390ebd5`: this branch's lock `_comment` entries name `56c87e6ed`, `c7f739d06` and `b2f9293a2`; older entries are row S13; ticket 586 closed in `a2c7d09c`; superseded in round 2                                        |
| S7  | Standards   | wontfix     | `.scratch/tab-settings-persist/layout-gate-2.log` (gitignored) records `"outcome":"measured","pass":true` and "layout gate: PASSED. Advanced the baseline to cc08a5fccba8..."; the hash equals `check_layout_gate.py --print-hash` |
| SP1 | Spec        | fixed       | fixed in fork `b2f9293a2` (pinned by `b390ebd5`): `exportFlavour` saved in the version-1 entry; ticket 588 closed in `a2c7d09c`; superseded in round 2                                                                             |
| SP2 | Spec        | wontfix     | the sort is a choice the user makes on the tab, so it fits "Tab settings"; the owner can overrule, and dropping it is one field                                                                                                    |
| SP3 | Spec        | fixed       | fixed in fork `b2f9293a2` (pinned by `b390ebd5`): same fix as A2; ticket 586 closed in `a2c7d09c`; superseded in round 2                                                                                                           |
| SP4 | Spec        | fixed       | fixed in `a2c7d09c`: `.scratch/tab-settings-persist/r2-live-reload.log` (gitignored) shows sets, a source, iterations, prune, sort and export choice back after reload; round-2 Spec axis checked each step; superseded in round 2 |

# Round 2

Reviewed range: `acce6cb00d867d3ec2bd962b95356b749a1f418f..a2c7d09cf5a59efef21152284f9397f264a0a864`

Main commits: `7c0292c2` (the round-1 review file), `b390ebd5` (fork pin to `b2f9293a2`), `a2c7d09c` (tickets 586, 587 and 588 closed). The range starts at round 1's through-sha, so the review commit is inside it.

Fork code reviewed with it: `vendor/tbc-new-fork` branch `feat/upgrades-tab-react`, `c7f739d0632831160197078349720259e27bc489..b2f9293a24ad55c82770b15ce2a782c31c5c5fcb`, one commit, "Fix saved tab settings: cap, phase, export". 19 files: 18 modified, one new (`ui/features/upgrades/model/phase_changes.ts`).

Spec: tickets 586, 587 and 588 ("Done when" lines and closing notes), the round-1 rows that deferred to them, and two orchestrator checks for 587: the tab's lazy loading is not undone, and `UpgradesTabBody.tsx` and `phase_changes.ts` are our files.

Dispatch (round 2, 2026-10-09): `codex` was not used; four fresh `general-task` subagents on Opus (effort `high`, the review lane) ran in one parallel batch: Adversarial, Domain, and the `code-review` skill's Standards and Spec sub-agents. Each was told it writes nothing and not to grep the fork's `node_modules` recursively. Both trees were clean at dispatch (`git status --porcelain`, main and fork).

Runs by the aggregator, logs in `.scratch/tab-settings-persist/` (gitignored):

- `review-r2-fork-tests.log`: `npx vitest run upgrades ui/app/tabs` from the fork on Node 22.17.1: 57 files, 448 tests pass, rc=0.
- `review-r2-verify.log`: `corepack pnpm verify` in main: "gates: 1517 ran, 0 skipped", the layout gate skipped as unchanged since the last green run (digest `21a8f1685061…`), rc=0.

Wowsims-file rule, run by the aggregator at fork HEAD `b2f9293a2`: `git -C vendor/tbc-new-fork diff --numstat --diff-filter=M 5262ff386bd171e6349d0f9cf00f4d762a6c9951 HEAD` prints only `6	0	ui/app/SimTabsSection.tsx`; the `--diff-filter=D` twin prints nothing. `git -C vendor/tbc-new-fork cat-file -e 5262ff386:<path>` fails (rc=128) for `ui/app/tabs/UpgradesTabBody.tsx`, `ui/features/upgrades/model/phase_changes.ts` and both `UpgradesTabBody` tests, so none is a wowsims file. The Standards axis re-ran the same checks with the same result.

## Adversarial (round 2)

The five fix claims hold against the code. The axis ran `npx vitest run` on the 7 changed test files: 50 pass, rc=0.

- **A9 (medium).** A phase change made on a page whose tab has not opened now downloads the tab's store chunk with all bundled item data. `UpgradesTabBody.tsx:17-21,56` imports `hooks/useUpgradesStore` on such a change; that reaches `follow_phase.ts` → `./data/data` (every spec's universe JSON) and `./run`. The chunk `dist/tbc/bundle/useUpgradesStore-S9N8_lXr.chunk.js` is 6,317,978 bytes (aggregator check: `ls -la`, built 17:20, after the fork commit at 17:16); the axis measured 756,579 bytes gzipped (unverified). Before round 2 this chunk was downloaded only when the tab opened. The 587 closing note does not mention the cost.
- **A10 (low).** On a spec with no ranking data, `followPhase` returns before setting a follower (`follow_phase.ts:25`), so the first phase change downloads the chunk for nothing, and each later one appends to `missed` and re-runs the cached `import()` (`phase_changes.ts:30-34`).
- **A11 (checked, clean).** `UpgradesTabBody.test.tsx:56-62` mocks `@sim/state/subscriptions`, so its tests cannot catch a load-order bug. `useUpgradesStore.test.ts` covers the A3 order with real subscriptions, and the real page follows that order (next paragraph).

Clean checks: the eager static import keeps the first download lazy (`phase_changes.ts` imports a type from `@sim/sim` and `@sim/state/subscriptions`, both already loaded by the page, `individual_sim_ui.tsx:43`; `lazy_load.test.ts` enforces it). The A3 order is true on the real page: the constructor registers the `.then` that calls `loadSettings` (`individual_sim_ui.tsx:135-137`) before React renders the tab, `waitForInit` returns one promise (`sim.ts:224-225`), and `loadIndividualSettings` writes the phase synchronously (`persistence.ts:46-81`). A pending import that resolves after the store exists gets the cached store; StrictMode's second effect does nothing; a `waitForInit` that never resolves records nothing. `dropUnofferedSources` uses the restored phase and the same pool as the Sources dialog. `ExportPanel` renders only under the tab's provider. The A3 test fails against round-1 code (read, not run).

## Domain (round 2)

**Domain: clean.** The exclusion drop uses the same `poolFor(specId, sim.getPhase())` as the run (`model/run.ts:78-79,115`) after the restored phase, so it drops only keys that excluded nothing at that phase; Heroic and Badge buckets stay whenever the phase's pool holds them (`model/engine/view.ts:150-158`). The diff derives no phase or tier of its own. Not saving the cap agrees with ticket 466, and the harness sets its cap on every load (`scripts/tab-harness/run-tab-cdp.mjs:291-303`). The `token` export default agrees with ticket 126 and `docs/verification-log.md:1086-1091`.

## Standards + Spec (round 2)

### Standards

Hard checks pass: the lock `commit` and `sim-implemented-effects.json` `forkCommit` both name `b2f9293a24ad…`; `python scripts/check_layout_gate.py --print-hash` equals `testedTabHash` `21a8f168…`; `docs/fork-upstream-touchpoints.md` re-runs as 113 commits, 256 A and 1 M, 251 under `ui/features/upgrades`; the three commit messages follow the seven rules (subjects 39, 30 and 42 characters); no path under `model/engine` changed; riders S2 to S6 are done. Low judgement calls:

- **S8 (Duplicated Code).** `dropUnofferedSources` repeats the `scopeChanged` filter (`model/settings_reducer.ts`).
- **S9 (Duplicated Code).** The zero-timer flush is written in four test files.
- **S10 (Mysterious Name).** `unchanged` in `saved_settings.ts` covers three of the four saved fields.
- **S11 (Speculative Generality).** `SettingsSeed.candidateCap` has no production caller now.
- **S12.** The `upgrades_store.ts` comment on the `exportFlavour` default points at `ExportPanel` for a reason that file no longer gives.
- **S13.** Lock `_comment` entries from earlier branches still use `HEAD` in their re-run commands.

### Spec

Every "Done when" line of 586, 587 and 588 has code and a test. Each closing-note claim that cites `r2-live-reload.log` is shown there step by step: sets, a source, iterations and prune (steps 2-3), the sort and the export choice (7-8), the cap not coming back (4-6), and phase 3→4→3 with the tab never opened resetting to `preset:3:P3` after reload (9).

- **SP5 (medium).** Same as A9.
- **SP6 (scope).** The `run_reducer.ts` and `settings_reducer.ts` header comments were reworded; no ticket asked for it.

## Summary (round 2)

The fixes for tickets 586, 587 and 588 work, and both test runs pass. One medium finding needs a code change: to save a phase change on a page where the tab never opens, the page now downloads the tab's 6.3 MB data chunk on the first phase change, on every spec page, including specs the tab has no data for (A9, A10, SP5; ticket 589, with the five low Standards findings as riders). Nothing is blocking. Under the orchestrator's rule, this round does not clear the branch for a merge ask until ticket 589 is fixed or the owner accepts the cost.

## Disposition (round 2)

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                          |
| --- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A9  | Adversarial | defer       | `.scratch/carry-forward/issues/589-phase-change-downloads-tab-data-unopened.md` — a phase change downloads the tab's data chunk with the tab unopened                  |
| A10 | Adversarial | defer       | `.scratch/carry-forward/issues/589-phase-change-downloads-tab-data-unopened.md` — no-data spec: wasted download, `missed` grows                                        |
| A11 | Adversarial | wontfix     | checked: the mocked subscriptions hide no bug; `useUpgradesStore.test.ts` covers the A3 order with real ones and the page follows it (`individual_sim_ui.tsx:135-137`) |
| S8  | Standards   | defer       | `.scratch/carry-forward/issues/589-phase-change-downloads-tab-data-unopened.md` — rider: duplicated source filter                                                      |
| S9  | Standards   | defer       | `.scratch/carry-forward/issues/589-phase-change-downloads-tab-data-unopened.md` — rider: zero-timer flush in four test files                                           |
| S10 | Standards   | defer       | `.scratch/carry-forward/issues/589-phase-change-downloads-tab-data-unopened.md` — rider: `unchanged` name                                                              |
| S11 | Standards   | defer       | `.scratch/carry-forward/issues/589-phase-change-downloads-tab-data-unopened.md` — rider: unused `SettingsSeed.candidateCap`                                            |
| S12 | Standards   | defer       | `.scratch/carry-forward/issues/589-phase-change-downloads-tab-data-unopened.md` — rider: stale comment pointer to `ExportPanel`                                        |
| S13 | Standards   | wontfix     | older lock `_comment` entries are history entries from earlier branches; rewriting them would change what they recorded                                                |
| SP5 | Spec        | defer       | `.scratch/carry-forward/issues/589-phase-change-downloads-tab-data-unopened.md` — same as A9                                                                           |
| SP6 | Spec        | wontfix     | the header-comment rewording was requested by the orchestrator in the fix round and is declared in the lock `_comment`                                                 |
