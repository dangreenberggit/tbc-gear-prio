Status: closed
Closed: 2026-10-17, stage tab-follow-ups
Type: task
Origin: pre-merge review feat/tab-source-labels, V1
Blocks: none
Blocked by: none
Serves: .scratch/plans/upgrades-tab-finish-line.md, Tab-adjacent follow-on (gate reliability)
Related: 221, 628

# `pnpm verify` fails on a vitest RPC timeout while every test passes

## What an agent sees

`pnpm verify` exits 1 with "vitest exited nonzero, but its JSON report lists
no failed test or file". Run directly, `corepack pnpm exec vitest run` from
the repo root prints `Test Files 67 passed (67)`, `Tests 1503 passed | 2 todo`,
`Errors 1 error`, and the error is
`Error: [vitest-worker]: Timeout calling "onTaskUpdate"`.

On 2026-10-16, at `tbc-gear-prio@02058d5f` in the pair
`tbc-wt/tab-source-labels` (Node v22.17.1), two `pnpm verify` runs in a row
failed this way and a third passed (`gates: 1539 ran, 0 skipped`). The same
branch passed verify at `ed8beb00` and `154f1223`. The commits between those
tips and `02058d5f` change one fork test file, the fork lock,
`data/sim-implemented-effects.json` and the review file, none of them a core
test.

## Likely cause (hypothesis, untested)

Ticket 221's resolution records the same error: a long microtask chain
starved vitest's reporter RPC until the run failed. The longest suite in the
failing run was `packages/core/test/fork-meta-repair.test.ts` (93.5 s; its
case 535-O1, `fork-meta-repair.test.ts:816`, took 69.1 s). That this suite
starves the RPC is a hypothesis, untested; machine load may also add to it.

## Done when

- The suite that starves the RPC is found (for example by running the
  candidate suites alone and in the full run, several times each).
- It yields to the event loop (as ticket 221's `setImmediate` fix did) or the
  cause is otherwise removed, and five full `pnpm verify` runs in a row pass.

## Resolution

### Cause

Case 535-O1 (`packages/core/test/fork-meta-repair.test.ts`) ran one
synchronous loop over every repair job: one `await` before the loop, none
inside it. In the 2026-10-17 profile, 69% of its window was the fork's
production search (`bestMinimalRepair` and `candidateSwapWithRepairs`), 16%
garbage collection and 11% the brute-force oracle (research report
`2026-10-17-general-task-683-o1-profile.md`, gitignored, under
`.scratch/agent-reports/` in the main checkout).

vitest 3.2.7's worker sends `onTaskUpdate` to the main process as a birpc
request with a fixed 60 s timer (`DEFAULT_TIMEOUT = 6e4`; the pools set no
other value). The worker reads the reply only between event-loop turns. When
a synchronous stretch holds the worker past the 60 s mark, the timer fires
first and the run fails with `Timeout calling "onTaskUpdate"`, although
every test passes. In the failing run 535-O1 took 69.1 s under load. On
2026-10-17 it took 34.8-42 s alone and 45.6 s in a passing full run
(research report `2026-10-17-general-task-gates-678-679-683.md` § C).

The work grows with the fixtures: 85 repairs and 24.9 s when the case was
written (ticket 535), then 144, then 182 repairs after fixture re-records
(`808f0c7f`).

### The mechanism shown in scratch (stage tab-follow-ups P3 step 21)

A scratch test file (deleted, never committed) held two tests in one
`describe`: the first waits 200 ms and passes; the second busy-waits.

- The plan's red run did not reproduce. A plain 65 s busy-wait, then a 90 s
  one, both passed with rc 0 and no `Timeout calling` line. A third try that
  awaited `setImmediate` before the 65 s busy-wait also passed.
- Red reproduced when the busy-wait started inside an I/O completion
  (`await readFile(...)`) and the test sent one worker request just before
  it (`__vitest_worker__.rpc.onTaskUpdate([], [])`). Both tests passed, and
  the run exited 1:

  ```
  Error: [vitest-worker]: Timeout calling "onTaskUpdate"
   ❯ Object.onTimeoutError node_modules/.pnpm/vitest@3.2.7_.../vitest/dist/chunks/rpc.-pEldfrD.js:53:10
   ❯ Timeout._onTimeout node_modules/.pnpm/vitest@3.2.7_.../vitest/dist/chunks/index.B521nVV-.js:59:62
   ❯ listOnTimeout node:internal/timers:588:17
   ❯ processTimers node:internal/timers:523:7
   Test Files  1 passed (1)
        Tests  2 passed (2)
       Errors  1 error
  ```

- Green: the same test with the 65 s split into 13 chunks of 5 s and
  `await new Promise((r) => setImmediate(r))` between chunks passed with
  rc 0 and no `Timeout calling` line:

  ```
   ✓ scratch 683 rpc > busy-waits 65 s as 13 chunks of 5 s after an I/O completion  65001ms
   Test Files  1 passed (1)
        Tests  2 passed (2)
  ```

Why the plain busy-wait does not fail (hypothesis, untested): the libuv
event loop in Node 22 runs expired timers after it polls for I/O, so a
stretch that starts from a timer callback lets the queued reply in before
the timer fires. A stretch that starts inside an I/O callback reaches the
timer before the next poll, and the reply arrives too late. A busy main
process makes the reply slower, which fits the failure appearing only in a
full `pnpm verify`.

### Fix

`yieldToEventLoop()` (one `setImmediate` await) runs at the top of every
535-O1 job, the pattern ticket 221 used (`705589e6`). The case also logs
its longest job. No assertion and no pinned figure changed: the file has
112 `expect(` calls before and after.

### Measured

`corepack pnpm exec vitest run packages/core/test/fork-meta-repair.test.ts --reporter=verbose`
at `tbc-gear-prio@6a86ef98`: rc 0, 30 passed, `[535-O1] wall 41.6 s`,
`[535-O1] longest job feral-p3-th-hands-legs set 639 0.7 s`. A job now
holds the worker for under 1 s, so the bound no longer depends on how many
repairs the fixtures hold.

Five `pnpm verify` runs in a row at `tbc-gear-prio@6a86ef98`, none with a
`Timeout calling` line:

- run 1 rc=0, wall 240 s, `gates: 1542 ran, 0 skipped`
- run 2 rc=0, wall 227 s, `gates: 1542 ran, 0 skipped`
- run 3 rc=0, wall 225 s, `gates: 1542 ran, 0 skipped`
- run 4 rc=0, wall 223 s, `gates: 1542 ran, 0 skipped`
- run 5 rc=0, wall 225 s, `gates: 1542 ran, 0 skipped`

`pnpm verify` runs vitest with `--reporter=json` into a temporary file that it
deletes on success (`scripts/run_verify.mjs:143-152`, `:232`), so its log holds no
test console output and no `[535-O1]` line; the two `[535-O1]` lines above
come from the standalone vitest run. rc 0 is the evidence: the timeout makes
vitest exit 1, which fails verify.

Stage tab-follow-ups P1 and P2 recorded no occurrence of this failure in
their verify runs (Seams S6).

### Dropped

- One `it` per fixture: it bounds the stretch by fixture size, which
  tripled in ten days.
- A longer RPC timeout: vitest exposes no option for it, and it would hide
  the starved reply instead of removing it.
- Dropping the duplicate `d + 1` search at `fork-meta-repair.test.ts:886`:
  about 6 s of 34 s (hypothesis, untested), and it leaves the long stretch.
  It stays a possible speed-up; it is not done here.

Verified by: `corepack pnpm verify` (five runs) and
`corepack pnpm exec vitest run packages/core/test/fork-meta-repair.test.ts --reporter=verbose`
at `tbc-gear-prio@6a86ef98`.
