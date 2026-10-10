Status: closed
Type: task
Origin: docs/reviews/feat-tab-settings-persist.md
Blocks: none
Blocked by: none
Related: 589

# Tighten the ticket-589 tests and two small leftovers

Round 3 of the pre-merge review of `feat/tab-settings-persist` (fork
`vendor/tbc-new-fork` branch `feat/upgrades-tab-react` at `0ba3765ec`)
found no blocking or medium problem. These low findings each need a small
code change in the fork, all in test files or comments.

- **A12, test theatre.** `ui/app/tabs/UpgradesTabBody.unopened.test.tsx:12-16`
  sets `loaded.data` once, from a `vi.mock` factory, and never resets it, so
  the two `it.each` cases at lines 58-67 share it. The Adversarial axis ran
  the new tests against `b2f9293a2` in a scratch copy: the "spec with none"
  case failed only because the ret case had already loaded the data, and run
  alone (`-t "spec with none"`) both cases fail by the 5 s timeout, not at
  `expect(loaded.data).toBe(false)`. Make each case start with the data not
  loaded (for example `vi.resetModules()` and a reset of the flag) and make
  the old code fail at the assertion, not by timeout.
- **A13, coverage gap.** `ui/features/upgrades/lazy_load.test.ts:115-117`
  checks `import()` only in `UpgradesTabBody.tsx`. An `import()` of the
  store added to `model/phase_changes.ts` or `model/saved_entry.ts` passes
  every `lazy_load` test. Also require `dynamicImports` of each `EAGER_FILES`
  entry to be empty.
- **S17.** `lazy_load.test.ts:26-35` copies the 8 aliases of the fork's
  `tsconfig.json` `paths`. A new alias makes `resolveSource` return
  `undefined` and the walk stop there without an error. Read the aliases
  from `tsconfig.json`, or fail on an `@`-prefixed specifier that matches no
  alias and no package.
- **SP7, missing test.** With the tab closed, a phase round trip (for
  example 4 to 3 to 4) keeps a source exclusion the middle phase does not
  offer; with the tab open it is dropped. Round 3 accepted this behaviour
  (Disposition D-r3-2), but no test pins the closed-tab round trip: the
  "keeps every other saved choice" test in `UpgradesTabBody.unopened.test.tsx`
  is a single 3 to 4 change. Add a test for the round trip.
- **S14, Comment policy.** `ui/features/upgrades/model/run_session.test.ts:49`
  keeps the doc comment "Lets every promise callback already queued run, so
  a dropped result has had its chance to land." with no code under it; the
  `settled` helper it described moved to `testing/fake_tab_host.ts`. Delete
  it.
- **S15, duplicated code.** `isRecord` is defined three times:
  `model/saved_entry.ts:20`, `model/saved_settings.ts:27`,
  `utils/fixture.ts:60`. `saved_settings.ts` already imports from
  `saved_entry.ts`; export it once from there.

Done when the six items above are done or each is closed here with a reason,
`npx vitest run upgrades ui/app/tabs` passes in the fork, and the fork is
re-pinned (`data/wowsims-fork.lock.json`, `pnpm sim-implemented-effects:generate`,
`pnpm verify`).

## Closing note (2026-10-09, feat/tab-store-actions)

Fork `bfde23961` ("Tighten the lazy-load and unopened-tab tests"), on top of
`8fe77ed76` (the tab's actions moved into its zustand store), pinned by `d40bd2fd`
on `feat/tab-store-actions`.

- **A12.** `UpgradesTabBody.unopened.test.tsx` calls `vi.resetModules()` and
  registers the data mock again with `vi.doMock` before each case, and imports
  the tab body and the page modules after that. A plain reset was not enough:
  with the hoisted `vi.mock` and `vi.resetModules()`, the second case passed
  against the regression below, because the mock's factory did not run again.
  The cases that load or could load the data get a 30 s timeout, because the
  data takes over 5 s to load cold. Red check: with the old code's phase-change
  `import()` of the store put back in `UpgradesTabBody.tsx`, both cases fail
  with "expected true to be false" when run together and when each runs alone
  (`-t "spec with none"`), not by timeout.
- **A13.** The eager-file test also requires `dynamicImports` of each
  `EAGER_FILES` entry to be empty. Red check: an `import('./data/data')` added
  to `model/phase_changes.ts` fails it.
- **S14.** The orphan comment in `run_session.test.ts` is deleted.
- **S15.** `isRecord` is exported once from `model/saved_entry.ts`;
  `saved_settings.ts` and `utils/fixture.ts` import it.
- **S17.** `lazy_load.test.ts` reads the aliases from the fork's
  `tsconfig.json` `paths`, and a new test checks that `@features/` is among
  them and that every alias names a directory that exists.
- **SP7.** New test "keeps, through a phase round trip, an exclusion the middle
  phase does not offer": a ret page at phase 4 with the tab closed, a saved
  exclusion that the phase-4 pool offers and the phase-3 pool does not, phase
  4 to 3 to 4; the saved entry keeps the exclusion and resets the sets. The
  test finds the source key from the bundled pools, so the premise is checked.

Re-run from the fork at `bfde23961`: `npx vitest run upgrades ui/app/tabs`
(58 files, 458 tests pass).
