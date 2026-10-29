# Pre-merge review — chore/731-tooling-review-exemption

Reviewed range: `3c008f0d2cffcb8b9218287d762abea39f3ee542..8faf766d38570fadf15ee0a1637d4c0349849aaa`

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

## Disposition

| ID  | Axis         | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A3  | Adversarial  | defer       | `.scratch/carry-forward/issues/733-merge-gate-runs-the-branchs-own-copy.md` — gap older than this branch; the comment part is Code quality row A3c                                                                                                                                                                                                                                                                                                                      |
| A5  | Adversarial  | wontfix     | the gitlink's path is under `.claude/skills/`, which the owner approved as tooling, and the reviewer's `git grep` found no product code that reads a tooling path at run time                                                                                                                                                                                                                                                                                           |
| S2  | Standards    | fixed       | `af9fae68`: ticket 731 § Owner approvals, 2026-10-29, quotes the owner's words on the path list, the § 2 wording, this review and the skill name, as the fixing agent's prompt gave them                                                                                                                                                                                                                                                                                |
| S5  | Standards    | wontfix     | the owner approved the text in `AGENTS.md`, `docs/workflow.md` and the skill (proposal § 2) in these places; the code docstrings describe the code they sit in                                                                                                                                                                                                                                                                                                          |
| P3  | Spec         | wontfix     | not a defect: a comment only, which proposal § 3 lists as part of the prototype                                                                                                                                                                                                                                                                                                                                                                                         |
| P4  | Spec         | wontfix     | not a defect: listing both sides of a rename stops a move out of `packages/` from passing as tooling, which the ticket's goal needs; the self-test covers it                                                                                                                                                                                                                                                                                                            |
| A1  | Adversarial  | fixed       | `1aec61bc`: rule: a branch that deletes a carry-forward ticket that was not closed at the merge base needs the review file; `--product-files` lists the deleted ticket. Closing a ticket stays ordinary ticket work (the `Verified by:` check runs on every branch). Self-test cases `drop-open`, `phase-9/drop` (the review's case) and `drop-closed`                                                                                                                  |
| A2  | Adversarial  | fixed       | `120d7887`: `check_gate_cli_on_a_scratch_repo` runs a copy of the script as the CLI in a throwaway repo. With `and not exempt` inverted to `and exempt`, or `print(rel)` in `--product-files` replaced by `pass`, `--self-test` fails (rc=1); reverted after                                                                                                                                                                                                            |
| A4  | Adversarial  | fixed       | `33d584ea`: with no changed file, `--product-files` exits 1 with "no file changed since the dev merge base, so the review file is required"; the skill's "It exits 1" bullet then sends the reviewer to the whole-branch review. Self-test case `empty`                                                                                                                                                                                                                 |
| P2  | Spec         | fixed       | `33d584ea`, the same fix as A4                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| P1  | Spec         | fixed       | part 2: `af9fae68` brings ticket 731 onto this branch and records how this branch was reviewed. Part 1: `TBC_VERIFY_WITHOUT_FORK=1 pnpm verify` rc=0 at `977f41e3` plus the ticket (worktree has no fork; `node_modules` from `pnpm install --frozen-lockfile --store-dir /home/daniel/.cache/pnpm-store-731`). `python3 scripts/check_merge_ready.py --branch chore/729-test-result` rc=0, "review not required: every one of the 10 changed file(s) is agent tooling" |
| A3c | Code quality | fixed       | `b33d936f`                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| A6  | Code quality | fixed       | `b33d936f`; the gate-paths self-test now names `scripts/run_verify.mjs`                                                                                                                                                                                                                                                                                                                                                                                                 |
| S3  | Code quality | fixed       | `b33d936f`                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| S4  | Code quality | fixed       | `b33d936f`                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| S6  | Code quality | fixed       | `b33d936f`: `review_exemption_reason`, stored as `exemption`                                                                                                                                                                                                                                                                                                                                                                                                            |
| S7  | Code quality | fixed       | `b33d936f`: the rename case lives only in `check_review_requirement_reads_git`; `check()` computes `review_rel` once                                                                                                                                                                                                                                                                                                                                                    |
| S8  | Code quality | fixed       | `b33d936f`: `is_tooling_path` takes the list as an argument, so the test no longer sets a global; the review-file block is `review_file_errors()`                                                                                                                                                                                                                                                                                                                       |
| S1  | Standards    | wontfix     | the subjects stay: this review file cites `9795fbd5` and `8bbc7f49`, and rewording them would change those shas                                                                                                                                                                                                                                                                                                                                                         |
