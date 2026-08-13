Status: open
Type: bug
Origin: docs/reviews/feat-set-bonus-value.md round 5 (process P1)
Blocks: none
Blocked by: none

# Review rounds chain to the previous review sha, so fix commits go unreviewed

Every round on `feat/set-bonus-value` set its lower bound to the previous
round's **review sha** rather than its **fix sha**. Fixes applied *in response
to* a round therefore land between the two and are never picked up. Three
windows on this branch, each verified with `git merge-base --is-ancestor`:

**Gap A — `a38fbf4..5d5dffa` (19 commits).** The round-5 work itself
(tickets 107/135/136, per-spec preferred meta, the `--spec` collapse). No
review axis ran over it; `grep -riE 'round[- ]5' docs/reviews/` returned
nothing before this round, and the review file's last edit (`9c90dba`)
predates every round-5 commit. Its only coverage was a self-authored execution
log written by the agent that wrote the code. Round 5 of the review (this one)
closes Gap A.

**Gap B — `3adbe4f..3f5e21b` (13 commits, ~119/12 lines of source).** Round 4
asserts "rounds 1-3 covered `dev..3f5e21b`". That claim is false. The five
round-3 fix commits are ancestors of `3f5e21b` but postdate round 3's
reviewed-at sha `3adbe4f`:

    102b425  Disclose the self-set 2pc confound on a 4pc set-bonus row
    2f29cf9  Fix package-only chip reveal outranking the source
    3935d05  Fix stale docstrings and test name
    29a2f6c  Narrow ADR-0023 decision 5
    034cb0e  Restore package.json to LF

They touch `rank.ts`, `set-value.ts`, `rank-report-rules.ts`,
`rank-report-css.ts`, `gems.ts`. **Still unreviewed.**

**Gap C — `cfc77c9` itself.** Round 3's range `cfc77c9...HEAD` excludes its own
lower bound — the commit that fixed round 2's two high-severity silent-failure
bugs. **Still unreviewed.**

`pnpm merge-ready` passes green over all three: it checks only that a review
file exists and that defer rows link open tickets. It has no notion of
commit-range coverage. AGENTS.md already warns that the gate does not run the
review; this is the concrete failure that warning describes.

## Fix

Two parts, and the second is what stops it recurring.

1. **Close gaps B and C**: run a review round over `3adbe4f..3f5e21b`
   (inclusive of `cfc77c9`). ~800 lines of real content across both gaps when
   combined with anything still outstanding.

2. **Change the chaining rule** in `.agents/skills/pre-merge-review/SKILL.md`
   and its `.claude/` mirror: a round's lower bound is the previous round's
   **last fix commit**, not its review sha — or, more simply, each round
   records the sha it reviewed *through* and the next round starts there.
   Consider having `check_merge_ready.py` verify that the union of reviewed
   ranges covers `dev..HEAD`, which would have caught all three gaps
   mechanically.
