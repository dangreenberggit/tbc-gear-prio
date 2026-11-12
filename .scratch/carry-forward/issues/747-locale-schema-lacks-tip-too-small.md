Status: closed
Type: bug
Origin: found while fixing docs/reviews/fix-wrong-advice-text.md round 1 (not a review finding)
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 (Tab-adjacent)
Blocks: none
Blocked by: none
Related: 626, 655

# The tab's locale schema has no `set_bonus.tip_too_small`, so the fork's locale check fails

## What is wrong

`assets/locales/en/upgrades.json` in the fork has the string
`upgrades_tab.set_bonus.tip_too_small` (used at
`ui/features/upgrades/utils/set_bonus_labels.ts:115`), but
`schemas/upgrades.schema.json` does not list it, and that schema object sets
`additionalProperties: false`. The fork's own locale check fails:

    node vendor/tbc-new-fork/test-locales.mjs

run from inside `vendor/tbc-new-fork` (as `node ./test-locales.mjs`) prints
`❌ en/upgrades.json is invalid: schema/upgrades_tab/set_bonus must NOT have additional properties`
and exits 1 (seen on 2026-11-02 at fork `e3dbf38fa`, branch
`fix/wrong-advice-text`).

The key came in with fork `5b9182ed0` ("Name set bonuses within the noise in
the popover"). The gap is already there at fork `05da8b9ab` (the base of
`fix/wrong-advice-text`), so this branch did not cause it. At `05da8b9ab` and
at `e3dbf38fa`,
`git -C vendor/tbc-new-fork show <ref>:schemas/upgrades.schema.json | grep -c tip_too_small`
prints 0 and the same command on `assets/locales/en/upgrades.json` prints 1.

`pnpm verify` passed at the same commit because no gate runs this check
(ticket 626).

A second key has the same gap, hidden because the check stops at its first
error: `upgrades_tab.assumptions.substitution_in_slot` is in the locale and
not in the schema. At fork `05da8b9ab`, `e3dbf38fa` and `81e803ada`,
`grep -c substitution_in_slot` prints 1 on the locale and 0 on the schema
(found in round 3 of `docs/reviews/fix-wrong-advice-text.md`, 2026-11-02, by
a script that compares every locale object's keys with the schema's
`properties` and `required`; no other object differs).

## Done when

The schema lists `tip_too_small` under `upgrades_tab.set_bonus` and
`substitution_in_slot` under `upgrades_tab.assumptions` (each also in its
object's `required` list if the other keys there are required), and
`node ./test-locales.mjs` from inside the fork prints no `❌` line.

## Closing note

2026-11-12, fixed on branch `fix/tab-polish` by fork commit
`tbc-new-fork@dc9dbda76` ("List tip_too_small and substitution_in_slot in
the upgrades schema"). `schemas/upgrades.schema.json` now lists
`tip_too_small` under `upgrades_tab.set_bonus` and `substitution_in_slot`
under `upgrades_tab.assumptions`. The schema is the fork's own file, not
upstream's. The pin moved to `690fcdeb5`, which holds this commit.

Verified by: run from inside the fork (`vendor/tbc-new-fork`), with node v22:

```
node ./test-locales.mjs; echo "rc=$?"
```

On 2026-11-12 at fork `690fcdeb5` it printed four `✅` lines
(`en/character.json`, `en/talents.json`, `en/translation.json`,
`en/upgrades.json` "is valid"), no `❌` line, and `rc=0`. Before the fix
it exited 1 with the error quoted above.
