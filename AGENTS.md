# tbc gear prio

Rules every agent needs on every task, then one pointer per kind of work.
A pointer names a trigger and one file. When your task matches the
trigger, read the file before you start that work. Pointers are plain
paths: an `@` import loads at start and would undo the saving.

## Before you start, by kind of work

- **You are the interactive session (the user talks to you directly):**
  you route work and hand every task to a subagent. Read
  `docs/agents/orchestration.md` § The session delegates before your
  first tool call; it lists the few calls you make yourself.
- **Writing code or tests, committing, pushing:** `docs/workflow.md`
  (the loop, gates, comment policy, testing seams, types from JSON,
  parking WIP, editing agent-facing documents).
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
- **Spawning an agent, fanning out, stage-gating, writing a question for
  the owner, or ending an investigation:** `docs/agents/orchestration.md`. **Which model and
  agent type:** `docs/agents/model-policy.md`.
- **Judging a ranking, shortlist or pool output:** the `sme-rank-review`
  skill; its audience is the engineering team, not players.
- **A plan, a ticket, a skill, `AGENTS.md`, `CLAUDE.md`, or a doc an
  agent is pointed at:** a second pass against the `writing-for-agents`
  skill, then `docs/workflow.md` § Editing agent-facing documents.
  Propose changes to `AGENTS.md`, `CLAUDE.md` and skill files in chat and
  wait for approval before editing them: they steer every future session.
- **Reporting a nontrivial task done,** especially a review, research, or
  "use X to check Y": the `dont-be-stupid` checklist.
- **Tickets:** local markdown under `.scratch/`,
  `docs/agents/issue-tracker.md`. **Domain docs:** `CONTEXT.md` and
  `docs/adr/`, `docs/agents/domain.md`.

## Find out before you ask

Resolve a question yourself: from what the user already said, from what
is derivable, or by sending an agent to investigate. Spend a clarifying
question only on a true fork in what the user wants, one no investigation
settles because it is a preference. The `dont-be-stupid` guardrail (ask
when the question is cheap and being wrong is expensive) is the other
bound.

## Durable claims

In committed or dispatched artifacts (commit messages, tickets, ADRs,
tracked docs and skills, retros, worker prompts), a causal claim points
at a command a reader can re-run or says **hypothesis** / **untested** in
the same sentence. Chat may speculate freely. Do not state as fact that
an artifact was produced on an environment you did not observe. Never
assert that a gitignored or untracked generated input is present for a
fresh worktree: give the regen/sync command and how to verify.

**A property measured against one option is not a comparison.** Before
ruling an option in or out, name the alternatives and say what the same
measurement gives for each. When the claim is that something is absent,
resolve every ref that could contain it (`known-traps.md` § Before
moving the wowsims engine pin).

**An exit code is not evidence that work happened.** A stopped
background task reports exit 0, and a command that ran in the wrong
directory succeeds at nothing. A pipe reports the **last** command's
status, so `make ... 2>&1 | tail` returns `tail`'s 0. To bound output
and keep the status, append `; echo "rc=${PIPESTATUS[0]}"` to the same
command, or redirect to a file and `tail` it separately. Confirm the
artifact (`ls node_modules`, read the file, check the row count) before
reporting an install, build or regen as done.

## CLI environment

Commands run in bash on WSL (Ubuntu). Every bash process finds the
project's tools without a login shell; setup and check:
`docs/agents/known-traps.md` § Before running node / pnpm / test
commands.

Use absolute paths or the command's own directory flag (`git -C`,
`pnpm -C`, `npm --prefix`) instead of `cd`: a backgrounded `cd X && cmd`
runs in the session cwd and succeeds while doing the work somewhere
else. Bound scaling output (`--stat`, `head`/`tail`, exit codes); to
test whether one thing exists, name it (`ls <path>`, `grep -c
<pattern>`), because a truncated listing cannot show absence.

Read a command's error text before forming a theory about it;
tool-manager errors usually name their own fix. `Edit` and `Write`
refuse a file this agent has not opened with `Read` in this run: `Read`
the part you will change, then edit.

**One tool round, many commands.** Every tool call is one model request
that sends your whole context again (code.claude.com/docs/en/costs, "Why
usage climbs in a long session"). Put every command whose input does not
depend on another's output into one Bash call (`cmd1; echo ===; cmd2`),
bound each one's output, and send independent tool calls in one message.
Decide what you need next before you call; then request all of it.

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

Commit per green slice, not one commit at the end and not only when
asked. `git add <paths>` does not scope the commit: pre-commit runs
`lint-staged` against `*` with `--no-stash --no-hide-partially-staged`,
so every dirty file rides along, and staging part of a file commits the
rest of it too. Before each commit `git status` must be clean of work
you did not do; after `git reset`, re-read `git log -1` before
recommitting. `pnpm verify` before every push. Merging into `dev` waits
for the user to ask **after** the review file exists and they saw its
summary; a combined "review and merge" request is not that ask. Then
`pnpm merge-to-dev` is the only door: no `git merge` into `dev`, no
`TBC_ALLOW_DEV_MERGE=1`. The loop, the review, mini-loops for tickets
and the gates: `docs/workflow.md` § The loop and § Gates.

## Spawning

Name the model on every spawn (the GLM types excepted: they take none,
model-policy § GLM worker types). An unnamed subagent inherits its
parent's model, and a session on Fable then pays the top price tier for
a `grep`. Pick the type by the job (model-policy § Claude Code):

- An **overseer** (Opus or Fable) plans, reviews, executes a plan,
  oversees workers, or judges an investigation; on Opus it also does
  hard implementation. It holds the judgment itself and hands
  **workhorse jobs** (searches, plain reads, command runs, measurements,
  small or modest coding) to the workhorse lane in blocks. It spawns
  another overseer only for judgment work it delegates: a review axis, a
  chunk of a plan, oversight of a worker set.
- The **workhorse lane** (model-policy § Workhorse jobs: `glm-flash-task`
  and `glm-task` when the harness lists them, else `discrete-task`,
  `modest-task` and `simple-task`) does one block whose result the
  prompt fixes or names, and spawns nothing.

Nothing runs on Haiku. A helper's `not found` is one input to a
conclusion of absence, never the conclusion.

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
