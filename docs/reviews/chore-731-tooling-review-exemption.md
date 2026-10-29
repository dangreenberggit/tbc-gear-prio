# Pre-merge review — chore/731-tooling-review-exemption

Reviewed range: `3c008f0d2cffcb8b9218287d762abea39f3ee542..8faf766d38570fadf15ee0a1637d4c0349849aaa`

Reviewed range: `8faf766d38570fadf15ee0a1637d4c0349849aaa..363e5d1ee55ce590919bf94689905592f56b3af9`

Reviewed range: `f3d460376a92b5a33e2a7cc1a1cc697b4c4783af..c631482eea147f286c8bae2b63667117d97de441`

The third line is a fresh round 1 on the commits made after round 2
stopped (the fixes for R2-1 to R2-5). Its sections are under
`# Fresh review, round 1` at the end of this file. The commits between
round 2's end, `363e5d1e`, and `f3d46037` change only this file.

Dispatch: round 1, full axes. `codex` is not on `PATH` (`which codex`
printed nothing), so each axis ran as a fresh `general-task` agent on
Opus, all three in one parallel batch: Adversarial, and the `code-review`
skill's Standards and Spec sub-agents. The branch is too large for the
small-change lane: `git diff --shortstat dev...HEAD` gave 6 files
changed, 429 insertions, 100 deletions (529 lines, over the 150 limit).
`git diff --name-only dev...HEAD` lists
`.agents/skills/pre-merge-review/SKILL.md`,
`.claude/skills/pre-merge-review/SKILL.md`, `AGENTS.md`,
`docs/workflow.md`, `scripts/check_merge_ready.py` and
`scripts/merge_to_dev.py`.

The domain (SME) axis was skipped. The owner's words, as the
dispatching session quotes them: "pre merge review without the SME stuff
is fine (this is a different subject matter!)". The diff changes the
merge gate and agent instructions and has no game-domain content.

Context given to every axis, from the prompt of the dispatching session
(this review did not see the owner's messages): the owner approved the
exempt-path list and the exact wording in
`.scratch/agent-reports/2026-10-28-general-task-731-exemption-proposal.md`
(main checkout) § 1 and § 2, plus `.scratch/carry-forward/notes/` and
`.scratch/carry-forward/plans/` as tooling (commit `29f84ead`). The
placeholder `<GLOBAL-TOOLING-REVIEW-SKILL>` is deliberate (ticket 732).
The branch's new rule is not in force until it merges, so the review
covers the whole branch and its own "Agent-tooling branches" section
does not narrow it. Every axis was told it writes nothing.

## Adversarial

**First hunt: can a product branch pass as tooling?** The path matching
lets no product file through. Every throwaway-repo case that touched a
product file still required a review file. A branch can still merge with
no review and no error in other ways (A1, A3, A5). Every case below ran
the branch's `scripts/check_merge_ready.py` in a throwaway repo under
`$TMPDIR` against a local `dev`.

**A1. A tooling-only branch can delete open tickets and merge with no
review; deleting a phase blocker clears the phase gate.** Effect: a check
that passes when it should fail. `scripts/check_merge_ready.py:179` puts
`.scratch/carry-forward/issues/` on `TOOLING_PATHS`; `:773-774` skips a
deleted ticket (`continue  # deleted on the branch`, present on `dev`
too). Cases: branch `t-delticket` deleted two open tickets, one
`Blocks: phase-9`: rc=0, `review not required … merge-ready: ok`. Branch
`phase-9/x` deleted its own blocker: rc=0,
`no open Blocks: phase-9 tickets`; the control `phase-9/y` kept it: rc=1,
`1 open Blocks: phase-9 ticket(s)`. (The reviewer also flipped an open
ticket to `wontfix` and got rc=0; closing a ticket is ordinary ticket
work, so this review does not count that half as a defect.) Before this
branch, the required review file was the backstop. Suggested fix: fail
any branch that deletes a ticket that was open at the merge base, or
count such a deletion as a product change; add a self-test.

**A2. The code that decides "review not required" has no test.**
Effect: a test that passes when the code is wrong, on exactly the fault
this review hunts first. `scripts/check_merge_ready.py:842`
(`if not review.is_file() and not exempt:`) and the `--product-files`
output (`:1893-1902`). The reviewer copied the script to `$TMPDIR`,
inverted the test to `and exempt` (every product branch with no review
passes), and separately made `--product-files` print nothing.
`--self-test` still printed `pure logic ok (40 checks)`, rc=0, and
`scripts/check_merge_to_dev.py` does not call `check()`. Suggested fix: a
test that runs `check()` on a scratch repo (tooling branch, no review →
0; mixed branch, no review → 1), and one for `--product-files`.

**A3. The gate judges a branch with the branch's own copy of the
script.** `scripts/check_merge_ready.py:163-166` and `:185-186`;
`scripts/merge_to_dev.py:73` and `:375` load and run that copy. Case
`t-gate`: added `packages/` to `TOOLING_PATHS`, removed the gate file
from `GATE_PATHS`, edited `packages/x.ts`: rc=0, `review not required`.
Dev's copy lists `packages/x.ts` and `scripts/check_merge_ready.py` for
the same branch. The proposal's "Limits of the prototype" section records
this; the code comment at `:163-166` ("This file is not on the list, so a
change to it gets the product review") does not. Any branch could already
edit the gate before this branch. Suggested fix: in named mode, work out
product files with `dev`'s copy; at least say in the comment that the
list stops a mistake, not a deliberate edit.

**A4. On a branch with no changes, `--product-files` prints nothing and
exits 0.** Effect: a loud failure after a wrong instruction.
`scripts/check_merge_ready.py:1893-1902`, read by the "It prints
nothing" bullet in `.claude/skills/pre-merge-review/SKILL.md:30-31` (and
its mirror). Case `t-empty`: no output, rc=0, which the skill reads as
"every changed file is agent tooling … stop here"; the gate then fails,
rc=1, `missing review`. Suggested fix: exit 1 with a message when no
file changed (a script change; the skill text can stay).

**A5. A submodule entry under a tooling folder counts as tooling.**
`scripts/check_merge_ready.py:651-660` reads names only. Case: a gitlink
(mode 160000) at `.claude/skills/evil`: rc=0, `review not required`.

**A6. `GATE_PATHS` leaves out `scripts/run_verify.mjs`.** Effect: code
quality. `scripts/check_merge_ready.py:187-194`; `package.json:14` runs
that file for `pnpm verify`. It matters only if `scripts/` is added to
`TOOLING_PATHS` by mistake.

Edge cases that behaved correctly (reviewer's cases): both names of a
rename are listed; a mode-only change to a product file is product; a
non-ASCII name is quoted by git and counts as product; a merge commit
with an extra product edit is product; an unknown merge base or an empty
diff requires the review in `check()`; `AGENTS.md.bak`, a folder with no
trailing slash, and a case change all count as product; a symlink under
a tooling folder counts as tooling (only the link changes). `git grep`
of `packages`, `scripts`, `ui`, `.githooks` and `package.json` found no
product code that reads a tooling path at run time, only comments.
`pnpm verify` runs `.claude/hooks/tests/subagent-foreground-helpers.py`
(`package.json:68`), a file under a tooling folder; the approved
proposal accepts this.

Checks the reviewer ran: `python3 scripts/check_merge_ready.py
--self-test` rc=0 (40 checks); `python3 scripts/check_merge_to_dev.py`
rc=0 (12 checks); the throwaway-repo cases and the A2 mutation. Not run:
pnpm commands, and `merge_to_dev.py` end to end.

## Domain

Skipped; see the dispatch note.

## Standards + Spec

### Standards

**S1. Two commit subjects are over 50 characters (hard).** `9795fbd5`
"Skip the review file on agent-tooling-only branches" (51) and
`8bbc7f49` "List both sides of a rename in the changed-file scan" (52);
seven rules, rule 2. Found with `git log dev..HEAD --format=%s`. The
branch is on no remote (`git branch -r --contains 8bbc7f49` prints
nothing), so the subjects can still be reworded.

**S2. No recorded owner approval of the `AGENTS.md` and skill edits.**
Root `AGENTS.md` asks for approval before editing `AGENTS.md` and skill
files; ticket 731 says "The owner confirms the list before any edit";
the `9795fbd5` body says "The owner has not yet approved the list".

**S3. A docstring no longer matches the code (judgement call,
`docs/workflow.md` § Comment policy).** `scripts/check_merge_ready.py:624-627`
still calls `changed_files_vs_integration` "a warn-only advisory … must
never be the thing that stops a merge"; its result now decides whether a
review file is required (`:839-842`).

**S4. Two unclear code comments (judgement call; home `AGENTS.md`
§ Plain English, backward references).** `scripts/check_merge_ready.py:11`
"does not apply to them" (files or branches?) and `:160` "all on this
list, plus its own review file, needs no review file".

**S5. The exemption rule is written out in six places (possible Shotgun
Surgery; `writing-for-agents` § Context pointers).** `AGENTS.md:128-132`;
`docs/workflow.md` steps 4 and 5 and the Gates row; the skill's
description and body; the `check_merge_ready.py` docstring and
`TOOLING_PATHS` comment; the `merge_to_dev.py` docstring. The skill
description and `AGENTS.md` load into every agent's context.

**S6. Possible Mysterious Name / Primitive Obsession.**
`review_not_required(...)` returns a reason string or `None`, stored as
`exempt` (`:840`), tested as a boolean (`:842`), printed (`:850`).
Suggested: `review_exemption_reason`.

**S7. Possible Duplicated Code.** The `packages/x.ts` → `docs/agents/x.ts`
move test is built at `:1681` and again as the `"move"` case in
`check_review_requirement_reads_git` (`:1770`);
`review.relative_to(ROOT).as_posix()` is computed at `:834`, `:838` and
`:1899`.

**S8. Test mutates a module global; `check()` keeps growing.** The test
at `:1753` sets `global TOOLING_PATHS` while it runs; `check()` now holds
about 80 lines of review parsing under an `else` (`:851-932`).

Standards checks run: `python3 scripts/check_skill_mirrors.py` rc=0
("skill mirrors match"); commit body lines all at most 72 characters; a
grep of added lines for the home `AGENTS.md` banned words matched only
"row-shaped", an existing technical term.

### Spec

**Word for word: clean.** All five approved text edits match the
proposal after whitespace is normalised: 2a (`AGENTS.md` § Commits and
merges), 2b and 2c (`docs/workflow.md` § The loop, steps 4 and 5), 2d
(the new Gates row, right after the `Merge to \`dev\``row; Prettier
re-padded the table), and 2e (the skill description and the new
section, in both copies;`diff` of the two files prints nothing). The
Spec reviewer extracted each approved block and searched for it in the
branch file: 8 of 8 found.

**Path list: clean.** `TOOLING_PATHS` (`scripts/check_merge_ready.py:167`)
is § 1 plus the notes and plans folders: nothing missing, nothing extra.
`GATE_PATHS` (`:187`) matches § 1's never-exempt row and is checked
first. Folder entries match by prefix, file entries exactly. The
branch's own review file counts as tooling; another branch's does not.
Note: `.scratch/carry-forward/notes/` holds tracked `.py` files
(`git ls-files`); the owner approved the whole folder.

**P1. Ticket 731's "Done when" items are not met on this branch.**
Ticket lines: "`pnpm verify` passes, and `pnpm merge-to-dev --check-only`
on `chore/729-test-result` gives the result the new rule says" and "The
ticket records how the exemption branch itself was reviewed." Neither
command has run (the proposal's § Not run). Ticket 731 is not on this
branch or on `dev`: it exists only in `512b26f6` on
`chore/729-test-result`, so this branch cannot record its review in it.

**P2. An empty diff gets two answers.** Same fault as A4; § 3 of the
proposal says an empty diff means the review file is required.

**P3. The `scripts/merge_to_dev.py:15-17` docstring edit was not in
§ 2.** § 3 lists it as part of the prototype. A comment only.

**P4. `--no-renames` (`8bbc7f49`) is stricter than the ticket's literal
wording** ("`git diff --name-only dev...HEAD` lists only exempt paths").
With rename detection, moving a file from `packages/` to `docs/agents/`
would list only the new path. Listing both sides fits the ticket's goal,
and the self-test covers it.

Spec checks run: `python3 scripts/check_merge_ready.py --self-test` rc=0
(40 checks); `python3 scripts/check_merge_ready.py --product-files` on
this branch printed the two `scripts/` files, rc=0.

## Code quality

| ID  | Row                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A3c | `scripts/check_merge_ready.py:163-166`: say the list and `GATE_PATHS` stop a mistake, not a deliberate edit of the branch's own copy (ticket 733).                                          |
| A6  | `scripts/check_merge_ready.py:187-194`: add `scripts/run_verify.mjs` to `GATE_PATHS`.                                                                                                       |
| S1  | Reword the subjects of `9795fbd5` and `8bbc7f49` to 50 characters or fewer, for example "Skip the review file on tooling-only branches" and "List both sides of a rename in the file scan". |
| S3  | `scripts/check_merge_ready.py:624-627`: say a git failure makes the review file required, and that the ticket scan stays warn-only.                                                         |
| S4  | `scripts/check_merge_ready.py:11` and `:160`: name the referent in each sentence.                                                                                                           |
| S6  | Rename `review_not_required` to `review_exemption_reason`.                                                                                                                                  |
| S7  | Build the move test once; print `review_rel` at `:834` and reuse it.                                                                                                                        |
| S8  | Restore `TOOLING_PATHS` with `try`/`finally` (or pass the list in) in the test at `:1753`; move the review-file block of `check()` (`:851-932`) into its own function.                      |

No row is an agent-file edit, so § Agent files needs no owner approval
for these rows.

## Summary

Round 1 found no product file that the gate's path matching counts as
tooling, and every approved text edit and the path list match the
proposal word for word. Two findings let a check pass when it should
fail, so they are **fixed before merge**:

- **A1:** a tooling-only branch can delete open tickets, including a
  phase blocker, and merge with no review file and no error.
- **A2:** no test covers the "review not required" decision or the
  `--product-files` output; breaking either still passes all 40
  self-test checks.

Two more were introduced by this branch and **block the merge** until
fixed, unless the owner allows a deferral:

- **A4 (and P2):** on a branch with no changes, `--product-files` tells
  the reviewer to skip the review, and the gate then refuses the merge.
- **P1:** ticket 731's "Done when" checks have not run (`pnpm verify`,
  and `pnpm merge-to-dev --check-only` on `chore/729-test-result`), and
  ticket 731 is not on this branch, so the branch cannot record its own
  review in it.

A3 (the gate runs the branch's own copy of itself) is older than this
branch and is deferred to ticket 733. The eight `## Code quality` rows
go to one fix pass before round 2.

Not run in this review: `pnpm verify` and `pnpm merge-to-dev
--check-only`. The worktree has no `node_modules`
(`ls node_modules`: no such file), after `pnpm install` failed earlier
with `ERR_SQLITE_ERROR unable to open database file` (sandbox, as the
dispatching session reports). Run by the dispatcher:
`python3 scripts/check_merge_ready.py --self-test` rc=0 (40 checks),
`python3 scripts/check_merge_to_dev.py` rc=0 (12 checks),
`python3 scripts/check_skill_mirrors.py` rc=0.

Tickets so far: this branch filed 1 (733) and closed 0. Filed is higher
than closed because the one new ticket records a gap older than this
branch. After the round 1 fixes, `git diff --name-status dev...HEAD`
also lists ticket 731 as added: it was filed on `chore/729-test-result`
and brought here for P1. The final count goes here when the last Disposition table is
written.

Round 2 (the focused check) stopped: see `## Focused check (round 2)`.
Two of its findings, R2-1 and R2-2, block the merge until the owner
decides what happens next.

## Disposition

| ID  | Axis         | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A3  | Adversarial  | defer       | `.scratch/carry-forward/issues/733-merge-gate-runs-the-branchs-own-copy.md` — gap older than this branch; the comment part is Code quality row A3c                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| A5  | Adversarial  | wontfix     | the gitlink's path is under `.claude/skills/`, which the owner approved as tooling, and the reviewer's `git grep` found no product code that reads a tooling path at run time                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| S2  | Standards    | fixed       | `af9fae68`: ticket 731 § Owner approvals, 2026-10-29, quotes the owner's words on the path list, the § 2 wording, this review and the skill name, as the fixing agent's prompt gave them                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| S5  | Standards    | wontfix     | the owner approved the text in `AGENTS.md`, `docs/workflow.md` and the skill (proposal § 2) in these places; the code docstrings describe the code they sit in                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| P3  | Spec         | wontfix     | not a defect: a comment only, which proposal § 3 lists as part of the prototype                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| P4  | Spec         | wontfix     | not a defect: listing both sides of a rename stops a move out of `packages/` from passing as tooling, which the ticket's goal needs; the self-test covers it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| A1  | Adversarial  | fixed       | `1aec61bc`: rule: a branch that deletes a carry-forward ticket that was not closed at the merge base needs the review file; `--product-files` lists the deleted ticket. Closing a ticket stays ordinary ticket work (the `Verified by:` check runs on every branch). Self-test cases `drop-open`, `phase-9/drop` (the review's case) and `drop-closed`                                                                                                                                                                                                                                                                                                   |
| A2  | Adversarial  | fixed       | `120d7887`: `check_gate_cli_on_a_scratch_repo` runs a copy of the script as the CLI in a throwaway repo. With `and not exempt` inverted to `and exempt`, or `print(rel)` in `--product-files` replaced by `pass`, `--self-test` fails (rc=1); reverted after                                                                                                                                                                                                                                                                                                                                                                                             |
| A4  | Adversarial  | fixed       | `33d584ea`: with no changed file, `--product-files` exits 1 with "no file changed since the dev merge base, so the review file is required"; the skill's "It exits 1" bullet then sends the reviewer to the whole-branch review. Self-test case `empty`                                                                                                                                                                                                                                                                                                                                                                                                  |
| P2  | Spec         | fixed       | `33d584ea`, the same fix as A4                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| P1  | Spec         | fixed       | part 2: `af9fae68` brings ticket 731 onto this branch and records how this branch was reviewed. Part 1: `TBC_VERIFY_WITHOUT_FORK=1 pnpm verify` rc=0 at `977f41e3` plus the ticket (worktree has no fork; `node_modules` from `pnpm install --frozen-lockfile --store-dir /home/daniel/.cache/pnpm-store-731`). `python3 scripts/check_merge_ready.py --branch chore/729-test-result` rc=0, "review not required: every one of the 10 changed file(s) is agent tooling". `TBC_VERIFY_WITHOUT_FORK=1 pnpm merge-to-dev --check-only` on this branch at `abd4148f`: rc=0, "check-only: ok (not merging)"; the layout gate and fork gates skipped (no fork) |
| A3c | Code quality | fixed       | `b33d936f`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| A6  | Code quality | fixed       | `b33d936f`; the gate-paths self-test now names `scripts/run_verify.mjs`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| S3  | Code quality | fixed       | `b33d936f`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| S4  | Code quality | fixed       | `b33d936f`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| S6  | Code quality | fixed       | `b33d936f`: `review_exemption_reason`, stored as `exemption`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| S7  | Code quality | fixed       | `b33d936f`: the rename case lives only in `check_review_requirement_reads_git`; `check()` computes `review_rel` once                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| S8  | Code quality | fixed       | `b33d936f`: `is_tooling_path` takes the list as an argument, so the test no longer sets a global; the review-file block is `review_file_errors()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| S1  | Standards    | wontfix     | the subjects stay: this review file cites `9795fbd5` and `8bbc7f49`, and rewording them would change those shas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

## Focused check (round 2)

Range: the second `Reviewed range:` line, `8faf766d..363e5d1e`. Fork
range: none. This worktree has no `vendor/tbc-new-fork`, and
`git diff --quiet dev...HEAD -- data/wowsims-fork.lock.json` exits 0, so
the branch never moves the fork pin and condition 3 holds. Dispatch: one
fresh `general-task` agent on Opus (`codex` is not on `PATH`). It got the
range, round 1's findings, the four checks and the points the dispatching
session listed. It was told to treat the Disposition notes as claims to
test, and that it writes nothing. Its full logs:
`.scratch/agent-reports/2026-10-29-general-task-731-round2-focused-check.md`
in this worktree (gitignored).

**Condition 1 does not hold.** `977f41e3` fixes no round 1 finding: it
puts the owner's chosen skill name, `instruction-review`, in place of the
`<GLOBAL-TOOLING-REVIEW-SKILL>` placeholder that the round 1 dispatch note
called deliberate (ticket 732). Also, no commit message names the
finding IDs it fixes, and `b33d936f` does not name its Code quality rows.
For every commit other than `977f41e3`, the Disposition table and the
diffs show which finding the commit fixes. `94dd3c34` also changes
`.scratch/carry-forward/map.md`, and `363e5d1e` changes `NEXT` and a
code comment. Under "Round limit" a failed condition stops round 2. The
check ran anyway, because the dispatching session asked for `977f41e3`
and ticket 731 to be checked; its result does not change that outcome.

**Condition 2 holds.** Every changed code line is at a place a finding
cites, or is the `_merge_base` helper that the A1 fix needs.

### The four checks

1. **Conditions: FAIL** (condition 1, above).
2. **Each diff changes only what its finding asks for: PASS.**
   `977f41e3` changes only the placeholder token (word diff). All 8 of
   8 approved blocks of proposal § 2 are found in `AGENTS.md`,
   `docs/workflow.md` and both skill copies, after the name swap and
   whitespace normalising. `git grep GLOBAL-TOOLING` matches only this
   file. Ticket 731 differs from its `chore/729-test-result` copy
   (`512b26f6`) only by two added sections, "Owner approvals,
   2026-10-29" and "How the exemption branch was reviewed".
3. **Each new test asserts its finding: PASS for the asked mutations,
   with gaps (R2-3).** On copies of the script at `363e5d1e`,
   `--self-test` fails (rc=1) with: the review-required test in `check()`
   inverted; `--product-files` printing nothing; `--product-files`
   exiting 0 on an empty diff; the deleted-open-ticket rule dropped from
   `check()`, from `--product-files` or from `product_files()`; every
   deleted ticket counted as closed; `--no-renames` dropped;
   `scripts/run_verify.mjs` dropped from `GATE_PATHS`; an empty diff
   counted as exempt. The restored copy passes. `b33d936f` changes no
   behaviour: the scripts at `33d584ea`, `b33d936f` and `363e5d1e` give
   the same output on every throwaway-repo case.
4. **The tests the fixes touch pass: PASS.** `python3
scripts/check_merge_ready.py --self-test` rc=0 (40 checks);
   `python3 scripts/check_merge_to_dev.py` rc=0 (12 checks);
   `python3 scripts/check_skill_mirrors.py` rc=0.

The deleted-ticket rule held in every bypass case tried: deleting a
ticket whose status is `open`, `**Status:** open`, `OPEN` or `blocked`;
renaming it inside `issues/`; moving it to `notes/`, to a subfolder or
to `docs/agents/`; deleting it and adding it under a new name; a phase
branch deleting its own blocker. Each needs the review file, and
`--product-files` agrees with `check()` in every case. Deleting `map.md`
lines, deleting `NEXT`, deleting a closed or `wontfix` ticket and
editing an open ticket stay exempt.

### Findings

**R2-1. A tooling-only phase branch can clear its own phase blocker
with no review file, by editing the ticket instead of deleting it.**
Effect: a check that passes when it should fail.
`scripts/check_merge_ready.py:1031` reads the blockers from the
branch's current tickets; `:114` leaves `wontfix` out of
`CLOSED_STATUSES`, so no `Verified by:` line is needed. Cases (re-run by
the dispatching agent with `$TMPDIR/r2/cases.sh`): branch
`phase-9/wontfix` sets `Status: wontfix` on its `Blocks: phase-9`
ticket, and branch `phase-9/unblock` deletes the ticket's `Blocks:`
line. Both: rc=0, "review not required … no open Blocks: phase-9
tickets … merge-ready: ok". Round 1 ruled the `wontfix` edit ordinary
ticket work; it did not consider the `Blocks:`-line edit. Before this
branch, the required review file covered both. Suggested fix: a phase-N
branch gets no exemption when a ticket that was an open `Blocks:
phase-N` ticket at the merge base no longer is one.

**R2-2. `--check-only` misses an uncommitted ticket deletion.** Effect:
a silent wrong result, in the preview only.
`scripts/check_merge_ready.py:675-708`: `deleted_open_tickets` reads
commits, while the blocker scan reads the working tree when the branch
is checked out (`:804`). Case `phase-9/keep` with its blocker deleted
but not committed: rc=0, "review not required … no open Blocks: phase-9
tickets … merge-ready: ok" (re-run by the dispatching agent). A real
merge refuses a dirty tree (`scripts/merge_to_dev.py:524-525`), and
once the deletion is committed the gate asks for the review. Suggested
fix: when the branch is checked out, also list working-tree deletions,
as `tickets_closed_without_verification` does.

**R2-3. Four paths of the deleted-ticket rule have no test.** Effect: a
test gap. Each of these mutations of `:675-708` still passes
`--self-test` (rc=0, 40 checks): a status unreadable at the merge base
counts as closed (the docstring says open); `--diff-filter=D` dropped
(every tooling branch that edits an open ticket would need a review);
the top-level-only folder filter dropped; `wontfix` at the merge base
counts as open. Suggested fix: CLI cases for editing an open ticket, a
ticket with no status at the merge base, deleting a `wontfix` ticket,
and a nested `.md` file.

**R2-4. Bookkeeping.** The commit messages do not name the finding IDs
(condition 1). `94dd3c34` filed ticket 733 without moving `NEXT`
(`docs/agents/issue-tracker.md:22-23`); `363e5d1e` set it to 734, which
is right: 733 is the highest ticket, and 732 exists only on
`chore/729-test-result`.

**R2-5. Bookkeeping.** Ticket 731's "Done when" asks for
`pnpm merge-to-dev --check-only` on `chore/729-test-result`. What ran
was `python3 scripts/check_merge_ready.py --branch chore/729-test-result`
(rc=0, "review not required: every one of the 10 changed file(s) is
agent tooling"; re-run by the check agent). The ticket does not say so.

**R2-6. Bookkeeping, not a defect.** The check agent saw this file
dirty: the dispatching agent had written the round 2 `Reviewed range:`
line before dispatch, as step 1 says.

Ticket 731's owner quotes each name a date and a source, the prompt of
an agent, so each is second hand; the check agent could not see the
owner's messages and did not confirm the words. One sentence, "The
owner said it matters more.", is a paraphrase with no source; it is not
shown as a quote.

### Outcome

Round 2 stops under "Round limit": condition 1 fails, and the check
found R2-1 and R2-2 (checks that pass when they should fail) and R2-3 (a
test gap). There is no round 3 and no round 2 Disposition table. R2-1
and R2-2 are "fixed before merge" findings introduced by this branch;
they block the merge until the owner decides what happens next. Ticket
731's "Done when" items are not changed by this round.

Run at the dispatching session's request:
`TBC_VERIFY_WITHOUT_FORK=1 pnpm verify` at `363e5d1e`, with only this
file's `Reviewed range:` line uncommitted, rc=0, "gates: 1345 ran, 218 skipped". The
skipped gates name the missing fork: sim-implemented-effects, engine
port drift, the fork half of equip eligibility, fork lint, fork tests,
mock fixtures, EP presets, meta conditions, fork data copies, the layout
gate, and the fork-backed test cases (`wowsims-fork-parity`,
`CliSimRunner`, the 535, 538 and 541 cases among them). The
`pnpm merge-to-dev --check-only` result is in the dispatching agent's
report, not here, because it runs on the commit that adds this section.

## Disposition (round 2)

Added after round 2 stopped, at the dispatching session's request: the
fixes for R2-1 to R2-5. No round 3 ran. The rule for R2-1 is the
session's ruling: a tooling-only branch needs the review file when it
deletes a ticket that was open at the merge base, or changes such a
ticket so that it is no longer open (`closed`, `resolved` or `wontfix`)
or its `Blocks:` values are removed or changed. Other edits of an open
ticket stay exempt. Row R2-1b records the session's later correction of
that ruling: closing an open ticket with a valid `Verified by:` line
stays exempt.

| ID    | Axis          | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----- | ------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R2-1  | Focused check | fixed       | `947561e3`: `ticket_let_go` and `tickets_let_go` replace `deleted_open_tickets`; `--product-files` and `check()` both use the result. Self-test CLI cases `phase-9/wontfix`, `phase-9/unblock`, `reblock` and `close-open` fail on the code at `f3d46037` (gate rc=0 "review not required", `--product-files` prints nothing) and pass at `947561e3` (rc=1 "missing review", `--product-files` prints the ticket). Effect of the ruling: closing an open ticket, with a `Verified by:` line or without, now needs the review file; `chore/729-test-result` closes ticket 729, so it needs its review file (ticket 731 § The merge check on `chore/729-test-result`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| R2-1b | Focused check | fixed       | Amends R2-1 after the session corrected its ruling. `ticket_let_go`: a ticket open at the merge base that becomes `closed` or `resolved` with a `Verified by:` line that `closed_without_verification` accepts is ordinary ticket work and keeps the exemption. Deleting it, setting it to `wontfix` or any other status outside `OPEN_STATUSES` (an unknown word included), closing it with no valid `Verified by:`, and removing or changing its `Blocks:` values while it stays open still need the review file. A verified close that also edits `Blocks:` stays exempt: `open_blockers_for_phase` skips a ticket whose status is not in `OPEN_STATUSES`, whatever its `Blocks:` says, and `tickets_closed_without_verification` reads the same merge base and the same new text, so no edit clears a phase blocker unless that check accepts the close. Limit: a close verified by `` `true` `` passes, the same bar as on every branch. Tests: pure cases "open to closed, verified", "bold open to resolved, verified", "verified close that also drops its Blocks:", "open to an unknown status" and "open to closed with a placeholder Verified by:"; CLI case `close-open` (a verified close that keeps `Blocks: phase-9`) and new case `phase-9/close-true` want rc=0 "review not required", new case `phase-9/close-bare` wants rc=1 "missing review". On the code at `95c54e25` the self-test fails the first four pure cases and the `close-open` and `phase-9/close-true` CLI cases. `chore/729-test-result` is exempt again (ticket 731 § The merge check on `chore/729-test-result`) |
| R2-2  | Focused check | fixed       | `947561e3`: when the branch is checked out, the changed files and the ticket rule read the working tree and untracked files (`_reads_working_tree`, `_names_changed_since`), as `tickets_closed_without_verification` already did. Chosen over refusing a dirty tree in `--check-only`: that refusal is fewer lines, but it removes the deliberate "(working tree dirty — allowed for --check-only)" in `scripts/merge_to_dev.py` and leaves `pnpm merge-ready` wrong, which calls `check()` with no clean-tree check. One rule, "a checked-out branch is read from its working tree", fixes both, and also covers an uncommitted product file. Self-test cases "uncommitted ticket deletion", "uncommitted wontfix" and "uncommitted product edit" fail at `f3d46037` (rc=0) and pass at `947561e3`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| R2-3  | Focused check | fixed       | `947561e3`: pure test `check_ticket_let_go_rule` (15 cases) and CLI cases `edit-open`, `drop-wontfix`, `drop-nested`. Each mutation, injected into the file in place, makes `--self-test` exit 1; `cmp` shows the file restored after each: unreadable status at the base counted as not open ("no status at the base counts as open"); every listed ticket counted as deleted, the fault that dropping `--diff-filter=D` caused before (`edit-open` rc=1); the top-level-only folder filter dropped (`drop-nested` rc=1); `wontfix` at the base counted as open ("wontfix ticket deleted"). The new code lists edits as well as deletions, so `--diff-filter=D` itself is gone                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| R2-4  | Focused check | fixed       | `947561e3`, `65bd1b86` and the commit that adds this table name their finding IDs. Older commits are left as they are. `NEXT` is 734, as round 2 found                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| R2-5  | Focused check | fixed       | `65bd1b86`: ticket 731 § The merge check on `chore/729-test-result` names the command that ran, its results at `abd4148f` and `947561e3`, and why `pnpm merge-to-dev --check-only` would have tested the old rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| R2-6  | Focused check | wontfix     | not a defect: step 1 of the skill has the dispatching agent write the `Reviewed range:` line before dispatch                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

# Fresh review, round 1

Range: the third `Reviewed range:` line, `f3d46037..c631482e` (commits
`947561e3`, `65bd1b86`, `95c54e25`, `c631482e`). The dispatching
session scoped this round to the commits made after round 2 stopped.
`git diff --shortstat f3d46037..c631482e`: 3 files changed, 291
insertions, 60 deletions, over the small-change limit of 150 lines, so
the axes ran separately. `codex` is not on `PATH`. Each axis ran as a
fresh `general-task` agent on Opus, all three in one parallel batch:
Adversarial, and the `code-review` skill's Standards and Spec
sub-agents. The domain axis was skipped under the same owner ruling as
round 1: "pre merge review without the SME stuff is fine (this is a
different subject matter!)" (quoted by the dispatching session).

Each axis got the diff, the intent of the commits as the dispatching
session states it (below), round 2's findings, and was told to treat the
`## Disposition (round 2)` notes as claims to test. Intent: a
tooling-only branch needs no review file, except when it deletes a
ticket that was open at the merge base, sets an open ticket to `wontfix`
or any status that is not a verified close, closes an open ticket
without a valid `Verified by:` line, or removes or changes the `Blocks:`
values of a ticket that stays open; a verified close keeps the
exemption. `--check-only` and `pnpm merge-ready` must see uncommitted
changes the same way as committed ones. Ticket 731 records the merge
check on `chore/729-test-result`. Not raised again, because the owner
has them already: the `docs/workflow.md` Gates row does not mention the
ticket cases; a likely merge conflict on ticket 731 and `NEXT` with
`chore/729-without-dry-run`.

## Adversarial (fresh round 1)

The case script from earlier rounds, run on the script at `c631482e`
(`bash /tmp/claude-1000/r2/cases.sh /tmp/claude-1000/r3/cmr-c631482e.py
/tmp/claude-1000/r3/cases-repo`, log
`/tmp/claude-1000/r3/cases-c631482e.log`), gives the intended result in
every case: `phase-9/wontfix`, `phase-9/unblock`, `phase-9/close-bare`
and an uncommitted blocker deletion need the review file;
`phase-9/close-true` (a close with `` Verified by: `true` ``) stays
exempt, which the intent allows. Deletes, renames, moves, case changes,
bold and unknown statuses, `**Blocks:**`, an empty `Blocks:` line, no
local `dev` and an orphan branch all need the review file, and
`--product-files` agrees with the gate in every case (the axis's own
cases, `/tmp/claude-1000/adv3/mycases.sh`).

**A7. A tooling-only phase branch can still clear its own blocker with
no review file, by rewriting its `Blocks:` lines.**
`scripts/check_merge_ready.py:706-713` (`_blocks_values`) compares the
set of values on every `Blocks:` line, but `open_blockers_for_phase`
reads only the first `Blocks:` line (`:514`, `BLOCKS_RE.search`). An
edit that keeps the set but changes the first line passes the first
check and clears the blocker. Inputs: `Blocks: phase-9` becomes
`Blocks: ,` followed by `Blocks: phase-9`; or a ticket with `Blocks:
phase-11` and `Blocks: phase-12` lines swaps their order on branch
`phase-11/…`. Axis result for both: gate rc=0, "review not required",
"no open Blocks: phase-N tickets", "merge-ready: ok", and
`--product-files` prints nothing (`bash /tmp/claude-1000/adv3/mycases.sh
/tmp/claude-1000/adv3/cmr.py /tmp/claude-1000/adv3/repo2`). The
dispatcher confirmed the two halves on the module at `c631482e`:
`ticket_let_go` returns False for both edits, and the first `Blocks:`
value is `,` and `phase-12`. No test has a ticket with two `Blocks:`
lines: reading only the first match in `_blocks_values`
(`/tmp/claude-1000/adv3/m5_blocks_first_only.py`) still passes
`--self-test` (rc=0, 41 checks; re-run by the dispatcher). Both edits
are deliberate, and no ticket on `dev` has two `Blocks:` lines (the
axis's search). Effect: a check that passes when it should fail. It
disproves the R2-1b note "no edit clears a phase blocker unless that
check accepts the close".

**A8 (also Spec P5). In the main checkout, every tooling-only branch
now needs a review file.** `scripts/check_merge_ready.py:688` adds `git
ls-files --others --exclude-standard` to the changed files when the
branch is checked out. In the main checkout that listing gives the 17
empty character-device files the sandbox leaves there (`.bashrc`,
`.mcp.json`, `.idea`, `.claude/commands` and others; `stat` shows
"character special file", size 0). `scripts/merge_to_dev.py:149`
(`SANDBOX_STUBS`, `holds_no_work`) treats them as no work, so the merge
passes its clean-tree check and the gate then refuses it. The
dispatcher re-ran this on the module at `c631482e` with `root` set to
the main checkout, which has `chore/729-test-result` checked out:
`changed_files_vs_integration` gives 27 files, of which the 17 stubs
are not tooling (plus the branch's own review file). The Spec axis got
`exemption: None` for the same call. Ticket 731 says
`chore/729-test-result` is exempt again; that holds for `--branch` from
another checkout (`python3 scripts/check_merge_ready.py --branch
chore/729-test-result` from this worktree: rc=0, "review not required
… 10 changed file(s)"), not in its own checkout. Effect: a loud wrong
failure ("missing review") that this branch introduced. Whether the
owner merges from the main checkout is hypothesis, untested.

**A9. Test gap: the self-test never runs the ticket rule on a branch
that is not checked out.** Every CLI case checks the branch out before
it runs the gate. `from_tree = True` at `:757`
(`/tmp/claude-1000/adv3/m1_letgo_always_tree.py`) still passes
`--self-test` (rc=0, 41 checks; re-run by the dispatcher). With that
mutation, `--branch phase-9/wontfix` run from `dev` would read `dev`'s
tickets and miss the change (the axis's reading of the code).

**A10. Test gap: untracked files are never tested.** Deleting the `git
ls-files --others` line at `:688`
(`/tmp/claude-1000/adv3/m4_no_untracked.py`) still passes `--self-test`
(rc=0, 41 checks; re-run by the dispatcher). The three "uncommitted"
cases edit tracked files only, though the R2-2 note says an uncommitted
product file is covered.

**A11. `--check-only` reads the working tree, not what a commit would
hold, when the two differ.** The axis raised this as a hypothesis; the
dispatcher ran it in the case repo. On branch `tooling`, stage `**Status:**
wontfix` on the open ticket `3-bold.md`, then put the working-tree copy
back to `open` (`git status`: `MM`). The gate gives rc=0, "review not
required … merge-ready: ok". After `git commit` (which commits the
staged `wontfix`) the gate, still reading the working tree, again says
"merge-ready: ok". A real merge refuses the dirty tree
(`scripts/merge_to_dev.py:524-525`), and once the tree is clean the gate
asks for the review. Effect: a wrong "ok" in the preview only, the same
kind as R2-2. The trigger is narrow: the staged copy and the working
copy of a ticket must differ.

Not a finding: a verified close with `` Verified by: `true` `` clears a
blocker with no review file; the intent allows it, and the same bar
holds on every branch.

**Unexamined** (from the axis): device-file stubs could not be made
inside the sandbox (the live listing stood in); non-UTF-8 ticket text
and the `--review` override, both older than this range; symlinked
ticket files.

## Standards + Spec (fresh round 1)

### Standards

**S9. The module docstring contradicts the code.**
`scripts/check_merge_ready.py:12-15` says "A branch that deletes or
closes a ticket that was open at the merge base, or changes its
`Blocks:` line, needs the review file". Since `c631482e` a verified
close keeps the exemption, even when it also drops `Blocks:`
(`ticket_let_go`, `:715`; self-test case "verified close that also
drops its Blocks:", want False). Standard: `docs/workflow.md` § Comment
policy and `AGENTS.md` § Durable claims.

Judgement calls (smell baseline):

- **S10. Possible Mysterious Name.** `ticket_let_go` (`:715`) and
  `tickets_let_go` (`:737`) differ by one letter, and "let go" is an
  idiom, not a plain name for "drops out of the ticket checks".
- **S11. Possible Duplicated Code (comments).** The reason "a verified
  close is ordinary ticket work … a closed ticket blocks no phase" is
  written three times, at `:720-723`, `:1889-1891` and `:2066-2069`.
- **S12. Repeated work.** `_reads_working_tree(branch, root)` runs `git
branch --show-current` three times per gate run: twice through
  `_names_changed_since`, once in `tickets_let_go`.
- **S13. Plain English.** The failure text at `:1066`, "leaves open
  without a verified close, or blocks something else", is hard to read,
  and "blocks something else" does not describe a removed `Blocks:`
  line.
- **S14. Bookkeeping.**
  `.scratch/carry-forward/issues/731-exempt-agent-tooling-files-from-product-review.md:220`
  says "(the commit that adds it: …)" without the commit's sha.

The commit subjects are 40 to 46 characters and no body line is over
72 characters (the axis's `git log` check).

### Spec

A8 above is the Spec axis's main finding too (P5): the spec says
`--check-only` and `pnpm merge-ready` must see uncommitted changes "the
same way as committed ones", and sandbox stubs are not uncommitted work.

**P6. Adding a `Blocks:` value to an open ticket needs the review
file.** `:734` compares the whole set of values, so `Blocks: phase-9`
to `phase-9, phase-10`, `Blocks: none` to `phase-9`, or removing a
`Blocks: none` line each return True from `ticket_let_go`. The axis
found `Blocks: none` in 603 tickets on `dev`.

**P7. R2-3 asked for a CLI case for a ticket with no status at the
merge base; there is only a pure case** (`:1908`).

Checked, no finding: R2-1 and R2-1b match the intent (the case log);
R2-2's uncommitted deletion needs the review file; `NEXT` is 734 (R2-4);
ticket 731 § The merge check on `chore/729-test-result` names the
command that ran and why `--check-only` was not run (R2-5). All 674
tickets on `dev` have a status `read_status` can read (the axis's
script). No scope creep: the full working-tree read goes beyond R2-2's
suggested fix, but the intent asks for it.

## Code quality (fresh round 1)

| ID  | Row                                                                                                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S9  | `scripts/check_merge_ready.py:12-15`: the module docstring still says any close of an open ticket needs the review file; say that a verified close keeps the exemption. |
| S10 | `:715`, `:737`: rename `ticket_let_go` and `tickets_let_go` to plain names that differ by more than one letter.                                                         |
| S11 | `:720-723`, `:1889-1891`, `:2066-2069`: keep the verified-close reason in the `ticket_let_go` docstring only.                                                           |
| S12 | `:668-675`, `:679`, `:757`: compute `_reads_working_tree` once per gate run and pass it down.                                                                           |
| S13 | `:1066`: rewrite the failure text in plain words that name each case: deleted, set to a status that is not a verified close, or `Blocks:` values changed.               |

## Summary (fresh round 1)

Not ready to merge. The fixes for R2-1 to R2-5 do what round 2 asked in
every case the earlier case script covers, but this round found:

- **Fixed before merge** (cannot be deferred): **A7**, a tooling-only
  phase branch clears its own blocker with no review file by adding an
  empty `Blocks: ,` line above the real one or by swapping two
  `Blocks:` lines; **A11**, `--check-only` says "ok" when the staged copy
  of a ticket lets it go but the working copy does not (preview only,
  the same kind as R2-2).
- **Blocks the merge unless the owner allows a deferral** (introduced
  by this branch): **A8/P5**, in the main checkout the 17 sandbox stub
  files count as product files, so every tooling-only branch checked out
  there, `chore/729-test-result` included, is refused for a missing
  review file; **A9** and **A10**, the self-test does not cover the
  ticket rule on a branch that is not checked out, or untracked files.
- **Code quality**, for one fix pass before round 2: S9 to S13.
- **Bookkeeping**: S14.
- **Not defects** (rows below): P6 and P7.

Suggested fixes, not applied and untested: A7, make
`open_blockers_for_phase` read every `Blocks:` line, the same as
`_blocks_values`, and add a two-line case; A8, leave out the paths
`holds_no_work` treats as no work, and add an untracked-stub case
(A10); A9, a CLI case that runs `--branch X` with another branch checked
out; A11, read the index as well as the working tree, or have
`--check-only` warn when they differ.

No agent files are in this range's findings. Checks at `c631482e`, with
only this file uncommitted: `python3 scripts/check_merge_ready.py
--self-test` rc=0 (41 checks); `python3 scripts/check_merge_to_dev.py`
rc=0 (12 checks); `TBC_VERIFY_WITHOUT_FORK=1 pnpm verify` rc=0, "gates:
1345 ran, 218 skipped" (the skipped gates need `vendor/tbc-new-fork`,
which this worktree does not have). The `pnpm merge-to-dev
--check-only` result is in the dispatching agent's report, because it
runs on the commit that adds this section.

Every finding of this round is open except P6 and P7. The open findings
get their rows after the fixes and the code-quality pass; the ticket
counts are redone when the last table is written.

## Disposition (fresh round 1)

| ID  | Axis | Disposition | Ticket / note                                                                                                                                                                                                                               |
| --- | ---- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P6  | Spec | wontfix     | not a defect: the intent says the review is needed when a ticket's `Blocks:` values are "removed or changed", and adding a value changes them; the error is a review asked for, never a missed one                                          |
| P7  | Spec | wontfix     | not a defect: the pure case "no status at the base counts as open" fails when an unreadable status at the base counts as not open (`/tmp/claude-1000/r3/mut-nostatus.py --self-test` rc=1, re-run by the dispatcher), so the path is tested |
