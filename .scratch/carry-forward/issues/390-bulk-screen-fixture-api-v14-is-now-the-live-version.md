Status: closed
Type: defect
Origin: .scratch/stage-gate/upstream-catchup-chunk1/plan-review.md F9
Blocks: none
Blocked by: none

# The bulk-screen fixture's cache-miss case now uses the live API version

Relates to: ADR-0033; branch `feat/upstream-catchup-chunk1`

## What

The engine pin moved to upstream `master` `17a8fb28c5ad14b649acecdaacd488594048f467`
(ADR-0033), and `proto/common.proto` drops `current_version_number` from 15 to
**14**. So `CURRENT_API_VERSION` is now 14.

Two test files hold that version as a self-contained literal:

- `packages/core/test/bulk-screen-http-fixture.test.ts:56` —
  `const RECORDED_SIM_VERSION = "api-v15";`
- `packages/core/test/bulk-screen-driver.test.ts:34` — `const SIM_VERSION = "api-v15";`

Neither is compared against the live `CURRENT_API_VERSION`, so both stay green at
14. The header comment's promise — that a future change to `CURRENT_API_VERSION`
fails here rather than silently invalidating recordings — is therefore false
today.

The sharper half is `bulk-screen-http-fixture.test.ts:167`, which uses
`api-v14` as the deliberate cache-**miss** case:

```ts
new Map([
  [bulkScreenCacheKey(RECORDED_REQUEST, "api-v14"), RECORDED_RESULT],
])
// ... expects: /no recording for bulk screen key/
```

`api-v14` is now the live version. Anyone who later wires the header comment's
promise into reality — comparing these literals against `CURRENT_API_VERSION` —
turns the negative case into a collision, and the test that was meant to prove a
miss would be asserting against the real key.

## Why it is latent rather than broken

The recorded fixtures key on `simVersion` = a **commit sha**, not on the
`api-vN` string, so the proto version drop does not invalidate any recording.
`pnpm verify` on the re-pin tip showed no fixture miss
(`grep -ci 'no recording for sim key'` → 0). Nothing fails today.

## Suggested fix

- Derive the recorded version from `CURRENT_API_VERSION` rather than repeating
  it as a literal, so the header comment's promise becomes true; **or** delete
  the promise from the comment if the literals are deliberate.
- Pick a cache-miss sentinel that cannot collide with a real version (a value
  no `current_version_number` will take, rather than the neighbouring integer).

## Acceptance

- [x] The `api-v15` literals either track `CURRENT_API_VERSION` or the header
      comment no longer claims they do.
- [x] The cache-miss case uses a sentinel that is not a live API version.

## Resolution

Closed 2026-09-15, `feat/desktop-transport-gate` (`df246b38`), fixed in
passing while building ticket 400's verify summary.

`bulk-screen-http-fixture.test.ts`'s `RECORDED_SIM_VERSION` and
`bulk-screen-driver.test.ts`'s `SIM_VERSION` are now both
`` `api-v${CURRENT_API_VERSION}` ``, imported from
`packages/core/src/individual-settings.ts` (the same constant the header
comment already described as the compile-time source of truth). The
cache-miss case in `bulk-screen-http-fixture.test.ts` no longer uses
`"api-v14"` -- now live and no longer a mismatch -- but a new
`IMPOSSIBLE_SIM_VERSION = "api-v-1"`, chosen because `current_version_number`
is a proto int32 field no version will ever populate with `-1`. Both files
pass (`pnpm exec vitest run packages/core/test/bulk-screen-http-fixture.test.ts
packages/core/test/bulk-screen-driver.test.ts`, fork present, 8 tests green).
