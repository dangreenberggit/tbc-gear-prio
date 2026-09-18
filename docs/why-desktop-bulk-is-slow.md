# Why bulk screening takes 158 s when simming each candidate one by one takes 97 s

Personal-development explainer, written as a 411 follow-up. Grounded in the code
of `vendor/tbc-new-fork` and the 411 measurement
(`.scratch/stage-gate/411-desktop-bulk-wallclock/`). Line numbers are as of fork
commit `993320fab`; they may drift as the fork moves.

## 1. What both routes compute

The upgrades tab ranks candidate items by simulated DPS (damage per second). One
**iteration** is one complete simulated boss fight with random dice rolls for
every attack. The Go server (the sim engine, written in the Go language) repeats
that fight `Iterations` times in a plain loop and averages the DPS:

`vendor/tbc-new-fork/sim/core/sim.go:326`

```go
	for i := int32(1); i < sim.Options.Iterations; i++ {
```

This is a Monte Carlo estimate (run the fight many times with random rolls and
average the results). Its error (how far the average may be from the true value)
shrinks with the square root of the iteration count. The engine computes the
error as the standard deviation (a number that says how widely the per-fight
results are spread around the average) divided by the square root of the count:

`vendor/tbc-new-fork/sim/core/bulk/statistics.go:165-170`

```go
func bulkSimDpsError(metrics *proto.DistributionMetrics, iterations int32) float64 {
	if metrics == nil || iterations <= 0 {
		return 0
	}
	return metrics.Stdev / math.Sqrt(float64(iterations))
}
```

So halving the error costs four times the fights, and the cost of one candidate's
estimate is proportional to its iteration count. Both arms of ticket 411 ran at
20000 iterations per candidate, so the per-candidate estimate was equally precise
on both routes; the measurement's accuracy checks confirm the two routes agree to
within 2.2 DPS.

Each single 20000-iteration sim is itself split across goroutines (lightweight
threads the Go runtime schedules; each runs its own share of the fight loop at the
same time as the others). On the 20-core test box the server logs "Running 20000
iterations on 20 concurrent sims." for every request on both arms:

`vendor/tbc-new-fork/sim/core/sim_concurrent.go:526-530`

```go
		log.Printf("Running %d iterations on %d concurrent sims.", csd.IterationsTotal, csd.Concurrency)
	}

	for i, req := range splitRes.Requests {
		go RunSim(req, substituteChannels[i], signals)
```

### A note on where this all runs (the desktop app)

When a user downloads and runs the desktop app, `wowsimtbc.exe` starts a small web
server on their own machine. The window they interact with is just a client; every
simulation — loop or bulk — is sent as an HTTP request (a message to the server,
here over the local machine's own network loopback, not the internet) to that
local server process, which does the actual computation and returns the numbers.
This matters for the naming below: the loop's runner class was once called
`WasmSimRunner` (WASM = WebAssembly, sim code compiled to run inside the browser
with no server round-trip) — accurate for the web build but a misnomer on the
**desktop** build, so it is now `WorkerPoolSimRunner`. The packaged app rewrites
the browser's worker script from `sim_worker.js` to `net_worker.js`, which turns
each per-candidate call into a real HTTP request to the local server rather than
running in-browser. Both 411 arms therefore used the
**same transport** — server-backed HTTP against the same `wowsimtbc.exe` — and
differ only in the shape of the requests (see §2). The comparison is
apples-to-apples. (`scripts/check_desktop_tab.py:4-9, 505-512`; the loop arm's
readback `evidence/L1.json` shows 87 `raidSimAsync` HTTP calls to
`localhost:3333` and zero WebAssembly in the served worker.)

## 2. The pipeline both routes share

The ranking engine (`rank.ts`, written in TypeScript, the language the browser tab
runs) builds the candidate list, gets a DPS number for every candidate, then runs
a final step (re-simulating the top 8 items across additional seeds; a seed is the
starting number for the random rolls, so a different seed gives an independent set
of fights). Cap 40 keeps the first 40 candidates in EP order (a pre-ranking by
fixed stat weights, no simulation) plus every item already equipped, which for ret
P5 is 65 candidates:

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/rank.ts:1190-1195`

```ts
// Every eligible candidate gets a full-iteration sim; the cap keeps the
// first N of the EP order plus every owned row regardless of N (§5.1.1).
const cap = input.candidateCap ?? ordered.length;
const simCandidates = ordered.filter(
  (e, i) => i < cap || equippedIds.has(e.itemId)
);
```

The two routes differ only in how each candidate's DPS number is obtained. The
bulk route first runs `screenCandidates`, a single `await` (the program pauses on
this line until the whole result comes back), and only then schedules the
per-candidate work:

`rank.ts:1225-1231`

```ts
const screened = signal?.aborted
  ? undefined
  : await screenCandidates(simCandidates);
const dispatchedCandidates = signal?.aborted ? [] : simCandidates;
const tasks = dispatchedCandidates.map((entry) => () => runCandidate(entry));
```

Inside `runCandidate`, the screened number, when present, replaces the
per-candidate sim call; when absent, the loop route sims the candidate itself:

`rank.ts:1033-1035`

```ts
        let candObs = screened?.byKey.get(screenKey(entry.itemId, slotIndex));
        if (candObs) {
          candBaselineDps = screened!.baselineDps;
```

`rank.ts:1057-1059`

```ts
        if (!candObs) {
          try {
            candObs = await deps.sim.run(candReq, runOpts);
```

Everything after that is identical on both routes. Both then run
`replicateTopItems`, which is the final step (re-simulating the top 8 items across
additional seeds):

`rank.ts:1350`

```ts
if (!aborted) await replicateTopItems(ranked, winningRequests, baselineDps);
```

`rank.ts:1455-1457`

```ts
const top = ranked
  .filter((item) => !item.belowCutoff && item.simmed !== false)
  .slice(0, PAIRED_REPLICATE_TOP_N);
```

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/se.ts:6`

```ts
export const PAIRED_REPLICATE_TOP_N = 8;
```

On the bulk arm this final step is measurable: the first row appears at 103.8 s
(when the screen returns) and the run finishes at 157.7 s, so the final step takes
about 54 s (`evidence/B1.json`). The loop arm runs the same final-step code at the
same iteration count. The final step was not timed separately on the loop run, so
the loop's candidate phase below is taken as 97 − 54 ≈ 43 s, on the basis that the
same code at the same iteration count takes the same time.

The end-to-end gap is therefore in the candidate phase: about 102 s on bulk versus
about 43 s on the loop. The rest of this document accounts for that 59 s.

## 3. Where the bulk candidate phase spends 102 s

The Go server logs each stage with its duration (`evidence/server-B1.log.err`).
For run B1:

| chunk | candidates | high stage | finalist stage                       |
| ----- | ---------- | ---------- | ------------------------------------ |
| 1     | 25         | 29.28 s    | 19.56 s (5 finalists, 20000 → 80000) |
| 2     | 25         | 28.82 s    | 6.73 s (5 finalists, 20000 → 40000)  |
| 3     | 15         | 17.66 s    | skipped                              |

Sum: 75.8 s of high stage plus 26.3 s of finalist stage = 102.1 s, matching the
103.8 s first row. Three things put that number above the loop's 43 s.

### 3a. The high stage sims candidates one after another; the loop runs four at a time

The 65 candidates cost 75.8 s in the bulk high stages, about 1.17 s each. The
client sends the candidates in chunks (groups) of 25, one chunk after another:

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/bulk/partition.ts:80`

```ts
export const MAX_CANDIDATES_PER_BULK_REQUEST = 25;
```

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/adapters/bulk_screen_driver.ts:84-86`

```ts
		for (const chunk of chunks) {
			if (userAborted) break;
			const request = buildBulkSimRequest({ ...req, candidates: chunk });
```

`bulk_screen_driver.ts:110-116`

```ts
			try {
				const mapped = bulkScreenResultFrom(await deps.dispatch(request, signals), chunk.length, deps.simVersion);
				// Each chunk re-probes its own baseline, so later chunks would
				// otherwise overwrite the first. Keeping the first makes every
				// screening delta in this batch share one reference point.
				baseline ??= mapped.baseline;
				rows.push(...mapped.rows);
```

Chunks do not overlap: the `await` inside the `for` loop means chunk 2 is not sent
until chunk 1 has fully returned. Within a chunk, the Go high stage is configured
with `UseConcurrentSim: true`, which sets the stage-level concurrency (how many
candidates are simmed at the same time) to exactly 1:

`vendor/tbc-new-fork/sim/core/bulk/stage.go:44-48`

```go
	{
		Stage:            proto.BulkSimStage_BulkSimStageHigh,
		MinIterations:    1000,
		TargetErrorPct:   0.05,
		UseConcurrentSim: true,
	},
```

`stage.go:63-66`

```go
func GetBulkSimStageConcurrency(request *proto.BulkSimRequest, config BulkSimStageConfig) int {
	if config.UseConcurrentSim {
		return 1
	}
```

The server log confirms it: "Concurrency: 1" at the top of every high stage. The
candidate batch is a queue with `concurrency` workers pulling from it, so with 1
worker the 25 candidates are walked serially (one after another, not overlapping),
each one splitting its own 20000 iterations across the 20 goroutines:

`vendor/tbc-new-fork/sim/core/bulk/batch.go:49-56`

```go
	for range max(1, batch.concurrency) {
		wg.Go(func() {
			for task := range jobs {
				if signals.Abort.IsTriggered() {
					return
				}

				candidateResult := runSingleBulkSimCandidate(request, task.Candidate, batch.iterations, batch.seedOffset, signals, config.UseConcurrentSim, func(progressMetrics *proto.ProgressMetrics) {
```

The loop route sends one HTTP request (one message to the local server) per
candidate through a pool of 4 workers, so up to 4 candidate sims run on the server
at the same time, each also split across 20 goroutines:

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/adapters/worker_pool_sim_runner.ts:48`

```ts
export const DEFAULT_WORKER_COUNT = 4;
```

`worker_pool_sim_runner.ts:101-103`

```ts
	constructor(numWorkers: number = DEFAULT_WORKER_COUNT) {
		this.pool = new WorkerPool(numWorkers);
		this.concurrency = Math.max(1, Math.min(numWorkers, memoryCapFromDeviceMemory()));
```

`worker_pool_sim_runner.ts:131`

```ts
const result = await this.pool.raidSimAsync(proto, () => {}, signals);
```

`rank.ts:1232` and `rank.ts:1250`

```ts
const concurrency = deps.concurrency ?? 1;
```

```ts
await promisePool(tasks, concurrency);
```

The L1 server log shows at most 4 sims running at the same time (counted from
`evidence/server-L1.log.err`). The loop's candidate phase is about 43 s for 65
candidates, about 0.66 s each on the wall clock (elapsed real time), versus 1.17 s
each for the bulk high stage. The per-candidate difference was not measured
directly; the likely cause is that 4 requests × 20 goroutines keeps all 20 cores
busy through each request's start-up and finish, while 1 × 20 leaves cores idle
between candidates.

### 3b. Each chunk sims the baseline before any candidate

Every high stage first runs the unmodified equipped gear (the "baseline") up to
the stage minimum, to measure how spread out its results are, which sets the
iteration target:

`stage.go:96-98`

```go
	maxBaselineSims := 2
	maxTotalSims := len(candidates) + maxBaselineSims
	probeDelta := max(0, minIterations-carriedIterations)
```

`stage.go:106-113`

```go
	baselineProbe := carry.baselineResult()
	probeIterations := carriedIterations
	if probeDelta > 0 {
		baselineProbe = runBulkSimBaselineSegment(request, config, baselineProbe, probeDelta, carriedIterations, probeEmitter, 0, 0, signals)
		if baselineProbe.Error != nil {
			return BulkSimStageResult{Baseline: baselineProbe}
		}
		probeIterations = minIterations
	}
```

The log records this as "Total runs: 26-27 (baseline probe, optional baseline,
candidates)" per chunk. Three chunks means three 20000-iteration baseline sims,
about 3.5 s in total at the observed per-sim cost. The loop sims the baseline once.

### 3c. The finalist stage re-sims the top 5 of each chunk at up to 4x the iterations

The client asks the server to refine 5 finalists (the 5 highest-DPS candidates in
the chunk) and passes the tab's 20000 as the high-stage minimum:

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/adapters/bulk_request_builder.ts:25`

```ts
export const BULK_FINALIST_RESULTS = 5;
```

`bulk_request_builder.ts:128-130`

```ts
		topResults: req.candidates.length,
		finalistResults: BULK_FINALIST_RESULTS,
		highStageIterations: req.iterations,
```

After the high stage, and before the response is built, the server runs the
finalist stage:

`vendor/tbc-new-fork/sim/core/bulk/bulk_sim.go:189`

```go
	latestBaseline, finalistResultsList, finalistMetrics = runBulkSimFinalistStage(request, latestBaseline, latestResults, finalistResults, progress, signals)
```

It takes the top 5 candidates and the baseline, and keeps doubling their iteration
count until every adjacent pair in the ranking is statistically separated, or until
it has spent 3x the starting iterations:

`stage.go:279-289`

```go
	extraBudget := iterations * BulkSimFinalistMaxExtraIterationMultiplier
	extraUsed := int32(0)
	for extraUsed < extraBudget && bulkSimUnresolvedFinalistPair(finalists) {
		if signals.Abort.IsTriggered() || hasBulkSimStageError(baseline, finalists) {
			break
		}
		// Double the sample each round: the paired error shrinks with sqrt(n), so smaller
		// steps mostly re-discover that the pair is still unresolved.
		additionalIterations := min(iterations+extraUsed, extraBudget-extraUsed)
		baseline, finalists = rerunBulkSimStageAdditionalIterations(request, candidates, config, progress, signals, concurrency, baseline, finalists, iterations+extraUsed, additionalIterations)
		extraUsed += additionalIterations
```

"Statistically separated" means the DPS gap between two neighbours is more than
1.96 paired standard errors (the 95% confidence threshold; "paired" means the two
candidates' fights used the same random rolls, so their difference is measured more
precisely than either value alone):

`statistics.go:130-141`

```go
func bulkSimUnresolvedFinalistPair(sortedFinalists []*BulkSimCandidateResult) bool {
	for idx := 0; idx+1 < len(sortedFinalists); idx++ {
		upper, lower := sortedFinalists[idx], sortedFinalists[idx+1]
		pairedError, ok := bulkSimPairedDpsError(lower.DpsMetrics, upper.DpsMetrics)
		if !ok || pairedError == 0 {
			continue
		}
		if math.Abs(upper.DpsMetrics.Avg-lower.DpsMetrics.Avg) <= bulkSimZ95*pairedError {
			return true
		}
	}
	return false
}
```

The logs show chunk 1 went 20000 → 40000 → 80000 (two rounds, 19.6 s), chunk 2
went 20000 → 40000 (one round, 6.7 s), and chunk 3 skipped the stage because its
top 5 were already separated. That is 26.3 s of simulation, 16.7% of the bulk run,
and the loop route has no equivalent step. The refined numbers also do not change
the ranking the tab shows: the client reads only `dps` per row, and the shared
final step (re-simulating the top 8 items across additional seeds, §2) re-sims the
top rows anyway.

### 3d. The shared final step recovers none of it

The 54 s final step (re-simulating the top 8 items across additional seeds) after
screening is the same code at the same iteration count on both routes, plus the
set-bonus package sims. Bulk enters it 102 s after the click; the loop enters it
about 43 s after the click. Nothing in the final step is skipped because screening
happened; the screened number only substitutes for one `deps.sim.run` call per
candidate (rank.ts:1033-1059 above).

## 4. Why the "cheaper" route was not cheaper here

The idea behind bulk is that it should do less total work: the bulk engine can
choose its own iteration count from a target error and stop early when a candidate's
estimate is already precise enough, rather than always running a fixed count. That
is a real mechanism in the code (see `stage.go` target-error logic below).

But it did not save time here, and it is worth being precise about why, because an
earlier version of this note got it wrong. **Ticket 346's final resolution found
that at matched accuracy the two routes ran essentially the same total iterations —
a wash, within about 10%.** The ~3.8x worker-seconds (total CPU time summed across
all workers) advantage that bulk showed in an early 346 measurement was reassigned
by that ticket's own resolution to **better parallelization**, not to fewer
iterations. So "bulk saves work by stopping early" is not what actually drove
bulk's CPU-time number; do not repeat that claim.

In ticket 411 both arms were set to 20000 iterations for matched accuracy, and the
tab's value is a minimum, not a maximum:

`stage.go:203-215`

```go
func getBulkSimStageMinIterations(highStageIterations int32, config BulkSimStageConfig) int32 {
	if config.Stage == proto.BulkSimStage_BulkSimStageHigh && highStageIterations > 0 {
		return highStageIterations
	}
	return config.MinIterations
}

func getBulkSimStageIterations(request *proto.BulkSimRequest, config BulkSimStageConfig, baselineMetrics *proto.DistributionMetrics, candidateCount int) int32 {
	minIterations := getBulkSimStageMinIterations(request.HighStageIterations, config)
	// The user-defined high-stage iteration count is a floor, not a cap. Every
	// stage still uses enough iterations to satisfy its target error when needed.
	targetIterations := getBulkSimTargetIterations(config.TargetErrorPct, baselineMetrics, candidateCount)
	return max(minIterations, targetIterations)
}
```

At 20000 the minimum is the larger of the two numbers, so it is the count that runs
(the log reads "Iterations: 20000", "Observed error: 0.05%"), and bulk does at
least as much per-candidate work as the loop, with no early stop. The chunk size of
25 also keeps every request on the single-stage path: the low and medium stages,
which would discard weak candidates after a cheap short sim before the expensive
stage, never run, so there is no saving from discarding either. What remains of the
bulk route at matched accuracy is only its overheads: candidates simmed one after
another (§3a), a baseline sim per chunk (§3b), and the finalist stage (§3c). And
because the loop parallelizes 4-wide where bulk runs serially, the loop is both
faster on the clock and — since matched-accuracy iteration totals were a wash — not
meaningfully worse in total CPU either.

The one first-row consequence is a side effect of the same structure: because
`screenCandidates` is one `await` over all three sequential chunks and rows are
emitted only inside `runCandidate` (`rank.ts:1185-1187`,
`onProgress?.({ kind: "row", row: item })`), the bulk route shows nothing until the
whole 102 s is over.

## 5. Summary

Bulk 158 s = 102 s of Go stages run one after another (76 s high stage, 26 s
finalist stage, including three baseline sims) + 54 s for the final step
(re-simulating the top 8 items across additional seeds). Loop 97 s ≈ 43 s of
candidate sims run four at a time + the same 54 s final step. At matched 20000
iterations bulk cannot stop early (the count is a floor), so it pays its
overheads and its total iteration count is no lower than the loop's; the loop wins
on the clock because it parallelizes where bulk runs serially.
