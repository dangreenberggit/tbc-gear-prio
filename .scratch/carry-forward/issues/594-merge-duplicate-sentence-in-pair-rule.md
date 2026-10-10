Status: open
Type: task
Origin: docs/reviews/feat-pair-rule.md (round 1, W3; independent writing-for-agents review)
Blocks: none
Blocked by: owner approval of the new wording
Related: 593

# Merge the duplicate "never reads the fork" sentence in the pair rule

## What

AGENTS.md "Fork and tab edits run in a pair" says twice that a checkout
with no fork is only for work that never reads the fork: once at the end of
the rule's first paragraph ("use one only for work that never reads the
fork"), and again in the "No fork here" bullet ("set
`TBC_VERIFY_WITHOUT_FORK=1` only for work that never reads the fork").
AGENTS.md is loaded on every turn, so the repeat costs tokens each turn.

## Proposed text (needs the owner's OK)

The owner approved the rule verbatim, so any rewording needs a new approval
(AGENTS.md "Writing for agents"). The reviewer proposed replacing the "No
fork here" bullet with:

```
- **No fork here:** as a worker in a checkout with no `vendor/tbc-new-fork`, stop and report it to whoever sent you; otherwise make a pair. `pnpm verify` refuses such a checkout unless `TBC_VERIFY_WITHOUT_FORK=1`.
```

## Done when

The owner approves or rejects the text above; if approved, AGENTS.md has
it and `pnpm verify` passes.
