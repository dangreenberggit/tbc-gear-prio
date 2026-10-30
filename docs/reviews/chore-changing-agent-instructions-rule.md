# Instruction review — chore/changing-agent-instructions-rule

Reviewed change: commit `ccc01c10` on `dev` at `aad7805e`. It adds the
global section "# Changing agent instructions" to
`docs/agents/home/AGENTS.md` (after "## Commit messages", before "# Don't
cut your own connection") and replaces the `AGENTS.md` bullet that begins
"A plan, a ticket, a skill" with one that points to that section.

Dispatch: every file this branch changes is agent tooling (`AGENTS.md`,
`docs/agents/`, `.scratch/carry-forward/issues/` and
`.scratch/carry-forward/map.md` are in `TOOLING_PATHS`,
`scripts/check_merge_ready.py:177-193`), so the review is the
`instruction-review` skill in place of `pre-merge-review`.

## Review passes

Both passes ran as one `general-task` agent on Opus, full path, with two
cold readers and an old/new trial run. The reports are gitignored files
on the main checkout.

1. First pass, on draft 5:
   `/home/daniel/Code/lulz/tbc-gear-prio/.scratch/agent-reports/2026-10-30-general-task-instruction-review-rule-draft5.md`.
   It found findings 1-11. Findings 1, 2, 4, 6 and 11 were fixed in the
   text before the second pass (text G5).
2. Pass on the final text (G5):
   `/home/daniel/Code/lulz/tbc-gear-prio/.scratch/agent-reports/2026-10-30-general-task-instruction-review-rule-final.md`.
   Verdict: ready to show the owner. It checked that fixes 1, 2, 4, 6 and
   11 work, found N1, N2 and N3 (minor), and carried findings 3, 5, 7 and
   8-10 from the first pass.

The committed text is the text the second pass read. `diff` of the
committed section and bullet against "Final global section (G5)" and
"Final repo bullet" in
`.scratch/agent-reports/2026-10-30-general-task-review-before-approval-rule.md`
(lines 157-176 and 182-187) prints nothing.

## Approval

The owner approved the two texts with the word "approved" on 2026-10-30.

## Open findings

- N1, N2, N3 (minor, second pass): unclear words in G5. The owner
  approved the text as is.
- Finding 3 (should fix, carried): the `pre-merge-review` skill's
  § Agent files paragraph still asks for one approval of agent-file
  edits with no reviewed exact text. It is in a third file, outside this
  change, and is left for a follow-up: ticket 735.
- Findings 5, 7, 8, 9, 10 (minor, carried from the first pass): the owner
  approved the text as is.

## Disposition

| ID  | Axis                             | Disposition | Ticket / note                                                                                                                 |
| --- | -------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1   | Instruction review (first pass)  | fixed       | Re-review covers a fix made during the review; text G5. The second pass found it works.                                       |
| 2   | Instruction review (first pass)  | fixed       | Stop rule for the fix-and-review loop; text G5. The second pass found it works (N1 is a wording gap in it).                   |
| 3   | Instruction review (first pass)  | defer       | `.scratch/carry-forward/issues/735-pre-merge-review-approval-paragraph-predates-the-rule.md` — skill edit outside this change |
| 4   | Instruction review (first pass)  | fixed       | "for each review"; text G5. The second pass found it works.                                                                   |
| 5   | Instruction review (first pass)  | wontfix     | Minor: whether the author may be the reviewer. Owner approved the text as is.                                                 |
| 6   | Instruction review (first pass)  | fixed       | "Create or edit"; text G5. The second pass found it works (N3 is the delete case).                                            |
| 7   | Instruction review (first pass)  | wontfix     | Minor: "the same way" does not say same or new reviewer. Owner approved the text as is.                                       |
| 8   | Instruction review (first pass)  | wontfix     | Minor: a dictated typo still costs a review. Owner approved the text as is.                                                   |
| 9   | Instruction review (first pass)  | wontfix     | Minor: harness note on `CLAUDE.md` edits by a subagent. Owner approved the text as is.                                        |
| 10  | Instruction review (first pass)  | wontfix     | Minor: the repo bullet is live before the owner copies the global file. Owner approved the text as is.                        |
| 11  | Instruction review (first pass)  | fixed       | Long sentence split; text G5. The second pass found no parse problem.                                                         |
| N1  | Instruction review (second pass) | wontfix     | Minor: "a fix" is not defined for a change the user asked for. Owner approved the text as is.                                 |
| N2  | Instruction review (second pass) | wontfix     | Minor: readers split on whether "nothing else" forbids the editor's commit. Owner approved the text as is.                    |
| N3  | Instruction review (second pass) | wontfix     | Minor: deleting a skill or agent file is not named. Owner approved the text as is.                                            |
