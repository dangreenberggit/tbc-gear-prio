# Execution ledger — batch-sim-local

Executor seat, branch `feat/upgrades-tab-batch-sim`, base SHA
`c5a04001de19cf142256d59114f91537778ed466` (asserted, matched).
Checkout mode: SHARED.

`$F` = `vendor/tbc-new-fork`; `$U` = `$F/ui/core/components/individual_sim_ui/upgrades`.

Tree state at start: outer repo clean except
`.scratch/stage-gate/batch-sim-web-local/decision-log.md` (modified) — the
**orchestrator's own file**, not in this plan's Paths manifest. Noted, not
touched, not committed by me.

## Step 1 — Preflight

### 1(a) Web's landed state — ALL PRESENT, acceptance met

| Check | Result |
| --- | --- |
| `engine/seams/sim-runner.ts` `runBulkScreen` / `bulkScreenCacheKey` | present (`:71`, `:89`); `RecordedSimRunner` bulk replay at `:115-143` |
| `engine/bulk/partition.ts` | present; `MAX_CANDIDATES_PER_BULK_REQUEST = 25` (`:42`) |
| `adapters/bulk_request_builder.ts` | present; `buildBulkSimRequest` (`:45`) |
| `adapters/bulk_wasm_sim_runner.ts` | present; exports `bulkScreenResultFrom`, `bulkPoolSizeFrom`, `makeSimRunner`, `BulkWasmSimRunner` |
| `engine/rank.ts` `DEFAULT_ITERATIONS = 5000` | present (`:359`) |
| **C3 bound assertion (≤ 25)** | **25 ≤ 25 — HOLDS.** Web ledger: measured web bound 32, applied constant 25 under the cross-track `min(measured, 25)` rule. No escalation. |
| **new-1 `topResults` grep** | `bulk_request_builder.ts:71` → `topResults: req.candidates.length`. Present; no escalation. |
| Web `RequestTypes` member | `RequestTypes.BulkSim` (web ledger, confirmed end-to-end) |

**new-2 two-sided C3 escalation check.** The second side (was web's bound
measured under builder conditions local's chunks will not reproduce?) is
satisfied *by construction*, not by assumption: local does not build its own
request — it calls the same `buildBulkSimRequest`, so `topResults`,
`simOptions`, `requestId` and the candidate mapping are byte-identical between
the transports for the same `BulkScreenRequest`. No escalation.

**Four builder obligations — verified in the shared builder, not re-implemented**
(as instructed):

1. `simOptions` — `bulk_request_builder.ts:51-60` (re-attached after `compose`
   strips it).
2. `requestId` — `:73`, `generateRequestId(SimRequest.bulkSimAsync)`.
3. Union `SimDatabase` — delegated to the caller by design and documented at
   `:33-43`; the caller is `rank.ts`'s `composeForBulk`, recorded in
   `engine/PROVENANCE.md:153` as widening the screening request's database to
   the union over baseline + every screened gear set. Local inherits this
   unchanged because it reuses the same `rank.ts` branch and the same builder.
4. `candidateIndex` (not `index`) on the response side — `bulk_wasm_sim_runner.ts:66`,
   inside `bulkScreenResultFrom`, which local imports (R3).

### 1(b) PROVENANCE status — no tracked file needs editing

`grep -n "adapters\|bulk_http\|sim-runner\|rank.ts" $U/engine/PROVENANCE.md`:
rows exist for `engine/rank.ts` (`:153`) and `engine/seams/sim-runner.ts`
(`:157`) — **neither of which this plan edits**. No row matches `adapters/` as
a path or `bulk_http`. Per `tools/README.md:11` and web's L-new-3, files
outside `engine/` carry no row and the drift checker is table-driven.

Files this plan may touch, and their status:

| File | Tracked? | Consequence |
| --- | --- | --- |
| `$U/adapters/bulk_http_sim_runner.ts` (new) | NO | no PROVENANCE row, no five-step cycle |
| `upgrades_tab.tsx` | NO (outside `engine/`) | R1/R6: project-owned, editable; branch condition only |
| `$U/engine/**` | (tracked) | **not edited by this plan** |

So the Step 3 contingency (five-step cycle) does **not** engage, and R6 stands:
C9's PROVENANCE contingency is dead. A fork commit still needs the re-pin
(cycle steps 3–5) because `check_equip_eligibility.py` gates on the pin — that
is separate from PROVENANCE row staleness and does apply here.

### 1(c) Transport ground truth — HALF CONFIRMED, HALF REFUTED (C5)

Servers: `wowsims-backend` (managed entry, port exactly 3333, `--usefs=true
--launch=false`) and `wowsims-fork` (vite, 5173), both started via
`preview_start`. No stray `wowsimtbc.exe` and no listener on 3333/5173 before
starting (checked). Port 4180 was already held by the web track's leftover
http-server — different port, left alone.

**Go server (3333) — matches C5.** On
`http://localhost:3333/tbc/druid/feralcat/`:

```
{ server: 'go-3333 (packaged wowsimtbc)', isWasmFlag: false,
  readyMsg: { msg: 'ready', outputData: { '0': 0 } } }
```

Served-asset evidence for the same page: `/tbc/sim_worker.js` returns 3,823
bytes with **0** `WebAssembly` references, **2** `asyncProgress` references and
one `ready(false)`. So `main.go:402-403`'s rewrite to `net_worker.js` is live
and `isWasm()` resolves `false` — the HTTP transport, deterministically, from
the worker's own ready message.

**Vite (5173) — REFUTES C5's second half.** C5 and the Approach both state a
vite-served page resolves `isWasm() === true` and therefore "takes the WASM
branch". Measured on `http://localhost:5173/tbc/`:

```
{ server: 'vite-5173', bytes: 3846, wasmRefs: 0, asyncProgress: 2,
  isWasmFlag: false, readyMsg: { msg: 'ready', outputData: { '0': 0 } } }
```

`vite.config.mts:20-25` maps `/tbc/sim_worker.js` → `/tbc/local_worker.js`, and
`ui/worker/local_worker.ts` is one line:

```ts
setupHttpWorker("http://localhost:3333");
```

So the vite dev page is **also** an HTTP page — it hardcodes the Go backend on
3333, which is why the two launch entries are meant to run together. The three
worker entry points, read in full:

| Worker | Transport | `bulkSimAsync` | Served by |
| --- | --- | --- | --- |
| `net_worker.ts` | HTTP, `setupHttpWorker("")` (relative) | real async handler | Go server 3333 (rewrite) |
| `local_worker.ts` | HTTP, `setupHttpWorker("http://localhost:3333")` | real async handler | vite 5173 (rewrite) |
| `sim_worker.ts` | WASM | **unsupported** — logs "bulkSimAsync is only supported by the HTTP worker" | prod http-server 4180 only |

This is the same finding the web track recorded as A1-1 (its ledger, "A1-1
verified independently"), reached here independently from the live servers.

**Consequence — the design conclusion survives, the rationale does not.** The
plan's Approach argues the HTTP path is acceptable because dev "loses nothing
but the HTTP transport, taking the (also-native-bulk) WASM branch". That
sentence is false in this environment: neither dev server serves the WASM
worker, and the WASM worker cannot serve bulk at all. The practical effect is
the opposite of a loss — `BulkHttpSimRunner` is the correct runner on **both**
dev servers, and `BulkWasmSimRunner` is reachable only from a prod-style static
server (4180). Nothing in the implementation changes; the claim in the plan
does. Logged as a **flag** below, not adapted around, because C5 is marked
load-bearing and the Approach's argument rests on it.

## Step 2 — `BulkHttpSimRunner` adapter (done)

New file `$U/adapters/bulk_http_sim_runner.ts`. Fork type-check **exit 0**.

- Partitions with `partitionForBulkScreen(req.candidates,
  MAX_CANDIDATES_PER_BULK_REQUEST)` — web's shared constant (25), unchanged.
- Builds each chunk with the shared `buildBulkSimRequest` — no second builder,
  so the four obligations are inherited rather than re-implemented.
- Executes **sequentially** with `this.bulkPool.bulkSimAsync(request, () => {},
  signals)`; the Go server threads one request over NumCPU itself (C6).
- Maps with the **imported** `bulkScreenResultFrom` (R3 — the "else write it
  here" branch is deleted, no duplicated mapping).
- Truncation guard (C7): supplied by `bulkScreenResultFrom`, which throws unless
  `topResults.length === expectedCount` and every row carries `dpsMetrics`. The
  204-eviction path (`main.go:219,310` → `worker_http.ts:40-42` `break`) is
  therefore a hard error, not a partial result. Verified both ends by reading:
  `main.go:219` is `case <-time.After(time.Minute * 10)`, `:310` is
  `w.WriteHeader(http.StatusNoContent)`, and `worker_http.ts:40-42` is
  `if ([204, 404].includes(progressResponse.status)) break;`.
- Abort (C13): `this.bulkSignals.registerRunning(RequestTypes.BulkSim)` per
  chunk, passed into every `bulkSimAsync` call, plus a pre-dispatch
  `signals.abort.isTriggered()` check that breaks out of the chunk loop.
- Load-bearing comments cite C2/C3 (why 25 guarantees no culling) and C7 (why
  the row-count guard exists), as Step 2 requires.

Pool sizing deviates from nothing the plan specified, but the reasoning is
recorded in the file: the runner takes a **1-worker** bulk pool. `WorkerPool`'s
size governs how many *client-side* workers service requests; one HTTP request
carries the whole chunk to a server that parallelises internally, and upstream
itself refuses to apply the WASM concurrency setting off-WASM ("Local sim has
native threading", `sim.ts:163-169`). `bulkPoolSizeFrom`'s ≥2 refusal is a
WASM-tournament fact (its baseline probe splits across workers) and does not
transfer.

## Step 3 — Runner selection (done)

Fork type-check **exit 0**. `git diff --stat` on `upgrades_tab.tsx`: **57
insertions, 2 deletions** — a real small edit, no line-ending reformat.

R1 honoured, with one shape decision forced by the code:
`makeSimRunner()` is **synchronous** and `isWasm()` is **asynchronous** (it
awaits the worker's ready message, `worker_pool.ts:390-393`), so the transport
cannot be branched on inside that factory. `bulk_wasm_sim_runner.ts` is
read-only for this plan (Paths manifest: "everything web v2 created is
read-only"), so changing `makeSimRunner`'s signature was not available either.
The branch therefore lives in `upgrades_tab.tsx`, which R1 explicitly adds to
this plan's manifest, as a memoised `simRunner()` resolving once per tab:

```
isWasm() === true  → this.sim (the factory's runner, unchanged)
isWasm() === false → new BulkHttpSimRunner(this.sim.concurrency)
probe throws       → this.sim (fallback; a transport probe must not kill a run)
```

`this.sim` is still `makeSimRunner()` and every web-track decision inside that
factory is untouched. The two `this.sim` reads inside `run()` (`sim:` and
`concurrency:`) become reads of the resolved runner; there are no other uses in
the file.

The HTTP branch is deliberately **not** gated on the user's WASM concurrency
setting, for the reason recorded above (`sim.ts:163-169`). Gating it would
withhold the bulk path from an Off/1 user on a transport where that setting
describes nothing.

## Steps 5/6 — live measurement on the HTTP transport

All measurements below: page served by **vite 5173**, whose worker is
`local_worker.ts` → `setupHttpWorker("http://localhost:3333")`, so every sim
executed on the **packaged Go server** (`wowsimtbc`, port 3333, managed
`wowsims-backend` entry). Transport re-asserted at the top of the session:
`await new WorkerPool(1).isWasm()` → `false`. Requests are built by the
**shared** `buildBulkSimRequest` and mapped by the **shared**
`bulkScreenResultFrom` — the same two functions `BulkHttpSimRunner` calls.

Character: the page's own feral-p2 druid; `baseRequest` captured from a real
`Simulate` click (a genuine `RaidSimRequest`, not synthetic). Candidates are
baseline gear with one slot replaced by an unworn pool item (back / neck),
union `SimDatabase` merged per candidate exactly as builder obligation 3
requires.

### The transport works end to end (C1 — measured, not read)

A one-candidate probe returned a complete `BulkSimResult` in **1.06 s**:
baseline DPS 2245.5657, one row with `dpsMetrics`, `candidateIndex: 0`, no
error. The candidate was the baseline gear unchanged and its DPS came back as
2245.5657 — matching to 12 significant figures, which is the right answer for
identical gear.

A malformed probe (empty `baseRequest`) came back as a structured
`BulkSimResult` with `error.message = "[Bulk sim] Base request is empty"` in
0.02 s, so the Go engine's own validator is in the path and
`bulkScreenResultFrom` would throw on it (`result.error` set).

### Cost — the Go transport is ~2 orders of magnitude cheaper than WASM

Server log for an ordinary page sim:

```
2026/09/01 17:25:00 Running 12500 iterations on 20 concurrent sims.
2026/09/01 17:25:01 All 20 sims finished successfully.
```

12,500 iterations in ~1 s at NumCPU=20. The web track measured the WASM path at
~39 s for 6,486 iterations. Measured chunk costs here:

| n | rows | rows w/ dpsMetrics | stages | stage iterations | secs |
| --- | --- | --- | --- | --- | --- |
| 21 | 21 | 21 | 1 | 6,075 | 7.39 |
| 25 | 25 | 25 | 1 | 6,432 | 9.35 |
| 26 | 26 | 26 | 1 | 6,504 | 9.62 |
| 30 | 30 | 30 | 1 | 6,816 | 12.17 |
| 32 | 32 | 32 | 1 | 6,932 | 12.71 |
| 33 | **5** | 5 | **2** | 1,000 → 5,000 | 3.76 |

A 25-candidate chunk costs **9.35 s** here against the web track's **332 s**
for the same n on WASM — about 35x. C12's extrapolation (~12 chunks, ~5,400
iterations per baseline probe) is superseded by these measured numbers; the
adaptive pass raises a nominal 5,000 to 6,000–6,900 actual, rising with n, same
behaviour the web track saw.

### C2 is WRONG as stated, and its conclusion survives — bound measured at 32/33

C2 says "under 101 candidates skips Low, under 26 skips Medium", citing the
survivor gates. The survivor gates are real (`stage.go:33-41`: Medium
`MaxSurvivors: 25`; `:57-58` runs a stage when `candidateCount > maxSurvivors`),
but they are **not the only gate**, and reading them alone gives the wrong
boundary. `sim/core/bulk/estimate.go` carries `shouldUseLegacyBulkSim` — the
same cost-estimate early-return the TS engine has — which keeps the run
single-stage/High-only well past 26 whenever
`estimatedMultistageIterationsUpperBound >= highStageIterations *
candidateCount`.

Measured, not derived: **n = 26, 30 and 32 all return one stage with every row
present**; **n = 33 returns two stages and 5 rows of 33**, with `error` unset.
So the Go flip point sits between 32 and 33 at 5,000 iterations — **identical to
the web track's measured TS boundary of 32/33**. Round-2 condition new-2
predicted the two engines were line-parallel; that is now measured on both
sides rather than asserted on one.

Consequences:

1. **The applied constant 25 is safe on the Go path**, with more margin than
   the plan claimed — C2's conclusion holds even though its mechanism does not.
   No escalation: the C3 assertion is "measured web bound ≤ 25", and the
   two-sided new-2 check asks whether local's chunks reproduce web's builder
   conditions. They do, byte-for-byte, because local calls the same builder.
2. **C2's stated mechanism is refuted** and is logged as a `flag` — it is marked
   load-bearing, and a future reader who takes "26 culls" as fact would size the
   bound wrongly (either wasting the 26–32 headroom deliberately, as here, or
   trusting a survivor-gate reading that does not hold).
3. **The n=33 failure is silent on the Go engine too** — 5 rows, every one
   carrying `dpsMetrics`, `error` unset. A runner trusting the response would
   have dropped 28 candidates from the ranking with no signal. This is the
   second independent confirmation that `bulkScreenResultFrom`'s row-count
   guard is load-bearing, now on the transport the guard was written for.

### Row completeness and the guard, on the real path

The 21-candidate arm was run through the shared mapping exactly as
`BulkHttpSimRunner` runs it:

```
bulkScreenResultFrom(result, 21, 'api-v3')
  → 21 mapped rows, baseline.dps = 2246.0321
  → top rows by dps: [{i:0, 2234.12}, {i:1, 2230.21}, {i:2, 2228.91},
                      {i:3, 2222.36}, {i:4, 2221.81}]
```

All four builder obligations observed on a real request rather than inferred:
`simOptions` present with `iterations: 5000`, `requestId`
`bulkSimAsync-9914936656134d41`, `topResults: 21` equal to the candidate count,
and a union `SimDatabase` of **37 item rows against the baseline's 16**. The
last one is obligation 3 doing visible work: 21 unworn candidate items had to be
registered, and a baseline-only database would have carried none of them.

### Step 5 — equivalence, four pre-registered conditions: ALL PASS

Design: the **same 21 feral-p2 candidates** (baseline gear with one back/neck
slot replaced by an unworn pool item), priced two ways on the **same Go server**
at **5,000 iterations**, and compared as *screening deltas against each run's own
baseline* — which is how `rank.ts` consumes them.

- **Arm A (bulk)** — one `buildBulkSimRequest` chunk through
  `pool.bulkSimAsync`, mapped by `bulkScreenResultFrom`. This is exactly
  `BulkHttpSimRunner`'s code path.
- **Arm B (loop)** — 21 individual `pool.raidSimAsync` calls, seed 11: the
  per-candidate route the runner replaces.
- **Arm C (control, ticket 345)** — Arm B repeated at seed 777.

| Condition (registered before running) | Threshold | Measured | Verdict |
| --- | --- | --- | --- |
| (a) identical screened-candidate count | equal | 21 vs 21 | **PASS** |
| (b) Spearman rank correlation of screening deltas | ≥ 0.95 | **0.9818** | **PASS** |
| (c) top-N selection overlap | ≥ 90% | top-5 **100%**, top-10 **90.0%**, top-15 **93.3%** | **PASS** |
| (d) shared top-N ordering within error bars | within | mean abs DPS gap **0.351**, max **0.897**, on ~2,230 DPS values | **PASS** |

Per-candidate agreement is very tight: the largest single-candidate difference
between the bulk and loop routes is **0.897 DPS out of ~2,230** (0.04%), and the
ranked order of the top 9 is item-for-item identical in both
(`[0,1,2,3,4,5,7,6,8]` in both arms — note both routes agree that 7 outranks 6).

**Condition (c) and ticket 345.** My top-10 overlap is exactly 90.0%, i.e. the
threshold is met but only just, and at n=21 the metric moves in 10-point steps —
the same granularity artifact ticket 345 describes. Rather than re-litigate the
threshold, I ran the **loop-vs-loop control at a different seed that the ticket
asks for** (its acceptance item 1), because that is the number which makes any
route comparison interpretable:

| Comparison | Spearman | top-5 | top-10 | top-15 |
| --- | --- | --- | --- | --- |
| **CONTROL** loop(seed 11) vs loop(seed 777) — *same route* | **0.8623** | 1.000 | 0.900 | **0.800** |
| TEST bulk vs loop(seed 11) | **0.9818** | 1.000 | 0.900 | **0.933** |
| TEST bulk vs loop(seed 777) | 0.9039 | 1.000 | 0.900 | 0.867 |

**The control is worse than the test.** Two runs of the *same* per-candidate
route at different seeds agree less with each other (rho 0.8623, top-15 0.800)
than the bulk route agrees with the loop (rho 0.9818, top-15 0.933). So the
residual tail disagreement is **seed noise, not a route difference** — which is
exactly the attribution ticket 345 says cannot be made without a control, now
made. Note also that the loop-vs-loop control would itself *fail* condition (b)'s
0.95 threshold, which says the threshold is measuring set size and tail jitter at
n=21, not route fidelity.

The baselines make the same point independently. Three baseline probes:

```
loop, seed 11   -> 2246.99
loop, seed 777  -> 2181.37
bulk (own probe)-> 2181.67
```

The bulk baseline sits within 0.3 DPS of the *loop* baseline at seed 777 and 65
DPS from the loop baseline at seed 11 — so the spread tracks the seed, not the
route. (The bulk stage picks its own probe seed; `rank.ts` takes every screening
delta against the baseline from the same batch, so this cancels.)

**Ticket 345 disposition: not re-litigated, and advanced.** Acceptance item 1
(the control, with a number) is now measured on the HTTP transport and quoted
above. Items 2 and 3 (a deeper ranked set; re-cutting the metric) remain open —
n=21 is still too small for the threshold to be expressible at 10-point
granularity, and that is the ticket's point, not a finding of this run. Flagged
to the orchestrator rather than closed by me.

### Step 6 — end-to-end acceptance and cost

- **No per-candidate `raidSimAsync` during screening.** A screening pass is
  `ceil(candidates / 25)` `bulkSimAsync` posts and nothing else: the 21- and
  25-candidate arms each issued exactly one bulk request and zero
  `raidSimAsync`, verified by the Go server's own log (each bulk request logs one
  `Running N iterations on 20 concurrent sims` line per stage, no per-candidate
  raid-sim lines). The baseline, set-bonus and paired-replication sims still post
  `raidSimAsync` — by design, and untouched by this plan.
- **Row-count guard passed on every chunk** at n = 21, 25, 26, 30, 32; it is the
  n=33 arm that shows what it is for (5 rows of 33, silently, `error` unset).
- **Server-side concurrency observed** (C6): `Running 12500 iterations on 20
  concurrent sims` — the Go server threads one request over NumCPU=20 with no
  client-side knob, confirming a 1-worker client pool is the right size.
- **C14 flipped to observed.** Every chunk completed in 3.8–12.7 s, three orders
  of magnitude inside the 10-minute eviction window (`main.go:219`). Eviction is
  a guarded tail risk, not a live failure mode, on this transport at this size.

**Two Step 6 acceptance items NOT obtained as specified, both logged below:**
the browser network panel does not see the worker's requests (worker-scope
`fetch` is not in the page's log), so "observe in the network panel" was
satisfied through the Go server's own log instead; and the live user-cancel check
was not run, because the tab's Stop button does not reach either bulk runner's
signals (it aborts the engine's `AbortController` only) — a pre-existing property
of the web track's design, not something this plan introduced.

### Step 4 — recorded fixture (done)

`packages/core/test/bulk-screen-http-fixture.test.ts`, extending the existing
recorded-adapter tests in place. Two cases, both offline, both inside
`pnpm verify`.

**R5 answered, and the concern dissolves.** R5 asked which `simVersion` a
Go-served recording carries, since a value different from a WASM recording's
would split the fixture story. Measured on the live HTTP runner:

```
new BulkHttpSimRunner(1).version()  ->  "api-v15"
CURRENT_API_VERSION                 ->  15
```

`version()` is inherited from `WasmSimRunner` and returns
`` `api-v${CURRENT_API_VERSION}` `` — a **compile-time constant, not a reading
off the running engine**. So both transports report the same string by
construction and a Go recording cannot diverge from a WASM one. The fixture is
recorded under `api-v15`, the offline test resolves that value, and the test
asserts it explicitly so an API bump fails here rather than silently replaying
stale numbers.

**Red-checked against the seam, not against itself.** My first red-check was
worthless — I flipped the test's own `RECORDED_SIM_VERSION` constant, which
moves the recording and the lookup together, so it passed and proved nothing.
The real check mutates the thing under test: dropping `${simVersion}` from
`bulkScreenCacheKey` in `engine/seams/sim-runner.ts` makes the test **fail** at
the intended assertion (a recording filed under `api-v14` wrongly satisfying a
lookup at `api-v15`). The mutation was reverted with the Edit tool and the fork
tree confirmed byte-clean afterwards (`git status --porcelain` empty), so the
tracked seam's PROVENANCE hash is untouched.

### Step 7 — verify and commit

- **Fork type-check**: `node node_modules/typescript/bin/tsc --noEmit` from the
  fork root → **exit 0**. (The plan's `npm --prefix $F run type-check` form does
  not work on Windows, as the web ledger already recorded.)
- **`pnpm verify`**: **exit 0**. 59 test files / 1,254 passed, 1 skipped, 2 todo
  (up from the web track's 56 / 1,241). Pin-sensitive gates green at the new
  commit: `engine port drift check ok: 33 ported files match PROVENANCE.md` and
  `equip eligibility check ok: 17 specs match the fork at 52679533f548`.
- **`git -C $F status --porcelain`**: clean; the commit touched only
  `upgrades/adapters/bulk_http_sim_runner.ts` and `upgrades_tab.tsx`, which is
  what R1's amended assertion permits.

## Deviation ledger

| Step | Plan said | Found | Action | Why |
| --- | --- | --- | --- | --- |
| (pre) | run git/node in Bash | Bash tool has no fnm env; bare `git` fails with the fnm error (known-traps § node/pnpm) | adapt | Ran `git -C <abs>` standalone / PowerShell with the PATH pin. Tooling only. |
| (pre) | shared checkout, orchestrator writes nothing | `.scratch/.../decision-log.md` was already modified at start | none | The orchestrator's own file, outside my Paths manifest. Left untouched; confirmed still unstaged and its committed blob unchanged after both my commits. |
| 1(c) | C5: a vite-served page resolves `isWasm() === true` and takes the WASM branch | **Refuted by measurement.** Vite maps `sim_worker.js` to `local_worker.js`, which is `setupHttpWorker("http://localhost:3333")` — 0 `WebAssembly` refs, `ready(false)`, `isWasm()` **false**. Both dev servers are HTTP; only the prod static server (4180) serves the WASM worker, and that worker's `bulkSimAsync` is a stub. | **flag** | C5 is marked load-bearing and the Approach's "dev loses nothing but the HTTP transport" argument rests on it. The implementation is unaffected — `BulkHttpSimRunner` is simply correct on both dev servers instead of one — but the plan's stated rationale is wrong and a reader should not inherit it. Same finding as the web track's A1-1, reached independently. |
| 3 | Extend the factory's branch condition (R1); branch on `await pool.isWasm()` | `makeSimRunner()` is **synchronous**; `isWasm()` is **asynchronous** (awaits the worker ready message). The branch cannot live inside that factory, and `bulk_wasm_sim_runner.ts` is read-only for this plan. | adapt | Put the branch in `upgrades_tab.tsx`, which R1 explicitly adds to the manifest, as a memoised async `simRunner()`. `makeSimRunner()` and every decision inside it are untouched; the tab still holds its result as the WASM answer and the fallback. Local to one step, plan intent unambiguous. |
| 2/3 | (not specified) HTTP runner pool sizing | Chose a **1-worker** bulk pool and deliberately did **not** gate the HTTP branch on the user's WASM concurrency setting | adapt | `bulkPoolSizeFrom`'s >=2 refusal is a WASM-tournament fact (its baseline probe splits across workers); one HTTP request carries the whole chunk to a server that threads it over NumCPU. Upstream itself declines to apply that setting off-WASM (`sim.ts:163-169`, "Local sim has native threading"). Gating on it would withhold bulk from Off/1 users on a transport the setting does not describe. Reasoning recorded in the adapter's header. |
| 2/6 | C2: "under 26 skips Medium" is the Go no-cull mechanism | **Mechanism wrong, conclusion right.** The survivor gates are real (`stage.go` Medium `MaxSurvivors: 25`) but are not the only gate: `sim/core/bulk/estimate.go`'s `shouldUseLegacyBulkSim` keeps runs single-stage well past 26. Measured: n = **26, 30, 32 all single-stage with every row present**; n = **33** goes two-stage and returns **5 rows of 33**. Go's flip point is 32/33 — identical to the web track's measured TS boundary. | **flag** | C2 is load-bearing. The applied constant 25 stays correct (with more margin than claimed), so nothing is blocked — but a future reader sizing the bound from "26 culls" would be reasoning from a refuted mechanism. Also confirms new-2's line-parallel prediction, now measured on both engines rather than one. |
| 5 | Four pre-registered conditions; any miss = stop | **All four pass**: 21 vs 21; Spearman **0.9818**; top-5 100% / top-10 **90.0%** / top-15 93.3%; max per-candidate gap **0.897 DPS** on ~2,230. | none (met) | No escalation. Condition (c) lands exactly on the threshold at 10-point granularity, so I ran ticket 345's loop-vs-loop control rather than resting on the bare number. |
| 5 | (ticket 345) condition (c) granularity at small ranked sets | Hit the same artifact at n=21. Ran the control the ticket asks for: **loop vs loop at a different seed scores rho 0.8623 / top-15 0.800 — worse than bulk vs loop's 0.9818 / 0.933.** | **flag** (referenced, not re-litigated) | The route agrees with the loop better than the loop agrees with itself across seeds, so the residual tail disagreement is seed noise, not a route difference. This advances ticket 345's acceptance item 1 with a number on the HTTP transport; items 2 and 3 (deeper ranked set, re-cut metric) stay open. Flagged to the orchestrator; I did not close the ticket. |
| 6 | Observe the bulk/raid post counts "in the network panel" | The browser network log does **not** see them: `WorkerPool` requests are issued by the worker, and worker-scope `fetch` is not in the page's log (verified — only my own page-scope probes appeared). | adapt | Used the Go server's own log as the observation instead, which is a stronger source anyway (it reports stage iterations and concurrency). Same fact established by a different instrument. |
| 6 | "a user cancel mid-screening stops the in-flight chunk and issues no further bulk posts" | **Not obtained, and not obtainable as written.** The tab's Stop handler is `this.abortController?.abort()` (`upgrades_tab.tsx:939-941`) and nothing else; neither bulk runner's `SimSignalManager` is reachable from it. So a mid-screen cancel cannot interrupt an in-flight chunk on **either** transport. | **flag** | A pre-existing property of the web track's design, not something this plan introduces, and outside my manifest to change (`bulk_wasm_sim_runner.ts` is read-only). My runner still registers per-chunk signals and checks `abort.isTriggered()` before dispatching, so it is correctly wired for whenever a cancel path does reach it. Reported rather than silently marked done. |
| 4 | Record one real `BulkScreenResult` set from the Go-served tab | Recorded from a real Go-server bulk response, but captured through the shared builder/mapping driven from the page's own `RaidSimRequest` rather than by driving the tab's Run button (its settings inputs re-render on toggle, and the run itself is not needed to obtain a genuine Go-engine observation). | adapt | The fixture's purpose per the plan is that **Go-engine observations flow through the transport-blind engine test**; the observations are genuinely Go-engine and genuinely HTTP-transported. Only the capture route differs. |
| 4 | (self-caught) test authoring | A PowerShell `Set-Content -Encoding utf8` round-trip **mangled four em-dashes into mojibake** in the new test file, and my first red-check mutated the test's own constant (which moves recording and lookup together) and so proved nothing. | corrected | Both caught before commit: file rewritten ASCII-only via the Write tool and checked (`Select-String 'â€'` → 0), and the red-check redone against the seam itself, where it correctly failed. Recorded because a green test that cannot fail is worse than no test, and this is exactly the scripted-write trap `known-traps.md` names. |
| 7 | PROVENANCE five-step cycle contingency for the construction site | Not triggered — `upgrades_tab.tsx` and `adapters/*` carry no PROVENANCE row (R6). But cycle steps 3-5 (**re-pin + regen**) were still required, because `check_equip_eligibility.py` gates on the clone HEAD matching the pin regardless of what the commit touched. | adapt | Same rule the web track hit. Lock bumped to `52679533f548` (resolved with `git rev-parse`, never typed), `pnpm sim-implemented-effects:generate` re-run (217 implemented / 451 stub-only, unchanged), both committed. |
