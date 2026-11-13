Status: open
Type: task
Origin: .scratch/agent-reports/2026-11-13-general-task-pointer-check-build.md
Blocks: none
Blocked by: none

# The `gate-*` agent files say "executor" where the values file says "builder"

**Problem.** `docs/agents/stage-gate-project.md` names the live
stage-gate roles since `c25b13fc`: planner, plan checker, builder, build
checker. The repo's agent files under `.claude/agents/` still use the old
seat names:

- `gate-sme.md:3` ("Spawn only via the stage-gate skill (from the
  executor)"), `:35`, `:39` ("the executor's ledger ... Gate C").
- `gate-visual.md:45-46, 53`, same wording.
- `gate-executor.md:130`: "do what that section says for the Executor";
  § Project seats now has a **Builder:** list, not **Executor:**.
- `gate-planner.md`, `gate-reviewer.md`: "the executor" throughout.

`gate-sme` and `gate-visual` are still spawned (by the builder; the
2026-11-13 trial builders both spawned `gate-sme` once on opus with the
new and the old values file). `gate-planner`, `gate-reviewer` and
`gate-executor` are no longer spawned by the live skill
(`~/.claude/skills/stage-gate/SKILL.md`).

**Fix.** In `gate-sme.md` and `gate-visual.md`, say "builder" and drop
"Gate C" / "ledger" (the builder writes a report). Decide whether
`gate-planner`, `gate-reviewer` and `gate-executor` are deleted or kept.
Agent definition changes need the owner's OK of the text.
