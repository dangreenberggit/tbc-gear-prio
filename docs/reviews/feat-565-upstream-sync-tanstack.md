# Pre-merge review — feat/565-upstream-sync-tanstack

Reviewed range: `170600866649f4105defcdc4f78790b8e63334ec..5e61fe15f9193cc5e1e7e83d3ce3b7aa25d86e14`

Fork code reviewed with it: `vendor/tbc-new-fork` branch `feat/upgrades-tab-react`, `1b28ad0051407cccbec6529c930d7d42456e52cc..eb001011204553de5bd9c50be5cfbc352f32290f` (the commit `dev` pins to the commit `data/wowsims-fork.lock.json` pins), limited to `ui/features/upgrades` and `ui/app/SimTabsSection.tsx`. Our fork commits are `707456ecb` (sort through TanStack Table), `8c6a33f43` (virtual rows) and `eb0010112` (library-review fixes). The merge `fedf78807` brings upstream wowsims `5262ff386` (v0.0.148); upstream's code was not reviewed, only whether ours breaks against it.

Dispatch (round 1, 2026-10-09): `codex` is not on PATH, so four fresh `general-task` subagents on Opus (effort `high`, the review lane) ran in one parallel batch: Adversarial, Domain, and the `code-review` skill's Standards and Spec sub-agents. Each was told it writes nothing. Every axis reported the fork tree clean and the main tree clean apart from the untracked `.scratch/handoffs/` files present at dispatch. No separate React-practices axis: ticket 565's React review gate ran per fork commit (`parts/P2/react-review-K3.md`, `react-review-K4.md`, `react-review-RW1.md` in `.scratch/stage-gate/565-upstream-sync-tanstack/`, gitignored).

Wowsims-file rule, run by the aggregator: `git -C vendor/tbc-new-fork diff --numstat --diff-filter=M 5262ff386bd171e6349d0f9cf00f4d762a6c9951 HEAD` prints only `6	0	ui/app/SimTabsSection.tsx`; the `--diff-filter=D` twin prints nothing (fork HEAD `eb0010112`). The Standards axis also found that our three fork commits touch only paths under `ui/features/upgrades/` (`git show --stat`).

## Adversarial

No blocking finding. The new sort gives the same order as the deleted `results_sort.ts`, ties included, and the harness reports a short read as an error (`scripts/tab-harness/rows.mjs:68`, `'read ' + seen.size + ' of ' + count + ' rows'`).

- **A1 (medium).** The harness's completeness check rests on one DOM attribute that no fork test pins. `collectRows` (`rows.mjs:47-68`) stops and returns no error once it has read `count` rows, and `count` is `<tbody data-row-count={rows.length}>` (fork `components/ResultsTable/ResultsTable.tsx:80`). Every component test mocks `useVirtualRows` (`ResultsTable.test.tsx:18` and five other files), and a grep for `rowCount|data-index|row-spacer` over the fork tests finds only `useVirtualRows.test.tsx:80`. A fork edit that sets `data-row-count` to the rendered count would make the harness read the first screen of rows as the whole ranking, with no error; layout check (15) needs only `rows > 0`.
- **A2 (low, behaviour change).** A column sort now survives a new run. Before, the sort was `useState` in `ResultsPanes` (fork `1b28ad005`, `ResultsPanes.tsx:32`), which unmounts while a run is in flight (`UpgradesResults.tsx:40-42`), so each run opened in ΔDPS order. Now the sort is in the store for the page's lifetime (`model/upgrades_store.ts:25,36`). The plan scoped "resetting it on a new run" out (`plan.md:238`) without saying the old lifetime was one run.
- **A3 (low).** `test-stop.mjs` compares the full kept count to a partial count: `atClick.nonOwned` and `names` come from rendered rows only (`:139-143`), and `rowsKeptAtLeastNonOwnedAtClick` (`:264`) checks against that partial number. Harmless at the default `--rows 5`; with `--rows` above about 30 the check weakens silently.
- **A4 (low).** The layout-gate digest does not hash the fork's `package.json` or `package-lock.json`, so an upstream bump of `@tanstack/react-virtual` (3.14.10, `package.json:31`) alone would skip the measured run. Ticket 580's scope is met; a missing root file hashes as `<absent>` (`check_layout_gate.py:352-357`), so the gate cannot pass while missing one.
- **A5 (latent, hypothesis, untested).** TanStack caches each row's column values while `data` is the same array (`createCoreRowModel.js` `memoDeps: [data]`). A new `dpsKey` over the same rows array would sort ΔDPS on stale values. Safe today: `dpsKey` and the row arrays both change with `ranking` and `withSetPotential` (`hooks/useResultsView.ts:38-46`).
- **A6 (minor, test theatre).** `upgrades_store.test.ts` "notifies nobody when given the sort it already holds" tests a same-reference path TanStack never takes, since it always passes a new array.

Test theatre otherwise clean: `useResultsTable.test.tsx` mocks no TanStack internals and covers every case of the deleted `results_sort.test.ts` except "leaves its input alone", which TanStack makes moot (`createSortedRowModel.js`, `rows.slice()`).

Accepted trade-offs, judged: (a) Firefox measurement untested — acceptable; an `undefined` `measureElement` falls back to virtual-core's default rounded measure (`virtual-core index.js:128-140`, undefined options skipped at `:284`), the cost is a few pixels of spacer drift, and the harness runs only in Chromium. (b) `useFlushSync: false` — acceptable; the cost is visual only, and a late render makes `collectRows` report "read N of M", never a short list without an error. (c) 43 px estimate — acceptable; it only sizes rows not yet measured, and each measured height replaces it (`hooks/useVirtualRows.ts:15,99`).

Unexamined: fork unit tests and `pnpm verify` were not run (Vitest writes a cache inside the fork); row geometry for rows measured before icons load; upstream code in `fedf78807` beyond the `sim-ui` test id and `TabPanel` `keepMounted`.

## Domain

**Domain: clean.** The engine pin moved from upstream `42c75dc9` to `5262ff386` (v0.0.148, `git tag --points-at 5262ff386`). `git log --oneline 42c75dc9..5262ff386` lists two commits, and `git diff --stat 42c75dc9 5262ff386` changes only `ui/styles/theme/z-index.css` (one line), nothing under `sim/` or `proto/`. The artifacts agree: in `data/wowsims.lock.json` only `tag`, `commit`, `watchedRefs.master` and `proto.commit` change and every file sha256 stays; the pool listings change only their "pinned from" line (db.json sha `6b708ebb…`, 8256 items, 451 stubs unchanged); `data/sim-implemented-effects.json` changes only the fork commit. `CURRENT_PHASE` still comes from upstream (`5262ff386:ui/sim/constants/other.ts:12`, `Phase.Phase3`; lock `currentPhase: 3`). The sort keys are the deleted `results_sort.ts` keys: ΔDPS sorts on `dpsSortKeyFor` (`results_view.ts:130`), the key `applyView` ranks on; the click behaviour (`sortDescFirst`, no removal, no multi-sort) and engine-order ties match. Test fixture items are copied unchanged from the deleted test.

Unexamined: the WCL lanes (no WCL code in the diff); `sync_wowsims.py --check` was not run (hypothesis, untested: it passes).

## Standards + Spec

### Standards

No documented code rule is broken. Fork rule clean (above).

- **S1 (hard, commit rule 6).** `6a8d2a17`'s body has a 73-character line ("No pinned blob or proto changed between 42c75dc9 and 5262ff38 (v0.0.148);"); found with `git log --format=%b 170600866649..5e61fe15 | awk 'length>72'`.
- **S2 (hard, Durable claims).** `docs/fork-upstream-touchpoints.md:34` says "The fork commit is `fedf78807`, the commit `data/wowsims-fork.lock.json` pins"; the lock pins `eb0010112`, and its "246 A, 1 M" count is 251 A at `eb0010112` (`git -C vendor/tbc-new-fork diff --name-status 5262ff38 eb0010112 | cut -f1 | sort | uniq -c`). The one-modified-file conclusion still holds.
- **S3 (minor).** The fork lock's `_comment` says `8c6a33f43` deletes "model/results_sort.ts and its test"; the test was deleted in `707456ecb` (`git show --diff-filter=D --name-only --format= 707456ecb`).
- **S4 (minor, added by the aggregator).** `data/wowsims-fork-layout.lock.json`'s `_comment` still lists the theme CSS as `ui/styles/theme/{breakpoints,colors,spacing,typography,vars}.css` and the harness as `test-layout.mjs, test-tab-harness.mjs, test-review.mjs`; `6f9b2bf8` added `effects.css`, `specs.css`, `z-index.css` and `rows.mjs` to the digest but changed only the hash line (`git show --stat 6f9b2bf8`; `grep -n testedTabHash data/wowsims-fork-layout.lock.json`).
- **S5 (judgement).** `6f9b2bf8`'s subject ("Hash every theme file") and `check_layout_gate.py:178` say every theme file the tab loads is in the digest; `ui/styles/theme/index.css`, which holds the `@import` list, is not (`git -C vendor/tbc-new-fork ls-tree --name-only eb0010112 ui/styles/theme/`, 10 files, against 8 in `LAYOUT_FILES`). A new `@import` added there by upstream would not move the digest.
- **S6 (judgement, Durable claims).** `eb0010112`'s body and the `useFlushSync` comment in `hooks/useVirtualRows.ts` give "up to 262 px in headless Chrome" with no command a reader can re-run.
- **S7 (judgement).** The merge subject of `fedf78807` is 71 characters; it is git's default merge text.
- **S8 (possible Duplicated Code).** The same `vi.mock('../../hooks/useVirtualRows', ...)` factory is in six fork test files.
- **S9 (possible Duplicated Code, Mysterious Name, Middle Man).** The literal `'[data-testid="upgrades-result-row"]'` is repeated in `run-tab-cdp.mjs:425`, `test-layout.mjs:119,179` and `test-stop.mjs:128`, though `rows.mjs` exports it as `RESULT_ROW`; `resultRowsSelector` (`test-tab-harness.mjs:376`) now selects the `<tbody>`, copies `RESULT_ROWS`, and has no user (`git grep`); `rowCountExpression = documentRowCountExpression` (`:401`) is a bare alias.
- **S10 (possible Middle Man).** `ResultsTableHead.tsx:9` `const SORT_COLUMNS: readonly ResultsSortKey[] = SORT_COLUMN_IDS;`.
- **S11 (possible Primitive Obsession).** `ResultsSort = Array<{ id: string; desc: boolean }>` in `model/upgrades_store.ts`, `id` a plain string; `ResultsTableHead.tsx` declares its own `SortDir`.
- **S12 (possible Duplicated Code).** `ResultsPanes.tsx:50-53` builds the pane id list a second time for `rowsByPane`, and `:84` falls back to `?? paneRows(view, pane.id)`, which cannot be reached because both lists come from the same ids.

Unexamined: upstream code in `fedf78807`; test bodies (case names and mocks only); generated `data/` files beyond diffstat; `pnpm verify` and the regens.

### Spec

The branch does what tickets 565 and 580 and the stage brief asked for; no required item is missing. All twelve library-review findings are present at `eb0010112` (Z-1 to Z-4, T-4 to T-8 hold; T-1, T-2, T-3 with the caveats below), with file:line evidence in the axis report.

- **SP1 (partial).** The live Stop check was not re-run after `eb0010112`. Plan step 17: "the Stop check ran live on a fresh WASM build and gave the recorded numbers". `parts/P2/stop-565.log` is from `8c6a33f43` (file time 10:03, `eb0010112` committed 11:28 the same day); `eb0010112` changed `ProvisionalResultsTable` (`ResultsTable.tsx:50`), the in-flight table `test-stop.mjs` reads, and `useFlushSync`. Whether the result changes is a hypothesis, untested.
- **SP2 (partial).** Ticket 565's closing note named fork `8c6a33f43`, "408 tests" and "11 cases ported"; at the tip the pin is `eb0010112`, the tab tests are 410 (`parts/P2/rw1-tab-tests.log`), and one ported case was dropped under T-7.
- **SP3.** The closing edit rewrote the "Done when" lines: "re-baselined once" became "checked once … by measured runs", "(an L2 test per sort key)" went, and the React-review rule was dropped (`git diff 170600866649..5e61fe15 -- .scratch/carry-forward/issues/565-*`). The underlying work meets the original wording: each sort key has a test in both directions (`useResultsTable.test.tsx:98-121`), three React ledgers exist, the layout `testedTabHash` advanced by a measured run, and the desktop golden matched unchanged.
- **SP4 (scope).** `6f9b2bf8` edits `check_layout_gate.py`, which the plan listed as out of scope ("Adding `rows.mjs` to the layout gate's hashed file list"); it was filed as ticket 580 and closed on this branch at Gate C (decision-log rows from 17:32Z).
- **SP5 (scope).** `model/results_view.ts`, `utils/format.ts` (one line each) and the new `hooks/useUpgradesStore.test.ts` are outside the plan's file list; the decision log accepts them (rows K3-11b, Gate C).
- **SP6 (looks wrong).** The plan's step 14 judging sentence says "with no blank band, no jump"; `useFlushSync: false` (`useVirtualRows.ts:106`) brings back a first-frame blank of 19-27 px per half-screen step and the whole view after a jump (`parts/P2/rw1-virtual-measurements.md:26`). The decision log says it was "disclosed to the owner" (row 2026-10-09T18:49Z T-2); no owner reply is recorded.
- **SP7 (looks wrong).** T-1's guard does not stop measuring in Firefox: `measureElement: IS_FIREFOX ? undefined : …` (`useVirtualRows.ts:99`) falls back to virtual-core's default rounded measure (`virtual-core/dist/esm/index.js:282-285`). The code comment says so; Firefox is untested.

Unexamined: tests, lint, type-check and gates were not run; the 44 universe regenerations and the lock `_comment` contents beyond S3; `plan-review.md` in full.

## Summary

No blocking finding on any axis. The upstream pull changed one CSS line and no data, the new sort matches the old one, and the fork still edits only the six approved lines of `ui/app/SimTabsSection.tsx`. Before the merge ask, eight items need a change the reviewer may not make (listed under "Fix before merge"), the most important being a fork test for the row-count attribute the harness trusts (A1) and a re-run of the live Stop check at the tip (SP1). Two findings become tickets: 581 (layout-gate digest gaps) and 582 (sort survives a new run, owner ruling Q-565-sort-across-runs). Ticket 565's closing note was corrected in the review commit (SP2).

## Fix before merge

These findings need a code, data or doc change that the review may not make. Each gets a `fixed` row in a later `## Disposition` section when its fix lands.

- **A1:** a fork test that renders `ResultRows` with the real `useVirtualRows` (no mock) and asserts `data-row-count` equals the ranked count, plus `data-index` and the spacer rows; then re-pin the fork.
- **A3:** `test-stop.mjs` asserts that the rows it read at the click equal the landed count, or reads them through `collectRows`.
- **S2:** `docs/fork-upstream-touchpoints.md:34` names `eb0010112` and the 251 A count, with its commands run at `eb0010112`.
- **S3:** the fork lock `_comment` says `707456ecb` deleted `results_sort.test.ts`.
- **S4:** the layout lock `_comment` lists the eight theme files and `rows.mjs`.
- **S9:** the harness scripts use `RESULT_ROW` from `rows.mjs`; delete `resultRowsSelector` and the `rowCountExpression` alias. `test-layout.mjs` and `test-tab-harness.mjs` are in the layout digest, so this needs a measured layout-gate run.
- **S12:** `ResultsPanes.tsx` builds the pane ids once and drops the unreachable fallback (with A1's fork commit).
- **SP1:** re-run the live Stop check (`test-stop.mjs`, fresh WASM) at the final fork tip and record the numbers against `stop-565.log`.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                        |
| --- | ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A2  | Adversarial | defer       | `.scratch/carry-forward/issues/582-upgrades-sort-survives-a-new-run.md` — blocked on owner ruling Q-565-sort-across-runs                                                                                             |
| A4  | Adversarial | defer       | `.scratch/carry-forward/issues/581-layout-gate-digest-misses-package-pins-and-theme-index.md` — fork package pins                                                                                                    |
| A5  | Adversarial | wontfix     | latent only: `dpsKey` and the row arrays change together today (`hooks/useResultsView.ts:38-46`)                                                                                                                     |
| A6  | Adversarial | wontfix     | the test checks the store function's own contract (`setSort` with the same reference); harmless that TanStack never calls it that way                                                                                |
| S1  | Standards   | wontfix     | one character over in an unpushed body line; rewriting seven commits for it costs more than it fixes                                                                                                                 |
| S5  | Standards   | defer       | `.scratch/carry-forward/issues/581-layout-gate-digest-misses-package-pins-and-theme-index.md` — `theme/index.css`                                                                                                    |
| S6  | Standards   | wontfix     | the figures, the script and the result file are now recorded in ticket 565's addendum (this review's commit); the script itself is gitignored, so the claim stays a pointer to a local measurement                   |
| S7  | Standards   | wontfix     | git's default merge subject for an upstream merge                                                                                                                                                                    |
| S8  | Standards   | wontfix     | `vi.mock` is hoisted per file; a shared factory module would save three lines per file and add an indirection                                                                                                        |
| S10 | Standards   | wontfix     | not a middle man: the annotation widens the `as const` tuple to `readonly ResultsSortKey[]` for `.map` and `.includes`                                                                                               |
| S11 | Standards   | wontfix     | `ResultsSort` mirrors TanStack's `SortingState` so `model/` imports no TanStack (library finding Z-3)                                                                                                                |
| SP2 | Spec        | fixed       | this review's commit: ticket 565 addendum names `eb0010112`, 410 tests, the dropped T-7 case, the Stop-check gap and ticket 582                                                                                      |
| SP3 | Spec        | wontfix     | the work meets the original wording (three React ledgers, measured layout run, desktop golden unchanged); the original text stays in history at `170600866649`                                                       |
| SP4 | Spec        | wontfix     | ticket 580 fixed a real digest gap found during the run and was accepted at Gate C                                                                                                                                   |
| SP5 | Spec        | wontfix     | one-line follow-on edits and a test file, accepted in the decision log (rows K3-11b, Gate C)                                                                                                                         |
| SP6 | Spec        | wontfix     | trade-off judged acceptable: a 178-262 px upward jump is worse than a one-frame blank that the next frame fills; settled blank is 0 (`rw1-virtual-measurements.md:17`); no owner reply is recorded to the disclosure |
| SP7 | Spec        | wontfix     | the comment states it; the harness runs only in Chromium; no drivable Firefox on this machine                                                                                                                        |
