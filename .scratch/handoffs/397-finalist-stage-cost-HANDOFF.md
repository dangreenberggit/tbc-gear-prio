# Handoff — workstream C / ticket 397 closed out (investigation half)

Written 2026-09-15 by the session that ran workstream C. Every number below is
cited by file and field. Nothing was fixed; the fix remains out of scope by the
plan's own scoping.

## Bottom line

**397's investigation is done and the ticket names a measured cost driver.** The
finalist refinement stage is **72.9% of the 3419 s desktop run's wall clock**, it
**never converges** (all 29 chunks exit at exactly 4.000x their entry iterations,
which is budget exhaustion), and **none of its statistical product reaches the
ranking** — the client reads one scalar mean per candidate. Both leads the plan
named (`asyncProgress` poll volume, `WorkerPool(1)` serialisation) are **ruled
out with measurements**, not with arguments.

The desktop path is not running slowly. It is running about **24x more
simulation** for a byte-identical answer.

Full write-up is appended to the ticket itself:
`.scratch/carry-forward/issues/397-desktop-bulk-screen-not-a-speed-win.md`,
section "Investigation, 2026-09-15". Committed as `1234bdd8`.

## Branch state

| Thing | Value | How established |
| --- | --- | --- |
| Branch | `feat/desktop-transport-gate` at `1234bdd8` | `git -C <core> rev-parse HEAD` after commit |
| Commits ahead of `dev` | 22 (was 21 at `8180dfd0`) | this session added exactly one |
| Working tree | clean | `git status --porcelain` empty before and after |
| Files changed | one, the 397 ticket (+156 lines) | commit stat |
| Fork tree | **not touched** | no fork edit was made or needed |

**Not merged.** The CRLF/`fork-universes:check` merge blocker (workstream E) is
outside what this session did; nothing here changes its status. Ask the owner
before any merge, per the standing rule.

## No new simulation run was made

The ticket's predicted first step was to look for `result.StageMetrics` /
`result.Timings` in the recorded readbacks before running anything. **That check
came back negative** — searching `readback-3333-tip.json`,
`smoke-3333-cap20.json` and `smoke-3333-cap20-fallback.json` for `stageMetrics`,
`StageMetrics`, `simmingSeconds`, `Timings` and `finalist` returns **zero matches
in all three files**. The readbacks never captured those fields.

The data was instead in a file no prior handoff had opened:

**`.scratch/stage-gate/desktop-transport-gate/server-3333.log.err`** — the
packaged `wowsimtbc` server's own stderr, 14,643 lines. The Go bulk path logs
every stage start and finish with a timestamp, the candidate count, the iteration
count, the stage config and a `Duration:` field. That is the full per-stage
attribution, already on disk.

**Caveat that matters for anyone re-deriving this:** that file is **untracked**.
The stage's own `.gitignore` excludes `*.log.err`, so it will not survive a fresh
clone. The committed readback JSONs corroborate the top-line figures but not the
per-stage breakdown.

## The measurements, with their sources

### Segmenting the log

The log spans 16:31:36 to 18:23:19 local and contains four runs, not one. Split
on time gaps greater than 45 s between consecutive timestamped events. The full
tab run is the window **17:26:19 to 18:23:19**, which is 3420 s and matches
`readback-3333-tip.json` `elapsedS` 3419 / `wallClockS` 3423.3, with `recordedAt`
2026-09-15T01:23:19Z (local is UTC+7h). An earlier partial run at 16:39-17:25 is
**not** the tab run — an earlier pass of mine mistakenly included it and produced
a 6246 s span, which is impossible against a 3419 s run. Bound the window by
elapsed time, not by line number.

### Cost attribution, full run (window 17:26:19-18:23:19)

Bulk stages are strictly serial — maximum concurrently-open stages is 1, verified
by walking the Started/Finished markers — so stage walls sum cleanly.

| Stage | Count | Wall | Share of 3420 s | Iterations |
| --- | --- | --- | --- | --- |
| `high` | 29 | 886 s | 25.9% | 14,827,038 |
| `finalist` | 29 | 2494 s | **72.9%** | 43,776,698 |
| outside bulk stages | — | 40 s | 1.2% | 150,000 |
| total | | | | 58,753,736 |

29 and 29 match `readback-3333-tip.json` `requests.bulkSimAsync` = 29 exactly.

### The finalist loop always exhausts its budget

From the 29 `Stage: finalist - Started` / `- Finished` pairs:

- entry `Iterations so far`: 15,027 to 19,853, mostly ~19,700
- exit `Iterations`: **exactly 4.000x entry in 29 of 29 chunks** (min 4.000, max 4.000)
- every chunk logs `Survivors: 25` against `Input gear sets: 25` — nothing is eliminated
- mean duration 86.0 s (min 36.1, max 91.7)
- observed error at exit already 0.02-0.03%, against a logged `Target error: 0.00%`

4x is the ceiling: `stage.go:277` sets `extraBudget := iterations *
BulkSimFinalistMaxExtraIterationMultiplier`, the multiplier is 3
(`bulk_sim.go:19`), and entry + 3x extra = 4x. Hitting it every time means the
loop exits on budget exhaustion, never on the pairs resolving.

**Why it cannot resolve:** `bulkSimUnresolvedFinalistPair`
(`statistics.go:130-142`) returns true if *any* adjacent pair in the sorted list
overlaps at 95% confidence, and the client sets `topResults:
req.candidates.length` (`bulk_request_builder.ts:115`), making all 25 candidates
finalists. Separating 25 often near-tied gear sets pairwise at 95% is not
reachable at practical iteration counts — each round doubles the sample
(`stage.go:288`) and paired error falls as sqrt(n), so three rounds buy ~1.7x.

### The work is discarded

`rank.ts:955` returns `byKey` as a map of `SimObservation`; the only consumer is
`rank.ts:1071`, `const deltaDps = candObs.dps - candBaselineDps`. One scalar mean.
The client requested `iterations: 5000` (`rank.ts:410` `DEFAULT_ITERATIONS`,
passed at `rank.ts:912`); the server delivered ~79,000.

### The sharp pair, reproduced and confirmed like-for-like

| | screening ON (`smoke-3333-cap20.json`) | OFF (`smoke-3333-cap20-fallback.json`) |
| --- | --- | --- |
| `elapsedS` | 264 | 13 |
| iterations (from log) | 4,682,382 | 192,000 |
| `rowCount` / `aboveCutoff` | 20 / 8 | 20 / 8 |
| `baselineDps` | 2231.5 | 2231.5 |
| `requests.bulkSimAsync` | 2 | 0 |

Time ratio **20.3x**, iteration ratio **24.4x** — they agree, which is the whole
finding. The handoff asked me to confirm both runs produced the same rows before
trusting the 20x: the 20 row objects are **exactly equal** (`a['rows'] ==
b['rows']`, every field) and `aboveCutoffItems` is the identical 8-item list in
identical order.

### Both leads ruled out

1. **`asyncProgress` poll volume — ruled out.** Raw counts track elapsed time.
   Normalised: ON polls **11.9/s** (3148/264 s), OFF polls **28.5/s** (371/13 s).
   The screening path polls *less* per second. The full run is 13.6/s
   (46503/3419). Poll count is a consequence of duration, not a cause.

2. **`WorkerPool(1)` — ruled out.** `Concurrency: 1` is logged for all 29 chunks
   but is deliberate: `GetBulkSimStageConcurrency` (`stage.go:63-66`) returns 1
   when `config.UseConcurrentSim` is set, meaning candidates run one at a time
   while each parallelises internally across all cores. The machine stays
   saturated — 3,085 of 3,137 sim batches ran `on 20 concurrent sims`. Throughput:
   ON achieves **17,184 it/s** (full run) and **17,736 it/s** (smoke) against OFF's
   **14,769 it/s**. The screening path is slightly faster per iteration.

## For whoever takes the fix

Out of scope for this pass by the plan's own text. The cost is one ungated call —
`runBulkSimFinalistStage` at `bulk_sim.go:186`, outside the stage loop with no
`useLegacyBulkSim` guard — plus the client passing the whole chunk as
`topResults`. Levers in rising blast radius:

1. **Client-side only, no Go change:** stop making all 25 candidates finalists
   (`bulk_request_builder.ts:115`). Screening ranks a pool coarsely; the accurate
   paired pass happens later in `rank.ts` regardless.
2. Skip the finalist stage when the caller reads only `dps`.
3. Gate the finalist call the way the culling stages already are.

**Scoping note the plan left open:** it routed "C (fix), only if it touches the Go
bulk path or runner architecture" to stage-gate because of the 3419 s re-verify.
Lever 1 is client-side only and plausibly does not need that ceremony. That is a
judgment call for the fix owner, and it is **not settled here** — I did not
measure what lever 1 would cost or whether it changes any row.

## Traps this session hit, for the next one

- **`cd X && <cmd>` breaks** exactly as the prior handoff warned — fnm emits an
  env error that kills the chain, including for `grep` and `sed`. Use absolute
  paths with no `cd`. It cost me two calls before I switched.
- **Heredocs with apostrophes** in the Bash tool failed to parse (`unexpected EOF
  while looking for matching quote`). Writing the text to a scratchpad file and
  `cat`-ing it into place worked; the Write tool is the reliable path for prose.
- **Bound log windows by elapsed time, not line number.** See the segmenting note
  above — a line-bounded window silently mixed two runs and produced stage walls
  exceeding the run's own duration. The impossibility is what caught it; a less
  obviously wrong overlap would not have announced itself.

## What this session did not do

- No fork edit, no fork commit, no push.
- No merge, no `merge-to-dev`, no `pnpm verify` run (nothing here touches code
  that verify gates; the change is one `.scratch/` markdown file).
- No new simulation run, capped or otherwise. The 3419 s full pool was **not**
  re-run, as instructed.
- Did not revisit the CRLF merge blocker (workstream E) or tickets 400/401.
