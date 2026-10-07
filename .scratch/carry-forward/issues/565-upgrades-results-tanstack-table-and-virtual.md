Status: open
Type: task
Origin: stage 564-tab-state-zustand, plan step 8 (`.scratch/stage-gate/564-tab-state-zustand/plan.md`, Q-564-libraries, gitignored, owner's checkout); split out of ticket 564
Blocks: none
Blocked by: 560
Related: 564, 560

# Upgrades results: TanStack table for sorting, virtual rows for long lists

## Owner's words this serves

> Yes, the UI kit is generic and less interesting (well, not necessarily interesting) but the other ones particularly tanstack tools seem on point.

Source: the owner in chat, 2026-10-06, logged in `C:/Users/dgree/Code/lulz/tbc-gear-prio/.scratch/stage-gate/558-p3-settings-gates/decision-log.md` (gitignored, owner's checkout). Ticket 564 § "Upstream libraries the owner flagged" quotes it, with the owner's rule on upstream code:

> We just don't want to run roughshod over existing code, but if we can nestle in a little stuff that very much fits, that's a possibile exception as long as it's thoughtful and I really ok it

## Goal

The Upgrades tab's results tables use the two TanStack libraries that upstream's own UI already uses, in place of the tab's hand-written sorting and its full list of rendered rows:

- `@tanstack/react-table` for sorting and column state;
- `@tanstack/react-virtual`, through upstream's `ui/ui-kit/VirtualList`, so only the visible rows are in the DOM.

## What is known

Paths are in the fork worktree `C:/Users/dgree/Code/lulz/tbc-gear-prio-wt-react-port/vendor/tbc-new-fork`, branch `feat/upgrades-tab-react`, at `178b559eaa1ccad47f22336f6f4ae5feda0eccaa`, under `ui/features/upgrades/` unless noted. Ticket 564 did not change these files (`git -C <fork> diff --stat bb6d447aa..178b559ea -- ui/features/upgrades/components/ResultsTable ui/features/upgrades/components/ResultsPanes ui/features/upgrades/model/results_sort.ts` prints nothing), so the line numbers hold at both commits.

**The fork has both libraries.** `package.json:33` `"@tanstack/react-table": "9.2.4"`, `package.json:34` `"@tanstack/react-virtual": "3.14.10"`. Upstream users: `ui/features/results/hooks/useMetricsTable.ts:45` (`useMetricsTable`) with `ui/features/results/components/MetricsTable/`; `ui/ui-kit/VirtualList/VirtualList.tsx`, used by the gear selector at `ui/features/gear/components/SelectorModal/ItemList.tsx:258`.

**The tab code each one would replace.**

- Sorting (`@tanstack/react-table`): `model/results_sort.ts` (54 lines: `ResultsSortKey`, `ResultsSort`, `nextSort` at :18, `sortRows` at :45); the sort wiring in `components/ResultsPanes/ResultsPanes.tsx:7` (import) and `:64` (the export panel's sorted rows); `components/ResultsTable/ResultsTable.tsx:43` (`sortRows(...).map(...)`); `components/ResultsTable/ResultsTableHead.tsx` (76 lines, the sortable header).
- Rows (`@tanstack/react-virtual`): the full-row `.map` at `components/ResultsTable/ResultsTable.tsx:43`, which renders every row; `ret-p3-p2` has 467 rows (stage 564 plan, Q-564-libraries).

**Why it was not done in ticket 564.**

- It was not urgent. P3 measured a settings change on `ret-p3-p2` (467 rows, 1280, dev build, n=20) at a median of 52 ms closed / 47 ms open after the K3 selection memo, and 34 / 38 ms with `memo(UpgradesResults)`, which K3 committed as 33 / 40 ms: `sed -n '26p;30p' C:/Users/dgree/Code/lulz/tbc-gear-prio/.scratch/stage-gate/558-p3-settings-gates/progress.md` (gitignored, owner's checkout). The stage 564 plan set 100 ms per settings change as the cost that would have made it part of 564.
- P3 K4 step 0 edits `ResultsTable.tsx`, `ResultsTableHead.tsx` and `DeltaCell.tsx` next (amendments A-K3-cell and A-K3-columns in `.scratch/stage-gate/558-p3-settings-gates/plan-review.md`, gitignored, owner's checkout), so a rewrite now would collide with that work.
- Scripts count results-table rows in the DOM: `git -C <fork> grep -c "tbody tr" -- '*.mjs'` lists `test-stop.mjs` (2), `test-tab-harness.mjs` (1) and `ui/features/upgrades/tools/run-tab-cdp.mjs` (2); `git -C C:/Users/dgree/Code/lulz/tbc-gear-prio-wt-react-port grep -c "tbody tr" -- scripts` lists `scripts/tab-fixtures/smoke.mjs` (1). Virtual rows would leave off-screen rows out of the DOM, so those counts would change (hypothesis, untested: depends on how the rows are virtualised). P3 K4-K6 rebuild those scripts, the layout gate and the desktop gate on the current DOM.

## Rules

- Start after ticket 560 closes (P3 K6 done and the fork re-pinned).
- No edit to an upstream-owned fork file (check: `git -C <fork> cat-file -e 42c75dc9:<path>` fails for every changed path) unless the owner approves that edit first, per the owner's rule above.
- The layout gate and the desktop golden move only through a green measured gate run, never `--update-baseline`.
- Plan it before code: a stage-gate run, or the AGENTS.md mini-loop. The React review gate (`composition-patterns`, `react-best-practices`) applies.

## Done when

- `model/results_sort.ts` is gone or reduced to the column definitions, and sorting goes through `@tanstack/react-table`; the sort order of every pane and of the export is the same as before (an L2 test per sort key).
- The results tables render rows through `@tanstack/react-virtual` (`ui/ui-kit/VirtualList` if it fits the table layout; otherwise the plan says why not).
- Each script in the row-count list above counts the rows it means on the new DOM and passes; the Stop check (`test-stop.mjs`) gives the numbers recorded for the fork tip of that time, or the difference is explained.
- The layout gate and the desktop golden were re-baselined once, after this work.
- The fork's lint and the tab tests pass (`npm --prefix <fork> run lint:js --script-shell=bash`; `node node_modules/vitest/vitest.mjs run ui/features/upgrades ui/app/tabs` in the fork, rc=0).
