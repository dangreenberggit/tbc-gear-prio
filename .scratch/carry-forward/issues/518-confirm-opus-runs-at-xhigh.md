Status: open
Type: task
Origin: docs/reviews/feat-orchestration-model-policy.md
Blocks: none
Blocked by: none

# Confirm that an Opus subagent runs at effort xhigh

## The claim to check

`docs/agents/model-policy.md` § Claude Code labels `xhigh` "model-side
behavior untested on this install", in the lane table and in the
`design-task` row of the agent-type table. `gate-planner` and `design-task`
both set `effort: xhigh` in frontmatter.

What is measured: `claude --help` on `2.1.267 (Claude Code)` lists
`--effort <level> (low, medium, high, xhigh, max)` (run 2026-09-25). What is
not measured: whether an Opus subagent whose frontmatter says `xhigh`
actually runs at `xhigh`. The sub-agents docs say "available levels depend
on the model".

The approved proposal asked for this check before merge: spawn
`design-task` once with `model: "opus"` and a one-line prompt, confirm from
the harness output or the transcript that it ran at `xhigh`, and record how.
Commit 1d86fd48 does not record it (pre-merge review, Spec axis).

## What to do

1. In a session where `design-task` is registered, spawn it once with
   `model: "opus"` and a one-line prompt.
2. Record how you established the effort it ran at (harness output,
   transcript field, or `/status`), with the version and date.
3. If it ran at `xhigh`, remove the "model-side behavior untested" label
   from both rows. If it did not, record what it ran at and ask the owner
   whether to keep `xhigh` in `gate-planner` and `design-task`.

Done when: both model-policy rows state the measured behavior with the
command, version and date, and `pnpm verify` passes.
