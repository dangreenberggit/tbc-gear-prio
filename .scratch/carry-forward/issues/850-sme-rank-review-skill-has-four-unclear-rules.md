Status: open
Type: task
Origin: .scratch/agent-reports/2026-11-06-general-task-452-sme-skill-instruction-review.md (instruction-review of the Q-452-sme-skill proposal, findings U2-U5; gitignored, in session F's worktree `/home/daniel/.t3/worktrees/tbc-gear-prio/feat-452-reword-and-close`)
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 802

# The sme-rank-review skill has four unclear rules

## What happens today

Two cold readers of `.claude/skills/sme-rank-review/SKILL.md` (mirror:
`.agents/skills/sme-rank-review/SKILL.md`) found four rules they had to
guess at. Line numbers are at `a094a28b`.

- **U2:** lines 77-79 name data fields
  (`scalingOptions.0.weaponDamageMin`/`Max`), and lines 91-92 forbid
  "relying on **our** terms", including "weapon-damage-in-EP". Both readers
  read this as a clash and stopped quoting fields.
- **U3:** line 77-78, "For a weapon, weapon damage is the dominant term", is
  not true for caster weapons, which the skill now judges (epic 452).
- **U4:** the handoff template (lines 46-57) names one "character" and says
  nothing about a review that covers several specs, such as
  `.scratch/handoffs/sme-rank-judgment-452-p4-casters.md`.
- **U5:** line 15 says "Do not coach the player"; line 90 forbids coaching
  only "as the main message".

## What to do

Rewrite the four rules so one reading is possible, in both copies. This is
an agent-instruction edit: the owner approves the exact text first (global
rule "Changing agent instructions"). Do it after Q-452-sme-skill (ticket
802) has landed, so the line numbers are current.

## Done when

The owner has approved the text, both copies carry it,
`scripts/check_skill_mirrors.py` passes, and one cold reader of the new
text reports none of U2-U5.
