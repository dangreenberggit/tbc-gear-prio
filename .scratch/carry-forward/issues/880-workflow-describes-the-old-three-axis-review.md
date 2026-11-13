Status: open
Type: task
Origin: .scratch/agent-reports/2026-11-13-general-task-pointer-check-build.md
Blocks: none
Blocked by: none

# `docs/workflow.md` still describes the old three-axis pre-merge review

**Problem.** `docs/workflow.md` § The loop, step 4, says `pre-merge-review`
runs "three independent axes" (Adversarial, Domain, Standards + Spec),
each with its own brief in `.agents/reviews/`. § Pre-merge review, in
more detail says "Fresh context for each axis" and explains "The domain
axis". The live skill (`~/.claude/skills/pre-merge-review/SKILL.md`
§ 1. Review) gives one fresh reviewer the range, and adds one more
reviewer with a different focus only "for a large or risky diff". An
agent that reads `docs/workflow.md` first runs three reviews the skill
no longer asks for, or looks for axes the skill does not name.

Found by the instruction review of `feat/instruction-pointer-check`
(cold reader on step 4, 2026-11-13). The same cold reader could not tell
what review the tooling files of a mixed branch get; that was never
written down.

**Fix.** Rewrite step 4 and § Pre-merge review, in more detail to point
at the live skill and say what this repo adds (the domain focus and its
two briefs in `.agents/reviews/`, if they stay). Decide whether
`.agents/reviews/adversarial.md` and `domain.md` stay. Run the
`writing-for-agents` pass on the new text.
