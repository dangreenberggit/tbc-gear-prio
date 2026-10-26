Status: open
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
