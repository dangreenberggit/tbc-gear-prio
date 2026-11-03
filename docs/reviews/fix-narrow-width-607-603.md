# Pre-merge review — fix/narrow-width-607-603

Reviewed range: `cf8e37a176f4aa0cb45e4a036567483e1bf2b4b7..f8ea455a523384deb75e2ea33db2a58413a140b0`

Fork range (vendor/tbc-new-fork, branch `fix/narrow-width-607`):
`13a980cf39b81b08f065e90dd000f710a2160e83..2bedbf6b7cdc14428f76a71a8776e11fbed06768`
(one commit; the lock names `2bedbf6b7` with `"pushed": false`).

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

## Disposition

| ID  | Axis      | Disposition | Ticket / note                                                                                                                                  |
| --- | --------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Standards | fixed       | Ticket 607's closing note now says the manifest is gitignored and another checkout needs a new `pnpm tab-review` manifest                      |
| P2  | Spec      | fixed       | Ticket 607's closing note now says check 20 failed at 375 px on all six fixtures and check 21 on four, naming the two that passed              |
| P1  | Spec      | wontfix     | The ticket's alternative clause is met: every gate fixture measured badges at 375 and 653 (`2026-11-03-layout-green-fixed-fork.txt`)           |
| P3  | Spec      | wontfix     | Within 607's ask (the tab's own cell, no upstream file changed); the test gap it opens is A1                                                   |
| S6  | Standards | wontfix     | The tip is green and the next commit fixes it; the broken gate is outside `pnpm verify`; rewriting branch history to split it buys nothing now |
| S7  | Standards | wontfix     | A habit already in the repo (ticket 655); the commands record what ran on this machine, which is what `Verified by:` is for                    |
