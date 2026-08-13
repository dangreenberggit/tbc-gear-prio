# Claude Code adapter

Same contract as [agnostic.md](agnostic.md). Prefer these conveniences when running inside Claude Code; fall back to agnostic git anytime.

## Models (subagents)

Lane-aware defaults (see [`docs/agents/model-policy.md`](../../../../docs/agents/model-policy.md)):

- **Workhorse / simple:** Sonnet-class — parallel implement workers, mechanical edits.
- **Review:** Opus at **effort `medium`** — pre-merge axes, adversarial and domain judgment. Effort is a separate control from the model, not a slug; reserve `high`+ for a single narrow adversarial axis, and never fan out N review workers.
- **Design:** Fable — planning and architecture only. It is the top price tier here, so an unnamed subagent inherits it; name the model on every spawn. Never a worker model, never a review model.

## Isolate

- Session: `claude --worktree <name>` (or `-w`) so the session has its own checkout.
- Subagent: `isolation: worktree` in agent frontmatter (or equivalent Agent-tool flag). **Default worktree basing is the repo's remote default branch (`fresh`), not your current feature branch.** Verified here: every auto-created `worktree-agent-*` branch in this repo sits at `origin/main`, seven for seven, across two fan-out sessions. This is deterministic, not flaky. Set `worktree.baseRef: "head"` when the harness offers it, and **regardless of that**, pin the base SHA in every worker prompt (SKILL.md Step 3) and check `git worktree list` after spawning. The prompt-level assertion is what makes worktree isolation usable on a feature branch at all.
- Optional `.worktreeinclude` for local files (e.g. `.env`) that should appear in new worktrees.
- **Do not** use experimental agent teams as the default for parallel *edits* — they do not auto-isolate worktrees; partition paths strictly if you use them at all.

## Batch (optional)

`/batch` is fine for mechanical multi-unit changes that each open a PR. Aim those PRs at the **feature branch** (or merge each unit branch into the feature branch yourself), not at `dev`.

## Orchestrate (optional, large fan-out)

Ports of Cursor-style orchestrate (e.g. claude-orchestrate) are allowed for large trees. Same land rule: feature-branch fan-in, `pre-merge-review`, then **ask** before `pnpm land`.

## Merge

Delegator merges worker branches into the feature branch with git, then tears down the worktrees, then `pnpm verify` (SKILL.md Steps 5–7 — teardown precedes verify because `.claude/worktrees/` is inside the repo and vitest will pick them up unless excluded). Prefer delegator merge when the fan-in is editorial; spawn a merger worker for mechanical fan-in or when context/session limits force it.
