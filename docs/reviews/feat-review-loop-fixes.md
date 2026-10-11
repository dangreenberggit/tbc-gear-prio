# Pre-merge review — feat/review-loop-fixes

Reviewed range: `8ebd89e6f9013630fbab6d6fb7b6cccf3e97dc19..f9c415ef82c2bb155c2936299b2b511317d11a3a`

Reviewed range: `f9c415ef82c2bb155c2936299b2b511317d11a3a..5d2fb6ce3f1a9a112ebea5f65cd870e8eecacc21`

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
edits for one owner approval instead of fixing them per round. The owner
approved three fixes (round 2 below); the rest are in one ticket.

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
for the owner's approval of ticket 600.

## Focused check (round 2)

Dispatch (round 2): one fresh Opus subagent (`general-task`, effort high),
in the foreground, told to spawn no subagents and write nothing. Main range
`f9c415ef..5d2fb6ce`: `a4387e1a` (this file and ticket 600) and `5d2fb6ce`
(fixes for A3, A4, A6, approved by the owner on 2026-10-10: "do the 3 that
work"). Fork range: none; `git diff --quiet dev...HEAD --
data/wowsims-fork.lock.json` exits 0.

1. Conditions 1 to 3: pass. `a4387e1a` also changes `issues/NEXT` and
   `map.md`, which condition 1 does not name (R2-3).
2. Diff changes only what each finding asks: pass, except that the A4 fix
   is incomplete (R2-1).
3. New tests: none (agent-file change). In their place the new
   closed-ticket regex was run on all 578 ticket `Status:` lines at
   `5d2fb6ce`: with `+` added it matched 415, equal to 340 closed + 70
   resolved + 5 wontfix; with `-` added it matched 0. The old regex gave 411.
4. Tests the fixes touch: none.

Findings:

- **R2-1 (silent wrong result).** A4 is fixed only on the skip path. When
  round 2 runs, it is given only the findings the commits fix, so a loud
  failure the branch introduced and nobody fixed is deferred by "every
  other open finding: a `defer` row and a ticket".
- **R2-2 (code quality).** "A code-quality row never starts a round of its
  own" now contradicts the removal of the code-quality pass from the skip
  list.
- **R2-3 (bookkeeping).** Condition 1 does not name `issues/NEXT` and
  `map.md`, which filing a ticket changes.

**Stopped under "Round limit".** Round 2 reported findings other than
bookkeeping (R2-1, R2-2), so there is no further round and no fix. Which
fix: `5d2fb6ce`. Likely cause (hypothesis, untested): the approved A4 text
named only "fixed before merge" findings and the round 2 brief, and the
fixer kept to it; R2-2 is a sentence the fix left unchanged. All three are
items 1, 2 and 6 of ticket 600 for another session; R2-1 needs the owner's
ruling.

## Summary

Round 1 raised 17 findings. The owner approved fixes for three of them
(A3, A4's skip path, A6; P1 and P2 duplicate A6 and A3), applied in
`5d2fb6ce`. Round 2 confirmed A3 and A6 and found A4 incomplete (R2-1),
plus R2-2 and R2-3, so the review stopped under its own "Round limit". All
remaining findings are in ticket 600, written for a session that starts
cold. P5 is `wontfix`.

Tickets: filed 1 (600), closed 0 (`git diff --name-status dev...HEAD --
'.scratch/carry-forward/issues/*.md'` lists one `A` row; the closing-status
grep counts 0). Filed is higher than closed because ticket 600 holds the
owner-deferred findings.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                 |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | defer       | `.scratch/carry-forward/issues/600-review-loop-rule-gaps.md` — item 3                                                                                                                                                         |
| A2  | Adversarial | defer       | `.scratch/carry-forward/issues/600-review-loop-rule-gaps.md` — item 4                                                                                                                                                         |
| A3  | Adversarial | fixed       | `5d2fb6ce`: the code-quality pass is off the round 2 skip list, and agent-file approval comes after round 1; superseded in round 2, which confirmed it; R2-2 (a sentence left unchanged) is ticket 600 item 2                 |
| A4  | Adversarial | defer       | `.scratch/carry-forward/issues/600-review-loop-rule-gaps.md` — item 1 (R2-1); the skip path was fixed in `5d2fb6ce`, the round-2-passes path is open and needs the owner's ruling                                             |
| A5  | Adversarial | defer       | `.scratch/carry-forward/issues/600-review-loop-rule-gaps.md` — item 5                                                                                                                                                         |
| A6  | Adversarial | fixed       | `5d2fb6ce`: new regex and later count; superseded in round 2, which matched 415 of 415 closing status lines                                                                                                                   |
| S1  | Standards   | defer       | `.scratch/carry-forward/issues/600-review-loop-rule-gaps.md` — item 9                                                                                                                                                         |
| S2  | Standards   | defer       | `.scratch/carry-forward/issues/600-review-loop-rule-gaps.md` — item 10                                                                                                                                                        |
| S3  | Standards   | defer       | `.scratch/carry-forward/issues/600-review-loop-rule-gaps.md` — item 11                                                                                                                                                        |
| S4  | Standards   | defer       | `.scratch/carry-forward/issues/600-review-loop-rule-gaps.md` — item 12                                                                                                                                                        |
| S5  | Standards   | defer       | `.scratch/carry-forward/issues/600-review-loop-rule-gaps.md` — item 13                                                                                                                                                        |
| S6  | Standards   | defer       | `.scratch/carry-forward/issues/600-review-loop-rule-gaps.md` — item 14                                                                                                                                                        |
| P1  | Spec        | fixed       | `5d2fb6ce`: the count is taken after the last Disposition table; same fix as A6                                                                                                                                               |
| P2  | Spec        | fixed       | Duplicate of A3, fixed in `5d2fb6ce`                                                                                                                                                                                          |
| P3  | Spec        | defer       | `.scratch/carry-forward/issues/600-review-loop-rule-gaps.md` — item 7                                                                                                                                                         |
| P4  | Spec        | defer       | `.scratch/carry-forward/issues/600-review-loop-rule-gaps.md` — item 8                                                                                                                                                         |
| P5  | Spec        | wontfix     | Both additions ("unless the owner asks for a specific effort"; the `TRIAL-REJECT` line) came from the step-2 wording review (its items 12 and 9), which the coordinator told the branch to apply; both match existing sources |
