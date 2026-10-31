# Claude Code adapter

Same contract as [agnostic.md](agnostic.md). Prefer these conveniences when running inside Claude Code; fall back to agnostic git anytime.

## Models (subagents)

Lane-aware defaults (see `~/.claude/model-policy.md` § Claude Code, which defines each agent type):

- **Lead:** Opus at effort `high` — parallel implement workers. Spawn each as `general-task` with `model: "opus"`. An extremely simple slice (see `simple-task`) may go to `simple-task` with `model: "sonnet"`.
- **Workhorse:** the cheap worker types. When the harness lists the GLM types, `glm-flash-task` takes every workhorse job, and Sonnet types are used there only for a job z-ai must not see (model-policy § GLM worker types, "Private data"), or a retry when a GLM type hits a usage wall. Else `discrete-task` and `modest-task`. A worker hands its blocks of searches, reads, named runs and measurements to them. A small or modest slice may go to one of them; a hard slice runs on the lead lane (model-policy § Workhorse jobs).
- **Review:** Opus at effort `high` — pre-merge axes, adversarial and domain judgment. One spawn per review axis; never split one axis across N workers.
- **Design:** Fable at effort `low` — planning and architecture (`gate-planner`, `design-task`). Never a worker.

The agent type's frontmatter sets effort. The prompt cannot set it, and the spawn's `effort` argument stays off unless the owner asks for a specific effort. Hard-slice workers are Opus, so size the round with model-policy § Budget the round before spawning. Name the model on every spawn: a session on Fable, the top price tier, makes an unnamed built-in subagent inherit Fable.

## Isolate

- **Other isolation:** a slice that the repo's values file § Isolation covers is isolated as that section says, by the Delegator; the worker gets that checkout's path. Use the two options below only for slices that § Isolation does not cover.
- Session: `claude --worktree <name>` (or `-w`) so the session has its own checkout.
- Subagent: `isolation: worktree` in agent frontmatter (or equivalent Agent-tool flag). **Default worktree basing is the repo's remote default branch (`fresh`), not your current feature branch.** (Evidence: tbc-gear-prio `docs/agents/parallel-phase-project.md` § History.) Set `worktree.baseRef: "head"` when the harness offers it, and **regardless of that**, pin the base SHA in every worker prompt (SKILL.md Step 3) and check `git worktree list` after spawning. The prompt-level assertion is what makes worktree isolation usable on a feature branch at all.
- Optional `.worktreeinclude` for local files (e.g. `.env`) that should appear in new worktrees.
- **Do not** use experimental agent teams as the default for parallel _edits_ — they do not auto-isolate worktrees; partition paths strictly if you use them at all.

## Batch (optional)

`/batch` is fine for mechanical multi-unit changes that each open a PR. Aim those PRs at the **feature branch** (or merge each unit branch into the feature branch yourself), not at the integration branch.

## Orchestrate (optional, large fan-out)

Ports of Cursor-style orchestrate (e.g. claude-orchestrate) are allowed for large trees. Same merge rule: feature-branch fan-in, the review step, then wait for the user's ask before the merge command.

## Merge

Delegator merges worker branches into the feature branch with git, then tears down the worktrees, then the gate command (SKILL.md Steps 5–7 — teardown precedes verify because `.claude/worktrees/` is inside the repo and the test runner will pick them up unless excluded). Prefer delegator merge when the fan-in is editorial; spawn a merger worker for mechanical fan-in or when context/session limits force it.
