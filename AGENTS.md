# tbc gear prio

Rules every agent needs on every task, then one pointer per kind of work.
A pointer names a trigger and one file. When your task matches the
trigger, read the file before you start that work. Pointers are plain
paths: an `@` import loads at start and would undo the saving.

## Before you start, by kind of work

- **You are the interactive session (the user talks to you directly):**
  the global rule "Orchestrator mode" (staged in
  `docs/agents/home/AGENTS.md`) says when you hand work to subagents. In
  that mode, this repo's extra calls are in `docs/agents/orchestration.md`
  § The session delegates.
- **Writing code or tests, committing, pushing:** `docs/workflow.md`
  (the loop, gates, testing seams, types from JSON, editing agent-facing
  documents).
- **A ported engine file, a scripted or generated file, the wowsims
  engine pin, a ticket, a review Disposition table, the dev servers,**
  or a node/pnpm command that fails strangely:
  `docs/agents/known-traps.md`.
- **`vendor/tbc-new-fork`, a pair, `data/wowsims-fork.lock.json`, or a
  merge into `dev`:** `docs/agents/paired-worktrees.md`. **Merging
  upstream `master` into the fork or moving the engine pin:**
  `docs/agents/upstream-catch-up.md`.
- **Pinning a vendored input, editing a parser, regenerating an artifact
  under `data/`:** the `data-pipeline-work` skill.
- **Spawning an agent, fanning out, stage-gating, or ending an
  investigation:** `docs/agents/orchestration.md`. **Which model and
  agent type:** `~/.claude/model-policy.md`; this repo's values are in
  `docs/agents/model-policy.md`.
- **Judging a ranking, shortlist or pool output:** the `sme-rank-review`
  skill; its audience is the engineering team, not players.
- **A plan, a ticket, a skill, an agent definition, `AGENTS.md`,
  `CLAUDE.md`, or a doc an agent is pointed at:** a second pass against
  the `writing-for-agents` skill, then `docs/workflow.md` § Editing
  agent-facing documents. A change to `AGENTS.md`, `CLAUDE.md`, a skill
  or an agent definition then follows the global rule "Changing agent
  instructions" (staged in `docs/agents/home/AGENTS.md`).
- **Reporting a nontrivial task done,** especially a review, research, or
  "use X to check Y": the `dont-be-stupid` checklist.
- **Tickets:** local markdown under `.scratch/`,
  `docs/agents/issue-tracker.md`. **Domain docs:** `CONTEXT.md` and
  `docs/adr/`, `docs/agents/domain.md`.

## Durable claims

The rules on durable claims, one-option comparisons and exit codes are
global (`~/.claude/AGENTS.md` § Durable claims, staged in
`docs/agents/home/AGENTS.md`). When the claim is that an upstream
feature is absent, the refs that could contain it are in
`docs/agents/known-traps.md` § Before moving the wowsims engine pin.

## CLI environment

Commands run in bash on WSL (Ubuntu). Every bash process finds the
project's tools without a login shell; setup and check:
`docs/agents/known-traps.md` § Before running node / pnpm / test
commands. The general shell and tool habits are global
(`~/.claude/AGENTS.md` § Shell and tool habits, staged in
`docs/agents/home/AGENTS.md`).

## The forked tab repo

The Upgrades tab's code lives in `vendor/tbc-new-fork`, a git repo with
its own branch and remote; `vendor/` is gitignored, so it is invisible
to `git status` here. Edit it only in a **pair** (a main-repo worktree
with its own fork worktree); `ls <checkout>/vendor/tbc-new-fork` tells
you which kind of checkout you are in. **No fork here:** as a worker in
a checkout with no `vendor/tbc-new-fork`, stop and report it to whoever
sent you. A fork change is a two-step re-pin (fork commit, then lock
bump and `pnpm sim-implemented-effects:generate`):
`docs/agents/paired-worktrees.md` § Re-pin after a fork change.

## Commits and merges

The rules on commits, the merge ask and parked work are global
(`~/.claude/AGENTS.md` § Commits and merges, staged in
`docs/agents/home/AGENTS.md`). Here, `git add <paths>` does not scope
the commit: pre-commit runs `lint-staged` against `*` with `--no-stash
--no-hide-partially-staged`, so every dirty file rides along, and
staging part of a file commits the rest of it too. `pnpm verify` before
every push. The integration branch is `dev`. After the user's merge ask,
`pnpm merge-to-dev` is the only door: no `git merge` into `dev`, no
`TBC_ALLOW_DEV_MERGE=1`. The loop, the review, mini-loops for tickets
and the gates: `docs/workflow.md` § The loop and § Gates. **Agent
tooling** (`TOOLING_PATHS` in `scripts/check_merge_ready.py`) is the
exception to the product review: a branch that changes only tooling gets
`instruction-review` in its place (`docs/workflow.md` § The
loop, step 4).

## Spawning

The spawning rules are global (`~/.claude/AGENTS.md` § Spawning, staged
in `docs/agents/home/AGENTS.md`); this repo's values are in
`docs/agents/model-policy.md`. In this repo a workhorse type also stops
and returns `NEEDS_JUDGMENT` for an edit under `data/` or
`vendor/tbc-new-fork`, `.githooks/` or `scripts/`. It runs `node --version`
in the same shell command as each `node`, `pnpm` or test command, for
example `node --version; pnpm verify`; if it does not print v22, it
discards the command's result and returns
`NEEDS_JUDGMENT: node --version printed <output>`
(`docs/agents/known-traps.md`, "Before running node / pnpm / test
commands").

## Subagent reports

The global "Subagent reports" rule applies (staged in
`docs/agents/home/AGENTS.md` § Chat responses). With no path in the
prompt, the report file goes at
`.scratch/agent-reports/<UTC date>-<agent type>-<a few words of the task>.md`
(gitignored). In the condensed report, mark an important claim that has
no source `hypothesis, untested` in place of "unverified". Callers with
worktree or pair workers name a path in their own checkout. Stage-gate
seats (`gate-*`) follow their definitions and the stage-gate skill for
their own final messages; a seat that spawns workers, such as
`gate-executor`, is their caller under this section.
