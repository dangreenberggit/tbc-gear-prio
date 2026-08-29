Status: open
Type: test-coverage
Origin: round-6 pre-merge review (adversarial axis), 2026-08-29; feat/upgrades-dedup-wowsims
Blocks: none
Blocked by: none

# The noise-floor VALUE is not pinned by a near-boundary passthrough test

The 331 unit tests in `packages/core/test/view.test.ts` pin the strict `>`
operator (an "exactly 10 → 0" test fails if the operator becomes `>=`) and test
passthrough at 18.039. But the just-above-boundary passthrough is only exercised
at 18.039 — far above the floor.

## The gap (adversarial axis, round 6, offline mutation)

Mutation-testing the four unit assertions: removing the gate fails 3; changing
`>` to `>=` fails the "exactly 10 → 0" test; lowering the floor to 0 fails 2.
But **changing the constant `10 → 15` slips the entire unit suite** — the
operator is pinned, the value is not. A future edit (or a fix from ticket 332
that means to change the value deliberately) could move the floor with no test
turning red to confirm the new boundary is what was intended.

## What a fix would do

Add a passthrough assertion at a value just above the floor (e.g. `10.001 →
passes through unchanged`) and a just-below assertion (e.g. `9.999 → 0`), so the
suite pins the boundary value from both sides, not only the operator. Cheap,
pure-function test additions alongside the existing ones. This makes a
deliberate floor change (ticket 332) a visible, intended test update rather than
a silent slip.
