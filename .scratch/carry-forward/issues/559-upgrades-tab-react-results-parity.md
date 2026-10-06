Status: closed
Type: task
Origin: stage 558-upstream-react-port, branch feat/upstream-react-port (fork branch feat/upgrades-tab-react, in the port worktree C:/Users/dgree/Code/lulz/tbc-gear-prio-wt-react-port)
Blocks: none
Blocked by: the output of stage 558-upstream-react-port part P1 (the React tab core on upstream 42c75dc9); the Vercel skills `composition-patterns` and `react-best-practices` installed under `~/.claude/skills/` and listed in the session
Related: 558, 560

# Upgrades tab on React: results-side feature parity

## Owner's words this serves

> We should be up to date with wowsims.

> I am concerned with the fork and it's upgrade tab only.

(2026-10-05, session `ce6ca879`, `.scratch/stage-gate/555-557-silence-followups/decision-log.md:74`)

> I am an experienced react developer and will be watching closely for skilled react practices and conventions, so please make me proud -- no overloaded react components or sloppy hook use. keep it tight.

> before executing the react coding, we are going to bring in vercel labs agent skills globally, and the react coding will have reviews using composition-patterns and react-best-practices skills

(2026-10-05/06, session `52d5f63f`, `.scratch/stage-gate/558-upstream-react-port/brief.md`, "Owner's React bar" and "Amendment 2026-10-06")

## Goal

The results half of the old tab (old fork branch `feat/upgrades-tab`, `cb561067:ui/core/components/individual_sim_ui/upgrades_tab.tsx`, line ranges below) exists again as React components under `ui/features/upgrades/components/` on branch `feat/upgrades-tab-react`, meeting the React bar (rules R1-R7 and I1 in the stage's `plan.md`). Features, with the old implementation to read for behaviour (not to copy):

- Sub-tab strip: Shopping List plus one tab per populated slot (`renderSubTabs` 2669-2775, `slotPaneContent` 2978, `slotsInView` 3746). Use upstream `TabNav`/`TabPanels` inside `Tabs.Root`, as `ui/app/tabs/BulkTabBody.tsx:45-52` does.
- Shortlist plus a below-cutoff group (`rowsTable` 2994-3084, `expandableRowGroup` 3143-3203, `resultsContent` 2851). Use upstream `Accordion` for the disclosure.
- Mid-run table filling as rows land, and empty states (`landedRowsTable` 2945, `emptyState` 2923); P1's `UpgradesResults` already switches on `run.status`.
- Sortable columns rank, item, slot, ΔDPS, source, favorite, batch (611-766, `sortableResultsTableHead` 3085, `toggleResultsSort` 3132). Use upstream `MetricsTable` with `useMetricsTable` (`ui/features/results/hooks/useMetricsTable.ts`, on `@tanstack/react-table` 9.2.4, already a dependency); sort state is table-local.
- Row: item cell with icon, quality colour and wowhead link; source cell (`item.sources`, since `getSourceInfo` is gone); owned-row greying; set-name tags; percent-cutoff note (`resultRow` 3204-3292, `itemCell` 3539-3616, `rowTagLabels` 3520).
- ΔDPS popover with the set-bonus breakdown (`setBonusPresentation` 3420-3500, helpers 364-610, `ownSwapBreaks` 3501, `removedItemsLine` 3380). Use upstream `Popover` with its `testId` prop.
- Favorite and batch toggles per row (`gear_picker/item_toggles.tsx`) against upstream's sim filters (`host.sim.getFilters().favoriteItems`) and Bulk's item list (`addBulkItems` in `features/bulk/model/items.ts`), through their existing writers, never `patchKeyed` directly.
- Baseline summary (`baselineSummaryContent` 2238), substitutions list (`substitutionsContent` 3673), assumptions to console (`logAssumptions` 3617).
- ThatsMyBis export with token/gear-id flavour (1282-1309, 1391-1420, `updateExport` 3322, `exportIdForRow` 3359). Use upstream `CopyButton`.

## Checks (test ladder, `test-ladder.md` § 3)

- Inner loop: L0 (`type-check`, `lint:js`) and the folder run L1/L2 (`npx vitest run ui/features/upgrades`, about 10 s). L2b (`npm run test:unit`, compared with P1's `baseline.md`) before each fork commit.
- Mid-run filling is an L2 test on a `running` state with `landedRows` from `testing/ranking.fixture.ts` (extend the fixture for popovers and tags), and is seen in a browser through P1's replay runner: `?upgrades-runner=replay:<fixture>` then Run (L4r, seconds, no WASM).
- Each feature's `Visual acceptance:` block uses fixture replay (L4: Browser pane `http://localhost:5174/tbc/tab-fixtures/` or `TBC_FORK_PORT=5174 pnpm tab-fixtures:smoke`), never a live run.
- One L6 Stop check at the end of the part (Run, 5 rows, Stop on `/tbc/paladin/retribution/`). No L8: P2 changes no engine input.
- Every chunk that writes React code ends with the React review gate exactly as `plan.md` § React review gate describes (its prompt core verbatim: skills loaded or read from disk, Next.js and server rules skipped by name, R1 wins a conflict): a blocking or material finding is fixed in the chunk, or ledgered with a reason; the session dispositions every ledgered row at Gate C; the ledger is `react-review-<chunk>.md` in the stage folder.

## Done means

- Each feature above renders from the five `data/tab-fixtures/*.json` through `pnpm tab-fixtures:smoke` (exit 0) and is judged in a `Visual acceptance:` block per the plan template.
- Formatting and selection logic are pure functions under `ui/features/upgrades/model/` or `utils/` with vitest tests in the fork.
- Every new string is an `upgrades_tab.*` key (rule I1); every element a script or test finds carries `data-testid` with the old class name verbatim (`ui/STYLING.md:185`): `upgrades-item-name`, `upgrades-bis-badge`, `upgrades-set-bonus`, `upgrades-cutoff-arm`, `upgrades-table-scroll`, `upgrades-tab-tabs`, `upgrades-tab-left`, which P3's layout gate reads.
- `react-review-<chunk>.md` for every chunk, no undispositioned row; `pre-merge-review` React-practices axis: no `pending` row.

## Seam contract (what P1 gives this part)

- `ui/features/upgrades/model/` holds the engine (`rank.ts`, `view.ts`, `set-bonus.ts`, ...) unchanged in behaviour; `model/run_reducer.ts` with `RunState` (`idle | running{runId, startedAt, landedRows} | done{result & durationMs} | stopped{result & durationMs} | error{message}`), the `fixtureLoaded` action and `RunSettings`; `model/run.ts` with `createRunContext(host, env)` and `rankForPlayer: RunFn` (`RunFn = (host, settings, {signal, onLanded, runContext}) => Promise<Ranking | PartialRanking>`; the runner bundle is created lazily through `runContext()` and lives one per mounted tab); `model/replay_run.ts` (`replayRows(ranking): RunFn`) and `utils/select_run_fn.ts` (`replayFixture(name)`, `selectRunFn`); `model/progress_channel.ts` (`subscribeProgress`, `clearProgress`).
- `hooks/useUpgradesRun(runFn)` returns `{run, start(settings), stop(), dispatchFixture}`; `UpgradesTabBody` calls it once and passes `run` down as props. If P2's tree needs it more than two levels deep, add a React context provider in `UpgradesTabBody`, not a store slice. `hooks/useFixtureAutoload({onLoaded, currentRanking})` is the only `window` toucher among the hooks; it installs `window.__upgradesFixture(payload)` (returns `{ok, rows}` or `{ok: false, reason, detail}`) and `window.__upgradesRanking`, behind `__TBC_TAB_FIXTURES__`, with `useEffectEvent` for its callbacks.
- `components/UpgradesResults/UpgradesResults.tsx` switches on `run.status`; `components/ResultsTable/{ResultsTable,ResultRow}.tsx` render the flat table with `data-testid="upgrades-results-table"`. P2 replaces `ResultsTable` with the sub-tab layout and keeps that testid on each rendered table. `components/RunProgress/RunProgressDialog.tsx` subscribes to the channel itself (a copy of `BulkProgressDialog`); `StatusLine` shows "Took Ns" from `durationMs`.
- `utils/format.ts`, `utils/dev_flags.ts` (`readDevFlags` pure, `DEV_FLAGS` read only in `UpgradesTabBody`; every read of `__TBC_TAB_FIXTURES__` is `typeof`-guarded and tests stub it with `vi.stubGlobal`), `testing/ranking.fixture.ts`, and the `upgrades_tab.*` i18n subtree in `assets/locales/en/translation.json`.
- Command forms: fork tools run as `npm --prefix $FORK run …` or with `$FORK` as cwd; never `npx --prefix $FORK` (plan § Two checkouts).
- Assumed about P2: it adds no new global store slice and no new run kind, unless a distant reader appears, in which case it moves run status and results to a store slice behind a `ui/sim` facade and records the switch to the plan's option (b); row identity keys are the engine's candidate ids; it reads no dev flag outside `UpgradesTabBody`.

## What P1's planning learned that this part needs

- Upstream bans class hooks (`ui/no_class_hooks.test.ts` in `npm run test:unit`); `ui/retired_class_names.json` lists 746 retired names, so an old class name may not come back as a class. Upstream's own suite fails at `42c75dc9` on one warlock token (plan C47); compare with `baseline.md`, never "fix" the upstream file.
- Upstream's lint fails on any `react-hooks/exhaustive-deps` warning (`.oxlintrc.json:237-238`, `lint:js` uses `--max-warnings 0`); `ui/**` imports carry no `.js` extension (`import/extensions`).
- `features/*/model/**` may not import React or touch `window`/`document`/`localStorage`/`navigator` (`.oxlintrc.json:94-96,176`).
- Upstream's run-state pattern is Bulk's (`features/bulk/model/run.ts:21-38`, `ui/sim/settings/bulk_settings.ts:42-46`); P1 deviates on purpose (reducer in the tab) and says why in `plan.md` § Run state.
- The old tab persisted nothing in localStorage of its own; favorites persist through upstream's sim filters.
- The WCL import modal was dead code on the old branch; it is not ported.
- All work happens in the port worktree; the owner's checkout and its fork clone are never switched or edited (plan § Two checkouts).

## Carried from P1 (stage 558-upstream-react-port)

- **Rank column (review K4-R2).** P1's Rank column shows each row's position in the table, as the old tab did. Rows that the engine left unranked (`rank: null`, because they are below the cutoff or were not simmed) still get a number, and mid-run the number is the landing order. When this part rebuilds the shortlist and the below-cutoff group, decide whether the column shows the engine's rank (`row.rank`) with a blank for `null`. The K4 reviewer recommends the engine's rank; the desktop gate's golden reads the first cell (`td[0]`), so a change here also changes what P3's golden compares. Source: `.scratch/stage-gate/558-upstream-react-port/react-review-K4.md` row K4-R2; `decision-log.md` row K4-R2 (2026-10-06T04:31Z).
- **Stop does not abort in-flight sims.** Measured in P1's live check: after Stop, the progress dialog stays open 18.7 s (ret) and 36.3 s (feral), and rows that finish in that time are kept (5 rows at the click become 9 for ret and 10 for feral). So the status text "The rows below finished before Stop" is not exact. Cause: `WorkerPoolSimRunner.run` registers each sim on its own private `SimSignalManager`, but nothing calls `abortType` on abort (`ui/features/upgrades/model/adapters/worker_pool_sim_runner.ts:199-217` in the fork). The old branch has the same lines (`cb561067:ui/core/components/individual_sim_ui/upgrades/adapters/worker_pool_sim_runner.ts:193-211`), so P1 inherited the defect. Done when Stop aborts the in-flight sims (or the status text matches what happens), with a test. Source: `.scratch/stage-gate/558-upstream-react-port/live-check.md` (Stop rows and findings); `execution-report.md` § K5; `decision-log.md` row K5-18-stop-latency (2026-10-06T14:11Z).

## Closing note (2026-10-06, stage 558-p2-results-parity, chunk K4)

Closed by the P2 stage. Fork `feat/upgrades-tab-react` tip `b15f397cbb2288d44f6bc2e8b43567460648c29e` (17 commits `f5cbe17e6..b15f397cb` past `54a7d5263`). Main `feat/upstream-react-port` re-pin commit `e513e322`, which moves `data/wowsims-fork.lock.json` to that tip. `pnpm verify` rc=0 on that commit. Nothing pushed, nothing merged.

- Smoke: `TBC_FORK_PORT=5174 pnpm tab-fixtures:smoke` rc=0. Rows per fixture: 22, 22, 18, 42 and 36.
- Visual acceptance: every feature passes, judged by the `gate-visual` seat on 30 captures of `ret-p3-p2` and `feral-p3-p2bis` at 1280 and 768 px. Handoff: `.scratch/handoffs/visual-review-558-p2-K4.md` (owner's checkout). Three features no fixture contains are proved by L2 tests instead: the dropped-candidates list by `SubstitutionsList.test.tsx`, and removed-worn lines and owned greying by `ResultRow.test.tsx`.
- React review gates: `react-review-K2.md` and `react-review-K3.md` in the stage folder. Every row has a disposition. The `pre-merge-review` React-practices axis has not run yet; the orchestrator runs it next.
- Carried item, Rank column: kept as position within its own table, as the old tab did on an owner ruling (ticket 287). The below-cutoff group restarts at 1.
- Carried item, Stop: option (a). Stop aborts no sim, and the status text says what happens: "Stopping — finishing the current step." in the progress dialog, then "Stopped early. … The rows below finished before Stop." This follows the owner's ruling Q-559-stop-abort: "Stop resulting in a fairly quickly graceful finish of currently running sims is fine for now." The L6 check (ret, previous-phase preset gear) measured Stop → dialog closed in 7.12 s. There were 5 rows at the click, 9 rows were kept, and no console error appeared (`.scratch/stage-gate/558-p2-results-parity/live-check.md`, gitignored). A real abort is filed as ticket 563.
- Deviations from this ticket's text, recorded in the stage plan's Decisions: `MetricsTable` is not used, and one sort is shared across every pane and the export instead of a sort per table (old-tab parity, ticket 280). Each reason is in `plan.md` § Approach.
