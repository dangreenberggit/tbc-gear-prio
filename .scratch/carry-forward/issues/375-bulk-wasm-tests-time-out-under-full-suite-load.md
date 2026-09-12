Status: open
Type: bug
Origin: docs/reviews/feat-tickets-369-370.md (spec axis; reproduced by the orchestrator)
Blocks: none
Blocked by: none

# Two bulk WASM tests time out under full-suite load

## The symptom

`packages/core/test/bulk-boundary.test.ts` and
`packages/core/test/bulk-screen-driver.test.ts` fail under `pnpm verify` with

```
Error: Test timed out in 30000ms.
```

and pass in isolation. Measured twice, independently:

```
$ npx vitest run packages/core/test/bulk-boundary.test.ts packages/core/test/bulk-screen-driver.test.ts
  Test Files  2 passed (2)
       Tests  9 passed (9)
   Duration  6.04s                       # rc=0
```

versus, in the same tree minutes earlier, a full `pnpm verify`:

```
  Test Files  2 failed | 61 passed (63)
       Tests  2 failed | 1278 passed | 1 skipped | 2 todo (1283)
   Duration  60.29s (collect 244.85s, tests 342.24s)
```

The spec axis of the `feat/tickets-369-370` review reached the same result
separately (5.4s in isolation, timeout under the suite).

## Why it is not this branch

Neither file, nor anything they import, appears in the diff that surfaced it
(`624eb3c...3398f7d` touches `rank.ts` by three comment lines plus one test
file and five docs/data files). Both tests sit under
`describe.skipIf(!forkPresent)` and begin with an `await load()` of fork
modules, so they pay a WASM/module-load cost that a loaded machine can push
past the 30s default.

The `collect 244.85s` against a 60s wall clock is the tell: collection was
heavily parallel and contended. The runs that failed had three review
subagents working the same checkout concurrently.

## What to do

1. Decide whether the fix is a per-test `testTimeout` on these two files, a
   pool/concurrency constraint for the fork-loading tests, or hoisting the
   `await load()` cost into a shared setup.
2. Whichever is chosen, prove it under load rather than in isolation — an
   isolated green is what this ticket already has and it is not the failing
   condition.

## Acceptance

- [ ] `pnpm verify` passes with the machine under comparable load.
- [ ] The chosen mechanism is recorded with the measurement that justified it.

## What is NOT claimed

No claim that the two tests are wrong, or that the code they cover is broken —
both pass cleanly given time. The **hypothesis** that CPU contention alone is
the cause is supported by the isolation/suite split and the collect timings,
but the specific resource (CPU, file handles, WASM instantiation) was not
isolated. Ticket 370's acceptance box claiming `pnpm verify` green was checked
against a run that did pass; the point here is that the green is not reliably
reproducible, not that it was fabricated.
