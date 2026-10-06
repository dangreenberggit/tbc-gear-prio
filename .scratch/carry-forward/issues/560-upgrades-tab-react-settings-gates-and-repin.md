Status: open
Type: task
Origin: stage 558-upstream-react-port, branch feat/upstream-react-port (fork branch feat/upgrades-tab-react, in the port worktree C:/Users/dgree/Code/lulz/tbc-gear-prio-wt-react-port)
Blocks: none
Blocked by: the output of stage 558-upstream-react-port part P1; 559 (part P2) for the shared `UpgradesTabBody` layout and the row testids the layout gate reads; 558 (part P4) because the fixture re-record and the desktop golden happen once, after P4's universe refresh; the Vercel skills `composition-patterns` and `react-best-practices` installed and listed
Related: 558, 559

# Upgrades tab on React: settings-side parity, gates, fixture re-record and the final re-pin

## Owner's words this serves

> We should be up to date with wowsims.

> I am concerned with the fork and it's upgrade tab only.

(2026-10-05, session `ce6ca879`, `.scratch/stage-gate/555-557-silence-followups/decision-log.md:74`)

> I am an experienced react developer and will be watching closely for skilled react practices and conventions, so please make me proud -- no overloaded react components or sloppy hook use. keep it tight.

> there will have to be a smart and efficient way to check that it's being done right (for example if we're just testing the layout/ui we shouldnt test a button by running a 5 hour sim process)

(2026-10-05/06, session `52d5f63f`, `.scratch/stage-gate/558-upstream-react-port/brief.md`)

## Goal

The settings half of the old tab (`cb561067:ui/core/components/individual_sim_ui/upgrades_tab.tsx`, line ranges below) exists again as React components under `ui/features/upgrades/components/` on `feat/upgrades-tab-react`; the fork's own gates that the main repo drives are re-created against the React tab; the tab fixtures are re-recorded once on the new engine with an SME verdict; the desktop gate runs; the fork is re-pinned for the last time before the merge ask. This is the last part before `feat/upstream-react-port` may merge to `dev` (session ruling, Gate B round 1; P1-P4 all landed).

Features:

- Sources filter: a `Dialog` of grouped checkboxes with a summary line (1143-1153, 1360, `sourceOptions` 2300, `refreshSourceFilter` 2359-2412).
- Sim-set chips from presets and saved gear sets, with an "Other sets (n)" disclosure (`refreshSetChips` 2546-2653, `guaranteedSetsAvailable` 2441-2491, `defaultGuaranteedSetKeys` 2491); selected-set prune (`pruneEffective` 1763). Upstream `Chip`.
- Phase selector: upstream has no phase picker component; the sim phase is `useSimStore('phase')` and `sim.setPhase` (`ui/features/gear/components/SelectorModal/ItemList.tsx:59,140`). Build one on `EnumPicker`, `data-testid="phase-selector"`. Eligible-candidate count (`updateEligibleCount` 1694-1714, `effectivePool` 1832-1859).
- View toggles set-potential and BiS-only (`ViewToggle` 183-270, `refreshViewControlVisibility` 2277); the visible candidate cap behind `?upgrades-dev` (1445-1490) on top of P1's `DEV_FLAGS.cap`, filling `RunSettings.candidateCap`.
- Staleness marking on gear, talents, settings, raid and encounter changes (`wireStalenessListeners` 1579-1617, `run_staleness.ts`): `hooks/useRunStale.ts` on `useStoreSubscribe(subscribePlayerChange(player), …)` (`ui/sim/state/subscriptions.ts:173`, `ui/sim/hooks/useStoreSubscribe.ts`), comparing the live inputs with the ones `run.result` captured at start. P1 ships no stub (review F11).
- Status line with polite and alert live regions (`statusContent` 2189, `renderAnnouncement` 2151, 1228-1249); pre-run description (952, 2085).
- Collapsible run settings at narrow widths (1106-1110, 1518-1521).
- Dev fixture file input (1538-1554; on P1's `utils/fixture.ts` and `useFixtureAutoload`).
- `data-runner` attribute on the pane, written from the runner the run used (desktop gate S1, `scripts/check_desktop_tab.py:11`).

Gates and records:

- `scripts/tab-fixtures/record.mjs`: finish the two `// P3` lines P1 left (`#phase-selector` → `[data-testid="phase-selector"]`, `.item-picker-root` → the upstream gear-picker testid, found by reading `ui/features/gear/components/`); update `data/tab-fixtures/README.md` record commands (`--expect-gear-file ui/druid/feralcat/…` → `ui/specs/druid/feralcat/…`), with `TBC_FORK_PORT=5174`.
- Scripted Stop check (G5): on `test-tab-harness.mjs`, Run, wait for 5 rows, Stop, assert the stopped state and no console error; exposed as a fork script and run before each fork commit that touches the run path.
- `tools/run-tab-cdp.mjs` made to run against the React DOM; `test-layout.mjs` (CDP layout and a11y at three widths) and `test-review.mjs` (per-ticket capture manifest for gate-visual) re-created with `[data-testid=…]` selectors; `data/wowsims-fork-layout.lock.json` and `data/wowsims-fork-a11y-baseline.json` re-baselined; `scripts/check_layout_gate.py` and `scripts/check_desktop_tab.py` selectors updated. The layout gate's `dist` build is grepped for `upgrades-runner`, `__upgradesFixture` and `replayFixture` (must print nothing: the dev-only paths are compiled out, plan § Dev-only flags).
- Re-record the five fixtures **once**, after P4's universe refresh and after the last engine-input change in this part (`corepack pnpm tab-fixtures:record`, same gear starts, previous-phase preset per memory `project-test-default-gear-previous-phase`; 15-25 minutes for the five, one past recording hung at 25 minutes, so keep the run guard); commit the JSON with the new `forkSha`; `tab-fixtures:check` with no stale warning.
- SME verdict: spawn `gate-sme` (model `opus`, foreground) on the re-recorded fixtures against `git show dev:data/tab-fixtures/<name>.json`, every rank move ≥ 3 places or sign change, per `sme-rank-review`; `sme-verdict.md` in the stage folder with no "stop" finding.
- Desktop gate: `corepack pnpm desktop-gate:check` hand-run, lines (a)-(h) recorded in `desktop-gate.md`; a red (h) regenerates the golden with `--update-golden` and explains the diff (`docs/agents/upstream-catch-up.md`). It runs before the final fork re-pin, which is the one `dev` will receive.
- Final re-pin: fork commit, `data/wowsims-fork.lock.json` `commit` → tip, `_comment` closes the "interim" notes P1 wrote, `corepack pnpm -C $WT verify`; `pre-merge-review` on the branch.
- **Hand-back (plan § Two checkouts, "End of the run"; review F30).** After the review file is committed: both worktrees clean; `git -C $MAIN/vendor/tbc-new-fork worktree remove $FORK`; `git -C $MAIN worktree remove $WT`; `git -C $MAIN/vendor/tbc-new-fork switch feat/upgrades-tab-react`, delete the old branch's ignored leftovers that `git status --porcelain --ignored` lists (`ui/core/index.ts`, `ui/core/**/*_auto_gen.ts`, `ui/core/proto/`, `…/adapters/local.wcl-credentials.ts`; never `git add` them), `npm --prefix $MAIN/vendor/tbc-new-fork ci`, `make -C $MAIN/vendor/tbc-new-fork proto`; `git -C $MAIN switch feat/upstream-react-port`; the fork clone's HEAD equals the lock's `commit`; `corepack pnpm -C $MAIN verify` rc=0; then the merge-ask summary listing P1-P4 as landed, and on the owner's yes `corepack pnpm -C $MAIN merge-to-dev` (`merge_to_dev.py` checks out `dev` in its own cwd, so it runs from `$MAIN`).

## Checks (test ladder)

L0-L2 per feature (settings reducer, staleness with `mockSubscriptions`, phase selector, sources filter, cap and view toggles); L2b before each fork commit, against P1's `baseline.md`; L4 and L5 (`layout-gate:check`, `tab-review`) for each feature's `Visual acceptance:` block at three widths with axe; L6 through the scripted Stop check and `run-tab-cdp.mjs --candidates`; L7 once before the final re-pin; L8 once at the very end. Every chunk that writes React code ends with the React review gate as `plan.md` § React review gate describes, with its prompt core verbatim: a blocking or material finding is fixed in the chunk, or ledgered with a reason; the session dispositions every ledgered row at Gate C. Fork tools run as `npm --prefix $FORK run …` or with `$FORK` as cwd, never `npx --prefix $FORK`.

## Done means

- Each feature renders from the fixtures through `pnpm tab-fixtures:smoke` and is judged in a `Visual acceptance:` block at 3 widths with axe results.
- `pnpm layout-gate:check` exits 0 against the re-baselined lock; `pnpm tab-review` runs a manifest end to end; the scripted Stop check passes; `desktop-gate.md` and `sme-verdict.md` exist; the `dist` grep prints nothing.
- `react-review-<chunk>.md` for every chunk; `pre-merge-review` React-practices axis: no `pending` row; the merge ask lists P1-P4 as landed and names the fork tip the lock pins.

## Seam contract

- From P1: `useUpgradesRun(runFn)` → `{run, start(settings), stop(), dispatchFixture}`; `RunSettings` (`iterations`, `candidateCap?`, `excludedSources?`, `guaranteedSetKeys?`, `prune?`; P1 passes `iterations` and, from `DEV_FLAGS` only, `candidateCap`); `utils/dev_flags.ts` as the single dev-flag reader; `UpgradesTabBody` two-column layout with `RunControls` as the only settings; `test-tab-harness.mjs` working on `TBC_FORK_PORT`; `test-layout.mjs`/`test-review.mjs` stubs; `tools/run-tab-cdp.mjs` copied, not runnable; `record.mjs` with two `// P3` lines; `window.__upgradesRanking` for `record.mjs`; the port worktree's dev server started by hand on 5174 (`cd $FORK && node node_modules/vite/bin/vite.js serve --port 5174 --strictPort`; no launch.json entry).
- From P2: the sub-tab results layout and the row testids (`upgrades-item-name`, `upgrades-bis-badge`, `upgrades-set-bonus`, `upgrades-cutoff-arm`, `upgrades-table-scroll`, `upgrades-tab-tabs`, `upgrades-tab-left`); P3 does not touch `components/ResultsTable/`.
- From P4: the fork's `model/data/` universes refreshed from the `42c75dc9` engine, with their PROVENANCE table, already committed and re-pinned.
- Assumed about P3: settings state is one `useReducer` in `hooks/useUpgradesSettings.ts` (linked transitions: set selection changes prune visibility and the eligible count); no new global store slice unless P2 already switched to the plan's option (b).

## What P1's planning learned that this part needs

- Upstream's `SimTabPane`s are all `keepMounted` (`ui/app/SimTabs.tsx:37-41`), so the tab mounts at page load; subscriptions must be cheap and must not run sims until the user clicks.
- `useStoreSubscribe`'s `read` may only touch live model state (`ui/sim/hooks/useStoreSubscribe.ts:6-20`); a captured prop is answered one notification late.
- Upstream's `IndividualSimHost` gives `getSavedGearStorageKey()` and `individualConfig` (`ui/sim/sim_host.ts:45-57`) for the saved and preset sets.
- `features/**` may not import the store writers `patchSlice`, `patchKeyed`, `seedKeyed`, `deleteKeyed` (`.oxlintrc.json:135-137`); go through a facade in `ui/sim`.
- Upstream's preset picker testids: `preset-group-phase-tabs`, `saved-data-set-chip`, `saved-data-set-name`, `preset-configuration-picker-root`; P1 already moved `record.mjs:224-234` to them. The tab strip is `[data-testid="sim-tabs"]`, panels `sim-tab-panel`.
- The desktop gate needs `run-tab-cdp.mjs`, `data-runner`, `--candidates` (default 40) and a golden per (spec, phase, cap) (`scripts/check_desktop_tab.py:11,33,66,91-92`).
- The old fixtures' `forkSha` `cb561067` stays readable because the old fork branch is kept and the fork worktree shares its objects; `check_tab_fixtures.py` warns on stale and errors only on an unknown sha.
- Ruling 8 (ADR-0036, written by P1): the fork follows upstream `master` by merge; a routine fork update is the short procedure in `upstream-catch-up.md`, and the desktop gate is needed only for a re-pin that `dev` receives.
