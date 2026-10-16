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

## Code quality

| ID      | Row                                                                           |
| ------- | ----------------------------------------------------------------------------- |
| A3      | Test name at `model/run.test.ts:104` claims more than the mocked test proves  |
| D1 / S3 | Fork comments cite main-repo `packages/core/test/...` paths without saying so |
| S4      | `SetBonusPopover.tsx` copies the popover max width and the anchor gap         |
| S5      | `UpgradesResults.tsx` renders `<ViewToggles …/>` twice                        |
| S6      | Harness DPS-cell lookup duplicated across two scripts; `rect` defined twice   |
| S7      | Layout gate predicts the popover side from viewport width, not room           |

## Round 2

Reviewed range: `81f892ece3ce11ad5f3745820d7cc2c27160d592..81d54d16818f6f198efe9646c2bf178e2700cf4c`

Fork range: `899d8c267..bba7380a6`.

Fix commits since round 1 (`git log --oneline 81f892ec..81d54d16`):
`287477d1` Fix A1 P1 S1 S2 records; add review round 1 — `708992c0` Fix P2:
assert check 18's box is not scrolled — `7eaf9a0b` Code quality S6 S7 in
layout gate — `81d54d16` Re-pin fork for review fixes A2 A3 D1 S4 S5 (only
`data/`: fork lock, `sim-implemented-effects.json`, and the layout baseline
that the green layout-gate run wrote; the fixer committed the baseline
separately and the reviewer folded it into the re-pin commit before round 2,
tree unchanged). Fork: `5a12af896` Fix A2: count Base UI flip margin in
popover side — `bba7380a6` Code quality pass: A3 D1 S4 S5.

Upstream-file check at fork `bba7380a6`: `--numstat --diff-filter=M 5262ff38`
prints only `6 0 ui/app/SimTabsSection.tsx`; 259 A, 1 M; same as round 1.

The fixer reported `corepack pnpm -C <pair> verify` rc=0 ("gates: 1524 ran,
0 skipped") and `corepack pnpm -C <pair> layout-gate:check` rc=0 at 375, 653,
768 and 1280 px.

## Focused check (round 2)

Fork range: `899d8c267..bba7380a6`. One fresh `general-task` agent on Opus,
told it writes nothing.

1. **Conditions 1 to 3 hold — pass.** Every commit in both ranges names its
   finding IDs, is the code-quality pass with its row IDs, or is the re-pin
   (only `data/`). Every changed non-test, non-comment line sits at a place a
   fixed finding cites. The upstream-file check at `bba7380a6` matches round 1
   (`6 0 ui/app/SimTabsSection.tsx`; 259 A, 1 M).
2. **Each diff changes only what its finding asks — pass.** A2's 6 px matches
   Base UI 1.8.0 (`useAnchorPositioning.js:72`, `:175-179`: default
   `collisionPadding` 5 plus a 1 px bias on flip's padding), so a full-width
   popup flips below 480 + 10 + 6 = 496 px of room. S4's `sideOffset` equals
   the ui-kit default (`ui/ui-kit/Popover/Popover.tsx:39,54`), so nothing
   renders differently. The `run-tab-cdp.mjs:417-418` comment rewrite describes
   the reads S6 changed and is judged inside S6.
3. **Each new test asserts its finding — pass, by reading.** The 495/496 px
   tests at `SetBonusPopover.test.tsx:102-116` sit on the A2 boundary; the
   fixer recorded the 495 test failing before the fix ("expected 'right' to be
   'top'"). The check agent did not re-run with the fix reverted (it would
   have had to write to the fork).
4. **Touched tests pass — pass.** Fork vitest on `SetBonusPopover.test.tsx`,
   `UpgradesResults.test.tsx` and `model/run.test.ts`: 3 files, 34 tests,
   rc=0 (Node 22.17.1, vitest 4.1.11). `node --check` rc=0 on `rows.mjs`,
   `run-tab-cdp.mjs`, `test-layout.mjs`.

Finding: **R1 (bookkeeping)** — the pair's tree had this review file
uncommitted while the check ran; that was this round's own write-up, committed
with this section.

Not re-run by the check agent: `pnpm verify` and `layout-gate:check` (fixer
reported rc=0 for both); the final `merge-to-dev --check-only` below runs
verify again.

## Summary

Verdict: **ready to merge** once the owner asks. No finding blocks the merge.
Round 1 raised 14 finding IDs across three axes (A1-A3, D1, S1-S7, P1-P3; A1 =
P1 and D1 = S3 are the same finding). None was data loss. A2 was a visibly
wrong result introduced by this branch (popover opening left over the Item
cell in a 6 px band of room) and is fixed with a boundary test; P2 was a check
that could pass when it should fail and is fixed. The code-quality rows (A3,
D1/S3, S4, S5, S6, S7) were fixed in one pass that changed no behaviour. P3 is
`wontfix` (reason in its row). Round 2 passed all four checks.

Gate C questions answered (see Adversarial): the three out-of-manifest fork
paths are needed (`SetChips.test.tsx` for 604, `model/run.test.ts` for 515) or
harmless (`model/settings_pool.ts`, a doc-comment label update for 604); the
192-line scope-doc diff is table reflow plus the intended four removals, one
addition and one extended paragraph.

Tickets on this branch: filed 1 (629), closed 4 (515, 604, 605, 606), from
`git diff --name-status dev...HEAD -- '.scratch/carry-forward/issues/*.md'`
(1 `A` row) and the `Status: closed` grep in the review skill (4). This review
filed no ticket.

## Disposition (round 2)

| ID  | Axis          | Disposition | Ticket / note                                                                                                                                                                                                                                                               |
| --- | ------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial   | fixed       | Ticket 604's closing note now quotes the shipped "Click Simulate to start." with a re-runnable grep (`287477d1`)                                                                                                                                                            |
| A2  | Adversarial   | fixed       | `sideFor` counts Base UI's 6 px flip margin; 495/496 px boundary tests (fork `5a12af896`)                                                                                                                                                                                   |
| A3  | Adversarial   | fixed       | Test renamed to what the mocked test proves (fork `bba7380a6`)                                                                                                                                                                                                              |
| D1  | Domain        | fixed       | Comments say the cited `packages/core/test/...` files are in the main repo (fork `bba7380a6`); same as S3                                                                                                                                                                   |
| S1  | Standards     | fixed       | "carries" replaced in ticket 629, scope-doc row 629 (`287477d1`) and the lock `_comment` (`81d54d16`)                                                                                                                                                                       |
| S2  | Standards     | fixed       | Ticket 629 names a grep that shows verify runs no fork unit test (`287477d1`)                                                                                                                                                                                               |
| S3  | Standards     | fixed       | Same as D1                                                                                                                                                                                                                                                                  |
| S4  | Standards     | fixed       | Width read from the one Tailwind literal; gap passed as `sideOffset` from the tab's constant; Base UI's internal 5 px stays a commented copy because the ui-kit Popover exposes no prop for it (fork `bba7380a6`)                                                           |
| S5  | Standards     | fixed       | `<ViewToggles/>` built once (fork `bba7380a6`)                                                                                                                                                                                                                              |
| S6  | Standards     | fixed       | `dpsAndSlotCells` shared in `rows.mjs`; one `rect` (`7eaf9a0b`)                                                                                                                                                                                                             |
| S7  | Standards     | fixed       | Check 17 expects the side from the measured room, same rule as the component (`7eaf9a0b`)                                                                                                                                                                                   |
| P1  | Spec          | fixed       | Same as A1                                                                                                                                                                                                                                                                  |
| P2  | Spec          | fixed       | Check 18 asserts `scrollLeft === 0` (`708992c0`)                                                                                                                                                                                                                            |
| P3  | Spec          | wontfix     | Choosing the side from the widest possible popover before it renders is the threshold the session accepted at Gate C (decision-log row K4-adapts); the owner's Q-606 answer ("i dont care. it's going to cover something…") makes opening above at middle widths acceptable |
| R1  | Focused check | fixed       | Review write-up committed                                                                                                                                                                                                                                                   |
