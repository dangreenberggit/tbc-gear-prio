# Pre-merge review — chore/729-test-result

Reviewed range: `3c008f0d2cffcb8b9218287d762abea39f3ee542..8cd7e45e66b2de6a48ff74ccee668ff82dad422a`
Reviewed range: `8cd7e45e66b2de6a48ff74ccee668ff82dad422a..683bf83be385bd2d8b93b42f4bc448fbbbd4b2f5`
Reviewed range: `3c008f0d2cffcb8b9218287d762abea39f3ee542..79160874af4d6b8612cdf4d7087e7dde1cc34abd`

The third line is a fresh round 1 over the whole branch. The owner chose
it after round 2 stopped at the round limit (as the dispatching session
reports). Its sections are under `# Fresh review, round 1` at the end of
this file; the sections before that heading are the earlier review.

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
before any fix pass. The owner approved the S1 fix and kept S4 and S5
as written (2026-10-29, as the dispatching session reports); see
§ Disposition.

## Focused check (round 2)

Range: `8cd7e45e..683bf83b` (two commits: `83f3853a`, bookkeeping in
this file and ticket 729; `683bf83b`, the fix for A1-A4 and S1). Fork
range: none. `git diff --quiet dev...HEAD --
data/wowsims-fork.lock.json` exits 0, so the branch never moves the fork
pin and condition 3 holds. `codex` is not on `PATH`; the check ran as
one fresh `general-task` agent on Opus. The dispatching agent checked
R2-1 to R2-3 against the files named below.

Conditions, tested by the dispatching agent before dispatch:

1. Holds, settled from this file. `83f3853a` changes only this file
   and ticket 729, which rows A6 and P2 name. The `683bf83b` commit
   message names no finding ID; the Disposition rows that the same
   commit adds (A1-A4, S1) name the commit by its subject and give each
   finding's change.
2. Holds. In `git diff --word-diff 8cd7e45e..683bf83b --
.claude/agents/gate-reviewer.md`, each changed line is at A3 (lines
   79-83, and line 100, "before the change to `$T`" becomes "before the
   move", which follows from removing `$T`), A1 (90-93), A2 (93-95), S1
   (128-129) or A4 (200-202). Lines 101-109 are re-wrapped only.
3. Holds (see above).

The four checks:

1. Pass: conditions 1 to 3 hold.
2. Pass: the diff changes only what each finding asks for. Dropping
   "or under `data/`" from the hold-back list follows A1's suggested fix
   ("hold back only a command whose write cannot be moved"); its effect
   is R2-1.
3. Pass, nothing to check: the branch has no tests (`git diff
--name-only dev...HEAD` lists only skill, agent, ticket and review
   files).
4. Pass, nothing to check: no test exists. `python3
scripts/check_skill_mirrors.py` exits 0; it covers only
   `.claude/skills`, not `.claude/agents/gate-reviewer.md`.

Contradictions: none inside `gate-reviewer.md` (`$T` and the old
hold-back list are gone; § Fan-out bullets 1 and 3 agree) or with
`docs/agents/stage-gate-project.md` § Worker lanes, Reviewer. R2-2 is a
conflict with the worker type definitions that § Worker lanes points to.

**R2-1.** `gate-reviewer.md:84-87` with `:90-93`. A tracked-file write
now runs, with its named target moved under the temp folder, and the
`ls -l --full-time` guard watches only named targets. A script that also
writes other tracked files by default changes the real checkout, and the
guard does not see it. Example: the usage line
`python scripts/parse_atlasloot.py --lua vendor/atlasloot/data-tbc.lua --out data/atlasloot_sources.json`
(`scripts/parse_atlasloot.py:17`) moves only `--out`; the script also
writes `data/two-hop/raid-recipes.json`, `data/two-hop/sunmote-pairs.json`
and `data/faction_ids.json` (defaults at `:35-38` and `:515-518`, writes at `:604-651`; all three
are in `git ls-files data`). The hold-back "a script that writes a
tracked file itself" covers this only when the helper knows what the
script writes. Effect: during a plan review, tracked `data/` files are
rewritten in the real checkout, usually with the same bytes, but an
uncommitted edit to one of them is lost. Before `683bf83b` the command
was held back, because it writes a tracked file under `data/`. Whether
a helper would run it, and not class it as a regen, is hypothesis,
untested. The checker's suggested fix: run `git -C <root> status
--porcelain` before and after each command, and stop on any change.
This also answers the question about dropping "under `data/`": a
movable named write under `data/` is safe; an unnamed side write by a
script is not, under `data/` or anywhere else.

**R2-2.** `gate-reviewer.md:90-91` against `.claude/agents/discrete-task.md:37-43`
and the `glm-flash-task` definition (lines 17-20). Item 7 now tells the
helper to run tracked-file writes on a moved target. Both worker types
stop with `NEEDS_JUDGMENT` on "an edit under `data/`" and "a `sed` or
script write to a tracked file", and item 7 does not say what the
reviewer does with that return. Effect: a worker that reads its rules
literally refuses, and the dry run does not happen (a loud failure, not
a wrong result). The checker's suggested fix: the helper prompt says
the temp copies are untracked.

**R2-3.** `gate-reviewer.md:200-202` against `:105-107`. § Done when
(A4's fix, round 1's suggested text word for word) requires the
`Dry run:` line to account for every Verify-recipe command. On a
re-review, item 7 dry-runs only the named steps, the steps that make
their inputs and the commands that read their outputs, and the list of
`not run` reasons has no "outside the re-review scope". Effect: a
re-reviewer runs extra commands or makes up a reason.

Result: round 2 stops under § Round limit. Fixes for these findings, if
any, are edits to `gate-reviewer.md` that need the owner's approval of
the wording. Likely cause (hypothesis, untested): the A1 fix widened
what the dry run runs, from untracked writes to tracked ones, without
widening the guard or the workers' rules to match.

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

Round 2 (the focused check of the commit "Fix dry-run gaps in the plan
reviewer", `683bf83b`) ran and **stopped** under the skill's § Round
limit: its four checks pass, but it found three problems in the lines
the fixes wrote, none of them bookkeeping (R2-1 to R2-3, see § Focused
check (round 2)). The skill allows no round 3, and step 4 was not run as
part of the review. The owner then chose the fixes (2026-10-29, "your
rec sounds about right", as the dispatching session reports): the commit
"Hold back tracked-file writes in the dry run" makes them, and
§ Disposition (round 2) records them. No review round has checked that
commit; the owner decides what review follows it. Until then, the branch
is **not ready to merge**. The owner chose a fresh round 1; see
`# Fresh review, round 1`.

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
| A1  | Adversarial | fixed       | commit "Fix dry-run gaps in the plan reviewer": item 7 runs a tracked-file write with its target moved under the temp folder, and holds back only a write that cannot be moved there; owner approved 2026-10-29, "looks ok, do it"  |
| A2  | Adversarial | fixed       | same commit: item 7 holds back as `not run` a command that reads a moved target without naming its path, such as a test runner that imports it                                                                                      |
| A3  | Adversarial | fixed       | same commit: the helper runs `mktemp -d` once and writes the printed absolute path into every command; `$T` is gone from the file                                                                                                   |
| A4  | Adversarial | fixed       | same commit: § Done when also requires the `Dry run:` line to account for every Verify-recipe command                                                                                                                               |
| S1  | Standards   | fixed       | same commit: § Fan-out bullet 3 lets the dry-run helper write under its temp folder                                                                                                                                                 |
| S4  | Standards   | wontfix     | wording preference on text the owner approved (`8cd7e45e`); not changed, as the owner chose on 2026-10-29 (reported by the dispatching session)                                                                                     |
| S5  | Standards   | wontfix     | wording preference on text the owner approved (`7e2ebae0`); not changed, as the owner chose on 2026-10-29 (reported by the dispatching session)                                                                                     |
| A7  | Adversarial | wontfix     | Owner dropped gate-reviewer item 7 on 2026-10-29 ("drop sounds ok i guess"); this branch does not carry it.                                                                                                                         |
| A8  | Adversarial | wontfix     | Owner dropped gate-reviewer item 7 on 2026-10-29 ("drop sounds ok i guess"); this branch does not carry it.                                                                                                                         |
| A9  | Adversarial | wontfix     | Owner dropped gate-reviewer item 7 on 2026-10-29 ("drop sounds ok i guess"); this branch does not carry it.                                                                                                                         |
| S7  | Standards   | wontfix     | Owner dropped gate-reviewer item 7 on 2026-10-29 ("drop sounds ok i guess"); this branch does not carry it.                                                                                                                         |
| S6  | Standards   | wontfix     | Owner dropped gate-reviewer item 7 on 2026-10-29 ("drop sounds ok i guess"); this branch does not carry it.                                                                                                                         |
| P6  | Spec        | wontfix     | Owner dropped gate-reviewer item 7 on 2026-10-29 ("drop sounds ok i guess"); this branch does not carry it.                                                                                                                         |
| P7  | Spec        | wontfix     | Owner dropped gate-reviewer item 7 on 2026-10-29 ("drop sounds ok i guess"); this branch does not carry it.                                                                                                                         |
| A10 | Adversarial | wontfix     | Owner dropped gate-reviewer item 7 on 2026-10-29 ("drop sounds ok i guess"); this branch does not carry it.                                                                                                                         |
| S8  | Standards   | wontfix     | Owner dropped gate-reviewer item 7 on 2026-10-29 ("drop sounds ok i guess"); this branch does not carry it.                                                                                                                         |

## Disposition (round 2)

| ID   | Axis          | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                                               |
| ---- | ------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R2-1 | Focused check | fixed       | commit "Hold back tracked-file writes in the dry run": item 7 holds back as `not run` a command that writes, or may write, a file git tracks at its real path, such as a script whose outputs the plan does not all name; the sentence that ran tracked-file writes on a moved target is gone, which undoes that part of A1's fix; owner approved 2026-10-29, "your rec sounds about right" |
| R2-2 | Focused check | fixed       | same commit: the helper runs no write to a tracked file, so the dry run no longer asks `discrete-task` or `glm-flash-task` for "a `sed` or script write to a tracked file" or a tracked edit under `data/`; owner approved 2026-10-29, "your rec sounds about right"                                                                                                                        |
| R2-3 | Focused check | fixed       | same commit: on a re-review, each command outside the dry-run scope is `not run`, outside this re-review's scope, which § Done when's "or `not run`" already admits; owner approved 2026-10-29, "your rec sounds about right"                                                                                                                                                               |

# Fresh review, round 1

Range: `3c008f0d..79160874` (the third `Reviewed range:` line). This is
the first review of `79160874` ("Hold back tracked-file writes in the
dry run").

Dispatch: full axes. `codex` is not on `PATH` (`which codex` printed
nothing), so each axis ran as a fresh `general-task` agent on Opus, all
three in one parallel batch. Too large for the small-change lane:
`git diff --shortstat dev...HEAD` gave 7 files changed, 752 insertions,
25 deletions; `git diff --name-only dev...HEAD` lists the five
stage-gate and reviewer files of the earlier round, ticket 729, and this
file. Standards and Spec used the `code-review` skill's step 4 prompts
(read from `.claude/skills/code-review/SKILL.md`) with its smell
baseline. The domain axis was skipped: the diff changes only agent
instructions, one ticket and this file, and has no game-domain content.
Each axis was told it writes nothing, to report no finding on this file
or ticket 729, and to read this file only after forming its own
findings. Context given to every axis: the owner approved the wording of
every agent-file change on this branch, so a finding that only prefers
other wording is minor (from the dispatching session's prompt).

Finding IDs continue after the earlier review's IDs, so that no two
findings in this file share an ID.

## Adversarial (fresh round 1)

**A7.** `.claude/agents/gate-reviewer.md:90-92` with `:84-87`.
`79160874` changed the hold-back from "a command whose write cannot be
moved under the temp folder" to "a command that writes, or may write, a
file git tracks at its real path". A command that writes an untracked
or gitignored file at a path the plan does not name now runs at the
real path. The `ls -l --full-time` guard sees only named targets, and
Gate A's `git status --porcelain` (`.claude/skills/stage-gate/SKILL.md:314-315`)
does not show ignored files. Files of this kind: everything under
`.scratch/*` that is not re-included (`.gitignore:43`), including stage
folders (`.gitignore:59`), and every file in `vendor/tbc-new-fork`,
which the main repo ignores (`.gitignore:16`; `git check-ignore -v`
confirms all three), so "a file git tracks", read from the checkout
root, is false for fork files that the fork's own git tracks. The
axis's example, `pnpm tab-fixtures:smoke`, writes
`.scratch/tab-fixtures-smoke/<name>.png` itself
(`scripts/tab-fixtures/smoke.mjs:17,75`); it also needs a running
server, so a helper may hold it back as a long run (hypothesis,
untested). Effect: live ignored files, or files in the main checkout's
fork, overwritten during a plan review with no warning. Whether a
helper meets such a command in practice is hypothesis, untested.

**A8.** `gate-reviewer.md:77-80`. A later command that reads a moved
target names its temp path, which is outside the repo, and repo-aware
tools then act differently. Checked by this dispatcher on a `mktemp -d`
copy: `pnpm exec eslint <temp>/packages/core/src/foo.ts` printed
"File ignored because outside of base path" and exited 0;
`git diff --stat -- <temp path>` exited 128 ("outside repository").
Effect: a lint acceptance command on a new file passes the dry run
without checking anything (a check that passes when it should fail; the
executor's real run would still catch it later), and a git command gives
a false finding that costs a revision round. The axis reports Prettier
behaves like eslint; whether repo config changes that is hypothesis,
untested.

**A9.** `gate-reviewer.md:76` against `SKILL.md:279-285` and
`:428-432`. Item 7 runs commands "from the checkout root the executor
starts in", but the review spawn prompt gives only the round number and
the paths of `brief.md`, `plan.md` and `plan-review.md`; the session
picks the executor's checkout at step 5, and a pair is made then
(`docs/agents/stage-gate-project.md` § Checkouts). Effect: in a pair
stage the helper runs fork commands against the session checkout's own
`vendor/tbc-new-fork` (on its own branch; `docs/agents/paired-worktrees.md`),
so dry-run results describe the wrong tree with no warning. Same as S7.

## Standards + Spec (fresh round 1)

### Standards

Clean checks: `python3 scripts/check_skill_mirrors.py` printed "skill
mirrors match" (rc=0); all 9 commit subjects are 37-50 characters,
capitalized, imperative, no period, no body; `gate-planner.md:36-41` and
`docs/agents/orchestration.md:136-140` agree with `plan-template.md:46-54`.

**S6.** `gate-reviewer.md:90-92`. Deciding whether a command "may
write" a tracked file means reading its source, which is a judgment
call, and the helper is a workhorse type: `glm-flash-task` is "Not for
review, design or judgment" and returns `NEEDS_JUDGMENT` on "a choice
the prompt did not make" (`/home/daniel/.claude_router/agents/glm-flash-task.md:3,14`;
`discrete-task.md:37-39` is the same). Effect: the helper stops with
`NEEDS_JUDGMENT` and item 7 does not say what the reviewer does next (a
loud failure), or the helper misjudges a script with unnamed tracked
outputs. That second case is caught afterwards by Gate A's clean-tree
check, and the stage starts from a clean tree, so it loses no
uncommitted work (loud). Suggested fix (axis): the reviewer sorts the
commands and gives the helper a fixed list to run.

**S7.** Same as A9.

### Spec

Clean: R2-3 is fixed (item 7's "outside this re-review's scope" and
§ Done when's "or `not run`" agree, `gate-reviewer.md:104-107,199-205`);
the template change matches ticket 729's Option B; the Gate A line uses
the template's term "one-line chunk"; `diff -r .claude/skills/stage-gate
.agents/skills/stage-gate` printed nothing. `79160874` changes only the
two sentences R2-1 and R2-3 asked about.

**P6.** Partial fix of R2-1. Round 2's suggested guard (`git status
--porcelain` before and after each command) was not adopted; the guard
still watches only named targets, so the hold-back works only when the
helper knows everything a script writes (`scripts/parse_atlasloot.py`
writes three `data/` files by default that a plan need not name). Effect
as S6: loud, through Gate A. Same fix as S6.

**P7.** Partial fix of R2-2. R2-2 said "item 7 does not say what the
reviewer does with that return" (`NEEDS_JUDGMENT`); it still does not,
and the new "may write" test is itself a choice the helper's prompt does
not make (`docs/agents/model-policy.md:328-330`: a helper prompt "names
... every command to run"). Effect: loud failure; the dry run does not
happen. Same fix as S6.

## Code quality (fresh round 1)

| ID  | Row                                                                                                                                                                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A10 | `gate-reviewer.md:107-109` against `:200-202`: the `Dry run:` line lists only "the steps whose results were all as expected", so the passing commands of a step with one `not run` command appear nowhere, but § Done when requires every command to be accounted for. |
| S8  | `gate-reviewer.md:150-158`: § Report's format block shows `VERDICT`, `## Findings` and `## Register verdicts` but not the `Dry run:` line that `:107` and `:200` require.                                                                                              |

## Summary (fresh round 1)

Not ready to merge. Every finding is in item 7 (the dry run), which this
branch adds, so each one blocks the merge under step 3:

- **Fixed before merge** (cannot be deferred): **A7**, the dry run may
  overwrite live gitignored files or files in the main checkout's fork
  with no warning (opened by `79160874`); **A8**, a lint check on a moved
  file passes without checking anything; **A9/S7**, in a pair stage the
  dry run tests the wrong checkout's fork with no warning.
- **Blocks unless the owner allows a deferral**: **S6/P6/P7**, the helper
  must judge what a script writes, which its worker type refuses, and
  item 7 does not say what happens then.
- **Code quality**, fixed in one pass before round 2: A10, S8.

All fixes are edits to `.claude/agents/gate-reviewer.md` (A9 may also
need `.claude/skills/stage-gate/SKILL.md` step 3), so under § Agent files
they go to the owner for one approval before any fix. Suggested fixes,
not applied and untested: A7 and S6/P6/P7, the reviewer gives the helper
a fixed list of commands, and the helper holds back any command that may
write a path the plan does not name, tracked or not, inside the fork
included; A8, hold back a command that reads a moved target with a
repo-aware tool (lint, format, git); A9, the session's review prompt
names the executor's checkout, or item 7 holds back commands that need a
checkout that does not exist yet. Round 2 (the focused check) runs after
those fixes and the code-quality pass.

No Disposition table for this round yet: every finding is open and
blocking, and code-quality rows get their rows after the pass (step 3).
Tickets: this branch filed 0 and closed 1 (729), as counted in the
earlier summary; the count is redone when this round's table is
written.

# Review stopped by the owner, 2026-10-29

The owner stopped the review process for this branch on 2026-10-29:
"tell the (3??) reviews to wrap up. make a ticket or two and a handoff
for not drafting but getting a global skill for this kind of review, but
also more importantly making these files an exception to the review
system." The owner's reason, the same day: "there's no reason to adopt
a review process meant for development of code in a project that we're
not acutally even touching". Both quotes are from the dispatching
session's prompt; this review did not see the owner's message.

No further review rounds run on this branch. The open findings of
`# Fresh review, round 1` (A7, A8, A9/S7, S6/P6/P7, A10, S8) stay as
recorded above. None of them is fixed, and this section gives them no
Disposition rows.

Two tickets carry the follow-up:

- `.scratch/carry-forward/issues/731-exempt-agent-tooling-files-from-product-review.md`
  takes agent-tooling files out of this repo's product review system and
  says what then decides whether this branch may merge.
- `.scratch/carry-forward/issues/732-global-skill-for-reviewing-agent-instruction-changes.md`
  gets a global skill for reviewing changes to agent instructions. The
  dry run (`.claude/agents/gate-reviewer.md` § What to hunt, item 7) and
  its open findings go to that kind of review and a trial run.

## Item 7 dropped (2026-10-29)

The owner dropped the reviewer's dry run (`.claude/agents/gate-reviewer.md` § What to hunt, item 7) after research and one live trial: `.scratch/agent-reports/2026-10-28-general-task-dry-run-research-and-trial.md` (gitignored, main checkout). The owner's words: "drop sounds ok i guess", and for this branch: "new branch sounds ok i guess". This branch, `chore/729-without-dry-run`, is `chore/729-test-result` without the dry-run changes to `gate-reviewer.md`. The Disposition rows above that say a dry-run finding was fixed refer to commits whose `gate-reviewer.md` part is not on this branch.
