# Pre-merge review — feat/agent-model-policy

Diffed against: `dev...feat/agent-model-policy` (`7f338d5`)

**Review dispatch note:** Adversarial axis via fresh subagent
`cursor-grok-4.5-high-fast` (Cursor sharp ceiling; Sol was refused by usage
limit). Domain and Standards+Spec applied in the parent session on the
docs/skill surface only (no application code). Authoring agent applied
adversarial fixes; reviewer did not edit.

## Adversarial

Findings from Grok-high subagent (then fixed on branch):

1. Parallel path / adapters still said review → `pnpm land` with no ask.
2. “Same breath as approving land” allowed merge before the user saw Disposition.
3. Auto model-swap treated both as wall and as continue-on-ceiling.
4. Skill description primed land-as-next-step after review.

Post-fix: ask-before-land is consistent across AGENTS, workflow,
parallel-phase adapters, and pre-merge-review; Cursor ceiling (Grok high)
vs wall (quota / below high) is explicit; skill description stops after
writing `docs/reviews/`.

## Domain

N/A — no TBC / WCL / wowsims facts. Findings: none.

## Standards + Spec

`.agents` / `.claude` skill mirrors match. Spec: workhorse vs sharp lanes,
Cursor = Grok high, ask after review summary before land, `pnpm land` only
checks the review file. Matches.

## Summary

| Axis             | Findings  | Worst   |
| ---------------- | --------- | ------- |
| Adversarial      | 4 (fixed) | process |
| Domain           | 0         | —       |
| Standards + Spec | 0         | —       |

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                  |
| --- | ----------- | ----------- | ---------------------------------------------- |
| A1  | Adversarial | fixed       | Parallel path / adapters now ask before land   |
| A2  | Adversarial | fixed       | Dropped same-breath land; separate land ask    |
| A3  | Adversarial | fixed       | Cursor ceiling vs wall clarified               |
| A4  | Adversarial | fixed       | Skill description no longer primes auto-land   |
| D1  | Domain      | wontfix     | No domain surface                              |
| S1  | Spec        | fixed       | Model policy + ask-before-land rules on branch |
