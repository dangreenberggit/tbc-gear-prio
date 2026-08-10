Status: open
Type: task
Origin: docs/reviews/phase-2-trust.md (adversarial axis)
Blocks: none
Blocked by: WclGearSource / going-live plan (PLAN.md §14 Phase 3) — not yet built

# Four `RankErrorKind` variants are declared but never constructed; `RecordedGearSource.readGear` throws a bare `Error` that escapes `RankError` handling

`RankErrorKind` (`rank.ts` ~113-134) declares `character-not-found`,
`gear-unreadable`, `wcl-budget-exhausted`, `not-implemented` — none are
constructed anywhere in `packages/core/src`. Not a silent-failure risk today
(`cli.ts` ~497 prints `err.kind` generically rather than switching on it),
but the union currently overstates what the engine can tell a caller.

Separately: `RecordedGearSource.readGear` (`seams/gear-source.ts` ~148)
throws a bare `Error` for exactly the condition `gear-unreadable` exists to
name. That bare error escapes the CLI's `instanceof RankError` branch and
surfaces as an unhandled stack trace instead of a clean message.

## What to do

Wait for a real `GearSource` implementation (the live WCL adapter, per
PLAN.md's flagged-not-planned Phase 3 item) to know which of these four
kinds are actually reachable and what should throw them. Fixing this
speculatively now risks inventing error paths nothing exercises. At minimum,
`RecordedGearSource.readGear`'s bare `Error` should become a `RankError`
with kind `gear-unreadable` when that work happens.
