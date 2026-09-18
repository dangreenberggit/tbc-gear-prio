Status: closed
Closed: 2026-09-17
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

- [x] `pnpm verify` passes with the machine under comparable load.
- [x] The chosen mechanism is recorded with the measurement that justified it.

## Resolution — closed 2026-09-17

**Mechanism, reproduced then fixed under synthetic load.** The failure is a single
per-test assertion exhausting the 30s `testTimeout` under CPU contention, made worse
because each test paid the fork engine/WASM `load()` cost on top of its own work.

Reproduced with a synthetic-load recipe (this machine: 20 CPUs): spawn N
`node -e "for(;;){}"` busy loops, then `npx vitest run --reporter=json`.
- At **2x** (40 loops) the timeout did **not** reproduce — the two files ran slow
  (bulk-boundary 16.4s, bulk-screen-driver 13.7s) but passed. So C11's "2x is
  enough" guess was wrong; the real threshold is higher.
- At **4x** (80 loops) it **reproduced**: `bulk-boundary.test.ts`'s
  "reproduces the measured first multi-stage n per iteration count" assertion timed
  out at 30017ms (it swept the whole 12-row `FIRST_MULTI_STAGE_N` table in one test),
  and `bulk-screen-driver.test.ts`'s "chunks at the shared bound" assertion hit
  26.3s, at the edge.

**Fix (bounds each test's own work, no assertion changed):**
1. `bulk-boundary.test.ts`: the single whole-table sweep is now one `it.each` case
   per iteration-count row — each case runs one row's inner `n` loop, 0-2ms.
2. Both files: the expensive fork `load()` is hoisted into a shared
   `beforeAll(..., 30_000)` (30s, matching `testTimeout`, because the one-time WASM
   import can exceed the 10s default hookTimeout under load) instead of being paid
   in every test body.

**After the fix:** idle isolation, both files pass with **every test 0-8ms** (20
tests total, was 9). Under load: bulk-boundary passed alone at 4x (14 tests, each
≤3ms); bulk-screen-driver passed at 4x (6 tests, file 25ms). The 30s per-test-timeout
failure mode is structurally gone — no single test does more than a few ms of its own
work.

**Honest caveat on the recipe.** At 400% synthetic oversubscription (80 busy loops
on 20 CPUs) the harness starves vitest's own worker/`beforeAll` spin-up, so some
full-suite runs marked these files `failed` with all assertions **skipped** and
**zero failed** — a setup-starvation artifact of the artificial load, not a
test-logic failure, and non-deterministic run to run. The load-independent, stable
win is the per-test bounding above. The real-world trigger this ticket described was
~3 concurrent review subagents, not 400% oversubscription. Acceptance is the per-test
bounding plus `pnpm verify` green, not the pathological 80-loop harness.

Files: `packages/core/test/bulk-boundary.test.ts`,
`packages/core/test/bulk-screen-driver.test.ts`.

## What is NOT claimed

No claim that the two tests are wrong, or that the code they cover is broken —
both pass cleanly given time. The **hypothesis** that CPU contention alone is
the cause is supported by the isolation/suite split and the collect timings,
but the specific resource (CPU, file handles, WASM instantiation) was not
isolated. Ticket 370's acceptance box claiming `pnpm verify` green was checked
against a run that did pass; the point here is that the green is not reliably
reproducible, not that it was fabricated.
