Status: closed
Closed: invalid — premise falsified by measurement, 2026-09-11
Type: task
Origin: docs/reviews/feat-tickets-369-370.md (adversarial axis)
Blocks: none
Blocked by: none

# T5 pins the statement order but not the `cleared` argument — WRONG

## The claim, and why it is false

The adversarial axis reported that T5 in
`packages/core/test/two-hander-clears-offhand.test.ts` guards only the
statement order in `candidateSwapWithRepairs`, and that a second way of
breaking the same behaviour would slip past it:

> Leave the statement order alone and pass `equipment` instead of `cleared`
> into `swapItemAt`. **T5 does not catch this.**

That was reasoned, not run. It is false. Applying exactly that mutation —
`swapItemAt(equipment, ...)` at `rank.ts:2116`, both statements left in their
original order — and running T5 alone:

```
$ npx vitest run packages/core/test/two-hander-clears-offhand.test.ts -t "T5"
  × T5 — the removed off hand's unique gem is free for the candidate's own socket (ticket 370)
    → expected 24033 to be 34831 // Object.is equality
  Tests  1 failed | 6 skipped (7)
```

T5 goes red. The full file under the same mutation fails T1, T2, T4 and T5 —
four guards, not zero.

## Why the reasoning went wrong

The axis argued the removed off-hand's unique gem "is swept into `usedUnique`
either way". True of `fillOptsForSwap` in isolation, and irrelevant to T5:
T5 asserts on `outcome.equipment[MAINHAND].gems`, the gems the candidate ends
up wearing. Passing the uncleared array changes that outcome exactly as
reversing the statements does, because both feed `swapItemAt` an array where
the off hand is still worn. The two mutations are different routes to one
wrong gem set, and T5 observes the gem set.

## What was tried, and reverted

A T6 was written to close the claimed gap: it exported `fillOptsForSwap` and
asserted `usedUnique` excluded the cleared slot's gems. Under the variant-2
mutation **T6 passed** — it built its own arrays and called `fillOptsForSwap`
directly, so nothing `candidateSwapWithRepairs` did could affect it. A
tautology that guarded nothing. T6 and the export were reverted; the module's
public surface is unchanged.

## What was kept

The comment above the call in `rank.ts` now says T5 covers both mutations,
which is what the measurement shows, rather than the narrower claim the axis
objected to.

## What is NOT claimed

No claim that T5 covers every possible way of breaking this composition —
only the two named mutations were run. The shipped behaviour is correct and
was correct throughout; nothing in this ticket ever described a defect in
`dev`.
