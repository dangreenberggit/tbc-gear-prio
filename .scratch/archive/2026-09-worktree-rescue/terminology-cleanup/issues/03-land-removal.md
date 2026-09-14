# 03 — Remove jargon "land"

Type: task
Status: open
Assignee: 1 × sonnet
Blocked by: 02

Fourteen sites. Too few to parallelise, too contextual for haiku — "land" is
doing three different jobs and three sites are legitimate English that must
survive untouched.

**Note:** there is no git-merge usage of "land" anywhere in this repo. The term
is pure prose drift, which makes this cheap. The `CONTEXT.md` ban still matters
for future writing: say "merge to main", never "land it".

## Constraints

> No behaviour changes. Prose only, plus one Python comment.
> Do not touch `.agents/**`, `.claude/**`, `test/fixtures/**`.
> Preserve surrounding markdown emphasis, links and line width.
> Where a rewrite is awkward, prefer recasting the clause over forcing a synonym.

## DO NOT TOUCH — literal, correct English

These describe enchant names landing on gear slots. Correct usage. Leave them.

- `PLAN.md:589` — "the names must land on the slots they describe"
- `docs/verification-log.md:46` — "names have to land on the slots they describe"
- `scripts/verify_fixture.py:257` — "note the enchant names land on the slots"

## Sites to fix

Suggested rewrites — apply judgment, keep the sentence reading naturally.

**Meaning: "is built in" / "belongs to"**

- `PLAN.md:803` — "`applyView` lands here rather than in Stage 3 on purpose"
  → "`applyView` is built here rather than in Stage 3 on purpose"
- `PLAN.md:271` — "the complexity doesn't spread across callers, it lands back
  in one file" → "…it collapses back into one file"

**Meaning: "must ship by"**

- `PLAN.md:690` — "must land in Stage 2 at the latest"
  → "must ship in Stage 2 at the latest"

**Meaning: "was incorporated into"**

- `PLAN.md:7` — "the corrections landed in the pool, the preset pipeline…"
  → "the corrections were applied to the pool, the preset pipeline…"
- `PLAN.md:825` — "you find out it landed because `sync_wowsims.py --check`
  reports `CURRENT_PHASE` moved" → "you find out it shipped because…"

**Meaning: "arrives at" / "fits into"**

- `PLAN.md:739` — "our output lands in an existing loot workflow"
  → "our output drops into an existing loot workflow"
- `PLAN.md:709` — "Rows fill in as sims land."
  → "Rows fill in as sims finish."

**Meaning: "fell on" (a fight) — near-literal, still worth clarifying**

- `PLAN.md:881` — "both probe runs landed on the same fight"
  → "both probe runs covered the same fight"

## PLAN-REVIEW.md — BLOCKED, see spec §6

`PLAN-REVIEW.md` is a historical record of a completed review. Editing it
rewrites the past. **Default is to leave all three sites alone.** Do not touch
them unless the human has explicitly chosen option (b) or (c) in spec §6.

- `PLAN-REVIEW.md:64` — "our output lands in an existing loot workflow"
- `PLAN-REVIEW.md:674` — "it can land any time after the pool and BiS tags"
- `PLAN-REVIEW.md:693` — table header `| Finding | Landed in |`

## Report back

List every rewrite as `file:line` — before → after. The human reviews the diff
before the commit; prose edits to a planning document deserve a read.

## Done when

- [ ] All nine in-scope sites rewritten
- [ ] The three literal sites verifiably untouched (`git diff` shows no change)
- [ ] `PLAN-REVIEW.md` untouched (unless §6 was re-ruled)
- [ ] `pnpm verify` passes
- [ ] Rewrites reported and reviewed
- [ ] Committed
