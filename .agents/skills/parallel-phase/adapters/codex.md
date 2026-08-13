# Codex adapter

Same contract as [agnostic.md](agnostic.md). Prefer these conveniences when running under Codex; fall back to agnostic git anytime.

## Models

Lane-aware defaults (see [`docs/agents/model-policy.md`](../../../../docs/agents/model-policy.md)):

- **Workhorse / simple:** mid tier — parallel implement workers, mechanical edits.
- **Review:** top tier / `codex exec` — pre-merge axes, adversarial and domain judgment. No plan-specific spawn-death quirks are recorded for Codex in this repo; if you hit one, record it in the model policy.
- **Design:** top tier with extended reasoning — planning and architecture calls.

## Isolate

- Give each worker its own **cwd** that is a git worktree (create with the agnostic `git worktree add` recipe).
- One Codex agent (or `codex exec` run) per slice; do not point two writers at the same worktree.
- Pass the slice goal, `pathsAllowed` / `pathsForbidden`, acceptance, and the handoff template in the prompt — workers have no sibling channel.

## Merge

Run merge commands from a Codex session checked out on the **feature branch** (delegator session preferred). After all merges: `pnpm verify`. If using a separate merger agent, feed it every handoff body and the conflict policy; acceptance is verify-green on the feature tip.

## Review / merge

Unchanged merge path: `pre-merge-review`, then **ask** before `pnpm merge-to-dev`. Codex may already be used as a cross-vendor reviewer inside pre-merge-review — that is separate from this fan-out skill.
