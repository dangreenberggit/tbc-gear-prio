Status: open
Type: task
Origin: docs/reviews/fix-carry-forward-backlog.md (adversarial A4, A5)
Blocks: none
Blocked by: none

# Two tests on this branch pass by construction

Both were added by this branch's ticket work and both assert something that
cannot fail. Neither is a correctness bug; both are the "test theatre" the
adversarial brief weighs equally with one.

## 1. `packages/core/test/spec.test.ts:100` — name promises what the body cannot do

```
it("flags a mismatch when talents classify cleanly to a different supported spec", …)
```

The body asserts `classifySpec("Paladin", [20, 20, 5])` — an **ambiguous**
split, not a clean classification to another spec — and its own comment
concedes it is testing something else, because ret is the only shipped spec.
It then asserts `{ matches: false, detected: undefined }`, the identical value
three of the five tests in the block assert.

Consequence: the `{matches: false, detected: <other spec>}` branch — the only
branch distinguishing `matchesRequestedSpec` from a bare equality check — is
never exercised.

Fix: rename the test to what it checks, and either add the real case behind a
second supported spec or mark it `it.todo` so the gap is visible. Related to
ticket 61 (the function has no production caller either).

## 2. `packages/core/test/view.test.ts:361` — tautological after ticket 36

```
it("is measured on belowCutoffInView, not on the ranking's own flag", …)
```

Ticket 36 closed the cutoff as absolute (ADR-0020) and collapsed the
recomputation, so `view.ts:214` now assigns:

```ts
.map((item) => ({ ...item, belowCutoffInView: item.belowCutoff }))
```

The two fields cannot disagree; the test's own comment says "The two always
agree." It passes by construction.

The genuine version of this assertion already exists and is well built —
`rank.test.ts:1899` engineers a paired-replicate crossing rather than
recomputing the expected value. This ticket is only about the redundant one.

Fix: delete it, or rewrite it to pin the *invariant* (that `applyView` carries
the flag rather than re-deriving it) in a way that would fail if someone
reintroduced a recomputation.

## Done when

- `spec.test.ts:100` is renamed to its actual assertion, with the untested
  branch either covered or explicitly `todo`.
- `view.test.ts:361` is deleted or rewritten so it can fail.
- `pnpm verify` stays green.

## Note 2026-08-07 (ticket 61's work)

Ticket 61 wired the guard into `rankUpgrades` and this ticket's finding 1 got
sharper as a result, without being fixed.

Measured while implementing 61 — the reason the named-`detected` branch is
hard to test is not test laziness, it is that **nothing reaches it today**:

```
Paladin prot [0,44,17] -> unsupported-spec  (detected: undefined)
Paladin holy [45,11,5] -> unsupported-spec  (detected: undefined)
Druid feral  [0,45,16] -> needs-form-uptime (detected: undefined)
```

`{matches:false, detected:<other spec>}` requires **two supported specs on one
class**, and ret is the only supported paladin spec. So the branch is
unreachable from any real input until a second spec ships for some class, and
`spec.test.ts:100`'s comment saying so was accurate — its *name* was the
problem, not its coverage.

Revised fix for finding 1: rename the test to what it asserts, and mark the
real case `it.todo` so the gap is tracked rather than looking covered. Do not
try to force the branch with a synthetic classification object — that would
test the mock, not the classifier.

Finding 2 (`view.test.ts:361`) is unchanged by 61's work.
