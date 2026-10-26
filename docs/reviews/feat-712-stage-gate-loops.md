# Pre-merge review — feat/712-stage-gate-loops

Reviewed range: `2bc139f424db09c2635022f344d0ae20d1388d11..83f59324f7f9bbb88625797e36aa6c5aecaeb8fc`

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
