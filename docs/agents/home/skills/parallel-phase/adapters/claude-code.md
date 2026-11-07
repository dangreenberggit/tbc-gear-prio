# Claude Code adapter

Same contract as [agnostic.md](agnostic.md). Prefer these conveniences when running inside Claude Code; fall back to agnostic git anytime.

## Models (subagents)

Lane-aware defaults (see `~/.claude/model-policy.md` § Claude Code, which defines each agent type):

- Which type and model each slice and helper gets: `~/.claude/routing.md` § Decision table and § Models and effort.
- One spawn per review axis; never split one axis across N workers.

Hard-slice workers are Opus, so size the round with model-policy § Budget the round before spawning.

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
