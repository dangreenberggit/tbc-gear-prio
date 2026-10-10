Status: open
Type: task
Origin: docs/reviews/feat-review-loop-fixes.md (round 1: A1-A6, S1-S6, P1-P4)
Blocks: none
Blocked by: none

# Gaps in the new review-loop rules, waiting for one owner approval

## Why this is a ticket

Branch `feat/review-loop-fixes` changes agent files only. Its pre-merge
review found the gaps below in the text the branch adds. The branch's own
rule (`.claude/skills/pre-merge-review/SKILL.md`, step 3, "Agent files")
says findings that ask for agent-file edits are listed for one owner
approval, not applied per round. So none is fixed on the branch. Items
marked **blocking** are silent wrong results under the same file's
effect rules ("Fixed before merge"); the review reports them as blocking
the merge until the owner rules.

Line numbers are for `.claude/skills/pre-merge-review/SKILL.md` at
`f9c415ef`; `.agents/skills/pre-merge-review/SKILL.md` is identical.

## Edit list for approval

1. **A4 (blocking).** "When round 2 passes or is skipped" lets a branch
   that makes no fix commit skip round 2 and `defer` a failure the branch
   introduced (lines 192-195, 222). A "fixed before merge" finding is
   "reported as blocking" but has no Disposition word, and
   `scripts/check_merge_ready.py` does not compare finding IDs with rows,
   so `pnpm merge-to-dev --check-only` passes while it is open. Proposed:
   do not skip round 2 while a finding that must be fixed has no fix
   commit; a still-open "fixed before merge" finding means "stop as Round
   limit says".
2. **A3 / P2 (blocking).** Two paths merge unreviewed changes: the
   code-quality pass skips round 2 (lines 192-195, 241-245), and
   agent-file fixes wait for approval "at the hand-off", after round 2
   (lines 259-261). Proposed: drop the code-quality pass from the skip
   list (round 2 then reads it), and ask for agent-file approval after
   round 1, before the fixes.
3. **A6 / P1 (blocking, wrong count).** The closed-ticket grep (line 314)
   misses `Status: **closed**` (3 tickets use it: `git grep -h -iE
   '^\s*\*{0,2}Status:' f9c415ef -- '.scratch/carry-forward/issues/*.md' |
   sort | uniq -c`). The count is taken after step 3, before "Round limit"
   files its `defer` tickets, so step 5 can report too few. Proposed regex:
   `'^\+\s*(\*\*)?Status:(\*\*)? *(\*\*)?(closed|resolved|wontfix)'`;
   take the count again after the last Disposition table is written.
4. **A1.** Condition 1 accepts a whitespace-only commit, but condition 2
   (lines 147-148) still requires every changed line to sit at a cited
   finding, and a failed condition now stops the review. Proposed: add
   whitespace-only and code-quality-pass commits to condition 2's
   exclusions.
5. **A2.** "A fresh round 1 for new work" (lines 210-211) cannot run:
   round count is "one line that starts with `Reviewed range:`" (line
   185), so a restart is round 2 or 3. Proposed: a restart heading starts
   a new count.
6. **A5.** "process notes" counts as bookkeeping (line 246), so on an
   agent-doc branch a rule fix can skip round 2. Proposed: bookkeeping is
   wording in this review file or ticket text only.
7. **P3.** `.claude/agents/design-task.md` now returns "the file's path
   and your recommendation" when a plan file is named; the proposal's
   review item 11 wanted "your plan ... is your final message" kept.
   Proposed: decide which the callers expect.
8. **P4.** `stage-gate/SKILL.md` still says the re-split planner "rewrites
   `plan.md` itself" (three places), next to the new targeted-`Edit` rule
   in `parts.md`. Proposed: "changes `plan.md` itself".
9. **S1.** "The owner ruled out a third round" gives no source. Proposed:
   add the date and the owner's words, or drop the sentence.
10. **S2.** The round-2 skip list and condition 1's commit list repeat
    each other; the stop triggers are stated in two places. Proposed: one
    list, referenced from the other place.
11. **S3.** Three role names ("the agent that dispatches the review",
    "... the axes", "the agent that handles this review's findings") are
    not said to be one agent. Proposed: define one role, used everywhere.
12. **S4.** "Leave `effort` off unless the owner asks" is in three files
    (AGENTS.md, model-policy, parallel-phase adapter) with two wordings.
    Proposed: state it once in model-policy; the other two point at it.
13. **S5.** The write-once plan-file rule is in both `design-task.md` and
    `parts.md`. Judgement call: leave it (each agent reads only its own
    file) or point one at the other.
14. **S6.** AGENTS.md's trial-type sentence restates model-policy § Trial
    types, and "run nothing on Haiku" is only in AGENTS.md. Proposed: add
    the Haiku line to § Trial types.

## Done when

The owner has ruled on each item, the approved edits are applied in
`.claude/skills/**` and mirrored byte-for-byte to `.agents/skills/**`, and
`pnpm verify` passes.
