---
name: pre-merge-review
description: Run the three-axis review (adversarial, domain, standards+spec) on a feature branch before it merges to dev. Use when the user wants to review a feature branch before merging, asks to "run pre-merge review", or a feature's work looks done and is about to be merged back to dev.
---

# Pre-Merge Review

Three independent axes review the branch before it merges to `dev`. Each
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

### 3. Aggregate and write

Write `docs/reviews/<branch-name>.md`:

```markdown
# Pre-merge review — <branch>

Diffed against: dev...<branch> (<short-sha>)

## Adversarial
<verbatim or lightly cleaned>

## Domain
<verbatim or lightly cleaned>

## Standards + Spec
<code-review skill's output>

## Summary
<total findings per axis, worst issue per axis — no cross-axis reranking>
```

The file is the artifact, not the chat transcript — it survives a harness
switch and doubles as merge-commit or PR reference material.

### 4. Report

Tell the user where the file is and give the one-line summary. Do not
merge on their behalf — the merge is theirs to do once they've read the
findings.
