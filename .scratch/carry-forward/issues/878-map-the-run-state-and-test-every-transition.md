Status: open
Type: task
Origin: .scratch/agent-reports/2026-11-13-general-task-xstate-adoption.md (§ 3, "The cheaper middle path"); owner "yes to your recommendations", 2026-11-13
Serves: .scratch/plans/upgrades-tab-finish-line.md
Blocks: none
Blocked by: none
Related: 526, 559, 563

# Map the tab's run state and test every status and event pair

## Why

The owner asked what adopting XState would take. The answer was "don't
adopt": it needs an edit to the fork's upstream `package.json`, and the tab
already has the cheap version, a tagged union with pure transition functions
(report above, § Result first). What it lacks is a written map of the run
lifecycle and a test that covers every pair, not picked cases. The owner
approved this path on 2026-11-13.

All fork paths are under `ui/features/upgrades/model/` in
`vendor/tbc-new-fork`, read at `tbc-new-fork@1410a775e` (the commit `dev`'s
`data/wowsims-fork.lock.json` pins).

## What exists

- `RunState` in `run_state.ts:72-81`: `idle`, `running` (with
  `stopping: boolean`), `done`, `stopped`, `error`.
- Pure transitions in `run_state.ts`: `runStarted` (:97), `fixtureLoaded`
  (:107), `rowLanded` (:114), `stopRequested` (:117), `runSettled` (:124),
  `runFailed` (:131). Each one that takes the current state returns it
  unchanged when the run id is not the current running one (`isCurrentRun`).
- `run_session.ts` holds the rest of the machine outside the union: the
  `AbortController` (:84), the run-id counter (:88, read back from the store
  on remount), and `start` / `stop` / `loadFixture` / `dispose` (:91-150).
- `run_state.test.ts` has 27 `it(` blocks of picked cases.
- No `.states.md` file for the run lifecycle exists
  (`ls ui/features/upgrades/model/*.states.md` finds none).

## What to do

1. Run the `state-map` skill on `run_state.ts` and `run_session.ts`. Write
   `model/run_state.states.md`: the state table (states, events, side
   effects, unknowns, and what enforces each transition) and a Mermaid
   `stateDiagram-v2` view.
2. Add one table-driven test. Statuses: `idle`, `running`,
   `running+stopping`, `done`, `stopped`, `error` (6). Events: start,
   fixture, row, stop, settle complete, settle partial, fail (7). Each pair
   runs with the current run id and with an older one (2). That is
   6 × 7 × 2 = 84 cases, built by loops and checked against an
   expected-next-state table written out in the test.
3. Any pair the test shows doing something the map calls wrong: file it as
   its own ticket, unless the fix is one line.

## Done when

- `model/run_state.states.md` exists with the table and the Mermaid view.
- The new test runs all 84 cases and passes in the fork's test run.
- The fork change is re-pinned on `dev` (`docs/agents/paired-worktrees.md`
  § Re-pin after a fork change).

## Out of scope

- XState or any new dependency.
- The session cases the report lists (remount mid-run, Stop with no
  controller, `dispose` then a late settle). Add them to the map's unknowns;
  test them here only if they fit the same table.
