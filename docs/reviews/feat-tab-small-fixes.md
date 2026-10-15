# Pre-merge review — feat/tab-small-fixes

Reviewed range: `34fe4ac64a996518fe37da0b9234d905208c2416..81f892ece3ce11ad5f3745820d7cc2c27160d592`

Fork range reviewed in round 1: `176268e7c..899d8c267` (`vendor/tbc-new-fork`,
branch `feat/tab-small-fixes`).

Dispatch note (round 1): full axes, not the small-change lane.
`git diff --shortstat dev...HEAD` reported 12 files changed, 473 insertions,
112 deletions, and `git diff --name-only dev...HEAD` lists `data/` paths.
`codex` is not on `PATH`, so each axis ran as a fresh `general-task` agent on
Opus (review lane). The domain axis ran because ticket 515's Phase 1 message
and the locale strings make statements about TBC phases. Every axis was told
it writes nothing; all three reported both trees clean.

Upstream-file check (`docs/fork-upstream-touchpoints.md` commands, upstream
`5262ff38`, fork `899d8c267`):
`git -C vendor/tbc-new-fork diff --numstat --diff-filter=M 5262ff38 899d8c267`
prints only `6 0 ui/app/SimTabsSection.tsx`; status counts are 259 A, 1 M.
`git -C vendor/tbc-new-fork diff --name-only 176268e7c..899d8c267` lists only
`ui/features/upgrades/**`, `assets/locales/en/upgrades.json` and
`schemas/upgrades.schema.json`.

## Adversarial

No correctness bug in the shipped code. Fork vitest on the touched component
files and `model/run.test.ts`: 11 files, 88 tests pass.

- **A1 (wrong record).** Ticket 604's closing comment quoted
  `empty_no_ranking_body` as the plan's long text; the fork ships "Click
  Simulate to start." (`assets/locales/en/upgrades.json:124` at `899d8c267`).
  Same finding as P1.
- **A2 (visibly wrong result, narrow).** `SetBonusPopover.tsx:27` picks
  `right` when the room is at least 30rem + 10 px. Base UI's positioner keeps a
  default `collisionPadding` of 5 px and flips a popup that does not fit, so
  with 430 to 435 px of room a full-width popover opens left, over the Item
  cell, which the ticket-495 ruling rules out.
- **A3 (test theatre).** The new `model/run.test.ts:104` test is named as if
  it proves an empty pool ranks without failing, but `./engine/rank` is mocked;
  it proves `rankForPlayer` passes `maxPhase: 1` and `pool: []`.

Gate C questions:

1. Out-of-manifest fork paths. `SetChips.test.tsx` is needed by 604: it
   asserts the rendered label, and the old "Other sets (1)" assertion fails
   after the locale change. `model/run.test.ts` is in the plan's manifest
   (`plan.md:100`, step 5) and is needed by 515. `model/settings_pool.ts`
   changes only a doc comment to the new "Other phases (n)" label; not needed
   for behaviour, but it keeps the comment true.
2. `docs/upgrades-tab-scope.md`. Only table reflow plus the intended edits.
   Both versions extracted with `git show` and normalised with
   `sed -E 's/ *\| */|/g; s/-{3,}/---/g; s/ +$//'`, then `diff`: the only
   differences are the four removed rows (515, 606, 605, 604), the added row
   629, and one paragraph extended after "coverage.". No surviving row lost or
   changed content. (`git diff -w --stat` gives 9+/7-.)

## Domain

**Clean** on game facts. The Phase 1 message is true for every spec: the
universes cover Phases 2 to 5 for all 11 specs and none for Phase 1
(`model/data/data.ts:84-170`, `ls data/universes/`), and
`scripts/assemble_universe.py:3003` restricts phases to 2-5. "Other phases
(n)", "Click Simulate to start." and ticket 629's facts check out.

- **D1 (code quality).** Two fork comments cite `packages/core/test/...`
  paths that exist only in the main repo, without saying so:
  `UpgradesResults.tsx:56`, `model/run.test.ts:103`. Same as S3.

## Standards + Spec

Run through the `code-review` skill (two read-only sub-reviewers).

- **S1 (wording).** Banned word "carries" in new text: ticket 629 line 28,
  `docs/upgrades-tab-scope.md` row 629, and the new lock `_comment` entry.
- **S2 (durable claim).** Ticket 629 said the failure does not show in
  `pnpm verify` without a command a reader can re-run.
- **S3 (code quality).** Same as D1.
- **S4 (code quality).** `SetBonusPopover.tsx:16-17` copies `WIDEST_REM = 30`
  from the `max-w-[min(30rem,…)]` class and `ANCHOR_GAP_PX = 10` from
  `ANCHOR_DISTANCE` in `ui/ui-kit/Popover/Popover.tsx:39`; if either source
  changes, `sideFor` picks a side from stale numbers.
- **S5 (code quality).** `UpgradesResults.tsx:61` repeats the
  `<ViewToggles …/>` call at line 73.
- **S6 (code quality).** The "DPS cell by test id, slot =
  `nextElementSibling`" lookup is in both `scripts/tab-harness/run-tab-cdp.mjs:446`
  and `scripts/tab-harness/test-layout.mjs:154`; `test-layout.mjs` defines a
  `rect` helper twice (lines 157 and 239).
- **S7 (code quality, gate fidelity).** `test-layout.mjs:270` expects the side
  from the viewport width (`width >= XL`), while the component decides from
  the room right of the figure; the two agree only at the tested widths.
- **P1 (wrong record).** Same as A1.
- **P2 (check that can pass when it should fail).** Check 18 reads
  `scrollLeft` (`test-layout.mjs:158`) but never asserts it is 0, so a panel
  already scrolled sideways would still pass "the DPS cell lies inside the
  panel".
- **P3 (spec, minor).** `sideFor` opens right only when the widest possible
  popover (30rem) fits, so at some middle widths a narrower popover opens
  above although it would fit on the right.

## Summary

To be completed after the fix round.
