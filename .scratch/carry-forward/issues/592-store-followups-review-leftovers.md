Status: closed
Type: task
Origin: docs/reviews/feat-store-actions-followups.md
Blocks: none
Blocked by: none
Related: 591

# Two missing tests and three comment edits from the 591 follow-up review

The pre-merge review of `feat/store-actions-followups` (fork
`vendor/tbc-new-fork` branch `feat/upgrades-tab-react` at `218234677`)
found nothing blocking. Five low findings each need a small change in the
fork. All are tests or comments; no production logic changes.

## Tests to add

- **A1.** No test checks that a setter called with the value it already
  holds still stores the scope's defaults the first time.
  `changeInScope` runs `appliedSettings` before the change
  (`ui/features/upgrades/model/upgrades_store.ts:113-114`), so this works
  today. But `upgrades_store.test.ts:120` calls `setPrune(false, SCOPE)` only
  as setup and asserts nothing about it, and `saved_settings.test.ts:104`
  passes no scope. The reviewer's reading (untested) is that rewriting
  `changeInScope` to return the old state whenever `change` returns its
  input would pass every current test. Add a store test: a fresh store,
  `setPrune(false, scope)` with the default prune value, then assert that
  `defaultsFor` and the selected sets now hold the scope's defaults and the
  listener fired once.
- **A2.** `afterScopeChange` returns the same state only when
  `state.selectedSetKeys.length === 0`, `defaultsFor` is undefined and no
  exclusion is dropped (`ui/features/upgrades/model/settings_state.ts:88`).
  No test covers the first condition: the tests at
  `settings_state.test.ts:92-112` either set `defaultsFor` or select no
  sets. Add a test with sets selected and `defaultsFor` undefined (a saved
  entry can produce this, because `saved_settings.ts:33-45` checks each
  field on its own) and assert the sets are cleared.

## Comments to edit

- **S1.** `ui/features/upgrades/model/settings_state.ts:53`, the line
  comment "The three setters below return the state they were given when the
  value already holds, so the store writes nothing." restates the code. The
  reason is already in the `UpgradesActions` and `afterScopeChange`
  docstrings. Delete the line (AGENTS.md § Comment policy).
- **S2.** `ui/features/upgrades/utils/is_record.ts`, docstring: the first
  sentence lists the callers (`saved_entry.ts`, `saved_settings.ts`,
  `fixture.ts`), which will go stale. Keep the second sentence (why it
  imports nothing) and drop the caller list.
- **S5.** `useUpgradesStore.test.ts:77` and `saved_settings.test.ts:17`
  call `setPrune(true, scope)` only to store the scope's defaults, the way
  production does since `applyDefaults` was removed. Nothing in either test
  says so. Add a one-line comment at each call, or a small test helper
  named for what it does.

## Done when

Both tests exist and pass, the three comments are edited, the fork lock is
re-pinned (`data/wowsims-fork.lock.json`, then
`pnpm sim-implemented-effects:generate` and `pnpm verify`), and rows A1,
A2, S1, S2 and S5 in `docs/reviews/feat-store-actions-followups.md` are
set to `fixed` in the commit that closes this ticket.

## Closing note (2026-10-09, feat/store-actions-followups)

Fork `d1de72abc` ("Close store follow-up review leftovers (592)") on
`feat/upgrades-tab-react`, pinned by `0e3c5967`. No production logic changed.

- **A1.** `upgrades_store.test.ts` now checks that a fresh store's
  `setPrune(false, scope)` stores the scope's defaults and notifies once. With
  `changeInScope` changed to skip `appliedSettings` when the change returns its
  input, that test failed and the other 462 passed; the change was reverted.
- **A2.** `settings_state.test.ts` now checks that `afterScopeChange` clears
  the sets when a set is selected and `defaultsFor` is undefined. With the
  `state.selectedSetKeys.length === 0` condition dropped, that test failed and
  the other 462 passed; the change was reverted.
- **S1.** The restating line comment above `withPrune` is deleted.
- **S2.** The `is_record.ts` docstring no longer lists its callers.
- **S5.** Both `setPrune(true, scope)` calls carry a one-line comment saying
  the write stores the scope's defaults.

Re-run: `npx vitest run upgrades ui/app/tabs` from the fork at `d1de72abc`
(58 files, 463 tests pass; 461 at `218234677`).
