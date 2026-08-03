# Cursor adapter

Same contract as [agnostic.md](agnostic.md). Prefer these conveniences when running inside Cursor; fall back to agnostic git anytime.

## Models (Task / in-session subagents)

Lane-aware defaults (see [`docs/agents/model-policy.md`](../../../../docs/agents/model-policy.md)):

- **Workhorse / simple:** **Composer** (`composer-2.5-fast` or current slug) — parallel implement workers, mechanical edits.
- **Sharp:** **Grok high** — design, review, hard judgment. Do not open fan-out with Sol/Opus “for quality.”

If a **manager** agent must spawn design/review workers and then compile: do not `run_in_background` + end turn “waiting.” Either keep ownership through fan-in, or write a `PROCESS.md` handoff naming the next spawn for the parent. Background completions notify the parent session, not a dead manager.

## Isolate

- **IDE / Agents Window:** start or move the worker into a **worktree** so it does not share the main checkout. Base from the feature branch.
- **Slash commands:** `/worktree` for one isolated run; `/apply-worktree` only when bringing a result into the feature checkout (delegator/merger owns fan-in).
- **Task / cloud:** `environment: "cloud"` for long workers (own VM + branch). Do not treat in-session `.cursor/agents` subagents as a fleet of N PR-producing workers — use worktrees or cloud for that.
- **Setup:** optional `.cursor/worktrees.json` with `pnpm install` (and env copy). Prefer install over symlinking `node_modules`.

## Orchestrate (optional, large fan-out)

For big trees with disk-canonical plan/state, the Cursor `/orchestrate` plugin is allowed. Keep this repo’s rules: merge onto the **feature branch**, never land workers to `dev`; after fan-in, run `pre-merge-review`, then **ask** before `pnpm land`.

## Merge

Delegator merges worker branches into the feature branch (agnostic git merge), or applies worktree results deliberately, then `pnpm verify`. `/best-of-n` compares candidates only — pick one winner; it does not replace the merge step for independent slices.
