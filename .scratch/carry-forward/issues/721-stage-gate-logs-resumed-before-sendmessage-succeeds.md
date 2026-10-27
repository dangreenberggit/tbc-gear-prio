Status: open
Type: process
Origin: wording review `.scratch/agent-reports/2026-10-27-general-task-stage-gate-fault-wording-review.md` § "Faults in unchanged text that no draft touches" (gitignored, owner's checkout), via the v2 drafts `.scratch/agent-reports/2026-10-27-general-task-stage-gate-fault-drafts-v2.md` § "Faults in unchanged text"
Blocks: none
Blocked by: none
Related: 712

# The stage-gate session logs `resumed` before it knows the message reached the planner

Line numbers are on branch `feat/stage-gate-open-faults` after commit
`6eb1037d`. `.claude/skills/stage-gate/SKILL.md` and
`.agents/skills/stage-gate/SKILL.md` are identical
(`python3 scripts/check_skill_mirrors.py` rc 0), so each line number
holds for both copies.

`SKILL.md:229-235` (step 2, the rule for a `gate-planner` whose final
message is none of the listed kinds): "The session logs `resumed`. When
the `SendMessage` tool result lacks `"success":true`, the session
respawns the `gate-planner` in the same mode." Step 1 defines a
`resumed` line as a `SendMessage` whose tool result has
`"success":true` (`SKILL.md:172-173`). So a failed `SendMessage` leaves
a `resumed` line in `decision-log.md`. The session then treats a planner
as working when it is not (conduct point **Route detail outward; keep
the judgment.**, `SKILL.md:89-91`), and a fresh session reads the log
wrongly (§ Recovery, `SKILL.md:512-514`). Whether this has happened in a
run is hypothesis, untested.

Fix: log `resumed` only when the tool result has `"success":true`, as
step 1's rule for an agent that is waiting on its own background work
already does (`SKILL.md:195-196`, from fault 4 option B on this branch).

Every fix here edits the stage-gate skill. AGENTS.md says to propose
skill edits in chat and wait for the owner's approval.
