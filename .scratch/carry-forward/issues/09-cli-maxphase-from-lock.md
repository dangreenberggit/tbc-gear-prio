Status: resolved
Type: task
Origin: docs/reviews/phase-1-five-seed-spread.md
Blocks: phase-1
Blocked by: none

# CLI default maxPhase must come from wowsims.lock.json

## Problem

`packages/core/src/cli.ts` defaults `maxPhase: 2` as a literal. The lock
file’s `currentPhase` / `defaultMaxPhase` is the documented single source
of DEFAULT_MAX_PHASE (verification-log / `data/wowsims.lock.json` comment).
When upstream flips phase, the CLI drifts unless every caller passes
`--max-phase`.

## Done when

- Default `maxPhase` is read from `data/wowsims.lock.json` (or the same
  constant the sync script writes).
- No second hardcoded content-tier default in the CLI.

## Resolution (2026-07-28)

`defaultMaxPhaseFromLock()` reads `defaultMaxPhase` (fallback
`currentPhase`) from `data/wowsims.lock.json` and fails closed if missing.
