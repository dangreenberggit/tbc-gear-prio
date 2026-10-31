# Orchestration: the session, its subagents, and the owner

Read this before spawning an agent, fanning out, stage-gating, or
ending an investigation. Model and agent type: `model-policy.md`.

## The session delegates

In orchestrator mode (global `AGENTS.md` § Orchestrator mode, staged in
`docs/agents/home/AGENTS.md`), the session in this repo also makes these
tool calls itself:

- writing `brief.md`, `decision-log.md`, and any stage artifact copied
  verbatim from a seat's final message, and the one `mv` of `plan.md`
  that the `stage-gate` skill's step 5 makes before a new plan
- the short gate checks: `git status --porcelain`, `git rev-parse HEAD`,
  `git diff --stat`, and `date -u +%Y-%m-%dT%H:%MZ` for `decision-log.md`
  times and for the age of a waiting agent's `returned` line
- a background `sleep 1800` timer for an agent that is waiting on its own
  background work (the `stage-gate` skill's step 1 **Open the stage**,
  the `spawn` lines)
- reading the stage-gate artifacts under `.scratch/stage-gate/<slug>/`,
  the skill's `plan-template.md` (`~/.claude/skills/stage-gate/`) and
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

When to fan out writers, and who runs the fan-out, is global
(`~/.claude/model-policy.md` § Parallelism vs serial, staged in
`docs/agents/home/model-policy.md`). Here, a slice that reads or edits
the fork gets a pair (AGENTS.md § The forked tab repo). The
`parallel-phase` skill holds the rest: disjointness is a claim to verify
before spawning, isolation per slice, merge onto the feature branch,
teardown, `pnpm verify` on the integrated tip, `pre-merge-review`, then
wait for the user's ask before `pnpm merge-to-dev`. Never merge each worker into `dev`.

## Stage-gate features

When a wrong plan would be expensive, run the `stage-gate` skill. This
repo's values for it are in `docs/agents/stage-gate-project.md`.

## Interacting with the user

Message format, decisions and the investigation record are global
(`~/.claude/AGENTS.md` § Chat responses, staged in
`docs/agents/home/AGENTS.md`). Here, an investigation session's record
goes at `.scratch/agent-reports/<UTC date>-session-<topic>.md`. When
overseeing the plan-review-execute pipeline, the `stage-gate` skill's
§ Orchestrator conduct adds the pipeline rules.
