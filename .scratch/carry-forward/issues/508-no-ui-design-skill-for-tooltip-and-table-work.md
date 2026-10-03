Status: open
Type: task
Origin: owner, 2026-09-25 (stage-gate upgrades-tab-closeout round 2c, checkpoint 2)
Blocks: 494, 501
Blocked by: none
Related: 494, 501

# No UI design skill: tooltip and table work lacks researched conventions

## Problem

Upgrades-tab tooltip and table work has no researched basis. Every set-bonus
hover wording drafted for ticket 494 was invented in prose and text boxes. None
was checked against established conventions for tooltips and data tables, and
the owner rejected all of them. No skill in this repo tells an agent to do that
research, or states the conventions once it is done.

The owner, 2026-09-25: "countless tokens and sessions have been spent on this,
evidence of failed initial starting points and bad or refusal to research info
that would form a basic UI skill and enforce it in development".

The evidence is in `.scratch/handoffs/494-set-hover-redo.md` §3 and §5: four
rejected hover designs, three contradictory disabled-toggle messages, and
coined labels the owner could not read.

## What would close this

1. Research tooltip and data-table conventions from primary sources, such as
   Nielsen Norman Group, Material Design, Apple Human Interface Guidelines and
   the GOV.UK Design System. Record findings with links (`research` skill).
2. A proposed UI skill that turns those findings into rules for this repo's tab
   work, shown to the owner in chat. **A skill change needs owner approval
   before any skill file is edited** (AGENTS.md § Editing skills).
3. The approved skill committed, and the 494 redo started from it.
