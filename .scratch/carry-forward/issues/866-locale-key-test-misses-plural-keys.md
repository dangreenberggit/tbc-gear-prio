Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 (Tab-adjacent)
Type: bug
Origin: wowsims catch-up to v0.0.155, 2026-11-09 (fork unit-test baseline at `3055fa71a`)
Blocks: none
Blocked by: none
Related: 432, 626, 670

# The fork's locale-key test fails on two plural keys that exist

## What happens

`npm --prefix vendor/tbc-new-fork run test:unit` fails one case,
`ui/i18n/locale_keys.test.ts` "finds every key ui/ asks for in en", on fork
`3055fa71a` (the commit `dev` pins on 2026-11-09) and on `60a4735ea`. It
reports two keys as missing:

- `upgrades:upgrades_tab.results.below_cutoff_group`
- `upgrades:upgrades_tab.results.below_cutoff_group_bar`

Both calls pass `count`
(`ui/features/upgrades/components/BelowCutoffGroup/BelowCutoffGroup.tsx:34-35`),
and `assets/locales/en/upgrades.json:154-157` defines each key in its
i18next plural forms, `_one` and `_other`. i18next picks the plural form
from `count`, so the player should see the right text (untested: no
render of the group title was checked). The test looks only for
the bare key and does not know plural suffixes.

`fork-tests:check` in `pnpm verify` runs only the tab's own test paths
(`TEST_PATHS` in `scripts/check_fork_tests.py`), so verify stays green.

## What would close this

`ui/i18n/locale_keys.test.ts` passes on the fork tip, and still fails when a
key with no form at all (bare, `_one` or `_other`) is asked for. The test
file is upstream's; a change to it needs the owner's approval of the exact
edit.
