# 403 — Bulk screening asks the Go finalist stage to rank 25 candidates; it burns 73% of the run on work we discard

Status: closed
Closed: 2026-09-17
Type: task
Origin: `.scratch/carry-forward/issues/397-desktop-bulk-screen-not-a-speed-win.md` (investigation half, completed 2026-09-15)
Blocks: —
Blocked by: none

## What

Our upgrades tab sets `topResults: req.candidates.length` — the full 25-candidate
chunk — when building a `BulkSimRequest`
(`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/adapters/bulk_request_builder.ts:115`).
That value sizes the Go engine's **finalist refinement stage**, which then tries
to statistically separate every adjacent pair of 25 gear sets at 95% confidence.
It cannot, it exhausts its whole budget trying, and we throw the result away.

Measured on the 3419 s desktop full-pool run (397, all numbers cited there by
file and field):

- finalist stage = **72.9% of wall clock** (2494 s of 3420 s) across 29 chunks
- all **29 of 29** chunks exited at exactly **4.000×** their entry iterations —
  the hard budget ceiling (`entry + 3× extra`), so every chunk ended on budget
  exhaustion, never on convergence
- every chunk logged `Survivors: 25` of `Input gear sets: 25` — nothing eliminated
- screening on vs off, same binary, same 20 candidates: **264 s vs 13 s** (20.3×)
  for **byte-identical rows**, same 8 above-cutoff items in the same order

The client consumes one scalar per candidate — `const deltaDps = candObs.dps -
candBaselineDps` (`rank.ts:1071`). Everything the finalist stage computes beyond
that mean is discarded.

## Why it happens

`topResults` carries **two unrelated meanings** in the engine, and we set it for
one of them without knowing about the other.

1. It truncates the response — leaving it at the default 5 makes 20 of 25
   candidates silently vanish from the results (`bulk_sim.go:197`,
   `topBulkSimResults(latestResults, topResults)`). This is the reason our code
   overrides it, and it is the **only** reason our comment at
   `bulk_request_builder.ts:66-69` gives.
2. It also sizes the finalist set, and therefore that stage's cost. Nothing in
   our code acknowledges this.

The Go stage is correct for what it was designed for. `BulkSimDefaultTopResults
= 5` (`bulk_sim.go:12`); the only other caller in the tree passes 5
(`ui/core/sim.ts:563`). Its doc comment (`stage.go:241-248`) states a real
requirement — stop near-tied *displayed* results reordering between seeds.
Pairwise separation over 5 items is cheap and reachable. Over 25 near-tied gear
sets it is neither.

**Owner's judgment, 2026-09-15:** 25 candidates is out of the running. The stage
might eventually be worth something at top-2 or similar if we ever want it, but
for our use it is expensive and close to pointless — and it does not work
correctly at our size class in any case. Treat "make it converge at 25" as a
non-goal.

## Provenance — read this before planning a fix

**The Go code is upstream's and we have not modified it.** The finalist stage
(`sim/core/bulk/stage.go`), the ungated call (`bulk_sim.go:186`) and the pairwise
test (`statistics.go:130-142`) all arrived in one upstream commit `b7bf678cd`
("port over MOP finalisation stage changes", 2026-09-01, an upstream
contributor). `git diff upstream/master HEAD` is **empty** for all three files.
The call was never gated: `useLegacyBulkSim` predates the finalist stage by a
month and only ever gated stage-loop stages; no guard was added and none removed.

**The `topResults` line is ours**, in our fork — commit `ed88f07b5`
("Add a bulk screening pass behind an optional runner capability", 2026-09-01).

**Repo boundary that decides where the fix lands:** the file is in
`vendor/tbc-new-fork`, the wowsims fork clone. It is **not** tbc-gear-prio code —
`git ls-files | grep -c bulk_request_builder` in the core repo returns **0**. Any
fix here is a **fork** change and goes through the fork queue (single shared
working tree, strictly serial — never two agents at once).

**Reachability:** server/HTTP only. `sim/wasm/main.go` imports `sim/core/bulk`
but calls only `BulkCombinationCount` and `BulkCandidates`; the sim-execution
entry points `bulk.BulkSim`/`BulkSimAsync` are called only from `sim/web/bulk.go`
(the desktop binary). The WASM tab never pays this cost, which is why the desktop
path measured slower than the web path — the inverse of what the plan predicted.

## Two supporting defects found alongside

- **The stage's status line is misleading.** It logs `Target error: 0.00%`
  because `BulkSimFinalistStageConfig` (`stage.go:24`) sets only a stage name and
  a concurrency flag, leaving `TargetErrorPct` at Go's zero value — and that
  field never governs the loop anyway. The stage reuses
  `formatBulkSimStageSummary`, built for the accuracy stages, so it prints a
  field it does not consult while its real stopping test is never logged.
- **No test coverage.** `sim/core/bulk/` has two `_test.go` files; neither
  mentions "finalist" at any size. Nothing in CI could have caught the mismatch.

Both are upstream's. Neither needs fixing here; they explain why this went
unnoticed and they are candidates for an upstream report.

## Levers, in rising blast radius

1. **Client-side only, our fork's TypeScript.** Stop handing the full chunk to
   the finalist stage. The constraint is meaning (1) above: `topResults` cannot
   simply drop to 5 without losing 20 candidates from the response, so the work
   is separating the two meanings — not a one-line change. **Touches no Go**,
   so it avoids the 3419 s re-verify the plan's stage-gate routing was written
   around.
2. Skip the finalist stage when the caller reads only `dps`. Likely a Go change.
3. Gate the finalist call the way the culling stages are gated. Go change,
   diverges from upstream, and would need carrying across future syncs.

Lever 1 is the one the owner's judgment points at. Levers 2 and 3 modify upstream
code we currently match byte-for-byte; weigh the sync cost before proposing them.

## Done when

The desktop screening path no longer spends its budget on finalist refinement we
discard, **and** the fix is shown not to change the ranking — the cap-20 pair is
the natural check, since screening on vs off already produces byte-identical rows
(`smoke-3333-cap20.json` vs `smoke-3333-cap20-fallback.json`).

Do **not** re-run the 3419 s full pool to validate this. A capped run is enough.

## Evidence

Everything is in 397's "Investigation, 2026-09-15" section, committed at
`1234bdd8`, with the handoff at
`.scratch/handoffs/397-finalist-stage-cost-HANDOFF.md`.

**Caveat on reproducing it:** the per-stage attribution came from
`.scratch/stage-gate/desktop-transport-gate/server-3333.log.err`, the packaged
server's stderr. That file is **untracked** (the stage `.gitignore` excludes
`*.log.err`) and there is **no command that regenerates it** — it is a one-time
capture from a 57-minute run. The committed readback JSONs corroborate the
top-line figures (`elapsedS`, `bulkSimAsync` 29, the 264 s/13 s smoke pair and
their identical rows) but not the per-stage split.

## Fix, 2026-09-16

**Track C chosen** (owner, 2026-09-15): the tab now takes the per-candidate loop
on the desktop (HTTP) transport, the same path the web tab already ships. No Go
change, no proto change, no upstream divergence. `simRunner()` in
`upgrades_tab.tsx` resolves to the WASM-factory runner unconditionally; the
`WorkerPool(1).isWasm()` transport probe and the `BulkHttpSimRunner` construction
are gone. Track A (a `skip_finalist_stage` proto field) was specified and dropped
— it was about 6x slower than the loop and would have *reduced* precision while
adding a divergence to carry.

**Measured at cap 40 on this machine** (ret P5, fork `e94d927af`, artifacts under
`.scratch/stage-gate/bulk-finalist-cost/`, re-runnable with
`node run-tab-cdp.mjs --origin http://localhost:3333 --candidates 40 --out <f>`):

| Run | `elapsedS` | `runner` | `bulkSimAsync` | file |
| --- | --- | --- | --- | --- |
| screened (pre-fix) | **263 s** | `BulkHttpSimRunner` | 3 | `prefix-cap40-screened.json` |
| loop twin (pre-fix, `--force-fallback`) | **19 s** | `WasmSimRunner` | 0 | `prefix-cap40-loop.json` |
| desktop (post-fix) | **19 s** | `WasmSimRunner` | 0 | `c-cap40-desktop.json` |

**13.8x faster.** The finalist stage accounted for 174.5 s of the screened run's
263 s (two stage `Duration:` lines, 87.27 s and 87.22 s) — 66%, consistent with
the 60-63% measured at cap 20.

**No ranking change, proved by byte-equality rather than a noise bound.** The
post-fix desktop run's `rows` and `aboveCutoffItems` are **exactly equal** to the
pre-fix loop twin's. Against the pre-fix *screened* run,
`check_desktop_tab.py --compare` exits 0: T2 max 8.1 over 32 rows (limit 12.0),
T3 max 0.0 over the top 8, T4 median 0.0, `aboveCutoffSymDiff` 1.

**Cap 150, twice, on the pre-fix binary** (`prefix-cap150-loop.json` and
`-2.json`): 134 rows, 201 `raidSimAsync`, **40 s both times**, and the two runs
agree **exactly** on `rows`, `aboveCutoffItems` and `baselineDps`. That
determinism is what licenses the new golden gate's exact-equality comparison.
Refitting cost over three points (20/13 s, 40/19 s, 134/40 s) gives 0.233 s/row
on 8.96 s fixed; the full pool at 601 rows projects to **149 s, band 86-211 s**,
against today's measured 3419 s — **hypothesis, untested**, since constraint 5
forbids running the full pool.

**What precision changed.** Rows 9..N that are above cutoff move from screening
values to 3,000-iteration loop values: an SE upper bound of about 3.3 DPS against
roughly 0.65 today (C25/C32 in the plan). This is exactly the web tab's own
precision, on the path it ships by default. The global top 8 are **untouched** —
`replicateTopItems` re-prices them with 5-seed paired replication on both
transports regardless of screening, at a measured SE of 0.018-0.088 DPS. The
per-slot precision gap the owner identified is ticket 404's, unchanged here.

**Gate.** `scripts/check_desktop_tab.py` (b)/(c) inverted to assert
`WasmSimRunner` with `bulkSimAsync == 0 and raidSimAsync >= 1`; the
screened-vs-twin check (h) is replaced by a comparison against a committed golden
readback at `data/desktop-gate/golden-ret-p5-cap40.json`. The N2 negative retires
(a forced fallback is no longer distinguishable from the normal path).

**`BulkHttpSimRunner` and the bulk screening code stay in the tree** — dead at
runtime on both transports, removal ticketed as **406**. Read this ticket before
re-enabling: the cost is not the RPC, it is that `topResults` must equal the
chunk size, which makes the finalist stage refine every candidate.

Closed 2026-09-17. The Track C fix commits `182243da` and `ee31569d` are on
`dev`, and `dev` is an ancestor of this feature branch's HEAD, so every 403
number the rest of the bulk cluster cites is already merged; the golden gate at
`data/desktop-gate/golden-ret-p5-cap40.json` exists and `check_desktop_tab.py`
asserts it. The Done-when is met — the desktop path takes the per-candidate loop
and the fix is proved byte-equal — so the `open` line was merge-tracking residue,
not remaining work. Removal of the now-dead `BulkHttpSimRunner` / bulk screening
code is tracked separately as **406**.
