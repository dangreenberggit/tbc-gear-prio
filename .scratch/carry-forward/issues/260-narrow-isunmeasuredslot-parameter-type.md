Status: open
Type: task (defence-in-depth; no live bug)
Origin: pre-merge review of fix/worn-item-pool-coverage, 2026-08-22 (adversarial
  axis A4, standards axis S3 — same finding from two directions)
Blocks: none
Blocked by: none

# `isUnmeasuredSlot` accepts a wider type than any caller passes

## The finding

`isUnmeasuredSlot` in `packages/core/src/rank-report.ts` takes
`{ cause?: string } | undefined`. Every call site passes a `DeadSlotWarning`,
whose `cause` is the `DeadSlotCause` union.

The reviewer installed a typo — `"worn-unrankible"` — and
`npx tsc --noEmit -p packages/core/tsconfig.json` **passed clean**, silently
restoring the pre-ticket-253 behaviour of desaturating deltas that are real.

## Why it is not urgent

The new test at `plausibility-report.test.ts` catches it at runtime: reverting
the predicate to `warning !== undefined` fails that test. So the typo would be
caught before merge — just later and less clearly than a compile error.

## The fix

Narrow the parameter to `DeadSlotWarning | undefined` and import the type. That
makes a misspelled cause a typecheck failure rather than a silent behaviour
change. This is **Primitive Obsession** in Fowler's terms: a string standing in
for a union that already exists.

## Acceptance

- [ ] The parameter is typed against the existing union, not a structural
      `{ cause?: string }`.
- [ ] A deliberately misspelled cause fails `pnpm typecheck` — demonstrated, not
      assumed.
