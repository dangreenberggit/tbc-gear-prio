# Compute topology: where the sim actually runs

Status: **proposal**. Nothing here is implemented. No production code changed by
this document. It specifies edits to `PLAN.md` but does **not** make them.

Upstream pin throughout: `wowsims/tbc-new` @
`8aa378b3671a0923fd11fb34b4b3753e53f20c9b` (`data/wowsims.lock.json`, tag
`v0.0.101`). Any upstream file quoted below is re-checkable with:

```bash
gh api "repos/wowsims/tbc-new/contents/<path>?ref=8aa378b3671a0923fd11fb34b4b3753e53f20c9b" \
  --jq '.content' | base64 -d
```

---

## 0. One simulator, three build shells

Everything below is easier to read once this is straight. The engine is the Go
source under `sim/`. Upstream compiles that one tree three ways:

| Build       | Entry point        | Used by                                                |
| ----------- | ------------------ | ------------------------------------------------------ |
| CLI binary  | `cmd/wowsimcli/`   | **us, today** — `CliSimRunner` spawns it per candidate |
| WASM        | `sim/wasm/main.go` | wowsims' site, in the visitor's browser                |
| HTTP server | same sim, served   | wowsims' `net_worker.ts` / `local_worker.ts` fallback  |

`sim/wasm/main.go` is glue, not a reimplementation — it hangs the same functions
off JS globals (`raidSim`, `raidSimAsync`, `statWeights`, `abortById`, …) so a
Web Worker can call them. `ui/worker/sim_worker.ts` wraps the WASM build;
`net_worker.ts` and `local_worker.ts` both call `setupHttpWorker(...)` against a
sim server. Same `WorkerInterface`, three topologies.

Two corollaries this document depends on:

1. **The CLI is a production dependency, not prototyping scaffolding.** Every DPS
   number we currently ship comes out of it. No step in this plan retires it; it
   stays the server-side, batch and CI-fixture path. "Move to WASM" means "add a
   client-side adapter", never "delete `CliSimRunner`".
2. **`PLAN.md` §1.1's "needs process spawn and multiple cores" is a property of
   the CLI wrapper, not of the simulator.** The WASM build runs the identical
   engine with no process and no filesystem. That is the whole error being
   corrected here.

**Caveat carried throughout:** that the three builds agree _numerically_ is
expected but **untested** — see E1 (§7) and §8. Do not treat WASM-vs-native
parity as established.

---

## 1. Verdict on the thesis

**Confirmed in substance, with two corrections that change the priority order.**

| Claim                                                   | Verdict                               | Evidence                                                                                                                                                                                                                                                        |
| ------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PLAN.md §1.1 bakes in local/server compute as a premise | **Confirmed**                         | `PLAN.md:33` — "One always-on Node container. Not serverless — the sim is a ~50 MB native binary that needs process spawn and multiple cores"                                                                                                                   |
| wowsims proves the browser path works                   | **Confirmed**                         | `sim/wasm/main.go` compiles the _same_ Go sim to WASM and exports `raidSim`, `raidSimAsync`, `raidSimRequestSplit`, `raidSimResultCombination`, `statWeights`, `abortById` to JS globals. `ui/worker/sim_worker.ts` wraps it; `ui/core/worker_pool.ts` pools it |
| The "needs process spawn" justification is load-bearing | **Wrong, and it is the actual error** | Process spawn is an artifact of choosing the _CLI_ adapter. The same sim runs in-browser with no process at all. §1.1 states an implementation detail as if it were a constraint                                                                                |
| "~50 MB native binary"                                  | **Wrong number**                      | The pinned binary is **22,222,336 bytes (21.2 MiB)**. Re-check: `ls -la vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe`                                                                                                                              |
| The gap is urgent / blocks current work                 | **Partly — no**                       | See §3. The _cheap_ win is unrelated to topology, and doing topology first would stall Stage 1                                                                                                                                                                  |

**Correction 1 — the bottleneck named in §1.1 is not the real bottleneck.**
`cmd/wowsimcli/cmd/basic_sim.go` registers only `--infile`, `--outfile`,
`--verbose`, then calls `core.RunRaidSimConcurrentAsync(input, reporter,
"cmd-raid-sim")`. A single `wowsimcli sim` invocation **already saturates all
cores**: `sim/core/sim_concurrent.go:446` splits on `int32(runtime.NumCPU())`.
Observed locally: `Running 5000 iterations on 20 concurrent sims.` So "needs
multiple cores" is satisfied by one process, and the "multiple cores" clause
does not justify the always-on container.

What _is_ slow is `packages/core/src/rank.ts:258` — `await deps.sim.run(...)`
inside a plain serial `for` loop over candidates, one full multi-core sim at a
time, awaited. PLAN.md §5.3 already promises the fix ("Concurrency lives in the
caller, not the runner: `SIM_CONCURRENCY` (default `cores - 1`)") and the code
does not do it yet. **That promise is also now wrong** — see §3.1: each run
already uses every core, so `cores - 1` _processes_ would oversubscribe by 20×.

**Correction 2 — the seam mostly saves us, but its interface leaks.** See §2.

---

## 2. Is `SimRunner` sufficient as-is?

Read `packages/core/src/seams/sim-runner.ts` and
`packages/core/src/seams/cli-sim-runner.ts`.

The port itself is clean:

```ts
export interface SimRunner {
  version(): Promise<string>;
  run(req: RaidSimRequest, opts: SimRunOpts): Promise<SimObservation>;
}
```

No `fs`, no `spawn`, no path, no `Buffer` in the signature. `RaidSimRequest` is
a plain `Readonly<Record<string, unknown>>`; `SimObservation` is four scalars.
**A `WasmSimRunner` or `HttpSimRunner` is a third adapter, not a replan.** The
existing port is the thing that saves this, and the user's instinct that the
architecture already anticipated it is correct.

Three real leaks, none fatal:

| Leak                                             | Where                                                                  | Impact on a browser adapter                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `simCacheKey` imports `node:crypto` `createHash` | `sim-runner.ts:7` — in the **port** file, not an adapter               | Blocks browser use of the port module itself. `node:crypto` is not available in a browser bundle. Needs `SubtleCrypto` (async) or a bundled sha256. **Note the ripple: `SubtleCrypto.digest` is async, so `simCacheKey` would become `Promise<string>` and every caller changes.** This is the single most annoying item in this document |
| `run()` is one-shot, no cancel                   | port                                                                   | Browser tabs close mid-run. Upstream exports `abortById` for exactly this. Adding an `AbortSignal` later is a breaking port change; cheaper to add now                                                                                                                                                                                    |
| `version()` is a separate async call             | `cli-sim-runner.ts:78` calls `this.version()` **inside every `run()`** | Per-candidate process spawn just to read a version string — a real cost in the serial loop today, and meaningless for WASM where the version is a build constant                                                                                                                                                                          |

Everything process-shaped (`mkdtemp`, `tmpdir`, `writeFile`, `spawn`, temp-dir
cleanup) is correctly confined to `CliSimRunner`. That confinement is why this
is a small job.

**Verdict: the seam is sufficient; the port file needs a hashing change and
should get an abort signal.** Not a replan.

---

## 3. Determinism — measured, not assumed

This was the biggest open risk, so it was tested rather than reasoned about.

### 3.1 Measured: same seed, different core count → different numbers

`sim/core/sim_concurrent.go:446` splits on `runtime.NumCPU()`, and
`SplitSimRequestForConcurrency` (`:18`) **derives each shard's seed from the
split**:

```go
// Sims increment their seed each iteration. Offset starting seed of each split to emulate that.
nextStartSeed := split[0].SimOptions.RandomSeed + int64(split[0].SimOptions.Iterations)
```

So the shard count changes both the per-shard iteration counts and the per-shard
seeds. Combination is a weighted float sum (`CombineConcurrentSimResults`,
`:334`). **Therefore the core count is an input to the result.**

Experiment run on this machine (Windows 11, 20 logical cores, pinned
`wowsimcli` v0.0.101, `test/fixtures/slamaltman.raid-sim-request.json`,
`randomSeed: "42"`, `iterations: 5000`), varying visible cores with
`start /affinity`:

| Visible cores             | `raidMetrics.dps.avg` |
| ------------------------- | --------------------- |
| 20 (`F...`, unrestricted) | `2042.3926145882197`  |
| 4 (`/affinity F`)         | `2042.3926145882203`  |
| 2 (`/affinity 3`)         | `2042.3926145882210`  |

Reproduce (Git Bash, from repo root; writes into a temp dir of your choosing):

```bash
BIN=./vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe
# build req.json = fixture + {"simOptions":{"iterations":5000,"randomSeed":"42","debugFirstIteration":false}}
"$BIN" sim --infile req.json --outfile full.json          # uses all cores
cmd //c "start /wait /affinity F $BIN sim --infile req.json --outfile aff4.json"
cmd //c "start /wait /affinity 3 $BIN sim --infile req.json --outfile aff2.json"
```

### 3.2 What that actually means — good news

The spread is **6.8e-13 DPS (20→4) and 1.4e-12 DPS (20→2)**, a relative
difference of **6.7e-16** — i.e. double-precision rounding from float summation
order, not a statistical difference. For scale, `docs/verification-log.md`
records the reported SE at ~**1.678 DPS** and the derived cutoff at **3.4 DPS**.
The core-count effect is ~12 orders of magnitude below the cutoff.

Also measured: results are **bit-identical across repeat runs at the same core
count** (20-core A vs B identical; 4-core repeat identical). This refines, and
does not contradict, `docs/verification-log.md:269` ("Shared-seed repeats are
bit-identical") — that entry is true _per machine_, which is all it was ever
run against.

| Question                                                        | Answer                                                               |
| --------------------------------------------------------------- | -------------------------------------------------------------------- |
| Reproducible on the same hardware?                              | **Yes, bit-identical.** Measured                                     |
| Reproducible across different core counts?                      | **No, bit-identical — but equal to ~1e-12 DPS.** Measured            |
| Does that threaten "every number is reproducible" (PLAN.md §2)? | **Not numerically.** It threatens it _only_ as a byte-equality claim |
| Does it threaten the recorded-fixture strategy?                 | **Yes, and this is the real cost** — see §3.3                        |

### 3.3 The consequence that does bite: exact-match fixtures

`RecordedSimRunner.run()` throws `no recording for sim key ${key}` on a miss,
and `simCacheKey` hashes the **request**, not the result. So the _lookup_ is
unaffected by float drift — fixtures replay fine regardless of core count.

The exposure is different and narrower: any test or gate that asserts a
**recorded DPS/delta value with exact equality**, against numbers captured on a
different core count, would fail in the last decimal places. `pnpm verify` in CI
runs on GitHub-hosted runners whose core count almost certainly differs from
this 20-core dev machine.

**Untested:** whether any current assertion is exact-equality on a
live-binary-derived float. `packages/core/test/rank.test.ts` compares two
`RecordedSimRunner` runs against each other (same fixtures, same process), which
is immune. `packages/core/test/cli-sim-runner.test.ts` is the only real-binary
test and `docs/verification-log.md:345-347` states it runs the binary once and
skips when `vendor/` is absent — so CI likely never runs the binary at all.
Verify before relying on this:

```bash
pnpm exec vitest run packages/core/test/cli-sim-runner.test.ts
grep -rn "toBe(\|toEqual(" packages/core/test/cli-sim-runner.test.ts
```

**Recommendation:** state the reproducibility claim as **"same seed + same
`simVersion` + same core count → bit-identical; across core counts, equal to
within 1e-12 DPS"**, and make any live-binary float assertion use
`toBeCloseTo`, not `toBe`. Record the core count alongside `simVersion` in the
assumptions drawer.

### 3.4 WASM vs native — NOT verified

**Unverified. Do not assert either way.** I did not build or run the WASM
artifact. Go's `js/wasm` target uses the same `sim/core` code and Go's float64
semantics, so the _plausible_ expectation is agreement to float rounding —
**hypothesis, untested**. Two specific reasons it could differ beyond that:

1. The browser pool sizes itself independently — `ui/core/sim.ts:143`:
   `Math.min(4, Math.floor(navigator.hardwareConcurrency / 2))`, capped at
   `navigator.hardwareConcurrency` (`:132`). That is a _different split count_
   than `runtime.NumCPU()`, so by §3.1 it is a different (still ~1e-12) number.
2. WASM has no `runtime.NumCPU()` parallelism the same way; splitting is driven
   from JS via `raidSimRequestSplit` / `raidSimResultCombination`
   (`ui/core/sim_concurrent.ts`), against `RaidSimRequestSplitRequest` /
   `RaidSimResultCombinationRequest` in `proto/api.proto`.

Proposed experiment (§6, E1) settles it.

---

## 4. What genuinely breaks in a browser

| Thing                            | Breaks?                                   | Detail                                                                                                                                                                                                                                                                                                                              |
| -------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CliSimRunner` entirely          | **Yes, by design**                        | `node:fs/promises`, `node:os` `tmpdir`, `node:child_process` `spawn`. It is never bundled for the client; a `WasmSimRunner` replaces it **in the client bundle only**. `CliSimRunner` is not retired by any step in this plan — it remains the server-side, batch and CI-fixture path, and it is the same simulator either way (§0) |
| `simCacheKey` in the port file   | **Yes**                                   | `node:crypto` (§2). Async-hashing ripple is the main refactor cost                                                                                                                                                                                                                                                                  |
| WASM payload                     | **Cost, not a break**                     | **Untested size** — not built here. The native binary is 21.2 MiB; a Go WASM build of the same tree is typically the same order, and `brotli` over the wire helps a lot. Measure before committing (E2)                                                                                                                             |
| `db.json` (3.1 MB) to the client | **Probably a non-issue**                  | `data/wowsims.lock.json` records `3,105,094` bytes. Our client needs the _pool + item metadata_, not necessarily all of upstream's db. Upstream ships an equivalent to every browser user today. Cache-immutable, keyed by the pin                                                                                                  |
| Cold start                       | **Real UX cost**                          | WASM fetch + `instantiateStreaming` + `wasmready` before iteration one, on every cold tab. The server path pays this once at boot                                                                                                                                                                                                   |
| WCL secrets                      | **Hard blocker for a pure-client design** | `WCL_CLIENT_ID` / `WCL_CLIENT_SECRET` (PLAN.md §13) can never ship to a browser. `GearSource` **must** stay server-side regardless of where the sim runs. This is why the answer is hybrid, not "move everything to the client"                                                                                                     |

That last row is the structural point: **the topology question applies to
`SimRunner` only.** `GearSource` is pinned server-side by credentials, and
`Store` is pinned server-side by the shared cache.

---

## 5. Recommended topology and migration order

### 5.1 Target: hybrid, sim-at-the-edge-of-the-client

```
Browser:  UI  →  WasmSimRunner (N web workers)  ─┐
                                                  ├→  same rankUpgrades() core
Server:   API →  GearSource (WCL creds)  ─────────┘
               Store (SQLite: gear snapshots + sim kv cache)
               HttpSimRunner / CliSimRunner  ← fallback + warm-cache path
```

Client sims; server keeps credentials, the shared cache, and a fallback runner.
This is exactly upstream's own shape — `ui/worker/net_worker.ts`
(`setupHttpWorker("")`) and `ui/worker/local_worker.ts`
(`setupHttpWorker("http://localhost:3333")`) back the _same_ `WorkerInterface`
as the WASM build, so one interface serves both.

### 5.2 Where caching sits in each topology

|                                                     | Server-side sim                      | Client-side sim                                                                                                            |
| --------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Ranking cache (`contentHash`, §7 payoff 1)          | Server `kv`. Shared across all users | **Still server-side.** Client `POST`s the hash, gets a hit or sims locally then uploads the result                         |
| Job dedupe (§7 payoff 2)                            | Natural — one job row                | **Mostly lost.** Two browsers simming the same character both burn _their own_ CPU. Harmless: the cost is theirs, not ours |
| Per-sim cache (`hash(req)+version+seed+iterations`) | Server `kv`                          | Split: in-memory/IndexedDB per client, plus optional server write-through                                                  |
| Marginal cost per run                               | Server CPU-seconds                   | **Zero**                                                                                                                   |
| Latency predictability                              | Predictable                          | Variable — a 2-core laptop is ~10× a 20-core desktop                                                                       |

**Client-uploaded sim results are untrusted input.** A shared server cache
written by clients is poisonable. Either (a) keep the client cache client-local,
or (b) only trust server-computed entries. **Recommend (a) for Stage 3** —
it keeps the trust model trivial.

### 5.3 Migration order — cheap first, replan last

| #     | Change                                                                             | Cost                                                   | Blocks Stage 1?                | Do when             |
| ----- | ---------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------ | ------------------- |
| **0** | **Fix the serial loop in `rank.ts:258`** — bounded-concurrency map over candidates | **Cheap.** One function, no port change                | It _is_ the current bottleneck | **Now**             |
| 0b    | Hoist `version()` out of `CliSimRunner.run()` (cache it per instance)              | Trivial                                                | No                             | With #0             |
| 1     | Correct PLAN.md §1.1 + §5.3 wording (§6 below)                                     | Doc-only                                               | No                             | Now                 |
| 2     | Add `AbortSignal` to the `SimRunner` port                                          | Small, but breaking                                    | No                             | Before Stage 3      |
| 3     | Make `simCacheKey` runtime-agnostic (drop `node:crypto`)                           | Medium — async ripple                                  | No                             | Before Stage 3      |
| 4     | `WasmSimRunner` adapter + worker pool                                              | **Replan-adjacent**, new build pipeline for `lib.wasm` | No                             | Stage 3/4, after E1 |
| 5     | Client/server split of the cache                                                   | Medium                                                 | No                             | With #4             |

**Critical caveat on #0.** Because each `wowsimcli sim` already uses
`runtime.NumCPU()` threads, `SIM_CONCURRENCY = cores - 1` **processes** would
oversubscribe the box by ~20×. The right near-term concurrency is **small (2–4)**,
and the honest fix is to shrink each request's internal split — which the CLI
gives no flag for. Measure before picking a number (E3). This directly
contradicts PLAN.md §5.3's current sentence and is the most likely way to make
things _slower_ while believing they got faster.

**Nothing in rows 2–5 blocks Stage 1.** Row 0 is the only urgent item, and it is
not a topology change at all.

---

## 6. Proposed PLAN.md edits (specification only — not applied)

**E1 — `PLAN.md:33`, §1.1 Runtime row.** Replace:

> | Runtime | One always-on Node container. Not serverless — the sim is a ~50 MB native binary that needs process spawn and multiple cores |

with wording that states the _credential_ constraint (which is real) instead of
the process constraint (which is not), and names the client path as the target:

> | Runtime | One always-on Node container, pinned there by **WCL credentials and the shared cache**, not by the sim. The sim is a **21 MiB** native binary today (`CliSimRunner`); upstream compiles the same simulator to WASM (`sim/wasm/main.go`), so a `WasmSimRunner` running in the client's browser is the intended Stage 3+ target — see [`docs/plans/compute-topology.md`](plans/compute-topology.md) |

**E2 — `PLAN.md:371`, §5.3 heading.** "`SimRunner` — true external (native
binary)" → "`SimRunner` — true external (simulator; native binary _or_ WASM)".

**E3 — `PLAN.md:383`, §5.3 concurrency sentence.** Replace:

> Concurrency lives in the caller, not the runner: `SIM_CONCURRENCY` (default `cores - 1`). Sims are child processes, so the Node event loop is idle while they burn CPU — which is exactly why the in-process worker is sufficient and a separate worker service is not needed.

with a version that accounts for the measured fact that one invocation already
uses every core:

> Concurrency lives in the caller, not the runner. **A single `wowsimcli sim` already splits across `runtime.NumCPU()` internally** (`sim/core/sim_concurrent.go:446`), so `SIM_CONCURRENCY` is a small process count (2–4), **not** `cores - 1` — that would oversubscribe. The serial `for` loop in `rank.ts` is the actual bottleneck. Sims are child processes, so the Node event loop is idle while they burn CPU; an in-process worker is sufficient and no worker service is needed.

**E4 — `PLAN.md:380`, §5.3 adapter list.** Add a third bullet:

> - `WasmSimRunner` _(Stage 3+, not built)_ — drives upstream's `lib.wasm` in a pool of web workers via `raidSimAsync` / `raidSimRequestSplit` / `raidSimResultCombination`. Zero marginal server cost; requires `simCacheKey` to stop importing `node:crypto`.

**E5 — §7, after the reproducibility-stamp paragraph.** Add the measured
determinism bound:

> **Reproducibility is bit-exact per machine, not across machines.** The sim splits on `runtime.NumCPU()` and derives each shard's seed from the split, so core count is an input. Measured: same seed at 20 / 4 / 2 cores differs by ≤1.4e-12 DPS — ~12 orders of magnitude under the 3.4 DPS cutoff. Live-binary float assertions must use `toBeCloseTo`. See [`docs/plans/compute-topology.md`](plans/compute-topology.md) §3.

**E6 — `PLAN.md:761`, §13 Environment.** Note that `SIM_CONCURRENCY`'s
`cores - 1` default is wrong per E3.

---

## 7. Open questions and experiments

**E1 — Does WASM agree with native for the same request+seed?** _(blocks
migration step 4)_

```bash
git clone https://github.com/wowsims/tbc-new && cd tbc-new
git checkout 8aa378b3671a0923fd11fb34b4b3753e53f20c9b
make wasm            # GOOS=js GOARCH=wasm go build -o dist/tbc/lib.wasm ./sim/wasm/
```

Then drive `raidSim` from Node's `WebAssembly` + upstream's `wasm_exec.js` with
`test/fixtures/slamaltman.raid-sim-request.json` at `randomSeed: "42"`, and diff
`raidMetrics.dps.avg` against the native `2042.3926145882197`. **Expected
(hypothesis): agreement to ~1e-12.** Accept if the delta is well under the 3.4
DPS cutoff.

**E2 — How big is `lib.wasm`, gzipped and brotli'd?** _(sizes the cold-start
argument; currently unmeasured)_

```bash
ls -l dist/tbc/lib.wasm
gzip -9 -c dist/tbc/lib.wasm | wc -c
brotli -q 11 -c dist/tbc/lib.wasm | wc -c
```

**E3 — What process concurrency actually helps?** _(gates migration step 0's
constant)_ Time the existing candidate loop at `SIM_CONCURRENCY` 1, 2, 4, 8 on
this 20-core box, wall-clock for a full ranking. **Hypothesis: gains flatten by
2–4 and regress by 8**, because each process already claims all cores.

**E4 — Does any CI assertion compare a live-binary float exactly?**

```bash
pnpm exec vitest run packages/core/test/cli-sim-runner.test.ts
grep -rn "toBe(\|toEqual(" packages/core/test/cli-sim-runner.test.ts
```

**E5 — Does upstream's `db.json` subset down?** Unmeasured. If the client only
needs pool items + display metadata, the 3.1 MB may fall a lot. Only matters if
E2 shows the payload is already tight.

---

## 8. Explicitly unverified

- **WASM numerical agreement with native** (§3.4) — not built, not run.
- **`lib.wasm` size, compressed or otherwise** (§4) — not built. The 21.2 MiB
  figure is the _native_ binary only.
- **Browser cold-start time** — no measurement on any device.
- **CI runner core count**, and whether CI ever executes the native binary
  (§3.3) — inferred from `docs/verification-log.md:345-347`, not from a CI log.
- **Whether any existing assertion is exact-equality on a live-binary float**
  (§3.3, E4).
- All measurements in §3.1/§3.2 are from **one machine** — Windows 11, 20
  logical cores, `wowsimcli` v0.0.101 `win32-x64`. No Linux or macOS run.
