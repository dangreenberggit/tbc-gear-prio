Status: closed
Verified by: tbc-new-fork@3f7ce2166 (branch `upgrades-tab-pr` on dangreenberggit/tbc-new); checks in the closing note
Type: task
Origin: .scratch/carry-forward/issues/885-settle-before-the-upstream-pr.md (owner ruling, 2026-11-20)
Blocks: pre-pr
Blocked by: none
Related: 885, 344

# Leave `tools/` and the fixture dev path out of the upstream PR

## What to do

The owner ruled on ticket 885 that the fork's `tools/` and the fixture dev
path stay out of the upstream pull request. They stay on the fork branch,
because this repo's gates need them:

- `ui/features/upgrades/tools/` holds `export_equip_eligibility.mts`, which
  `pnpm equip-eligibility:check` runs (`scripts/check_equip_eligibility.py:55-56`),
  a step of `pnpm verify`.
- The fixture dev path (`?upgrades-fixture=<name>`) is how the layout gate,
  `pnpm tab-review` and `pnpm tab-fixtures:smoke` open a made-up result
  (`scripts/tab-harness/tab_fixtures.mjs:13-14`, `scripts/tab-fixtures/smoke.mjs:68`).

So the PR branch drops them in a commit of its own when the PR is cut. That
is a code change, not only a file list: on fork `300e10e4b` these files read
the fixture path or the dev flags (`grep -rln "utils/fixture\|dev_flags\|FixtureFileInput\|useFixtureWindowHooks\|DevTools"`
under `ui/features/upgrades`, tests left out):

- `utils/fixture.ts`, `utils/dev_flags.ts`, `utils/run_fn_for_flags.ts`
- `components/DevTools/` (`FixtureFileInput.tsx`, `index.ts`)
- `hooks/useFixtureWindowHooks.ts`
- importers to unhook: `components/UpgradesTab/UpgradesTabBodyInner.tsx`,
  `components/RunSettingsPanel/RunSettingsPanel.tsx` (the dev-only candidate
  cap), `hooks/useUpgradesStore.ts`, `model/saved_settings.ts`,
  `model/settings_state.ts`, `utils/format.ts`

The dev flags also show the candidate cap, so decide on the PR branch
whether that control goes with them.

## Done when

The PR branch has no `ui/features/upgrades/tools/`, no `?upgrades-fixture`
path and no file that imports one, and the fork's own tests, type check,
`oxlint` and `oxfmt --check` pass on it.

## Closing note (2026-11-20)

The PR branch is `upgrades-tab-pr` on the fork's `origin`
(dangreenberggit/tbc-new), at `3f7ce2166`. It is `feat/upgrades-tab-react`
at `c2a0d88c3` plus one commit, `3f7ce2166` ("Leave the dev tools,
test-page setup and candidate cap out of the PR"). No pull request is
open. `feat/upgrades-tab-react` and `data/wowsims-fork.lock.json` did not
move, so our gates still run with `tools/` and the fixture path.

**To re-cut after `feat/upgrades-tab-react` moves:** make a fresh branch
from its new tip and cherry-pick `3f7ce2166`. Tested on a scratch branch at
`c2a0d88c3`: it applied with no conflict and gave the same tree
(`3f9be31ad`). A later tip that edits the same lines (the run settings,
the store, the run session or their tests) will need a hand merge.

**What the commit removes:** `ui/features/upgrades/tools/`;
`utils/fixture.ts`, `utils/dev_flags.ts`, `utils/run_fn_for_flags.ts`;
`components/DevTools/`; `hooks/useFixtureWindowHooks.ts`;
`model/replay_run.ts` (the `?upgrades-runner=replay:` path); the store's
and run session's `loadFixture`; and the fixture strings in the locale
file and its schema. Each file's tests go with it.

**The candidate cap goes too.** A player could not reach it: the picker
was in the page but `hidden` unless `?upgrades-dev` was set, that flag was
read only when `import.meta.env.DEV` or `VITE_TBC_TAB_FIXTURES=1`, and the
cap was never saved (`saved_settings.ts` left it out). So the commit
removes `components/CandidateCapPicker/`, the cap in the tab's settings,
store, inputs signature and assumptions line, and the `candidates_label`
string. The engine's own `candidateCap` input in `model/engine/rank.ts` is
unchanged; the tab no longer sets it.

**Checks on `3f7ce2166`** (fork worktree
`/home/daniel/Code/lulz/tbc-wt/upgrades-tab-pr`, Node v22.23.2, after
`npm ci` and `make ui/generated/proto/api.ts go-to-ts` as the fork's
`run_tests.yml` does):

- `npm run test:locales`: `en/upgrades.json is valid`.
- `npm run fmt` (`oxfmt . --check`): `All matched files use the correct format.`
- `npm run lint:js` (`oxlint --max-warnings 0 ./ui`): no findings, exit 0.
- `npm run type-check`: exit 0.
- `npm run test:unit`: 333 files passed, 1 failed; 2809 tests passed, 1
  failed. The failure is upstream's `ui/i18n/locale_keys.test.ts`: it
  cannot see i18next plural keys, so it misses
  `upgrades_tab.results.below_cutoff_group` and `..._title`
  (`BelowCutoffGroup.tsx`). It fails the same way on `c2a0d88c3` before
  this commit, so it does not come from this ticket. It will fail the
  upstream PR's CI and needs its own fix on `feat/upgrades-tab-react`.
- `git grep -nE "features/upgrades/tools|upgrades-fixture|dev_flags|utils/fixture|/fixture'|fixture\.ts" upgrades-tab-pr -- ui assets schemas`
  and `git grep -nE "useFixtureWindowHooks|FixtureFileInput|DevTools|run_fn_for_flags|replay_run|CandidateCapPicker|loadFixture|DEV_FLAGS" upgrades-tab-pr -- ui assets schemas`:
  no matches.
- `git diff --stat upstream/master...upgrades-tab-pr -- . ':!ui/features/upgrades'`:
  the same 7 files as on `feat/upgrades-tab-react` (the locale file, its
  schema, `ui/app/SimTabsSection.tsx`, `ui/app/tabs/UpgradesTabBody*`).
  No other upstream file changed.
