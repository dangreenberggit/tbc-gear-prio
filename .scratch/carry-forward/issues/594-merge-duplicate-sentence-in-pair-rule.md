Status: closed
Type: task
Origin: docs/reviews/feat-pair-rule.md (round 1, W3; independent writing-for-agents review)
Blocks: none
Blocked by: none
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

A second reviewer (round 2, W12) noted that this text drops "never reads
the fork" and the restore steps, and proposed a bullet that points at the
guide for them instead:

```
- **No fork here:** as a worker in a checkout with no `vendor/tbc-new-fork`, stop and report it to whoever sent you; otherwise make a pair. `pnpm verify` refuses such a checkout (plain-worktree steps: docs/agents/paired-worktrees.md).
```

The status is `blocked` because only the owner can choose between the two
texts or keep the current one.

The second text also fixes round-3 finding A13; the first does not.
Today's bullet tells an agent to set `TBC_VERIFY_WITHOUT_FORK=1` without
the two restore commands (`pnpm run sync:wowsims:restore`,
`pnpm run sync:atlasloot:restore`) that `docs/agents/paired-worktrees.md`
lists, so an agent that follows it alone hits the "vitest failures (16)"
that guide records. The first text names the opt-out the same way.

## Done when

The owner picks the first text, the second text, or the current bullet; if
a new text is picked, AGENTS.md has it and `pnpm verify` passes.

## Closed 2026-10-10

The owner chose the second text ("they sound fine", answering
Q-594-wording, option 2, relayed by the coordinating session). AGENTS.md
"Fork and tab edits run in a pair" now has it verbatim in place of the old
"No fork here" bullet. AGENTS.md has no skill mirror, so no other copy
changed. This also closes round-3 finding A13: the bullet no longer gives
the opt-out without the restores; it points at the guide's steps.

Verified by:
`grep -c "plain-worktree steps: docs/agents/paired-worktrees.md" AGENTS.md`
(1); `grep -c "only for work that never reads the fork" AGENTS.md` (1, the
rule's first paragraph only); `pnpm verify` on the closing commit.
