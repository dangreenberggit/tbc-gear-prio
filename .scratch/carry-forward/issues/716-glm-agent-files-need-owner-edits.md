Status: closed
Type: task
Origin: pre-merge review feat/usage-limit-fixes, spec axis P3, 2026-10-26
Blocks: none
Blocked by: none

# The GLM agent files outside the repo need two owner edits

## What happens today

The GLM types are defined in `~/.claude_router/agents/glm-flash-task.md`
and `glm-task.md`, outside this repo. Two rulings wait on edits there:

1. The bars (review finding A2 of `feat/glm-worker-policy`): each file
   should carry the `NEEDS_JUDGMENT` bullet that the apply report gives
   (`.scratch/agent-reports/2026-10-26-general-task-apply-usage-limit-fixes.md`
   § For the owner by hand, item 1; gitignored, main checkout only).
2. The owner said "small or even modest coding tasks shuld be fine glm
   flash" (2026-10-26). `glm-flash-task` has `tools: Read, Grep, Glob,
   Bash` and says "Change no file", so model-policy § Workhorse jobs sends
   every edit to `glm-task` until the file gains Edit and Write (same
   report, item 2).

## Done when

The owner has made both edits, and the § Workhorse jobs table moves
exact-text edits and small coding to `glm-flash-task`.

## Closed 2026-10-26

Both edits are in the agent files in `~/.claude_router/agents/`, outside
git. Edit 1: `glm-task.md` and `glm-flash-task.md` each hold the
`NEEDS_JUDGMENT` bullet with the short form of the bars. Edit 2:
`glm-flash-task.md` has Edit and Write in `tools:` and no longer says
"Change no file", and its `description:` now names small or modest
edits. The files as they were before each change are in
`/home/daniel/Code/lulz/tbc-gear-prio/.scratch/glm-agent-files-backup-2026-10-26/`
(gitignored, main checkout only): `glm-task.md` before the bars edit,
`glm-flash-task.md` before the bars and tools edits, and `glm-flash-task.md.before-description`
before the description edit. The § Workhorse jobs table in
`docs/agents/model-policy.md` now sends exact-text edits and small or
modest coding to `glm-flash-task`, under the owner's ruling of
2026-10-26 ("Sonnet generally should not be used but flash should be
used for workhorse tasks").

Verified by: `grep -n "^tools:\|NEEDS_JUDGMENT" ~/.claude_router/agents/glm-task.md ~/.claude_router/agents/glm-flash-task.md`
(both files list Edit and Write and hold the bullet), and the table move
at tbc-gear-prio@e5a80126.
