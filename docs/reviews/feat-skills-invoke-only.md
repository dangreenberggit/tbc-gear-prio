# Pre-merge review — feat/skills-invoke-only

Reviewed range: `a744c2ecc387d6e3bed75ca209b7cc5237a6ddc3..6764c74bb8f2a65bf51fe13d7907ba0c9ff8f621`

Dispatch: no `codex` binary on `PATH`, so the three axes ran as fresh
`general-task` subagents on Opus, in one parallel batch. The Standards + Spec
axis ran the `code-review` skill unchanged.

## Adversarial

The frontmatter key is valid, inside the `---` block, LF, and the mirrors are
byte-identical (`python scripts/check_skill_mirrors.py`, rc 0). No agent
definition preloads either skill, and no other skill that files GitHub issues
was missed.

A1 (major): Codex can still invoke both skills on its own. Of the 27 skills in
`.agents/skills/` that set `disable-model-invocation: true`, 25 also set
`policy: allow_implicit_invocation: false` in `agents/openai.yaml` (`grep -l`
counts); `qa` and `request-refactor-plan` are the two that do not, and
`triage` shows the pairing. That Codex reads the policy key and ignores the
frontmatter key is a hypothesis, untested.

A2 (nit): `skills-lock.json` pins both skills to upstream `mattpocock/skills`
with a `computedHash`; nothing in the repo reads that hash (`git grep
computedHash`). That an installer update would overwrite the new line is a
hypothesis, untested.

## Domain

**Domain: clean.** The range has no TBC, Warcraft Logs or wowsims content.

## Standards + Spec

**Standards: clean.** **Spec: clean.** Four files, four insertions, form
matches `.claude/skills/triage/SKILL.md`, subject is 45 characters,
imperative, no body or attribution.

The axis noted that both descriptions still say "Use when user wants to…"
and `request-refactor-plan` line 7 still says the skill "will be invoked when
the user wants" one; `triage` has the same wording with the flag, and the
spec said to change nothing else.

## Summary

The change does what it claims for Claude Code. A1 is the one real gap: the
Codex-side flag is missing for both skills. The fix was attempted on the
branch and the permission classifier refused the edit to
`.claude/skills/qa/agents/openai.yaml` as outside the approved scope, so the
branch keeps the Claude Code change only and A1 waits for an owner decision.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                            |
| --- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | wontfix     | Outside the approved scope ("change nothing else"); the edit to add `policy: allow_implicit_invocation: false` to both skills' `agents/openai.yaml` was refused by the permission classifier. Owner decides whether to extend the scope. |
| A2  | Adversarial | wontfix     | Every locally adjusted vendored skill carries the same risk; nothing reads `computedHash`.                                                                                                                                               |
| S1  | Standards   | wontfix     | Trigger wording in the descriptions and `request-refactor-plan` line 7 matches the `triage` convention, and the spec forbade other edits.                                                                                                |
