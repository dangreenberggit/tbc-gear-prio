## Status
success

## Branch
phase-1/w-salvage-gems

## Base
- spawned at `25de532f3a5001344494ed74e550d9ef3550c6cc` · expected `25de532f3a5001344494ed74e550d9ef3550c6cc` · corrected: no

## What I did
- Added `packages/core/src/candidate-gems.ts` with `fillCandidateGems`, `gemFillWeights`, and `gemEp` (ported from stash inbox).
- Added `packages/core/test/candidate-gems.test.ts` (unit tests for fill + Kael temp flags).
- Wired `rank.ts`: candidate swaps call `fillCandidateGems` (softcap-aware weights), then `repairMeta` on the full 17-slot set before compose; kept tip's `continue` on sim panic.
- Exported `fillCandidateGems`, `gemEp`, `gemFillWeights` from `packages/core/src/index.ts`.
- Added rank seam test `gem-fills socketed candidates before simming` using `CapturingSimRunner` + recorded sim keys.

## Paths touched
- `packages/core/src/candidate-gems.ts`
- `packages/core/test/candidate-gems.test.ts`
- `packages/core/src/rank.ts`
- `packages/core/test/rank.test.ts`
- `packages/core/src/index.ts`
- `.scratch/stash-salvage/handoffs/gems.md`

## Verification
- `cd packages/core && npx vitest run test/rank.test.ts test/candidate-gems.test.ts` → 10/10 passed
- `rg "gems: \\[\\]" packages/core/src/rank.ts` → no matches
- `rg "prefilterPool|fullPool" packages/core/src/rank.ts` → no matches
- `git stash list | head -1` → stash@{0} still present

## Notes / concerns
- Did **not** restore stash `prefilterPool` / `fullPool`, same-item-owned skip, or magnitude-warning wiring from quarantine rank.ts.
- `MetaUnsolvableError` on a candidate swap throws `RankError("meta-unsolvable")` (same as baseline) rather than skipping the slot — consistent with PLAN §9 spirit.
- Slice B owns any `rank-report` barrel exports; none added here.

## Suggested follow-ups
- Fan-in: merge onto `phase-1/five-seed-spread`; re-run full `pnpm --filter @tbc-gear-prio/core test` or `pnpm verify` on integrated tip.
- Close or update `.scratch/carry-forward/issues/06-candidate-ungemmed-swaps.md` after fan-in.
