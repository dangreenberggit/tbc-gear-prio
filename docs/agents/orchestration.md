# Orchestration: the session, its subagents, and the owner

Read this before spawning an agent, fanning out, stage-gating, or writing
a question for the owner. Model and agent type: `model-policy.md`.

## The session delegates

On every harness the interactive session is the orchestrator. It routes
work, judges results, and relays conclusions to the owner. It hands every
task to a subagent, so its own tool use stays low and its context stays
small.

The session makes only these tool calls itself:

- spawning and messaging agents
- loading a skill
- writing `brief.md`, `decision-log.md`, and any stage artifact copied
  verbatim from a seat's final message
- the short gate checks: `git status --porcelain`, `git rev-parse HEAD`,
  `git diff --stat`, and `date -u +%Y-%m-%dT%H:%MZ` for `decision-log.md`
  times
- reading the stage-gate artifacts under `.scratch/stage-gate/<slug>/`
  and `.claude/skills/stage-gate/plan-template.md`
- reading a subagent's report file (AGENTS.md § Subagent reports) for a
  detail the condensed report leaves out

Everything else goes to a subagent: reading code or docs, running `pnpm`
or any other `git` command, editing files, and committing. To run
`pre-merge-review`, spawn one subagent to run the whole skill. Allow it to
write `docs/reviews/` and `.scratch/carry-forward/` and to commit them,
and have it return the review file's path and its summary.

## Who spawns whom

AGENTS.md § Spawning gives the rule. The guard on delegation is the
**job type**, not the depth of the chain: an overseer spawns another
overseer when the delegated piece is itself judgment, and an executor
that delegates oversight of a chunk to another Opus agent is the
intended case. What a block is, when a block is worth a helper, and how
the overseer judges each workhorse result: model-policy § Workhorse
jobs.

Pick each subagent's type from your harness section of `model-policy.md`:

- **Claude Code:** `general-task` for lead-lane and review-lane work
  (model-policy § Four lanes); the workhorse types
  for workhorse jobs (model-policy § Workhorse jobs); `design-task` for a
  plan or an architecture call outside stage-gate. Run `pre-merge-review`
  on a `general-task`. The session sends every
  `modest-task`, `discrete-task` or GLM-type result to a `general-task`
  check before it relays or builds on it; for a trial type the check's
  prompt asks for a `TRIAL-REJECT <type>: <why>` line when it rejects or
  corrects the result (model-policy § Trial types, "Measuring"). An
  overseer is its own checker for the workhorse results it asked for. If
  the harness does not recognize one of these types, restart the session
  rather than falling back to a built-in type; a missing GLM type is the
  exception (model-policy § GLM worker types).
- **Codex:** everything that is not review or design goes to subagents at
  the workhorse fill, mid tier at a lower reasoning effort. The owner
  wants these used freely. Review and design jobs go to subagents at the
  review and design fills.
- **Cursor:** everything that is not review or design goes to subagents
  on the workhorse pin, Composer. Review and design jobs go to subagents
  at the review and design fills.

The session-only rule above binds the interactive session. A subagent
that orchestrates (the stage-gate Executor, or a subagent spawned to run
`parallel-phase` as Delegator) holds its own judgment, merge and fan-in,
and hands workhorse jobs down like any overseer.

Any agent that splits a research question across subagents splits it
until each piece is narrow enough for one agent to answer from its own
reads and its workhorse agents' returns, and puts this sentence in every
piece's prompt: "Your job is one narrow investigation: hold the judgment
yourself and hand workhorse jobs to the workhorse lane; spawn no other
overseer."

**A bounded question is a subagent, not a detour.** When answering
something takes many reads whose content you will not reuse (measuring a
filter, probing what upstream does, confirming a spec claim), send it out
and keep the paragraph, not the thirty tool calls. This is not the
`parallel-phase` fan-out: no worktree, no merge, nothing to sequence, so
its disjointness rule does not apply. Match the agent type to the
judgment, not the token count. The sign that you got this wrong is
retrospective: you are deep in a file you only opened to answer one
question.

A permission denial is evidence about that call, not a capability model.
If a fan-out or merge precondition cannot be established, stop and report
the exact blocked command rather than silently dropping or rewriting the
plan.

## Models and walls

Four lanes, every harness, sorted by kind of work, not model height:
**workhorse** for searches, reads, command runs, measurements and small
or modest coding, on the cheap worker models; **lead** for oversight,
judgment and hard implementation, including `parallel-phase` workers;
**review** for pre-merge review axes and adversarial judgment; **design**
for planning and architecture. Go slower or serial on walls; never invent
a weaker substitute for a review job: if waiting and serialising both
fail, stop and say so rather than downgrading; and never promote a job to
a taller lane it does not belong in. Managers must not background workers
and end the turn without a disk handoff for fan-in (model-policy
§ Manager / multi-step fan-out). Fills per harness, the `effort` argument
(leave it off the spawn unless the owner asks), Composer and Grok on
Cursor: `model-policy.md` § Harness notes.

## Parallel agents

When you will have two writers running at once (independent slices:
different kinds of work, mostly disjoint files), fan out with the
`parallel-phase` skill. The session spawns a subagent to act as Delegator;
on Claude Code that is a `general-task`. A slice that reads or edits the
fork gets a pair (AGENTS.md § The forked tab repo). The skill holds the
rest: disjointness is a claim to verify before spawning, isolation per
slice, merge onto the feature branch, teardown, `pnpm verify` on the
integrated tip, `pre-merge-review`, then ask before `pnpm merge-to-dev`.
Never merge each worker into `dev`. Without isolation, readers share the
writers' index too: a read-only agent sees your uncommitted edits and
cannot tell them from a stray worker's.

## Stage-gate features

When a wrong plan would be expensive, run the `stage-gate` skill: Planner
(Fable, effort low) → adversarial Plan-Reviewer (Opus, effort high) →
fresh-context Executor (Opus, effort high), with judged gates and a
capped loop-back. Inside this flow the planner plans one chunk in detail
and lists the rest on the plan's Backburner, and the session runs at most
two stages in planning or review at once (SKILL.md § Orchestrator
conduct). That pacing belongs to the stage-gate flow only: a plain
request for a plan is planned whole. `pre-merge-review` still runs after.
Seats are agent definitions under `.claude/agents/`; registration of new
agent files: model-policy § Claude Code.

## Interacting with the user

How to hand work back applies to every session, not only orchestration.
Message format: the global "Chat responses" rule (staged in
`docs/agents/home/AGENTS.md`). When overseeing the plan-review-execute
pipeline, the `stage-gate` skill's § Orchestrator conduct adds the
pipeline rules (standing instructions, scoped stops, routing detail
outward, gating on open tickets, pacing).

**Present a decision with the reasoning done, in prose.** When a real
decision is due, do the analysis first (or delegate it), then write it in
the decision format of the global "Chat responses" rule. A picklist of
one-line summaries is the wrong form for a decision that needs thought: a
bad summary corrupts the choice it is asking for. Structured questions are
for genuine forks in intent, not for offloading analysis onto the user.

**An investigation session writes its record before it ends.** When a
session's product is findings rather than code, it writes
`.scratch/agent-reports/<UTC date>-session-<topic>.md` before its last
reply: the owner's rulings word for word, each evidence file's path and
what it holds, what was started and what was not, and the next step. The
record is written when the findings are complete, not when the owner asks:
the owner may not get to them before the session goes stale.
