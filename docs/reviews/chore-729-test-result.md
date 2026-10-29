# Pre-merge review — chore/729-test-result

Reviewed range: `3c008f0d2cffcb8b9218287d762abea39f3ee542..8cd7e45e66b2de6a48ff74ccee668ff82dad422a`

Dispatch: round 1, full axes. `codex` is not on `PATH` (`which codex`
printed nothing), so each axis ran as a fresh `general-task` agent on
Opus. The branch is too large for the small-change lane: `git diff
--shortstat dev...HEAD` gave 6 files changed, 409 insertions, 22
deletions (431 lines, over the 150 limit); `git diff --name-only
dev...HEAD` lists `.agents/skills/stage-gate/SKILL.md`,
`.agents/skills/stage-gate/plan-template.md`,
`.claude/agents/gate-reviewer.md`, `.claude/skills/stage-gate/SKILL.md`,
`.claude/skills/stage-gate/plan-template.md` and
`.scratch/carry-forward/issues/729-simplify-the-gate-planner-rules.md`.
The adversarial axis ran first; Standards and Spec (the `code-review`
skill) then ran as one parallel batch. The domain axis was skipped: the
diff changes only agent instructions and one ticket, and has no
game-domain content.

Context given to every axis: the owner approved the exact wording of the
three agent-file changes (`eded62c3`, `7e2ebae0`, `8cd7e45e`) in chat,
so a finding that only prefers other wording is minor. This comes from
the prompt of the session that dispatched this review; this review did
not see the owner's message.

## Adversarial

Clean checks: `diff -r .claude/skills/stage-gate .agents/skills/stage-gate`
printed nothing; every section the new text points to exists; base
`3c008f0d` is on `dev` (`git merge-base --is-ancestor`).

**A1.** `.claude/agents/gate-reviewer.md:77-88`. Item 7 moves every
write target to `$T`, then holds back "a command that writes a tracked
file". It does not say whether that test applies before or after the
move. Read as "before", every write to a tracked source file is
`not run`, so the dry run tests only untracked writes and acceptance
commands, and § Done when still passes.

**A2.** `gate-reviewer.md:77-80, 95-97`. Only a later command that names
a moved target's path reads the `$T` copy. A command that reads it
another way (a `vitest` run whose import resolves to the real path) runs
against the real, unchanged tree. Its output is then not what the plan
expects, which item 7 says "is a finding": a false finding against a
correct plan, costing a revision round toward the per-chunk review limit
(`SKILL.md:353-358`).

**A3.** `gate-reviewer.md:79`. `T=$(mktemp -d)` does not survive between
Bash calls (the Claude Code Bash tool: "Shell state (env vars,
functions) does not persist"). A helper that runs one command per call
expands `$T/x` to `/x`; the command fails, and the failure reads as a
finding against the plan.

**A4.** `gate-reviewer.md:192-195` against `:75-76`. Item 7 dry-runs
every Verify-recipe command, but § Done when only requires the
`Dry run:` line to account for "every write and acceptance command in
the steps you reviewed". A reviewer can leave Verify-recipe commands
out and still be done.

**A5.** `SKILL.md:264-271`. Gate A accepts an open question named on a
one-line chunk's line, but no planner file says the planner may do this
(`grep -n -i 'open question'` over the stage-gate files hits only
`SKILL.md:145,240,264,270`; checked by this review). A planner that
names one elsewhere fails Gate A and is respawned once.

**A6.** Ticket 729 § "Later chunk in two files (noted, not edited)"
quotes the old Gate A text and says the edit waits for approval, but
`8cd7e45e` made the edit (`git show --stat 8cd7e45e`).

Unexamined: no live run of item 7 exists (the ticket records none), so
whether a helper follows it is hypothesis, untested. Runs in a pair
checkout, and gitignored fork writes outside the `ls` check, were not
examined.

## Domain

Skipped: no game-domain content (see Dispatch).

## Standards + Spec

### Standards

Clean checks: `python3 scripts/check_skill_mirrors.py` rc=0; `cmp` shows
both stage-gate files match their `.agents/` mirrors; the mirror script
covers only `skills/`, so `gate-reviewer.md` has no mirror. All five
commit messages are subject-only, under 50 characters, capitalized and
imperative (`git log --format=%B`). Ticket 729's header and `Verified by:`
line follow `docs/agents/issue-tracker.md` § Closing a ticket.

**S1.** `gate-reviewer.md:117-122` (§ Fan-out, bullet 3) says helpers are
"each told to change no files except its report file", while item 7 lets
the dry-run helper write under `$T`. Bullet 1 was updated to allow the
temp folder; bullet 3 was not. A reviewer that gives one helper both jobs
could forbid the `$T` copies.

**S2.** Same as A6 (stale ticket section).

**S3.** Ticket 729 mixes dates: "Test result, 2026-10-28" is the local
date; "Second run, 2026-10-29", "Closed 2026-10-29" and the owner quote
dated 2026-10-29 are the UTC date. The commits are dated 2026-10-28
-0700 (`git log --date=iso`).

**S4** (wording only; owner-approved text). The Gate A parenthesis
repeats the template's definition of a one-line chunk and gives reasons
inside a checklist item (`writing-for-agents` § Pruning). Its premise
holds: `grep -n -i 'open question'` over `gate-executor.md`,
`gate-planner.md` and `plan-template.md` prints nothing.

**S5** (wording only; owner-approved text). Item 7 is about 30 lines in
a list whose other items are 1-3 lines, and its limits are split across
item 7, § Fan-out bullet 1 and § Done when (`writing-for-agents`
§ Information hierarchy). A section of its own, such as `## Dry run`,
would keep them together.

### Spec

The three approved changes do what the dispatcher's description says.
Ticket 729's account of both test runs matches
`.scratch/stage-gate/729-planner-test/` and
`.scratch/stage-gate/729-planner-test-2/` (run 2's `plan.md` gives K1
steps 1-3, K2 steps 4-6, K3 steps 7-9; the decision-log gate lines,
`VERDICT` lines, `statements.md` lines and the run-log cost total
3.3528 match). The close meets the ticket's § Done when; the stricter
one-spawn bar is unmet and the ticket says so. The recount cost column
was not checked (needs transcripts): hypothesis, untested.

**P1.** Same as A6.

**P2.** No ticket records `7e2ebae0` (the dry run), which is outside
Option B.

**P3.** The approval as described names only "§ What to hunt item 7";
`7e2ebae0` also edits § Fan-out (`gate-reviewer.md:107-108`) and § Done
when (`:193-195`).

**P4.** Item 7's re-review scope (named steps, the earlier steps that
make their inputs, the later commands that read their outputs) pulls
against § Re-review rounds, "Review only those claims and steps"
(`gate-reviewer.md:181`). Its other half (Done when omits Verify-recipe
commands) is A4.

**P5.** Same as A5.

## Code quality

| ID  | Row                                                                                                                                                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | `gate-reviewer.md` § Fan-out bullet 3 forbids helper writes except the report file; item 7's helper writes under `$T`. Make bullet 3 name the dry-run exception, or move the dry-run limits into one place (see S5). |
| S4  | Gate A parenthesis repeats the template's one-line-chunk definition and gives reasons in a checklist item. Owner approved this wording.                                                                              |
| S5  | Item 7 is a 30-line procedure inside a list of short items, with its limits split across three sections. Owner approved this wording.                                                                                |

These rows are agent-file edits. Under this skill's § Agent files they
go to the owner for one approval together with the fixes for A1-A4,
before any fix pass. No fix pass has run, so they have no Disposition
row yet.

## Summary

Round 1 found nothing that damages the checkout or gives a silent wrong
result, and the mirrors match. Four findings in the reviewer's new dry
run (item 7, `7e2ebae0`) were introduced by this branch and are not
wording preferences, so under step 3 they **block the merge** until they
are fixed or the owner allows a deferral:

- **A1:** unclear whether a write to a tracked file is held back before
  or after it is moved to `$T`; read one way, the dry run skips most
  writes and still passes.
- **A2:** a command that reads a moved file without naming it (a test
  run) reads the real file and gives a false finding.
- **A3:** `$T` is lost between Bash calls, so moved paths turn into
  `/…` and fail.
- **A4:** § Done when does not require the Verify-recipe commands that
  item 7 runs.

Each fix is an edit to `.claude/agents/gate-reviewer.md` and needs the
owner's approval of the wording. Suggested fixes (not applied): A1, hold
back only a command whose write cannot be moved to `$T`, such as a
script that writes a tracked file inside itself; A2, hold back as
`not run` a command that reads a moved target without naming its path;
A3, run `mktemp -d` once and write the printed path literally in every
later command; A4, add "and every Verify-recipe command" to § Done when.
The code-quality rows S1, S4 and S5 go into the same approval.

Bookkeeping applied in this commit: ticket 729's stale section now
records the `8cd7e45e` Gate A edit and the `7e2ebae0` dry run (A6, S2,
P1, P2).

Round 2 has not run: the fixes for A1-A4 and the code-quality pass wait
for the owner. When they land, round 2 is the focused check of step 2.

Tickets: this branch filed 0 and closed 1 (729). Filed is the number of
`A` rows in `git diff --name-status dev...HEAD --
'.scratch/carry-forward/issues/*.md'`; closed is the count of added
`Status: closed|resolved|wontfix` lines in the same diff.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                       |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A5  | Adversarial | wontfix     | gap from before this branch, already disposed of as S1 `wontfix` in `docs/reviews/feat-simplify-planner-729.md` under the owner's 2026-10-28 ruling against added rules; cost is one Gate A respawn, and Gate A names the violation |
| A6  | Adversarial | fixed       | ticket 729 § "Later chunk in two files" now records that `8cd7e45e` edited the Gate A line                                                                                                                                          |
| S2  | Standards   | fixed       | same fix as A6                                                                                                                                                                                                                      |
| S3  | Standards   | wontfix     | each date is right in its own time zone (local or UTC); the ticket is closed and `docs/agents/issue-tracker.md` names no zone for ticket dates (`grep -i utc` finds nothing)                                                        |
| P1  | Spec        | fixed       | same fix as A6                                                                                                                                                                                                                      |
| P2  | Spec        | fixed       | ticket 729 now names `7e2ebae0` as outside Option B and points to this review                                                                                                                                                       |
| P3  | Spec        | wontfix     | the dispatcher reports the owner approved the exact wording of each of the three agent-file commits, which includes the § Fan-out and § Done when lines of `7e2ebae0`                                                               |
| P4  | Spec        | wontfix     | not a defect: § Re-review rounds says "using § What to hunt", and item 7 is part of that list; a named step cannot be dry-run without the earlier steps that make its inputs. The Done-when half is A4                              |
| P5  | Spec        | wontfix     | same as A5                                                                                                                                                                                                                          |
