# Pre-merge review — fix/narrow-width-607-603

Reviewed range: `cf8e37a176f4aa0cb45e4a036567483e1bf2b4b7..f8ea455a523384deb75e2ea33db2a58413a140b0`

Fork range (vendor/tbc-new-fork, branch `fix/narrow-width-607`):
`13a980cf39b81b08f065e90dd000f710a2160e83..2bedbf6b7cdc14428f76a71a8776e11fbed06768`
(one commit; the lock names `2bedbf6b7` with `"pushed": false`).

Reviewed range: `f8ea455a523384deb75e2ea33db2a58413a140b0..b073d1febd68fccc83f1c15e0b4f575ab3faada3`

Round 2 fork range: `2bedbf6b7cdc14428f76a71a8776e11fbed06768..7c261c5410cb4bdaf55b0e5a62fc4cc4c2c43aa5`
(one commit; the lock names `7c261c541` with `"pushed": false`). The first
run of round 2 read main `f8ea455a..d06482d5` and fork
`2bedbf6b7..b88572dc4`; the owner ruled on 2026-11-03 that the history be
made right, and those unpushed commits were rewritten (see
`## Focused check (round 2)`).

## Dispatch note

- Tooling check: `python scripts/check_merge_ready.py --product-files`
  (rc 0) printed six product files: `data/sim-implemented-effects.json`,
  `data/wowsims-fork-layout.lock.json`, `data/wowsims-fork.lock.json`,
  `docs/upgrades-tab-scope.md`, `scripts/tab-harness/run-tab-cdp.mjs`,
  `scripts/tab-harness/test-layout.mjs`. The other two changed files are
  the closed tickets `.scratch/carry-forward/issues/603-*.md` and
  `607-*.md`. `instruction-review` was not run on them: they are tickets,
  not agent instructions, and the Spec axis read both as its spec and
  checked their closing notes. The fork diff (six files under
  `ui/features/upgrades/`) was reviewed with the product files.
- Lane: full axes. `git diff --shortstat cf8e37a1...f8ea455a` gave
  `8 files changed, 146 insertions(+), 12 deletions(-)`, and the branch
  changes paths under `data/` (and the fork under `vendor/`), which the
  small-change lane excludes.
- Reviewers: `codex` is not on `PATH`; each axis ran as a fresh
  `general-task` agent on Opus. Standards and Spec ran as the two
  sub-agents of the `code-review` skill. All axes were told they write
  nothing.
- Domain axis skipped: the diff states no TBC, WCL or wowsims fact. It
  changes how the tab wraps zone names and difficulty marks it already
  showed, and a lock and generated-file bump for the re-pin.
- Wowsims-file check (`docs/fork-upstream-touchpoints.md`):
  `git -C vendor/tbc-new-fork diff --name-only --diff-filter=M cec2a7b68 <c> | wc -l`
  gives 1 at both `13a980cf3` and `2bedbf6b7`, with the same file list;
  none of the six changed fork files exists at `cec2a7b68`.

## Adversarial

No high-severity defect. Checked and clean: `format.ts:116` holds the
bytes C2 A0; no difficulty-mark pattern in `keepMarkWithZone` can match
inside another; sorting, export and "Filter by source" read
`rowSourceDetail` and zone keys, which keep the plain space; the only
script that reads the Source cell from the page is `run-tab-cdp.mjs:444`,
which now maps U+00A0 to a space, and the desktop golden
`data/desktop-gate/golden-ret-p4-cap40.json` records plain spaces;
`vitest run ui/features/upgrades ui/features/gear` rc 0, 91 files, 924
tests; `gap-y-1` also adds 4 px under "(owned)" and "(not an upgrade)",
and the virtualizer measures each row (`useVirtualRows.ts:99`). The red
log `.scratch/agent-reports/2026-11-03-layout-red-unfixed-fork.txt`
(header `13a980cf39b8…`) shows checks 19, 20 and 21 failing on the old
fork commit.

- **A1.** `vendor/tbc-new-fork/ui/features/upgrades/components/ResultsTable/SourceCell.tsx:22-42`:
  `dropSource` now copies upstream's drop-with-npc branch of `ItemSource`
  for every drop with a known zone and npc, where before it did so only
  for the npc names that overran their AtlasLoot key. No test compares its
  output with `ItemSource`'s (`ResultRow.test.tsx` asserts fixed strings;
  `item_source.test.tsx` checks only whether `ItemSource` shows anything),
  and neither `docs/fork-upstream-touchpoints.md` nor
  `docs/agents/upstream-catch-up.md` names this copy. If an upstream
  catch-up changes that branch, the tab's Source cell stops matching the
  gear picker with no failing test. Today's output matches upstream (code
  comparison with `ui/features/gear/components/SelectorModal/ItemSource.tsx`).
- **A2.** `scripts/tab-harness/test-layout.mjs`, check 19: a badge whose
  top is above the middle of the name's last line is skipped, not counted.
  The comment ("a badge pulled up into that line counts as a gap below
  zero rather than as a badge beside the name") does not say where the
  line is drawn. In today's `ItemNameCell.tsx` the badges sit in the
  grid's second row, so a badge can only be in that upper half if the
  layout breaks; if every badge moved beside the name, the count would be
  0 and the guard would fail the check.

## Domain

Skipped (see Dispatch note).

## Standards + Spec

### Standards

- **S1 (documented standard).** Ticket 607's closing note said "a fresh
  checkout rebuilds them with the second command"; that command reads
  `.scratch/agent-reports/2026-11-03-tab-review/manifest.json`, which is
  gitignored (`git check-ignore -v` → `.gitignore:43 .scratch/*`). Rule:
  global `AGENTS.md` § Durable claims, "Never assert that a gitignored or
  untracked generated input is present for a fresh worktree".
- **S2 (Duplicated Code, judgement call).** `utils/format.ts` builds the
  " (mark)" text in `sourceDetail`, in `DIFFICULTY_MARKS` and in
  `zoneWithMark`, and `keepMarkWithZone` then edits finished text to swap
  the space. `zoneWithMark` could be written as `keepMarkWithZone` over
  the plain text, leaving one place that encodes the joining rule.
- **S3 (readability, judgement call).** `format.test.ts` writes the
  expected strings with a raw no-break space, so
  `keepMarkWithZone('Black Temple (N)…')).toBe('Black Temple (N)…')`
  reads as "nothing changed". `ResultRow.test.tsx` in the same commit
  writes ` `, and `set_bonus_labels.test.ts:10` names `const NBSP`.
- **S4 (Mysterious Name, judgement call).** `measuredSubjects(id, width,
count)` in `test-layout.mjs` adds to a count; its name reads like a
  getter.
- **S5 (comment policy, judgement call).** `SourceCell.tsx`'s second doc
  block ("A drop from a known npc is drawn by `dropSource`, and the plain
  text goes through `keepMarkWithZone`") and `zoneWithMark`'s doc comment
  mostly restate the code.
- **S6 (judgement call).** Commit `74241621` pinned a fork commit that
  broke the desktop gate; `f8ea455a`'s body says so ("failed on the golden
  run's plain space after fork 2bedbf6b7"). Global rule: commit per green
  slice. The desktop gate is not in `pnpm verify`
  (`grep -n desktop scripts/run_verify.mjs` finds nothing).
- **S7 (judgement call).** The `Verified by:` commands in tickets 603 and
  607 start with `PATH=/tmp/claude-1000/shim … PLAYWRIGHT_BROWSERS_PATH=/tmp/claude-1000/pwb`,
  paths on this machine only. Ticket 655 does the same.

No finding: re-pin order (fork commit, then lock bump and regen in
`74241621`) matches `paired-worktrees.md` § Re-pin; `"pushed": false`
matches `git branch -r --contains 2bedbf6b7` (no remote branch); both
tickets close with `Status: closed` and a `Verified by:` block.

### Spec

Both tickets' acceptance criteria are met. 607: the 375 px capture
`607-toggles-post-run-375-0.png` shows "View options" on its own line and
both toggles on the next; check 21 found 0 lone marks at all four widths
on all six fixtures (`2026-11-03-layout-green-fixed-fork.txt`); twelve
captures exist and `index.json` lists 0 errors. 603: check 19 reads 3 to
19 badges per fixture at 375 and 653 after the fix, and 0.5 px gaps on the
old fork commit. `docs/upgrades-tab-scope.md`: the 607 and 603 rows are
removed and the new sentence names the right branch and fork commit.

- **P1.** 603 asks: "it fails when no row in the fixture has a badge below
  its name (the 425 lesson), or the fixture is chosen so that one does."
  The guard sums over all fixtures at each width, so one fixture with no
  badges passes while another has some. The second clause is met: every
  gate fixture measured badges at both widths.
- **P2.** 607's closing note said "Against the unfixed fork `13a980cf3`
  both failed on every fixture that has them." The red log shows check 20
  failing at 375 px on all six fixtures and check 21 failing on four;
  `mock-dropped-list` and `mock-set-bonus` passed check 21 at every width
  (`grep -E '^(PASS|FAIL) \(21\)'` over the red log).
- **P3.** `SourceCell.tsx` now draws every drop from a known npc itself.
  607 says "a fix should change the tab's own cell or column width, not
  that component, unless the owner approves the exact upstream edit"; the
  copy is in the tab's own cell and no upstream file changed. Its cost is
  A1. The `gap-y-1` restore and the `run-tab-cdp.mjs` change are needed by
  the new check 19 and by the desktop gate.

## Code quality

| ID  | Row                                                                                  |
| --- | ------------------------------------------------------------------------------------ |
| A2  | Say in check 19's comment that a badge in the upper half of the line is skipped      |
| S2  | One place encodes the zone-and-mark joining rule (`zoneWithMark` via the other)      |
| S3  | `format.test.ts` writes the no-break space as ` ` or a named constant                |
| S4  | Rename `measuredSubjects` to a name that says it adds to a count                     |
| S5  | Cut the "what" parts of `SourceCell.tsx`'s second doc block and `zoneWithMark`'s doc |

## Summary

No data loss and no silent wrong result. One finding blocks the merge
until it is fixed or the owner allows a deferral:

- **A1, blocking.** The Source cell now copies upstream's drop display
  for every boss drop, and no test would fail if upstream changes that
  display. Introduced by this branch (the copy used to cover only the
  overrun npc names). Suggested fix: a fork unit test that renders
  `ItemSource` and `dropSource` for an ordinary drop and compares them,
  with the no-break space read as a space.

Bookkeeping S1 and P2 are fixed in ticket 607's closing note in the
review commit. Five code-quality rows (A2, S2-S5) wait for one
code-quality pass before round 2; they get Disposition rows after it.

Tickets so far: filed 0, closed 2 (603, 607).

After round 2 (re-run on the rewritten history): A1 and the code-quality
rows are fixed, and the review ends with no open finding (`## Disposition
(round 2)`). This branch filed 0 tickets and closed 2 (603, 607), by the
skill's two commands over `cf8e37a1...HEAD`.

## Disposition

| ID  | Axis      | Disposition | Ticket / note                                                                                                                                  |
| --- | --------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Standards | fixed       | Ticket 607's closing note now says the manifest is gitignored and another checkout needs a new `pnpm tab-review` manifest                      |
| P2  | Spec      | fixed       | Ticket 607's closing note now says check 20 failed at 375 px on all six fixtures and check 21 on four, naming the two that passed              |
| P1  | Spec      | wontfix     | The ticket's alternative clause is met: every gate fixture measured badges at 375 and 653 (`2026-11-03-layout-green-fixed-fork.txt`)           |
| P3  | Spec      | wontfix     | Within 607's ask (the tab's own cell, no upstream file changed); the test gap it opens is A1                                                   |
| S6  | Standards | wontfix     | The tip is green and the next commit fixes it; the broken gate is outside `pnpm verify`; rewriting branch history to split it buys nothing now |
| S7  | Standards | wontfix     | A habit already in the repo (ticket 655); the commands record what ran on this machine, which is what `Verified by:` is for                    |

## Focused check (round 2)

Ranges: main `f8ea455a..d06482d5` (commits `1bcb372b`, `d06482d5`);
fork `2bedbf6b7..b88572dc4` (one commit). One fresh `general-task` agent
on Opus ran the check and wrote nothing.

1. **Conditions 1 to 3: fail on condition 1.**
   - `1bcb372b` changes only this file and ticket 607; it passes.
   - Fork `b88572dc4` names A1, S2, S3 and S5 in its message; it passes.
   - `d06482d5` names only A1 ("whose new test compares the Source cell's
     copy of upstream's drop link with upstream (review A1)"). It also
     holds the A2 comment and the S4 rename in
     `scripts/tab-harness/test-layout.mjs`, and it is not a re-pin as
     `docs/agents/pre-merge-review-project.md` § Focused check defines one,
     because it changes a file under `scripts/`.
   - Condition 2 holds except for R2-2 below. Condition 3 holds:
     `git -C vendor/tbc-new-fork diff --name-only --diff-filter=M cec2a7b68 <c>`
     lists only `ui/app/SimTabsSection.tsx` at both `2bedbf6b7` and
     `b88572dc4`.
2. **Only what each finding asks: pass, with R2-2.** The A2 comment
   (`test-layout.mjs:248-251`) matches the code and the empty-count guard;
   no `measuredSubjects` is left in `scripts/`; S5 cuts the two comments;
   the A1 note in `docs/fork-upstream-touchpoints.md` names the copy. S2:
   `zoneWithMark` gives the same output as before for all 13
   `DungeonDifficulty` values and for 999 (a temporary vitest run, rc 0,
   42 cases); `Unknown` is one of `DIFFICULTY_MARKS`.
3. **Each new test asserts its finding: pass.** `SourceCell.test.tsx`
   compares the whole `outerHTML` of the tab's link with upstream
   `ItemSource`'s (class, href, rel, target, `data-whtticon`, zone and mark
   line, boss and category line). It also asserts `&nbsp;(`, so it fails
   when `dropSource` falls back to `ItemSource`. The mutation run
   `.scratch/agent-reports/2026-11-03-sourcecell-test-mismatch.txt`
   (gitignored) failed 1 of 4 cases with the category separator changed.
   Not covered (hypothesis, untested): every case has `otherName: ''`, so a
   change upstream makes to the order of its `npc` and `otherName` branches
   would not fail it.
4. **Tests the fixes touch pass.** Node v22.23.2;
   `npx vitest run ui/features/upgrades/components/ResultsTable ui/features/upgrades/utils`
   in the fork: rc 0, 12 files, 139 tests.

Findings:

- **R2-1 (bookkeeping).** `d06482d5`'s message does not name A2 or S4,
  the fixes it holds in `scripts/tab-harness/test-layout.mjs`.
- **R2-2 (not bookkeeping; no change in behaviour).** Fork
  `ui/features/upgrades/utils/format.ts:116` changes `NO_BREAK_SPACE` from
  the raw character to `' '`. S3 cited only `format.test.ts`, and
  round 1's Standards report said the raw character in `format.ts` was not
  a finding. The value is the same: the old line held the bytes C2 A0
  (`git show 2bedbf6b7:ui/features/upgrades/utils/format.ts | od -c`).

Outcome: condition 1 failed and the check found a finding that is not
bookkeeping, so the skill's Round limit rule applies. The review stops
here: there is no round-2 Disposition table and no merge check. A1 and
the code-quality rows A2 and S2-S5 have no Disposition row yet. The owner
decides what happens next.

### Re-run on the rewritten history

The owner ruled on 2026-11-03 that the fix for R2-1 and R2-2 is to make
the history right (the ruling reached this review through the
coordinating agent; its exact words are not quoted here). The unpushed
commits were rewritten: fork `b88572dc4` → `7c261c541` (amend, same
tree), main `d06482d5` → `c362f3b9`, and this file's commit `890a3364` →
`b073d1fe` (cherry-picked, same content). A fresh `general-task` agent on
Opus ran the four checks again over main `f8ea455a..b073d1fe` and fork
`2bedbf6b7..7c261c541`, and wrote nothing.

1. **Conditions 1 to 3: pass.**
   - `1bcb372b` and `b073d1fe` change only this file and ticket 607.
   - `c362f3b9` names A1, A2 and S4 and the re-pin, and holds no fixed row
     it does not name.
   - Fork `7c261c541` names A1, S2, S3 and S5, and says "The same  
     escape replaces the raw character in format.ts (same value)", which
     is the R2-2 line.
   - Condition 3: the list of modified upstream files is the same at
     `2bedbf6b7` and `7c261c541` (only `ui/app/SimTabsSection.tsx`).
2. **Only what each finding asks: pass.** The `format.ts:116` escape
   (R2-2) is the one line no round-1 finding cited; the fork commit now
   records it, as the owner's ruling asked.
3. **Each new test asserts its finding: pass.** As in the first run;
   `git diff --quiet 7c261c541 b88572dc4` gives rc 0, so the fork tree the
   mutation run `2026-11-03-sourcecell-test-mismatch.txt` tested is
   unchanged.
4. **Tests the fixes touch pass.** Node v22.23.2;
   `npx vitest run ui/features/upgrades/components/ResultsTable ui/features/upgrades/utils`
   in the fork: rc 0, 12 files, 139 tests.

Also checked: `git diff --stat d06482d5 c362f3b9` lists only
`data/sim-implemented-effects.json` and `data/wowsims-fork.lock.json`; the
lock names `7c261c5410cb…` with `"pushed": false`, and
`sim-implemented-effects.json` names the same fork commit;
`git branch -r --contains` prints nothing for the new commits; `grep -cP
'\xa0'` over the fork's `format.ts` and `format.test.ts` gives 0.

The first run's outcome paragraph above is superseded by this re-run.

## Disposition (round 2)

| ID   | Axis          | Disposition | Ticket / note                                                                                                                                                                  |
| ---- | ------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1   | Adversarial   | fixed       | Fork `7c261c541` adds `SourceCell.test.tsx`, which compares the tab's drop link with upstream `ItemSource`'s; `c362f3b9` names the copy in `docs/fork-upstream-touchpoints.md` |
| A2   | Adversarial   | fixed       | `c362f3b9`: check 19's comment says a badge in the upper half of the name's last line is skipped, and why the empty-count guard covers it                                      |
| S2   | Standards     | fixed       | Fork `7c261c541`: `zoneWithMark` goes through `keepMarkWithZone`; same output for all 13 difficulties and an unknown one                                                       |
| S3   | Standards     | fixed       | Fork `7c261c541`: `format.test.ts` writes the no-break space as ` `                                                                                                            |
| S4   | Standards     | fixed       | `c362f3b9`: `measuredSubjects` is now `addToSubjectCount`                                                                                                                      |
| S5   | Standards     | fixed       | Fork `7c261c541`: the two doc comments that restated the code are cut                                                                                                          |
| R2-1 | Focused check | fixed       | Rewritten `c362f3b9`'s message names A1, A2, S4 and the re-pin                                                                                                                 |
| R2-2 | Focused check | fixed       | Rewritten fork `7c261c541`'s message records the `format.ts:116` escape (same value), as the owner's 2026-11-03 ruling asked                                                   |
