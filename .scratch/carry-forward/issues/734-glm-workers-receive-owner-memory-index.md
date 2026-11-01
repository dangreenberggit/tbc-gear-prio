Status: blocked
Type: process
Origin: .scratch/agent-reports/2026-10-31-general-task-memory-block-and-glm-memory.md (Q2; gitignored; main checkout only)
Blocks: none
Blocked by: owner approval of the exact agent-definition text

# GLM workers receive the owner's memory index

Every GLM worker (`glm-flash-task`, `glm-task`, on z-ai models) gets the
owner's auto-memory index `MEMORY.md` in its context, so the index goes
to z-ai on every GLM spawn. Claude Code's docs say subagents do not load
it (`sub-agents.md` "What loads at startup"; `memory.md`).

## Evidence

A test `glm-flash-task` run on 2026-10-31, model `z-ai/glm-5.3-flash`.
Its subagent transcript (session 6d7d556e, agent ad15a193ae131122f)
contains the line "user's auto-memory" (`grep -c` gives 3). Details and
paths: the Origin report, Q2.

## Proposed fix (untested)

Add `omitClaudeMd: true` to the frontmatter of
`~/.claude_router/agents/glm-flash-task.md` and `glm-task.md` (sources in
`docs/agents/home/agents/`).

Cost: GLM workers also lose the `AGENTS.md` rules, so the agent body or
each caller prompt must restate what they need.

This is an agent-instruction change: it needs the owner's approval of the
exact text.

## Done when

A re-run of the same yes/no test produces a transcript with no
"user's auto-memory" line, and GLM workers still get the rules they need.
