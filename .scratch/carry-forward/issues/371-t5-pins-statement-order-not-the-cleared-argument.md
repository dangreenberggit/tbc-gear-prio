Status: open
Type: task
Origin: docs/reviews/feat-tickets-369-370.md (adversarial axis)
Blocks: none
Blocked by: none

# T5 pins the statement order but not the `cleared` argument

## The gap

Ticket 370 added T5 to `packages/core/test/two-hander-clears-offhand.test.ts` to
guard that `clearOffHandForTwoHander` runs before `swapItemAt` in
`candidateSwapWithRepairs` (`packages/core/src/rank.ts`). It does that. It does
not guard the property the ordering exists to protect.

`swapItemAt` computes its gem-fill options by calling `fillOptsForSwap` with the
array it was **handed** (grep `fillOptsForSwap(equipment, slotIndex` inside
`swapItemAt`). So there are two ways to break the same behaviour:

1. Reverse the two statements — clear after the swap. **T5 catches this.**
2. Leave the statement order alone and pass `equipment` instead of `cleared`
   into `swapItemAt`. **T5 does not catch this**, and the wrong gem set is
   identical: the removed off-hand's unique gem is swept into `usedUnique`
   either way, so `candidate-gems.ts` (grep `gem.unique && usedUnique.has`)
   skips it for the candidate's own socket.

The comment added above the call overclaims as a result. "Reversing these two
statements fails only that test" is true, and is not the same claim as "this
ordering is guarded."

## Evidence

Reversing the statements **and** passing the uncleared array — the mutation the
review ran — turns T1, T2, T4 and T5 red:

```
$ npx vitest run packages/core/test/two-hander-clears-offhand.test.ts
  × T5 — the removed off hand's unique gem is free for the candidate's own socket
    → expected 24033 to be 34831
  Tests  4 failed | 2 passed (6)
```

Ticket 370's own narrower mutation (statement order only, `cleared` still
passed) turns **only T5** red, which is what established T5 as the
discriminating test. Neither mutation is variant 2 above; nothing has yet run
it.

## What to do

1. Write the `fillOptsForSwap`-level test ticket 370 originally recommended and
   the resolution declined: assert `usedUnique` excludes the gems of the slot
   `clearOffHandForTwoHander` removed. `fillOptsForSwap` is module-private —
   either export it, or assert the same property through
   `candidateSwapWithRepairs` in a way that fails under variant 2.
2. Prove it by applying variant 2 (pass `equipment` where `cleared` belongs,
   statement order untouched) and watching the new test go red. Reasoning that
   it would is not enough — that is the same shortcut that left this gap.
3. Trim or correct the `rank.ts` comment so it claims only what is guarded.

## Acceptance

- [ ] A test fails under variant 2 (`equipment` passed instead of `cleared`).
- [ ] The red was observed, with the command and output recorded.
- [ ] The `rank.ts` comment matches what the tests actually pin.
- [ ] `pnpm verify` green.

## What is NOT claimed

The shipped behaviour is correct. `candidateSwapWithRepairs` on `dev` clears
first and passes `cleared` — verified by reading it and by T5 passing 6/6 at
the branch tip. This is a gap in the guard, not a defect in the code, and it is
the same shape as the gap ticket 370 was itself filed to close.
