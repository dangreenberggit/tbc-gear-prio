Status: open
Type: process
Origin: .scratch/agent-reports/2026-10-31-instruction-review-pte-rules-split.md (F3; gitignored; main checkout only)
Blocks: none
Blocked by: none

# Stage-gate values file copies a global slice-model rule that disagrees with it

`docs/agents/stage-gate-project.md` § Worker lanes, `### Executor`
(`git show dev:docs/agents/stage-gate-project.md | sed -n 73-77p`) says:
"An extremely simple slice (see `simple-task`) goes to `simple-task`
(`model: "sonnet"`). Every other slice goes to `general-task`
(`model: "opus"`)."

`~/.claude/model-policy.md` § Workhorse jobs says that on the
"Claude + GLM workers" card Sonnet "is otherwise not used there", and
that "A `parallel-phase` slice that is small or modest coding may run on
the type this table names for that job" (`glm-flash-task` on that card;
`discrete-task` / `modest-task` elsewhere). So a stage-gate executor
following the values file puts small slices on Sonnet and modest slices
on Opus, and never uses `modest-task`. The line is also a repo copy of a
global rule.

Fix: replace the line with a pointer to `~/.claude/model-policy.md`
§ Workhorse jobs, as the pattern-text-extractor draft does
(`.scratch/pte-rules-split/files/docs/agents/stage-gate-project.md`,
§ Worker lanes). The same review lists two more seat points inherited
from this repo ("Inherited from tbc-gear-prio's seats"): `gate-reviewer.md`
cites "§ Worker lanes, Reviewer", which has no subsection, and
`gate-planner.md` never names the "Open questions" final message that
`~/.claude/skills/stage-gate/SKILL.md` accepts. Fix them in the same pass
or file them separately.
