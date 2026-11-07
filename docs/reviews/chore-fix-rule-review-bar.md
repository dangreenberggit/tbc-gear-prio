# Instruction review — chore/fix-rule-review-bar

Reviewed change: the text the owner approved on 2026-11-04 ("SURE.
APPROVED."), commit `c3902cf` in the gitignored work repo
`.scratch/round-limits-r16/review-bar/` on the main checkout, applied here
on `dev` at `cf8e37a1`. It adds a fix rule to `docs/agents/home/AGENTS.md`
§ Findings and fixes (when a fix seems to need more words or code,
rewrite first and say why a rewrite is not enough), and changes the
`instruction-review` skill: a fix path, what counts as a finding, Notes
for unclear sentences that still need a rewrite, and a findings table
that states how each problem can happen and what it costs.

Why: 16 review rounds on the round-limits change never reached zero
findings, and each fix round added more text than it removed. The study
is `.scratch/round-limits-r16/2026-11-04-review-rounds-why-recurring.md`
on the main checkout.

Dispatch: every file this branch changes is agent tooling
(`docs/agents/` and `docs/reviews/` sit under `TOOLING_PATHS` or are
review records, `scripts/check_merge_ready.py:177`), so the review is the
`instruction-review` skill in place of `pre-merge-review`.

## Review passes

Both passes ran the full path as one `general-task` agent on Opus, with
cold readers and no old/new trial. The reports are gitignored files on
the main checkout, under `.scratch/round-limits-r16/review-bar/`.

1. `review-1.md`, on the first draft `b24f841`: 1 blocks (no trial run),
   3 should fix (F-1 to F-3). All three were fixed by the redraft.
2. `review-2.md`, on `68a87e7`: 1 blocks (no trial run), 2 should fix
   (R2-1, R2-2), 1 minor (R2-3). The stop rule applied after it.

After review 2, the owner's later corrections (unclear text is still bad
writing; fewer, shorter rules) and a plain-English rewrite produced the
approved text. That text removes R2-1 to R2-3 by deleting the sentences
behind them. No review read the approved text in its final form; the
owner saw that stated and approved it as shown.

## Open

- No old/new trial run (review 1 and review 2 blocking item). The owner
  approved without one. The first real use is the rework of the
  round-limits change.

## Round-limits change (r18)

Reviewed change: the r18 text of the round-limits change, commit
`28f443d` (branch `r18-rewrite`) in the gitignored draft repo
`.scratch/round-limits-r16/scratch-o14/` on the main checkout, plus
fixes F1 and F2 below. The owner approved it on 2026-11-05 ("Sure rec
is fine"). It changes `docs/agents/home/AGENTS.md`, the
`pre-merge-review` and `stage-gate` skills under `docs/agents/home/skills/`,
`docs/agents/orchestration.md` and
`docs/agents/pre-merge-review-project.md`. It limits how many review
rounds run before the work stops and goes to the user.

### Review passes

The reports are gitignored files on the main checkout, under
`.scratch/round-limits-r16/r18-review/`.

1. R18, `2026-11-04-review-round-limits-r18.md`, full path on `0768ed2`:
   0 blocking, 2 should fix, 1 minor. The old/new trial run passed.
   R18-1 (a further round whose commits fail the focused-check
   conditions got two opposite actions) and R18-2 (a commit that edits
   or closes an existing ticket stopped the focused check) were fixed
   by rewording in `28f443d`. R18-3 (the project `AGENTS.md` keeps a
   closed list of when an overseer may spawn another) is not real on
   `dev`: that list exists only on branch `chore/729-test-result`.
2. R18 fix review, `2026-11-04-review-round-limits-r18-fix.md`, fix path
   on `28f443d`: R18-1 and R18-2 are gone. It found F1 (should fix: the
   wording "ticket files" may not cover the ticket counter `NEXT` and
   the ticket map, so a commit that files a ticket could stop the
   focused check) and F2 (minor: a sentence quoted the old start of a
   paragraph that the fix changed). Both are fixed in this commit, with
   the owner's approval on 2026-11-05.

Both reviews also raised problems in text that the change did not
touch. Those were checked separately; four are real and became tickets
812, 813, 814 and 799 (filed as 796 to 799 in commit `a2df89f6` on
branch `chore/729-test-result`; 796 to 798 were renumbered to 812 to 814
when that branch merged into `dev`, because `dev` had used those
numbers). The check is `.scratch/agent-reports/2026-11-05-general-task-unchanged-text-tickets.md`
on the main checkout.

## Disposition

Rows cover the findings of the four reviews above. Review 1's six notes
and review 2's seven notes are not findings under the skill. The problems
in unchanged text (tickets 799 and 812 to 814) are not this branch's
findings.

| ID    | Axis               | Disposition | Ticket / note                                                                                                                                                                      |
| ----- | ------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-1   | Fix rule, review 1 | fixed       | Fixed by the redraft (§ Review passes); review 2 says "No longer applies".                                                                                                         |
| F-2   | Fix rule, review 1 | fixed       | Fixed by the redraft (§ Review passes). Review 2 left a part as note N-3, on the word "raised"; the approved fix path (instruction-review `SKILL.md`:32) no longer uses that word. |
| F-3   | Fix rule, review 1 | fixed       | Fixed by the redraft (§ Review passes); review 2 says "No longer applies".                                                                                                         |
| F-4   | Fix rule, review 1 | wontfix     | No old/new trial run. The owner approved the text without one (§ Open); review 2 carried it as R2-4.                                                                               |
| R2-1  | Fix rule, review 2 | fixed       | The approved text deletes the sentences behind it (§ Review passes).                                                                                                               |
| R2-2  | Fix rule, review 2 | fixed       | The approved text deletes the sentences behind it (§ Review passes).                                                                                                               |
| R2-3  | Fix rule, review 2 | fixed       | The approved text deletes the sentences behind it (§ Review passes).                                                                                                               |
| R2-4  | Fix rule, review 2 | wontfix     | Same item as F-4: no trial run; the owner approved without one (§ Open).                                                                                                           |
| R18-1 | Round limits, R18  | fixed       | Reworded in draft commit `28f443d`, landed in `d91cca0f`; the R18 fix review says "Gone".                                                                                          |
| R18-2 | Round limits, R18  | fixed       | Reworded in draft commit `28f443d`, landed in `d91cca0f`; the R18 fix review says "Gone" for ticket edits and closes, with the rest raised as F1.                                  |
| R18-3 | Round limits, R18  | wontfix     | Not real on `dev`: the closed overseer list it names exists only on branch `chore/729-test-result`.                                                                                |
| F1    | Round limits, fix  | fixed       | Fixed in `d91cca0f` with the owner's approval on 2026-11-05.                                                                                                                       |
| F2    | Round limits, fix  | fixed       | Fixed in `d91cca0f` with the owner's approval on 2026-11-05.                                                                                                                       |
