Status: open
Type: task
Origin: stage-gate cleanup-upstream-footprint, plan revision 4, step D3, 2026-10-08 (`.scratch/stage-gate/cleanup-upstream-footprint/plan.md`; gitignored, owner's checkout); the remainder of ticket 568 item 3 (pre-merge review of `feat/upstream-react-port`, finding S9)
Blocks: none
Blocked by: none
Related: 568

# Share the browser-driving helpers between the two tab harness scripts

## What is there

Both scripts in `scripts/tab-harness/` define their own copies of the same
Chrome DevTools helpers:

| Helper         | `test-tab-harness.mjs` | `run-tab-cdp.mjs` |
| -------------- | ---------------------- | ----------------- |
| `freePort`     | `:49` (exported)       | `:123`            |
| `findChromium` | `:60` (exported)       | `:134`            |
| `launchChrome` | `:206` (exported)      | `:144`            |
| `cdp`          | `:262` (exported)      | `:188`            |
| `evaluate`     | `:353` (exported)      | `:237`            |

Re-run: `grep -n -E "function (freePort|findChromium|launchChrome|cdp|evaluate)\b" scripts/tab-harness/test-tab-harness.mjs scripts/tab-harness/run-tab-cdp.mjs`.

The copies differ: `test-tab-harness.mjs`'s `cdp` takes a `callTimeoutMs`
option, and `run-tab-cdp.mjs`'s `evaluate` takes a `sessionId`. A fix to one
copy does not reach the other.

Ticket 568 planned this sharing for when the scripts moved. They now sit side
by side in this repo (port commit `152f591e`), so the sharing no longer
touches the fork.

## Done when

`run-tab-cdp.mjs` imports the helpers from `test-tab-harness.mjs` (or both
import a shared module in `scripts/tab-harness/`), the differences above are
kept as options, and `pnpm layout-gate:check`, `pnpm tab-review` and
`pnpm desktop-gate:check` still pass.
