# Worker handoff

## Status
success

## Branch
`slice-b-ew5`

## Base
- spawned at `55b5a51db1516d349a209ea2831bb5b1f8a28265` (`origin/main` — does not contain this plan) · expected `9ae92a324be891367398c8657b78b506903928ad` · corrected: yes — `git checkout -b slice-b-ew5 9ae92a324be891367398c8657b78b506903928ad`

## What I did
- Fetched the pinned CLI binary (`python scripts/fetch_wowsimcli.py --platform win32-x64`) — `vendor/` did not exist in this fresh worktree.
- **§3.1** (`scripts/ew5_overhead.mjs`, `experiments/e-w5-overhead.{json,md}`): five-repeat median sweep {100,300,1000,3000,5000} against the pinned CLI, `test/fixtures/slamaltman.raid-sim-request.json`, seed 42. Fit `t_fixed = 373.2 ms`, `t_iter = 0.0637 ms/iteration`. Confirmed from code (not timing alone) that no presim round executes for this fixture — `health.go`'s `Presimmer` needs a nonzero healing cadence the fixture never sets, and the encounter has no `EndFightAtHealth`, so `runPresims`'s loop body never runs. Measured peak per-worker RSS **183.8 MB** at 5,000 iterations, in an isolated pass.
- **§3.2** (`scripts/ew5_rank.mjs`, `experiments/e-w5-rank.{json,md}`): ran the full eligible pool through the real `rankUpgrades` seam (`packages/core/src/rank.ts`, unmodified — imported read-only) via `CliSimRunner` against the live CLI binary, for both roster fixtures (ret, feral), at every §3.1 sweep point plus 5,000, `seeds:[42]`. Computed Spearman rho vs the 5,000-iteration delta and K\* per point.
- **Go/no-go**: **no-go**, per §3.2's literal rule. Max K\* (25) is well under the 60 ceiling, but the cost condition fails at every sweep point on ret (cheapest is 0.609 at 100 iterations, vs the 0.25 threshold) because `t_fixed` (373ms) dominates wall-clock at every point tried — the ~0.064ms/iteration variable cost is a rounding error against it. `screenIterations`/`promoteTopK` are not set. Recorded in `experiments/e-w5-rank.md` (primary artifact) and in `docs/plans/wowsims-tab/candidate-pool.md` §3.3 (§3.3 only, per the path scope), including the arithmetic explaining the flat cost ratio, the Node/CLI-only scope of the conclusion, and the consequence for M1 (cap/concurrency are now the load-bearing levers) and M1.5 (EP-ordering recall becomes more decision-relevant since there's no screening fallback).

## Paths touched
- `scripts/ew5_overhead.mjs` (new)
- `scripts/ew5_rank.mjs` (new)
- `experiments/e-w5-overhead.json`, `experiments/e-w5-overhead.md` (new)
- `experiments/e-w5-rank.json`, `experiments/e-w5-rank.md` (new)
- `docs/plans/wowsims-tab/candidate-pool.md` — §3.3 only (verified: `git diff` hunks confined to the §3.3 region; §4 onward untouched)

No file under `packages/core/**`, `vendor/**`, `data/**`, or `docs/plans/wowsims-tab/plan.md` was written. Both `rank.ts` and `pool.ts` were imported read-only by the two harness scripts (`rankUpgrades`, `poolFromUniverse`, `filterPoolByPhase`, `CliSimRunner`, `RecordedGearSource`, `MemoryStore`, `mapWclGearToSim`, `SIM_ORDER`) — no edits to their source.

## Verification
- `node scripts/ew5_overhead.mjs` → wrote `experiments/e-w5-overhead.{json,md}`; every repeat's `iterationsDone` checked against the requested count before acceptance (script throws otherwise) — confirmed by reading the script's own throw path, not just its exit code.
- `node scripts/ew5_rank.mjs` (run via `tsx`, backgrounded, exit code 0, full stdout captured) → wrote `experiments/e-w5-rank.{json,md}`; every `rankUpgrades` call's returned `ranking.items.length` (246 for every point/fixture) checked in the console log against the expected eligible-pool size.
- `git log --oneline 9ae92a3..HEAD` → 3 commits, all on `slice-b-ew5`.
- `git diff --stat 9ae92a3..HEAD` → touches exactly the 7 files listed above, nothing outside `pathsAllowed`.
- `git status --short` → clean at every commit point (checked before each commit per AGENTS.md's "`git add` does not scope the commit" warning).
- Read back `experiments/e-w5-rank.json`'s `raw.ret.points["100"].deltas` directly to confirm real per-item numbers landed (not a stub), before trusting the derived Spearman/K\* figures.

## Notes / concerns

**ret-p2 vs ret-p5 row-count gap (task-required report).** `data/universes/ret-p2.json` has 240 entries (all `phase<=2`, since it was generated at that maxPhase). `data/universes/ret-p5.json` filtered to `phase<=2` gives **246** — a 6-row gap between the two universe files for the same nominal (spec, maxPhase) pair. This harness used `ret-p5.json` filtered to `phase<=2`, per the task's corrected counts. I did not attempt to reconcile the two universes (out of scope per the task). Recorded in `experiments/e-w5-rank.{json,md}` and `candidate-pool.md` §3.3.

**Feral cutoff discrepancy (task-required report).** `packages/core/src/cutoff.ts:27` defines `CUTOFF_FERAL = {absDps: 3.6, pct: 0.15}` — different from the fixed `{absDps: 3.4, pct: 0.15}` (F10) the task instructed me to use for the go/no-go on both specs. I used the task's fixed `{3.4, 0.15}` for K\* on both fixtures as instructed, and recorded feral's own `cutoffForSpec()` value alongside it in both output files for transparency. This did not affect the verdict (K\* was not the failing condition), but a future M2 attempt should decide whether K\* ought to be computed per-spec against each spec's own cutoff.

**Presim separability (task-required report).** Not separable *in general* on the CLI `--outfile` path: `RaidSimResult` (`vendor/tbc-new-fork/proto/api.proto:384-398`) carries no presim-related field; only the streaming `ProgressMetrics` channel signals `PresimRunning`, and `--outfile` does not use that channel. However, for the ret fixture specifically, this is a resolved zero rather than an unresolved mix: I read `sim/core/presim.go`'s loop guard and `health.go`'s only `Presimmer` implementation, and confirmed via `python -c "..."` that the fixture's `healingModel` is `{}` (both `Hps` and `CadenceSeconds` zero) and its encounter has no `EndFightAtHealth` field — so the presim loop body provably never executes for this specific fixture. `t_fixed` = 373.2ms is therefore pure setup cost with zero presim rounds, not a mix I couldn't separate.

**Method deviation, disclosed prominently per the task's instructions.** A first version of `ew5_overhead.mjs` polled RSS via a PowerShell `Get-Process` subprocess every 50ms *during* the timing sweep. That polling inflated wall-clock by 2-40x from CPU/IO contention (100 iterations: ~450ms expected, up to 1.5s observed; 300 iterations: up to 19s observed) — numbers that looked plausible on their face but were pure measurement noise, caught only because they contradicted the reference table given in my task prompt. Fixed by splitting timing and RSS measurement into two separate passes (RSS measured once, in isolation, at 5,000 iterations only). The corrected numbers in `experiments/e-w5-overhead.md` match the given reference table closely (e.g. 100 iterations: 377ms measured vs 462ms reference; both single-run noise at this scale).

**§3.2 was run in full as written**, not sampled — both fixtures, all 6 points (5 sweep + 5000), no narrowing. Actual cost was higher than the plan's ~24-minute estimate: summing the per-point `wallMs` the harness logged, ret took **15.4 minutes** (924,081 ms across its 5 points) and feral took **10.7 minutes** (643,554 ms), **26.1 minutes total** — the extra time versus the pure-CLI fit is Node-side overhead in `rankUpgrades` itself (gem-fill, meta-repair, request composition per candidate) on top of each CLI spawn, which the §3.1 fit (CLI-only) does not capture. This did not require narrowing under the plan's stated deviation rule since it stayed affordable and completed cleanly.

**Turn-boundary risk, per the coordinator's note.** I initially ended a turn while §3.2's background sim sweep was still in flight, before its results were committed — a real risk to the fan-in that the coordinator correctly flagged. I resumed and completed the commit, §3.3 write-up, and this handoff once the sweep's completion notification arrived; final state (verified above) is clean and complete. Holding ownership through to a committed artifact, not just a launched background task, is the correct pattern for future slices.

## Suggested follow-ups
- M1.5 (slice B′) is now higher-stakes than originally scoped: with M2 no-go, a pre-M2 candidate cap's safety rests entirely on EP-ordering recall. Worth flagging to the orchestrator before B′ starts.
- If a future M2 attempt wants to revisit racing, the fix implied by §3.3's arithmetic is amortizing/eliminating the *fixed* per-request cost (e.g. batching candidates into fewer process spawns), not further lowering the iteration count — screening iterations down cannot pay for itself while `t_fixed` dominates.
- The browser/WASM path's fixed-cost structure is unmeasured by E-W5 and could plausibly have a different ratio (no process spawn per request) — worth a separate measurement if racing is ever reconsidered for that path specifically.
