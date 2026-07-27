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

### The loop

1. Branch off `dev`: `feat/<slug>` (or `phase-N/<slug>` for a PLAN.md phase).
2. Red → green, one slice at a time, with regular commits.
3. `pnpm verify` before every push — typecheck, lint, format, test.
4. Run the `pre-merge-review` skill: three independent axes (adversarial, domain, standards+spec) against a fresh context, findings written to `docs/reviews/<branch>.md`.
5. Merge to `dev` with `--no-ff`, so the feature stays one revertable unit.
6. `main` only receives a merge from `dev` when a PLAN.md §14 phase gate is fully checked off in `docs/verification-log.md`.

### Gates

`pnpm verify` is required before every push (`.githooks/pre-push`) and direct commits to `main` are refused (`.githooks/pre-commit`) — merges only. `git push --no-verify` / `git commit --no-verify` exist for spikes and throwaway branches; never use them on `dev` or `main`. CI (`.github/workflows/verify.yml`) runs the same `pnpm verify` on every push and can't be bypassed the same way, so it's the backstop if a local hook is skipped.
