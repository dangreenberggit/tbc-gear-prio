Status: wontfix
Type: process
Origin: .scratch/agent-reports/2026-10-31-general-task-memory-block-and-glm-memory.md (Q2; gitignored; main checkout only)
Blocks: none
Blocked by: none

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

## Closed 2026-11-01: wontfix

The owner rejected the proposed fix on 2026-11-01: "Omitclaudemd sounds
dumb as if I would want to prevent other models from seeing agent MD
files, which afaik are not model specific." Earlier, on 2026-10-31: "I'm
not obsessed with blocking glm models from seeing mere memory notes".

The usual practice is that instruction files go to whatever model runs
(agents.md calls AGENTS.md "a README for agents"). The controls are the
choice of provider and keeping secrets out of those files and out of
memory; global `AGENTS.md` § Secrets and GLM workers already requires
the second. No documented setting drops only auto memory for one
subagent: `omitClaudeMd` drops every CLAUDE.md level
(code.claude.com/docs/en/sub-agents.md "What loads at startup"), and
`autoMemoryEnabled` turns memory off for the whole session. Claude Code
2.1.309 still sends `MEMORY.md` to subagents against those docs. Research:
.scratch/agent-reports/2026-11-01-general-task-glm-context-convention.md
(gitignored; main checkout only).

Renumbered from 734 on 2026-11-05: `dev` had already filed a different ticket 734. Report file names under `.scratch/agent-reports/` keep the old number.
