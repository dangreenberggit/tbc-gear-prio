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

### 2. Dispatch (sharp lane — slow is fine)

Reviewers are on the **sharp** model lane — see
[`docs/agents/model-policy.md`](../../../docs/agents/model-policy.md). Do
**not** silently downgrade to a weaker model when the harness rate-limits
or swaps models. Prefer waiting, serialising, or handing off.

Try in order:

1. **`codex exec`**, if the binary is on `PATH` — cross-vendor sharp review.
   Pipe the brief + diff to it directly.
2. **Fresh subagents on a sharp model** (explicit model id — Opus-class /
   GPT high/sol-class or the harness’s current top reasoning tier, not a
   workhorse mid-tier). Prefer all three axes in one parallel batch when
   the harness is healthy.
3. **On a wall** (rate/usage/quota/`429`/spawn failure/automatic model
   downgrade message):
   - Retry once after a short wait on the **same sharp class**.
   - Then run axes **one at a time** (adversarial → domain → code-review),
     still sharp — slower wall-clock is acceptable.
   - Then **print and hand off**: each brief + `git diff dev...HEAD` for a
     fresh session or other tool (no memory of writing this code).
4. **Same-session review by the authoring agent** only if the user
   explicitly opts in. Label it in the review file’s dispatch note.

Run the **adversarial** and **domain** sub-agents with the briefs above.
Invoke the **`code-review`** skill for the third axis — don't re-implement
its Standards/Spec logic here.

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

### 5. Report — then stop

Tell the user where the review file is, the summary, and that
`pnpm land --check-only` is green. **Stop there.** Do not run `pnpm land`,
do not `git merge` into `dev`, and do not set `TBC_ALLOW_DEV_MERGE=1`
unless the user has **explicitly asked** to land/merge this branch into
`dev` (after seeing the review, or in the same message as approving land).
“The branch looks done” / “commit this” / finishing the review is **not**
permission to land. When they do ask, use `pnpm land` only — never a raw
merge into `dev`.
