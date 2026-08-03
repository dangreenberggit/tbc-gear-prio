Status: closed
Type: task
Origin: docs/reviews/phase-0-close-gates.md
Blocks: phase-1
Closed: 2026-07-26

# One source of truth for the 19→17 slot map

## Problem

`WCL_ORDER` / `SIM_ORDER` are duplicated in `scripts/verify_fixture.py` and
`scripts/compose_slamaltman_raid_sim.py`. Compose only asserts three sentinel
slots (head/back/MH). A drift or a partial reorder yields a valid
`RaidSimRequest` and a wrong DPS — PLAN.md's worst case.

## Done when

- Single module (or generated table) owns the mapping; both scripts import it.
- Full 17-slot round-trip assert against the fixture (not three sentinels).
- Phase 1 `slots.ts` is that module (or is generated from the same table).

## Resolution

`packages/core/src/slots-table.json` is the single table. `slots.ts` imports it;
`scripts/slots.py` loads it for verify/compose. Vitest asserts all 17 slamaltman
ids (drop-and-reorder); compose uses the same full round-trip assert.
