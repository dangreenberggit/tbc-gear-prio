# Orchestration: the session, its subagents, and the owner

Read this before spawning an agent, fanning out, stage-gating, writing
a question for the owner, or ending an investigation. Model and agent type: `model-policy.md`.

## The session delegates

In orchestrator mode (global `AGENTS.md` § Orchestrator mode, staged in
`docs/agents/home/AGENTS.md`), the session in this repo also makes these
tool calls itself:

- writing `brief.md`, `decision-log.md`, and any stage artifact copied
  verbatim from a seat's final message, and the one `mv` of `plan.md`
  that `.claude/skills/stage-gate/SKILL.md` step 5 makes before a new
  plan
- the short gate checks: `git status --porcelain`, `git rev-parse HEAD`,
  `git diff --stat`, and `date -u +%Y-%m-%dT%H:%MZ` for `decision-log.md`
  times and for the age of a waiting agent's `returned` line
- a background `sleep 1800` timer for an agent that is waiting on its own
  background work (`.claude/skills/stage-gate/SKILL.md` step 1 **Open the
  stage**, the `spawn` lines)
- reading the stage-gate artifacts under `.scratch/stage-gate/<slug>/`,
  `.claude/skills/stage-gate/plan-template.md` and
  `docs/agents/stage-gate-project.md`

Everything else goes to a subagent: reading code or docs, running `pnpm`
or any other `git` command, editing files, and committing. To run
`pre-merge-review`, spawn one subagent to run the whole skill. Allow it to
write `docs/reviews/` and `.scratch/carry-forward/` and to commit them,
and have it return the review file's path and its summary.

## Who spawns whom

The general rules are in `~/.claude/model-policy.md` § Who spawns whom.
Run `pre-merge-review` on a `general-task`.

The session-only rule above binds the interactive session. A subagent
that orchestrates (the stage-gate Executor, or a subagent spawned to run
`parallel-phase` as Delegator) holds its own judgment, merge and fan-in,
and hands workhorse jobs down like any overseer.

## Models and walls

Four lanes, every harness, sorted by kind of work, not model height:
**workhorse** for searches, reads, command runs, measurements and small
or modest coding, on the cheap worker models; **lead** for oversight,
judgment and hard implementation, including hard `parallel-phase` slices;
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
capped loop-back. Inside this flow the planner works out the whole job,
writes steps for every chunk it can plan now, and lists in one line each
chunk that needs an earlier chunk's results; the session asks for a new
plan when it reaches a one-line chunk, and runs at most
two stages in planning or review at once (SKILL.md § Orchestrator
conduct). That pacing belongs to the stage-gate flow only: a plain
request for a plan gets steps for every part. `pre-merge-review` still
runs after.
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
