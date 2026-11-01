Status: blocked
Type: process
Origin: .scratch/agent-reports/2026-10-31-general-task-memory-block-and-glm-memory.md (Q1; gitignored; main checkout only)
Blocks: none
Blocked by: owner approval of a harness setting change (agents cannot edit `~/.claude_router/settings.json`)

# Memory saves are refused on the Claude + GLM workers card

On that card every Write or Edit of a tbc-gear-prio memory file is
refused ("Permission to edit ... has been denied"). The Origin report
counts 12 refusals from 2026-10-27 to 2026-11-01.

## Cause

`~/.claude_router/settings.json:62` is the deny rule
`"Edit(~/.claude/**)"`. Since 2026-10-26,
`~/.claude_router/projects/-home-daniel-Code-lulz-tbc-gear-prio/memory`
is a symlink to
`/home/daniel/.claude/projects/-home-daniel-Code-lulz-tbc-gear-prio/memory`
(`readlink -f`), so the resolved path matches the rule.

The rule's broad form has no recorded reason. The card's edit denies
exist so a GLM worker cannot change global rules or hooks
(`.scratch/plans/agent-setup-2026-10/PLAN.md:152`).

## Options (none tested)

1. Narrow the rule to named files. Cost: GLM workers could write other
   `~/.claude` content, and memory itself.
2. Move memory to a folder neither card blocks, using
   `autoMemoryDirectory`.
3. Do nothing and save memory from the plain Claude card.

Bash writes to the memory folder stay blocked by the sandbox under any
option; only the Write and Edit tools matter for saving memory (Origin
report, Q1).

Needs the owner's approval: it is a harness setting.

## Done when

A memory save from this card succeeds, and GLM workers still cannot edit
settings, hooks, skills, agent files or rule files.
