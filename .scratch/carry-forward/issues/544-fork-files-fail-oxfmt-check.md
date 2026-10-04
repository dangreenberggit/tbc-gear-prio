Status: open
Type: task
Origin: docs/reviews/feat-run-progress-panel.md (finding M3, round 2); owner 2026-10-03: "Note the fork formatter issue as something blocking pre-pr."
Blocks: pre-pr
Blocked by: none
Related: 542, 306

# Fork tab files fail the fork formatter (oxfmt)

## What is wrong

The fork's formatter, `oxfmt` (0.62.0, config `.oxfmtrc.json`), would
rewrite lines in the Upgrades-tab files. No repo gate runs it: `git grep
"oxfmt\|fmt"` over `scripts .github .githooks package.json` finds nothing,
and `check_fork_lint.py`, `run_verify.mjs` and `merge_to_dev.py` have no
format step. The scoped format check recorded as passing in
`.scratch/stage-gate/upgrades-ui-quality/fork-gates.md:34` (2026-08-27,
ticket 306) had gone stale before ticket 542.

Lines oxfmt would change, per file and fork commit (round-2 reviewer,
`git -C <fork> show <rev>:<path>` piped through
`node ./node_modules/oxfmt/dist/cli.js -c .oxfmtrc.json --stdin-filepath=<path>`):

| File | 9b11bf214 | 7d4d69d6a |
| --- | --- | --- |
| `ui/core/components/individual_sim_ui/upgrades_tab.tsx` | 82 | 89 |
| `ui/core/components/individual_sim_ui/upgrades/run_progress.ts` | absent | 3 |
| `ui/core/components/individual_sim_ui/upgrades/run_progress_panel.tsx` | absent | 3 |

Ticket 542 (fork commit `8fcdc6fb9`) added the 7 extra lines in
`upgrades_tab.tsx` and the two new files' findings. The two new files are
not in the scoped owned list
(`.scratch/stage-gate/tickets-306-308/fmt-owned-files.txt`).

## Why it blocks pre-PR

Owner ruling: the fork formatter must pass before a pull request is
opened. Re-check from the fork checkout:

```
node ./node_modules/oxfmt/dist/cli.js -c .oxfmtrc.json --check <files>
```

## Done when

- `oxfmt --check` exits 0 on every file in the scoped owned list.
- The owned list includes `upgrades/run_progress.ts` and
  `upgrades/run_progress_panel.tsx`.
- The formatting change is its own fork commit with no other edit, and the
  repo re-pins to it (`data/wowsims-fork.lock.json`), with the layout gate
  re-run, because `upgrades_tab.tsx` is a layout-gate input.
- Decide whether a gate should run the scoped check, so it cannot go stale
  again; record the decision here.
