Status: open
Type: observability
Origin: fix-round review of `feat/candidate-pool`, perf axis, 2026-08-15
Blocks: none
Blocked by: none

# The screening pass is invisible to any progress consumer

The racing branch in `packages/core/src/rank.ts` runs `promisePool` over
**every eligible candidate** — 240 sims on the measured fixture — and emits
**no `onProgress` event at all**. The comment says this is deliberate:
`screenCandidate` "does not touch `simsDone`/`totalSims`, which describe the
full-iteration budget a progress bar promises."

That protects the bar's denominator and sacrifices the user. On this branch's
own WASM numbers, 240 screens × 1000 iterations × 3.2446 ms/iter is roughly
**13 minutes during which the UI shows nothing**: `{stage: "building-pool"}`
is the last event before the silence, and `{stage: "simming", done: 0}` only
arrives after screening finishes. The `Progress` union has no screening
variant, so a consumer could not render it even if it wanted to.

It also destroys diagnosability: a hung screen and a slow pool build look
identical from outside.

## Done when

- [ ] A `{stage: "screening", done, total}` progress variant exists and the
      racing pass emits it. It does not perturb the full-iteration
      `done`/`total` contract — that is the point of a separate stage.
- [ ] The fork UI renders it (the `'stopped'` state and `landedRowsTable` are
      the precedent).
