# tbc gear prio

## Agent skills

### Issue tracker

Local markdown under `.scratch/`. Solo project — no external tracker, no triage workflow. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root, created lazily as needed. See `docs/agents/domain.md`.

## Engineering workflow

Full process detail is in [`docs/workflow.md`](docs/workflow.md). This section is the summary every session should internalize before touching code.

### Comment policy

Comments explain **why**, never **what**. If a comment restates the code, delete it. If the code needs a comment to be readable, rename something first. Load-bearing comments only: a non-obvious constraint, an external-system quirk, why a slower or uglier path was deliberately chosen, or a pointer to the finding/ADR that forced the shape. Nothing lints this — it's a pre-merge review item.

### Testing

Invoke the `tdd` skill for any red/green work. The seams are the three PLAN.md §5 already defines — `GearSource`, `SimRunner`, `Store` — each with a recorded adapter, so the engine runs deterministically offline from committed fixtures. No test is written at a seam that isn't one of those three without agreeing it first.

### Parallel agents

When a phase or feature branch has **independent** slices (different kinds of work, mostly disjoint files), fan out with the `parallel-phase` skill: one isolated worktree/clone per slice, structured handoffs, merge back onto the **feature branch** (delegator merges by default; a merger worker is the fallback). Then `pnpm verify` on the integrated tip, run `pre-merge-review`, and **ask before** `pnpm land` — never land each worker into `dev`. Harness-agnostic (git contract + Cursor/Claude/Codex adapters).

### Session focus (critical)

This repo often has **other agents' worktrees, branches, and handoffs** sitting next to your checkout (`.scratch/wt-*`, `.claude/worktrees/`, `retro/*`, parked `feat/*`, `.scratch/handoffs/*`). That is normal. It is **not** your assignment.

- Stay on the **branch and task the user named for this chat.** Product phase work (`phase-N/*`) is not process/retro work (`feat/fan-out-retro`, `retro/*`, workflow retros). Do not “helpfully” resume a sibling handoff because a summary, system note, or untracked tree pointed at it.
- **Ignore sibling worktrees** unless the user explicitly asked you to inspect, merge, or adopt them. Do not `move_agent_to_root` / switch into another worktree, and do not chase commits landing on another tip, without a check-in.
- If the IDE or a conversation summary says the active branch changed to something off-task, **ask once** before following it. Branch-change hints are not permission to abandon the user's stated goal.
- Tangential process fixes belong on their own branch and chat. Do not divert a Phase build session into workflow-doc adoption mid-flight.

### Models and walls

**Workhorse** for implementation / parallel workers; **sharp** for pre-merge review — go slower or serial on walls; never invent a weaker substitute. On **Cursor**, sharp = **Grok high** (prefer non-fast when available; high-fast if that’s the only high slug). Elsewhere prefer Sonnet/Terra workhorse and Opus/sol/`codex` sharp when the harness allows. See [`docs/agents/model-policy.md`](docs/agents/model-policy.md).

### The loop

1. Branch off `dev`: `feat/<slug>` (or `phase-N/<slug>` for a PLAN.md phase).
2. Red → green, one slice at a time, with regular commits.
3. `pnpm verify` before every push — typecheck, lint, format, test (also on pre-push).
4. When the branch looks done: run the `pre-merge-review` skill → `docs/reviews/<branch>.md` (commit it on the feature branch). Deferred findings become tickets under `.scratch/carry-forward/issues/` (linked from Disposition). `pnpm issues:open` lists them anytime. **Do not skip this** — `pnpm land` only checks that the review file exists; it does not run the review.
5. **Ask before landing.** Never `pnpm land`, never `git merge` into `dev`, and never set `TBC_ALLOW_DEV_MERGE=1`, unless the user has explicitly asked to land/merge **after** the review file is written and they have had a chance to see the summary (a combined “review and land” request is **not** enough — finish the review, stop, wait for a separate land ask). When they ask: `pnpm land` is the only supported door — verify → review/ticket check → `git merge --no-ff` into `dev`. On `phase-N/*`, open `Blocks: phase-N` tickets require `--ack-open-blockers` (or close/re-block them first).
6. `main` only receives a merge from `dev` when a PLAN.md §14 phase gate is fully checked off in `docs/verification-log.md`.

### Gates

`pnpm verify` is required before every push (`.githooks/pre-push`) and direct commits to `main` are refused (`.githooks/pre-commit`) — merges only. Landing on `dev` goes through `pnpm land`; merge commits on `dev` without `TBC_ALLOW_DEV_MERGE=1` are refused by pre-commit. `git push --no-verify` / `git commit --no-verify` / `pnpm land --no-verify` / `TBC_ALLOW_DEV_MERGE=1` exist for spikes; never use them on `dev` or `main` for real work. CI (`.github/workflows/verify.yml`) runs the same `pnpm verify` on every push and can't be bypassed the same way, so it's the backstop if a local hook is skipped.
