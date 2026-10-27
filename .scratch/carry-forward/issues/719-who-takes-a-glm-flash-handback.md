Status: open
Type: grilling
Origin: pre-merge review feat/usage-limit-fixes, round 2, R2-3 (Q-glm-coding-split), 2026-10-26
Blocks: none
Blocked by: none

# Who takes a job GLM Flash hands back: `glm-task` or Opus

## What happens today

On the "Claude + GLM workers" card all small or modest coding goes to
`glm-flash-task` (`docs/agents/model-policy.md` § Workhorse jobs). A job
Flash hands back as `NEEDS_JUDGMENT` goes to a bigger agent. The rule
does not say which one: `glm-task` (GLM) or Opus `general-task`. Until
the owner settles it, the caller decides per job. The rule is the
paragraph after the table in model-policy § Workhorse jobs; the
`glm-task` row in § GLM worker types and the `NEEDS_JUDGMENT` sentences
in § Claude Code and § GLM worker types ("Bars") point to it.

The owner's question, 2026-10-26, as the session's brief for the
round-2 fixes quotes it: "how does one decide whether the a parent agent
is normal glm or opus? lets leave this open for now".

A fact for whoever drafts the answer: model-policy § GLM worker types
says the GLM types are "Not for review, design, planning, debugging or
judgment", and `NEEDS_JUDGMENT` means the worker found judgment in the
job. Re-find it with `grep -n "Not for" docs/agents/model-policy.md`.

A review of this question is scheduled for 2026-11-02.

## Done when

The owner answers. model-policy § Workhorse jobs names the agent that
takes a Flash handback, or a test the caller applies to choose; the
`glm-task` row, AGENTS.md § Spawning and the parallel-phase Claude Code
adapter say the same. Agent-file and skill edits need the owner's
approval first.
