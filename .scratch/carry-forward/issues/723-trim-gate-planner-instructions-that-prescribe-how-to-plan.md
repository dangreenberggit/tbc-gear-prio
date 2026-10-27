Status: open
Type: process
Origin: owner request in session, 2026-10-27, after the research report `.scratch/agent-reports/2026-10-27-general-task-planning-guidance-sources.md` (gitignored, owner's checkout; its key quotes are copied below)
Blocks: none
Blocked by: none
Related: 712

# Trim gate-planner.md instructions that prescribe how to plan

Owner, 2026-10-27: "more guidance could just be more stuff for an agent
to misinterpret". On this ticket: "your rec sounds good. I'll handle
that in a session next".

## Why

Anthropic's prompting docs advise general instructions over prescriptive
steps, and say that skills written for earlier models are often too
prescriptive for Claude Fable 5 and can make its output worse. The
`gate-planner` seat runs on Fable. Whether `.claude/agents/gate-planner.md`
has instructions of that kind is the question this ticket answers:
hypothesis, untested.

Quotes, read on 2026-10-27 (re-run: fetch the URL and search for the
quoted sentence):

- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5
  - "Refactor existing prompts and skills. Skills developed for prior
    models are often too prescriptive for Claude Fable 5 and can degrade
    output quality. Review and consider removing older instructions if
    default performance is better."
  - "Instruction-following is improved enough that you can steer most
    behaviors with a brief instruction rather than enumerating each
    behavior by name."
  - "Claude Fable 5 tends to perform better when the prompt states the
    intent behind a request".
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1
  - "Claude Fable 5.1 can run very long tasks without much guidance on
    methodology, especially when the goal is clear."
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
  (section "Leverage thinking and interleaved thinking capabilities")
  - "Prefer general instructions over prescriptive steps. A prompt such
    as "think thoroughly" often produces better reasoning than a
    hand-written step-by-step plan. Claude's reasoning frequently exceeds
    what a human would prescribe." This sentence is about the model's
    reasoning, not about the structure of a plan document.
- https://code.claude.com/docs/en/best-practices
  - "Only write down what Claude can't find by reading the repo, or what
    it would otherwise spend time rediscovering every session."
- https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
  - "We're already seeing that smarter models require less prescriptive
    engineering, allowing agents to operate with more autonomy."
  - The same post warns about the opposite mistake: "vague, high-level
    guidance that fails to give the LLM concrete signals for desired
    outputs or falsely assumes shared context."
- https://www.anthropic.com/engineering/multi-agent-research-system
  - "Each subagent needs an objective, an output format, guidance on the
    tools and sources to use, and clear task boundaries."

The report found no source that gives a rule for a planner that writes a
broad plan, details some pieces, and revises later pieces after earlier
ones are built, and no source that measures "told to plan" against "told
to plan, plus a planning method" for Claude.

## Task

List every instruction in `.claude/agents/gate-planner.md` that tells the
planner how to plan, as opposed to:

- a fact the planner cannot find for itself, or
- the output the executor (or the gates that read the plan) needs.

Give each instruction on the list with its file:line. The owner decides
what to cut.
