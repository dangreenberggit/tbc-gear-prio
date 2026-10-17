# Pre-merge review — feat/global-subagent-reports

Reviewed range: `6a2b1221df470f4ab6446b0f5a21f9c8dec3af35..9ff92726bdef6896fd02565c881f669dc1b9462c`

Dispatch note: small-change lane, one fresh `general-task` reviewer (Opus,
effort high); `codex` is not on `PATH`. `git diff --shortstat dev...HEAD`:
"2 files changed, 3 insertions(+), 5 deletions(-)". `git diff --name-only
dev...HEAD`: `AGENTS.md`, `docs/agents/home/AGENTS.md`. Domain brief not
given: the diff is agent-facing rules text with no game-domain content.

## Adversarial

**A1.** `docs/agents/home/AGENTS.md:40` says important claims are "defined in
the next paragraph". The new **Subagent reports** paragraph now sits between
it and the definition ("Sources on important claims", line 44), so the
reference points at the wrong paragraph. Found by `grep -n "next paragraph"
docs/agents/home/AGENTS.md`. A3's insertion point had the same defect.

**A2.** `AGENTS.md:177`, last sentence: "is their caller under the global
rule" replaced "under this section". Read literally, `gate-executor` as a
caller would follow only the global rule and skip this repo's default path
`.scratch/agent-reports/`. The change was not needed.

Not checked by the reviewer: whether Claude Code's Write tool refuses those
file names (moved text, not tested here), and whether subagents read the
staged file through the "(staged in …)" pointer before the owner installs
the global file (hypothesis, untested).

## Standards + Spec

**Standards: clean.** No banned words; the Write-tool rule is stated as a
positive action with its reason.

**P1.** `AGENTS.md:177`, sentence 3 ("label each claim you did not check
`hypothesis, untested`") is not in A3 and widens the old rule, which applied
the label to an important claim with no source. It also repeats
`.claude/agents/general-task.md`.

The reviewer mapped every sentence of the old section to its new place: no
rule lost, no sentence in both files, the pointers in `.claude/agents/*.md`
and `parallel-phase/SKILL.md` still resolve.

## Summary

All three findings ask for edits to agent files, so they wait for one owner
approval before any fix (pre-merge-review step 3, "Agent files"). No
Disposition table yet; round 2 runs after the approved fixes. Tickets filed: 0. Tickets closed: 0.

Proposed fixes, exact text:

- A1, `docs/agents/home/AGENTS.md:40`: replace `(defined in the next
paragraph)` with `(defined in "Sources on important claims" below)`.
- A2, `AGENTS.md:177`: replace `is their caller under the global rule.` with
  `is their caller under this section.`
- P1, `AGENTS.md:177`: replace `In the condensed report, label each claim you
did not check `hypothesis, untested`.` with `In the condensed report, mark
an important claim that has no source `hypothesis, untested` in place of
"unverified".`
