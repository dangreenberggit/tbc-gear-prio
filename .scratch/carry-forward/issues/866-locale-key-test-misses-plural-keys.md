Status: open
Serves: none (general wowsims fix, not part of the Upgrades tab; owner 2026-11-12)
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

## Comments

2026-11-12: the owner rejected the edit for the Upgrades tab: "Our job isn't
to fix wowsims files, so no, even if this sounds like a good fix it sounds to
me like it wouldn't fit in an upgrades tab PR so rejected. You can file it as
a general wowsims fix for after the tab or maybe separately before it"
(the owner's answer to the session's Q1, recorded in
`.scratch/plans/tab-polish-2026-11-12.md` Decision log, main checkout,
gitignored). So this ticket stays open as a general wowsims fix and no
longer serves the tab. `ui/i18n/locale_keys.test.ts` is upstream's file
(fork `17d64b721`, `7b539641d`; the same on upstream `master` `24606be6b`),
and upstream has no plural-aware version.

The fix to make then, tested on a temp copy of the fork on 2026-11-12. A key
resolves when the bare string exists, or every plural form of the locale
exists (`Intl.PluralRules`; for `en` that is `one` and `other`):

```diff
--- a/ui/i18n/locale_keys.test.ts
+++ b/ui/i18n/locale_keys.test.ts
@@ -20,6 +20,10 @@
 const resolve = (node: unknown, key: string): unknown =>
 	key.split('.').reduce<unknown>((current, part) => (current && typeof current === 'object' ? (current as Record<string, unknown>)[part] : undefined), node);
 
+/** The bare key, or every plural form of the locale: i18next picks `key_one` / `key_other` by `count` before the bare key. */
+const has = (node: unknown, key: string, locale: string): boolean =>
+	resolve(node, key) !== undefined || new Intl.PluralRules(locale).resolvedOptions().pluralCategories.every(form => resolve(node, `${key}_${form}`) !== undefined);
+
 /** A literal `i18n.t('a.b')`, with the namespace from an `{ ns: 'x' }` option when one is given. */
 const requests = (): Array<{ key: string; namespace: string; file: string }> => {
 	const pattern = /i18n\.t\(\s*'([^']+)'([^)]*)\)/g;
@@ -41,7 +45,7 @@
 			LOCALES.flatMap(locale => [...new Set(requests().map(r => r.namespace))].map(ns => [`${locale}:${ns}`, bundle(locale, ns)] as const)),
 		);
 		const unresolved = requests()
-			.filter(({ key, namespace }) => LOCALES.some(locale => resolve(bundles.get(`${locale}:${namespace}`), key) === undefined))
+			.filter(({ key, namespace }) => LOCALES.some(locale => !has(bundles.get(`${locale}:${namespace}`), key, locale)))
 			.map(({ key, namespace, file }) => `${namespace}:${key} (${file})`);
 
 		expect(unresolved).toEqual([]);
```

The four checks, each with node v22.23.2:

| # | Setup | Result | rc |
| --- | --- | --- | --- |
| 1 | the file unchanged | fails on `upgrades:upgrades_tab.results.below_cutoff_group` and `..._bar` (`BelowCutoffGroup.tsx`) | 1 |
| 2 | with the diff | `Tests 2 passed (2)` | 0 |
| 3 | diff, plus a probe calling `i18n.t('upgrades_tab.results.no_such_key', { ns: 'upgrades', count })` | fails on `upgrades:upgrades_tab.results.no_such_key` | 1 |
| 4 | diff, plus a temp locale string `probe_one_only_one` alone and a probe calling `upgrades_tab.results.probe_one_only` with `count` | fails on `upgrades:upgrades_tab.results.probe_one_only` | 1 |

Left loose (hypothesis, untested): the rule does not check that the call
passes `count`, so a call without `count` to a key that exists only in plural
forms would pass the test and show the raw key. No such call exists today.
Source: `.scratch/agent-reports/2026-11-12-general-task-866-locale-plural-test.md`
§ Addendum: stricter diff (main checkout, gitignored).
