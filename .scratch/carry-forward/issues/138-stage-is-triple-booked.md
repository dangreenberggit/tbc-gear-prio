Status: open
Type: task
Origin: docs/reviews/docs-terminology-cleanup-plan.md

# "stage" means three things, and CONTEXT.md documents two

## Problem

Found by the independent commentator (C2). The terminology cleanup promoted
**Stage** to the primary word for a delivery step. That word was already carrying
two other jobs in this repo:

1. **A delivery step** — `Stage 0`–`Stage 5+` (`PLAN.md` §14). New, from this
   cleanup.
2. **A step in the `rankUpgrades` pipeline** — "the eight stages", "stage
   internals" (`PLAN.md` §3, `AGENTS.md`).
3. **A game content tier** — and this is the one nobody scoped:
   - `packages/core/src/pool.ts:123-129` — "regardless of stage. Full
     provenance: an item curated only for an earlier stage keeps this and loses
     `bisTags`"
   - `packages/core/src/rank-report.ts:585` — "the rows can carry an older
     stage's list"
   - `scripts/check_curated_set_phase.py:4` — "produces the curated-set **stage**
     labels", and its `pnpm verify` line prints `curated set phase mirror ok:
     4 stages in step`, where "stages" means P1–P4.

Sense 3 is the same collision the cleanup existed to remove, wearing the new
word. The cleanup did not create it — none of those files were touched — but it
made "stage" the delivery word without noticing the collision existed.

**`CONTEXT.md` currently documents senses 1 and 2, and resolves them with a
capitalisation rule**: capital `Stage N` is delivery, lowercase is the pipeline.
That is the exact mechanism `CONTEXT.md`'s own banned-words section spends a
paragraph explaining does not work — it is what review R2 tried for "phase" and
what this whole cleanup replaced.

## Why it was not fixed on the branch

It is a judgment call about vocabulary, not a defect introduced by the rename,
and the files carrying sense 3 are engine code outside the cleanup's scope.
Fixing it properly means choosing new words and touching `pool.ts`,
`rank-report.ts` and a Python check — which is a change with its own risk and
deserves its own branch.

## Options

- **(a) Rename sense 2 to "pipeline step"** in prose, keeping "stage" for
  delivery and leaving sense 3 alone. Cheapest. Leaves the content-tier sense
  colliding.
- **(b) Rename sense 3 to "tier"** in `pool.ts`, `rank-report.ts` and
  `check_curated_set_phase.py`, matching the vocabulary this cleanup already
  established for content releases. That is the sense most likely to mislead,
  since it is the same axis as `maxPhase`. Touches engine comments and one
  check's output string.
- **(c) Both**, and delete the capitalisation rule from `CONTEXT.md`.

Recommend (c). The capitalisation rule should go regardless of the rest — it is
the one place the glossary contradicts itself.

## Verify

    git grep -niE "\bstages?\b" -- packages/ scripts/ PLAN.md AGENTS.md

Every hit should be unambiguous from the sentence alone, without needing the
capitalisation of the word to disambiguate it.
