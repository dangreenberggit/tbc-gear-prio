Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 (Tab-adjacent)
Type: bug
Origin: .scratch/stage-gate/tab-blocking-finish/execution-report.md (K1 step 4 fork checks; stage-gate run, no review file)
Blocks: none
Blocked by: none
Related: 336, 628, 629

# The fork's locale-key test fails on two set-bonus label keys

The fork test `ui/i18n/locale_keys.test.ts`, case "finds every key ui/ asks
for in en", fails on `feat/tab-set-bonus`. It reports two keys as missing
from the `translation` namespace:

- `translation:upgrades_tab.set_bonus.tip_reachable`
- `translation:upgrades_tab.set_bonus.tip_reachable_breaks`

Both keys exist in `assets/locales/en/upgrades.json`, and the code asks for
them in the `upgrades` namespace. The test finds each `i18n.t('<key>', ...)`
call with a regex and reads the namespace only from a literal `ns: '...'`
in the same call (`ui/i18n/locale_keys.test.ts:25-31`). The two calls in
`ui/features/upgrades/utils/set_bonus_labels.ts` (about `:79-82`, added by
fork `f4b78f65d`, ticket 336) pass a variable, `args`, that holds
`ns: 'upgrades'`, so the test assumes the default namespace and fails.
The player sees the right text; only the test fails.

`ui/features/upgrades/utils/set_bonus_labels.ts` is unchanged between
`80a876bb0` (the reviewed tip of `feat/tab-set-bonus`) and the merge
`cbb1db53a`, so the failure is on the reviewed branch and not from the
merge. Re-run from the fork:

    npx vitest run ui/i18n/locale_keys.test.ts

The two failures that `tab-blocking-finish` expected from a full
`npm run test:unit` are tickets 629 and 628; this is a third.

Done when: `npx vitest run ui/i18n/locale_keys.test.ts` passes in the fork,
for example by writing `ns: 'upgrades'` in each of the two `i18n.t` calls
instead of passing it through `args`.
