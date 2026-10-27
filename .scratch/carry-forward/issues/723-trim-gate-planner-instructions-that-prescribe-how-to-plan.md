Status: closed
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

### 2026-10-27: list made, owner approved the edits; closed

The list came from
`.scratch/agent-reports/2026-10-27-general-task-723-how-to-plan-list.md`
(gitignored, owner's checkout), read against `gate-planner.md` at
`tbc-gear-prio@80c08777`. It found 10 instructions that tell the planner
how to plan. Line numbers below are at `80c08777`.

1. Make the split decision before any planning (`:25-26`): kept.
2. **Whole job first** (`:26-30`): kept; it is the owner's ruling from
   ticket 717.
3. Get a heading map before reading a document over ~30 kB (`:36-38`):
   kept.
4. Research by subagent, the method parts (`:49-52`, `:57-60`): kept.
5. "A plan is a bundle of causal claims with steps attached." (`:72-73`):
   kept.
6. "Verify to the depth of the claim" (`:75-77`): shortened, now Text A
   below.
7. "by a subagent if the run is long" (`:78`): cut; it repeats `:49-52`.
8. "anything you were tempted to leave implicit" (`:83-84`): kept.
9. The paragraph on a proposed way of doing a step (`:112-121`):
   shortened, now Text B below.
10. "with targeted `Edit` calls in one message" (`:138-139`): kept.

Totals: 7 kept, 1 cut, 2 shortened.

On 2026-10-27 the owner approved these two texts, applied word for word
in `.claude/agents/gate-planner.md`:

- Text A, in the **Claims are the product.** bullet: "The reviewer
  counts a claim marked `Load-bearing: yes` and left
  `hypothesis, untested` as a finding; a claim marked
  `Load-bearing: no` may stay `hypothesis, untested`. Every number a
  step depends on is measured before the plan ships and cited in
  `Verified by` with its command."
- Text B, replacing the paragraph that starts "You own the details of
  the plan." in § Revisions: "You own the details of the plan. A way of
  doing a step, or a command, that your prompt, `plan-review.md` or a
  helper's report proposes is a claim like any other (§ Rules). Check
  it, or have a helper check it, before the plan uses it; when no check
  can run before the plan ships, write `hypothesis, untested` and the
  reason in its `Verified by` cell. When its check fails, plan another
  way and name the failed command and its output in the new way's
  `Verified by` cell, next to that way's own check."

The list's first draft of Text B dropped the rule to check a proposed
way before the plan uses it. A reviewer restored it: it is ticket 712
fix 2 (`.scratch/carry-forward/issues/712-*.md:210-215`). Ticket 725
will rename the `Load-bearing` term that Text A uses.

Verified by: on branch `feat/stage-gate-follow-ups`,
`git grep -n -F 'Check it, or have a helper check it' .claude/agents/gate-planner.md`
prints `.claude/agents/gate-planner.md:114:claim like any other (§ Rules). Check it, or have a helper check it,`
(rc 0), and
`grep -c -F 'by a subagent if the run is long' .claude/agents/gate-planner.md`
prints `0` (rc 1).
