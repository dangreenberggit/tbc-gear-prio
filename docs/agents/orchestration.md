# Orchestration: the session, its subagents, and the owner

Read this before spawning an agent, fanning out, stage-gating, or
ending an investigation. Model and agent type: `~/.claude/routing.md`.

## The session delegates

In orchestrator mode (`~/.claude/AGENTS.md` § Orchestrator mode), the
session in this repo also makes these tool calls itself:

- writing the `stage-gate` skill's `brief.md` (its step 1) in the stage
  folder, `.scratch/stage-gate/<slug>/`, and reading the tickets and
  reports the brief cites
- reading the files in that folder and
  `docs/agents/stage-gate-project.md`
- `git rev-parse HEAD` and `git diff --stat`, as short state checks

Everything else goes to a subagent: reading code or docs, running `pnpm`
or any other `git` command, editing files, and committing. To run
`pre-merge-review`, spawn one subagent to run the whole skill. Allow it to
write `docs/reviews/`, `.scratch/carry-forward/` and
`docs/upgrades-tab-scope.md` and to commit them, and have it return the
review file's path and its summary.

## Who spawns whom

The general rules are in `~/.claude/model-policy.md` § Who spawns whom.

The rule in § The session delegates binds the interactive session. A subagent
that orchestrates (a stage-gate builder, or a subagent spawned to run
`parallel-phase` as Delegator) holds its own judgment, merge and fan-in,
and hands workhorse jobs down like any overseer.

## Models and walls

Lanes and types: `~/.claude/routing.md` § Principles. Go slower or serial on walls; never invent
a weaker substitute for a review job: if waiting and serialising both
fail, stop and say so rather than downgrading; and never promote a job to
a taller lane it does not belong in. Managers must not background workers
and end the turn without a disk handoff for fan-in (`~/.claude/model-policy.md`
§ Manager / multi-step fan-out (any harness)). Fills per harness, and Composer and Grok
on Cursor: `~/.claude/model-policy.md` § Harness notes. The `effort`
argument: `~/.claude/routing.md` § Models and effort.

## Parallel agents

When to fan out writers, and who runs the fan-out, is global
(`~/.claude/model-policy.md` § Parallelism vs serial). Here, a slice that reads or edits
the fork gets a pair (`AGENTS.md` § The forked tab repo). The
`parallel-phase` skill holds the rest: disjointness is a claim to verify
before spawning, isolation per slice, merge onto the feature branch,
teardown, `pnpm verify` on the integrated tip, `pre-merge-review`, then
wait for the user's ask before `pnpm merge-to-dev`. Never merge each worker into `dev`.

## Stage-gate features

When a wrong plan would be expensive, run the `stage-gate` skill. This
repo's values for it are in `docs/agents/stage-gate-project.md`.

## Interacting with the user

Message format and decisions are global (`~/.claude/AGENTS.md`
§ Writing). Here, an investigation session's record goes at
`.scratch/agent-reports/<UTC date>-session-<topic>.md`.
