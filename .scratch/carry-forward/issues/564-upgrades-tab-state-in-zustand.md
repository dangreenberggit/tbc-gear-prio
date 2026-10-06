Status: open
Type: task
Origin: owner request, 2026-10-06, stage 558-p3-settings-gates (`.scratch/stage-gate/558-p3-settings-gates/decision-log.md`, last line, gitignored, owner's checkout)
Blocks: 560
Blocked by: none
Related: 558, 559, 560

# Move the Upgrades tab's run and settings state into a zustand store

## Owner's words

> If wowsims used zustand we probably can do as long as we organize our store separately, basically, and can also use data across the site the way other tabs probably do (like the gear tab sim using settings elsewhere)

> Make a note of that, I think it'll be the next task we'll shoehorn in there before the next part.

Source: `C:/Users/dgree/Code/lulz/tbc-gear-prio/.scratch/stage-gate/558-p3-settings-gates/decision-log.md`, last line, logged 2026-10-06T23:45Z. The owner wrote this after reading `reducer-dispatch-explainer.html` in the same folder (the orchestrating session's account; the log line does not say it). "The next part" is chunk K4 of stage 558-p3-settings-gates (ticket 560). K4 waits until this ticket is closed.

## Goal

Today the Upgrades tab keeps its run state and its settings in two `useReducer` hooks. Only the tab can read them. Move that state into a zustand store that is organised separately from upstream's sim store. Two results follow:

- other parts of the site can read the tab's state;
- the tab reads site data the way other tabs do.

This ticket needs its own plan and plan review before any code: a stage-gate run, or the AGENTS.md mini-loop (planner, executor, independent reviewer).

## What is known

Paths are in the fork worktree `C:/Users/dgree/Code/lulz/tbc-gear-prio-wt-react-port/vendor/tbc-new-fork`, branch `feat/upgrades-tab-react`, at `bb6d447aaa5abaf817aeacf9b8d4efd77ccd6c89`. Read them with `git -C <fork> show bb6d447aa:<path>`. Line numbers are at that commit.

**The tab's two reducers and their hooks.**

- Run state: the pure reducer `runReducer` in `ui/features/upgrades/model/run_reducer.ts:86`, with types `RunState` (:59) and `RunAction` (:70). The hook `ui/features/upgrades/hooks/useUpgradesRun.ts:56` calls `useReducer(runReducer, IDLE_RUN)`. The abort controller, run id counter and run context sit in a `useRef` (:57), outside the reducer.
- Settings: the pure reducer `settingsReducer` in `ui/features/upgrades/model/settings_reducer.ts:42`, with `SettingsState` (:10) and `SettingsAction` (:21). The hook `ui/features/upgrades/hooks/useUpgradesSettings.ts:48` calls `useReducer(settingsReducer, seed, initialSettings)`. It dispatches `applyDefaults` during render when the spec or phase changes (:78).
- `ui/app/tabs/UpgradesTabBody.tsx:24-26` calls `useUpgradesRun`, `useUpgradesSettings` and `useRunStale` once each and passes the results down as props.
- The tab already reads site data in three places: `useSimStore('phase')` (`useUpgradesSettings.ts:45`), `useSavedGear()` from the gear feature (`useUpgradesSettings.ts:1`), and `useStoreSubscribe(subscribeSimChange(sim), …)` for staleness (`hooks/useRunStale.ts:18`).

**How upstream's sim store is built.** `ui/sim/state/sim_store.ts:300-301`: `createStore<SimState>()(subscribeWithSelector(() => initialState()))`, imported from `zustand/vanilla` and `zustand/middleware` (:25-26). It is one store per `Sim` (comment at :1-4; `ui/sim/state/README.md`, "Topology"). Slices are `runs`, `sim`, `ui`, `encounter`, `raid`, and four keyed by a player's `storeKey`: `players`, `reforge`, `statWeights`, `bulk` (:241-251, :327). Writes go through `patchRun`, `patchSlice`, `patchKeyed`, `seedKeyed` and `deleteKeyed` (:315-369). `git -C <fork> grep -n "createStore" bb6d447aa -- ui` finds no other zustand store in `ui/`. A separate store would be the first.

**How Bulk keeps its state and reads site state.**

- Bulk's state is not a separate store. It is the keyed slice `bulk[player.storeKey]` inside the sim store (`sim_store.ts:202-223`).
- `ui/sim/settings/bulk_settings.ts` is the facade. It seeds the slice (`seedBulkSettings`), reads it (`bulkState`), patches it (`patchBulkState`, which calls `patchKeyed`), and loads and saves a per-spec settings blob through `player.sim.env.storage`, key `bulk-settings.v2` (`loadStoredBulkSettings`, `storeBulkSettings`).
- `ui/features/bulk/hooks/useBulkState.ts` reads the slice with zustand's `useStore(player.sim.store, state => selector(state.bulk[player.storeKey]))`.
- `ui/features/bulk/model/init.ts:48-68`: `initBulk` runs once per page from `ui/app/individual_sim_ui.tsx:157`, not when the Bulk tab mounts. Its comment says the batch "belongs to the page, not to its tab: the gear tab adds items to it". It loads the saved settings, saves on every bulk change, and reloads equipped items when the player's gear changes.
- The gear tab reads and writes the Bulk batch: `ui/features/gear/components/SelectorModal/ItemListRow.tsx:1, 59, 131` (`hasBulkItem`, `addBulkItem`, `removeBulkItem`).

**What the fork's lint config forbids for store writers.** `.oxlintrc.json:119-143`, for files `ui/features/**`: `no-restricted-imports` bans importing `patchSlice`, `patchKeyed`, `seedKeyed` and `deleteKeyed` from `**/state/sim_store*`, with the message "Features must not write the store directly — go through a facade (e.g. ui/sim/bulk_settings.ts)". `.oxlintrc.json:164-188` repeats the ban for `ui/features/*/model/**` and also bans `react` and `react-dom` there. `.oxlintrc.json:93-98` bans the globals `window`, `document`, `localStorage`, `location` and `navigator` in `ui/features/*/model/**`. Two details from the same lines:

- `patchRun` is not in the banned list.
- The message names `ui/sim/bulk_settings.ts`, but the file is `ui/sim/settings/bulk_settings.ts`.

The ban covers only those four sim-store writers. Whether a store the tab creates for itself falls under any rule is unverified.

**Why P1 chose local state.** P1's plan, `C:/Users/dgree/Code/lulz/tbc-gear-prio/.scratch/stage-gate/558-upstream-react-port/plan.md` (gitignored, owner's checkout):

- Lines 111-115 weigh three options. (a) A module singleton read through `useSyncExternalStore`. (b) Upstream Bulk's split: status and results in the zustand store behind a `ui/sim` facade. P1 rejected (b) because it "edits two upstream-owned files for state only this tab reads". (c) Reducer state in the tab, with an `AbortController` in a ref. P1 chose (c) and said: "If P2 or P3 finds a distant reader, that part moves status and results to a store slice behind a `ui/sim` facade and records it as the switch to (b)."
- Line 65, rule R5: run state "lives in the tab (`useUpgradesRun`, one call in `UpgradesTabBody`, passed down as props), not in a store slice and not in a module singleton".
- Ticket 560's seam contract (`560-upgrades-tab-react-settings-gates-and-repin.md:66`) assumed the same for P3's settings: "no new global store slice unless P2 already switched to the plan's option (b)". P3's plan rejected a store slice for settings for that reason (`.scratch/stage-gate/558-p3-settings-gates/plan.md:17`, gitignored, owner's checkout).

This ticket reverses those decisions on the owner's request.

## Open questions for the planner

The planner answers these. They are not answered here.

1. **Where the store lives.** A separate zustand store that the tab owns, or a slice of upstream's sim store. The owner said "organize our store separately". Bulk is a slice inside the sim store behind a `ui/sim` facade.
2. **Which state moves.** Run state, settings, or both. Run state gains one row per `landed` action during a run, so the cost of one store write per row may matter (hypothesis, untested).
3. **What the tab reads and shares.** Which other tabs or site data the tab should read, and which of its state other parts of the site should read. The owner's example is "the gear tab sim using settings elsewhere".
4. **Persistence.** Whether any of the tab's state survives a page reload, as Bulk's settings do through `player.sim.env.storage`.
5. **The parts that depend on the current state.** How each of these fits the new store:
   - the staleness signature (`model/run_inputs.ts`, `hooks/useRunStale.ts`), including the rule that `useStoreSubscribe`'s read may touch only live model state (`ui/sim/hooks/useStoreSubscribe.ts:6-20`);
   - `MeasuredOn` and `measuredOnOf` (`model/run_reducer.ts:57, 136`), which set `data-runner` on `upgrades-tab-root`;
   - the fixture loader (`hooks/useFixtureAutoload.ts`), which installs `window.__upgradesFixture` and `window.__upgradesRanking`;
   - the replay runner (`model/replay_run.ts`);
   - the abort controller and run id now held in a `useRef`;
   - the stable holder objects that feed the iterations and cap `NumberPicker`s (P3 plan claims C37 and C46).

## Impact on stage 558-p3-settings-gates

**K1-K3 code that changes** (K1-K3 are committed; the fork tip is `bb6d447aa`). These files hold or consume the two reducers' state, so the move touches them: `hooks/useUpgradesRun.ts`, `hooks/useUpgradesSettings.ts`, `hooks/useRunStale.ts`, `hooks/useFixtureAutoload.ts`, `ui/app/tabs/UpgradesTabBody.tsx`, and their tests. `model/run_reducer.ts` and `model/settings_reducer.ts` change if the store does not reuse them as they are. Components that take the state as props (`RunSettingsPanel`, `RunControls`, `CandidateCapPicker`, `StatusLine`, `UpgradesResults`) change only if the plan has them read the store directly. This list comes from reading the hooks and the tab body; a full list of consumers is unverified.

**K4-K6 steps that need stable names.** P3's plan, steps 15-27 (`plan.md:104-124`), and the binding amendments in `plan-review.md` from line 306 drive the page by `data-testid`. They do not import the hooks. These must keep working:

- testids the K4 scripts read (step 16; amendments K2 scripting notes and K3 testids, `plan-review.md:405-427`): `phase-selector`, `gear-picker-root`, `item-picker-name`, `upgrades-run-settings`, `upgrades-run-settings-body`, `upgrades-run-settings-summary`, `upgrades-candidates-picker`, `upgrades-iterations-picker`, `upgrades-eligible-count` with its `data-count`, `upgrades-tab-root` with its `data-runner`, `upgrades-results-table`, `upgrades-below-cutoff`, `upgrades-status-alert`, `upgrades-source-row`, `upgrades-prune`, `upgrades-set-chip`. `git -C <fork> grep` finds each one in a non-test file at `bb6d447aa`;
- the iterations and cap inputs must read back a typed value at once, because step 16 keeps the "did not stick" re-read (`plan.md:105`, claims C13 and C46);
- `window.__upgradesFixture` and `window.__upgradesRanking` for the fixture-loaded gates and the re-record (steps 17, 20, 22, 24; `hooks/useFixtureAutoload.ts:29-30`), and their absence in a production bundle (steps 18, 21, 25);
- the stale scope in amendment A-K1-stale-scope (`plan-review.md:398`), which the K5 visual sentence relies on.

Unverified: whether the K4 step-0 work (A-K3-cell in `DeltaCell.tsx`, A-K3-columns in `ResultsTable.tsx` and `ResultsTableHead.tsx`) touches state at all; whether step 19's layout-gate hash set (`plan.md:111`, all of `ui/features/upgrades/**`) needs new store files added; and whether the K4 plan and amendments need rewriting beyond new file paths. The planner of this ticket checks each one and says what K4 must change.

## Done when

- The Upgrades tab's run state and settings, or the subset the plan chose and justified, live in a zustand store. The tab no longer calls `useReducer` for that state: `git -C <fork> grep -n useReducer -- ui/features/upgrades ui/app/tabs/UpgradesTabBody.tsx` prints only what the plan names.
- Code outside `ui/features/upgrades` can read that state through a named selector hook or facade, and one test shows such a read.
- The plan lists each piece of site data the tab reads, and each read goes through an existing hook in `ui/sim/hooks/` or a facade in `ui/sim/`.
- The fork's lint passes (`npm --prefix <fork> run lint:js`, rc=0), and `git -C <fork> grep -n 'lint-disable' -- ui/features/upgrades ui/app/tabs/UpgradesTabBody.tsx` prints nothing.
- Every testid listed under "K4-K6 steps that need stable names" still exists, and the fork's upgrades tests pass: `node node_modules/vitest/vitest.mjs run ui/features/upgrades ui/app/tabs` in the fork, rc=0, on the Node pin in P3 `plan.md:3`.
- The scripted Stop check gives the K1 and K2 numbers (2,082.7 DPS, 9 rows kept, in `.scratch/stage-gate/558-p3-settings-gates/stop-K1.log` and `stop-K2.log`, gitignored, owner's checkout) or explains the difference, because P3's Stop check rule covers any fork commit that touches `model/run_reducer.ts` or `hooks/useUpgradesRun.ts` (P3 `plan.md:77`).
- The change passes the React review gate (P1 `plan.md` § React review gate, `composition-patterns` and `react-best-practices`).
- The plan says what K4-K6 of stage 558-p3-settings-gates must change, and the stage's `plan-review.md` records that as an amendment before K4 starts.
