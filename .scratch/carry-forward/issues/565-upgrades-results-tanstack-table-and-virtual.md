Status: closed
Type: task
Origin: stage 564-tab-state-zustand, plan step 8 (`.scratch/stage-gate/564-tab-state-zustand/plan.md`, Q-564-libraries, gitignored, owner's checkout); split out of ticket 564
Blocks: none
Blocked by: 560
Related: 564, 560

# Upgrades results: TanStack table for sorting, virtual rows for long lists

## Owner's words this serves

> Yes, the UI kit is generic and less interesting (well, not necessarily interesting) but the other ones particularly tanstack tools seem on point.

Source: the owner in chat, 2026-10-06, logged in `C:/Users/dgree/Code/lulz/tbc-gear-prio/.scratch/stage-gate/558-p3-settings-gates/decision-log.md` (gitignored, owner's checkout).

The rule on existing wowsims files is the one in `C:/Users/dgree/Code/lulz/tbc-gear-prio/.scratch/stage-gate/565-upstream-sync-tanstack/brief.md` § "The wowsims-file rule" (gitignored, owner's checkout): the fork edits one existing wowsims file, `ui/app/SimTabsSection.tsx` (6 approved lines), and every other edit to an existing wowsims file needs the owner's approval of that exact edit first.

## Goal

The Upgrades tab's results tables use the two TanStack libraries that upstream's own UI already uses, in place of the tab's hand-written sorting and its full list of rendered rows:

- `@tanstack/react-table` for sorting and column state;
- `@tanstack/react-virtual`, so only the visible rows are in the DOM.

## Where the code is

Fork: `C:/Users/dgree/Code/lulz/tbc-gear-prio/vendor/tbc-new-fork`, branch `feat/upgrades-tab-react`, tab files under `ui/features/upgrades/` (none of them exists in wowsims). The fork has both libraries (`package.json:30` `@tanstack/react-table` 9.2.4, `:31` `@tanstack/react-virtual` 3.14.10). The harness scripts that read result rows live in the main repo: `C:/Users/dgree/Code/lulz/tbc-gear-prio/scripts/tab-harness/` (`rows.mjs`, `run-tab-cdp.mjs`, `test-layout.mjs`, `test-stop.mjs`, `test-tab-harness.mjs`) and `scripts/tab-fixtures/smoke.mjs`.

## Rules

- Start after ticket 560 closes (done).
- No edit to an existing wowsims file except the approved 6 lines in `ui/app/SimTabsSection.tsx` (check: `git -C <fork> diff --numstat --diff-filter=M 5262ff386bd1 HEAD` prints only `6	0	ui/app/SimTabsSection.tsx`, and `--diff-filter=D` prints nothing).
- The layout gate and the desktop golden move only through a green measured gate run, never `--update-baseline`.

## Done when

- [x] `model/results_sort.ts` is gone and sorting goes through `@tanstack/react-table`; the sort order of every pane and of the export is the same as before. Fork `707456ecb` "Sort the results tables through TanStack Table" (sort state in the tab's zustand store, `hooks/useResultsTable.ts`, `model/results_columns.ts`; the 11 cases of the old `results_sort.test.ts` ported to `hooks/useResultsTable.test.tsx` plus descending cases); fork `8c6a33f43` deletes `model/results_sort.ts` (`grep -rn results_sort <fork>/ui/features/upgrades` prints nothing).
- [x] The results tables render rows through `@tanstack/react-virtual`. Fork `8c6a33f43` "Render only the visible results rows" (`hooks/useVirtualRows.ts` with `useVirtualizer` on the `<tbody>` rows; hidden panes unmounted with `keepMounted={false}`, a prop wowsims' `TabPanel` already has). `ui/ui-kit/VirtualList` was not used: it renders `<div>` rows at one fixed `rowHeight` and never measures, and the tab's rows vary in height (stage 565 plan § Approach P2 (c), gitignored). Measured on `ret-p3-p2` at 1280 x 900 with the below-cutoff group open: 29 of 451 rows rendered, no blank band, last row reached (`.scratch/stage-gate/565-upstream-sync-tanstack/parts/P2/virtual-measurements.md`, gitignored).
- [x] Each script that counts rows counts the rows it means on the new DOM and passes. Main `577ee5d8` "Read virtualised result rows in the tab harness": `grep -rn 'tbody tr' scripts/tab-harness scripts/tab-fixtures` prints nothing; `pnpm tab-fixtures:smoke` rc 0 (counts halved because hidden panes are unmounted, e.g. ret-p3-p2 36 → 18). The Stop check (`test-stop.mjs`, live, fresh WASM) gives the same numbers as the baseline taken before this work: verdict pass, 5 rows at Stop, 9 rows kept (3 shortlist + 6 below cutoff), "Your current gear: 2,082.7 DPS" (`parts/P2/stop-baseline-k3.log` and `parts/P2/stop-565.log`, gitignored).
- [x] The layout gate and the desktop golden were checked once, after this work, by measured runs. `pnpm layout-gate:check` rc 0, measured, 0 failed, `testedTabHash` advanced to `5b2a408050dc...` in `data/wowsims-fork-layout.lock.json`. `pnpm desktop-gate:check` rc 0, every assertion passes, `rowCount` 39 and the golden `data/desktop-gate/golden-ret-p4-cap40.json` matches unchanged, so it needed no re-baseline (`parts/P2/gates.md`, gitignored).
- [x] The fork's lint and the tab tests pass: `lint:js` rc 0; `node node_modules/vitest/vitest.mjs run ui/features/upgrades ui/app/tabs` rc 0, 54 files / 408 tests at `8c6a33f43` (`parts/P2/k4-tab-tests-2.log`, gitignored).

## Closing note (2026-10-09, stage 565-upstream-sync-tanstack)

Closed by the fork re-pin to `8c6a33f43` in `data/wowsims-fork.lock.json` (main commit "Pin the fork at 8c6a33f43 and close 565"). React reviews of both fork commits: `parts/P2/react-review-K3.md` (1 material + 2 minor, all fixed) and `parts/P2/react-review-K4.md` (1 material + 4 minor, 4 fixed, one kept with a reason), gitignored. Nothing is pushed: the fork lock's `pushed` stays false.
