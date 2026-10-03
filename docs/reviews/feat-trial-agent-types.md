# Pre-merge review — feat/trial-agent-types

Reviewed range: `588854b3aa575c5cade2f25438f562f204d00227..0c3cbfd6cf12960125ed2a4790c2a9140ab52891`

Dispatch: `codex` is not on `PATH` (`which codex` exit 1), so each axis ran
as a fresh `general-task` subagent on Opus at effort `high`, all four in one
parallel batch, each told to write nothing and to spawn no subagents. The
spec is proposal v2 (`model-options-proposal-v2.md`, session scratchpad)
with the owner's decisions: include commits A and B, drop commit C (the
Fable planning week), option B for Q-model-options-sonnet-commands, file
no tickets.

## Adversarial

No blockers. No route sends a regen, `data/`, a pin, fork code or a review
to a trial type. Five should-fix findings and two nits, all about the
agent files that stop a misrouted job: the `discrete-task` model check on
an old harness (A1), an unbounded `design-task` respawn loop (A2),
`modest-task` not forbidding checkout-moving git commands (A3), short
never-lists missing items such as `pnpm format` (A4), the Node check in a
different shell from `pnpm` (A5), `git diff --stat` missing new files
(A6), and overlapping routing in AGENTS.md (A7).

## Domain

**Domain: clean.** The diff states no TBC, WCL or wowsims fact and moves
no domain work to a weaker model. Observation D1: domain code under
`packages/` is not on the never-list.

## Standards + Spec

**Standards:** one hard violation (S1, commit subject 51 characters) and
judgement calls on AGENTS.md wording (S2, S3), the never-list copies (S4),
the long `discrete-task` description (S5) and unwrapped lines (S6).

**Spec:** commits A and B implemented with option B; commit C and tickets
absent as decided. Findings: `discrete-task` loosened "file" to "tracked
file" for all commands (SP1); "`pnpm verify` writes no tracked file"
stated as fact (SP2); command output asked for only on failure (SP3); the
section heading lost its date (SP4).

## Summary

The trial types never take costly work, but their agent files needed
tighter stop rules. Fixes landed in `f7d112d9`; rounds 2 to 4 below review
them.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                      |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| A1  | Adversarial | wontfix     | This session's transcript records harness 2.1.284 and 2.1.286, which resolve `sonnet` to 5.5; the check fails safe |
| A2  | Adversarial | fixed       | model-policy: a second `WRONG_MODEL` from the same job goes to the owner (ticket 252)                              |
| A3  | Adversarial | fixed       | modest-task forbids ref, index, stash and remote changes and `checkout`/`restore`/`reset`/`stash`                  |
| A4  | Adversarial | fixed       | modest-task stop list adds generator re-runs, `pnpm format`, sed/script writes; both files point at model-policy   |
| A5  | Adversarial | fixed       | `node --version` runs in the same shell command as the check                                                       |
| A6  | Adversarial | fixed       | Size limit counts new files                                                                                        |
| A7  | Adversarial | fixed       | AGENTS.md: `discrete-task` only for a one-target question that takes more than one lookup                          |
| D1  | Domain      | wontfix     | A modest job leaves no choice of approach open, so domain judgment stays with the caller                           |
| S1  | Standards   | wontfix     | Subject one character over; rewriting it would change reviewed SHAs                                                |
| S2  | Standards   | fixed       | AGENTS.md lane sentence names both trial types                                                                     |
| S3  | Standards   | fixed       | Same fix as A7                                                                                                     |
| S4  | Standards   | fixed       | Sync note in both agent files; model-policy gives the reason for the copies                                        |
| S5  | Standards   | wontfix     | The never-list in the description is a deliberate guardrail (proposal v2 review finding 1)                         |
| S6  | Standards   | fixed       | Lines rewrapped                                                                                                    |
| SP1 | Spec        | fixed       | "file" restored; only untracked cache and build files from a named check are exempt                                |
| SP2 | Spec        | fixed       | model-policy cites the `git status --porcelain --untracked-files=no` check and its date                            |
| SP3 | Spec        | fixed       | Report result lines on a pass and failing lines on a fail                                                          |
| SP4 | Spec        | wontfix     | The trial starts at merge, not on 2026-09-29; the ask date stays in the paragraph                                  |

# Round 2 — fixes for round 1

Reviewed range: `0c3cbfd6cf12960125ed2a4790c2a9140ab52891..f7d112d9741cddd85366c6fd8e0882166b20617a`

Same dispatch as round 1: four fresh `general-task` axes on Opus at effort
`high`. Every round-1 fix was confirmed; no reviewer disputed a wontfix.

## Adversarial (round 2)

`modest-task` told the worker to run `pnpm verify` but to stop on any
command writing outside the allowed paths (R2-A1); "after `node --version`
prints v22 in the same shell command" cannot be obeyed literally (R2-A2);
nits on "both" against "all three" (R2-A3), agent lists naming items the
policy list lacks (R2-A4), and thin evidence for the `pnpm verify` claim
(R2-A5).

## Domain (round 2)

**Domain: clean.**

## Standards + Spec (round 2)

**Standards:** no hard violation. Judgement calls overlap R2-A1 and R2-A4,
plus vague AGENTS.md wording and two short leftover lines (R2-S3).
**Spec:** `discrete-task` no longer reported the Node version (R2-SP1).

## Disposition (round 2)

| ID     | Axis        | Disposition | Ticket / note                                                                   |
| ------ | ----------- | ----------- | ------------------------------------------------------------------------------- |
| R2-A1  | Adversarial | fixed       | `e1d8baf0`: modest-task allows untracked cache and build files                  |
| R2-A2  | Adversarial | fixed       | `e1d8baf0`: discard the result and return `NEEDS_JUDGMENT` when Node is not v22 |
| R2-A3  | Adversarial | fixed       | `e1d8baf0`: each agent file names the other copy                                |
| R2-A4  | Adversarial | fixed       | `e1d8baf0`: sed/script writes and `pnpm format` added to model-policy's list    |
| R2-A5  | Adversarial | fixed       | `e1d8baf0`: claim also cites the `verify:steps` contents                        |
| R2-S3  | Standards   | fixed       | `e1d8baf0`: AGENTS.md reworded, lines rewrapped                                 |
| R2-SP1 | Spec        | fixed       | `e1d8baf0`: "report what it prints" restored                                    |

# Round 3 — fixes for round 2

Reviewed range: `f7d112d9741cddd85366c6fd8e0882166b20617a..e1d8baf094432de9b087c7481c8bbfc5371ce18f`

Same dispatch. Every round-2 fix was confirmed. **Domain: clean.**
Adversarial and Spec both found that the new list item "any command that
rewrites files outside the allowed paths" sends `pnpm verify` to
`general-task` (R3-A1). Standards found two unclear backward references
(R3-S1), a long partly passive list sentence (R3-S2), and the
"check or a test run" claim resting on step names (R3-S3); the round-3
adversarial reviewer read the steps that could write and found none
writes a tracked file in verify mode.

## Disposition (round 3)

| ID    | Axis        | Disposition | Ticket / note                                                                     |
| ----- | ----------- | ----------- | --------------------------------------------------------------------------------- |
| R3-A1 | Adversarial | fixed       | `652cd667`: "tracked files" in model-policy and modest-task                       |
| R3-S1 | Standards   | fixed       | `652cd667`: "These commands", "discard the command's result"                      |
| R3-S2 | Standards   | wontfix     | Restructuring the list into bullets is wider than this fix; meaning is unchanged  |
| R3-S3 | Standards   | wontfix     | Round-3 adversarial read the writing-capable steps; the `git status` run backs it |

# Round 4 — fixes for round 3

Reviewed range: `e1d8baf094432de9b087c7481c8bbfc5371ce18f..652cd6673b95a239b6516cd34520f4915f5e2bb8`

The diff is six lines, so one fresh `general-task` subagent on Opus at
effort `high` covered all four axes. Both fixes work. **Adversarial,
Domain and Spec: clean.** Standards: the commit subject is 53 characters
(R4-S1).

## Disposition (round 4)

| ID    | Axis      | Disposition | Ticket / note                                                          |
| ----- | --------- | ----------- | ---------------------------------------------------------------------- |
| R4-S1 | Standards | wontfix     | Subject three characters over; rewriting it would change reviewed SHAs |
