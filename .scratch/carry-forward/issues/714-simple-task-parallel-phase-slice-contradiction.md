Status: open
Type: task
Origin: pre-merge review feat/usage-limit-fixes, A8 (also spec axis), 2026-10-26
Blocks: none
Blocked by: none

# The docs disagree on whether a `parallel-phase` slice may run on `simple-task`

## What happens today

`docs/agents/model-policy.md` § Trial types, "Always `general-task`" list,
says any `parallel-phase` worker is a `general-task`. Three places send an
extremely simple slice to `simple-task`: model-policy § Parallelism vs
serial ("extremely simple slice"), `.claude/skills/parallel-phase/adapters/claude-code.md`
(Lead line) and `.claude/agents/gate-executor.md` ("Pick each worker's
agent type from its slice"). The same adapter's Workhorse line says a
slice "never goes to" the workhorse types, and AGENTS.md § Spawning now
lists `simple-task` as a workhorse type.

Check: `git grep -n "extremely simple slice\|any .parallel-phase. worker\|never goes to them"`.

The first contradiction existed on `dev` before this branch; the branch
added the second.

## Done when

One rule, stated in model-policy, and the adapter and gate-executor say
the same. Agent-file edits need the owner's approval first.
