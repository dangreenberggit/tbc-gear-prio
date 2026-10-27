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

## Comments

- 2026-10-26, round-2 focused check of `feat/usage-limit-fixes` (R2-6,
  `docs/reviews/feat-usage-limit-fixes.md`): on the "Claude + GLM
  workers" card `.claude/agents/simple-task.md:3` now says that type
  takes only a job z-ai must not see, or a retry when a GLM type hits a
  usage wall. These lines still send an extremely simple slice to
  `simple-task` with no such exception, at the branch tip after the
  round-2 fixes: `.claude/skills/stage-gate/SKILL.md:49-50`
  (and its `.agents` mirror), `.claude/agents/gate-executor.md:119-120`,
  `.claude/skills/parallel-phase/adapters/claude-code.md:9` (and its
  `.agents` mirror), `docs/agents/model-policy.md:545-546`.
  The same round made model-policy § Workhorse jobs say a small or
  modest slice may run on a workhorse type and a hard slice on
  `general-task` (R2-1), so the Done-when rule now has one statement to
  align these lines with. Re-find with
  `git grep -n "extremely simple slice"`.
