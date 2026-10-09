Status: closed
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

## Carried from P1 (stage 558-upstream-react-port)

- **Source labels are English.** P1 renders the engine's `SOURCE_LABELS` text, not `upgrades_tab.*` i18n keys, because the desktop golden compares that text. When this part re-derives the golden, move the labels to `upgrades_tab.*` keys (rule I1). Source: `.scratch/stage-gate/558-upstream-react-port/execution-report.md` K4 ledger ("engine English `SOURCE_LABELS` kept (golden compares text)"); `decision-log.md` row K4-source-labels-not-i18n (2026-10-06T04:31Z).
- **Capped run's 48 s tail.** P1's capped live run (ret, `?upgrades-dev&cap=10&iterations=500`) landed its last row at 16.3 s and finished at 64.3 s, with no new row in the 48 s between. Which `rankUpgrades` stage runs in that gap was not recorded (hypothesis: the post-sim stages; untested). When this part re-records the fixtures, measure the stage times; fix the gap or explain it. Source: `.scratch/stage-gate/558-upstream-react-port/live-check.md` (capped-run row and "Capped run tail"); `decision-log.md` row K5-18-capped-tail (2026-10-06T14:11Z).

## Carried from P4 (stage 558-p4-engine-move)

- **Tab fixtures name the old Mug id.** The four feral tab fixtures
  (`data/tab-fixtures/feral-p2-malorne4.json`, `feral-p3-nordrassil4.json`,
  `feral-p3-p2bis.json`, `feral-p3-th-hands-legs.json`) embed a rotation
  that casts the Mug of Direbrew as item 38287. Upstream `42c75dc9` replaced
  that id with 281739, and the new engine silently drops a cast on an id it
  does not know: a worn 281739 Mug is never pressed (808.70 DPS against
  826.65 with the cast on 281739; measurement C27). When this part
  re-records the fixtures, record them with the engine's id 281739. Re-run:
  `grep -c 38287 data/tab-fixtures/*.json` (4 feral files today). Source:
  `.scratch/stage-gate/558-p4-engine-move/engine-delta.md`, section "C27"
  (gitignored, owner's checkout).

## Carried from P2 (stage 558-p2-results-parity)

- **Below-cutoff group column alignment** (visual advisory A1): when the below-cutoff group is open, its columns sit about 40 px left of the shortlist header, because the group table has no head of its own and sizes its columns separately. Evidence, in the gitignored stage folder of the owner's checkout: `C:/Users/dgree/Code/lulz/tbc-gear-prio/.scratch/stage-gate/558-p2-results-parity/captures/ret-p3-p2-1280-04-slot-below-cutoff-open.png`, and A1 in `C:/Users/dgree/Code/lulz/tbc-gear-prio/.scratch/handoffs/visual-review-558-p2-K4.md`. P3's layout work fixes it or records a ruling on it.
- **Quality-colour coverage** (visual advisory A4): every row in P2's captures is epic, so only one quality colour was judged. P3's re-recorded fixtures or its layout gate include at least one non-epic row.
- **559's review condition:** ticket 559's done line includes "`pre-merge-review` React-practices axis: no `pending` row". 559 was closed at the end of P2 with that review still pending (559's closing note). The branch's `pre-merge-review` before the merge ask covers P2's fork code, `54a7d526..b15f397cb` on `feat/upgrades-tab-react`, on that axis.

## Closing note (2026-10-07, stage 558-p3-settings-gates, chunk K6)

Done on `feat/upgrades-tab-react` (fork) and `feat/upstream-react-port` (port worktree). Stage records are in the owner's checkout under `.scratch/stage-gate/558-p3-settings-gates/` (gitignored).

- **Pins.** Fork tip `43e3963d6b296806e407fdd9ba88f78bda083104`, 29 commits past `b15f397cb` (chunks K1-K6 and ticket 564; listed by chunk in `data/wowsims-fork.lock.json` `_comment`). The lock names that tip; port tip at the re-pin `1cf24330` ("Re-pin the fork to the React Upgrades tab tip"). `corepack pnpm verify` rc=0 at the re-pin (`verify-k6.log`). Nothing is pushed.
- **Settings side.** Sources dialog, sim-set chips with "Other sets (n)" and prune, phase selector, eligible count, iterations, dev-only cap and fixture input, the collapsible run card below `xl`, staleness (raid, encounter, phase, tab settings and iterations; A-K1-stale-scope), polite and alert status regions, `data-runner`. React review ledgers `react-review-K2.md` to `react-review-K6.md`, every row dispositioned.
- **Badges (ticket 430).** Done: one badge per selected set that holds the item (K3).
- **Gates.** `test-layout.mjs`, `test-review.mjs`, `test-stop.mjs` and `tools/run-tab-cdp.mjs` run on the React DOM. The layout gate passed a measured run after the re-record (`layout-k6.log`: 32 PASS, 0 FAIL, a11y 0 failing; `testedTabHash` `cea82477da02…`). Its new check 14 fails any item name split inside a word. The production bundle holds none of the dev-only names (`dist-grep.md`), and `window.__upgradesFixture` is `undefined` on the desktop binary (`desktop-gate.md`).
- **Desktop gate.** Moved from ret phase 5 to **ret phase 4 from the P3 preset** (session ruling Q-560-desktop-phase: ret has no phase-4 preset, so phase 5 has no previous-phase start gear). Green with a new golden `data/desktop-gate/golden-ret-p4-cap40.json`; the phase-5 golden is removed. A capped run shows 39 rows, not 40: one worn item is inside the first 40 and owned rows are not listed (`CAPPED_ROWS` in `scripts/check_desktop_tab.py`; `desktop-gate.md`).
- **Fixtures.** All five re-recorded once, each with `forkSha` `43e3963d6b29…`. The recordings ran on the native backend. The reason, recorded only in the gitignored `record.md`, is that in-page WASM ran a feral run past the recorder's 25 min guard; that cause is a hypothesis, untested here: no committed log shows the run. `grep -c 38287` is 0 in each file, which settles the carried P4 Mug item. `tab-fixtures:check` shows no stale input. The two `packages/core` fixture tests were re-pinned and pass, 36 passed and 0 skipped (`fixture-tests.md`).
- **SME.** `C:/Users/dgree/Code/lulz/tbc-gear-prio/.scratch/handoffs/sme-rank-judgment-560-fixtures.md` (copy: `sme-verdict.md`): ret-p3-p2 trust, the four feral fixtures trust-with-caveats, no stop. Its caveat: two feral baselines fell 8 and 11 DPS with the same gear; the SME's hypothesis (untested) is upstream's feral rotation change `6163fdbff`.
- **Visual.** `C:/Users/dgree/Code/lulz/tbc-gear-prio/.scratch/handoffs/visual-review-558-p3-K5.md`: pass on all five entries.
- **Carried from P2.** A1: the below-cutoff columns sit 0 px from their heads on all seven columns at 375, 653, 768 and 1280 px (layout gate fact). A4: every fixture has non-epic rows (rare: 7, 8, 8, 8, 9 per fixture, `record.md`). The 559 review condition passes to `pre-merge-review`.
- **Carried from P1.** Source labels are `upgrades_tab.sources.*` keys (K3). The capped run's tail is the re-sim of the shown rows (`cdp-k4.md`); its progress total over-counts, ticket 566.
- **Read paths.** Per session ruling Q-564-read-paths, see the read-path table in ticket 564's closing note.
- **Tickets filed in this stage.** 566 (progress total over-counts).
- **Next, by the session.** `pre-merge-review` on the branch, whose React-practices axis covers P2's and P3's fork code. Then the hand-back (this ticket's "Hand-back"; preconditions in the stage's `progress.md`), with the owner's confirmation first. Then the merge ask.

## Closing note addendum (2026-10-07, round B2b)

- The pre-merge review's React condition is met: `docs/reviews/feat-upstream-react-port.md` rows RP1-RP6 are `fixed`, by fork `feat/upgrades-tab-react` commits `90f06c690` (RP1, RP2, RP4, RP5) and `7af542f21` (RP3, RP6). The lock pins fork `d52c8e91e`, which holds both (port `777c3c68`).
- Review row SP3: all five entries of `review-560.json` now run at 375, 768 and 1280 px. `corepack pnpm tab-review` at fork `d52c8e91e` captured 15 states with 0 errors; axe recorded 7 serious `color-contrast` failures, all on epic item names in `560-group-columns` at 375 px. The final `gate-visual` verdict is `pass` on every entry and width, with the contrast result as an advisory finding: the seat measured every epic item name at about 3.3 to 3.9 : 1 in every state, including the earlier captures, so the 560 work did not introduce it. Handoff and captures: `C:/Users/dgree/Code/lulz/tbc-gear-prio/.scratch/stage-gate/558-p3-settings-gates/visual-final.md` and `review-560-final/` (gitignored, owner's checkout).
