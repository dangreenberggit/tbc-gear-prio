Status: closed
Type: bug
Origin: Step 6 of the batch-sim local track (stage-gate, 2026-09-01)
Blocks: none
Blocked by: none

# Stop does not cancel an in-flight bulk screening chunk, on either transport

Group: `.scratch/upgrades-tab-sim-followups/README.md`

## What

The Upgrades tab's Stop button cannot interrupt the bulk screening pass. Pressing
it during screening leaves the in-flight chunk running to completion on the
server (or in the WASM tournament), and the user waits for work they asked to
cancel. This affects **both** bulk runners — it is a property of how Stop is
wired, not of either transport.

Stop's entire handler is one line (`upgrades_tab.tsx:939-941`):

```ts
this.stopButton.addEventListener('click', () => {
    this.abortController?.abort();
});
```

That `AbortSignal` reaches `rankUpgrades` as `deps.signal`, where it gates the
per-candidate dispatch loop. It never reaches either bulk runner's
`SimSignalManager`:

- `BulkWasmSimRunner` holds a private `bulkSignals = new SimSignalManager()`
  (`adapters/bulk_wasm_sim_runner.ts`).
- `BulkHttpSimRunner` holds its own, the same way
  (`adapters/bulk_http_sim_runner.ts`).

Both create per-chunk signals with `registerRunning(RequestTypes.BulkSim)` and
pass them into the call, so the plumbing on the runner side is correct and
complete. Nothing ever calls `abortType` on either manager, and neither manager
is reachable from the tab, so those signals are only ever triggered by the
runner itself — which is to say never.

`rank.ts`'s screening pass is a **single** `runBulkScreen` call for the whole
attempt set, so there is also no per-chunk gap in the engine where an
`AbortSignal` check could take effect today.

## Evidence (Step 6, local track)

Measured on the packaged Go server (`wowsimtbc`, port 3333), feral-p2, 5,000
iterations. Chunk wall times, which are what a user would wait through after
pressing Stop:

| n | secs |
| --- | --- |
| 21 | 7.39 |
| 25 | 9.35 |
| 32 | 12.71 |

On the HTTP transport the exposure is seconds per chunk, because the Go server
runs the batch natively at NumCPU. On the WASM transport it is far worse: the web
track measured **332 s for a 25-candidate chunk** (`execution-ledger-web.md`,
Step 2/3 arm table), so a Stop pressed just after a chunk starts is ignored for
over five minutes.

The plan's Step 6 acceptance included "a user cancel mid-screening stops the
in-flight chunk and issues no further bulk posts". That check was **not
obtainable as written** and is recorded as a flag in
`.scratch/stage-gate/batch-sim-web-local/execution-ledger-local.md`; this ticket
is where it lands. Gate C accepted the flag.

## Why it was not fixed in the local track

Out of that plan's Paths manifest. The local track owns
`bulk_http_sim_runner.ts` and the runner-selection branch in `upgrades_tab.tsx`;
`bulk_wasm_sim_runner.ts` and `engine/rank.ts` are read-only to it. A fix that
covered only the HTTP runner would leave the two transports behaving differently
on cancel, which is exactly the drift the shared-module design exists to prevent.

## What to do

Pick one of these; they are listed cheapest-first, and the choice is a design
call, not a detail.

1. **Bridge the existing `AbortSignal` to the runners.** Give the bulk runners an
   optional way to observe `deps.signal` — e.g. `BulkScreenRequest` carries the
   signal, and each runner triggers its own `bulkSignals.abortType(
   RequestTypes.BulkSim)` when it fires. Smallest change; keeps one cancel
   concept. Touches the seam, so it is a ported-engine-file edit (five-step
   PROVENANCE cycle).
2. **Have the tab own the runners' signal managers**, so Stop can call
   `abortType` directly. Avoids touching the seam but couples the tab to runner
   internals, and the tab would need the resolved runner (it already awaits one).
3. **Accept and disclose.** If cancel latency of one chunk is acceptable, say so
   in Stop's contract (candidate-pool.md §5.1.4 currently says "finish in-flight
   work", which arguably already covers this) and drop the Step 6 acceptance item
   rather than leaving it unmet. Note this reads very differently at 9 s (HTTP)
   than at 332 s (WASM).

**Correction (pre-merge review round, 2026-09-01).** An earlier version of this
ticket said the pre-dispatch `signals.abort.isTriggered()` check already in
`BulkHttpSimRunner.runBulkScreen` "starts working the moment a real trigger
reaches it". That is wrong, and the check has since been removed as dead code.

The signal it tested was created by `this.bulkSignals.registerRunning(...)` on
the immediately preceding line, once per chunk. Nothing holds a reference to that
object before the check runs, so no trigger can have reached it — the condition
was unconditionally false, and its comment described behaviour the code did not
have. The current per-chunk fresh-signal structure **cannot** support a
pre-dispatch check as written: a signal manufactured inside the loop body has no
history to test.

So option 1 below is not "wire a trigger to an existing working guard"; it needs
a cancel source that outlives the chunk. Whatever this ticket implements must
introduce one — the caller's `AbortSignal` observed directly in the loop
condition, or a manager-level abort the runner registers against once outside the
loop — and then re-add a guard that tests *that*. The equivalent guard is
likewise absent from the WASM runner, and for the same reason should not be added
until there is something real for it to test.

## Acceptance

- [ ] A Stop pressed during bulk screening either aborts the in-flight chunk, or
      the contract is amended to say it does not — decided, not left ambiguous.
- [ ] Whichever is chosen, **both** runners behave identically; the two transports
      must not differ on cancel.
- [ ] If aborting: verified live on both transports, with the chunk observed to
      stop and no further bulk request issued (the Go server's own log shows
      per-request stage lines, and is the usable instrument here — worker-scope
      `fetch` does not appear in the browser network panel).
- [ ] If disclosing: Stop's user-visible contract and candidate-pool.md §5.1.4
      agree, and the WASM-side latency is stated.

## Rider (pre-merge review P5): chunk-level failure does not degrade to the loop

Same code region, deferred here rather than in its own ticket. One rejected
candidate fails its entire chunk's request (`ui/core/wasm/bulk_sim/index.ts:121-122`
converts any candidate error into a request-level error), and the runner's
row-count guard then fails the screening pass — whereas the per-candidate loop
records a `candidateSkips` row and continues. It never fired in any measured
arm, and adding an untested fallback at close-out was judged worse than naming
the gap (web execution ledger, "Two gaps I'm flagging"). Whoever reworks this
region for cancel should decide the degradation story at the same time:
fall back to the loop for the failed chunk's candidates, or surface the chunk
error with the failing candidate identified.

- [ ] A chunk-level bulk failure either degrades to per-candidate simming for
      that chunk, or produces a user-legible error naming the candidate —
      decided and tested, not left as a pass-level abort.

## Resolution (2026-09-02, `feat/upgrades-tab-batch-sim`, fork `80395e68c`)

**Option 1** — bridge the caller's `AbortSignal` through the seam — implemented
once, in a shared chunk driver both runners call.

### What changed

`BulkScreenRequest` gains `signal?: AbortSignal`. Both bulk runners' chunk loops
are replaced by one `adapters/bulk_screen_driver.ts`, so each runner is now a
constructor plus a one-line `dispatch`. Identical behaviour on the two transports
is therefore a property of the code shape, not of two edits staying in step —
which is what the "both runners behave identically" acceptance item asks for.

The abort itself rides on machinery upstream already has: `worker_pool.ts`
subscribes each request to `signals.abort` and calls `sendAbortById`, the Go
server's `/abortById` reaches `simsignals.AbortById`, and the raid sim checks the
flag every iteration.

### Why the driver keeps its own flag rather than reading the signal

`signals.abort.isTriggered()` cannot distinguish a user Stop from a candidate
failure: upstream triggers the chunk's own signals on **any** candidate error
(`ui/core/wasm/bulk_sim/batch.ts:132-134`) to stop the rest of that batch, and
then RESOLVES with a `BulkSimResult` carrying `error` (`index.ts:121-123`) rather
than rejecting. Classifying on the signal would have turned one panicking
candidate into "the user pressed Stop" — every remaining chunk skipped, every
candidate returned unsimmed.

So the driver keeps `userAborted`, written only by the `AbortSignal` listener or
by `signal.aborted` at entry, and classifies on that alone. For the same reason
`SimSignals` are registered **per chunk** rather than once per pass: an
error-trigger on chunk k must not reach chunk k+1. Both properties have
regression tests (`packages/core/test/bulk-screen-driver.test.ts`, cases 3 and 4).

### Measured cancel latency

Both measured live on `feat/upgrades-tab-batch-sim`, feral cat druid, 5,000
iterations, with this instrument (Stop click → the button going disabled, which
is the tab entering its terminal state):

```js
const b = document.querySelector('.upgrades-stop-button');
const t0 = performance.now();
const obs = new MutationObserver(() => {
  if (b.disabled) { console.log('stop→disabled ms', performance.now() - t0); obs.disconnect(); }
});
obs.observe(b, { attributes: true, attributeFilter: ['disabled'] });
b.click();
```

| transport | setup | Stop → `stopped` | pre-registered | verdict |
| --- | --- | --- | --- | --- |
| Go / HTTP | packaged `wowsimtbc` on :3333, `/tbc/druid/feralcat/` | **481 ms** | ≤ 3,000 ms | pass |
| WASM | static `dist` on :4180, `__tbc_new_wasmconcurrency=4`, :3333 stopped so no HTTP fallback | **12,131 ms** | ≤ 5,000 ms | **missed, 2.4x** |

On HTTP the server log is the instrument the acceptance asks for. The 4th chunk
began at `08:17:33`; Stop was pressed a few seconds in, and the log's final line
is:

```
2026/09/02 08:17:33 [Bulk Sim] - Stage: high - Starting
  Candidates: 25
  ...
2026/09/02 08:17:36 [Bulk Sim] Cancelled
```

The chunk died ~3 s into a ~9 s batch, and **no further `Stage: high - Starting`
line follows** — no bulk request was issued after the Stop. Before this change
the same press would have waited out the full chunk.

On WASM the run was confirmed genuinely in-browser before measuring: every worker
resource loaded was `sim_worker.js`, with zero `net_worker.js`, so nothing had
fallen back to HTTP.

**The WASM figure misses its pre-registered bound and is recorded rather than
explained away.** C21 labelled ≤ 5,000 ms a hypothesis, and it was wrong for this
transport. The abort does work — 12.1 s against a 332 s chunk is a ~27x
improvement, and the tab lands in `stopped` with a `PartialRanking` — but the
in-browser tournament dispatches a per-candidate sim per worker and each in-flight
one must reach its own next abort check, so the pass cannot stop faster than the
currently-dispatched batch of individual sims drains. That is a property of
upstream's tournament, not of the wiring, and shortening it would mean changing
how `batch.ts` dispatches. Not attempted here; the WASM bulk route is default-off
(ticket 346 is the revisit trigger), so the figure that a user can reach today is
the 481 ms HTTP one.

### Rider (P5): chunk-level failure now degrades to the loop

Three error kinds leave a chunk, and they are deliberately not treated alike:

1. **Engine-reported (`result.error`) or transport (dispatch rejection).** The
   driver records `{ indices, reason }` and continues to the next chunk. Those
   candidates carry no screened row, so `rank.ts` prices them through
   `deps.sim.run` exactly as a runner with no bulk capability would, and a
   genuinely bad candidate becomes the loop's own `candidateSkips` row — which
   names it, something a bulk error cannot. Disclosed as
   `Ranking.screeningFallbacks` and as a `console.warn` in the tab.
2. **Integrity (`BulkScreenIntegrityError`: row shortfall, no baseline).**
   Rethrown unconditionally. These are the checks that stand between a silent
   cull and a truncated ranking; degrading them would hide exactly what they
   exist to catch.
3. **The single-stage guard.** Thrown outside the inner try — a bound
   programming error, never degradable.

Naming the failing candidate instead was rejected: a bulk error does not identify
it, and for a ≤25-candidate chunk one bad candidate would deny the user the 24
rows the loop produces.

**An integrity error on chunk k discards the completed chunks' rows and skips the
rest.** That is intended, and the reason is that nothing is lost by it: screening
supplies only DPS numbers, every row is composed by the loop's `runCandidate`
anyway, and `rank.ts` re-sims those candidates through the loop on the same run.
No §5.1.4 constraint applies here — that clause governs what a *Stop* may
dispatch, and this is not a Stop.

### Stop discards completed chunks' screening numbers

On abort the driver throws and the finished chunks' rows go with it. `rank.ts`
dispatches no candidate once `signal.aborted`, and screening supplies only DPS
numbers — every row is composed by `runCandidate`, which also calls
`deps.sim.run` for attempts screening never priced. Running the loop after Stop
to "land the paid-for rows" would therefore issue **new** sims, which §5.1.4
forbids. The cost is bounded: at most the finished chunks are re-screened next
run (≤ 12.7 s each on HTTP), and per-sim cache rows are unaffected. Caching at
the driver level was rejected because the `screen:` cache key is per composed
request and is only known inside the loop.

`docs/plans/wowsims-tab/candidate-pool.md` §5.1.4 is amended to say all of this.

## Acceptance

- [x] A Stop pressed during bulk screening either aborts the in-flight chunk, or
      the contract is amended to say it does not — decided, not left ambiguous.
      **Aborts**, and the contract is amended to match.
- [x] Whichever is chosen, **both** runners behave identically; the two transports
      must not differ on cancel. One shared driver; the runners hold no loop.
- [x] If aborting: verified live on both transports, with the chunk observed to
      stop and no further bulk request issued. Go log shows `[Bulk Sim]
      Cancelled` as its last line; WASM confirmed sim_worker-only and reached
      `stopped`.
- [x] A chunk-level bulk failure either degrades to per-candidate simming for
      that chunk, or produces a user-legible error naming the candidate —
      decided and tested. Degrades, with the integrity checks exempt;
      `packages/core/test/bulk-screen-fallback.test.ts` asserts all three
      outcomes through `rankUpgrades`.

## Notes

Related but distinct: ticket 345 (equivalence metric granularity) and ticket 346
(bulk-vs-loop cost at matched accuracy) also came out of this stage-gate. Neither
touches cancel behaviour.
