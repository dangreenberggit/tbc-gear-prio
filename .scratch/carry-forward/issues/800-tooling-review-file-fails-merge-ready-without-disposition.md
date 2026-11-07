Status: open
Type: process
Origin: merge attempt of `chore/fix-rule-review-bar` (worktree `.scratch/wt-fix-rule`, main checkout), 2026-11-05
Blocks: none
Blocked by: none
Related: 731, 732

# A tooling-only branch's instruction-review file fails merge-ready: no Disposition section

## What an agent sees

A branch that changes only agent tooling gets `instruction-review` in
place of the pre-merge axes. The review of `chore/fix-rule-review-bar`
wrote its report to `docs/reviews/chore-fix-rule-review-bar.md` in the
form `instruction-review` asks for (a findings table with severity) and
committed it. `pnpm merge-to-dev --check-only` then failed:

```
FAIL: review has no ## Disposition section
```

The branch merged only after a later commit (`24bc5280`, "Add
Disposition table to review file") added a table that no instruction
had asked for.

## Why, on `dev` at `cf8e37a1`

- `docs/agents/home/skills/pre-merge-review/SKILL.md:37-38`: "It prints
  nothing: every changed file is agent tooling. Run `instruction-review`
  in place of this skill, and stop here." It names no review file and no
  Disposition table for this case.
- `docs/agents/home/skills/instruction-review/SKILL.md:15-17` says the
  repo supplies "where the report goes"; its § Report (`:115-121`) asks
  for a findings table (check, file:line, quote, severity, evidence),
  not a Disposition table.
- No repo doc gives that value for `instruction-review`. `AGENTS.md:84-87`
  and `docs/workflow.md:68` only say the tooling-only branch's review is
  "the `instruction-review` result". Meanwhile
  `docs/agents/pre-merge-review-project.md:53` names
  `docs/reviews/<branch-name>.md` as the review file, and
  `docs/agents/orchestration.md:27-29` lets the review subagent write
  `docs/reviews/`, so an agent puts the report there.
- `scripts/check_merge_ready.py:1148-1149` checks any review file that
  exists, and `:1048-1051` fails one with no `## Disposition` section.
  The tooling exemption (`:9-11`, `:166-167`) removes only the need for
  the file, not the format of a file that is there.
- The one warning is `docs/workflow.md:59-60`: "a review file that exists
  is still checked". It does not say what is checked or that the
  `instruction-review` report form fails it.

Earlier tooling branches got through by copying the table by hand:
`docs/reviews/chore-732-instruction-review.md:59` records that the agent
read workflow.md and added the table for that reason. Ticket 732 (on
`dev`, § Skill feedback from real use, `:132-134`) notes "No Disposition
format. The skill names none." as a note only; its Done-when list does
not cover it.

## Done when

One of these holds, chosen by whoever fixes it, and a tooling-only
branch reviewed by following the docs as written passes
`pnpm merge-to-dev --check-only` without a hand-added table:

- the repo's values for `instruction-review` say where its report goes
  and that a report saved as `docs/reviews/<branch>.md` needs a
  `## Disposition` table in the form `docs/agents/known-traps.md`
  § Before writing a review Disposition table gives; or
- the report goes somewhere the gate does not read, and the review
  record for the merge is kept elsewhere.

Changes to `pre-merge-review`, `instruction-review` or `AGENTS.md` need
the owner's approval of the exact text first (AGENTS.md, "Propose
changes to `AGENTS.md`, `CLAUDE.md` and skill files in chat").
