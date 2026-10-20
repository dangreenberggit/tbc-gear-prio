Status: open
Type: task
Origin: docs/reviews/phase-2-trust.md (adversarial axis)
Blocks: none
Blocked by: none

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

## Comments

### 2026-10-19 — kept open in ticket housekeeping

Kept open: the fork's ported `engine/rank.ts:281-287` declares the same four kinds, of which three are still never constructed (`not-implemented` is now thrown at `model/run.ts:75` and handled at `utils/format.ts:157`), and `engine/seams/gear-source.ts:104` the same bare `Error` (tbc-new-fork@bc3cca6a1); no fork code constructs `RecordedGearSource`, and the `Blocked by:` Warcraft Logs source will not be built (scope ruling, `PLAN.md:934`).

### 2026-10-19 — next step (pre-merge review of `chore/ticket-housekeeping`, A4/P1)

The old `Blocked by:` line named the Warcraft Logs `GearSource`, which will not be built (`PLAN.md:934`), so it could never clear; it is now `none`. The "What to do" section above no longer applies. Next step in the fork: remove `character-not-found`, `gear-unreadable` and `wcl-budget-exhausted` from `RankErrorKind` in `ui/features/upgrades/model/engine/rank.ts`, or mark this wontfix if dead-union cleanup is judged out of scope.
