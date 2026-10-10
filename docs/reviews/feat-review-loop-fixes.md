# Pre-merge review — feat/review-loop-fixes

Reviewed range: `8ebd89e6f9013630fbab6d6fb7b6cccf3e97dc19..f9c415ef82c2bb155c2936299b2b511317d11a3a`

Dispatch (round 1): three fresh Opus subagents (`general-task`, effort high),
run in the foreground in one batch: adversarial, and the `code-review`
skill's Standards and Spec agents, dispatched directly so that each reviewer
spawned no subagents. Each was told it writes nothing and reports no finding
on this review file or ticket text. `codex` is not on `PATH`. Domain axis
skipped: the diff changes only agent-facing process text (AGENTS.md,
`docs/agents/model-policy.md`, one agent file, four skill files and their
`.agents/skills` mirrors) and has no game-domain content. Small-change lane
not used: `git diff --shortstat dev...HEAD` at `f9c415ef` reports 11 files
changed, so the branch is not a small change.

What the branch is: the owner-approved agent-file fixes F3, F4, F5, F6, F7,
F9 and F11 from a proposal of 2026-10-10 (owner: "Reviewer should check the
wording. But sounds ok"), after one wording review, plus the owner's later
addition of a small-change review lane and a one-check round limit.

This review runs under the rules the branch adds. Every finding asks for an
edit to an agent file, and the branch's step 3 "Agent files" rule lists such
edits for one owner approval instead of fixing them per round. So no finding
is fixed on the branch; all are deferred to one ticket holding the edit list.

## Adversarial

Six findings (A1-A6); mirrors byte-identical, effort fact confirmed against
the sub-agents doc, ticket-count commands run on past merges.

- **A1 (loud failure).** Condition 1 accepts a whitespace-only commit, but
  condition 2 still requires every changed line to sit at a cited finding,
  and a failed condition now stops the review. A rewrap next to a real fix
  sends a false stop to the owner.
- **A2 (loud failure).** "A fresh round 1 for new work" cannot run: a round
  is a `Reviewed range:` line, so a restart counts as round 2 or 3.
- **A3 (silent wrong result).** The code-quality pass can skip round 2, and
  agent-file fixes approved at the hand-off come after round 2; both merge
  unreviewed.
- **A4 (silent wrong result).** With no fix commit, round 2 is skipped and a
  branch-introduced failure is deferred; a "fixed before merge" finding has
  no Disposition word, and `scripts/check_merge_ready.py` does not compare
  finding IDs with rows, so `--check-only` passes while it is open.
- **A5 (other).** "process notes" counts as bookkeeping, so on an agent-doc
  branch a rule fix can skip round 2.
- **A6 (silent wrong count).** The closed-ticket grep misses
  `Status: **closed**`, used by 3 existing tickets.

## Standards + Spec

**Standards:** S1 (the "owner ruled out a third round" sentence names no
source), S2 (skip list and condition 1 list repeat each other; stop triggers
stated twice), S3 (three undefined role names), S4 (the effort rule in three
files, two wordings), S5 (write-once rule in two files), S6 (AGENTS.md
restates § Trial types; "nothing on Haiku" only in AGENTS.md). Commit
subjects, mirrors and tree state clean.

**Spec:** P1 (the ticket count is taken before "Round limit" files its
tickets), P2 (same as A3, the unreviewed code-quality pass), P3
(`design-task.md` now returns a path, not the plan, when a plan file is
named), P4 (`stage-gate/SKILL.md` still says "rewrites `plan.md`"), P5 (two
additions beyond the proposal's text). All listed adaptations judged
justified.

## Code quality

| ID  | Finding                                                                 |
| --- | ----------------------------------------------------------------------- |
| S1  | Unsourced "owner ruled out a third round" in Round limit                |
| S2  | Skip list and condition 1 list duplicated; stop triggers stated twice   |
| S3  | Three role names, not said to be one agent                              |
| S4  | Effort rule stated in three files with two wordings                     |
| S5  | Write-once plan-file rule in two files                                  |
| S6  | Trial-type sentence restates model-policy; Haiku line has no home there |
| P4  | stage-gate SKILL.md "rewrites `plan.md`" next to the targeted-Edit rule |

No code-quality pass ran: every row asks for an agent-file edit, which waits
for the owner's approval of ticket 595.

## Summary

Round 1 raised 17 findings. None is fixed on the branch: each asks for an
agent-file edit, and the branch's own "Agent files" rule batches those for
one owner approval, now listed in ticket 595. Four findings are silent wrong
results under the branch's effect rules (A3, A4, A6, P1; P2 duplicates A3)
and are reported to the owner as **blocking the merge** until the owner
rules on ticket 595. P5 is `wontfix`.

Round 2 skipped: the only commit after `f9c415ef` changes only this review
file and its ticket (`git log --oneline f9c415ef..HEAD` lists one commit,
"Add pre-merge review and ticket 595").

Tickets: filed 1 (595), closed 0, counted with step 3's commands. Filed is
higher than closed because the branch fixes nothing its review found; the
owner's approval of 595 decides those edits.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                 |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | defer       | `.scratch/carry-forward/issues/595-review-loop-rule-gaps.md` — item 4; agent-file edit for owner approval                                                                                                                     |
| A2  | Adversarial | defer       | `.scratch/carry-forward/issues/595-review-loop-rule-gaps.md` — item 5; agent-file edit for owner approval                                                                                                                     |
| A3  | Adversarial | defer       | `.scratch/carry-forward/issues/595-review-loop-rule-gaps.md` — item 2; silent wrong result, blocks the merge until the owner rules                                                                                            |
| A4  | Adversarial | defer       | `.scratch/carry-forward/issues/595-review-loop-rule-gaps.md` — item 1; silent wrong result, blocks the merge until the owner rules                                                                                            |
| A5  | Adversarial | defer       | `.scratch/carry-forward/issues/595-review-loop-rule-gaps.md` — item 6; agent-file edit for owner approval                                                                                                                     |
| A6  | Adversarial | defer       | `.scratch/carry-forward/issues/595-review-loop-rule-gaps.md` — item 3; silent wrong count, blocks the merge until the owner rules                                                                                             |
| S1  | Standards   | defer       | `.scratch/carry-forward/issues/595-review-loop-rule-gaps.md` — item 9; code quality, agent-file edit                                                                                                                          |
| S2  | Standards   | defer       | `.scratch/carry-forward/issues/595-review-loop-rule-gaps.md` — item 10; code quality, agent-file edit                                                                                                                         |
| S3  | Standards   | defer       | `.scratch/carry-forward/issues/595-review-loop-rule-gaps.md` — item 11; code quality, agent-file edit                                                                                                                         |
| S4  | Standards   | defer       | `.scratch/carry-forward/issues/595-review-loop-rule-gaps.md` — item 12; code quality, agent-file edit                                                                                                                         |
| S5  | Standards   | defer       | `.scratch/carry-forward/issues/595-review-loop-rule-gaps.md` — item 13; code quality, agent-file edit                                                                                                                         |
| S6  | Standards   | defer       | `.scratch/carry-forward/issues/595-review-loop-rule-gaps.md` — item 14; code quality, agent-file edit                                                                                                                         |
| P1  | Spec        | defer       | `.scratch/carry-forward/issues/595-review-loop-rule-gaps.md` — item 3; silent wrong count, blocks the merge until the owner rules                                                                                             |
| P2  | Spec        | defer       | `.scratch/carry-forward/issues/595-review-loop-rule-gaps.md` — item 2; duplicate of A3                                                                                                                                        |
| P3  | Spec        | defer       | `.scratch/carry-forward/issues/595-review-loop-rule-gaps.md` — item 7; agent-file edit for owner approval                                                                                                                     |
| P4  | Spec        | defer       | `.scratch/carry-forward/issues/595-review-loop-rule-gaps.md` — item 8; code quality, agent-file edit                                                                                                                          |
| P5  | Spec        | wontfix     | Both additions ("unless the owner asks for a specific effort"; the `TRIAL-REJECT` line) came from the step-2 wording review (its items 12 and 9), which the coordinator told the branch to apply; both match existing sources |
