Status: open
Type: process
Origin: docs/reviews/chore-changing-agent-instructions-rule.md (finding 3)
Blocks: none
Blocked by: none
Related: 732

# The pre-merge-review skill asks for approval of agent-file edits with no reviewed text

## What happens

The `pre-merge-review` skill, § Agent files, says: "list them all for one
approval by the user after round 1 and before any fix is made"
(`.claude/skills/pre-merge-review/SKILL.md:295-298`, same text in
`.agents/skills/pre-merge-review/SKILL.md`). The global rule "Changing
agent instructions" (`docs/agents/home/AGENTS.md`, added on branch
`chore/changing-agent-instructions-rule`) asks for approval only of exact
text that one `instruction-review` run has read. The skill's approval
names no exact text and no review, so under the new rule it does not
count, and a reviewer following the skill asks for an approval the rule
then makes them ask for again.

Source: finding 3 in
`.scratch/agent-reports/2026-10-30-general-task-instruction-review-rule-draft5.md`
and, carried, in
`.scratch/agent-reports/2026-10-30-general-task-instruction-review-rule-final.md`
(both gitignored, on the main checkout).

## What would fix it

Rewrite the skill's § Agent files paragraph, in both copies, so that the
agent-file edits found in round 1 go to the user as one proposal under the
global rule: exact text, where it goes, and what reviewed it. Hypothesis,
untested. A skill edit needs the owner's approval of the exact text
(global rule "Changing agent instructions").

## Done when

- Both copies of the skill's § Agent files paragraph ask for approval of
  reviewed exact text, and say nothing that conflicts with the global
  rule.
