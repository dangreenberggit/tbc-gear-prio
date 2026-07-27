# Claude Code adapter

Same contract as [agnostic.md](agnostic.md). Prefer these conveniences when running inside Claude Code; fall back to agnostic git anytime.

## Isolate

- Session: `claude --worktree <name>` (or `-w`) so the session has its own checkout.
- Subagent: `isolation: worktree` in agent frontmatter (or equivalent Agent-tool flag). Prefer branching from the **feature-branch HEAD** (`worktree.baseRef: "head"` when available), not only the remote default branch.
- Optional `.worktreeinclude` for local files (e.g. `.env`) that should appear in new worktrees.
- **Do not** use experimental agent teams as the default for parallel *edits* — they do not auto-isolate worktrees; partition paths strictly if you use them at all.

## Batch (optional)

`/batch` is fine for mechanical multi-unit changes that each open a PR. Aim those PRs at the **feature branch** (or merge each unit branch into the feature branch yourself), not at `dev`.

## Orchestrate (optional, large fan-out)

Ports of Cursor-style orchestrate (e.g. claude-orchestrate) are allowed for large trees. Same land rule: feature-branch fan-in, then one `pnpm land`.

## Merge

Delegator merges worker branches into the feature branch with git, then `pnpm verify`. Prefer delegator merge; spawn a merger worker only if context or session limits force it.
