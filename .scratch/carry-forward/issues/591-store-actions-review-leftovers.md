Status: open
Type: task
Origin: docs/reviews/feat-tab-store-actions.md
Blocks: none
Blocked by: none
Related: 590

# Small leftovers from the store-actions review

The pre-merge review of `feat/tab-store-actions` (fork
`vendor/tbc-new-fork` branch `feat/upgrades-tab-react` at `bfde23961`)
found no blocking or medium problem. These low findings each need a small
change in the fork, in a test, a comment or one store action, plus one
comment and one test in the main repo. None changes what the tab does.

- **A1, a claim stated too broadly.** The comment on `UpgradesActions`
  (`ui/features/upgrades/model/upgrades_store.ts:58-61`) says a write that
  changes nothing "notifies nobody", and the test "notifies nobody when the
  write changes nothing" (`model/upgrades_store.test.ts:108-115`) states the
  same rule. Only `applyDefaults` is exercised there. `withPrune`,
  `withCandidateCap`, `withIterations`, `withSourceToggled`,
  `withSetToggled` (`model/settings_state.ts:49-57`) and `afterScopeChange`
  always return a new object, so `setPrune(false, scope)` with prune already
  false notifies subscribers and rewrites the saved entry
  (`model/saved_settings.ts:107-110`). The old reducer did the same, so this
  is not a regression. Either narrow the comment and the test name to the
  actions that do return the same state, or add equality guards and a test
  for one of them.
- **A2, S1, SP2: a store action only tests call.** `applyDefaults`
  (`upgrades_store.ts:80,137`) is called only by `upgrades_store.test.ts:113`,
  `hooks/useUpgradesStore.test.ts:77` and `model/saved_settings.test.ts:17`
  (`git -C vendor/tbc-new-fork grep -n applyDefaults bfde23961 -- ui/features/upgrades`).
  Production applies the defaults inside each settings action and through
  `appliedSettings` during render. Remove the action and seed the tests
  another way (for example `store.setState` with `appliedSettings(...)`),
  or say in its comment that it exists for tests.
- **A3, duplicate and misnamed tests.** In `model/run_state.test.ts`, the
  tests at lines 59-67 and 156-165 check the same thing with different run
  ids. The test "starts a new run from a finished one" (lines 104-113)
  builds no finished run; it repeats line 27. Delete one of each pair, or
  make the second test start from a settled run.
- **A4, a main-repo test that passes by construction.** In
  `packages/core/test/fork-run-staleness.test.ts`, "does not carry a change
  during one run into the next run" never builds run 1, so its main
  assertion (`start(2, sig4)`, settle, read `sig4`) cannot fail. The added
  `expect(finish(second, 1)).toBe(second)` is a real check. Build run 1 with
  the old signature first, or rename the test to what it checks.
- **A5, no check that the download detector is connected.** In
  `ui/app/tabs/UpgradesTabBody.unopened.test.tsx`, nothing asserts that the
  `vi.doMock` of `@features/upgrades/model/data/data` is live. If the mock
  path stopped matching, `loaded.data` would stay false and both "downloads
  none" cases would pass. The round-trip test already imports the data
  module (line 124); assert `expect(loaded.data).toBe(true)` after it.
- **S2, duplicated code in `runSettled`.** `model/run_state.ts:114-119`
  repeats `const { runner, ...result } = outcome;` and
  `withRunner(state.measuredOn, runner)` in both branches. Destructure once
  and pick only the status.
- **S3, a general guard in the saved-settings module.** `isRecord` is
  exported from `model/saved_entry.ts`, and `utils/fixture.ts` imports it
  from there. Move it to a small shared module, or leave it with a reason.
- **S4, wording and line length.**
  `ui/features/upgrades/components/SourcesDialog/SourcesDialog.test.tsx:18`
  reads "The settings' source toggle in small, so the dialog shows what a
  click changed"; the meaning is unclear (probably "is small"). In the main
  repo, `packages/core/test/fork-run-staleness.test.ts:12` is 113
  characters long; wrap it.

## Done when

Each item above is changed or has a written reason to stay, the fork change
is re-pinned (bump `data/wowsims-fork.lock.json`, then
`pnpm sim-implemented-effects:generate`, then `pnpm verify`), and
`npx vitest run upgrades ui/app/tabs` in the fork passes.
