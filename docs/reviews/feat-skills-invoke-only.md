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

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                           |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | wontfix     | Outside the approved scope ("change nothing else"); the edit to add `policy: allow_implicit_invocation: false` to both skills' `agents/openai.yaml` was refused by the permission classifier. The owner later approved the edit (relayed by the coordinator, 2026-09-26); it is left for the owner to make by hand, not on this branch. |
| A2  | Adversarial | wontfix     | Every locally adjusted vendored skill carries the same risk; nothing reads `computedHash`.                                                                                                                                                                                                                                              |
| S1  | Standards   | wontfix     | Trigger wording in the descriptions and `request-refactor-plan` line 7 matches the `triage` convention, and the spec forbade other edits.                                                                                                                                                                                               |

# Round 2 — owner-approved doc edits

Reviewed range: `6764c74bb8f2a65bf51fe13d7907ba0c9ff8f621..c6ea605f35c27644a6f94a1a153971703de7968e`

Dispatch: one fresh `general-task` subagent on Opus, in the foreground,
covering all axes for three doc commits: `8eb0e195` (round-1 review file),
`cf75ec24` (global commit-message rule in `docs/agents/home/AGENTS.md`) and
`c6ea605f` (agent-file registration wording in `AGENTS.md` and the
`stage-gate` skill). The fixes landed in `b6afd1b8`, which applies the
reviewer's proposed text; no later round reviewed that commit.

The owner also asked to fix the "footguns in CLI environment above" pointer
in `AGENTS.md` § The forked tab repo. That section is not on `dev` or on this
branch (`git show dev:AGENTS.md | grep -n footgun` prints nothing); it exists
only on `feat/tab-signoff-followups` (commit `089acee8`), so the fix belongs
there.

## Findings

R1 (medium): the claim that an instruction-file edit reaches subagents only in
a new session was too broad, and its source (a token audit) is not in the
repo. The reviewer saw a spawn-time root `AGENTS.md` older than the file on
disk, and a worktree `CLAUDE.md` loaded from disk mid-run.

R2 (low): the mid-session registration observation named no source.

R3 (low): the stage-gate diagnosis for an unknown `subagent_type` left out a
mismatched `name:` and gave no source.

R4 (low): open ticket 252 line 83 still says `.claude/agents/` registers at
session start only.

R5 (nit): the instruction-file rule sat under Stage-gate features; it belongs
under Writing for agents.

R6 (nit): "The two sources they come from are references" did not tell the
reader what the sources are for.

## Disposition (round 2)

| ID  | Axis        | Disposition | Ticket / note                                                                                                                            |
| --- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Round 2     | fixed       | `b6afd1b8`: scoped to the root files, the audit named as uncommitted, and the 2026-09-26 observations stated.                            |
| R2  | Round 2     | fixed       | `b6afd1b8`: cites 1d86fd48 and the coordinator session's harness notices.                                                                |
| R3  | Round 2     | fixed       | `b6afd1b8`: checks `name:` first, then restart; both mirrors.                                                                            |
| R4  | Round 2     | wontfix     | Editing ticket 252 is outside this branch's scope; the owner asked for no ticket work.                                                   |
| R5  | Round 2     | fixed       | `b6afd1b8`: moved to Writing for agents.                                                                                                 |
| R6  | Round 2     | fixed       | `b6afd1b8`: "They come from these two sources:".                                                                                         |
| A1  | Adversarial | fixed       | `5a29900c`: the owner's hand edit adds `policy: allow_implicit_invocation: false` to both skills' `agents/openai.yaml`, in both mirrors. |
