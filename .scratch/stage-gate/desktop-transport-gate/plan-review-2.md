# Plan review — desktop-transport-gate (round 2, scoped)

Reviewer seat, 2026-09-14. Scoped re-review of `plan.md` revision 2 — changed
claims and mechanisms only. **Nothing blocking remains.** Two new material
findings (G1, G2), two minor (G3, G4), all consequences of revision 2's own
mechanisms rather than of round-1 findings.

Confirmed privately before answering: `resize()` is fully synchronous —
`createWorker(idx)` at `concurrent_worker_pool.ts:65` is a plain call inside a
`for` loop, reached from the `WorkerPool` constructor via `setNumWorkers` with no
`await` anywhere on the path. That settles C26's synchronous-construction
hypothesis.

## 1. Does the F1 fix work?

**Yes, with one real gap.** C25's prescription is correct, and the
`workerSessionsAttached == 0` fail-closed check does close the "observer deaf
reads as pass" hole — it is what makes step 5(b)'s `requests.bulkSimAsync === 0`
on the WASM page meaningful rather than vacuous.

- **Workers created before auto-attach is armed** — not a gap as sequenced. Step 4
  arms `Target.setAutoAttach` *before* `Page.navigate`, and
  `waitForDebuggerOnStart: true` holds each worker at its first statement until
  `Runtime.runIfWaitingForDebugger`, so `Network.enable` always lands before the
  worker issues any `fetch`.
- **Flat-protocol routing** — correct. `flatten: true` puts `sessionId` on the
  envelope, and step 4 routes by `sessionId`.
- **Mid-run respawn — G1, material.** `setupWorker()` has a second call site at
  `worker_pool.ts:502`, inside `enable()`, reached whenever a disabled worker is
  brought back (`disable()` at 490-497 terminates and deletes; `resize()` calls
  `enable` on a pooled worker at `concurrent_worker_pool.ts:56-62`). A worker can
  be terminated and respawned mid-run — pool resize is the ordinary trigger. Late
  targets are still caught by auto-attach, so counts do not silently drop; but
  `Runtime.runIfWaitingForDebugger` must be sent for **every**
  `Target.attachedToTarget` or a respawned worker stays frozen at its first
  statement and the run hangs. Step 4's "for any other type just
  `runIfWaitingForDebugger`" covers it only if the handler is installed once for
  the session lifetime rather than awaited around navigation. **Settle by:**
  stating that lifetime in step 4, and having smoke A assert
  `workerSessionsAttached` against the pool size actually used.
- **Counting `responseReceived` @200 rather than `requestWillBeSent`** — the
  better choice, and `requestsSent` is kept alongside. One consequence worth
  writing down: `worker_http.ts:53-68` polls `/asyncProgress` until final, so
  those counts are large and variable — expected, not a signal. Already bucketed
  separately.

## 2. Does T1–T3 answer F3?

**Yes — the comparison is sound and the right shape.** Screened vs unscreened on
the same binary, transport and server isolates exactly the procedure that
differs, which revision 1's cross-transport scalar could not do.

**G2, material — the top-8 coverage hole.** Confirmed at `rank.ts:1449-1487`:
`replicateTopItems` filters to `!belowCutoff && simmed !== false`, slices
`PAIRED_REPLICATE_TOP_N = 8`, and **overwrites `item.deltaDps`** with the mean of
five paired-seed deltas from `deps.sim.run`. For those 8 rows the screened run's
published delta is not a screened number at all — it is a loop number, in both
runs. T3 therefore tests server determinism and tests **nothing about screening**
for the 8 rows that matter most to a user. C29 says this; the consequence is not
drawn.

Worse, the overwrite also recomputes `belowCutoff` (line 1486), so a screening
error large enough to push a row into or out of the top-8 changes *which* rows get
re-priced, while T1's key-set check still passes (same items, same slots).
**Settle by:** stating that T2's coverage is rows 9..N and rows 1..8 are covered
only by T3, rather than letting step 7(h) read as though T1–T3 cover every row.

**A bulk-path bug class T1–T3 would not catch.** `bulk_screen_driver.ts:113-115`
keeps only the first chunk's baseline (`baseline ??= mapped.baseline`) for the
whole batch. A systematic offset applied uniformly to every screened row shifts
all rows by one constant. K = 12.0 catches an offset above 12 DPS — the cited
65.3 DPS hazard is caught — but an offset under 12 is not. The plan already
records the median for this reason, which is the right instrument, but records
rather than asserts it. **Settle by:** asserting `|median| ≤ 3.4` (the committed
cutoff bar), since a uniform shift is precisely what the median detects and the
per-row K cannot.

**Tolerances.** K = 12.0 is defensible and honestly labelled; `cutoff.ts:37`
states the 3.4 = 2×1.678 derivation verbatim. The √2×SE model is a derivation,
not a measurement — the plan says so, and step 7 records the empirical max and
median beside K, which is the correct way to hold an unmeasured constant. T3's
0.3 DPS is right: those rows are identical `/raidSimAsync` requests, so anything
above display precision is a real finding. Both are protected by the out-of-scope
rule against editing K in response to a failure.

## 3. N2 as redesigned

**Sound, and C26's load-bearing hypothesis is now confirmed rather than
hypothetical:**

- `WorkerPool.constructor` (`worker_pool.ts:88-95`) calls `setNumWorkers` →
  `concurrencyPool.resize(n)`.
- `WorkerPoolManager.resize` (`concurrent_worker_pool.ts:31-69`) is a plain
  synchronous method; line 65 calls `this.createWorker(idx)` directly in a `for`
  loop — no `await`, nothing deferred.
- `create: i => new SimWorker(i)` → `SimWorker.constructor`
  (`worker_pool.ts:336-347`) calls `setupWorker()` synchronously, which calls
  `new window.Worker(SIM_WORKER_URL)` at line 357.

So a patched `window.Worker` that throws propagates synchronously out of
`new WorkerPool(1)`, lands in the bare `catch` at `upgrades_tab.tsx:1163-1164`,
and returns `this.sim` — the exact path the brief names. C26 can be promoted to
verified from those three reads; step 4's smoke B is still worth keeping as a
behavioural check.

**Does the factory pool stay usable?** Yes. `__harnessBlockWorkers` is set after
page load and before Run; the factory runner's pool was constructed at load while
the flag was false, so its workers already exist and the run proceeds over
`/raidSimAsync` on them, as C27 predicts.

**But G1 again, and this is where the two questions meet:** the flag stays true
for the rest of the run, and `enable()` → `setupWorker()` → `new window.Worker` is
reachable mid-run via pool resize. If the pool resizes during the fallback run,
the respawn throws where nothing catches it — the run dies or a worker slot is
lost. **Settle by:** having the patched constructor throw only while a counter is
zero, or clearing `__harnessBlockWorkers` as soon as `data-runner` is observed to
read `WasmSimRunner`. Smoke B would surface this as a hang, and step 4 already
says to stop for the orchestrator — but the fix is cheap and should be specified
rather than discovered.

## 4. F4–F11 residuals

| Prior | Status | Note |
| --- | --- | --- |
| F4 (stale attribute) | **fixed** | `removeAttribute` at the top of `run()` plus `runnerBeforeRun` recorded and expected `null`. A better fix than asked for. |
| F5 (`this.statusRef` does not exist) | **fixed** | Now `this.statusElem.setAttribute(...)`, captured at line 815, surviving `replaceChildren` at 1334. |
| F6 (checkout loses work) | **fixed, and the premise was corrected against me** | Reordering the commit before the checkout removes the hazard. C21's added finding — the file is byte-identical, so the checkout would *not* have aborted but would have carried the edit onto the old build — is a sharper statement of the risk than F6, which assumed an abort. |
| F7 (verify red windows) | **fixed** | Two windows named with reasons; no step before 8 takes `verify` as an acceptance. |
| F8 (vacuous (e)) | **fixed** | `min(cap, eligibleCount)` plus pinned `EXPECTED_ELIGIBLE` and the `≤ 617` bound; the C14-false branch is handled. |
| F9 (gitignore line numbers) | **fixed** | 17 negations at 58–75, new line after 75. |
| F10 (`-Desktop` acceptance) | **fixed** | Proves embedded mode via zero `WebAssembly` refs, and warns that `Start-Backend` at line 101 passes `--usefs=true`. |
| F11 (unretained worker body) | **fixed** | Sentence specified; `served-sim_worker.js` in the stage `.gitignore`. |

**G3, minor.** Step 12's committed-evidence list includes `plan-review.md` but not
`plan-review-2.md` — add it, or the second review round is the one artifact the
tracked directory omits.

**G4, minor.** C30's S4 signal is sound: the only `screening fell back` emitter is
`upgrades_tab.tsx:1282`, a page-context `console.warn`. But the warnings are
emitted after `rankUpgrades` returns, so a run that throws early emits none;
`screeningFallbackWarnings === 0` on a failed run is not evidence screening
worked. Worth one clause in the gate's output line so `(g)` is never read
independently of `(d)`.

## Summary

The three blocking findings are genuinely closed: S2 observes the right sessions
and fails closed when it observes nothing, and the screened path is compared
against an unscreened twin on the same engine — the observable F3 asked for. C26
can be marked verified from `concurrent_worker_pool.ts:31-69` and
`worker_pool.ts:88-95, 336-347`.

Before execution, three edits are worth making: (G1) bound the `--force-fallback`
throw so a mid-run respawn cannot hit it, and state the attach handler's lifetime;
(G2) say plainly that T2 covers rows 9..N and the top-8 only T3, and assert the
median rather than recording it; (G3/G4) the two one-line documentation fixes.
None changes the plan's shape, and none needs another full review round — they are
checkable at execution time against the acceptances already written.
