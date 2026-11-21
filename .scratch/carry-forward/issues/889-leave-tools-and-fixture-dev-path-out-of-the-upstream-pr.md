Status: open
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
