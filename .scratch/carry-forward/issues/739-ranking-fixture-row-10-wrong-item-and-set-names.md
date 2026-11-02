Status: open
Type: task
Origin: docs/reviews/fix-644-655-set-bonus-list.md (found while fixing D2)
Blocks: none
Blocked by: none
Related: 644, 655

# The shared ranking test fixture names a Lightbringer helm and a Crystalforge set wrongly

Fork file `ui/features/upgrades/testing/ranking_fixture.ts` (fork
`2ab56cc0b`):

- `:229-230` gives item 30989 the name "Lightbringer Faceguard". In the
  fork's `assets/database/db.json`, 30989 is Lightbringer War-Helm (set 680,
  Lightbringer Battlegear); Lightbringer Faceguard is 30987 (set 679,
  Lightbringer Armor).
- `:246` gives set id 627 the name "Crystalforge Battlegear". In `db.json`,
  627 is Crystalforge Raiment; Crystalforge Battlegear is 629.

Re-run: `grep -n "30989\|627" vendor/tbc-new-fork/ui/features/upgrades/testing/ranking_fixture.ts`
and read ids 30987 and 30989 from `db.json` `items`.

No test output is wrong: the tests read the name back from the fixture.
The wrong names mislead a reader of the tests. These test files contain the
string "Lightbringer Faceguard" (`grep -rln "Lightbringer Faceguard"
vendor/tbc-new-fork/ui` at fork `2ab56cc0b`): `model/results_view.test.ts`,
`components/ResultsPanes/ResultsPanes.test.tsx`,
`components/SetBonusPopover/SetBonusPopover.test.tsx`,
`components/UpgradesResults/UpgradesResults.view.test.tsx`,
`utils/set_bonus_labels.test.ts`. The fixture predates branch
`fix/644-655-set-bonus-list`; the fix pass on that branch corrected the
same kind of mistake in `set_bonus_tip.test.ts` (review row D2, fork
`2ab56cc0b`) and left this file alone because those other tests read it.

Done when: every item id, item name, set id and set name in
`ranking_fixture.ts` agrees with `db.json`, the tests that name these
items are updated to match, and the fork's `ui/features/upgrades` tests
pass.
