---
name: pre-merge-review
description: Run the three-axis review (adversarial, domain, standards+spec) on a feature branch before it lands on dev. Use when the user wants to review a feature branch before merging, asks to "run pre-merge review", or a feature's work looks done and is about to be landed with pnpm land.
---

# Pre-Merge Review

Three independent axes review the branch before it lands on `dev`. Each
reviewer gets **fresh context** — the diff and its own brief only, no access
to this conversation. That's the point: a reviewer that remembers writing
the code stops finding the code's mistakes.

| Axis | Brief | Notes |
|---|---|---|
| Adversarial | [`.agents/reviews/adversarial.md`](../../../.agents/reviews/adversarial.md) | Correctness bugs, silent-failure modes, test theatre |
| Domain | [`.agents/reviews/domain.md`](../../../.agents/reviews/domain.md) | TBC/WCL/wowsims facts vs. `docs/phase0-findings.md` |
| Standards + Spec | the `code-review` skill | Invoked unchanged — don't duplicate its logic here |

## Process

### 1. Pin the diff

```bash
git diff dev...HEAD
git log dev..HEAD --oneline
```

Three-dot diff against the merge-base, same convention as `code-review`.
Confirm the diff is non-empty before dispatching anything — an empty diff
means there's nothing to review, not three empty reports.

### 2. Dispatch, degrading gracefully

Try in order, use the first that's available:

1. **`codex exec`**, if the binary is on `PATH` — genuine cross-vendor
   adversarial review. Pipe the brief + diff to it directly.
2. **Parallel subagents** on the current harness (Sonnet by default, per
   this repo's convention — spawn all three in one batch, don't run them
   sequentially).
3. **Print and hand off** — if neither is available, print each brief plus
   the diff command and tell the user to paste them into a fresh session
   (a different chat, a different tool, doesn't matter — the only
   requirement is that it starts with no memory of writing this code).

Run the **adversarial** and **domain** sub-agents yourself using the briefs
above. Invoke the **`code-review`** skill separately for the third axis —
don't re-implement its Standards/Spec logic here.

### 3. Aggregate, file tickets, write the review

**Tickets are the source of truth for deferred work.** For every finding
you would defer, create `.scratch/carry-forward/issues/<NN>-<slug>.md`
first (`Status: open`, `Origin:`, `Blocks: phase-N`), then link it from
Disposition. See [`docs/agents/issue-tracker.md`](../../../docs/agents/issue-tracker.md).

Write `docs/reviews/<branch-name>.md` (slashes → dashes):

```markdown
# Pre-merge review — <branch>

Diffed against: dev...<branch> (<short-sha>)

## Adversarial
…

## Domain
…

## Standards + Spec
…

## Summary
…

## Disposition

| ID | Axis | Disposition | Ticket / note |
| --- | --- | --- | --- |
| A1 | Adversarial | fixed | <what landed> |
| A2 | Adversarial | defer | `.scratch/carry-forward/issues/0N-slug.md` |
| D1 | Domain | wontfix | <why> |
```

`Disposition` is exactly `fixed`, `defer`, or `wontfix`. Append a one-liner
to `.scratch/carry-forward/map.md` when filing tickets.

### 4. Prove the check (do not merge here)

```bash
pnpm land --check-only
```

On `phase-N/*` with open `Blocks: phase-N` tickets still open:

```bash
pnpm land --check-only --ack-open-blockers
```

### 5. Report

Tell the user where the review file is, the summary, and that
`pnpm land --check-only` is green. **Do not land on their behalf** — they
run `pnpm land` when ready. Do not `git merge` into `dev` by hand; the
pre-commit hook will refuse the merge commit unless `TBC_ALLOW_DEV_MERGE=1`
(which `pnpm land` sets). Escape hatch: `TBC_ALLOW_DEV_MERGE=1 git merge --no-ff <branch>`.
