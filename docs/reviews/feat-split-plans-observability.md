# Pre-merge review — feat/split-plans-observability

Reviewed range: `588854b3aa575c5cade2f25438f562f204d00227..461836654754cf05c9ed541d7afbc76066287fa4`

Reviewed range: `461836654754cf05c9ed541d7afbc76066287fa4..9959462bb71970bc33aa64a796ea895fe50e74ef`

Reviewed range: `9959462bb71970bc33aa64a796ea895fe50e74ef..4b5c786ca7ef91063253b3a06fcda42a43cdad02`

Dispatch: round 1 was four fresh Opus `general-task` subagents
(adversarial, domain, standards, spec) in one parallel batch, each told it
writes nothing and spawns no subagents; `codex` is not on `PATH`. Round 2
was one fresh Opus `general-task` over the fix commit `9959462b`. Round 3
was one fresh Sonnet `simple-task` that checked the rewrap commit
`4b5c786c` changes line breaks only (`git diff --word-diff=porcelain`
showed no added or removed word).

What the branch is: the owner-approved option-A proposal for split
planning and observability in the stage-gate pipeline. It adds
`.claude/skills/stage-gate/parts.md` (split, part, reconcile and re-split
modes for `gate-planner`), Gate A and Gate B changes in the stage-gate
`SKILL.md`, a fixed `decision-log.md` line format, a `## Decisions`
section in every seat's report, and the async run-log hook
`.claude/hooks/log-agent-run.py` registered in a new `.claude/settings.json`.
`.agents/skills/stage-gate/` mirrors `.claude/skills/stage-gate/` byte for
byte.

## Adversarial

No high finding. The hook exited 0 on every scratch input the reviewer
ran (handback, stop, invalid JSON, a JSON list, a non-string message, an
empty session ID, a worktree path), and 40 concurrent runs wrote 40 valid,
distinct lines.

- **A1 (medium)** `parts.md` § Re-split — a re-split that brings a
  deferred part back can leave two planned parts, and Gate A then needs
  `parts/<id>/plan.md` for each and a `## Seams` section, which the
  re-split planner was never told to write.
- **A2 (low)** `SKILL.md` Gate A — the over-budget re-split runs once per
  stage; a plan still over budget afterwards has no rule.
- **A3 (low)** `log-agent-run.py` — the Decisions capture ends at the next
  `#` line, so a bold (not heading) summary after the section is logged
  with it, and a `#` line inside the section cuts it short.
- **A4 (low)** `gate-planner.md` Inputs — "the plan would exceed the stage
  budget" is an estimate the planner makes before planning.

## Domain

**Domain: clean.** The diff states no TBC, WCL or wowsims fact and changes
no ranking or data-pipeline behaviour.

- **D1 (advisory)** `log-agent-run.py` `PRICES` — the cache-read price of
  `claude-fable-5-1` and `claude-opus-5-5` is not 0.1 × input, unlike the
  other rows. The reviewer could not fetch the pricing page.

## Standards + Spec

**Spec: clean.** The hook script and `.claude/settings.json` are
byte-identical to the proposal's code blocks; every 6.2–6.5, 8.1 and 8.2
edit is present and in place; no OpenTelemetry or plan-lead text is in the
diff.

Standards:

- **S1 (hard)** hook docstring uses "carries", a banned word in
  `docs/agents/home/AGENTS.md`.
- **S2 (hard)** `parts.md`, `gate-reviewer.md` and `SKILL.md` use "Seams"
  for a path that steps of two parts touch; `AGENTS.md` § Testing fixes
  "seam" to two meanings.
- **S3 (judgement)** the 9-line Decisions rule is copied into four seat
  files.
- **S4 (judgement)** the stage budget numbers are written in both
  `gate-planner.md` and `SKILL.md`.
- **S5 (judgement)** "Claude Code deletes transcripts after
  cleanupPeriodDays (default 30)" named no source.
- **S6 (judgement)** `PRICES` and the report rows are positional tuples.
- **S7 (cosmetic)** an over-long line in `gate-reviewer.md` Inputs.

## Round 2

The fix commit `9959462b` fixes A1, S1 and S5. Two new low findings:

- **R1 (low)** the S7 rewrap left a longer line in `gate-reviewer.md`.
- **R2 (low)** the S5 fix left a 124-character line in `SKILL.md` § Run log.

## Round 3

**Round 3: clean.** `4b5c786c` changes line breaks only; the two skill
copies are identical; no rewrapped line is over 80 characters.

## Summary

The branch does what the approved proposal asks. One medium gap (A1) and
four standards items were fixed on the branch; the rest are recorded as
`wontfix` below with reasons. No tickets were filed (caller's instruction).
`pnpm verify` passed on `46183665` (rc=0).

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                         |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `9959462b` — § Re-split now assigns each planned part's `parts/<id>/plan.md` and the `## Seams` section when a part comes back                        |
| A2  | Adversarial | wontfix     | once per stage is the approved design (proposal § 5 item 5); a plan still over budget goes on to the reviewer, who can raise it                       |
| A3  | Adversarial | wontfix     | extra text after the section is still bounded (4000-character cap) and the decisions themselves are kept, which is all an index line needs            |
| A4  | Adversarial | wontfix     | the estimate is the planner's to make; Gate A measures `plan.md` against the budget afterwards and sends an over-budget plan back once                |
| D1  | Domain      | wontfix     | the proposal's 8.4 review confirmed every price against pricing.md on 2026-10-01; not re-fetched here (unverified this session)                       |
| S1  | Standards   | fixed       | `9959462b` — "carries" replaced with "has"                                                                                                            |
| S2  | Standards   | wontfix     | `AGENTS.md` § Testing scopes its two meanings to the testing docs; `parts.md` defines its Seams section where it is used; owner-approved wording kept |
| S3  | Standards   | wontfix     | seats do not read `SKILL.md`, so each seat file needs its own copy (proposal § 8.2)                                                                   |
| S4  | Standards   | wontfix     | the planner and the session each need the numbers without reading the other's file; starting values marked hypothesis in both places                  |
| S5  | Standards   | fixed       | `9959462b` — cites https://code.claude.com/docs/en/settings-reference.md in the docstring and `SKILL.md` § Run log                                    |
| S6  | Standards   | wontfix     | small stdlib-only script; the comment states the tuple order; owner-approved code kept byte-identical                                                 |
| S7  | Standards   | fixed       | `4b5c786c` — rewrapped (the `9959462b` attempt made it longer; see R1)                                                                                |
| R1  | Round 2     | fixed       | `4b5c786c` — rewrapped to under 80 characters                                                                                                         |
| R2  | Round 2     | fixed       | `4b5c786c` — rewrapped to under 80 characters                                                                                                         |
