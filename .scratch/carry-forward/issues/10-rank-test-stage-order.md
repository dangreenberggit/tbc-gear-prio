Status: resolved
Type: task
Origin: docs/reviews/phase-1-five-seed-spread.md
Blocks: none
Blocked by: none

# rank.test.ts asserts Progress stage sequence

## Problem

`AGENTS.md` Testing bans asserting on stage internals so the eight stages
stay reorganisable. `packages/core/test/rank.test.ts` expects the full
`Progress.stage` sequence (`resolving` … `ranking`).

## Done when

- Tests assert observable ranking outcomes / seam behaviour, not the
  ordered list of stage names (or the stage-order assertion is removed).

## Resolution (2026-07-28)

Removed the `stages` callback and sequence expectation from the empty-pool
seam test; it still asserts baseline, cutoff, assumptions, and substitutions.
