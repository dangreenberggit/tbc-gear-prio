Status: closed
Closed: dfe4ae6
Type: bug
Origin: docs/reviews/feat-set-bonus-value.md round 5 (spec 5-S1)
Blocks: none
Blocked by: none

# Ticket 107's gem-substitution disclosure does not reach the package arm

`3539cfe` added per-row `gemSubstitutions` disclosure for the candidate arm.
The set-completion package arm still calls `equipmentForCandidateSwap`
(`packages/core/src/rank.ts:1197`), which discards repair swaps, so package
rows carry no `gemSubstitutions` note.

This is narrower than the pre-fix candidate defect: package rows simply carry
no note, rather than carrying a false one. But PLAN.md section 9 policy item 5
is phrased over adjustments generally, so the shipped disclosure is narrower
than the policy it implements.

## Fix

Route the package arm through `candidateSwapWithRepairs` (or an equivalent
that preserves the swap list) and render the same per-row note. Check the
interaction with ticket 139 first — both touch what a row claims about the
gems it was priced with.

## Resolution (dfe4ae6)

The set-package loop calls `candidateSwapWithRepairs` instead of
`equipmentForCandidateSwap` and accumulates the swaps across every added piece,
excluding those landing on slots the package itself fills.
`SetBonusValue.gemSubstitutions` carries them and `formatSetBonusLine` renders
them as a suffix.

Interaction with ticket 139 (merged, bcbc7fe): no conflict -- 139 touches
`candidateGems` / `metaSocketUnpriced` on the per-item row; this adds a
separate field on the set-bonus row.

    pnpm vitest run packages/core/test/rank-report.test.ts -t "re-cut"
