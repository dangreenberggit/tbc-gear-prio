Status: open
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
