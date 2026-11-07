Status: open
Type: bug
Origin: .scratch/agent-reports/2026-11-07-general-task-candidate-cap-options.md (main checkout, gitignored; investigation of tickets 820 and 821)
Blocks: none
Blocked by: none
Related: 800, 820, 821

# The uncapped desktop gate run always fails its row-count check

## What a developer sees

`pnpm desktop-gate:check --spec enh --full` ran the enhancement page
(`P3 Preset`, phase 4) with no candidate cap on 2026-11-07, at fork
`c9bb0acd3`. Every check passed except (e):

```
(e) FAIL: rowCount=1024 expected=1039 eligibleCount=1039 expected_eligible=1039 cap=1092 (uncapped uses full_rows=None, C14 false)
```

The rogue page (`--spec rogue --full`) failed the same way: 809 rows against
826 eligible. Logs: `enh-full.log` and `rogue-full.log` in
`.scratch/agent-reports/2026-11-07-candidate-cap-evidence/` (main checkout,
gitignored).

The tab is right. The pool holds the items the player already wears; the tab
sims them but leaves them out of the list (the comment above `GATED` in
`scripts/check_desktop_tab.py` names fork `model/results_view.ts`
`paneRows`). So an uncapped run lists eligible minus the worn items in the
pool: 1039 - 15 = 1024 for enhancement.

## Where

`scripts/check_desktop_tab.py`, the (e) check (about line 750 at `dev`
`e905cb5f`): an uncapped run expects `full_rows`, and falls back to
`eligibleCount` when the spec's `GATED` entry has none. No entry has
`full_rows` (the comment above `GATED`, about line 174), so every `--full`
run on a page whose worn items are in the pool fails (e).

## Done when

`pnpm desktop-gate:check --spec enh --full` passes (e) on a correct run, and
so does `--spec rogue --full`. Either pin `full_rows` per spec from a
measured run, as the comment above `GATED` says, or derive the expected
count from the eligible count and the worn items in the pool. Say in the
comment above `GATED` which was chosen.
