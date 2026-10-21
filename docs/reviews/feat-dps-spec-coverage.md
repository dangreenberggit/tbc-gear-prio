# Pre-merge review — feat/dps-spec-coverage

Reviewed range: `32f7edf9f999b735d60f26e3a0e3bb8757df4ce1..6ddc2b9795e1b194563278854167af15314cecaf`

Fork range, round 1 (vendor/tbc-new-fork, branch `feat/dps-spec-coverage`): `bc3cca6a1aba17d832bd1376f94ed8f6a53b36a0..c89b0b9129700261c6f6aafd156e89f49be028be`

Dispatch (round 1): full three axes. The branch is not a small change
(`git diff --shortstat dev...HEAD`: 24 files changed, 43127 insertions,
759 deletions; it touches `data/` and `packages/core/src/`). `codex` is not on
`PATH`, so each axis ran as a fresh `general-task` subagent on Opus (review
lane), in one parallel batch. The domain axis ran because the diff changes
which items each spec is offered; it used the `sme-rank-review` audience
(engineering team, not player advice).

Hard checks at round 1 (run by the review's dispatcher):

- `git -C vendor/tbc-new-fork diff --numstat --diff-filter=M e804c29e8 HEAD`
  printed only `6 0 ui/app/SimTabsSection.tsx`.
- `data/wowsims-fork.lock.json` `commit` = `c89b0b912…` = fork HEAD.
- Both trees clean apart from this untracked review file.

## Adversarial

One defect, confirmed by a probe test outside the repo.

- **A1.** When Stop leaves an off-hand-only item unsimmed (a non-dual-wield
  spec wearing a one-hander), the placeholder row had no `slotChoice`, so
  `effectiveSlot` (fork `model/results_view.ts`) and `slotLabel`
  (`utils/format.ts`) fell back to `"mainhand"`: the row showed in the Main
  Hand pane labelled "Main Hand". Placeholder block in fork
  `model/engine/rank.ts` (~1516-1533) and core `packages/core/src/rank.ts`.
  The probe (mage, `ONE_HAND_GEAR`, abort on the second sim call) printed
  `slotChoice: null` for items 32361, 28734 and 30911. The same gap applied to
  a dual-wield spec's unsimmed off-hand-only weapons.

Checked and clean: the core and fork `pool.ts` / `rank.ts` / `content-hash.ts`
diffs agree apart from the version numbers (core 9→10, fork 6→7), and the
`docs/fork-provenance/engine.md` hashes match (`sha256sum`); the two-hander
exclusion runs before ordering and the cap, and its count comes from the same
filter (`vitest run` on `offhand-disclosure` and `archetype-specs`, 24 tests,
rc 0); dual-wield specs keep off-hand weapons (enh fixture: 116 off-hand
rows); shields are ordered and simmed against the worn off hand; the `poolFor`
refactor gives the same pool; the six re-recorded fixtures differ only by
`slotChoice: mainhand` on weapon rows and the new disclosure line (script
compare of gear, ids, `deltaDps` and every other row field).

## Domain

No contradiction with TBC equip rules. Eligibility comes from wowsims'
`canEquipItem` (fork `ui/sim/proto/items.ts:41-81`, called from
`pool_source.ts`), and the class table
(`ui/sim/player/classes/capabilities_auto_gen.ts:23-31`) gives shields to
paladin, warrior and shaman only, so no shield reaches a rogue, hunter or
druid. `DUAL_WIELD_SPECS` = {rogue, enhancement, warrior, hunter} is checked
against wowsims' `canDualWield` for all 11 specs by the fork's
`dual_wield_specs.test.ts` (23/23 pass). No Titan's Grip case, which TBC does
not have. Ticket 690's grouping matches wowsims' `group` on the hunter and
warrior gear presets, the only DPS specs that set it on gear presets.

- **D1.** With a two-hander worn, each one-hander candidate is priced next to
  an empty off hand, and the off-hand items are held out. The disclosure line
  explains the off-hand items but not that one-hander rows were priced alone,
  so a staff caster or two-hand warrior cannot see whether a one-hander plus
  off-hand pair beats the two-hander. The guard and
  `clearOffHandForTwoHander` exist at fork `bc3cca6a1`, so this predates the
  branch.
- **D2.** For feral and ret the "N off-hand items were not ranked" count is
  made of items those specs would not use: feral's 27-29 are caster held
  items with no Strength or Agility; ret's 28 are shields.

Unexamined by the axis: the core CLI's universe builder eligibility; an
off-hand item that `getItem` cannot find; rogue held-item rows live;
enhancement with a two-hander worn.

## Standards + Spec

Run through the `code-review` skill (Standards and Spec sub-agents).

**Standards** (the no-wowsims-edit rule, the engine port mirror and the
provenance record all pass):

- **S1.** Five commit subjects are 51-56 characters, over the 50 limit (fork
  88d8430bd, 047f128d1, c89b0b912; main 7d0abd5f, abb6e80d).
- **S2.** The fields `{name, phase?, group?, gear}` are declared in four
  places (fork `data.ts` `PagePreset`, a local type in `settings_pool.ts`, the
  `presetSetOf` parameter in `pool_source.ts`, `testing/db_pool.ts`).
- **S3.** Two types named `PresetSet` with different fields (local in
  `settings_pool.ts` holds `gear`; the export in `pool_source.ts` holds
  `itemIds`).
- **S4.** Four call sites pass the same `host.individualConfig.presets.gear`
  to `poolFor`; `scripts/tab-fixtures/record.mjs` `PAGE_BY_SPEC` and
  `scripts/tab-harness/test-tab-harness.mjs` `PAGE_PATH_BY_SPEC` are the same
  map.
- **S5.** `packages/core/test/archetype-specs.test.ts` used a literal
  `HAND_TYPE_OFF_HAND = 3` where `HandType.HandTypeOffHand` exists.

**Spec:**

- **P1.** Ticket 690's "a saved pick still restores the set it named": a
  hunter or warrior pick saved under the old key matches no option and is
  dropped without a message (fork `settings_pool.ts` `setSelection`).
- **P2.** The run panel's "{{count}} eligible items" (`eligibleCount`,
  documented as "The candidates an uncapped run sims") did not apply the
  engine's new two-hander off-hand hold-out, so with a two-hander worn it was
  too high by the held-out count (28 for ret P3 and 36 for mage P5, read from
  the fixtures' disclosure lines, not re-measured).

Spec checks that pass (from the axis's spec sub-agent): all eight fixtures at
`c89b0b912` with no changed inputs (`python3 -I scripts/check_tab_fixtures.py`);
every off-hand-only row carries `slotChoice: "offhand"`; ticket 699's notice
shows only when `bisTagPhase < maxPhase`; every production `poolFor` call
passes presets (691 CQ6); ticket 365's open part is fixed. No scope creep
outside the decision log.

## Code quality

| ID  | Finding                                                                 | Outcome                                                                   |
| --- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| S2  | Preset fields declared in four places                                   | `wontfix` (owner scope filter, below); the S3 fix removes one of the four |
| S3  | Two `PresetSet` types with different fields                             | fixed inline (fork 766e87be2)                                             |
| S4  | Repeated `poolFor` presets argument; duplicated page map in two scripts | `wontfix` (owner scope filter)                                            |
| S5  | Literal hand-type number in a core test                                 | fixed inline (main 02fddec4)                                              |

Owner scope filter, given in the task for this review: "fix only findings
that change what the tab shows, the pool, or gate correctness; small findings
are fixed inline or dropped". S2 and S4 change none of those, so they were
dropped in place of a separate code-quality pass; S3 and S5 were small and
fixed inline.

Reviewed range: `6ddc2b9795e1b194563278854167af15314cecaf..91383512a8ab6a0bcdf4fa6d14c6d2584885fe66`

Fork range, round 2: `c89b0b9129700261c6f6aafd156e89f49be028be..766e87be2236cca6e69c1254c34a6fdfe93235d0`

## Focused check (round 2)

Fixes (main): 4023109b (A1), ab87860a (P2, core mirror), 02fddec4 (S5),
91383512 (fork re-pin). Fixes (fork): e70eb013a (A1), 213fc11db (P2),
766e87be2 (S3). One fresh `general-task` agent on Opus ran the check.

1. **Conditions: pass.** Each commit names its finding ID, and 91383512
   changes only the lock, `data/sim-implemented-effects.json` and
   `docs/fork-provenance/engine.md`. Every non-test line is at a cited place.
   The wowsims-file check gives the same output at c89b0b912 and 766e87be2
   (`--diff-filter=M`: only `6 0 ui/app/SimTabsSection.tsx`; the same six
   added files outside `ui/features/upgrades`). The lock's `commit` is the fork
   HEAD. `check_engine_port_drift.py`: rc 0, "36 ported files match engine.md".
2. **Scope: pass.** Core's new `placementSkipped` holds the same two guards
   as the fork's existing `attemptEligibility`, and the candidate loop behaves
   the same. `usePlayerStore('gear')` and the fake host's `player.sim` are
   needed for P2. The two `pool.ts` copies of `mainHandLeavesOffHandFree` and
   `offHandBlockedEntries` are byte-identical (`diff`).
3. **Tests assert their findings: pass, by reading.** The fixer recorded the
   A1 test failing with the placeholder line removed ("expected undefined to
   be 'offhand'") and the P2 test failing with the rule removed.
4. **Touched tests pass.** Core `vitest run` on offhand-disclosure,
   archetype-specs and wowsims-fork-parity: rc 0, 14/14. Fork `vitest run` on
   settings_pool, settings_pool.offhand and useUpgradesSettings: rc 0, 45/45.
   `tsc --noEmit` rc 0 in both.

`eligibleCount` agrees with the engine's `eligible` for an empty main hand, a
one-hander, a two-hander, and an item the database cannot find (by reading:
the same phase filter, Kael exclusion and `offHandBlockedEntries`, in the
same order).

Round-2 findings:

- **F1 (test coverage, low).** No test drives `useUpgradesSettings` with a
  worn weapon (fork `hooks/useUpgradesSettings.ts:55,101-107`), so breaking
  the worn-main-hand wiring or the update after a weapon swap would pass every
  test.
- **F2 (S5 left one literal, low).**
  `packages/core/test/archetype-specs.test.ts:257` still has
  `const HAND_TYPE_ONE_HAND = 2`.

The skill's round limit stops the review when round 2 reports a finding other
than bookkeeping. This review applied the owner's scope filter given in the
task instead ("small findings are fixed inline or dropped, real deferred work
becomes a ticket"): neither F1 nor F2 changes what the tab shows, the pool, or
gate correctness, so F2 is dropped and F1 is a ticket. No third round ran.

## Summary

Round 1 found one defect that changed what the tab shows (A1: unsimmed
off-hand rows after Stop filed under Main Hand) and one wrong number on the
tab (P2: the eligible count ignored the new two-hander hold-out). Both are
fixed, in the fork and in the core mirror, with tests that fail without the
fix. S3 and S5 were fixed inline. The domain axis found the off-hand rule
consistent with TBC equip rules, with eligibility taken from wowsims; its one
real gap (D1, one-handers priced alone beside a worn two-hander) predates the
branch and is ticket 700. The round-2 focused check passed all four checks;
its two low findings are F1 (ticket 702) and F2 (dropped).

Hard checks at the final tips (main 91383512, fork 766e87be2): only
`ui/app/SimTabsSection.tsx`'s 6 lines differ from upstream among existing
wowsims files; engine provenance and parity pass; the lock names the fork
HEAD.

The eight tab fixtures warn as stale (warn-only gate, exit 0) because
`engine/pool.ts`, `engine/rank.ts` and `settings_pool.ts` changed after they
were recorded. The fixes change only partial rankings and the pre-run count,
so the recorded rankings should still be right (hypothesis, untested);
re-record them when convenient (`data/tab-fixtures/README.md`).

Tickets: this branch filed 3 (700, 701, 702) and closed 4 (365, 690, 691,
699), by the skill's two `git diff dev...HEAD` counts.

Ticket 701 comes from the A1 fixer's list of other changes: Stop placeholders
for rings and trinkets worn in their second slot may name the first slot
(hypothesis, untested).

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                 |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | Placeholder weapon rows take the slotChoice a simmed row would get: fork e70eb013a, main 4023109b; core test fails without it                 |
| D1  | Domain      | fixed       | One-handers held out while a two-hander is worn: fork 5ec8def25, main 40ef2f34 and 060bb2cf; ticket 700 closed (addendum below)               |
| D2  | Domain      | wontfix     | The count states what wowsims' `canEquipItem` lets the class wear; filtering it by stats would be a guess and a second source of item facts   |
| S1  | Standards   | wontfix     | Subjects are 51-56 characters; fixing them rewrites fork commits whose SHAs the lock history names                                            |
| S2  | Standards   | wontfix     | Owner scope filter: no effect on the tab, the pool or gates; the S3 fix removes one of the four declarations                                  |
| S3  | Standards   | fixed       | Local type replaced by `PagePreset`: fork 766e87be2                                                                                           |
| S4  | Standards   | wontfix     | Owner scope filter: no effect on the tab, the pool or gates                                                                                   |
| S5  | Standards   | fixed       | `HandType.HandTypeOffHand`: main 02fddec4                                                                                                     |
| P1  | Spec        | wontfix     | The old key named two sets, so no single set can be restored; the tab has no users outside development. Recorded in ticket 690's closing note |
| P2  | Spec        | fixed       | One shared predicate in `engine/pool.ts` for the engine and the count: fork 213fc11db, main ab87860a                                          |

## Disposition (round 2)

| ID  | Axis          | Disposition | Ticket / note                                                                                                                    |
| --- | ------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Focused check | fixed       | Hook-level test of the count after a weapon swap: fork 4bb8da4f2, re-pinned in main 5cc39958; ticket 702 closed (addendum below) |
| F2  | Focused check | wontfix     | Owner scope filter: a test-only literal, no effect on the tab, the pool or gates                                                 |

## Addendum, 2026-10-20: follow-ups after the review

Final tips: main bcc06119 for the code (fixtures 6567c1cf), fork b908771dd.

- **F1 fixed.** Fork 4bb8da4f2 adds
  `hooks/useUpgradesSettings.offhand.test.tsx`: wearing a two-hander, then
  a one-hander, then the two-hander again moves the eligible count. It fails
  with the hook's `wornMainHandId` argument removed. Re-pinned in main
  5cc39958; ticket 702 closed.
- **701 fixed.** The slot was wrong: a Stop placeholder for a ring or
  trinket worn in its second slot was filed under the first. It now takes
  the slot a simmed row would (fork 3797dd6b4, main 9e12e390, re-pin
  5cc39958); ticket 701 closed with the test as evidence.
- **D1 fixed (ticket 700), by owner ruling.** While the worn main hand is a
  two-hander, one-handed weapons are held out before ordering, as the
  off-hand items are: no sim and no row, not in the run panel's eligible
  count, and one line, "N one-handed weapons were not ranked, because you
  wear a two-handed weapon." Fork 5ec8def25, main 40ef2f34 (core mirror and
  tests), re-pin 060bb2cf; `ENGINE_VERSION` core 11, fork 8. An earlier
  notice-only fix (fork 67d2d2074, main 1d6915a0, 28aa5fd7) was replaced
  by these commits, not rewritten.
- **Off-hand line reworded** to match the one-hand line, without its
  advice: "N off-hand items were not ranked, because you wear a two-handed
  weapon." ("1 off-hand item was not ranked, ..." for one). Fork 06372bfa7,
  main 059c3d92, re-pin 21f13b1d.
- **Post-review check findings fixed.** I1: `oneHandBlockedEntries` keeps a
  weapon whose hand type is null, as its comment says (fork 6f4dd2c6d, main
  7bc6d30d). L1: a hunter (dual-wield) test of the hold-out with a
  main-hand-only weapon (main ea35041d). L2: a fork-level `rankUpgrades`
  test of the 701 placeholder slots (fork b908771dd). Re-pin bcc06119.
- **Fixtures re-recorded** at fork 5ec8def25 (main bedb68e7), then again at
  fork b908771dd (main 6567c1cf); `python3 -I scripts/check_tab_fixtures.py`
  reports no changed inputs for all eight. Against the review-time
  recordings, the six two-hander recordings lose exactly their one-handed
  weapon rows and gain the line with the same count; every other row is
  unchanged. The Fists of Fury (set 719), whose two pieces are both
  held-out weapons, leaves `setBonuses` in four feral recordings. The last
  recording changed only the off-hand line's text. Warlock and enhancement
  differ only in `contentHash`.
- **New ticket 703**: a fixture recording sometimes never settles (twice on
  2026-10-20, both feral). `NEXT` was behind (it read 700); 703 was the
  lowest free number and `NEXT` is now 704.

Tickets, by the skill's two `git diff dev...HEAD` counts: filed 4 (700, 701,
702, 703), closed 7 (365, 690, 691, 699, 700, 701, 702). Open from this
branch: 703.
