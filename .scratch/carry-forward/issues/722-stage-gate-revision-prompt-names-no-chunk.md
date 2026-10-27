Status: open
Type: process
Origin: wording review `.scratch/agent-reports/2026-10-27-general-task-stage-gate-fault-wording-review.md` § "Faults in unchanged text that no draft touches" (gitignored, owner's checkout), via the v2 drafts `.scratch/agent-reports/2026-10-27-general-task-stage-gate-fault-drafts-v2.md` § "Faults in unchanged text"
Blocks: none
Blocked by: none
Related: 712

# A stage-gate revision prompt does not name the chunk it revises

Line numbers are on branch `feat/stage-gate-open-faults` after commit
`6eb1037d`. `.claude/skills/stage-gate/SKILL.md` and
`.agents/skills/stage-gate/SKILL.md` are identical
(`python3 scripts/check_skill_mirrors.py` rc 0), so each line number
holds for both copies.

`SKILL.md:319-320` (**Loop back**: "respawn `gate-planner` with brief +
plan + review for a revision") and `SKILL.md:330` (the
`material`-findings bullet: "spawns one `gate-planner` revision with
brief + plan + review") list what a revision prompt holds, and the chunk
id is not in either list. After `K1` has run, `plan.md` holds the steps
of several chunks, so a revision planner must work out which chunk it
revises from the review. Rules that depend on that chunk ("keep the
steps of every chunk", `.claude/agents/gate-planner.md:32-33`) then
rest on a guess (hypothesis, untested that
a planner guesses wrong).

Fix: add the chunk id to both lists.

Every fix here edits the stage-gate skill. AGENTS.md says to propose
skill edits in chat and wait for the owner's approval.
