# Pre-merge review — feat/452-spec-page-scans

Reviewed range: `c229d1299ce6e094021345372ab7959d618a07ca..e9f771ad052bb5786e5bfeead15733d1feb73f20`

Dispatch note: the branch is stacked on `chore/452-slice-tickets`
(`c229d129`), which has its own instruction-review, so round 1 reads only
this branch's commits (`c229d129..e9f771ad`), not `dev...HEAD`.
`python scripts/check_merge_ready.py --product-files` printed 12 product
files (rc 0); the axes read those. The other changed files (tickets 840
and 841, `NEXT`) get `instruction-review`. Full axes: the branch changes
15 files and paths under `data/`. Domain axis runs: the fixtures name
spec pages and made-up items. No `codex` on `PATH`; the axes run as
`general-task` agents on Opus.

## Adversarial

- **A1** (silent wrong result, fixed before merge). Check 23
  (`scripts/tab-harness/test-layout.mjs:648-654`) builds its list from
  every fixture in the folder, not from the fixtures that were measured.
  If a page's fixture fails to load, the run prints `UNMEASURED` and
  `PASS (23)`. The outcome is then `unmeasured`, and
  `check_layout_gate.py:776-785,977-980` reports a skip with exit 0. So
  the merge goes through with that page never scanned.
- **A2** (by design). The new `color-contrast` entry on
  `[data-testid="upgrades-item-name"].text-quality-epic`
  (`data/wowsims-fork-a11y-baseline.json:4-10`) accepts every contrast
  failure on an epic item name, at any width, on any page and on any
  background. Because it has `mayNotFire: true`, no stale warning
  appears after ticket 840 is fixed.
- **A3** (other). Check 23 compares the fixtures against the harness's
  `PAGE_PATH_BY_SPEC`, not against the fork's `SPEC_ID_BY_PROTO_SPEC`
  (`run.ts:43-55`). If the fork adds a spec with no harness entry, the
  check still passes. No committed test covers check 23; the only
  evidence is a manual run with a fake page key added.

## Domain

- **D1** (silent wrong result, fixed before merge). In
  `data/tab-fixtures/mock-enhancement.json`, rows 28776 and 25685
  (gloves) have slot `waist`, and row 29516 (a belt) has slot `hands`.
  The cause is upstream's enhancement `p1.gear.json` and
  `preraid.gear.json`, which put the belt at the hands index and the
  gloves at the waist index. `presetPairs()`
  (`make-mock-fixtures.ts:426-441`) takes each slot from its position
  in that list. As a result, the page and its capture show "Waist" next
  to a pair of gloves.
- **D2** (other, pre-existing). `make-mock-fixtures.ts:650-660` writes
  a melee hit-cap block (Precision 3/3, 15.77 rating per 1%) into every
  fixture, the caster fixtures included. Nothing renders it today:
  `hitCapBanner` has no caller.
- Checked with no finding: the routes, the spec ids, the Survival and
  Arms statements, the set rows, and the items' slots and phases on the
  other ten fixtures.

## Standards + Spec

- **S1** (bookkeeping). The new baseline entry's `reason` states why the
  violation fires only sometimes. It gives no command a reader can
  re-run and no "hypothesis" label.
- **S2, S3, S4, P3** are code-quality findings; see `## Code quality`.
- **P1** (no effect). `data/tab-fixtures/README.md:85-88` rewrites the
  "Took" sentence, which ticket 801 did not ask for. The new text is
  correct.
- **P2** (no effect). Check 23 and the fixture name on each violation
  record were not asked for. Both support 801's "Done when".
- **P4** is the same finding as A3.
- **Spec: every 801 requirement is implemented and backed by run
  evidence** (`.scratch/agent-reports/801-runs/`).

## Instruction review (tickets 840, 841, `NEXT`)

- **I1.** Ticket 840's option "a darker background behind the tab's
  rows" cannot reach 4.5:1. On pure black, epic `#a335ee` gives 4.30:1
  and rare `#0070dd` gives 4.36:1.
- **I2.** Ticket 840 says "Remove the entry when this ticket closes".
  That conflicts with its wontfix path, where the entry keeps the
  reason.
- **I3.** Ticket 840's "Done when" would pass a run where axe marked the
  names "incomplete". No fixture is known to show a rare item.
- **I4** (minor). Ticket 841 cites `fixtureSettledExpression` for "no
  stale banner", but that expression checks result rows only.
- Note: 840 does not say who picks the option.
- Check 3 (trial run) is not done. A trial of a ticket means working
  the ticket; two cold-reader dry runs were done instead.

## Code quality

| ID  | Where                                                                                                                                                                                                     | Finding                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| S2  | `data/tab-fixtures/README.md:6-10,54,59`, `make-mock-fixtures.ts:4-9,18`, and the phrase "at least one for each spec page" in `check_tab_fixtures.py:6`, `test-layout.mjs:14`, `test-tab-harness.mjs:389` | Fixture counts written out in prose go stale when the next fixture is added.                                     |
| S3  | `make-mock-fixtures.ts:183-188`, `:301-362`                                                                                                                                                               | The `FixtureName` union repeats the `FIXTURES` keys, and the five new entries repeat `size: 24, belowCutoff: 4`. |
| S4  | `test-layout.mjs:119,135-137,575-578,583-588`                                                                                                                                                             | The "fixture name or nothing" value is built in three places.                                                    |
| P3  | `data/tab-fixtures/README.md:16`, `scripts/tab-harness/README.md:23`                                                                                                                                      | The docs write "653 px" where the code uses `POST_RUN_AXE_WIDTH`.                                                |

## Focused check (round 2)

Reviewed range: `e9f771ad052bb5786e5bfeead15733d1feb73f20..a3a23d6972a0c2c061654ce91268d7d00e24a559`

Fork range: none. `git diff --quiet c229d129...HEAD -- data/wowsims-fork.lock.json`
exits 0, so the branch never moves the fork pin.

One fresh `general-task` agent on Opus ran the four checks.

1. Conditions 1 to 3 hold: **PASS**. Each commit names its finding IDs,
   is the code-quality pass (`a3a23d69`, S2 S3 S4 P3), or only files or
   edits tickets or this file.
2. The fixes change only what each finding asks for: **PASS**. The D1
   override moves 4 of 1714 preset entries, all enhancement belt and
   gloves. A paired slot (ring, trinket, weapon) cannot move.
3. Each new test asserts its finding: **PASS**. The fixer recorded no
   gate run with the A1 fix reverted and saved no output for the D1
   revert run. The checker's own probe applied the D1 rule to the old
   `mock-enhancement.json` and the rule fired.
4. The tests the fixes touch pass: **PASS** (vitest
   `page-coverage.test.mjs` 9/9, generator `--check`,
   `check_tab_fixtures.py`, `tsc`; node v22.23.2).

Finding:

- **R1** (a silent wrong result in lines the fixes wrote, not reachable
  with today's file). `forkSpecIdsFrom` in
  `scripts/tab-harness/page-coverage.mjs:10-15` takes the body of
  `SPEC_ID_BY_PROTO_SPEC` up to the first `}` and reads only quoted
  values. In edited copies of the map, a `}` inside a comment dropped
  every entry after it, and an unquoted value was skipped without an
  error. In both cases check 23 can pass while a fork spec has no page.
  A commented-out entry was read as a ranked spec, which blocks the gate
  for no reason. The real `run.ts` parses to all 11 ids.

Round 2 is the last round. R1 is open, so the review stops here for the
owner's choice (`~/.claude/AGENTS.md` § Review round limits). The merge
check (step 4) was not run.

## Focused check (round 3)

Reviewed range: `a094a28bf2f8ea8b9b3d7bd1b78ab7c0b0cf7bc4..19696dc6436e6a7cbee57820778f66236575907d`

The owner chose a further round for R1 (2026-11-06, in chat). Asked "can
I make the test ask the tab's code directly? If loading that code turns
out to need a change in tbc-new-fork, I'll stop and ask you first", the
owner answered "oh thats insane. yes". Fix commit `19696dc6`. No fork
change.

The fix replaces the text reader with
`packages/core/test/fork-spec-pages.test.ts`. That test calls the
fork's exported `specIdFor` for every proto `Spec` value and asserts
that each id it returns has a `PAGE_PATH_BY_SPEC` entry. One fresh
`general-task` agent on Opus ran the four checks.

1. Only a fix for an earlier finding (R1, in the commit subject), at the
   places R1 and A3 cite: **PASS**.
2. Changes only what R1 asks for: **PASS**. The text reader and its 5
   tests are removed; the A1 part of check 23 and its 4 tests stay.
3. The new test asserts R1: **PASS**. With `mage` removed from
   `PAGE_PATH_BY_SPEC`, it failed with `Received ["mage"]`
   (`.scratch/agent-reports/801-runs/r1-fix/2-fail-mage-removed.txt`).
   Reading zero specs, or failing to import, fails the suite.
4. The tests pass: **PASS** (vitest, 2 files and 6 tests; `tsc --build
packages/core/tsconfig.test.json`; node v22.23.2).

No findings. The test skips when the fork is absent, as every other fork
test here does (`describe.skipIf`).

## Summary

Round 1 found two silent wrong results (A1, D1); both are fixed. Round 2
left R1, and the owner chose a further round; round 3 passed with no
findings. This branch filed 4 tickets (840, 841, 842, 843) and closed 1
(801). It filed more than it closed because the new checks found
problems in code outside this branch's change.

## Disposition (round 3)

| ID  | Axis          | Disposition | Ticket / note                                                                                                                             |
| --- | ------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial   | fixed       | `891f03db`: check 23 counts only measured fixtures; a fault-injected run printed `layout gate: FAILED`                                    |
| A2  | Adversarial   | wontfix     | Ticket 801 prescribes a rule-and-selector baseline entry; ticket 840 states the entry's scope and says to remove it when a fix closes 840 |
| A3  | Adversarial   | fixed       | `891f03db`, then superseded in round 3 by `19696dc6` (the test asks the fork's `specIdFor`)                                               |
| D1  | Domain        | fixed       | `37a74160`: the slot comes from the item type; the generator refuses a mismatched row                                                     |
| D2  | Domain        | defer       | `.scratch/carry-forward/issues/842-mock-fixtures-give-casters-a-melee-hit-cap.md` — nothing renders the block today                       |
| S1  | Standards     | fixed       | `167b4f12`: the cause is labelled "hypothesis, untested"                                                                                  |
| S2  | Standards     | fixed       | `a3a23d69` code-quality pass                                                                                                              |
| S3  | Standards     | fixed       | `a3a23d69` code-quality pass                                                                                                              |
| S4  | Standards     | fixed       | `a3a23d69` code-quality pass                                                                                                              |
| P1  | Spec          | wontfix     | The rewritten "Took" sentence is correct; no effect                                                                                       |
| P2  | Spec          | wontfix     | Check 23 supports 801's "Done when"; it fails when it should                                                                              |
| P3  | Spec          | fixed       | `a3a23d69` code-quality pass                                                                                                              |
| P4  | Spec          | fixed       | Same as A3; `19696dc6`                                                                                                                    |
| I1  | Instruction   | fixed       | `231dba6a`: the darker-background option removed, with the figures                                                                        |
| I2  | Instruction   | fixed       | `231dba6a`: "Remove the entry when a fix closes this ticket"                                                                              |
| I3  | Instruction   | fixed       | `231dba6a`: "Done when" needs axe passes, and notes that no fixture shows a rare item                                                     |
| I4  | Instruction   | fixed       | `231dba6a`: ticket 841 cites `data/tab-fixtures/README.md` for the banner                                                                 |
| I5  | Instruction   | wontfix     | No trial run: a trial of a ticket is working the ticket; two cold-reader dry runs were done instead                                       |
| R1  | Focused check | fixed       | `19696dc6`; round 3 passed                                                                                                                |

## Merge account

What ticket 801 asks the merge account to hold. The evidence files are
gitignored and sit in this worktree's
`.scratch/agent-reports/801-runs/`.

- **Layout gate wall time.** Before the branch (`c229d129`, 6 fixture
  pages): harness 102.4 s, fixture pages 94.5 s (`layout-before.txt`;
  the gate itself skipped on that unchanged tree).
  After the round 1 fixes (`eee6cb82`, before the code-quality pass, 11 fixture pages):
  `check_layout_gate.py` 185.5 s in total, harness 183.8 s, fixture
  pages 176.1 s (`review-fixes/gate-final.txt`). The per-page times
  were 14.0 s to 21.1 s. `mock-many-rows` took the longest, at 21.1 s.
  These times leave out the bundle build. In this sandbox the build was
  done by hand (`serve-and-run.sh`); `pnpm merge-to-dev` does the build
  itself.
- **Captures.** One `pnpm tab-review` run at `e9f771ad` captured all 11
  pages at 375 and 1280 px, 22 PNGs, with the verdict `captured`
  (`tab-review/`, `tab-review.txt`). That run came before the D1 fix,
  so `801-enhancement-*` shows the gloves under "Waist". Only
  `801-shadow-post-run-1280-0.png` has been looked at by eye.
- **Layout lock.** Each green gate run here advanced
  `data/wowsims-fork-layout.lock.json`, and each was restored, because
  the runs used a hand-built bundle and the sandbox's Chromium shim.
  `pnpm merge-to-dev` runs the gate again and commits the lock.
- **Tickets.** This branch filed 840, 841, 842 and 843 and closed 801.
  It filed more than it closed: three of the four record problems that
  this branch's checks found on other code.
