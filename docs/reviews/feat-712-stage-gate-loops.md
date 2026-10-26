# Pre-merge review — feat/712-stage-gate-loops

Reviewed range: `2bc139f424db09c2635022f344d0ae20d1388d11..83f59324f7f9bbb88625797e36aa6c5aecaeb8fc`

Reviewed range: `83f59324f7f9bbb88625797e36aa6c5aecaeb8fc..75a0faf48ec7e61bb54f97d734e93af3a7fb114e`

Dispatch note (round 1): full axes. `git diff --shortstat dev...HEAD` gave
` 10 files changed, 611 insertions(+), 84 deletions(-)`, over the
small-change limit of 6 files and 150 lines. `git diff --name-only
dev...HEAD` gave `.agents/skills/stage-gate/SKILL.md`,
`.claude/agents/gate-executor.md`, `.claude/agents/gate-planner.md`,
`.claude/agents/gate-reviewer.md`,
`.claude/hooks/subagent-foreground-helpers.py`,
`.claude/hooks/tests/subagent-foreground-helpers.py`,
`.claude/settings.json`, `.claude/skills/stage-gate/SKILL.md`,
`.scratch/carry-forward/issues/712-stage-gate-revision-loops-run-wrong.md`,
`package.json`. `codex` is not on `PATH`, so two fresh `general-task` agents
on Opus (review lane) ran in parallel: one with the adversarial brief, one
running the `code-review` skill unchanged. Domain axis skipped: the diff is
agent rules and a harness hook, with no game-domain content.

Both reviewers were told they write nothing. Their scope, set by the caller
from the owner's ruling of 2026-10-26 ("i want reviews to cover what they
should cover, not expand to everything over and over for all eternity"):
stage-gate seats and the session following these rules correctly, without
a state word or action an agent could read two ways, and without reviews
wider or more repeated than the rules call for. The ticket's existing
"Open items" were excluded. Working tree at dispatch: untracked dotfiles
and folders at the repo root (`.bashrc`, `.gitconfig`, `.mcp.json`,
`.claude/settings.local.json` and others), present in the session's
start-of-conversation `git status`; not part of this branch.

Fix route: `.claude/skills`, `.claude/hooks` and `.claude/settings.json`
are write-protected for agents in this sandbox. Every fix below that
touches them, with the agent files, mirror, `package.json` and ticket
lines that change with it, is in one patch for the owner:
`.scratch/agent-reports/2026-10-26-712-review-fixes.patch` (gitignored,
owner's checkout). `git apply --check` passes on `d0fdafff`. On a fresh
`git archive` copy with the patch applied,
`python .claude/hooks/tests/subagent-foreground-helpers.py` gave "11 of 11
cases passed" and `python scripts/check_skill_mirrors.py` gave "skill
mirrors match". A full `pnpm verify` on the patched tree has not run
(hypothesis, untested). The two code-quality rows are in the same patch
rather than a separate workhorse pass, because one of them is in a
protected path.

## Adversarial

Hook and test: no defect. `python .claude/hooks/tests/subagent-foreground-helpers.py`
gave "11 of 11 cases passed", rc=0; the test compares the whole rewritten
input against an expected dict and checks that `settings.json` registers
the hook. `diff` of the two SKILL.md copies: identical. Unexamined: the hook
on an Agent call with `isolation: "remote"` (no stage-gate seat uses it).

- **A1.** `SKILL.md` step 3 (lines 246-251 at 83f59324): when the
  `# Round <n>` section is missing, the session re-asks the same reviewer
  with no limit and no stop. A reviewer on the wrong model answers
  `WRONG_MODEL:` and writes no section, so the rule fires again for ever;
  it also conflicts with § Seats (lines 56-58), which says to respawn on
  `WRONG_MODEL`. A reviewer re-asked after writing a malformed section
  appends a second `# Round <n>` section with the same number.
- **A2.** `gate-reviewer.md:126-131` and `SKILL.md` step 4: a re-review
  must "give a verdict on every finding in the earlier `# Round` sections",
  but the report format (lines 92-97) has no place for those verdicts, and
  Gate B counts `blocking` only in the new section's Findings table. A
  round-1 `blocking` finding the revision did not fix can be recorded
  outside the table, and the stage moves on with it open. The reverse
  reading re-files every earlier finding each round, including ones the
  session rejected; the reviewer does not see `decision-log.md`.
- **A3.** `SKILL.md` step 4 (lines 260-283): path round 1 `blocking` →
  loop-back → round 2 `material` only → revision with `- added:` lines →
  round 3 `blocking`. The `material` bullet says to loop back and count it;
  the first bullet allows a second loop-back only when the re-review after
  the first loop-back was `blocking`, and round 2 was not. One reading
  orders a revision that the round cap then leaves unreviewed; the other
  leaves no rule that applies.
- **A4.** `SKILL.md` lines 190-214: a plan missing a template section is
  "none of these" for step 2's new `SendMessage` (which does not name the
  gap; a second miss goes to the user) and is also a Gate A failure (respawn
  once with the gap named).
- **A5.** `gate-planner.md:95-100` requires a proposed method to have a
  `Verified by` command "that you or a researcher ran", leaving no
  `hypothesis, untested` option; lines 59-65 allow that label for a claim
  the planner cannot measure. A command that takes hours either runs during
  planning or gets a false `Verified by`.

## Standards + Spec

**Standards:** no documented standard broken. The hook, test, settings
entry and script follow the existing hook pattern (`settings.json:25`), and
the script is in `verify:steps` (`package.json:15`).

- **S1.** After a round-3 review with `material` findings only, the D2
  bullet (`SKILL.md:268-271`) says revise, Gate A, no further reviewer; the
  `material` bullet (273-279) also matches and starts a round-4 re-review
  when there are `- added:` lines, which the cap (285-288) turns into a
  stop. The session either carries on or stops. Same gap as A3.
- **S2.** `gate-reviewer.md:128-130`, `SKILL.md:241-243`: round 3 gives a
  new verdict on every round-1 finding, including ones round 2 closed —
  wider than the owner's ruling. Same gap as A2.
- **S3.** `SKILL.md:247-251`: the reviewer re-ask has no `"success":true`
  check, no respawn and no stop; the planner rule (197-204) has all three.
  Same gap as A1.
- **S4.** `.claude/hooks/subagent-foreground-helpers.py:32-33`: "A call
  that omits the field also runs in the background" is a committed causal
  claim with no source (AGENTS.md § Durable claims).
- **S5.** `package.json:68`: `hooks:check` runs one hook's test;
  `.claude/settings.json` also registers `log-agent-run.py`, which has no
  test there, and `.claude/hooks/tests/bash-footguns.sh` is not run.

**Spec:** every fix that ticket 712's Comments section claims for findings
1-6 is in the diff; the seat files and SKILL.md use the same state words
and name the same actor; no scope creep.

- **P1.** `SKILL.md:261-264, 280-288`: the round cap can stop a stage after
  a planner revision that no reviewer will check. Same gap as A3.
- **P2.** `gate-reviewer.md:129`: re-reviews give verdicts on round-1
  `minor` findings that were never sent to a planner. Same gap as A2.
- **P3.** Ticket 712 "Done when" asks for a decision on
  `feat/subagent-foreground-helpers` (merge, redo or drop); the Comments
  list what was ported but not the decision.
- **P4.** `gate-planner.md:91`: "address every blocking and material
  finding" names no round, and `plan-review.md` holds every round, so a
  revision planner may act again on findings already fixed (hypothesis,
  untested). The `- added:` rule (104-106) names only the latest round.

## Code quality

| ID  | Row                                               | Fix                                                                                                    |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| S4  | Hook comment states a causal claim with no source | Patch: the comment quotes the Agent tool description, "Subagents run in the background by default"     |
| S5  | `hooks:check` names all hooks but tests one       | Patch: renamed `foreground-hook:check` in `package.json` (script and `verify:steps`) and in ticket 712 |

## Summary

Round 1 found no defect in the hook or its test, and the two SKILL.md
copies match. It found six rule problems, each introduced by this branch
except P4 (the "address every" line is unchanged from `dev`), and three of
them found by both axes on their own: A1/S3 (reviewer re-ask without a
limit), A2/S2/P2 (re-reviews judge every earlier finding, and an unfixed
`blocking` finding has no place to count), A3/S1/P1 (round-3 handling
read two ways), plus A4, A5 and P4. Plus two code-quality rows (S4, S5)
and one bookkeeping row (P3).

By effect (step 3): A2 can let a stage move on with a `blocking` finding
open and no warning, so it is fixed before merge. A1, A3, A4, A5 and P4
are a stall, a wasted spawn or a misdirected step introduced here, so
they block the merge until fixed. All of them are fixed by the owner patch
named in the dispatch note:

- A1/S3: step 3 respawns on `WRONG_MODEL:` as § Seats says, reads the last
  `# Round <n>` section, sends one `SendMessage`, and stops for the user
  when it fails or the section is still missing.
- A2/S2/P2: the re-review prompt names the `blocking` and `material`
  findings the latest revision prompt listed; the reviewer re-files each
  one `plan.md` still does not fix as a new Findings row with the same
  severity and `What breaks` starting `Not fixed: Round <m> <id>.`, and
  gives no verdict on any other earlier finding.
- A3/S1/P1: the cap bullet becomes "Round 3 is the last review", over every
  other rule: round 3 `blocking` stops with no revision; round 3
  `material` only gets one revision, Gate A and no reviewer.
- A4: step 2's first case is "a plan with the headings of
  `plan-template.md` (Gate A checks that none is missing)".
- A5: a proposed method that cannot be checked during planning is
  registered `hypothesis, untested` with the reason.
- P4: the revision planner addresses the findings "that your prompt lists".

The agent-file edits need the owner's one approval (step 3, "Agent files").
Until the owner applies the patch, round 2 cannot run, the Disposition
table below holds only P3, and the open findings are listed in ticket 712
so none is lost. After the patch is committed, round 2 (focused check)
runs on `83f59324..<new HEAD>` and fills in the remaining rows.

Commits since round 1's `<through-sha>`: `d0fdafff` (ticket 712 only,
P3), and the commit with this file.

Step 4 (`pnpm merge-to-dev --check-only`) has not run: the review is not
finished until round 2.

## Disposition

| ID  | Axis             | Disposition | Ticket / note                                                                                                             |
| --- | ---------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| P3  | Standards + Spec | fixed       | d0fdafff adds an open item to ticket 712: the old branch's fix was redone here; deleting the remote branch is not decided |

## Focused check (round 2)

Range: `83f59324..75a0faf4` (second `Reviewed range:` line). Fork range:
none; `git diff --quiet dev...HEAD -- data/wowsims-fork.lock.json` gave
rc=0, so the branch never moves the fork pin and condition 3 holds.
Dispatch: `codex` is not on `PATH` (`which codex` rc=1), so one fresh
`general-task` agent on Opus (review lane), told it writes nothing.

Commits in the range: `d0fdafff` (ticket 712, P3), `2f8d537b` (this
file), `7448ad4b` (fixes A1-A5, P4, S4, S5), `d119c33f` (ticket 712: owner
ruling that review rounds count per plan chunk), `75a0faf4` (owner-approved
"Less code" item in `.claude/agents/gate-reviewer.md`, approved
2026-10-26, "Sounds good let's roll").

The owner applied the r2 patch
`.scratch/agent-reports/2026-10-26-712-review-fixes-r2.patch`, not the r1
patch the dispatch note names. r2 is r1 plus 15 wording fixes from a
writing-for-agents pass
(`.scratch/agent-reports/2026-10-26-general-task-712-patch-wording-review.md`).
`7448ad4b` is that patch exactly: `git read-tree 2f8d537b` into a
scratch index, `git apply --cached` of the r2 patch, `git write-tree`,
then `git diff --stat <tree> 7448ad4b` gave no output.

Scope exception: `75a0faf4` is not a fix, so condition 1 does not cover
it. The session asked that round 2 also review it and `d119c33f` for new
faults, and stay inside this range (owner ruling of 2026-10-26: reviews
"cover what they should cover, not expand to everything over and
over").

1. **Conditions 1-3: pass.** Every commit other than `75a0faf4` is a
   named fix, this file, or ticket 712 only. Every changed rule line in
   `7448ad4b` is at a place a round-1 finding cites; four of the 15 r2
   wording fixes go past wording, each inside its own finding (A4's
   plan test, S3's `resumed` log line, the clean-tree check's order,
   S1's duplicate round-3 text replaced by a pointer).
2. **Only what each finding asks: pass.** A1/S3, A2/S2/P2, A3/S1/P1, A4,
   A5, P4, S4 and S5 are all fixed (rows below). The two `SKILL.md`
   copies are identical (`diff` rc=0).
3. **Tests assert their findings: pass, none added.** The fixes are rule
   text; no test changed (`git diff 83f59324 75a0faf4 --
.claude/hooks/tests` is empty). S5's renamed script
   `foreground-hook:check` still runs in `verify:steps`
   (`package.json:15`), and `git grep -n 'hooks:check' -- ':!docs/reviews'`
   gave rc=1.
4. **Touched tests pass.** `python .claude/hooks/tests/subagent-foreground-helpers.py`
   and `pnpm run foreground-hook:check` each gave "11 of 11 cases
   passed", rc=0; `python scripts/check_skill_mirrors.py` gave "skill
   mirrors match", rc=0.

New findings, all in the range's new commits:

- **R2-1** (`75a0faf4`, `gate-reviewer.md:38-39`). "Search with
  `git grep -n` ..., run from the root of your checkout" searches the
  main repo only: `vendor/` is gitignored (`git check-ignore -v
vendor/tbc-new-fork` gave `.gitignore:16:vendor/`), and
  `git grep -c 'func NewCharacter'` gave rc=1 from the root while
  `git -C vendor/tbc-new-fork grep -l 'func NewCharacter'` found
  `sim/core/character.go`. A reviewer that follows the line misses
  fork and upstream code and files no finding: a check that passes when
  it should fail, so it is fixed before merge.
- **R2-2** (`75a0faf4`, `gate-reviewer.md:47-48` against the Severity
  line, 127 at `75a0faf4`). A "Less code" finding is `blocking` when the
  `Approach` rests on the added code; the Severity line defines
  `blocking` as "the approach or a load-bearing claim fails". A
  reviewer can follow either, and Gate B loops back on one and not the
  other. Introduced here; blocks the merge unless the owner allows a
  deferral.
- **R2-3** (`75a0faf4`, `gate-reviewer.md:50-51`). "check only the code
  that the latest revision added" against § Re-review rounds, "the
  claims and steps that the latest revision changed or added": code
  that a changed step adds can be skipped. Introduced here; blocks the
  merge unless the owner allows a deferral.
- **R2-4** (`d119c33f`, ticket 712, bookkeeping). The per-chunk ruling
  named only `feat/usage-limit-fixes` text to rewrite; this branch's
  `SKILL.md` step 3 round numbering and the step 4 bullet "Round 3 is
  the last review" count rounds per stage too. Suggested text applied
  to the ticket.

R2-1 to R2-3 change an agent file, and the text they change is the
owner's approved wording, so they need the owner's approval
(pre-merge-review step 3, "Agent files"). The proposed fix is
`.scratch/agent-reports/2026-10-26-712-review-round2-fixes.patch`
(gitignored, owner's checkout); `git apply --check` passes on
`75a0faf4`, and `prettier --check` passes on the patched file. They have
no Disposition row yet (pre-merge-review § Round limit) and are listed in
ticket 712's open items.

Round 2 reported findings other than bookkeeping, so under § Round
limit the review stops here: there is no round 3, and the owner decides
what checks the patch once it is applied.

## Summary (round 2)

Every round-1 finding is fixed by `7448ad4b`. Round 2 found three new
problems in the owner-approved "Less code" item (`75a0faf4`), all
blocking the merge until the owner applies the round-2 patch or allows a
deferral: R2-1 (fixed before merge: the search misses the fork and
upstream), R2-2 and R2-3 (two readings). R2-4 was bookkeeping and is
fixed in ticket 712.

Tickets: this branch filed 0 and closed 0 (`git diff --name-status
dev...HEAD -- '.scratch/carry-forward/issues/*.md'` lists only ticket 712
as `M`). Ticket 712 stays open.

## Disposition (round 2)

| ID   | Axis             | Disposition | Ticket / note                                                                                                     |
| ---- | ---------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| A1   | Adversarial      | fixed       | 7448ad4b: `SKILL.md:250-267` respawns on `WRONG_MODEL:`, sends one `SendMessage`, stops for the user on failure   |
| A2   | Adversarial      | fixed       | 7448ad4b: `SKILL.md:241-247`, `gate-reviewer.md:142-155` re-file unfixed named findings as `Not fixed: R<m>-<id>` |
| A3   | Adversarial      | fixed       | 7448ad4b: `SKILL.md:295-303` "Round 3 is the last review" holds over every other rule                             |
| A4   | Adversarial      | fixed       | 7448ad4b: `SKILL.md:191-194` a message with a template heading is a plan; a missing section goes to Gate A        |
| A5   | Adversarial      | fixed       | 7448ad4b: `gate-planner.md:101-105` allows `hypothesis, untested` when no check can run before the plan ships     |
| S1   | Standards + Spec | fixed       | Same gap as A3; fixed by 7448ad4b                                                                                 |
| S2   | Standards + Spec | fixed       | Same gap as A2; fixed by 7448ad4b                                                                                 |
| S3   | Standards + Spec | fixed       | Same gap as A1; fixed by 7448ad4b                                                                                 |
| S4   | Standards + Spec | fixed       | 7448ad4b: hook comment quotes "Subagents run in the background by default"                                        |
| S5   | Standards + Spec | fixed       | 7448ad4b: script renamed `foreground-hook:check` (`package.json:15`, `:68`)                                       |
| P1   | Standards + Spec | fixed       | Same gap as A3; fixed by 7448ad4b                                                                                 |
| P2   | Standards + Spec | fixed       | Same gap as A2; fixed by 7448ad4b                                                                                 |
| P4   | Standards + Spec | fixed       | 7448ad4b: `gate-planner.md:91` "that your prompt lists"                                                           |
| R2-4 | Focused check    | fixed       | Ticket 712 per-chunk ruling now names this branch's step 3 numbering and step 4 cap                               |
