Status: closed
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

## Progress 2026-11-17 (ticket 344's branch, `chore/344-pr-prep`)

The tab moved since this ticket was filed: its files are now every file the
fork added, under `ui/features/upgrades/` and `ui/app/tabs/UpgradesTabBody*`.
Upstream CI runs `npm run fmt` (`oxfmt . --check`,
`.github/workflows/run_tests.yml`), so the whole fork must pass, not a scoped
list. Fork commit `5d688dd2a` is oxfmt alone over the 42 TypeScript files
that failed (38 under `model/engine/`, plus `model/set_bonus_tip.ts`,
`model/set_bonus_tip.test.ts`, `components/SetBonusPopover/SetBonusPopover.tsx`
and `ui/app/tabs/UpgradesTabBody.unopened.test.tsx`); each file's AST is
unchanged. What still
fails, from the fork checkout:

```
npx oxfmt --check $(git diff --name-only --diff-filter=A 24606be6b HEAD)
```

22 files, all `ui/features/upgrades/model/data/*.json`. They are byte copies
of this repo's `data/presets/` and `data/universes/` files, which
`pnpm fork-universes:check` compares as bytes, so formatting them in the
fork alone breaks that gate. Which way out is the owner's call, held in
ticket 885 § What should ship ("Formatting of `model/data/*.json`"): an
`ignorePatterns` entry in the fork's `.oxfmtrc.json`, or
`scripts/sync_fork_universes.py` writing oxfmt's JSON layout on both sides.
This ticket does the work once that is ruled.
No gate runs oxfmt yet; once the JSON is settled, adding
`oxfmt --check` to `scripts/check_fork_lint.py` keeps this from going stale.

## Closed 2026-11-20 (ticket 885, branch `chore/885-pre-pr-cleanup`)

The owner ruled the JSON way out in ticket 885 (§ Rulings): the sync script
writes oxfmt's layout on both sides, and the fork's `.oxfmtrc.json` is not
edited. The 22 `model/data/*.json` copies moved to that layout (fork
`a46cb03fd`), with their sources here. The gate question is decided: yes.
`scripts/check_fork_lint.py` now runs the fork's `oxfmt --check` over every
file the fork changed since `branchedFrom`, so the check cannot go stale.
The "layout gate re-run" item named `upgrades_tab.tsx`, which no longer
exists; the tab files that replaced it changed in this branch only where
review fixes needed it, and `pnpm verify` runs on the re-pin.

Verified by: `pnpm run fork-lint:check` ("fork lint check ok at fork commit dadfad891b40: ... oxfmt clean over the 247 files changed since 24606be6bae2") and `npx oxfmt --check .` in the fork ("All matched files use the correct format", 1512 files) on tbc-new-fork@dadfad891b40a1832245cf47c32d2500057deaa4; review in docs/reviews/chore-885-pre-pr-cleanup.md
