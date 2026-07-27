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

When a phase or feature branch has **independent** slices (different kinds of work, mostly disjoint files), fan out with the `parallel-phase` skill: one isolated worktree/clone per slice, structured handoffs, merge back onto the **feature branch** (delegator merges by default; a merger worker is the fallback). Then `pnpm verify` on the integrated tip and the normal review / `pnpm land` once — never land each worker into `dev`. Harness-agnostic (git contract + Cursor/Claude/Codex adapters).

### Models and walls

**Workhorse** models (Sonnet-class / GPT Terra-class) for implementation and parallel workers. **Sharp** models for pre-merge review — go slower or serial if rate-limited; never silently downgrade review quality. Walls are detected from spawn/quota errors, not a reliable preflight meter. See [`docs/agents/model-policy.md`](docs/agents/model-policy.md).

### The loop

1. Branch off `dev`: `feat/<slug>` (or `phase-N/<slug>` for a PLAN.md phase).
2. Red → green, one slice at a time, with regular commits.
3. `pnpm verify` before every push — typecheck, lint, format, test (also on pre-push).
4. When the branch looks done: run the `pre-merge-review` skill → `docs/reviews/<branch>.md` (commit it on the feature branch). Deferred findings become tickets under `.scratch/carry-forward/issues/` (linked from Disposition). `pnpm issues:open` lists them anytime. **Do not skip this** — `pnpm land` only checks that the review file exists; it does not run the review.
5. **Ask before landing.** Never `pnpm land`, never `git merge` into `dev`, and never set `TBC_ALLOW_DEV_MERGE=1`, unless the user has explicitly asked to land/merge this branch into `dev` _after_ the review exists (or in the same breath as approving land). When they ask: `pnpm land` is the only supported door — verify → review/ticket check → `git merge --no-ff` into `dev`. On `phase-N/*`, open `Blocks: phase-N` tickets require `--ack-open-blockers` (or close/re-block them first).
6. `main` only receives a merge from `dev` when a PLAN.md §14 phase gate is fully checked off in `docs/verification-log.md`.

### Gates

`pnpm verify` is required before every push (`.githooks/pre-push`) and direct commits to `main` are refused (`.githooks/pre-commit`) — merges only. Landing on `dev` goes through `pnpm land`; merge commits on `dev` without `TBC_ALLOW_DEV_MERGE=1` are refused by pre-commit. `git push --no-verify` / `git commit --no-verify` / `pnpm land --no-verify` / `TBC_ALLOW_DEV_MERGE=1` exist for spikes; never use them on `dev` or `main` for real work. CI (`.github/workflows/verify.yml`) runs the same `pnpm verify` on every push and can't be bypassed the same way, so it's the backstop if a local hook is skipped.
