Status: closed
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


## Closed 2026-08-23 — moot: racing is gone from the fork engine

Racing was deleted from the fork's ported engine in fork commit `f70378155`
("Remove racing; full-sweep every eligible candidate"), porting core's
`28b00f9` / ADR-0026. `screenCandidate`, the screening progress stage,
`screeningSkips`, the promotion rule and `promotion.ts` are all gone, and E-W3
passes against core with the screening path removed.

There is no screening pass left to reuse outputs from or to emit progress for,
so this ticket describes code that no longer exists. Q1 in the finish-the-tab
plan reached the same place by its pre-stated rule: candidate (c), the full
sweep, wins. The fork-side racing-vs-full-sweep comparison was never measured —
see ticket 273 — but it cannot reopen the deletion, which rests on ADR-0026's
core measurements and the E-W3 parity the removal passed.
