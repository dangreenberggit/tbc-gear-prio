# Cursor adapter

Same contract as [agnostic.md](agnostic.md). Prefer these conveniences when running inside Cursor; fall back to agnostic git anytime.

## Models (workers)

Pin **Composer** for Task / `best-of-n-runner` / parallel workers
(`composer-2.5-fast` if that is the only Task slug). Do **not** request
Terra/Sol/Other-pool models for N-way fan-out on Pro — they often die at
spawn with a usage wall even though they appear in the picker. Sharp review
stays **Grok high** (see [`docs/agents/model-policy.md`](../../../../docs/agents/model-policy.md)).
If a worker logs `Switched to grok-4.5…` and still `status: error`, treat it
as a hard fail and respawn on Composer (or serialise) — not as a successful
Grok handoff.

## Isolate

- **IDE / Agents Window:** start or move the worker into a **worktree** so it does not share the main checkout. Base from the feature branch.
- **Slash commands:** `/worktree` for one isolated run; `/apply-worktree` only when bringing a result into the feature checkout (delegator/merger owns fan-in).
- **Task / cloud:** `environment: "cloud"` for long workers (own VM + branch). Do not treat in-session `.cursor/agents` subagents as a fleet of N PR-producing workers — use worktrees or cloud for that.
- **Setup:** optional `.cursor/worktrees.json` with `pnpm install` (and env copy). Prefer install over symlinking `node_modules`.

## Orchestrate (optional, large fan-out)

For big trees with disk-canonical plan/state, the Cursor `/orchestrate` plugin is allowed. Keep this repo’s rules: merge onto the **feature branch**, never land workers to `dev`; after fan-in, run `pre-merge-review`, then **ask** before `pnpm land`.

## Merge

Delegator merges worker branches into the feature branch (agnostic git merge), or applies worktree results deliberately, then `pnpm verify`. `/best-of-n` compares candidates only — pick one winner; it does not replace the merge step for independent slices.
