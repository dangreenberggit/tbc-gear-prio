# Claude Code adapter

Same contract as [agnostic.md](agnostic.md). Prefer these conveniences when running inside Claude Code; fall back to agnostic git anytime.

## Models (subagents)

Lane-aware defaults (see [`docs/agents/model-policy.md`](../../../../docs/agents/model-policy.md) § Claude Code, which defines each agent type):

- **Workhorse:** Opus at effort `high` — parallel implement workers. Spawn each as `general-task` with `model: "opus"`. An extremely simple slice (see `simple-task`) may go to `simple-task` with `model: "sonnet"`.
- **Review:** Opus at effort `high` — pre-merge axes, adversarial and domain judgment. One spawn per review axis; never split one axis across N workers.
- **Design:** Opus at effort `xhigh` — planning and architecture. Never a worker.

The agent type's frontmatter sets effort. The spawn and the prompt cannot. Workers are Opus, so size the round with model-policy § Budget the round before spawning. Name the model on every spawn: a session on Fable, the top price tier, makes an unnamed built-in subagent inherit Fable.

## Isolate

- Session: `claude --worktree <name>` (or `-w`) so the session has its own checkout.
- Subagent: `isolation: worktree` in agent frontmatter (or equivalent Agent-tool flag). **Default worktree basing is the repo's remote default branch (`fresh`), not your current feature branch.** Verified here: every auto-created `worktree-agent-*` branch in this repo sits at `origin/main`, seven for seven, across two fan-out sessions. This is deterministic, not flaky. Set `worktree.baseRef: "head"` when the harness offers it, and **regardless of that**, pin the base SHA in every worker prompt (SKILL.md Step 3) and check `git worktree list` after spawning. The prompt-level assertion is what makes worktree isolation usable on a feature branch at all.
- Optional `.worktreeinclude` for local files (e.g. `.env`) that should appear in new worktrees.
- **Do not** use experimental agent teams as the default for parallel *edits* — they do not auto-isolate worktrees; partition paths strictly if you use them at all.

## Batch (optional)

`/batch` is fine for mechanical multi-unit changes that each open a PR. Aim those PRs at the **feature branch** (or merge each unit branch into the feature branch yourself), not at `dev`.

## Orchestrate (optional, large fan-out)

Ports of Cursor-style orchestrate (e.g. claude-orchestrate) are allowed for large trees. Same merge rule: feature-branch fan-in, `pre-merge-review`, then **ask** before `pnpm merge-to-dev`.

## Merge

Delegator merges worker branches into the feature branch with git, then tears down the worktrees, then `pnpm verify` (SKILL.md Steps 5–7 — teardown precedes verify because `.claude/worktrees/` is inside the repo and vitest will pick them up unless excluded). Prefer delegator merge when the fan-in is editorial; spawn a merger worker for mechanical fan-in or when context/session limits force it.
