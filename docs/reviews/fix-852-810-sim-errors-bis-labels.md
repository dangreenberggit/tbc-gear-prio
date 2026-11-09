# Pre-merge review — fix/852-810-sim-errors-bis-labels

Reviewed range: `e1584033ac554f356afb5b366196ca03307fb9e3..b3a502bf9cfe351ea6e7f4c0aa30e5f7f3848bba`

Fork range (vendor/tbc-new-fork, branch `fix/852-810`):
`68b2afacf5716572e800cfbc4efc4496549fbee9..38e0614f3717867f3c4b9088e436c9485d64b0ba`
(two commits: `e1f0a16d8` hit-read failures fail the run, ticket 852;
`38e0614f3` BiS badges name the gear-set heading, ticket 810).

Reviewed range: `b3a502bf9cfe351ea6e7f4c0aa30e5f7f3848bba..b465e023b447e6235613c34a32ec8711d2667dd6`

Round 2 fork range: `38e0614f3717867f3c4b9088e436c9485d64b0ba..3e554d9d22ec0be4e7f9500eb3362a39e2ccfde0`
(four commits; the lock names `3e554d9d2` with `"pushed": false`).

## Dispatch note

- Tooling check: `python scripts/check_merge_ready.py --product-files`
  (rc 0) printed five product files: `data/sim-implemented-effects.json`,
  `data/wowsims-fork.lock.json`,
  `docs/adr/0038-fork-pool-comes-from-wowsims-at-run-time.md`,
  `docs/fork-provenance/engine.md`,
  `packages/core/test/fork-meta-repair.test.ts`. The other changed files are
  tickets (`.scratch/carry-forward/issues/810-other-builds-*.md`, `852-*.md`,
  `863-*.md`, `864-*.md`, `NEXT`). `instruction-review` was not run on them:
  they are tickets, not agent instructions; the Spec axis read 810 and 852
  as its spec and checked 863 against 852's "Done when". The fork diff (13
  files under `ui/features/upgrades/`) was reviewed with the product files.
- Lane: full axes. `git diff --shortstat e1584033...b3a502bf` gave
  `10 files changed, 275 insertions(+), 182 deletions(-)`, and the branch
  changes paths under `data/` (and the fork under `vendor/`), which the
  small-change lane excludes.
- Reviewers: `codex` is not on `PATH` (`command -v codex`, rc 1); each axis
  ran as a fresh `general-task` agent on Opus. Standards and Spec ran as
  the two sub-agents of the `code-review` skill. All axes were told they
  write nothing.
- Domain axis run: ticket 810 rests on wowsims preset groups (which pages
  have more than one gear-set heading), and ticket 852 touches meta-gem
  repair and the hit cap.

## Adversarial

No change that can show a wrong number without an error. Checked clean:
all three stats reads (worn gear, baseline, set version) fail with
`RankError("sim-failed", <sim message>)`; a Stop is still a stop; no catch
outside `rank.ts` swallows the new error (`set-screen.ts`,
`measureSameGearBonus` pass it on); `describeRunError` (`format.ts`) shows
every kind with its message; removing `hitCapFailed` cannot cache a partial
run (the partial result returns before the cache write); `852-W`, `852-B`
and both `852-V` cases fail on reverted code; the 810 tests use real
wowsims presets; the tests deleted from `SubstitutionsList.test.tsx`
covered only the removed notes. Test runs printed node v22.23.2: fork
`settings_pool` and `ItemNameCell` 40 passed; core `fork-meta-repair`
(852, 538-H, 535-V5, 746-R) 10 passed.

- **A1 (medium).** Fork `rank.ts:1184-1199` (`versionGears`): the catch
  now rethrows everything except `StopRefusedSim`, so a `MetaRepairError`
  from `rebuild(...)` at a version budget ends the whole run as `internal`
  ("Ranking failed: meta repair exceeded step budget"), while the same
  error on the default build skips only that set package
  (`rank.ts:2312-2333`, `unmeasured: "repair-failed"`) or candidate
  (`:1407-1418`). No test made a rebuild fail.
- **A2 (low, test gap).** No test covers the chain that passes BiS headings
  to the badge (`useUpgradesSettings` → `UpgradesTabBodyInner` →
  `useResultsView` → `ResultRow` → `ItemNameCell`); the prop is optional,
  so deleting `bisHeadingsOf={settings.bisHeadingsOf}` passes the type
  check and every test (`git grep -n "bisHeadingsOf\|bisHeadings=" 38e0614f3 -- '*.test.*'`).
- **A3 (low).** `useUpgradesSettings.ts:76` builds the headings from the
  page's current phase, but a row's BiS tag comes from the ranking on
  screen: a P3 result left stale after a switch to P4 can read "BiS (Arms)"
  for a P3 Fury pick.

Unexamined: the docs diff; the data diff past the fork-commit line; the
tank pages (prot warrior's headings "Default" and "Encounter specific";
the tab does not run there, per the Domain axis).

## Domain

The headings the code shows are the presets' own `group` strings, which
wowsims' gear tab shows as headings only when there is more than one
(`ui/app/PresetGroupPicker/PresetGroupPicker.tsx:41,58-60`; the tab's
`headed` test, `settings_pool.ts:153`). Among the 11 specs the tab runs
(`run.ts:44-56`), only warrior DPS and hunter have more than one gear
group (awk scan of every `makePresetGear` in `ui/specs/*/presets.ts`).
Phase handling: options and BiS tags both come from `phasedPresets`
through `bisSetsFor`. No path repairs gems while ignoring the meta gem:
`repairAndMinimize` always enforces activation or throws
`MetaInfeasibleError`. No new WCL field.

- **D1.** ADR-0038:170 (added by the branch): "wowsims does not save which
  build the player loaded, only talents and gear" is wrong for warrior:
  `DpsWarrior.Rotation.spec` holds Fury or Arms (fork
  `proto/warrior.proto:109-113,125`), set by wowsims' Fury and Arms builds
  and editable in the rotation tab. True for hunter (`proto/hunter.proto`).
  The owner's "label" ruling stands; the stated reason needed narrowing.

Unexamined: fork UI test files; the core test fixture's Burning Rage +20
hit against the item database; WCL, slot, enchant, race, spec and
`currentPhase` lanes (untouched).

## Standards + Spec

### Standards

**Standards: no hard violation.** Checked: the ported-engine cycle
(`rank.ts` and `set-less-copies.ts` at `38e0614f3` hash to their
`engine.md` rows; lock and `sim-implemented-effects.json` name
`38e0614f3`); no upstream wowsims file edited (none of the 13 fork files
exists at `cec2a7b6`); the sim-error rule; no stale comments; comment
policy. Four smells, all judgement calls, recorded as `## Code quality`
rows Q1–Q4.

### Spec

Every "Done when" clause is met. 810: every item badge is drawn in
`ItemNameCell` through one `rowContext` (main table, below-cutoff group,
provisional table, export pane); the screenshot
`.scratch/agent-reports/2026-11-08-810-live/arms-p4-main-table.png` shows
"BIS (Fury)" and "BIS (Arms)"; `settings_pool.test.ts` reads the real
warrior presets; ADR-0038 says so. 852: each of the three reads throws
`RankError("sim-failed", …)`, each has a test
(`vitest run packages/core/test/fork-meta-repair.test.ts -t 852`, 4
passed). 863 is a real follow-up (DPS sims, not stats reads).
`docs/upgrades-tab-scope.md` describes neither change, so it is not stale.

- **P1 (scope).** The `versionGears` catch change makes a rebuild error fail
  the run, not only a read failure; `set-less-copies.ts` no longer catches
  a `requestsFor` rejection. Same defect as A1.
- **P2.** "each one shows the sim's error": `hitPercentOrSimFailed` wraps
  `hitPercentOf`'s own `Error("hit percent read as …")` (`rank.ts:3833`) as
  `sim-failed`, and its comment says a read that "gives no hit number"
  fails "with the sim's error". That message is the tab's.
- **P3 (minor).** The pool's own "BiS (Fury)" badge wiring from
  `UpgradesTabBodyInner` to `ResultRow` has no test and was not seen on
  screen. Same gap as A2.

## Round 1 fixes

- Fork `74896bc70` (A1, P2): each caller of `versionGears` catches a
  `MetaRepairError` and handles it as the same error on its own build (set
  package skipped as `repair-failed` through a shared `skipRepairFailed`;
  set-screen rungs, the crossing gate, `stepGear`, the step break split and
  `measurePairTwoPiece` left unmeasured); only a read's own rejection
  becomes `sim-failed`. Test `852-R` (`fork-meta-repair.test.ts`, main
  commit `2fca406f`) fails without the fork fix (fixer: both cases
  rejected with `MetaStepBudgetExceededError`); it injects the fault with a
  `vi.mock` of the fork's `meta-repair.ts` that passes calls through and
  throws only when the test sets `repairFault`, because no scripted read
  made a real rebuild throw.
- Fork `ca6ab3b0c` (A2): `bisHeadingsOf`/`bisHeadings` required down the
  chain; deleting the prop at `UpgradesTabBodyInner.tsx:46` fails `tsc`
  with TS2741 (fixer ran it).
- Fork `1eee462cc` (A3): the state is reachable (`changeScope` leaves the
  run, `upgrades_store.ts:157`; stale notice and old results shown
  together, `UpgradesTabBodyInner.tsx:44-46`); headings now come from the
  settled ranking's `assumptions.maxPhase` (`selectSettledPhase`); test in
  `useUpgradesSettings.test.tsx` fails without the fix.
- Fork `3e554d9d2` (Q1, Q5): code-quality pass.
- Main `2fca406f`: re-pin to `3e554d9d2`, `engine.md` hashes, the `852-R`
  test. `pnpm verify` rc 0 (fixer's run; "gates: 1608 ran, 0 skipped").
- D1 and the `engine.md` `rank.ts` row text for A1/P2: main commit that
  adds this file.

## Code quality

| ID  | Source     | Row                                                                                                                                                 |
| --- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Standards  | `NO_HEADINGS` defined in `settings_pool.ts` and `ItemNameCell.tsx`; label format `` `${label} (${heading})` `` written in `rowTags` and `listBadge` |
| Q2  | Standards  | possible data clump: `tagsOf` and `bisHeadingsOf` travel side by side through seven files; one `badgesOf(itemId)` suggested                         |
| Q3  | Standards  | `bisHeadingsOf?` optional in three places but always passed                                                                                         |
| Q4  | Standards  | `if (!(err instanceof StopRefusedSim)) throw err;` three times in `rank.ts`                                                                         |
| Q5  | Fix report | after P2, `hitPercentOf`'s doc comment still called a non-finite value "a failed read"                                                              |

## Summary

Round 1 found no silent wrong number. It found one loud failure the branch
introduced (A1/P1: a gem-repair error while rebuilding a set version ended
the run), one tab-own message labelled as the sim's error (P2), one badge
that could be false on a stale result (A3), one untested wiring step
(A2/P3), one wrong sentence in ADR-0038 (D1) and five code-quality rows.
All are fixed or disposed below. One pre-existing defect the fixer found
(X1: a stale result's gear-set badges follow the new phase's selection)
is ticket 865. The fixer's console-text note (X2) is `wontfix` under the
scope filter.

Round 2 (focused check) passed all four checks and left one finding open:
F2, a missing test for three of the new catches. The review stops there
and F2 blocks the merge until it is fixed or the owner allows a deferral.
The merge check (`pnpm merge-to-dev --check-only`) was not run.

Tickets: filed 3 (863, 864, 865), closed 2 (810, 852), from
`git diff --name-status e1584033...HEAD -- '.scratch/carry-forward/issues/*.md'`
and the `Status:` grep in `pre-merge-review` step 3. Filed is higher than
closed by one: the branch found more follow-up work than it closed.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                           |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | fork `74896bc70`: callers of `versionGears` handle a rebuild `MetaRepairError` as on their own build; test `852-R` in `2fca406f`        |
| A2  | Adversarial | fixed       | fork `ca6ab3b0c`: headings prop required down the chain; a missing link fails `tsc` (TS2741)                                            |
| A3  | Adversarial | fixed       | fork `1eee462cc`: headings from the shown ranking's phase (`selectSettledPhase`); test in `useUpgradesSettings.test.tsx`                |
| D1  | Domain      | fixed       | ADR-0038 reason narrowed: warrior saves a Fury/Arms choice that the default rotation does not read; hunter saves none                   |
| P1  | Spec        | fixed       | same defect as A1; fixed there                                                                                                          |
| P2  | Spec        | fixed       | fork `74896bc70`: only the read's rejection is `sim-failed`; comment says only that                                                     |
| P3  | Spec        | fixed       | same gap as A2; fixed there                                                                                                             |
| Q1  | Standards   | fixed       | fork `3e554d9d2`: one `NO_HEADINGS`; shared `withHeading` in `settings_pool.ts`                                                         |
| Q2  | Standards   | wontfix     | premise wrong: `tagsOf` is built inside `useResultsView` (`hooks/useResultsView.ts:55`); one `badgesOf` would add work to the hook      |
| Q3  | Standards   | fixed       | by A2 (`ca6ab3b0c`)                                                                                                                     |
| Q4  | Standards   | wontfix     | each catch does something different after a Stop; a helper would hide a throw behind a call                                             |
| Q5  | Fix report  | fixed       | fork `3e554d9d2`: `hitPercentOf` comment says it fails the run as an internal error                                                     |
| X1  | Fix report  | defer       | `.scratch/carry-forward/issues/865-stale-result-set-badges-follow-new-phase.md` — pre-existing (ticket 430's `tagsOf`), not this branch |
| X2  | Fix report  | wontfix     | a failed version repair on the set screen logs "the rung's request could not be built": console text only, outside the scope filter     |

## Focused check (round 2)

Main range `b3a502bf..b465e023`; fork range `38e0614f3..3e554d9d2`. One
fresh `general-task` agent on Opus, told it writes nothing.

1. **Conditions 1 to 3: pass.** Every commit names the finding IDs it
   fixes (`2fca406f` as a fix commit, since it also carries a test;
   `b465e023` names D1 and A1/P2, its other files are this file and
   tickets). A1's catches sit at each caller of `versionGears`, where A1
   says the default build handles the same error; `selectSettledPhase` is
   the smallest support A3's fix at `useUpgradesSettings.ts:76` needs. None
   of the 21 changed fork files exists at `cec2a7b6` (`cat-file -e` loop);
   `rev-list --merges` counts 0.
2. **Fixes change only what each finding asks: pass.** The `engine.md`
   diff is 3 real lines under `git diff -w` (the rest is table padding);
   its `rank.ts` and `set-less-copies.ts` hashes match the files at
   `3e554d9d2`.
3. **New tests assert their findings: pass.** `852-R`'s `vi.mock` passes
   every call to the real `repairAndMinimize` and throws the fork's own
   error class only below a budget the test sets; the ranking runs for real
   and the test asserts the note the player sees and `complete: true`. The
   reverted-fix run is the fixer's (not repeated). The A3 test asserts
   `['Arms']` before and `['Fury']` after the phase change.
4. **Touched tests pass: pass.** Core `fork-meta-repair` and
   `wowsims-fork-parity`: 48 passed, both `852-R` cases ran. Fork: the 12
   touched test files, 144 passed. Fork `tsc --noEmit` rc 0. Each run
   printed node v22.23.2.

Findings:

- **F1 (bookkeeping).** This file had 5 uncommitted lines (the round 2
  range header) when the check ran. Committed with this section.
- **F2 (low, test gap, open).** Only `852-R` makes a version rebuild throw,
  on the set-package path. No test makes it throw at the new catches in
  `stepGear` (fork `rank.ts:2856-2862`), the step break split
  (`3089-3097`) or `measurePairTwoPiece` (`3277-3291`); which other catches
  `852-R` reaches is untested.

F2 is a finding other than bookkeeping in the lines the fixes wrote, so the
review stops here (`pre-merge-review` § Round limit): no
`## Disposition (round 2)` table, and the merge check was not run. F2 is a
missing test that this branch introduced, so it blocks the merge until it
is fixed or the owner allows a `defer` row.

Assessor (one fresh `general-task` agent that neither wrote nor reviewed
the work; its view, read from the code, not built or run): the A1 fix put
the handling in seven caller catches where `versionGears` had one, and F2
is a gap in those. Another round that adds three fault tests would likely
close F2 but could find the same gap at the remaining catches. Its
simpler option is one catch inside `versionGears` that returns the shared
layout on a `MetaRepairError`, which `852-R` would then cover; that
changes behaviour (the bonus is measured on the run's layout with no note,
where today it is skipped as `repair-failed`).

## Fix after round 2

The owner, 2026-11-08: "idk wtf this means about "7 places" why would 7
places for this exist? im assuming we should do option 1 but im initially
suspicious that this is even set up correctly or and wonder whether weve
set up 7 wounds and slapped on 7 bandaids instead of having one test for
one thing"

Fork `ef85f07fa` (F2): the seven caller catches of `74896bc70` are gone.
`versionGears` catches a `MetaRepairError` around `rebuild(...)` only and
makes that version's entry undefined, which its doc already allowed and
every caller already handled; it never falls back to the shared layout.
The set package loop passes `onRepairFailed`, so the package is still
skipped as `repair-failed` with the repair's error: with an undefined entry
alone, `852-R` showed "the sims that measure it failed." where no sim ran.
The other callers show what they showed before (console text only).
A failed read still fails the run. `852-R` now goes through the one catch
and also asserts that no note says a sim failed; it fails with the catch
removed (the run rejects) and with the error not passed on (the false
note). Main: re-pin, `engine.md` row, `852-R`.
