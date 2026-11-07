Status: closed
Type: process
Origin: .scratch/agent-reports/2026-10-31-general-task-memory-block-and-glm-memory.md (Q1; gitignored; main checkout only)
Blocks: none
Blocked by: none

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

## Comments

### 2026-10-31: closed after the owner moved the memory folder

The owner applied the fix. The memory folder was moved into the GLM
card's own folder, and the plain card now reaches it through a link.
`ls -ld` shows
`/home/daniel/.claude/projects/-home-daniel-Code-lulz-tbc-gear-prio/memory -> /home/daniel/.claude_router/projects/-home-daniel-Code-lulz-tbc-gear-prio/memory`
(a link, dated Oct 31 21:18), and the `.claude_router` path is a real
folder with 62 entries.

After the move, a Write of a new memory file from the main session on
the "Claude + GLM workers" card succeeded
(`feedback-look-up-convention-before-decision.md`).

No permission rule or hook changed. The fix, its tests and two reviews
are in `.scratch/agent-reports/2026-10-31-general-task-ticket-735-fix.md`
(gitignored, main checkout only).

The other part of "Done when" (GLM workers cannot edit settings, hooks,
skills, agent files or rule files) is only partly checked. Settings,
hooks, skills and agent-folder paths stayed refused in the fix's probes.
But review 1, finding F6, found that GLM workers can write
`~/.claude_router/rules/**` and the project's `.claude/agents/`,
`.claude/skills/` and `.claude/settings.json`. That gap existed before
this ticket and is tracked in ticket 806. A real GLM worker check waits
on ticket 804.

Verified by: `ls -ld /home/daniel/.claude/projects/-home-daniel-Code-lulz-tbc-gear-prio/memory`
(a link to the `.claude_router` path), and the fix report
`.scratch/agent-reports/2026-10-31-general-task-ticket-735-fix.md`.

Renumbered from 735 on 2026-11-05: `dev` had already filed a different ticket 735. Report file names under `.scratch/agent-reports/` keep the old number.
