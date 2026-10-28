# Pre-merge review — feat/stage-gate-follow-ups

Reviewed range: `80c087773c178fd784cd0f88c9925e3b225f5e37..7ed12daf942c49dd7001cd911df6a73a88a6b263`

Dispatch note (2026-10-27): `git diff --shortstat dev...HEAD` gave
`8 files changed, 350 insertions(+), 36 deletions(-)`, so the branch is
over the small-change limits (6 files, 150 lines) and got the full axes.
No path is under `data/`, `vendor/` or `packages/core/src/`. `codex` is
not on `PATH`, so each axis ran as a fresh `general-task` agent on Opus
(review lane): one adversarial, and the `code-review` skill's Standards
and Spec agents. The domain axis was skipped: the diff is workflow
documents for agents with no game-domain content. The caller fixed the
scope: the diff against the tickets and the owner-approved text, the
closed tickets against `docs/agents/issue-tracker.md` (re-running each
`Verified by:` command), broken references elsewhere, and mirror parity.
No axis proposed new wording for the approved text or reviewed the rest
of the stage-gate files.

## Adversarial

The edits match the approved text in tickets 721, 722 and 723, apart
from one comma (A5). No section name or rule that another file points at
was broken. The findings are in ticket 725, which commit `4f287dd0`
(ticket 723) made stale on this same branch.

- **A1 (bookkeeping, ticket wording).** Q-725-term recommends
  `Approach claim` because it "pairs with "step-local claim", which
  `gate-planner.md:76` already uses." Commit `4f287dd0` removed
  "step-local": `git grep -n -i step-local 7ed12daf -- .claude .agents`
  prints nothing. The owner would decide the new term on a reason that
  is no longer true.
- **A2 (bookkeeping, ticket wording).** The Group A row for
  `gate-planner.md:75` quotes as Current "Verify to the depth of the
  claim you are about to make: a load-bearing", which Text A replaced.
  The term is now on two lines:
  `git grep -n -i load-bearing 7ed12daf -- .claude/agents/gate-planner.md`
  prints `:75` (`Load-bearing: yes`) and `:76` (`Load-bearing: no`). The
  Group A count "gate-planner.md (1)" is now 2. The row's Replacement
  starts with "Verify to the depth of the claim", the sentence the owner
  cut under 723, so an agent that applies the row by line number would
  put the cut sentence back.
- **A3 (bookkeeping, ticket wording).** Ticket 725 says its line numbers
  are at `80c08777` and warns only that `gate-planner.md` lines move.
  Commit `7ed12daf` moved the `SKILL.md` rows 343, 347, 355, 381 and 401
  to 345, 349, 359, 385 and 405. The excerpts still match, so the grep
  still finds each line.
- **A4 (bookkeeping).** Ticket 724's `SKILL.md` citations after line 340
  are 4 lines higher after this branch (old `:557` is new `:561`, by
  `git show 80c08777:` and `git show 7ed12daf:` piped to `sed -n`).
  Ticket 724 states that its line numbers are at `46e75132` (its line 21).
- **A5 (minor).** The 722 Loop back hunk adds a comma after the inserted
  parenthetical: "...`spawn` line), for a revision," (`SKILL.md:341`,
  both copies). Ticket 722 records only the phrase substitution. The
  meaning does not change.

Clean: 721 replaced the two sentences word for word in both copies;
723 Text A and Text B match the approved text; the "§ Rules" reference
resolves (`gate-planner.md:40`); `Rebuttal:` is still defined
(`gate-planner.md:108`) after Text B dropped "Keep `Rebuttal:` for
rejecting a finding"; "the last field of that `gate-reviewer`'s `spawn`
line" matches the `spawn` line definition (`SKILL.md:166-172`); no other
tracked file outside `.scratch` repeats "brief + plan + review" or the
`resumed` logging rule.

## Domain

Skipped: no game-domain content (dispatch note).

## Standards + Spec

### Standards

No hard violations.

- **S1 (bookkeeping, judgement call).** Ticket 725 has no line in
  `.scratch/carry-forward/map.md`. `docs/agents/issue-tracker.md:122-127`
  asks for `map.md` lines only for wayfinding Resolve, so no written rule
  is broken. Tickets 720-724 were already missing at `80c08777`.

Clean: tickets 721, 722 and 723 each have `Status: closed` and a
`Verified by:` line; every recorded command was re-run at `7ed12daf` and
gave the recorded output, line numbers and rc (721: mirror check rc 0,
line 251 in both copies; 722: mirror check rc 0, lines 352 and 340 in
both copies; 723: `gate-planner.md:114`, and `grep -c` prints `0` with
rc 1). Ticket 725's header is complete and `NEXT` moved 725 to 726 in the
same commit (`git show --stat 0031055b`). `python3
scripts/check_skill_mirrors.py` prints `skill mirrors match` with rc 0.
All four commit subjects are 40 to 49 characters, imperative,
capitalized, subject-only, with no final period.

### Spec

No changes outside the tickets. 721 and 722 are in both mirrors (same
blob `57d116ba`); 722 changed both revision lists and left the re-split
rule alone; 723 placed Text A and Text B, cut item 7, and changed
nothing else in `gate-planner.md`.

- **P1** is A2 (same finding).
- **P2** is A1 (same finding).
- **P3 (bookkeeping, ticket wording).** Ticket 725 counts 11 matching
  lines in the fork repo `vendor/tbc-new-fork`, but puts them in no group
  and leaves them out of "Done when". Its "Done when" grep runs at the
  main repo root, where `vendor/` is gitignored, so it never reaches the
  fork. The owner asked to "replace it everywhere at once".
- **P4 (bookkeeping).** The "Done when" grep also matches tickets 723 and
  725 themselves (504 lines in 282 files at `80c08777`, 571 in 284 at
  `7ed12daf`).

## Summary

The four commits apply the owner-approved wording as approved; mirrors
match; every `Verified by:` command in the closed tickets re-runs with
the recorded result. Nothing blocks the merge, and no finding is a data
loss, a silent wrong result or a loud failure in the reviewed text.

Open, bookkeeping, not yet disposed: A1, A2, A3 and P3 are wording
faults in ticket 725, which this review may not edit. They need a ticket
edit by the agent that handles this review's findings; that edit starts
no round. When it lands, add a `fixed` row for each here. Suggested
text:

- A1: delete the sentence "It pairs with "step-local claim", which
  `gate-planner.md:76` already uses." from Q-725-term.
- A2: replace the `gate-planner.md:75` row with two rows, `:75`
  ``The reviewer counts a claim marked `Load-bearing: yes` and left`` to
  `` `Approach claim: yes` `` and `:76`
  ``a claim marked `Load-bearing: no` `` to `` `Approach claim: no` ``;
  change the Group A count to `gate-planner.md` (2) and 25 lines.
- A3: extend the re-find warning to say that tickets 722 and 723 on
  branch `feat/stage-gate-follow-ups` also move the `SKILL.md` lines
  after line 340 by 2 to 4.
- P3: either give the fork lines a group and a "Done when" line
  (`git -C vendor/tbc-new-fork grep -n -i -E 'load[- ]?bearing'` lists
  only lines the owner agreed to keep), or record that they are out of
  scope.

Filed by this branch: 1 ticket (725). Closed: 3 (721, 722, 723).
Round 2 will be skipped if the only later commits are the ticket 725
edit and this file, as `pre-merge-review` § Round limit allows.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                  |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| A4  | Adversarial | wontfix     | Ticket 724 states its line numbers are at `46e75132` (its line 21); they are correct at that commit.                           |
| A5  | Adversarial | wontfix     | The comma separates the inserted parenthetical; meaning unchanged; approved text is not re-worded by review.                   |
| S1  | Standards   | wontfix     | `issue-tracker.md:122-127` asks for `map.md` lines only for wayfinding Resolve; tickets 720-724 already lack them.             |
| P1  | Spec        | wontfix     | Duplicate of A2; disposed under A2.                                                                                            |
| P2  | Spec        | wontfix     | Duplicate of A1; disposed under A1.                                                                                            |
| P4  | Spec        | wontfix     | Ticket 723 is closed and 725 will be closed when done, so both fall in group D, which "Done when" already lets the owner keep. |
