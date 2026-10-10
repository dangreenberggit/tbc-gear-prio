# Pre-merge review — feat/tab-store-actions

Reviewed range: `4191b454e35fbb0a74c88fd3ba1e7f363a704a46..97c523a1700b01366a348782a8cb41ac4c3b7e33`

Main commits: `d40bd2fd` (fork pin to `bfde23961`, regenerated `data/sim-implemented-effects.json`, layout baseline, touchpoints doc, updated `packages/core/test/fork-run-staleness.test.ts`), `97c523a1` (ticket 590 closed, its rows in `docs/reviews/feat-tab-settings-persist.md` set to `fixed`).

Fork code reviewed with it: `vendor/tbc-new-fork` branch `feat/upgrades-tab-react`, `0ba3765ec69b2b26387f362bbed3f31b983319d7..bfde239615059557012710d47280cd7bfc0bdd2f`: `8fe77ed76` (the tab's 17 actions move into its zustand store; `run_reducer.ts` and `settings_reducer.ts` become `run_state.ts` and `settings_state.ts`) and `bfde23961` (ticket 590's test fixes). 49 files, all under `ui/features/upgrades/` and `ui/app/tabs/`.

Spec: the owner's words of 2026-10-09: "Reducer rename sounds good."; after seeing that zustand's docs say "The recommended usage is to colocate actions and states within the store": "Do it more like zustand convention"; and "do fixes as reocmmended", meaning ticket 590 is fixed on this branch.

Dispatch (round 1, 2026-10-10): `codex` is not on PATH (`which codex`), so four fresh `general-task` subagents on Opus (effort `high`, the review lane) ran in one parallel batch: Adversarial, Domain, and the `code-review` skill's Standards and Spec sub-agents. Each was told it writes nothing and not to grep the fork's `node_modules` recursively. Both trees were clean at dispatch (`git status --porcelain`, main and fork).

Wowsims-file rule, run by the aggregator at fork HEAD `bfde23961`: `git -C vendor/tbc-new-fork diff --numstat --diff-filter=M 5262ff386bd171e6349d0f9cf00f4d762a6c9951 HEAD` prints only `6	0	ui/app/SimTabsSection.tsx`; the `--diff-filter=D` twin prints nothing. `git -C vendor/tbc-new-fork cat-file -e 5262ff386:<path>` fails for `ui/features/upgrades/model/run_reducer.ts`, `run_reducer.test.ts`, `settings_reducer.ts` and `settings_reducer.test.ts`, so the renamed files were never wowsims files. The Standards axis re-ran the numstat check with the same result.

Runs by the aggregator, logs in `.scratch/tab-store-actions/` (gitignored):

- `review-fork-tests.log`: `npx vitest run upgrades ui/app/tabs` from the fork on Node 22.17.1: 58 files, 458 tests pass, rc=0. Round 3 of `feat/tab-settings-persist` recorded 456 on the same command, so the count went from 456 to 458.
- `review-verify.log`: `corepack pnpm verify` in main: "gates: 1517 ran, 0 skipped", layout gate skipped as unchanged since the last green run (digest `9e5bac7c6fca…`), rc=0.

The Adversarial axis also ran `pnpm exec vitest run packages/core/test/fork-run-staleness.test.ts` in main: 6 pass, none skipped.

## Adversarial

**No blocking or medium findings.** Every old reducer case maps to a new pure function with the same guard, the same fields and the same identity behaviour:

| Old case (`0ba3765ec`)                                                      | New function (`bfde23961`)                                                               | Verdict                                                                |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `started`                                                                   | `runStarted`                                                                             | same                                                                   |
| `fixtureLoaded`                                                             | `fixtureLoaded`                                                                          | same                                                                   |
| `landed`                                                                    | `rowLanded`                                                                              | same; `isCurrentRun` guard, same state on a miss                       |
| `stopping`                                                                  | `stopRequested`                                                                          | same                                                                   |
| `finished`, `stopped`                                                       | `runSettled`                                                                             | same; `outcome.complete` picks done or stopped, as `settledAction` did |
| `failed`                                                                    | `runFailed`                                                                              | same                                                                   |
| `toggleSource`, `toggleSet`, `setPrune`, `setCandidateCap`, `setIterations` | `withSourceToggled`, `withSetToggled`, `withPrune`, `withCandidateCap`, `withIterations` | same; always a new object (A1)                                         |
| `applyDefaults`                                                             | `appliedSettings`                                                                        | same, plus the `!scope` guard the old store wrapper did                |
| `scopeChanged`                                                              | `afterScopeChange`                                                                       | same                                                                   |
| `dropUnofferedSources`                                                      | `withoutUnofferedSources`                                                                | same; same state when nothing is dropped                               |

`runSettled` keeps the `isCurrentRun` guard in both branches. A Stop after a finish meets a `done` state and `stopRequested` returns it unchanged; a result or Stop for an old run id returns the state unchanged. No caller builds an old action shape (`git grep` of the fork's `ui/` and the main repo's `packages/` and `scripts/`; the `scripts/tab-harness/test-stop.mjs` comment is updated). Every selector in the diff returns one field or one action; none returns a new object or array. The required `scope` argument is passed only by `useUpgradesSettings`, and it cannot be derived inside the store because it depends on the page's presets and saved gear.

The implementer's claims: (1) 17 actions and `UpgradesState = UpgradesData & UpgradesActions` — true (`upgrades_store.ts:64-86`); six helpers removed (`dispatchRun`, `dispatchSettings`, `settingsActionIn`, `setSort`, `setViewToggle`, `setExportFlavour`). (2) Renames and one function per transition — true. (3) `isCurrentRun` defined once (`run_state.ts:83`); `appliedSettings` pure and called in `useMemo` (`useUpgradesSettings.ts:71`) — true. (4) "A write that changes nothing notifies nobody" — partly true (A1). (5) The `toBe` → `toEqual` weakening at `run_state.test.ts:201` is justified (A7). (6) `fork-run-staleness.test.ts` imports the real `runStarted`/`runSettled` and passes; one of its tests is weak (A4).

Findings, all low:

- **A1.** The comment on `UpgradesActions` (`upgrades_store.ts:58-61`) and the test "notifies nobody when the write changes nothing" (`upgrades_store.test.ts:108-115`) state a general rule that five settings actions and `changeScope` do not keep: `withPrune` and its siblings (`settings_state.ts:49-57`) always spread a new object, so `setPrune(false, scope)` with prune already false notifies and rewrites the saved entry. The old reducer did the same; only the wording overstates it. The aggregator read `settings_state.ts` and `upgrades_store.ts` at `bfde23961` and confirmed it.
- **A2.** The `applyDefaults` store action has no production caller (same as S1, SP2).
- **A3.** `run_state.test.ts` lines 59-67 and 156-165 are the same tests with different run ids; "starts a new run from a finished one" (lines 104-113) builds no finished run.
- **A4.** `fork-run-staleness.test.ts`, "does not carry a change during one run into the next run", never builds run 1, so its main assertion passes by construction. The added `expect(finish(second, 1)).toBe(second)` is a real check.
- **A5.** `UpgradesTabBody.unopened.test.tsx` has no positive control that its `vi.doMock` of the data module is live; if the mock stopped matching, both "downloads none" cases would pass.
- **A6.** Round 3's A14 row in `docs/reviews/feat-tab-settings-persist.md` cites `upgrades_store.ts:101-102`, which moved to `settings_state.ts:65-67`.
- **A7.** Checked: the `toEqual` is right. `runSettled` copies the outcome to move `runner` off it (`run_state.ts:114-119`); the old production path copied the same way in `settledAction`, and the old `toBe` passed only because the test dispatched `finished` directly. `useResultsView` memoises on `run`, not on result identity.

A12 fix, read by the aggregator: `beforeEach` runs `vi.resetModules()`, resets `loaded.data`, and registers `vi.doMock` again, and both data-loading cases get a 30 s timeout (`UpgradesTabBody.unopened.test.tsx`, lines 10-30 at `bfde23961`). Each case now starts from an unloaded page, so a regression fails at `expect(loaded.data).toBe(false)`. The mutation re-run is recorded only in the lock `_comment` ("both cases failed with expected true to be false"); the review did not repeat it: unverified.

Unexamined: live-page behaviour (no browser), the A12 and A13 mutations.

## Domain

**Domain: clean.** The diff makes no game claim and changes no game-facing default or label. Phase changes still clear the selected sets and drop unoffered exclusions (`afterScopeChange` has the old `scopeChanged` body); `DEFAULT_ITERATIONS = 3000`, a cap of 0 meaning no cap, and the `'token'` export default are unchanged; `savedTabOf` still saves only `settings`, `sort`, `view` and `exportFlavour`. `data/wowsims-fork.lock.json` `commit`, `data/sim-implemented-effects.json` `forkCommit` and the fork clone's HEAD all name `bfde239615059557012710d47280cd7bfc0bdd2f`; the effects list is unchanged. Unexamined: `docs/stage0-findings.md` and `docs/verification-log.md` in full, since no changed line touches their facts.

## Standards + Spec

### Standards

The two-step re-pin, the lock `_comment` entry (it records what `8fe77ed76` and `bfde23961` changed, with a re-run command), the commit-message rules (all four subjects 50 characters or fewer) and the comment policy are met. `docs/fork-upstream-touchpoints.md` matches the fork at `bfde23961` (116 non-merge commits, 258 added files, 1 modified). No stale reference to `run_reducer`, `dispatchRun` or `settingsActionIn` remains in either repo.

- **S1.** Speculative Generality: `applyDefaults` (`upgrades_store.ts:80,137`) is called only by `upgrades_store.test.ts:113`, `useUpgradesStore.test.ts:77` and `saved_settings.test.ts:17`. The axis rated it medium. The aggregator rates it low: it changes no behaviour, and at `0ba3765ec` the same tests already reached it through `dispatchSettings(store, { type: 'applyDefaults', … })` (`git -C vendor/tbc-new-fork grep -n applyDefaults 0ba3765ec -- ui/features/upgrades`), so the branch kept an existing test-only path in the new form rather than adding one.
- **S2.** Duplicated Code: `runSettled` repeats the `runner` destructure and `withRunner` call in both branches (`run_state.ts:114-119`).
- **S3.** `isRecord`, a general guard, is exported from `model/saved_entry.ts`, and `utils/fixture.ts:28` imports it from there.
- **S4.** `packages/core/test/fork-run-staleness.test.ts:12` is 113 characters; `SourcesDialog.test.tsx:18` reads "The settings' source toggle in small", which is unclear.
- **S5.** The six 590 rows changed in `docs/reviews/feat-tab-settings-persist.md` kept the old problem text after "fixed", so each read as if the problem still existed.
- **S6.** Not a defect: the lock `_comment` changed `§` and `…` escapes to the raw `§` and `…`. The aggregator parsed both versions: the old `_comment` (170,353 characters) is an exact prefix of the new one, so only the escape form changed.
- **S7.** Not a defect: the required `scope` argument on the five settings actions replaces a scope string plus a separate defaults object, its reason is in the `UpgradesActions` comment, and the hook wrappers in `useUpgradesSettings` bind it.

### Spec

The owner's three asks are met. Zustand's docs, fetched by the Spec axis:

- https://zustand.docs.pmnd.rs/learn/guides/practice-with-no-store-actions — "The recommended usage is to colocate actions and states within the store".
- `docs/learn/guides/flux-inspired-practice.md` in https://github.com/pmndrs/zustand — "These store actions can be added directly to the store".
- `docs/learn/guides/beginner-typescript.md` in the same repo — types the store as initial state plus actions, the same structure as `UpgradesData & UpgradesActions`, and selects one field per selector.

`createStore<UpgradesState>()(subscribeWithSelector(set => ({ …data, …actions })))` matches. Three departures are deliberate and commented: a vanilla store per `Sim` reached through context (ticket 564, upstream's `sim_store.ts`), each action's next state from a pure function so tests need no store, and no-op actions returning the same state so zustand's `Object.is` check skips the write (`node_modules/zustand/esm/vanilla.mjs:6`). All six ticket-590 items have matching code (A12, A13, S14, S15, S17, SP7 of the earlier review).

- **SP1.** None of the implementer's five named logs shows the fork count of 458; `verify.log` has no rc line. Closed by the aggregator's own run (`review-fork-tests.log`, 458 pass, rc=0).
- **SP2.** `applyDefaults` has no production caller (same as S1).
- **SP3.** The rewritten 590 review rows read as "fixed" with the old problem text (same as S5).

## Summary

No blocking or medium findings. The refactor keeps every old state transition's behaviour, follows zustand's documented layout, and fixes all six ticket-590 items. The fork changes no wowsims file beyond the six approved lines in `SimTabsSection.tsx`. Fork tests (458) and `pnpm verify` pass on the aggregator's runs. Eight distinct low findings that need small code or comment changes are in ticket 591 (S1 and SP2 repeat A2); the review-row wording (S5, SP3) is fixed in this review commit; the rest were checked and are not defects.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                    |
| --- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | fixed on feat/store-actions-followups: fork `218234677`, ticket 591 closed — the "notifies nobody" comment and test name overstate the rule                      |
| A2  | Adversarial | fixed       | fixed on feat/store-actions-followups: fork `218234677`, ticket 591 closed — `applyDefaults` store action has only test callers                                  |
| A3  | Adversarial | fixed       | fixed on feat/store-actions-followups: fork `218234677`, ticket 591 closed — duplicate and misnamed tests in `run_state.test.ts`                                 |
| A4  | Adversarial | fixed       | fixed on feat/store-actions-followups: main `e5cd56a4`, ticket 591 closed — one `fork-run-staleness.test.ts` test passes by construction                         |
| A5  | Adversarial | fixed       | fixed on feat/store-actions-followups: fork `218234677`, ticket 591 closed — no positive control for the data-module mock                                        |
| A6  | Adversarial | wontfix     | a review row records the code at its round; `upgrades_store.ts:101-102` was right at `0ba3765ec`                                                                 |
| A7  | Adversarial | wontfix     | checked: `runSettled` copies the outcome to move `runner` off it, as `settledAction` did; no consumer depends on result identity                                 |
| S1  | Standards   | fixed       | fixed on feat/store-actions-followups: fork `218234677`, ticket 591 closed — same as A2; rated low, the test-only path existed at `0ba3765ec`                    |
| S2  | Standards   | fixed       | fixed on feat/store-actions-followups: fork `218234677`, ticket 591 closed — duplicated destructure in `runSettled`                                              |
| S3  | Standards   | fixed       | fixed on feat/store-actions-followups: fork `218234677`, ticket 591 closed — `isRecord` lives in the saved-settings module                                       |
| S4  | Standards   | fixed       | fixed on feat/store-actions-followups: fork `218234677`, main `e5cd56a4`, ticket 591 closed — one long line, one unclear comment                                 |
| S5  | Standards   | fixed       | fixed in this review commit: the six 590 rows in `docs/reviews/feat-tab-settings-persist.md` now say what changed, which pin, and which commit closed ticket 590 |
| S6  | Standards   | wontfix     | checked: the old lock `_comment` is an exact prefix of the new one; only `§` and `…` escapes became raw characters                                               |
| S7  | Standards   | wontfix     | checked: the required `scope` replaces a string plus a defaults object, is documented, and cannot be derived inside the store                                    |
| SP1 | Spec        | wontfix     | checked: `.scratch/tab-store-actions/review-fork-tests.log` (gitignored), 58 files, 458 tests pass, rc=0, Node 22.17.1                                           |
| SP2 | Spec        | fixed       | fixed on feat/store-actions-followups: fork `218234677`, ticket 591 closed — same as A2                                                                          |
| SP3 | Spec        | fixed       | fixed in this review commit: same as S5                                                                                                                          |
