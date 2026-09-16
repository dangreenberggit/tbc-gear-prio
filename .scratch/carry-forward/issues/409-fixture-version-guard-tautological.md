# 409 — a fixture test's version guard became tautological (adversarial A3, material)

Status: open
Type: bug
Origin: pre-merge review of feat/desktop-transport-gate, round 3 (2026-09-16)
Blocks: —
Blocked by: none

## What

`packages/core/test/bulk-screen-http-fixture.test.ts:62` sets
`RECORDED_SIM_VERSION = \`api-v${CURRENT_API_VERSION}\``. `:128` builds the
recorded observation with `simVersion: RECORDED_SIM_VERSION`. The assertion
at `:172`, `expect(RECORDED_RESULT.baseline.simVersion).toBe(RECORDED_SIM_VERSION)`,
therefore compares a value to itself through one shared constant and cannot
fail under any `CURRENT_API_VERSION`.

The file's own header comment claims the derivation makes "a future proto
version bump fail this test rather than silently invalidating the
recording". The opposite is now true: a version bump moves both sides of the
assertion together, the test stays green, and the committed DPS numbers
(`2181.6723670119713` and the row values, measured at proto 15) silently
become numbers attributed to a different engine version without the test
noticing.

## What this correctly fixed — do not revert wholesale

This is the fix for ticket 390 (closed 2026-09-15, same branch), which found
the old `"api-v14"` cache-miss sentinel had collided with the live API
version after the proto re-pin. The `IMPOSSIBLE_SIM_VERSION = "api-v-1"`
sentinel introduced alongside this change (`:64-69`) is a correct, durable
fix for that specific collision problem and should stay.

The regression is narrower: deriving `RECORDED_SIM_VERSION` itself from
`CURRENT_API_VERSION`, rather than pinning it to the literal value the
recording was actually measured at, is what turned the version-guard
assertion tautological.

## Fix direction

Pin the recorded version to the literal string it was measured at (e.g.
`"api-v15"`) rather than deriving it from `CURRENT_API_VERSION`. That
restores the assertion's ability to fail on a version bump, while keeping
the `IMPOSSIBLE_SIM_VERSION` sentinel from 390 as-is.

## Sibling file — do not apply the same fix there

`packages/core/test/bulk-screen-driver.test.ts:35` makes the same
`` `api-v${CURRENT_API_VERSION}` `` substitution. There it is harmless: that
file only needs a self-consistent stamp across its own recordings, not a
guard against a version bump silently invalidating a specific committed DPS
number. Do not "fix" that file the same way.

## Relation to ticket 390

390 is closed (fixed on this same branch, `df246b38`). This ticket is a
regression introduced by 390's own fix, not a reopening of 390's original
problem (the `api-v14` collision), so it should stay a **separate** ticket
rather than fold into 390.

## Verify

After pinning `RECORDED_SIM_VERSION` to a literal, bump a local copy of
`CURRENT_API_VERSION` and confirm the assertion at
`bulk-screen-http-fixture.test.ts:172` now fails, then revert the bump.
