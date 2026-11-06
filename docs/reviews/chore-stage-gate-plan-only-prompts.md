# Instruction review — chore/stage-gate-plan-only-prompts

Reviewed change: one new last item in the `## Do not` list of
`docs/agents/home/skills/stage-gate/SKILL.md`. It bans putting anything
in an executor's prompt, or a later message to it, that differs from the
plan; a wrong step goes to a `gate-planner` revision, or to the user once
an executor has started on that plan. The owner approved the exact text
and where it goes on 2026-11-05 ("Sure").

Dispatch: every file this branch changes is agent tooling
(`docs/agents/` is on `TOOLING_PATHS`, `scripts/check_merge_ready.py:177`)
or this review record, so the review is the `instruction-review` skill in
place of `pre-merge-review`.

## Review passes

One `general-task` agent on Opus ran the review. Its report is the
gitignored file
`.scratch/agent-reports/2026-11-05-general-task-instruction-review-stage-gate-plan-only-bullet.md`
on the main checkout.

1. Full path (new rule), on the first draft: F1 to F3 should fix, F4
   minor, F5 blocks (no trial run). The reviewer read as the
   orchestrator; no cold reader was spawned.
2. Fix path, last round, on the redraft: F1 to F4 closed; F6 new and
   minor (delete "restate or", because a `rework` ledger row quotes the
   step it asks to redo); F5 still open.

The approved text takes F6's fix. No review read the text after that
one-word deletion.

## Open

- No trial run (F5). The owner approved without one on 2026-11-05: asked
  "approve this text, without a real trial run?", the owner answered
  "Sure".

## Disposition

| ID  | Axis                        | Disposition | Ticket / note                                                                                              |
| --- | --------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------- |
| F1  | Instruction review, round 1 | fixed       | "nothing else" removed; the prompt may still carry paths, base SHA, dirty paths and a `rework` ledger row. |
| F2  | Instruction review, round 1 | fixed       | A `gate-planner` revises `plan.md`, and the revision is reviewed as step 4 says.                           |
| F3  | Instruction review, round 1 | fixed       | The boundary is now "Once an executor has started on that plan".                                           |
| F4  | Instruction review, round 1 | fixed       | "build agent" replaced by "executor", the skill's own term.                                                |
| F5  | Instruction review, round 1 | wontfix     | No trial run. The owner waived the trial on 2026-11-05 ("Sure", § Open).                                   |
| F6  | Instruction review, round 2 | fixed       | "restate or" deleted: the approved text reads "it does not alter the steps".                               |
