Status: open
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

## Notes

Related but distinct: ticket 345 (equivalence metric granularity) and ticket 346
(bulk-vs-loop cost at matched accuracy) also came out of this stage-gate. Neither
touches cancel behaviour.
